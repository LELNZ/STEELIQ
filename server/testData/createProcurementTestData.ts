import { db } from '../db';
import { 
  purchaseRequisitions, 
  requisitionItems,
  requisitionApprovals,
  rfqRequests,
  rfqResponses
} from '@shared/schema';

export async function createProcurementTestData() {
  try {
    console.log('Creating procurement test data...');
    
    // 1. Create a requisition that needs RFQ
    const [requisition1] = await db.insert(purchaseRequisitions).values({
      requisitionNumber: 'REQ-2025-001',
      jobId: 5, // Using existing job from your data
      jobNumber: 'JOB-2025-412982',
      title: 'Steel Beams for Workshop Extension',
      description: 'Universal beams and columns for new workshop bay',
      category: 'materials',
      priority: 'high',
      totalAmount: 15000,
      currency: 'NZD',
      department: 'Operations',
      costCenter: 'WORKSHOP',
      justification: 'Required for contracted workshop extension project',
      requestedBy: 9, // Adam Green
      requiredBy: new Date('2025-02-15'),
      status: 'pending_approval',
      currentApprover: 9,
      approvalLevel: 1,
      maxApprovalLevel: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Add requisition items
    await db.insert(requisitionItems).values([
      {
        requisitionId: requisition1.id,
        description: '310UB40 Universal Beam - 9m lengths',
        quantity: 10,
        unitOfMeasure: 'each',
        estimatedUnitPrice: 850,
        estimatedTotalPrice: 8500,
        category: 'steel_beams',
        specifications: 'Grade 300, Mill finish',
        preferredSupplier: 'ASMUSS Steel'
      },
      {
        requisitionId: requisition1.id,
        description: '200UC59.5 Universal Column - 6m lengths',
        quantity: 8,
        unitOfMeasure: 'each', 
        estimatedUnitPrice: 812.50,
        estimatedTotalPrice: 6500,
        category: 'steel_columns',
        specifications: 'Grade 300, Mill finish',
        preferredSupplier: 'Fletcher Steel'
      }
    ]);

    // 2. Create an approved requisition ready for RFQ
    const [requisition2] = await db.insert(purchaseRequisitions).values({
      requisitionNumber: 'REQ-2025-002',
      jobId: 5,
      jobNumber: 'JOB-2025-412982',
      title: 'Welding Consumables Monthly Supply',
      description: 'Monthly supply of welding rods, gas, and consumables',
      category: 'consumables',
      priority: 'medium',
      totalAmount: 3500,
      currency: 'NZD',
      department: 'Fabrication',
      costCenter: 'FAB-001',
      justification: 'Regular monthly consumables order',
      requestedBy: 9,
      requiredBy: new Date('2025-02-01'),
      status: 'approved',
      currentApprover: null,
      approvalLevel: 2,
      maxApprovalLevel: 2,
      approvedAt: new Date(),
      approvedBy: 9,
      createdAt: new Date('2025-01-18'),
      updatedAt: new Date()
    }).returning();

    // Add approval history
    await db.insert(requisitionApprovals).values([
      {
        requisitionId: requisition2.id,
        approverId: 9,
        approvalLevel: 1,
        decision: 'approved',
        comments: 'Standard monthly order - approved',
        decidedAt: new Date('2025-01-18T10:00:00')
      },
      {
        requisitionId: requisition2.id,
        approverId: 9,
        approvalLevel: 2,
        decision: 'approved', 
        comments: 'Budget available - final approval',
        decidedAt: new Date('2025-01-18T14:00:00')
      }
    ]);

    // Add items for requisition 2
    await db.insert(requisitionItems).values([
      {
        requisitionId: requisition2.id,
        description: 'E7018 Welding Rods 3.2mm x 350mm',
        quantity: 20,
        unitOfMeasure: 'kg',
        estimatedUnitPrice: 45,
        estimatedTotalPrice: 900,
        category: 'welding_consumables'
      },
      {
        requisitionId: requisition2.id,
        description: 'MIG Wire 1.2mm ER70S-6',
        quantity: 15,
        unitOfMeasure: 'kg',
        estimatedUnitPrice: 55,
        estimatedTotalPrice: 825,
        category: 'welding_consumables'
      },
      {
        requisitionId: requisition2.id,
        description: 'Argon Gas Cylinder Refill',
        quantity: 5,
        unitOfMeasure: 'cylinder',
        estimatedUnitPrice: 175,
        estimatedTotalPrice: 875,
        category: 'welding_gas'
      }
    ]);

    // 3. Create an RFQ from the approved requisition
    const [rfq1] = await db.insert(rfqRequests).values({
      rfqNumber: 'RFQ-2025-001',
      requisitionId: requisition2.id,
      jobId: 5,
      jobNumber: 'JOB-2025-412982',
      title: 'Welding Consumables Monthly Supply - Feb 2025',
      description: 'Request for quotes for monthly welding consumables including rods, wire, and gas',
      category: 'consumables',
      status: 'sent',
      responseDeadline: new Date('2025-01-25'),
      deliveryRequiredBy: new Date('2025-02-01'),
      deliveryTerms: 'delivery_workshop',
      paymentTerms: 'Net 30',
      evaluationCriteria: {
        price_weight: 40,
        delivery_weight: 30,
        quality_weight: 30
      },
      specialRequirements: 'All materials must meet AS/NZS standards. Delivery to our workshop required.',
      invitedSuppliers: [1, 2, 3], // First 3 suppliers
      publicRfq: false,
      createdBy: 9,
      sentAt: new Date('2025-01-19'),
      createdAt: new Date('2025-01-19'),
      updatedAt: new Date('2025-01-19')
    }).returning();

    // 4. Create sample RFQ responses/quotes
    await db.insert(rfqResponses).values([
      {
        rfqId: rfq1.id,
        supplierId: 1, // ASMUSS Steel
        responseNumber: 'Q-2025-0156',
        status: 'submitted',
        totalAmount: 3250,
        currency: 'NZD',
        validityDays: 30,
        deliveryDays: 3,
        paymentTermsOffered: 'Net 30',
        warrantyOffered: '12 months on all products',
        notes: 'We can offer 5% discount for annual contract',
        lineItems: [
          { description: 'E7018 Welding Rods 3.2mm', quantity: 20, unitPrice: 42, total: 840 },
          { description: 'MIG Wire 1.2mm ER70S-6', quantity: 15, unitPrice: 52, total: 780 },
          { description: 'Argon Gas Cylinder Refill', quantity: 5, unitPrice: 165, total: 825 },
          { description: 'Delivery charge', quantity: 1, unitPrice: 50, total: 50 }
        ],
        submittedAt: new Date('2025-01-20'),
        priceScore: 85,
        qualityScore: 90,
        deliveryScore: 95,
        totalScore: 89,
        ranking: 1,
        createdAt: new Date('2025-01-20'),
        updatedAt: new Date('2025-01-20')
      },
      {
        rfqId: rfq1.id,
        supplierId: 2, // Fletcher Steel
        responseNumber: 'FSL-Q-2025-089',
        status: 'submitted',
        totalAmount: 3420,
        currency: 'NZD', 
        validityDays: 45,
        deliveryDays: 5,
        paymentTermsOffered: 'Net 45',
        warrantyOffered: '6 months standard warranty',
        notes: 'Premium quality products with extended payment terms',
        lineItems: [
          { description: 'E7018 Welding Rods 3.2mm', quantity: 20, unitPrice: 44, total: 880 },
          { description: 'MIG Wire 1.2mm ER70S-6', quantity: 15, unitPrice: 54, total: 810 },
          { description: 'Argon Gas Cylinder Refill', quantity: 5, unitPrice: 170, total: 850 },
          { description: 'Delivery included', quantity: 1, unitPrice: 0, total: 0 }
        ],
        submittedAt: new Date('2025-01-21'),
        priceScore: 75,
        qualityScore: 85,
        deliveryScore: 80,
        totalScore: 79,
        ranking: 2,
        createdAt: new Date('2025-01-21'),
        updatedAt: new Date('2025-01-21')
      }
    ]);

    // 5. Create a draft RFQ
    const [rfq2] = await db.insert(rfqRequests).values({
      rfqNumber: 'RFQ-2025-002',
      requisitionId: requisition1.id,
      jobId: 5,
      jobNumber: 'JOB-2025-412982',
      title: 'Steel Beams for Workshop Extension',
      description: 'Competitive quotes required for structural steel supply',
      category: 'materials',
      status: 'draft',
      responseDeadline: new Date('2025-01-30'),
      deliveryRequiredBy: new Date('2025-02-15'),
      deliveryTerms: 'delivery_site',
      paymentTerms: 'Net 30',
      evaluationCriteria: {
        price_weight: 50,
        delivery_weight: 25,
        quality_weight: 25
      },
      specialRequirements: 'Mill certificates required. Delivery to site with crane truck.',
      publicRfq: false,
      createdBy: 9,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('Test data created successfully!');
    console.log('- 2 Requisitions (1 pending approval, 1 approved)');
    console.log('- 2 RFQs (1 sent with 2 quotes, 1 draft)');
    console.log('- 2 Supplier quotes/responses');
    
    return {
      requisitions: [requisition1, requisition2],
      rfqs: [rfq1, rfq2],
      message: 'Test data created successfully'
    };

  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  }
}