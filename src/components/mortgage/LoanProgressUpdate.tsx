import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLoanProgress } from "@/hooks/use-loan-progress";
import { CheckCircle } from "lucide-react";

interface LoanProgressUpdateProps {
  leadId: string | number;
  onUpdate?: () => void;
  currentStep?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonText?: string;
}

// Define progress steps for loan progression - keep in sync with tracker
const LOAN_PROGRESS_STEPS = [
  { id: "applicationCreated", label: "Application Created" },
  { id: "disclosuresSent", label: "Disclosures Sent" },
  { id: "disclosuresSigned", label: "Disclosures Signed" },
  { id: "submitted", label: "Submitted" },
  { id: "processing", label: "Processing" },
  { id: "approved", label: "Approved" },
  { id: "closingDisclosureGenerated", label: "Closing Disclosure Generated" },
  { id: "closingDisclosureSigned", label: "Closing Disclosure Signed" },
  { id: "ctc", label: "Clear to Close (CTC)" },
  { id: "docsOut", label: "Docs Out" },
  { id: "closing", label: "Closing" },
  { id: "funded", label: "Funded" },
];

export function LoanProgressUpdate({
  leadId,
  onUpdate,
  currentStep,
  buttonVariant = "default",
  buttonSize = "default",
  buttonText = "Update Loan Progress"
}: LoanProgressUpdateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string>(currentStep || "");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);
  
  const { updateLoanProgress, isUpdating } = useLoanProgress({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        if (onUpdate) {
          onUpdate();
        }
      }, 2000);
    },
    onError: (error) => {
      toast.error(error);
    }
  });

  const handleUpdate = async () => {
    if (!selectedStep) {
      toast.error("Please select a progress step");
      return;
    }

    await updateLoanProgress(leadId, selectedStep, notes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-medium text-gray-700 mb-2">Updated Successfully</h2>
            <p className="text-gray-500">The loan progress has been updated.</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Update Loan Progress</DialogTitle>
              <DialogDescription>
                Change the current progress stage of this loan application.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="step" className="text-right font-medium text-sm">
                  Progress Step
                </label>
                <div className="col-span-3">
                  <Select
                    value={selectedStep}
                    onValueChange={setSelectedStep}
                  >
                    <SelectTrigger id="step">
                      <SelectValue placeholder="Select a progress step" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOAN_PROGRESS_STEPS.map((step) => (
                        <SelectItem key={step.id} value={step.id}>
                          {step.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="notes" className="text-right font-medium text-sm">
                  Notes
                </label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this status change"
                  className="col-span-3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleUpdate}
                disabled={isUpdating || !selectedStep}
              >
                {isUpdating ? "Updating..." : "Update Loan Progress"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
