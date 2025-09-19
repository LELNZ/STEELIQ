-- PO Template Version
INSERT INTO template_versions (template_id, version, version_number, html_template, subject_template, text_template, changelog, published_at, created_at)
VALUES (
  20, -- PO_STANDARD
  '1.0.0',
  1,
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: Helvetica Neue, Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0; padding: 20px; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .logo-section { flex: 1; }
    .po-info { text-align: right; }
    .title { font-size: 32px; font-weight: bold; color: #2563eb; margin: 20px 0; }
    .po-number { font-size: 18px; color: #4b5563; margin: 5px 0; }
    .date-info { font-size: 14px; color: #6b7280; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
    .party-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background: #f9fafb; }
    .party-title { font-weight: bold; color: #2563eb; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
    .party-name { font-weight: bold; font-size: 16px; color: #111827; margin: 10px 0; }
    .party-detail { font-size: 14px; color: #4b5563; margin: 3px 0; }
    .items-section { margin: 30px 0; }
    .items-title { font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: #2563eb; color: white; }
    th { padding: 12px; text-align: left; font-size: 14px; font-weight: 500; }
    td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .qty-col, .unit-col, .price-col, .total-col { text-align: right; }
    .item-row:hover { background: #f3f4f6; }
    .totals-section { margin-top: 30px; }
    .totals-table { width: 350px; margin-left: auto; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals-label { color: #6b7280; }
    .totals-value { color: #111827; font-weight: 500; }
    .total-row { border-top: 2px solid #2563eb; padding-top: 12px; margin-top: 10px; }
    .total-row .totals-label { font-size: 18px; font-weight: bold; color: #111827; }
    .total-row .totals-value { font-size: 18px; font-weight: bold; color: #2563eb; }
    .terms-section { margin-top: 40px; padding: 20px; background: #f0f9ff; border-radius: 8px; }
    .terms-title { font-weight: bold; color: #1e40af; margin-bottom: 10px; }
    .terms-content { font-size: 13px; color: #4b5563; line-height: 1.5; }
    .signature-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
    .signature-box { padding-top: 10px; }
    .signature-line { border-top: 2px solid #9ca3af; margin-bottom: 10px; }
    .signature-label { font-size: 13px; color: #6b7280; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer-text { font-size: 12px; color: #9ca3af; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge-urgent { background: #fee2e2; color: #991b1b; }
    .badge-standard { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <div style="font-size: 24px; font-weight: bold; color: #111827;">{{company.name}}</div>
      <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">{{company.address}}</div>
      <div style="font-size: 14px; color: #6b7280;">{{company.city}}, {{company.state}} {{company.zip}}</div>
      <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
        Phone: {{company.phone}} | Email: {{company.email}}
      </div>
      {{#if company.abn}}
      <div style="font-size: 14px; color: #6b7280;">ABN: {{company.abn}}</div>
      {{/if}}
    </div>
    <div class="po-info">
      <div class="title">PURCHASE ORDER</div>
      <div class="po-number">PO #{{orderNumber}}</div>
      <div class="date-info">
        <div>Date: {{orderDate}}</div>
        <div>Due: {{dueDate}}</div>
      </div>
      {{#if status}}
      <div style="margin-top: 10px;">
        <span class="badge badge-{{#if urgent}}urgent{{else}}standard{{/if}}">{{status}}</span>
      </div>
      {{/if}}
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="party-title">Supplier</div>
      <div class="party-name">{{supplier.name}}</div>
      <div class="party-detail">{{supplier.address}}</div>
      <div class="party-detail">{{supplier.city}}, {{supplier.state}} {{supplier.zip}}</div>
      {{#if supplier.contact}}
      <div class="party-detail" style="margin-top: 10px;">Attn: {{supplier.contact}}</div>
      {{/if}}
      <div class="party-detail">Phone: {{supplier.phone}}</div>
      <div class="party-detail">Email: {{supplier.email}}</div>
    </div>
    <div class="party-box">
      <div class="party-title">Ship To</div>
      <div class="party-name">{{delivery.name}}</div>
      <div class="party-detail">{{delivery.address}}</div>
      <div class="party-detail">{{delivery.city}}, {{delivery.state}} {{delivery.zip}}</div>
      {{#if delivery.instructions}}
      <div class="party-detail" style="margin-top: 10px; font-style: italic;">
        Instructions: {{delivery.instructions}}
      </div>
      {{/if}}
      {{#if job.number}}
      <div class="party-detail" style="margin-top: 10px;">
        <strong>Job:</strong> {{job.number}} - {{job.name}}
      </div>
      {{/if}}
    </div>
  </div>

  <div class="items-section">
    <div class="items-title">Order Details</div>
    <table>
      <thead>
        <tr>
          <th style="width: 10%;">Item #</th>
          <th style="width: 40%;">Description</th>
          <th class="qty-col" style="width: 12%;">Qty</th>
          <th class="unit-col" style="width: 10%;">Unit</th>
          <th class="price-col" style="width: 14%;">Unit Price</th>
          <th class="total-col" style="width: 14%;">Total</th>
        </tr>
      </thead>
      <tbody>
        {{#each lineItems}}
        <tr class="item-row">
          <td>{{itemNumber}}</td>
          <td>
            <div style="font-weight: 500;">{{description}}</div>
            {{#if specifications}}
            <div style="font-size: 12px; color: #6b7280; margin-top: 3px;">{{specifications}}</div>
            {{/if}}
          </td>
          <td class="qty-col">{{quantity}}</td>
          <td class="unit-col">{{unit}}</td>
          <td class="price-col">${{unitPrice}}</td>
          <td class="total-col">${{total}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>

  <div class="totals-section">
    <div class="totals-table">
      <div class="totals-row">
        <div class="totals-label">Subtotal:</div>
        <div class="totals-value">${{subtotal}}</div>
      </div>
      {{#if tax}}
      <div class="totals-row">
        <div class="totals-label">GST ({{taxRate}}%):</div>
        <div class="totals-value">${{tax}}</div>
      </div>
      {{/if}}
      {{#if shipping}}
      <div class="totals-row">
        <div class="totals-label">Shipping:</div>
        <div class="totals-value">${{shipping}}</div>
      </div>
      {{/if}}
      <div class="totals-row total-row">
        <div class="totals-label">Total ({{currency}}):</div>
        <div class="totals-value">${{total}}</div>
      </div>
    </div>
  </div>

  <div class="terms-section">
    <div class="terms-title">Terms & Conditions</div>
    <div class="terms-content">
      <div><strong>Payment Terms:</strong> {{paymentTerms}}</div>
      <div><strong>Delivery Terms:</strong> {{deliveryTerms}}</div>
      {{#if terms}}
      <div style="margin-top: 10px;">{{terms}}</div>
      {{/if}}
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">Authorized By</div>
      <div class="signature-label">Date: _______________</div>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">Accepted By (Supplier)</div>
      <div class="signature-label">Date: _______________</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-text">Thank you for your business</div>
    <div class="footer-text" style="margin-top: 5px;">
      {{company.name}} | {{company.website}} | ABN: {{company.abn}}
    </div>
    <div class="footer-text" style="margin-top: 5px;">
      This document is confidential and proprietary.
    </div>
  </div>
</body>
</html>',
  'Purchase Order #{{orderNumber}} - {{company.name}}',
  '',
  'Initial professional template',
  NOW(),
  NOW()
);

UPDATE communication_templates SET current_version_id = 
  (SELECT id FROM template_versions WHERE template_id = 20) 
WHERE id = 20;