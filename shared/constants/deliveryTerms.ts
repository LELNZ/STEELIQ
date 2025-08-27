// Local NZ Delivery Terms Configuration
export const DELIVERY_TERMS = [
  {
    value: 'pickup_required',
    label: 'Pickup Required',
    description: 'Customer collection from supplier warehouse',
    includesDelivery: false,
    notes: 'Customer arranges and pays for transport',
  },
  {
    value: 'delivery_workshop',
    label: 'Delivery to Workshop',
    description: 'Standard delivery to Lateral Engineering workshop in Auckland',
    includesDelivery: true,
    notes: 'Delivery charge shown separately on invoice',
  },
  {
    value: 'delivery_site',
    label: 'Delivery to Site',
    description: 'Delivery to specified job site address (crane included if required)',
    includesDelivery: true,
    notes: 'Requires day/time/place coordination and site contact. Crane will be stated on order if needed',
  },
  {
    value: 'delivery_site_notification',
    label: 'Site Delivery with Prior Notification',
    description: 'Delivery requiring advance coordination with site contact',
    includesDelivery: true,
    notes: 'Must organize day/time/place and site contact details',
  },
  {
    value: 'delivery_after_hours',
    label: 'After Hours Delivery',
    description: 'Delivery outside standard business hours',
    includesDelivery: true,
    notes: 'Additional charges may apply',
  },
  {
    value: 'urgent_courier',
    label: 'Urgent Courier',
    description: 'Express courier service for small urgent parts',
    includesDelivery: true,
    notes: 'For small items only, next-day or same-day service',
  },
];

// RFQ Thresholds
export const PROCUREMENT_THRESHOLDS = {
  // ALL purchases require RFQ unless emergency
  REQUIRES_RFQ: 0,                // All amounts require RFQ
  EMERGENCY_BYPASS: true,          // Emergency purchases can bypass with manager approval
  
  // Supplier requirements based on amount (NZD)
  QUICK_RFQ_LIMIT: 1000,          // Under $1000: 2 suppliers minimum
  STANDARD_RFQ_LIMIT: 5000,       // $1000-$5000: 3 suppliers minimum  
  FORMAL_RFQ_LIMIT: 20000,        // $5000-$20000: 4 suppliers minimum
  TENDER_LIMIT: 50000,            // Above $50000: 5+ suppliers, formal tender
  
  // Approval levels
  MANAGER_APPROVAL: 5000,         // Above this needs manager
  DIRECTOR_APPROVAL: 20000,       // Above this needs director
  BOARD_APPROVAL: 50000,          // Above this needs board
};

// Get delivery term label by value
export function getDeliveryTermLabel(value: string): string {
  const term = DELIVERY_TERMS.find(t => t.value === value);
  return term ? term.label : value;
}

// Check if delivery is included
export function isDeliveryIncluded(value: string): boolean {
  const term = DELIVERY_TERMS.find(t => t.value === value);
  return term ? term.includesDelivery : false;
}

// Determine RFQ requirements based on amount
export function getRfqRequirement(amount: number, isEmergency: boolean = false): {
  requiresRfq: boolean;
  minimumSuppliers: number;
  processType: string;
  description: string;
  approvalLevel: string;
} {
  // Emergency purchases can bypass RFQ with manager approval
  if (isEmergency) {
    return {
      requiresRfq: false,
      minimumSuppliers: 0,
      processType: 'emergency_purchase',
      description: 'Emergency purchase - RFQ bypassed with manager approval',
      approvalLevel: 'manager',
    };
  }
  
  // ALL normal purchases require RFQ
  if (amount <= PROCUREMENT_THRESHOLDS.QUICK_RFQ_LIMIT) {
    return {
      requiresRfq: true,
      minimumSuppliers: 2,
      processType: 'quick_rfq',
      description: 'RFQ required - minimum 2 supplier quotes',
      approvalLevel: 'supervisor',
    };
  } else if (amount <= PROCUREMENT_THRESHOLDS.STANDARD_RFQ_LIMIT) {
    return {
      requiresRfq: true,
      minimumSuppliers: 3,
      processType: 'standard_rfq',
      description: 'RFQ required - minimum 3 supplier quotes',
      approvalLevel: 'manager',
    };
  } else if (amount <= PROCUREMENT_THRESHOLDS.FORMAL_RFQ_LIMIT) {
    return {
      requiresRfq: true,
      minimumSuppliers: 4,
      processType: 'formal_rfq',
      description: 'Formal RFQ required - minimum 4 supplier quotes',
      approvalLevel: 'director',
    };
  } else if (amount <= PROCUREMENT_THRESHOLDS.TENDER_LIMIT) {
    return {
      requiresRfq: true,
      minimumSuppliers: 5,
      processType: 'formal_tender',
      description: 'Formal tender process - minimum 5 supplier quotes',
      approvalLevel: 'director',
    };
  } else {
    return {
      requiresRfq: true,
      minimumSuppliers: 5,
      processType: 'board_tender',
      description: 'Board tender process required - board approval needed',
      approvalLevel: 'board',
    };
  }
}