import { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import type { Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Type, 
  Table, 
  Image, 
  Box, 
  Columns,
  FileText,
  Mail,
  DollarSign,
  Users,
  Calendar,
  MapPin,
  Hash,
  AlignLeft
} from 'lucide-react';

interface VisualTemplateBuilderProps {
  initialHtml: string;
  initialProject?: any;
  variables: string[];
  onChange: (html: string, projectData: any) => void;
  templateType: string;
}

export function VisualTemplateBuilder({
  initialHtml,
  initialProject,
  variables,
  onChange,
  templateType
}: VisualTemplateBuilderProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selectedVariable, setSelectedVariable] = useState<string>('');

  useEffect(() => {
    if (!editorRef.current) return;
    
    let changeTimeout: NodeJS.Timeout;

    const editorInstance = grapesjs.init({
      container: editorRef.current,
      height: '600px',
      width: 'auto',
      storageManager: false,
      deviceManager: {
        devices: [
          { id: 'desktop', name: 'Desktop', width: '' },
          { id: 'tablet', name: 'Tablet', width: '768px' },
          { id: 'mobile', name: 'Mobile', width: '375px' }
        ]
      },
      panels: {
        defaults: [
          {
            id: 'basic-actions',
            el: '.panel__basic-actions',
            buttons: [
              {
                id: 'device-desktop',
                label: '<svg viewBox="0 0 24 24" width="20"><path fill="currentColor" d="M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z"/></svg>',
                command: 'set-device-desktop',
                active: true,
                togglable: false,
              },
              {
                id: 'device-tablet',
                label: '<svg viewBox="0 0 24 24" width="20"><path fill="currentColor" d="M19,18H5V6H19M21,4H3A2,2 0 0,0 1,6V18A2,2 0 0,0 3,20H21A2,2 0 0,0 23,18V6A2,2 0 0,0 21,4Z"/></svg>',
                command: 'set-device-tablet',
                togglable: false,
              },
              {
                id: 'device-mobile',
                label: '<svg viewBox="0 0 24 24" width="20"><path fill="currentColor" d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z"/></svg>',
                command: 'set-device-mobile',
                togglable: false,
              }
            ]
          }
        ]
      },
      canvas: {
        styles: [
          'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css'
        ]
      }
    });

    // Register custom commands
    editorInstance.Commands.add('set-device-desktop', {
      run: editor => editor.setDevice('desktop')
    });
    editorInstance.Commands.add('set-device-tablet', {
      run: editor => editor.setDevice('tablet')
    });
    editorInstance.Commands.add('set-device-mobile', {
      run: editor => editor.setDevice('mobile')
    });

    // Add custom blocks for business documents
    const blockManager = editorInstance.BlockManager;

    // Document Header Block
    blockManager.add('document-header', {
      label: 'Document Header',
      category: 'Document Parts',
      content: `
        <div class="document-header" style="padding: 20px; border-bottom: 2px solid #e5e7eb;">
          <h1 style="color: #2563eb; font-size: 24px; font-weight: bold; margin-bottom: 10px;">
            {{documentTitle}}
          </h1>
          <div style="display: flex; justify-content: space-between; color: #6b7280;">
            <div>
              <p><strong>Document #:</strong> {{documentNumber}}</p>
              <p><strong>Date:</strong> {{date}}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Valid Until:</strong> {{validUntil}}</p>
              <p><strong>Status:</strong> {{status}}</p>
            </div>
          </div>
        </div>
      `,
      attributes: { class: 'gjs-block-document-header' }
    });

    // Address Grid Block
    blockManager.add('address-grid', {
      label: 'Address Grid',
      category: 'Document Parts',
      content: `
        <div class="address-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 20px;">
          <div>
            <h3 style="color: #1f2937; font-weight: bold; margin-bottom: 10px;">From:</h3>
            <p><strong>{{company.name}}</strong></p>
            <p>{{company.address}}</p>
            <p>{{company.city}}, {{company.state}} {{company.zip}}</p>
            <p>Phone: {{company.phone}}</p>
            <p>Email: {{company.email}}</p>
          </div>
          <div>
            <h3 style="color: #1f2937; font-weight: bold; margin-bottom: 10px;">To:</h3>
            <p><strong>{{recipient.name}}</strong></p>
            <p>{{recipient.address}}</p>
            <p>{{recipient.city}}, {{recipient.state}} {{recipient.zip}}</p>
            <p>Contact: {{recipient.contact}}</p>
            <p>Phone: {{recipient.phone}}</p>
          </div>
        </div>
      `,
      attributes: { class: 'gjs-block-address-grid' }
    });

    // Line Items Table Block
    blockManager.add('line-items-table', {
      label: 'Line Items Table',
      category: 'Document Parts',
      content: `
        <table class="line-items-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="padding: 12px; text-align: left;">Item</th>
              <th style="padding: 12px; text-align: left;">Description</th>
              <th style="padding: 12px; text-align: right;">Quantity</th>
              <th style="padding: 12px; text-align: right;">Unit Price</th>
              <th style="padding: 12px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            {{#each lineItems}}
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{{itemNumber}}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{{description}}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">{{quantity}}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${{unitPrice}}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${{total}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
      `,
      attributes: { class: 'gjs-block-line-items' }
    });

    // Totals Block
    blockManager.add('totals-section', {
      label: 'Totals Section',
      category: 'Document Parts',
      content: `
        <div class="totals-section" style="text-align: right; padding: 20px; background: #f9fafb; border-radius: 8px;">
          <div style="display: inline-block; text-align: left;">
            <p style="margin-bottom: 8px;"><strong>Subtotal:</strong> <span style="margin-left: 40px;">${{subtotal}}</span></p>
            <p style="margin-bottom: 8px;"><strong>Tax ({{taxRate}}%):</strong> <span style="margin-left: 40px;">${{tax}}</span></p>
            <p style="margin-bottom: 8px;"><strong>Shipping:</strong> <span style="margin-left: 40px;">${{shipping}}</span></p>
            <hr style="border: 1px solid #e5e7eb; margin: 10px 0;">
            <h3 style="color: #2563eb; font-size: 20px;"><strong>Total:</strong> <span style="margin-left: 40px;">${{total}}</span></h3>
          </div>
        </div>
      `,
      attributes: { class: 'gjs-block-totals' }
    });

    // Terms & Conditions Block
    blockManager.add('terms-conditions', {
      label: 'Terms & Conditions',
      category: 'Document Parts',
      content: `
        <div class="terms-conditions" style="padding: 20px; margin-top: 30px; background: #eff6ff; border-radius: 8px;">
          <h3 style="color: #2563eb; margin-bottom: 15px;">Terms & Conditions</h3>
          <p>{{terms}}</p>
          <div style="margin-top: 15px;">
            <p><strong>Payment Terms:</strong> {{paymentTerms}}</p>
            <p><strong>Delivery Terms:</strong> {{deliveryTerms}}</p>
          </div>
        </div>
      `,
      attributes: { class: 'gjs-block-terms' }
    });

    // Basic Text Block
    blockManager.add('text-block', {
      label: 'Text',
      category: 'Basic',
      content: '<p style="padding: 10px;">Enter your text here. You can use variables like {{variable}}</p>',
      attributes: { class: 'gjs-block-text' }
    });

    // Divider Block
    blockManager.add('divider', {
      label: 'Divider',
      category: 'Basic',
      content: '<hr style="border: 1px solid #e5e7eb; margin: 20px 0;">',
      attributes: { class: 'gjs-block-divider' }
    });

    // Button Block
    blockManager.add('button', {
      label: 'Button',
      category: 'Basic',
      content: `
        <div style="text-align: center; padding: 20px;">
          <a href="#" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            {{buttonText}}
          </a>
        </div>
      `,
      attributes: { class: 'gjs-block-button' }
    });

    // Image Block
    blockManager.add('image', {
      label: 'Image',
      category: 'Basic',
      content: '<img src="https://via.placeholder.com/300x200" alt="Image" style="max-width: 100%; height: auto;">',
      attributes: { class: 'gjs-block-image' }
    });

    // Signature Block
    blockManager.add('signature', {
      label: 'Signature',
      category: 'Document Parts',
      content: `
        <div class="signature-section" style="margin-top: 50px; padding: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
            <div>
              <div style="border-bottom: 2px solid #333; margin-bottom: 10px; height: 40px;"></div>
              <p style="color: #6b7280;">Authorized Signature</p>
              <p style="color: #6b7280;">Date: _____________</p>
            </div>
            <div>
              <div style="border-bottom: 2px solid #333; margin-bottom: 10px; height: 40px;"></div>
              <p style="color: #6b7280;">Customer Signature</p>
              <p style="color: #6b7280;">Date: _____________</p>
            </div>
          </div>
        </div>
      `,
      attributes: { class: 'gjs-block-signature' }
    });

    // Load initial content
    if (initialProject) {
      editorInstance.loadProjectData(initialProject);
    } else if (initialHtml) {
      // Extract styles and HTML separately
      const styleMatch = initialHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const cleanHtml = initialHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      
      // Load HTML components
      editorInstance.setComponents(cleanHtml);
      
      // Load CSS if present
      if (styleMatch && styleMatch[1]) {
        editorInstance.setStyle(styleMatch[1]);
      }
    }

    // Debounced change handler
    const handleChange = () => {
      clearTimeout(changeTimeout);
      changeTimeout = setTimeout(() => {
        const html = editorInstance.getHtml();
        const css = editorInstance.getCss();
        const projectData = editorInstance.getProjectData();
        
        // Combine HTML with embedded styles
        const fullHtml = css ? `<style>${css}</style>${html}` : html;
        onChange(fullHtml, projectData);
      }, 500);
    };

    // Handle changes with correct event names
    editorInstance.on('component:update', handleChange);
    editorInstance.on('component:styleUpdate', handleChange);
    editorInstance.on('style:property:update', handleChange);

    setEditor(editorInstance);

    return () => {
      clearTimeout(changeTimeout);
      editorInstance.destroy();
    };
  }, []);

  // Function to insert variable at cursor position
  const insertVariable = (variable: string) => {
    if (!editor) return;
    
    const selected = editor.getSelected();
    if (selected) {
      const type = selected.get('type');
      if (type === 'text' || type === 'default' || type === 'textnode') {
        const content = selected.get('content') || '';
        selected.set('content', content + ` {{${variable}}}`);
      } else {
        // Add as a new text component
        selected.append(`<span>{{${variable}}}</span>`);
      }
    } else {
      // Add to canvas if nothing selected
      editor.addComponents(`<p>{{${variable}}}</p>`);
    }
    
    // Show notification
    editor.runCommand('notifications:add', {
      type: 'success',
      title: 'Variable Inserted',
      message: `Added {{${variable}}}`
    });
  };

  return (
    <div className="flex gap-4 h-[700px]">
      {/* GrapesJS Editor */}
      <Card className="flex-1 overflow-hidden">
        <div className="p-2 border-b flex items-center gap-2">
          <div className="panel__basic-actions flex gap-2"></div>
          <Separator orientation="vertical" className="h-6" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => editor?.setDevice('desktop')}
            title="Desktop View"
          >
            <Box className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => editor?.setDevice('tablet')}
            title="Tablet View"
          >
            <FileText className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => editor?.setDevice('mobile')}
            title="Mobile View"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm text-muted-foreground">Visual Template Builder</span>
        </div>
        <div ref={editorRef} className="h-full" />
      </Card>

      {/* Variables Panel */}
      <Card className="w-64">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Template Variables</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Click to insert into selected text
          </p>
        </div>
        <ScrollArea className="h-[600px]">
          <div className="p-3 space-y-2">
            {variables.map((variable) => (
              <Button
                key={variable}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => insertVariable(variable)}
              >
                <Hash className="w-3 h-3 mr-1" />
                {`{{${variable}}}`}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}