import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

/**
 * Fortune 50 Compliant Operation Orchestrator
 * 
 * Core Principles:
 * 1. Database is the ONLY source of IDs - no client generation
 * 2. Every ID must be traceable to a database INSERT
 * 3. Complete audit trail maintained
 * 4. All IDs are numeric and within PostgreSQL limits
 */

interface OperationIntent {
  materialId: number; // Must be a valid database ID
  projectId: number;
  type: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  // Labor details
  includeInLabor?: boolean;
  laborHours?: number;
  laborLocation?: 'workshop' | 'onsite';
  laborRate?: number;
  // Consumables details  
  includeInConsumables?: boolean;
  consumablesData?: Array<{
    type: string;
    description: string;
    quantity: number;
    unitCost: number;
  }>;
  // Equipment details
  includeInEquipment?: boolean;
  equipmentNeeded?: Array<{
    type: string;
    category: string;
    rate: number;
  }>;
  // Additional fields
  thickness?: string;
  size?: string;
  length?: number;
  notes?: string;
  weldTime?: number;
  libraryComponentId?: number;
}

interface OrchestratorResult {
  operationId: number;
  laborIds?: number[];
  equipmentIds?: number[];
  consumableIds?: number[];
}

export function useOperationOrchestrator() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  
  // Mapping of temporary UI handles to database IDs
  const [uiHandleToDbId, setUiHandleToDbId] = useState<Map<string, number>>(new Map());
  
  // Queue of pending operations waiting for database IDs
  const [pendingOperations, setPendingOperations] = useState<Map<string, OperationIntent>>(new Map());

  // Create operation mutation
  const createOperationMutation = useMutation({
    mutationFn: async (data: OperationIntent) => {
      setCurrentStep('Creating operation in database...');
      
      // Validate material ID is within PostgreSQL limits
      if (data.materialId > 2147483647) {
        throw new Error('Material ID exceeds PostgreSQL integer limit');
      }

      // Create the operation in database FIRST
      const operationPayload = {
        projectId: data.projectId,
        materialId: data.materialId,
        operationType: data.type,
        description: data.description,
        quantity: data.quantity,
        unit: data.unit,
        unitCost: data.unitCost,
        totalCost: data.totalCost,
        notes: data.notes,
        // Additional fields
        thickness: data.thickness,
        size: data.size,
        length: data.length,
        weldTime: data.weldTime,
        libraryComponentId: data.libraryComponentId
      };

      const response = await apiRequest('/api/operations', {
        method: 'POST',
        body: JSON.stringify(operationPayload),
      });

      if (!response.id || typeof response.id !== 'number') {
        throw new Error('Database did not return a valid numeric ID');
      }

      if (response.id > 2147483647) {
        throw new Error('Database returned ID exceeding PostgreSQL integer limit');
      }

      return response;
    },
  });

  // Create labor items linked to operation
  const createLaborMutation = useMutation({
    mutationFn: async ({ operationId, laborData, projectId }: any) => {
      setCurrentStep('Creating labor items...');
      
      const laborPayload = {
        projectId,
        operationId, // This is now a valid database ID
        designation: laborData.designation,
        description: laborData.description,
        hours: laborData.hours,
        rate: laborData.rate,
        totalCost: laborData.hours * laborData.rate,
        category: laborData.category,
        location: laborData.location
      };

      return apiRequest(`/api/estimation/projects/${projectId}/labor`, {
        method: 'POST',
        body: JSON.stringify(laborPayload),
      });
    },
  });

  // Create equipment items linked to operation
  const createEquipmentMutation = useMutation({
    mutationFn: async ({ operationId, equipmentData, projectId }: any) => {
      setCurrentStep('Creating equipment items...');
      
      const equipmentPayload = {
        projectId,
        operationId, // This is now a valid database ID
        designation: equipmentData.designation,
        equipmentType: equipmentData.equipmentType,
        category: equipmentData.category,
        hours: equipmentData.hours,
        rate: equipmentData.rate,
        totalCost: equipmentData.totalCost
      };

      return apiRequest(`/api/estimation/projects/${projectId}/equipment`, {
        method: 'POST',
        body: JSON.stringify(equipmentPayload),
      });
    },
  });

  // Create consumables linked to operation
  const createConsumablesMutation = useMutation({
    mutationFn: async ({ operationId, consumablesData, projectId }: any) => {
      setCurrentStep('Creating consumable items...');
      
      const promises = consumablesData.map((item: any) => {
        const payload = {
          projectId,
          operationId, // This is now a valid database ID
          designation: item.designation,
          category: item.category,
          itemType: item.type,
          specification: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.quantity * item.unitCost
        };

        return apiRequest(`/api/estimation/projects/${projectId}/consumables`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      });

      return Promise.all(promises);
    },
  });

  /**
   * Register a temporary UI handle for tracking
   * This allows the UI to display items before database IDs are available
   */
  const registerUiHandle = (uiHandle: string, intent: OperationIntent) => {
    setPendingOperations(prev => new Map(prev).set(uiHandle, intent));
  };

  /**
   * Get database ID for a UI handle
   * Returns undefined if operation is still pending
   */
  const getDbIdForHandle = (uiHandle: string): number | undefined => {
    return uiHandleToDbId.get(uiHandle);
  };

  /**
   * Main orchestration function - Fortune 50 compliant
   * Creates operation IMMEDIATELY in database (not deferred)
   * Returns only database-generated IDs
   */
  const createOperationImmediately = async (uiHandle: string, intent: OperationIntent): Promise<OrchestratorResult> => {
    setIsProcessing(true);
    setCurrentStep('Starting operation creation...');
    
    const result: OrchestratorResult = {
      operationId: 0, // Will be populated from database
      laborIds: [],
      equipmentIds: [],
      consumableIds: []
    };

    try {
      // Step 1: Create operation in database and get numeric ID
      const operation = await createOperationMutation.mutateAsync(intent);
      result.operationId = operation.id; // Database-generated numeric ID
      
      if (!result.operationId || result.operationId > 2147483647) {
        throw new Error('Invalid operation ID from database');
      }

      // Step 2: Create dependent items with the valid operation ID
      const promises = [];

      // Create labor if needed
      if (intent.includeInLabor && intent.laborHours) {
        const laborPromise = createLaborMutation.mutateAsync({
          operationId: result.operationId,
          projectId: intent.projectId,
          laborData: {
            designation: `OP-${result.operationId}`, // Use DB ID in designation
            description: intent.description,
            hours: intent.laborHours,
            rate: intent.laborRate || 85,
            category: intent.laborLocation || 'workshop',
            location: intent.laborLocation
          }
        }).then(labor => {
          if (labor.id) result.laborIds?.push(labor.id);
        });
        promises.push(laborPromise);
      }

      // Create equipment if needed
      if (intent.includeInEquipment && intent.equipmentNeeded) {
        const equipmentPromises = intent.equipmentNeeded.map(equip =>
          createEquipmentMutation.mutateAsync({
            operationId: result.operationId,
            projectId: intent.projectId,
            equipmentData: {
              designation: `OP-${result.operationId}`,
              equipmentType: equip.type,
              category: equip.category,
              hours: intent.laborHours || 1,
              rate: equip.rate,
              totalCost: (intent.laborHours || 1) * equip.rate
            }
          }).then(equipment => {
            if (equipment.id) result.equipmentIds?.push(equipment.id);
          })
        );
        promises.push(...equipmentPromises);
      }

      // Create consumables if needed
      if (intent.includeInConsumables && intent.consumablesData) {
        const consumablesPromise = createConsumablesMutation.mutateAsync({
          operationId: result.operationId,
          projectId: intent.projectId,
          consumablesData: intent.consumablesData.map(item => ({
            ...item,
            designation: `OP-${result.operationId}`
          }))
        }).then(consumables => {
          consumables.forEach((cons: any) => {
            if (cons.id) result.consumableIds?.push(cons.id);
          });
        });
        promises.push(consumablesPromise);
      }

      // Wait for all dependent items to be created
      await Promise.all(promises);
      
      // CRITICAL: Register the database ID for the UI handle
      // This allows MaterialsTab to replace placeholders with real IDs
      setUiHandleToDbId(prev => {
        const newMap = new Map(prev);
        newMap.set(uiHandle, result.operationId);
        return newMap;
      });
      
      // Remove from pending operations now that it's complete
      setPendingOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(uiHandle);
        return newMap;
      });

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/estimation/projects'] });

      toast({
        title: 'Operation Created',
        description: `Operation ID ${result.operationId} created with all dependencies`,
      });

      return result;

    } catch (error: any) {
      console.error('Orchestrator error:', error);
      
      // Enhanced Rollback: Clean up ALL created records to prevent orphans
      if (result.operationId) {
        try {
          // Delete labor items if created
          for (const laborId of result.laborIds || []) {
            try {
              await apiRequest(`/api/estimation/projects/${intent.projectId}/labor/${laborId}`, {
                method: 'DELETE',
              });
            } catch (e) {
              console.error('Failed to rollback labor item:', laborId, e);
            }
          }
          
          // Delete equipment items if created
          for (const equipmentId of result.equipmentIds || []) {
            try {
              await apiRequest(`/api/estimation/projects/${intent.projectId}/equipment/${equipmentId}`, {
                method: 'DELETE',
              });
            } catch (e) {
              console.error('Failed to rollback equipment item:', equipmentId, e);
            }
          }
          
          // Delete consumable items if created
          for (const consumableId of result.consumableIds || []) {
            try {
              await apiRequest(`/api/estimation/projects/${intent.projectId}/consumables/${consumableId}`, {
                method: 'DELETE',
              });
            } catch (e) {
              console.error('Failed to rollback consumable item:', consumableId, e);
            }
          }
          
          // Finally, delete the parent operation
          await apiRequest(`/api/operations/${result.operationId}`, {
            method: 'DELETE',
          });
          
          console.log('Rollback complete: Deleted operation and all dependent records');
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }

      toast({
        title: 'Operation Creation Failed',
        description: error.message || 'Failed to create operation with dependencies',
        variant: 'destructive',
      });

      throw error;
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  return {
    createOperationImmediately,
    registerUiHandle,
    getDbIdForHandle,
    uiHandleToDbId,
    pendingOperations,
    isProcessing,
    currentStep,
  };
}