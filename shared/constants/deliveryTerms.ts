// Local NZ Delivery Terms Configuration
export const DELIVERY_TERMS = [
  {
    value: 'pickup_required',
    label: 'Pickup Required',
    description: 'Customer collection from supplier warehouse',
    includesDelivery: false,
  },
  {
    value: 'delivery_workshop',
    label: 'Delivery to Workshop',
    description: 'Standard delivery to Lateral Engineering workshop',
    includesDelivery: true,
  },
  {
    value: 'delivery_site',
    label: 'Delivery to Site',
    description: 'Delivery to specified job site address',
    includesDelivery: true,
  },
  {
    value: 'delivery_crane',
    label: 'Delivery with Crane',
    description: 'Heavy lifting equipment required for delivery',
    includesDelivery: true,
  },
  {
    value: 'urgent_courier',
    label: 'Urgent Courier',
    description: 'Express delivery for urgent small items',
    includesDelivery: true,
  },
  {
    value: 'after_hours',
    label: 'After Hours Delivery',
    description: 'Delivery outside standard business hours',
    includesDelivery: true,
  },
  {
    value: 'site_notification',
    label: 'Site Delivery with Notification',
    description: 'Delivery to site with advance notification required',
    includesDelivery: true,
  },
];

// RFQ Thresholds
export const PROCUREMENT_THRESHOLDS = {
  // Amounts in NZD
  DIRECT_PO_LIMIT: 500,           // Below this, direct PO allowed
  QUICK_RFQ_LIMIT: 2000,          // $500-$2000: Quick RFQ (2 suppliers minimum)
  STANDARD_RFQ_LIMIT: 10000,      // $2000-$10000: Standard RFQ (3 suppliers minimum)
  FORMAL_RFQ_LIMIT: 50000,        // $10000-$50000: Formal RFQ (5 suppliers minimum)
  // Above $50000: Board approval + Formal tender process
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
export function getRfqRequirement(amount: number): {
  requiresRfq: boolean;
  minimumSuppliers: number;
  processType: string;
  description: string;
} {
  if (amount <= PROCUREMENT_THRESHOLDS.DIRECT_PO_LIMIT) {
    return {
      requiresRfq: false,
      minimumSuppliers: 0,
      processType: 'direct_po',
      description: 'Direct purchase order allowed for low-value items',
    };
  } else if (amount <= PROCUREMENT_THRESHOLDS.QUICK_RFQ_LIMIT) {
    return {
      requiresRfq: true,
      minimumSuppliers: 2,
      processType: 'quick_rfq',
      description: 'Quick RFQ required - minimum 2 supplier quotes',
    };
  } else if (amount <= PROCUREMENT_THRESHOLDS.STANDARD_RFQ_LIMIT) {
    return {
      requiresRfq: true,
      minimumSuppliers: 3,
      processType: 'standard_rfq',
      description: 'Standard RFQ required - minimum 3 supplier quotes',
    };
  } else if (amount <= PROCUREMENT_THRESHOLDS.FORMAL_RFQ_LIMIT) {
    return {
      requiresRfq: true,
      minimumSuppliers: 5,
      processType: 'formal_rfq',
      description: 'Formal RFQ required - minimum 5 supplier quotes',
    };
  } else {
    return {
      requiresRfq: true,
      minimumSuppliers: 5,
      processType: 'tender',
      description: 'Formal tender process required - board approval needed',
    };
  }
}