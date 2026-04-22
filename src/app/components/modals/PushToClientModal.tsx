import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertCircle } from "lucide-react";

interface PushToClientModalProps {
  open: boolean;
  onClose: () => void;
  creator: {
    name: string;
    tier: number;
    executionPrice: number;
    usageRights: string;
  };
  budgetWarning?: boolean;
}

export function PushToClientModal({ open, onClose, creator, budgetWarning }: PushToClientModalProps) {
  const handleConfirm = () => {
    alert(`${creator.name} pushed to client successfully!`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Push to Client</DialogTitle>
          <DialogDescription>
            Confirm sending this creator to the client selection pool
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Creator</span>
              <span>{creator.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tier</span>
              <span className="px-2 py-0.5 rounded-full bg-[#038B97]/10 text-[#038B97] text-xs">
                Tier {creator.tier}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Execution Price</span>
              <span>${creator.executionPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Usage Rights</span>
              <span>{creator.usageRights}</span>
            </div>
          </div>

          {budgetWarning && (
            <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <strong>Budget Warning:</strong> Adding this creator will bring you to 94% of total budget.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            style={{ backgroundColor: "#038B97" }}
            onClick={handleConfirm}
          >
            Confirm push →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
