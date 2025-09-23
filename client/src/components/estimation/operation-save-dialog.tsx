import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperationSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (option: 'estimate' | 'update' | 'create') => void;
  operationType?: string;
  userRole?: string;
}

export function OperationSaveDialog({
  open,
  onOpenChange,
  onSave,
  operationType = 'operation',
  userRole = 'viewer',
}: OperationSaveDialogProps) {
  const [selectedOption, setSelectedOption] = useState<'estimate' | 'update' | 'create'>('estimate');

  const canModifyLibrary = ['admin', 'manager', 'estimator'].includes(userRole.toLowerCase());

  const handleConfirm = () => {
    onSave(selectedOption);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Save {operationType}</AlertDialogTitle>
          <AlertDialogDescription>
            Choose how you want to save this {operationType.toLowerCase()}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedOption} onValueChange={(value: any) => setSelectedOption(value)}>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="estimate" id="estimate" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="estimate" className="font-medium cursor-pointer">
                    Add to current estimate only
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Saves the {operationType.toLowerCase()} to this estimate without affecting the library.
                    This is the recommended option for one-off operations.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem 
                  value="update" 
                  id="update" 
                  className="mt-1"
                  disabled={!canModifyLibrary}
                />
                <div className="flex-1">
                  <Label 
                    htmlFor="update" 
                    className={cn(
                      "font-medium cursor-pointer",
                      !canModifyLibrary && "opacity-50"
                    )}
                  >
                    Update existing library item
                  </Label>
                  <p className={cn(
                    "text-sm text-muted-foreground mt-1",
                    !canModifyLibrary && "opacity-50"
                  )}>
                    Updates the library item with your changes. This affects all future uses
                    of this {operationType.toLowerCase()}.
                  </p>
                  {!canModifyLibrary && (
                    <p className="text-xs text-orange-600 mt-1">
                      Requires Estimator role or higher
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem 
                  value="create" 
                  id="create" 
                  className="mt-1"
                  disabled={!canModifyLibrary}
                />
                <div className="flex-1">
                  <Label 
                    htmlFor="create" 
                    className={cn(
                      "font-medium cursor-pointer",
                      !canModifyLibrary && "opacity-50"
                    )}
                  >
                    Create new library item
                  </Label>
                  <p className={cn(
                    "text-sm text-muted-foreground mt-1",
                    !canModifyLibrary && "opacity-50"
                  )}>
                    Creates a new {operationType.toLowerCase()} in the library based on your values.
                    It will be available for all future estimates.
                  </p>
                  {!canModifyLibrary && (
                    <p className="text-xs text-orange-600 mt-1">
                      Requires Estimator role or higher
                    </p>
                  )}
                </div>
              </div>
            </div>
          </RadioGroup>

          {selectedOption === 'update' && canModifyLibrary && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Updating a library item will affect all future estimates that use this {operationType.toLowerCase()}.
                Existing estimates will not be changed.
              </AlertDescription>
            </Alert>
          )}

          {selectedOption === 'create' && canModifyLibrary && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                The new library item will be available immediately for all users
                in future estimates.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {selectedOption === 'estimate' && 'Add to Estimate'}
            {selectedOption === 'update' && 'Update Library'}
            {selectedOption === 'create' && 'Create New'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}