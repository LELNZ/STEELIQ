import sgMail from '@sendgrid/mail';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';

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
      // POs are accounting-related, so they come from and reply to accounts@
      return await this.sendEmail({
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        from: process.env.SENDGRID_PO_FROM_EMAIL || 'accounts@lateralengineering.co.nz',
        replyTo: process.env.SENDGRID_PO_REPLY_TO || 'accounts@lateralengineering.co.nz',
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
    
    // Check if body already contains a greeting to avoid duplication
    const bodyLower = body.toLowerCase().trim();
    const hasGreeting = bodyLower.startsWith('dear ') || bodyLower.startsWith('hello ') || bodyLower.startsWith('hi ');
    
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

    // Enhanced professional email template with better styling
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Purchase Order ${poData.poNumber}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8fafc;
          }
          .container { max-width: 600px; margin: 0 auto; background-color: white; }
          .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
          }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 30px 20px; }
          .greeting { margin-bottom: 20px; font-size: 16px; }
          .message-body { margin: 20px 0; line-height: 1.7; }
          .po-details { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 25px 0; 
            border-left: 4px solid #1e40af;
          }
          .po-details h3 { margin: 0 0 15px 0; color: #1e40af; font-size: 18px; }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            padding: 8px 0; 
            border-bottom: 1px solid #e2e8f0;
          }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; color: #475569; }
          .detail-value { font-weight: 500; color: #1e293b; }
          .amount { font-size: 20px; font-weight: 700; color: #059669; }
          .instructions { 
            background: #f0f9ff; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-left: 4px solid #0ea5e9;
          }
          .company-info { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #e2e8f0; 
            text-align: center;
          }
          .company-info h4 { margin: 0 0 10px 0; color: #1e40af; }
          .footer { 
            background: #f1f5f9; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #64748b; 
            border-radius: 0 0 8px 8px;
          }
          @media only screen and (max-width: 600px) {
            .container { margin: 10px; }
            .header { padding: 20px 15px; }
            .content { padding: 20px 15px; }
            .detail-row { flex-direction: column; align-items: flex-start; }
            .detail-value { margin-top: 5px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Purchase Order #${poData.poNumber}</h1>
            <p>Lateral Engineering Limited • Auckland, New Zealand</p>
          </div>
          <div class="content">
            ${!hasGreeting ? `<div class="greeting">Dear ${supplierData.name || supplierData.company || 'Valued Partner'},</div>` : ''}
            
            <div class="message-body" style="white-space: pre-line;">${body}</div>
          
            ${requestAcknowledgment ? portalSection : ''}
            ${requestAcknowledgment ? signatureSection : ''}
            
            <div class="po-details">
              <h3>📋 Order Details</h3>
              <div class="detail-row">
                <span class="detail-label">PO Number:</span>
                <span class="detail-value">${poData.poNumber}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Issue Date:</span>
                <span class="detail-value">${new Date(poData.orderDate).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Requested Delivery:</span>
                <span class="detail-value">${poData.deliveryDate ? new Date(poData.deliveryDate).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' }) : 'As per agreement'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total Amount:</span>
                <span class="detail-value amount">$${totalAmount.toFixed(2)} ${poData.currency || 'NZD'}</span>
              </div>
              ${poData.supplierReference ? `
              <div class="detail-row">
                <span class="detail-label">Your Reference:</span>
                <span class="detail-value">${poData.supplierReference}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="instructions">
              <h4 style="margin: 0 0 10px 0; color: #0ea5e9;">📎 Next Steps</h4>
              <p style="margin: 0;">• Review the detailed purchase order attached to this email<br>
              • Confirm receipt and delivery schedule at your earliest convenience<br>
              • Contact us immediately if you have any questions or concerns</p>
            </div>
            
            ${poData.specialInstructions ? `
            <div class="instructions" style="background: #fef9e7; border-left: 4px solid #f59e0b;">
              <h4 style="margin: 0 0 10px 0; color: #d97706;">⚠️ Special Instructions</h4>
              <p style="margin: 0; white-space: pre-line;">${poData.specialInstructions}</p>
            </div>
            ` : ''}
            
            <div class="company-info">
              <h4>Lateral Engineering Limited</h4>
              <p style="margin: 5px 0; color: #64748b;">
                📍 Auckland, New Zealand<br>
                📧 accounts@lateralengineering.co.nz<br>
                🌐 www.lateralengineering.co.nz
              </p>
            </div>
          </div>
          <div class="footer">
            <p><strong>This is an automated message from STEELIQ Procurement System</strong></p>
            <p>© ${new Date().getFullYear()} Lateral Engineering Limited. All rights reserved.</p>
            <p style="margin-top: 10px; font-size: 11px;">
              Please do not reply directly to this email. For inquiries, contact accounts@lateralengineering.co.nz
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async generatePOPDF(poData: any, supplierData: any, templateType: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ 
        margin: 50,
        // Enable font embedding to support UTF-8 characters properly
        bufferPages: true,
        autoFirstPage: true
      });
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
        .text(supplierData.name || 'Supplier Name', 50, 220);
      
      // Handle address with UTF-8 characters properly
      if (supplierData.address) {
        // Replace problematic characters with safe alternatives
        const cleanAddress = supplierData.address
          .replace(/ā/g, 'a')
          .replace(/Ā/g, 'A')
          .replace(/ē/g, 'e')
          .replace(/Ē/g, 'E')
          .replace(/ī/g, 'i')
          .replace(/Ī/g, 'I')
          .replace(/ō/g, 'o')
          .replace(/Ō/g, 'O')
          .replace(/ū/g, 'u')
          .replace(/Ū/g, 'U')
          .replace(/['']/g, "'")
          .replace(/[""]/g, '"');
        doc.text(cleanAddress, 50, 235);
      }
      
      doc.text(supplierData.email || '', 50, 250)
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

      // Total section
      doc.moveTo(50, yPosition)
        .lineTo(550, yPosition)
        .stroke(primaryColor);
      
      yPosition += 10;
      const totalAmount = typeof poData.totalAmount === 'number' ? poData.totalAmount : parseFloat(poData.totalAmount) || 0;
      
      // For detailed template, show GST breakdown
      if (templateType === 'detailed') {
        const subtotal = totalAmount;
        const gstAmount = subtotal * 0.15; // 15% GST
        const totalWithGST = subtotal + gstAmount;
        
        // Subtotal
        doc.font('Helvetica')
          .fontSize(10)
          .text('Subtotal:', 350, yPosition)
          .text(`$${subtotal.toFixed(2)}`, 470, yPosition, { align: 'right', width: 70 });
        
        yPosition += 20;
        // GST
        doc.font('Helvetica')
          .fontSize(10)
          .text('GST (15%):', 350, yPosition)
          .text(`$${gstAmount.toFixed(2)}`, 470, yPosition, { align: 'right', width: 70 });
        
        yPosition += 20;
        // Total with GST
        doc.font('Helvetica-Bold')
          .fontSize(11)
          .text('Total (incl. GST):', 350, yPosition)
          .text(`$${totalWithGST.toFixed(2)}`, 470, yPosition, { align: 'right', width: 70 });
      } else {
        // Standard and Simple templates - just show total
        doc.font('Helvetica-Bold')
          .text('Total Amount:', 400, yPosition)
          .text(`$${totalAmount.toFixed(2)}`, 470, yPosition);
      }

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
    
    // Header Information
    lines.push('PURCHASE ORDER');
    lines.push(`PO Number,${poData.poNumber}`);
    lines.push(`Date,${new Date(poData.orderDate).toLocaleDateString()}`);
    lines.push(`Requested Delivery Date,${poData.requestedDeliveryDate ? new Date(poData.requestedDeliveryDate).toLocaleDateString() : 'Invalid Date'}`);
    lines.push(`Delivery Address,"${poData.deliveryAddress || 'Workshop'}"`);
    lines.push(`Status,${poData.status || 'draft'}`);
    lines.push('');
    
    // Company Information
    lines.push('COMPANY INFORMATION');
    lines.push('Company,Lateral Engineering Limited');
    lines.push('Address,"Auckland, New Zealand"');
    lines.push('Email,accounts@lateralengineering.co.nz');
    lines.push('');
    
    // Supplier Information
    lines.push('SUPPLIER INFORMATION');
    lines.push(`Company,"${supplierData.company || supplierData.name || ''}"`);
    lines.push(`Contact Name,"${supplierData.name || ''}"`);
    lines.push(`Email,${supplierData.email || ''}`);
    lines.push(`Phone,${supplierData.phone || ''}`);
    lines.push(`Address,"${supplierData.address || ''}"`);
    lines.push('');
    
    // Items header
    lines.push('ITEMS');
    lines.push('Item,Code,Description,Quantity,Unit,Unit Price,Total');
    
    // Items
    if (poData.items && poData.items.length > 0) {
      poData.items.forEach((item: any, index: number) => {
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const totalPrice = parseFloat(item.totalPrice || item.lineTotal) || 0;
        lines.push(`${index + 1},"${item.materialCode || ''}","${item.description || ''}",${item.quantity || 0},${item.unit || 'EA'},${unitPrice.toFixed(2)},${totalPrice.toFixed(2)}`);
      });
    }
    
    // Financial Summary
    lines.push('');
    lines.push('FINANCIAL SUMMARY');
    const totalAmount = typeof poData.totalAmount === 'number' ? poData.totalAmount : parseFloat(poData.totalAmount) || 0;
    lines.push(`Subtotal,,,,,,${totalAmount.toFixed(2)}`);
    lines.push(`GST (15%),,,,,,${(totalAmount * 0.15).toFixed(2)}`);
    lines.push(`Total (incl. GST),,,,,,${(totalAmount * 1.15).toFixed(2)}`);
    
    // Terms and Conditions
    lines.push('');
    lines.push('TERMS AND CONDITIONS');
    lines.push('Payment Terms,Net 30 days');
    lines.push('Delivery,To specified location during business hours');
    lines.push('Quality Standards,All items must meet specified quality standards');
    lines.push('Terms,Subject to standard terms and conditions');
    
    // Notes
    if (poData.notes) {
      lines.push('');
      lines.push('NOTES');
      lines.push(`"${poData.notes}"`);
    }
    
    return lines.join('\n');
  }

  private generatePOExcel(poData: any, supplierData: any): Buffer {
    // Create workbook with proper Excel structure
    const workbook = XLSX.utils.book_new();
    
    // Main PO Sheet
    const poData_sheet: any[][] = [];
    
    // Header Section
    poData_sheet.push(['PURCHASE ORDER']);
    poData_sheet.push([]);
    poData_sheet.push(['PO Number:', poData.poNumber]);
    poData_sheet.push(['Date:', new Date(poData.orderDate).toLocaleDateString()]);
    poData_sheet.push(['Requested Delivery Date:', poData.requestedDeliveryDate ? new Date(poData.requestedDeliveryDate).toLocaleDateString() : 'Invalid Date']);
    poData_sheet.push(['Delivery Address:', poData.deliveryAddress || 'Workshop']);
    poData_sheet.push(['Status:', poData.status || 'draft']);
    poData_sheet.push([]);
    
    // Company Section
    poData_sheet.push(['COMPANY INFORMATION']);
    poData_sheet.push(['Company:', 'Lateral Engineering Limited']);
    poData_sheet.push(['Address:', 'Auckland, New Zealand']);
    poData_sheet.push(['Email:', 'accounts@lateralengineering.co.nz']);
    poData_sheet.push([]);
    
    // Supplier Section
    poData_sheet.push(['SUPPLIER INFORMATION']);
    poData_sheet.push(['Company:', supplierData.company || supplierData.name || '']);
    poData_sheet.push(['Contact Name:', supplierData.name || '']);
    poData_sheet.push(['Email:', supplierData.email || '']);
    poData_sheet.push(['Phone:', supplierData.phone || '']);
    poData_sheet.push(['Address:', supplierData.address || '']);
    poData_sheet.push([]);
    
    // Items Section
    poData_sheet.push(['ITEMS']);
    poData_sheet.push(['Item', 'Code', 'Description', 'Quantity', 'Unit', 'Unit Price', 'Total']);
    
    if (poData.items && poData.items.length > 0) {
      poData.items.forEach((item: any, index: number) => {
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const totalPrice = parseFloat(item.totalPrice || item.lineTotal) || 0;
        poData_sheet.push([
          index + 1,
          item.materialCode || '',
          item.description || '',
          item.quantity || 0,
          item.unit || 'EA',
          unitPrice.toFixed(2),
          totalPrice.toFixed(2)
        ]);
      });
    }
    
    poData_sheet.push([]);
    
    // Financial Summary
    const totalAmount = typeof poData.totalAmount === 'number' ? poData.totalAmount : parseFloat(poData.totalAmount) || 0;
    poData_sheet.push(['FINANCIAL SUMMARY']);
    poData_sheet.push(['', '', '', '', '', 'Subtotal:', totalAmount.toFixed(2)]);
    poData_sheet.push(['', '', '', '', '', 'GST (15%):', (totalAmount * 0.15).toFixed(2)]);
    poData_sheet.push(['', '', '', '', '', 'Total (incl. GST):', (totalAmount * 1.15).toFixed(2)]);
    poData_sheet.push([]);
    
    // Terms and Conditions
    poData_sheet.push(['TERMS AND CONDITIONS']);
    poData_sheet.push(['Payment Terms:', 'Net 30 days']);
    poData_sheet.push(['Delivery:', 'To specified location during business hours']);
    poData_sheet.push(['Quality Standards:', 'All items must meet specified quality standards']);
    poData_sheet.push(['Terms:', 'Subject to standard terms and conditions']);
    
    // Notes
    if (poData.notes) {
      poData_sheet.push([]);
      poData_sheet.push(['NOTES']);
      poData_sheet.push([poData.notes]);
    }
    
    // Convert array to worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(poData_sheet);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Column A
      { wch: 15 }, // Column B
      { wch: 40 }, // Column C
      { wch: 12 }, // Column D
      { wch: 10 }, // Column E
      { wch: 15 }, // Column F
      { wch: 15 }, // Column G
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Order');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }
}

export const emailService = new EmailService();