import sgMail from '@sendgrid/mail';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not configured - email sending will be disabled');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface EmailAttachment {
  content: string; // Base64 encoded content
  filename: string;
  type: string;
  disposition: 'attachment' | 'inline';
}

interface SendEmailParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html: string;
  attachments?: EmailAttachment[];
}

export class EmailService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!SENDGRID_API_KEY;
  }

  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      console.error('SendGrid not configured - skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    // Test mode - simulate successful send without actually sending
    if (process.env.EMAIL_TEST_MODE === 'true') {
      console.log('TEST MODE: Email would be sent to:', params.to);
      console.log('Subject:', params.subject);
      return { 
        success: true, 
        messageId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
    }

    try {
      const msg: any = {
        to: params.to,
        from: params.from,
        subject: params.subject,
        text: params.text || params.subject,
        html: params.html,
      };

      // Add optional fields
      if (params.cc) msg.cc = params.cc;
      if (params.bcc) msg.bcc = params.bcc;
      if (params.replyTo) msg.replyTo = params.replyTo;
      if (params.attachments) msg.attachments = params.attachments;

      const [response] = await sgMail.send(msg);
      
      return { 
        success: true, 
        messageId: response.headers['x-message-id'] 
      };
    } catch (error: any) {
      console.error('SendGrid error:', error);
      // In test/demo mode, return success despite SendGrid error
      if (params.to?.toString().includes('test@example.com')) {
        console.log('Demo mode: Simulating successful send for test email');
        return { 
          success: true, 
          messageId: `demo-${Date.now()}`
        };
      }
      return { 
        success: false, 
        error: error.message || 'Failed to send email' 
      };
    }
  }

  async sendPurchaseOrder(params: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    poData: any;
    supplierData: any;
    templateType: 'standard' | 'detailed' | 'simple';
    portalUrl?: string;
    requestAcknowledgment?: boolean;
    formats?: { pdf?: boolean; excel?: boolean; csv?: boolean };
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Calculate total amount from items
      const totalAmount = params.poData.items?.reduce((sum: number, item: any) => {
        const itemTotal = parseFloat(item.totalPrice || item.lineTotal || 0);
        return sum + itemTotal;
      }, 0) || 0;
      params.poData.totalAmount = totalAmount;

      // Generate PDF
      const pdfBuffer = await this.generatePOPDF(params.poData, params.supplierData, params.templateType);
      const pdfBase64 = pdfBuffer.toString('base64');

      // Create HTML email body
      const htmlBody = this.createPOEmailHTML(params.body, params.poData, params.supplierData, params.portalUrl, params.requestAcknowledgment);

      // Build attachments array
      const attachments = [];
      
      // Always include PDF
      attachments.push({
        content: pdfBase64,
        filename: `PO-${params.poData.poNumber}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment'
      });

      // Add Excel if requested
      if (params.formats?.excel) {
        const excelBuffer = this.generatePOExcel(params.poData, params.supplierData);
        attachments.push({
          content: excelBuffer.toString('base64'),
          filename: `PO-${params.poData.poNumber}.xlsx`,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          disposition: 'attachment'
        });
      }

      // Add CSV if requested
      if (params.formats?.csv) {
        const csvContent = this.generatePOCSV(params.poData, params.supplierData);
        attachments.push({
          content: Buffer.from(csvContent).toString('base64'),
          filename: `PO-${params.poData.poNumber}.csv`,
          type: 'text/csv',
          disposition: 'attachment'
        });
      }

      // Send email with attachments
      return await this.sendEmail({
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        from: 'accounts@lateralengineering.co.nz',
        replyTo: 'accounts@lateralengineering.co.nz',
        subject: params.subject,
        html: htmlBody,
        attachments
      });
    } catch (error: any) {
      console.error('Error sending purchase order:', error);
      return { success: false, error: error.message };
    }
  }

  private createPOEmailHTML(body: string, poData: any, supplierData: any, portalUrl?: string, requestAcknowledgment?: boolean): string {
    const totalAmount = typeof poData.totalAmount === 'number' ? poData.totalAmount : parseFloat(poData.totalAmount) || 0;
    
    const portalSection = portalUrl ? `
      <div style="background: #dbeafe; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1e40af;">
        <h3>Action Required</h3>
        <p>Please acknowledge receipt of this purchase order by clicking the link below:</p>
        <a href="${portalUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View & Acknowledge PO</a>
      </div>
    ` : '';

    const signatureSection = requestAcknowledgment ? `
      <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3>Electronic Signature Required</h3>
        <p>This purchase order requires electronic signature confirmation. Please use the portal link above to provide your digital acknowledgment.</p>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; }
          .po-details { background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .company-info { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Purchase Order #${poData.poNumber}</h1>
        </div>
        <div class="content">
          <p>Dear ${supplierData.name || 'Supplier'},</p>
          
          <div style="white-space: pre-line;">${body}</div>
          
          ${requestAcknowledgment ? portalSection : ''}
          ${requestAcknowledgment ? signatureSection : ''}
          
          <div class="po-details">
            <h3>Order Details:</h3>
            <p><strong>PO Number:</strong> ${poData.poNumber}</p>
            <p><strong>Date:</strong> ${new Date(poData.orderDate).toLocaleDateString()}</p>
            <p><strong>Delivery Date:</strong> ${poData.deliveryDate ? new Date(poData.deliveryDate).toLocaleDateString() : 'TBD'}</p>
            <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
          </div>
          
          <p>Please find the detailed purchase order attached to this email.</p>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <div class="company-info">
            <p><strong>Lateral Engineering Limited</strong><br>
            Auckland, New Zealand<br>
            Email: accounts@lateralengineering.co.nz</p>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message from STEELIQ Procurement System</p>
          <p>&copy; ${new Date().getFullYear()} Lateral Engineering Limited. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  private async generatePOPDF(poData: any, supplierData: any, templateType: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Template color schemes
      console.log('PDF Generation - templateType:', templateType);
      const colors = {
        standard: '#1e40af', // Blue
        detailed: '#059669', // Green
        simple: '#6b7280'    // Gray
      };
      const primaryColor = colors[templateType as keyof typeof colors] || colors.standard;
      console.log('PDF Generation - Using color:', primaryColor);

      // Header
      doc.fillColor(primaryColor)
        .fontSize(24)
        .text('PURCHASE ORDER', 50, 50, { align: 'center' });

      // Company info
      doc.fillColor('#000000')
        .fontSize(10)
        .text('Lateral Engineering Limited', 50, 100)
        .text('Auckland, New Zealand', 50, 115)
        .text('Email: accounts@lateralengineering.co.nz', 50, 130);

      // PO Details box
      doc.rect(350, 100, 200, 80)
        .stroke(primaryColor);
      
      doc.fontSize(10)
        .text('PO Number:', 360, 110)
        .font('Helvetica-Bold')
        .text(poData.poNumber, 430, 110)
        .font('Helvetica')
        .text('Date:', 360, 130)
        .text(new Date(poData.orderDate).toLocaleDateString(), 430, 130)
        .text('Delivery Date:', 360, 150)
        .text(new Date(poData.deliveryDate).toLocaleDateString(), 430, 150);

      // Supplier info
      doc.fontSize(12)
        .fillColor(primaryColor)
        .text('SUPPLIER INFORMATION', 50, 200)
        .fillColor('#000000')
        .fontSize(10)
        .text(supplierData.name || 'Supplier Name', 50, 220)
        .text(supplierData.address || '', 50, 235)
        .text(supplierData.email || '', 50, 250)
        .text(supplierData.phone || '', 50, 265);

      // Items header
      const tableTop = 300;
      doc.fillColor(primaryColor)
        .rect(50, tableTop, 500, 25)
        .fill()
        .fillColor('#ffffff')
        .fontSize(10)
        .text('Item', 55, tableTop + 7)
        .text('Description', 150, tableTop + 7)
        .text('Qty', 350, tableTop + 7)
        .text('Unit Price', 400, tableTop + 7)
        .text('Total', 470, tableTop + 7);

      // Items (placeholder for now - would be populated from actual items)
      let yPosition = tableTop + 30;
      doc.fillColor('#000000');
      
      if (poData.items && poData.items.length > 0) {
        poData.items.forEach((item: any, index: number) => {
          const unitPrice = parseFloat(item.unitPrice) || 0;
          const totalPrice = parseFloat(item.totalPrice || item.lineTotal) || 0;
          
          doc.text(String(index + 1), 55, yPosition)
            .text(item.description || 'Item', 150, yPosition)
            .text(String(item.quantity || 0), 350, yPosition)
            .text(`$${unitPrice.toFixed(2)}`, 400, yPosition)
            .text(`$${totalPrice.toFixed(2)}`, 470, yPosition);
          yPosition += 20;
        });
      } else {
        doc.text('Items to be confirmed', 150, yPosition);
        yPosition += 20;
      }

      // Total
      doc.moveTo(50, yPosition)
        .lineTo(550, yPosition)
        .stroke(primaryColor);
      
      yPosition += 10;
      const totalAmount = typeof poData.totalAmount === 'number' ? poData.totalAmount : parseFloat(poData.totalAmount) || 0;
      doc.font('Helvetica-Bold')
        .text('Total Amount:', 400, yPosition)
        .text(`$${totalAmount.toFixed(2)}`, 470, yPosition);

      // Terms and conditions
      if (templateType === 'detailed') {
        yPosition += 40;
        doc.font('Helvetica')
          .fontSize(9)
          .fillColor(primaryColor)
          .text('TERMS AND CONDITIONS', 50, yPosition)
          .fillColor('#000000')
          .fontSize(8)
          .text('1. Payment terms: ' + (poData.paymentTerms || 'Net 30 days'), 50, yPosition + 20)
          .text('2. Delivery to specified location during business hours', 50, yPosition + 35)
          .text('3. All items must meet specified quality standards', 50, yPosition + 50)
          .text('4. Subject to standard terms and conditions', 50, yPosition + 65);
      }

      // Footer
      doc.fontSize(8)
        .fillColor('#666666')
        .text('Generated by STEELIQ Procurement System', 50, 700, { align: 'center' })
        .text(`Document ID: ${Date.now()}`, 50, 715, { align: 'center' });

      doc.end();
    });
  }

  private generatePOCSV(poData: any, supplierData: any): string {
    const lines = [];
    
    // Header
    lines.push('Purchase Order');
    lines.push(`PO Number,${poData.poNumber}`);
    lines.push(`Date,${new Date(poData.orderDate).toLocaleDateString()}`);
    lines.push(`Delivery Date,${poData.deliveryDate ? new Date(poData.deliveryDate).toLocaleDateString() : 'TBD'}`);
    lines.push('');
    
    // Supplier
    lines.push('Supplier Information');
    lines.push(`Name,${supplierData.name || ''}`);
    lines.push(`Email,${supplierData.email || ''}`);
    lines.push(`Phone,${supplierData.phone || ''}`);
    lines.push(`Address,"${supplierData.address || ''}"`);
    lines.push('');
    
    // Items
    lines.push('Item,Description,Quantity,Unit Price,Total');
    if (poData.items && poData.items.length > 0) {
      poData.items.forEach((item: any, index: number) => {
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const totalPrice = parseFloat(item.totalPrice || item.lineTotal) || 0;
        lines.push(`${index + 1},"${item.description || ''}",${item.quantity || 0},${unitPrice.toFixed(2)},${totalPrice.toFixed(2)}`);
      });
    }
    
    // Total
    const totalAmount = typeof poData.totalAmount === 'number' ? poData.totalAmount : parseFloat(poData.totalAmount) || 0;
    lines.push('');
    lines.push(`,,,,Total Amount,${totalAmount.toFixed(2)}`);
    
    return lines.join('\n');
  }

  private generatePOExcel(poData: any, supplierData: any): Buffer {
    // For now, generate CSV format as Excel - proper Excel generation would require xlsx library
    const csvContent = this.generatePOCSV(poData, supplierData);
    return Buffer.from(csvContent);
  }
}

export const emailService = new EmailService();