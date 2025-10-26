// Professional HTML templates for all document types
export const professionalTemplates = {
  // Purchase Order Templates
  PO_STANDARD: {
    subject: 'Purchase Order #{{orderNumber}} - {{companyName}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { max-height: 60px; }
    .company-info { text-align: right; }
    .title { font-size: 28px; color: #2563eb; font-weight: bold; margin: 20px 0; }
    .po-details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .supplier-box { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #2563eb; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .totals { text-align: right; margin-top: 20px; }
    .total-row { font-size: 18px; font-weight: bold; color: #2563eb; }
    .terms { background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; }
    .signature-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .signature-box { border-top: 2px solid #333; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <table width="100%">
      <tr>
        <td>
          {{#if company.logo}}<img src="{{company.logo}}" class="logo" alt="{{company.name}}">{{/if}}
          <div><strong>{{company.name}}</strong></div>
          <div>{{company.address}}</div>
          <div>{{company.city}}, {{company.state}} {{company.zip}}</div>
          <div>Phone: {{company.phone}} | Email: {{company.email}}</div>
        </td>
        <td class="company-info">
          <div class="title">PURCHASE ORDER</div>
          <div><strong>PO Number:</strong> {{orderNumber}}</div>
          <div><strong>Date:</strong> {{orderDate | date}}</div>
          <div><strong>Due Date:</strong> {{dueDate | date}}</div>
        </td>
      </tr>
    </table>
  </div>

  <div class="detail-grid">
    <div class="supplier-box">
      <h3>Supplier Information</h3>
      <div><strong>{{supplier.name}}</strong></div>
      <div>{{supplier.address}}</div>
      <div>{{supplier.city}}, {{supplier.state}} {{supplier.zip}}</div>
      <div>Contact: {{supplier.contact}}</div>
      <div>Phone: {{supplier.phone}}</div>
      <div>Email: {{supplier.email}}</div>
    </div>
    <div class="supplier-box">
      <h3>Delivery Information</h3>
      <div><strong>Ship To:</strong></div>
      <div>{{delivery.name}}</div>
      <div>{{delivery.address}}</div>
      <div>{{delivery.city}}, {{delivery.state}} {{delivery.zip}}</div>
      <div><strong>Delivery Date:</strong> {{delivery.date | date}}</div>
      <div><strong>Job/Project:</strong> {{job.number}} - {{job.name}}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item #</th>
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each lineItems}}
      <tr>
        <td>{{itemNumber}}</td>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unit}}</td>
        <td>\${{unitPrice | currency}}</td>
        <td>\${{total | currency}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <table style="width: 300px; margin-left: auto;">
      <tr>
        <td>Subtotal:</td>
        <td style="text-align: right;">\${{subtotal | currency}}</td>
      </tr>
      {{#if tax}}
      <tr>
        <td>Tax ({{taxRate}}%):</td>
        <td style="text-align: right;">\${{tax | currency}}</td>
      </tr>
      {{/if}}
      {{#if shipping}}
      <tr>
        <td>Shipping:</td>
        <td style="text-align: right;">\${{shipping | currency}}</td>
      </tr>
      {{/if}}
      <tr class="total-row">
        <td>Total:</td>
        <td style="text-align: right;">\${{total | currency}}</td>
      </tr>
    </table>
  </div>

  <div class="terms">
    <h3>Terms & Conditions</h3>
    <div>{{terms}}</div>
    <div style="margin-top: 10px;"><strong>Payment Terms:</strong> {{paymentTerms}}</div>
    <div><strong>Delivery Terms:</strong> {{deliveryTerms}}</div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div>Authorized By</div>
      <div style="margin-top: 5px;">Date: _____________</div>
    </div>
    <div class="signature-box">
      <div>Accepted By (Supplier)</div>
      <div style="margin-top: 5px;">Date: _____________</div>
    </div>
  </div>

  <div class="footer">
    <div>Thank you for your business</div>
    <div style="font-size: 12px;">{{company.name}} | ABN: {{company.abn}} | {{company.website}}</div>
  </div>
</body>
</html>`
  },

  // RFQ Templates
  RFQ_STANDARD: {
    subject: 'Request for Quote - {{rfqNumber}} - {{companyName}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
    .header { border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
    .title { font-size: 28px; color: #10b981; font-weight: bold; margin: 20px 0; }
    .rfq-info { background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .deadline { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 5px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #10b981; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .instructions { background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <table width="100%">
      <tr>
        <td>
          {{#if company.logo}}<img src="{{company.logo}}" class="logo" alt="{{company.name}}">{{/if}}
          <div><strong>{{company.name}}</strong></div>
          <div>{{company.address}}</div>
          <div>{{company.phone}} | {{company.email}}</div>
        </td>
        <td style="text-align: right;">
          <div class="title">REQUEST FOR QUOTE</div>
          <div><strong>RFQ #:</strong> {{rfqNumber}}</div>
          <div><strong>Date:</strong> {{rfqDate | date}}</div>
          <div class="deadline">Quote Due: {{dueDate | date}}</div>
        </td>
      </tr>
    </table>
  </div>

  <div class="rfq-info">
    <h3>Project Information</h3>
    <div><strong>Project:</strong> {{project.name}}</div>
    <div><strong>Location:</strong> {{project.location}}</div>
    <div><strong>Required Delivery:</strong> {{project.deliveryDate | date}}</div>
    <div><strong>Contact:</strong> {{contact.name}} - {{contact.phone}} - {{contact.email}}</div>
  </div>

  <h3>Requested Items</h3>
  <table>
    <thead>
      <tr>
        <th>Item #</th>
        <th>Description</th>
        <th>Specifications</th>
        <th>Quantity</th>
        <th>Unit</th>
        <th>Required Date</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{itemNumber}}</td>
        <td>{{description}}</td>
        <td>{{specifications}}</td>
        <td>{{quantity}}</td>
        <td>{{unit}}</td>
        <td>{{requiredDate | date}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="instructions">
    <h3>Quote Submission Instructions</h3>
    <ul>
      <li>Please provide your best pricing including all taxes and delivery charges</li>
      <li>Include lead times and availability for each item</li>
      <li>Specify payment terms and any minimum order quantities</li>
      <li>Provide warranty information and technical specifications</li>
      <li>Submit your quote by <strong>{{dueDate | date}}</strong> via email to {{contact.email}}</li>
    </ul>
    
    <h4>Evaluation Criteria</h4>
    <ul>
      <li>Price competitiveness (40%)</li>
      <li>Delivery timeframe (25%)</li>
      <li>Quality and specifications compliance (25%)</li>
      <li>Payment terms and warranty (10%)</li>
    </ul>
  </div>

  <div class="footer">
    <div>We look forward to receiving your competitive quote</div>
    <div style="font-size: 12px;">{{company.name}} | {{company.website}}</div>
    <div style="font-size: 11px; margin-top: 10px;">This RFQ is confidential and proprietary. Please do not share with third parties.</div>
  </div>
</body>
</html>`
  },

  // Quote Templates
  QUOTE_PROFESSIONAL: {
    subject: 'Quote #{{quoteNumber}} - {{projectName}} - {{companyName}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
    .title { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
    .quote-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .info-box { background: #f9fafb; padding: 20px; border-radius: 8px; }
    .info-box h3 { color: #667eea; margin-bottom: 10px; }
    .pricing-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    .pricing-table th { background: #667eea; color: white; padding: 15px; text-align: left; }
    .pricing-table td { padding: 15px; border-bottom: 1px solid #e5e7eb; }
    .subtotal-section { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .total-box { background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: right; font-size: 24px; font-weight: bold; }
    .terms-section { margin-top: 30px; padding: 20px; background: #fefce8; border-left: 4px solid #facc15; }
    .validity { background: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .signature-section { margin-top: 50px; border: 2px solid #667eea; padding: 30px; border-radius: 8px; }
    .footer { text-align: center; margin-top: 40px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">QUOTATION</div>
    <div>Quote #: {{quoteNumber}}</div>
    <div>Date: {{quoteDate | date}}</div>
    <div>Valid Until: {{validUntil | date}}</div>
  </div>

  <div class="quote-meta">
    <div class="info-box">
      <h3>From:</h3>
      <div><strong>{{company.name}}</strong></div>
      <div>{{company.address}}</div>
      <div>{{company.city}}, {{company.state}} {{company.zip}}</div>
      <div>ABN: {{company.abn}}</div>
      <div>Phone: {{company.phone}}</div>
      <div>Email: {{company.email}}</div>
    </div>
    <div class="info-box">
      <h3>To:</h3>
      <div><strong>{{client.name}}</strong></div>
      <div>{{client.company}}</div>
      <div>{{client.address}}</div>
      <div>{{client.city}}, {{client.state}} {{client.zip}}</div>
      <div>Attention: {{client.contact}}</div>
      <div>Phone: {{client.phone}}</div>
      <div>Email: {{client.email}}</div>
    </div>
  </div>

  <div class="info-box">
    <h3>Project Details</h3>
    <div><strong>Project:</strong> {{project.name}}</div>
    <div><strong>Location:</strong> {{project.location}}</div>
    <div><strong>Description:</strong> {{project.description}}</div>
  </div>

  <h2 style="color: #667eea; margin-top: 30px;">Pricing Breakdown</h2>
  
  <table class="pricing-table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each lineItems}}
      <tr>
        <td>{{item}}</td>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>\${{unitPrice | currency}}</td>
        <td>\${{total | currency}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="subtotal-section">
    <table style="width: 100%;">
      <tr>
        <td style="text-align: right; padding: 5px;"><strong>Subtotal:</strong></td>
        <td style="text-align: right; width: 150px;">\${{subtotal | currency}}</td>
      </tr>
      {{#if discount}}
      <tr>
        <td style="text-align: right; padding: 5px;">Discount ({{discountPercent}}%):</td>
        <td style="text-align: right;">-\${{discount | currency}}</td>
      </tr>
      {{/if}}
      <tr>
        <td style="text-align: right; padding: 5px;">GST (10%):</td>
        <td style="text-align: right;">\${{gst | currency}}</td>
      </tr>
    </table>
  </div>

  <div class="total-box">
    Total Amount: \${{total | currency}} AUD
  </div>

  <div class="validity">
    <strong>Quote Validity:</strong> This quote is valid for 30 days from {{quoteDate | date}} until {{validUntil | date}}
  </div>

  <div class="terms-section">
    <h3>Terms & Conditions</h3>
    <ul>
      <li><strong>Payment Terms:</strong> {{paymentTerms}}</li>
      <li><strong>Delivery:</strong> {{deliveryTerms}}</li>
      <li><strong>Warranty:</strong> {{warranty}}</li>
      <li>Prices are in Australian Dollars (AUD) and include GST</li>
      <li>This quote is subject to our standard terms and conditions</li>
    </ul>
  </div>

  <div class="signature-section">
    <h3>Acceptance</h3>
    <p>To accept this quotation, please sign below and return via email to {{company.email}}</p>
    <table style="width: 100%; margin-top: 30px;">
      <tr>
        <td style="width: 50%;">
          <div style="border-top: 2px solid #333; padding-top: 10px;">
            <div>Client Signature</div>
            <div style="margin-top: 5px;">Date: _____________</div>
          </div>
        </td>
        <td style="width: 50%;">
          <div style="border-top: 2px solid #333; padding-top: 10px;">
            <div>Print Name</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <div style="font-weight: bold;">{{company.name}}</div>
    <div>{{company.website}} | {{company.email}} | {{company.phone}}</div>
    <div style="font-size: 11px; margin-top: 10px;">Thank you for the opportunity to quote on your project</div>
  </div>
</body>
</html>`
  },

  // Invoice Templates
  INVOICE_STANDARD: {
    subject: 'Invoice #{{invoiceNumber}} - {{companyName}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; padding-bottom: 20px; border-bottom: 3px solid #ef4444; margin-bottom: 30px; }
    .title { font-size: 36px; color: #ef4444; font-weight: bold; letter-spacing: -1px; }
    .invoice-meta { background: #fee2e2; padding: 15px; border-radius: 8px; }
    .billing-info { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
    .info-block { padding: 15px; }
    .info-block h3 { color: #ef4444; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th { background: #ef4444; color: white; padding: 12px; text-align: left; font-weight: 500; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .totals-section { display: flex; justify-content: flex-end; margin: 30px 0; }
    .totals-table { width: 350px; }
    .totals-table td { padding: 8px; }
    .total-due { background: #ef4444; color: white; font-size: 20px; padding: 15px; text-align: right; font-weight: bold; }
    .payment-info { background: #f9fafb; padding: 25px; border-radius: 8px; margin: 30px 0; }
    .payment-info h3 { color: #ef4444; margin-bottom: 15px; }
    .overdue-notice { background: #fef2f2; border: 2px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0; color: #dc2626; }
    .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
    .remittance { border: 2px dashed #d1d5db; padding: 20px; margin-top: 50px; background: #fafafa; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      {{#if company.logo}}<img src="{{company.logo}}" style="max-height: 60px;" alt="{{company.name}}">{{/if}}
      <div style="margin-top: 10px;">
        <strong>{{company.name}}</strong><br>
        {{company.address}}<br>
        {{company.city}}, {{company.state}} {{company.zip}}<br>
        ABN: {{company.abn}}
      </div>
    </div>
    <div style="text-align: right;">
      <div class="title">INVOICE</div>
      <div class="invoice-meta">
        <div><strong>Invoice #:</strong> {{invoiceNumber}}</div>
        <div><strong>Date:</strong> {{invoiceDate | date}}</div>
        <div><strong>Due Date:</strong> {{dueDate | date}}</div>
      </div>
    </div>
  </div>

  <div class="billing-info">
    <div class="info-block">
      <h3>Bill To:</h3>
      <strong>{{client.name}}</strong><br>
      {{client.company}}<br>
      {{client.address}}<br>
      {{client.city}}, {{client.state}} {{client.zip}}<br>
      {{#if client.abn}}ABN: {{client.abn}}{{/if}}
    </div>
    <div class="info-block">
      <h3>Project Details:</h3>
      <strong>Job #:</strong> {{job.number}}<br>
      <strong>Project:</strong> {{job.name}}<br>
      <strong>PO #:</strong> {{purchaseOrder}}<br>
      <strong>Terms:</strong> {{paymentTerms}}
    </div>
  </div>

  {{#if isOverdue}}
  <div class="overdue-notice">
    <strong>OVERDUE NOTICE:</strong> This invoice is past due. Please remit payment immediately to avoid late fees.
  </div>
  {{/if}}

  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Description</th>
        <th>Quantity</th>
        <th>Rate</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each lineItems}}
      <tr>
        <td>
          <strong>{{description}}</strong>
          {{#if details}}<br><small style="color: #6b7280;">{{details}}</small>{{/if}}
        </td>
        <td>{{quantity}}</td>
        <td>\${{rate | currency}}</td>
        <td style="text-align: right;">\${{amount | currency}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals-section">
    <table class="totals-table">
      <tr>
        <td style="text-align: right;">Subtotal:</td>
        <td style="text-align: right; width: 120px;">\${{subtotal | currency}}</td>
      </tr>
      {{#if discount}}
      <tr>
        <td style="text-align: right;">Discount:</td>
        <td style="text-align: right;">-\${{discount | currency}}</td>
      </tr>
      {{/if}}
      <tr>
        <td style="text-align: right;">GST (10%):</td>
        <td style="text-align: right;">\${{gst | currency}}</td>
      </tr>
      <tr class="total-due">
        <td>Total Due:</td>
        <td>\${{totalDue | currency}} AUD</td>
      </tr>
    </table>
  </div>

  <div class="payment-info">
    <h3>Payment Instructions</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
      <div>
        <strong>Bank Transfer:</strong><br>
        Bank: {{bank.name}}<br>
        Account Name: {{bank.accountName}}<br>
        BSB: {{bank.bsb}}<br>
        Account: {{bank.accountNumber}}<br>
        Reference: {{invoiceNumber}}
      </div>
      <div>
        <strong>Other Payment Methods:</strong><br>
        • Credit Card: Contact accounts<br>
        • Cheque: Payable to {{company.name}}<br>
        • Payment Terms: {{paymentTerms}}<br>
        {{#if lateFee}}• Late Fee: {{lateFee}}% per month{{/if}}
      </div>
    </div>
  </div>

  <div class="remittance">
    <div style="text-align: center; margin-bottom: 15px;">
      <strong>REMITTANCE ADVICE</strong>
    </div>
    <table style="width: 100%;">
      <tr>
        <td>Invoice #: {{invoiceNumber}}</td>
        <td>Date: {{invoiceDate | date}}</td>
        <td>Amount: \${{totalDue | currency}}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding-top: 15px;">
          Please return this portion with your payment to: {{company.email}}
        </td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <strong>Thank you for your business!</strong><br>
    {{company.name}} | {{company.phone}} | {{company.email}} | {{company.website}}<br>
    <small>Please contact accounts@lateralengineering.co.nz with any questions</small>
  </div>
</body>
</html>`
  },

  // Receipt Template
  RECEIPT_STANDARD: {
    subject: 'Payment Receipt #{{receiptNumber}} - {{companyName}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
    .header { text-align: center; padding: 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 10px; }
    .title { font-size: 36px; font-weight: bold; margin-bottom: 10px; }
    .receipt-number { font-size: 18px; }
    .success-badge { display: inline-block; background: #dcfce7; color: #16a34a; padding: 10px 20px; border-radius: 20px; margin: 20px 0; font-weight: bold; }
    .receipt-body { margin: 30px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 20px 0; }
    .payment-details { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .amount-box { background: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; margin: 20px 0; }
    table { width: 100%; margin: 20px 0; }
    td { padding: 8px 0; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .thank-you { font-size: 20px; color: #10b981; font-weight: bold; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">PAYMENT RECEIPT</div>
    <div class="receipt-number">Receipt #{{receiptNumber}}</div>
    <div>{{receiptDate | date}}</div>
  </div>

  <div style="text-align: center;">
    <div class="success-badge">✓ PAYMENT RECEIVED</div>
  </div>

  <div class="receipt-body">
    <div class="detail-grid">
      <div>
        <h3>From:</h3>
        <strong>{{payer.name}}</strong><br>
        {{payer.company}}<br>
        {{payer.address}}<br>
        {{payer.city}}, {{payer.state}} {{payer.zip}}<br>
        {{#if payer.email}}Email: {{payer.email}}{{/if}}
      </div>
      <div>
        <h3>To:</h3>
        <strong>{{company.name}}</strong><br>
        {{company.address}}<br>
        {{company.city}}, {{company.state}} {{company.zip}}<br>
        ABN: {{company.abn}}<br>
        Email: {{company.email}}
      </div>
    </div>

    <div class="payment-details">
      <h3>Payment Details</h3>
      <table>
        <tr>
          <td><strong>Payment Method:</strong></td>
          <td>{{paymentMethod}}</td>
        </tr>
        <tr>
          <td><strong>Payment Date:</strong></td>
          <td>{{paymentDate | date}}</td>
        </tr>
        <tr>
          <td><strong>Reference Number:</strong></td>
          <td>{{referenceNumber}}</td>
        </tr>
        <tr>
          <td><strong>Invoice Number(s):</strong></td>
          <td>{{invoiceNumbers}}</td>
        </tr>
        {{#if checkNumber}}
        <tr>
          <td><strong>Check Number:</strong></td>
          <td>{{checkNumber}}</td>
        </tr>
        {{/if}}
      </table>
    </div>

    <div class="amount-box">
      Amount Received: \${{amount | currency}} AUD
    </div>

    <table style="background: #f9fafb; padding: 15px; border-radius: 8px;">
      <thead>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <th style="text-align: left; padding-bottom: 10px;">Invoice #</th>
          <th style="text-align: right; padding-bottom: 10px;">Amount Applied</th>
        </tr>
      </thead>
      <tbody>
        {{#each appliedInvoices}}
        <tr>
          <td style="padding: 5px 0;">{{invoiceNumber}}</td>
          <td style="text-align: right; padding: 5px 0;">\${{amount | currency}}</td>
        </tr>
        {{/each}}
      </tbody>
      <tfoot>
        <tr style="border-top: 2px solid #e5e7eb; font-weight: bold;">
          <td style="padding-top: 10px;">Total Applied:</td>
          <td style="text-align: right; padding-top: 10px;">\${{totalApplied | currency}}</td>
        </tr>
        {{#if credit}}
        <tr>
          <td>Credit Balance:</td>
          <td style="text-align: right;">\${{credit | currency}}</td>
        </tr>
        {{/if}}
      </tfoot>
    </table>

    {{#if notes}}
    <div style="margin-top: 20px; padding: 15px; background: #fefce8; border-radius: 8px;">
      <strong>Notes:</strong><br>
      {{notes}}
    </div>
    {{/if}}
  </div>

  <div style="text-align: center;">
    <div class="thank-you">Thank You for Your Payment!</div>
    <p>This receipt confirms that we have received your payment.</p>
    <p>Please keep this receipt for your records.</p>
  </div>

  <div class="footer">
    <strong>{{company.name}}</strong><br>
    {{company.phone}} | {{company.email}} | {{company.website}}<br>
    <small style="color: #9ca3af;">This is an automatically generated receipt. No signature required.</small>
  </div>
</body>
</html>`
  },

  // Delivery Note Template
  DELIVERY_STANDARD: {
    subject: 'Delivery Note #{{deliveryNumber}} - {{companyName}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
    .header { border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
    .title { font-size: 32px; color: #f59e0b; font-weight: bold; }
    .delivery-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 20px 0; }
    .address-box { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; }
    .address-box h3 { color: #f59e0b; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th { background: #f59e0b; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
    .signature-box { border: 1px solid #d1d5db; padding: 20px; border-radius: 8px; background: #f9fafb; }
    .notes-section { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
    .tracking-info { background: #fff; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <table width="100%">
      <tr>
        <td>
          {{#if company.logo}}<img src="{{company.logo}}" style="max-height: 60px;" alt="{{company.name}}">{{/if}}
          <div><strong>{{company.name}}</strong></div>
          <div>{{company.address}}</div>
          <div>{{company.phone}} | {{company.email}}</div>
        </td>
        <td style="text-align: right;">
          <div class="title">DELIVERY NOTE</div>
          <div><strong>DN #:</strong> {{deliveryNumber}}</div>
          <div><strong>Date:</strong> {{deliveryDate | date}}</div>
          <div><strong>Time:</strong> {{deliveryTime}}</div>
        </td>
      </tr>
    </table>
  </div>

  <div class="delivery-info">
    <table width="100%">
      <tr>
        <td><strong>Purchase Order #:</strong> {{purchaseOrder}}</td>
        <td><strong>Invoice #:</strong> {{invoiceNumber}}</td>
        <td><strong>Job #:</strong> {{jobNumber}}</td>
      </tr>
      <tr>
        <td><strong>Vehicle:</strong> {{vehicle}}</td>
        <td><strong>Driver:</strong> {{driver}}</td>
        <td><strong>Contact:</strong> {{driverContact}}</td>
      </tr>
    </table>
  </div>

  <div class="address-grid">
    <div class="address-box">
      <h3>Ship From:</h3>
      <strong>{{shipFrom.name}}</strong><br>
      {{shipFrom.address}}<br>
      {{shipFrom.city}}, {{shipFrom.state}} {{shipFrom.zip}}<br>
      {{shipFrom.phone}}
    </div>
    <div class="address-box">
      <h3>Ship To:</h3>
      <strong>{{shipTo.name}}</strong><br>
      {{shipTo.company}}<br>
      {{shipTo.address}}<br>
      {{shipTo.city}}, {{shipTo.state}} {{shipTo.zip}}<br>
      Contact: {{shipTo.contact}}<br>
      Phone: {{shipTo.phone}}
    </div>
  </div>

  {{#if trackingNumber}}
  <div class="tracking-info">
    <strong>Tracking Information:</strong><br>
    Carrier: {{carrier}}<br>
    Tracking #: {{trackingNumber}}<br>
    Estimated Delivery: {{estimatedDelivery | date}}
  </div>
  {{/if}}

  <h3>Delivered Items:</h3>
  <table>
    <thead>
      <tr>
        <th>Item #</th>
        <th>Description</th>
        <th>Ordered Qty</th>
        <th>Delivered Qty</th>
        <th>Back Order</th>
        <th>Unit</th>
        <th>Weight</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{itemNumber}}</td>
        <td>{{description}}</td>
        <td>{{orderedQty}}</td>
        <td>{{deliveredQty}}</td>
        <td>{{backOrder}}</td>
        <td>{{unit}}</td>
        <td>{{weight}}</td>
      </tr>
      {{/each}}
    </tbody>
    <tfoot>
      <tr style="font-weight: bold;">
        <td colspan="5">Total Items:</td>
        <td>{{totalItems}}</td>
        <td>{{totalWeight}} kg</td>
      </tr>
    </tfoot>
  </table>

  {{#if specialInstructions}}
  <div class="notes-section">
    <h3>Special Instructions:</h3>
    {{specialInstructions}}
  </div>
  {{/if}}

  <div class="signature-grid">
    <div class="signature-box">
      <h4>Delivered By:</h4>
      <div style="margin: 30px 0; border-bottom: 2px solid #333;"></div>
      <div>Signature</div>
      <div style="margin-top: 10px;">
        Name: _______________________<br>
        Date: _______________________<br>
        Time: _______________________
      </div>
    </div>
    <div class="signature-box">
      <h4>Received By:</h4>
      <div style="margin: 30px 0; border-bottom: 2px solid #333;"></div>
      <div>Signature</div>
      <div style="margin-top: 10px;">
        Name: _______________________<br>
        Date: _______________________<br>
        Time: _______________________
      </div>
      <div style="margin-top: 15px;">
        <input type="checkbox"> Goods received in good condition<br>
        <input type="checkbox"> Quantity checked and verified
      </div>
    </div>
  </div>

  <div class="footer">
    <strong>Important:</strong> Please check all items immediately upon receipt. Report any discrepancies within 24 hours.<br>
    {{company.name}} | {{company.phone}} | {{company.email}}<br>
    <small>This delivery note must be signed and returned as proof of delivery</small>
  </div>
</body>
</html>`
  },

  // Email Templates
  EMAIL_PO_ACCEPTANCE: {
    subject: 'Purchase Order {{orderNumber}} - Acceptance Confirmation',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; }
    .email-header { background: #10b981; color: white; padding: 30px; text-align: center; }
    .email-body { padding: 30px; background: #ffffff; }
    .success-message { background: #dcfce7; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .details-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="email-header">
    <h1>Purchase Order Accepted</h1>
  </div>
  
  <div class="email-body">
    <p>Dear {{supplier.contactName}},</p>
    
    <div class="success-message">
      <strong>✓ Success!</strong> We have received and accepted your acknowledgment for Purchase Order #{{orderNumber}}.
    </div>
    
    <p>Thank you for confirming receipt and acceptance of our purchase order. This email serves as formal confirmation that the order has been accepted with the following details:</p>
    
    <div class="details-box">
      <h3>Order Summary:</h3>
      <table style="width: 100%;">
        <tr>
          <td><strong>PO Number:</strong></td>
          <td>{{orderNumber}}</td>
        </tr>
        <tr>
          <td><strong>Supplier:</strong></td>
          <td>{{supplier.name}}</td>
        </tr>
        <tr>
          <td><strong>Order Date:</strong></td>
          <td>{{orderDate | date}}</td>
        </tr>
        <tr>
          <td><strong>Delivery Date:</strong></td>
          <td>{{deliveryDate | date}}</td>
        </tr>
        <tr>
          <td><strong>Total Amount:</strong></td>
          <td>\${{totalAmount | currency}}</td>
        </tr>
        <tr>
          <td><strong>Delivery Location:</strong></td>
          <td>{{deliveryLocation}}</td>
        </tr>
        <tr>
          <td><strong>Job/Project:</strong></td>
          <td>{{jobNumber}} - {{jobName}}</td>
        </tr>
      </table>
    </div>
    
    <h3>Next Steps:</h3>
    <ul>
      <li>Please proceed with the order as per the agreed specifications</li>
      <li>Ensure delivery by the confirmed date: {{deliveryDate | date}}</li>
      <li>Include the PO number ({{orderNumber}}) on all shipping documents and invoices</li>
      <li>Contact us immediately if there are any changes or issues</li>
    </ul>
    
    {{#if specialInstructions}}
    <div class="details-box">
      <h3>Special Instructions:</h3>
      <p>{{specialInstructions}}</p>
    </div>
    {{/if}}
    
    <p>If you have any questions or need to make changes to this order, please contact us immediately at {{contact.email}} or {{contact.phone}}.</p>
    
    <center>
      <a href="{{portalLink}}" class="button">View Order Details</a>
    </center>
    
    <p>Best regards,<br>
    {{sender.name}}<br>
    {{sender.title}}<br>
    {{company.name}}</p>
    
    {{#if emailSignature}}
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      {{{emailSignature}}}
    </div>
    {{/if}}
  </div>
  
  <div class="footer">
    <p>{{company.name}}<br>
    {{company.address}}, {{company.city}}, {{company.state}} {{company.zip}}<br>
    Phone: {{company.phone}} | Email: {{company.email}}<br>
    ABN: {{company.abn}}</p>
    <p>This is an automated email. Please do not reply directly to this message.</p>
  </div>
</body>
</html>`
  },

  EMAIL_PO_REJECTION: {
    subject: 'Purchase Order {{orderNumber}} - Rejection Notice',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; }
    .email-header { background: #ef4444; color: white; padding: 30px; text-align: center; }
    .email-body { padding: 30px; background: #ffffff; }
    .rejection-message { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
    .details-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="email-header">
    <h1>Purchase Order Rejected</h1>
  </div>
  
  <div class="email-body">
    <p>Dear {{supplier.contactName}},</p>
    
    <div class="rejection-message">
      <strong>⚠ Important:</strong> Purchase Order #{{orderNumber}} has been rejected and requires your immediate attention.
    </div>
    
    <p>We regret to inform you that we cannot accept the purchase order acknowledgment due to the following reason(s):</p>
    
    <div class="details-box" style="background: #fef2f2;">
      <h3>Rejection Reason:</h3>
      <p>{{rejectionReason}}</p>
    </div>
    
    <div class="details-box">
      <h3>Order Details:</h3>
      <table style="width: 100%;">
        <tr>
          <td><strong>PO Number:</strong></td>
          <td>{{orderNumber}}</td>
        </tr>
        <tr>
          <td><strong>Order Date:</strong></td>
          <td>{{orderDate | date}}</td>
        </tr>
        <tr>
          <td><strong>Original Delivery Date:</strong></td>
          <td>{{deliveryDate | date}}</td>
        </tr>
        <tr>
          <td><strong>Total Amount:</strong></td>
          <td>\${{totalAmount | currency}}</td>
        </tr>
      </table>
    </div>
    
    <h3>Required Actions:</h3>
    <ul>
      <li>Review the rejection reason carefully</li>
      <li>Contact us to discuss the issues: {{contact.phone}}</li>
      <li>Submit a revised acknowledgment if applicable</li>
      <li>Confirm any changes to pricing, delivery, or specifications</li>
    </ul>
    
    <p><strong>Please note:</strong> This order is currently on hold and should not be processed until the issues are resolved and a new acknowledgment is accepted.</p>
    
    <center>
      <a href="{{portalLink}}" class="button">View Rejection Details</a>
    </center>
    
    <p>Please contact us urgently at {{contact.email}} or {{contact.phone}} to resolve this matter.</p>
    
    <p>Regards,<br>
    {{sender.name}}<br>
    {{sender.title}}<br>
    {{company.name}}</p>
    
    {{#if emailSignature}}
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      {{{emailSignature}}}
    </div>
    {{/if}}
  </div>
  
  <div class="footer">
    <p>{{company.name}}<br>
    {{company.address}}, {{company.city}}, {{company.state}} {{company.zip}}<br>
    Phone: {{company.phone}} | Email: {{company.email}}</p>
    <p>This is an urgent notification. Please respond promptly.</p>
  </div>
</body>
</html>`
  },

  EMAIL_RFQ_FOLLOWUP: {
    subject: 'Reminder: RFQ {{rfqNumber}} - Response Due {{dueDate}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; }
    .email-header { background: #3b82f6; color: white; padding: 30px; text-align: center; }
    .email-body { padding: 30px; background: #ffffff; }
    .reminder-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .deadline-warning { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .details-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="email-header">
    <h1>RFQ Follow-up Reminder</h1>
  </div>
  
  <div class="email-body">
    <p>Dear {{supplier.contactName}},</p>
    
    <div class="reminder-box">
      <strong>Reminder:</strong> We are following up on RFQ #{{rfqNumber}} sent on {{sentDate | date}}.
    </div>
    
    <div class="deadline-warning">
      <h2 style="margin: 0; color: #f59e0b;">Quote Due: {{dueDate | date}}</h2>
      <p style="margin: 5px 0;">{{daysRemaining}} days remaining</p>
    </div>
    
    <p>We haven't received your quote yet and wanted to ensure you received our request for quotation. Your competitive bid is important to us, and we'd like to include you in our evaluation process.</p>
    
    <div class="details-box">
      <h3>RFQ Summary:</h3>
      <table style="width: 100%;">
        <tr>
          <td><strong>RFQ Number:</strong></td>
          <td>{{rfqNumber}}</td>
        </tr>
        <tr>
          <td><strong>Project:</strong></td>
          <td>{{project.name}}</td>
        </tr>
        <tr>
          <td><strong>Items Requested:</strong></td>
          <td>{{itemCount}} items</td>
        </tr>
        <tr>
          <td><strong>Delivery Required:</strong></td>
          <td>{{deliveryDate | date}}</td>
        </tr>
        <tr>
          <td><strong>Response Due:</strong></td>
          <td style="color: #ef4444; font-weight: bold;">{{dueDate | date}}</td>
        </tr>
      </table>
    </div>
    
    <h3>How to Submit Your Quote:</h3>
    <ol>
      <li>Click the button below to access the RFQ details</li>
      <li>Review all specifications and requirements</li>
      <li>Prepare your competitive quote</li>
      <li>Submit before {{dueDate | date}} at {{dueTime}}</li>
    </ol>
    
    <center>
      <a href="{{rfqLink}}" class="button">View RFQ & Submit Quote</a>
    </center>
    
    <p>If you're unable to quote or need an extension, please let us know immediately by replying to this email or calling {{contact.phone}}.</p>
    
    <p><strong>Why quote with us?</strong></p>
    <ul>
      <li>Opportunity for ongoing business relationship</li>
      <li>Fair and transparent evaluation process</li>
      <li>Prompt payment terms</li>
      <li>Professional project management</li>
    </ul>
    
    <p>We value your partnership and look forward to receiving your competitive quote.</p>
    
    <p>Best regards,<br>
    {{sender.name}}<br>
    {{sender.title}}<br>
    {{company.name}}</p>
    
    {{#if emailSignature}}
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      {{{emailSignature}}}
    </div>
    {{/if}}
  </div>
  
  <div class="footer">
    <p>{{company.name}}<br>
    Phone: {{company.phone}} | Email: {{company.email}}</p>
    <p>If you've already submitted your quote, please disregard this reminder.</p>
  </div>
</body>
</html>`
  },

  EMAIL_PAYMENT_REMINDER: {
    subject: 'Payment Reminder - Invoice {{invoiceNumber}} Due {{dueDate}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; }
    .email-header { background: #f59e0b; color: white; padding: 30px; text-align: center; }
    .email-body { padding: 30px; background: #ffffff; }
    .reminder-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .overdue-warning { background: #fee2e2; border: 2px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; color: #dc2626; }
    .invoice-summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .amount-due { background: #f59e0b; color: white; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="email-header">
    <h1>Payment Reminder</h1>
  </div>
  
  <div class="email-body">
    <p>Dear {{client.name}},</p>
    
    {{#if isOverdue}}
    <div class="overdue-warning">
      <strong>OVERDUE NOTICE</strong><br>
      Invoice #{{invoiceNumber}} is {{daysOverdue}} days past due
    </div>
    {{else}}
    <div class="reminder-box">
      <strong>Friendly Reminder:</strong> Invoice #{{invoiceNumber}} is due in {{daysUntilDue}} days.
    </div>
    {{/if}}
    
    <p>This is a {{#if isOverdue}}urgent{{else}}friendly{{/if}} reminder that the following invoice {{#if isOverdue}}is past due{{else}}will be due soon{{/if}}:</p>
    
    <div class="invoice-summary">
      <h3>Invoice Details:</h3>
      <table style="width: 100%;">
        <tr>
          <td><strong>Invoice Number:</strong></td>
          <td>{{invoiceNumber}}</td>
        </tr>
        <tr>
          <td><strong>Invoice Date:</strong></td>
          <td>{{invoiceDate | date}}</td>
        </tr>
        <tr>
          <td><strong>Due Date:</strong></td>
          <td style="{{#if isOverdue}}color: #ef4444; font-weight: bold;{{/if}}">{{dueDate | date}}</td>
        </tr>
        <tr>
          <td><strong>Project/Job:</strong></td>
          <td>{{jobNumber}} - {{jobName}}</td>
        </tr>
        <tr>
          <td><strong>Payment Terms:</strong></td>
          <td>{{paymentTerms}}</td>
        </tr>
      </table>
    </div>
    
    <div class="amount-due">
      Amount Due: \${{amountDue | currency}} AUD
    </div>
    
    <h3>Payment Options:</h3>
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
      <p><strong>Bank Transfer (Preferred):</strong><br>
      Bank: {{bank.name}}<br>
      Account Name: {{bank.accountName}}<br>
      BSB: {{bank.bsb}}<br>
      Account: {{bank.accountNumber}}<br>
      Reference: {{invoiceNumber}}</p>
      
      <p><strong>Other Methods:</strong><br>
      • Credit Card: Contact our accounts team<br>
      • Cheque: Payable to {{company.name}}</p>
    </div>
    
    <center>
      <a href="{{invoiceLink}}" class="button">View Invoice</a>
      <a href="{{paymentLink}}" class="button" style="background: #10b981;">Pay Now</a>
    </center>
    
    {{#if isOverdue}}
    <p style="color: #dc2626;"><strong>Important:</strong> Please remit payment immediately to avoid late fees and service interruption. If you've already sent payment, please disregard this notice and contact us with your payment details.</p>
    {{else}}
    <p>We appreciate your prompt attention to this matter. If you've already sent payment or have any questions, please contact us.</p>
    {{/if}}
    
    <p>Thank you for your continued business.</p>
    
    <p>Best regards,<br>
    Accounts Team<br>
    {{company.name}}</p>
    
    {{#if emailSignature}}
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      {{{emailSignature}}}
    </div>
    {{/if}}
  </div>
  
  <div class="footer">
    <p>{{company.name}}<br>
    {{company.address}}, {{company.city}}, {{company.state}} {{company.zip}}<br>
    Phone: {{company.phone}} | Email: accounts@lateralengineering.co.nz<br>
    ABN: {{company.abn}}</p>
    {{#if lateFee}}<p style="color: #dc2626;">Late payments may incur a {{lateFee}}% monthly charge.</p>{{/if}}
  </div>
</body>
</html>`
  },

  EMAIL_DELIVERY_REMINDER: {
    subject: 'Delivery Reminder - PO {{orderNumber}} Expected {{deliveryDate}}',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; }
    .email-header { background: #8b5cf6; color: white; padding: 30px; text-align: center; }
    .email-body { padding: 30px; background: #ffffff; }
    .reminder-box { background: #ede9fe; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; }
    .delivery-info { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
    .status-pending { background: #fef3c7; color: #d97706; }
    .status-overdue { background: #fee2e2; color: #dc2626; }
    .status-upcoming { background: #dcfce7; color: #16a34a; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="email-header">
    <h1>Delivery Reminder</h1>
  </div>
  
  <div class="email-body">
    <p>Dear {{supplier.contactName}},</p>
    
    <div class="reminder-box">
      <strong>Delivery Reminder:</strong> Purchase Order #{{orderNumber}} is {{#if isOverdue}}overdue{{else}}scheduled for delivery{{/if}} on {{deliveryDate | date}}.
    </div>
    
    {{#if isOverdue}}
    <div class="status-badge status-overdue">
      ⚠ DELIVERY OVERDUE - Immediate Action Required
    </div>
    {{else if isToday}}
    <div class="status-badge status-pending">
      📦 DELIVERY DUE TODAY
    </div>
    {{else}}
    <div class="status-badge status-upcoming">
      ✓ DELIVERY IN {{daysUntil}} DAYS
    </div>
    {{/if}}
    
    <div class="delivery-info">
      <h3>Order Details:</h3>
      <table style="width: 100%;">
        <tr>
          <td><strong>PO Number:</strong></td>
          <td>{{orderNumber}}</td>
        </tr>
        <tr>
          <td><strong>Order Date:</strong></td>
          <td>{{orderDate | date}}</td>
        </tr>
        <tr>
          <td><strong>Expected Delivery:</strong></td>
          <td style="{{#if isOverdue}}color: #ef4444; font-weight: bold;{{/if}}">{{deliveryDate | date}}</td>
        </tr>
        <tr>
          <td><strong>Delivery Location:</strong></td>
          <td>{{deliveryAddress}}</td>
        </tr>
        <tr>
          <td><strong>Job/Project:</strong></td>
          <td>{{jobNumber}} - {{jobName}}</td>
        </tr>
        <tr>
          <td><strong>Contact Person:</strong></td>
          <td>{{contact.name}} - {{contact.phone}}</td>
        </tr>
      </table>
    </div>
    
    <h3>Required Actions:</h3>
    <ul>
      {{#if isOverdue}}
      <li style="color: #dc2626;"><strong>Urgently provide updated delivery status</strong></li>
      <li style="color: #dc2626;"><strong>Contact us immediately if there are delays</strong></li>
      {{else}}
      <li>Confirm delivery is on schedule</li>
      <li>Provide tracking information if available</li>
      {{/if}}
      <li>Ensure all items on the PO are ready for delivery</li>
      <li>Include delivery note with PO number clearly marked</li>
      <li>Notify us of any quantity or specification changes</li>
    </ul>
    
    {{#if trackingAvailable}}
    <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h4>Tracking Information:</h4>
      <p>Please provide tracking details by replying to this email or updating our supplier portal.</p>
    </div>
    {{/if}}
    
    <center>
      <a href="{{orderLink}}" class="button">View Order Details</a>
      <a href="{{updateLink}}" class="button" style="background: #10b981;">Update Delivery Status</a>
    </center>
    
    {{#if isOverdue}}
    <p style="color: #dc2626;"><strong>Critical:</strong> This delivery is now overdue and may be impacting our project timeline. Please contact us immediately at {{contact.phone}} to provide an update.</p>
    {{else}}
    <p>Please ensure the delivery arrives on the scheduled date. If you anticipate any delays, notify us immediately so we can adjust our project schedule.</p>
    {{/if}}
    
    <p>Thank you for your attention to this matter.</p>
    
    <p>Best regards,<br>
    {{sender.name}}<br>
    Procurement Team<br>
    {{company.name}}</p>
    
    {{#if emailSignature}}
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      {{{emailSignature}}}
    </div>
    {{/if}}
  </div>
  
  <div class="footer">
    <p>{{company.name}}<br>
    {{company.address}}, {{company.city}}, {{company.state}} {{company.zip}}<br>
    Phone: {{company.phone}} | Email: {{company.email}}</p>
    <p>This is an automated reminder. For urgent matters, please call {{contact.phone}}.</p>
  </div>
</body>
</html>`
  }
};

// Sample data for template previews
export const sampleData = {
  PO: {
    company: {
      name: 'Lateral Engineering Limited',
      address: '123 Engineering Way',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1010',
      phone: '09-123-4567',
      email: 'accounts@lateralengineering.co.nz',
      website: 'www.lateralengineering.co.nz',
      abn: '12 345 678 901',
      logo: '/logo.png'
    },
    supplier: {
      name: 'Steel Supplies Ltd',
      address: '456 Industrial Road',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1020',
      contact: 'John Smith',
      phone: '09-987-6543',
      email: 'orders@steelsupplies.co.nz'
    },
    orderNumber: 'PO-2024-001',
    orderDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    delivery: {
      name: 'Main Warehouse',
      address: '789 Storage Lane',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1030',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    job: {
      number: 'JOB-2024-050',
      name: 'Bridge Construction Project'
    },
    lineItems: [
      { itemNumber: '001', description: 'Steel Beam 200x100x6mm', quantity: 10, unit: 'EA', unitPrice: 250.00, total: 2500.00 },
      { itemNumber: '002', description: 'Steel Plate 10mm', quantity: 5, unit: 'M²', unitPrice: 180.00, total: 900.00 },
      { itemNumber: '003', description: 'Bolts M20x100', quantity: 100, unit: 'EA', unitPrice: 2.50, total: 250.00 }
    ],
    subtotal: 3650.00,
    taxRate: 15,
    tax: 547.50,
    shipping: 150.00,
    total: 4347.50,
    terms: 'Standard terms and conditions apply. Goods remain property of supplier until full payment received.',
    paymentTerms: 'Net 30 days',
    deliveryTerms: 'FOB Destination'
  },
  RFQ: {
    company: {
      name: 'Lateral Engineering Limited',
      address: '123 Engineering Way',
      phone: '09-123-4567',
      email: 'procurement@lateralengineering.co.nz',
      website: 'www.lateralengineering.co.nz',
      logo: '/logo.png'
    },
    rfqNumber: 'RFQ-2024-015',
    rfqDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    project: {
      name: 'Industrial Warehouse Extension',
      location: 'Auckland Central',
      deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    contact: {
      name: 'Sarah Johnson',
      phone: '09-123-4567',
      email: 'sarah@lateralengineering.co.nz'
    },
    items: [
      { itemNumber: '001', description: 'Structural Steel Beams', specifications: 'Grade 300, 250UB25.7', quantity: 50, unit: 'M', requiredDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString() },
      { itemNumber: '002', description: 'Steel Columns', specifications: 'Grade 350, 200UC46.2', quantity: 20, unit: 'EA', requiredDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString() }
    ]
  },
  Quote: {
    company: {
      name: 'Lateral Engineering Limited',
      address: '123 Engineering Way',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1010',
      abn: '12 345 678 901',
      phone: '09-123-4567',
      email: 'sales@lateralengineering.co.nz',
      website: 'www.lateralengineering.co.nz'
    },
    client: {
      name: 'Mr. James Wilson',
      company: 'Wilson Construction Ltd',
      address: '789 Builder Street',
      city: 'Wellington',
      state: 'Wellington',
      zip: '6011',
      contact: 'James Wilson',
      phone: '04-123-4567',
      email: 'james@wilsonconstruction.co.nz'
    },
    quoteNumber: 'Q-2024-087',
    quoteDate: new Date().toISOString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    project: {
      name: 'Commercial Building Steel Framework',
      location: 'Wellington CBD',
      description: 'Supply and fabrication of structural steel for 5-story commercial building'
    },
    lineItems: [
      { item: 'Steel Fabrication', description: 'Fabrication of main structural beams as per drawings', quantity: 1, unitPrice: 45000, total: 45000 },
      { item: 'Steel Supply', description: 'Grade 300 structural steel - various sizes', quantity: 85, unitPrice: 280, total: 23800 },
      { item: 'Installation', description: 'On-site installation and welding', quantity: 1, unitPrice: 18000, total: 18000 }
    ],
    subtotal: 86800,
    discountPercent: 5,
    discount: 4340,
    gst: 8246,
    total: 90706,
    paymentTerms: '30% deposit, 70% on completion',
    deliveryTerms: '6-8 weeks from approval',
    warranty: '10 year structural warranty'
  },
  Invoice: {
    company: {
      name: 'Lateral Engineering Limited',
      address: '123 Engineering Way',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1010',
      abn: '12 345 678 901',
      phone: '09-123-4567',
      email: 'accounts@lateralengineering.co.nz',
      website: 'www.lateralengineering.co.nz'
    },
    client: {
      name: 'ABC Construction Pty Ltd',
      company: 'ABC Construction',
      address: '456 Builder Avenue',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1050',
      abn: '98 765 432 109'
    },
    invoiceNumber: 'INV-2024-0234',
    invoiceDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    job: {
      number: 'JOB-2024-032',
      name: 'Office Building Steel Structure'
    },
    purchaseOrder: 'PO-ABC-8976',
    paymentTerms: 'Net 30 days',
    lineItems: [
      { description: 'Steel Fabrication Services', details: 'As per quote Q-2024-065', quantity: 1, rate: 52000, amount: 52000 },
      { description: 'Material Supply - Steel Beams', details: 'Grade 300, various sizes', quantity: 45, rate: 320, amount: 14400 },
      { description: 'Installation and Welding', details: 'On-site services', quantity: 120, rate: 185, amount: 22200 }
    ],
    subtotal: 88600,
    gst: 8860,
    totalDue: 97460,
    bank: {
      name: 'ANZ Bank',
      accountName: 'Lateral Engineering Limited',
      bsb: '06-0123',
      accountNumber: '1234567-00'
    },
    lateFee: 1.5,
    isOverdue: false
  },
  Receipt: {
    company: {
      name: 'Lateral Engineering Limited',
      address: '123 Engineering Way',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1010',
      abn: '12 345 678 901',
      email: 'accounts@lateralengineering.co.nz'
    },
    payer: {
      name: 'XYZ Builders Ltd',
      company: 'XYZ Builders',
      address: '789 Construction Road',
      city: 'Christchurch',
      state: 'Canterbury',
      zip: '8011',
      email: 'accounts@xyzbuilders.co.nz'
    },
    receiptNumber: 'REC-2024-0156',
    receiptDate: new Date().toISOString(),
    paymentDate: new Date().toISOString(),
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'REF-784512',
    invoiceNumbers: 'INV-2024-0198, INV-2024-0203',
    amount: 125750.50,
    appliedInvoices: [
      { invoiceNumber: 'INV-2024-0198', amount: 75500.00 },
      { invoiceNumber: 'INV-2024-0203', amount: 50250.50 }
    ],
    totalApplied: 125750.50
  },
  DeliveryNote: {
    company: {
      name: 'Lateral Engineering Limited',
      address: '123 Engineering Way',
      phone: '09-123-4567',
      email: 'logistics@lateralengineering.co.nz',
      logo: '/logo.png'
    },
    deliveryNumber: 'DN-2024-0089',
    deliveryDate: new Date().toISOString(),
    deliveryTime: '14:30',
    purchaseOrder: 'PO-2024-001',
    invoiceNumber: 'INV-2024-0234',
    jobNumber: 'JOB-2024-050',
    vehicle: 'Truck #5 - Plate: ABC123',
    driver: 'Mike Thompson',
    driverContact: '021-123-4567',
    shipFrom: {
      name: 'Lateral Engineering Warehouse',
      address: '123 Engineering Way',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1010',
      phone: '09-123-4567'
    },
    shipTo: {
      name: 'Construction Site',
      company: 'ABC Construction',
      address: '456 Building Site Road',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1050',
      contact: 'Site Manager - John',
      phone: '021-987-6543'
    },
    items: [
      { itemNumber: '001', description: 'Steel Beams 200x100', orderedQty: 10, deliveredQty: 10, backOrder: 0, unit: 'EA', weight: '500' },
      { itemNumber: '002', description: 'Steel Plates 10mm', orderedQty: 5, deliveredQty: 4, backOrder: 1, unit: 'M²', weight: '200' }
    ],
    totalItems: 14,
    totalWeight: 700,
    specialInstructions: 'Please call site manager 30 minutes before arrival. Use Gate B for site access.'
  },
  AcceptanceEmail: {
    supplier: { contactName: 'John Smith', name: 'Steel Supplies Ltd' },
    company: { 
      name: 'Lateral Engineering Limited',
      address: '123 Engineering Way',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1010',
      phone: '09-123-4567',
      email: 'accounts@lateralengineering.co.nz',
      abn: '12 345 678 901'
    },
    orderNumber: 'PO-2024-001',
    orderDate: new Date().toISOString(),
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalAmount: 4347.50,
    deliveryLocation: 'Main Warehouse, 789 Storage Lane, Auckland',
    jobNumber: 'JOB-2024-050',
    jobName: 'Bridge Construction Project',
    contact: { email: 'procurement@lateralengineering.co.nz', phone: '09-123-4567' },
    sender: { name: 'Sarah Johnson', title: 'Procurement Manager' },
    portalLink: 'https://portal.lateralengineering.co.nz/po/PO-2024-001'
  },
  RejectionEmail: {
    supplier: { contactName: 'John Smith' },
    company: { 
      name: 'Lateral Engineering Limited',
      address: '123 Engineering Way',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1010',
      phone: '09-123-4567',
      email: 'accounts@lateralengineering.co.nz'
    },
    orderNumber: 'PO-2024-001',
    orderDate: new Date().toISOString(),
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalAmount: 4347.50,
    rejectionReason: 'The delivery date specified (7 days) does not meet our project requirements. We need delivery within 5 business days as originally discussed.',
    contact: { email: 'procurement@lateralengineering.co.nz', phone: '09-123-4567' },
    sender: { name: 'Sarah Johnson', title: 'Procurement Manager' },
    portalLink: 'https://portal.lateralengineering.co.nz/po/PO-2024-001'
  },
  FollowUp: {
    supplier: { contactName: 'Jane Doe' },
    company: { 
      name: 'Lateral Engineering Limited',
      phone: '09-123-4567',
      email: 'procurement@lateralengineering.co.nz'
    },
    rfqNumber: 'RFQ-2024-015',
    sentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueTime: '5:00 PM',
    daysRemaining: 2,
    project: { name: 'Industrial Warehouse Extension' },
    itemCount: 5,
    deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    contact: { phone: '09-123-4567' },
    sender: { name: 'Sarah Johnson', title: 'Procurement Manager' },
    rfqLink: 'https://portal.lateralengineering.co.nz/rfq/RFQ-2024-015'
  },
  Reminders: {
    client: { name: 'ABC Construction' },
    company: { 
      name: 'Lateral Engineering Limited',
      address: '123 Engineering Way',
      city: 'Auckland',
      state: 'Auckland',
      zip: '1010',
      phone: '09-123-4567',
      email: 'accounts@lateralengineering.co.nz',
      abn: '12 345 678 901'
    },
    invoiceNumber: 'INV-2024-0234',
    invoiceDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    jobNumber: 'JOB-2024-032',
    jobName: 'Office Building Steel Structure',
    paymentTerms: 'Net 30 days',
    amountDue: 97460.00,
    bank: {
      name: 'ANZ Bank',
      accountName: 'Lateral Engineering Limited',
      bsb: '06-0123',
      accountNumber: '1234567-00'
    },
    invoiceLink: 'https://portal.lateralengineering.co.nz/invoice/INV-2024-0234',
    paymentLink: 'https://portal.lateralengineering.co.nz/pay/INV-2024-0234',
    isOverdue: false,
    daysUntilDue: 5,
    lateFee: 1.5
  }
};