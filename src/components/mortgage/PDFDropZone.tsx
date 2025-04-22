import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, CheckCircle, AlertCircle, Brain, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ProcessingStatusContainer from "./ProcessingStatusContainer";
interface PDFDropZoneProps {
  onFileAccepted?: (file: File) => void;
  className?: string;
  disabled?: boolean;
  leadId?: string;
}
interface ConditionsData {
  masterConditions: LoanCondition[];
  generalConditions: LoanCondition[];
  priorToFinalConditions: LoanCondition[];
  complianceConditions: LoanCondition[];
}
interface LoanCondition {
  id: string;
  text: string;
  status: string;
  category: string;
  documentUrl?: string;
}
const PDFDropZone: React.FC<PDFDropZoneProps> = ({
  onFileAccepted,
  className = "",
  disabled = false,
  leadId
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedLoeUrl, setGeneratedLoeUrl] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<Array<{
    id: string;
    label: string;
    status: "pending" | "processing" | "completed";
  }>>([{
    id: "upload",
    label: "Uploading document",
    status: "pending"
  }, {
    id: "analysis",
    label: "Analyzing conditions",
    status: "pending"
  }, {
    id: "automation",
    label: "Running automations",
    status: "pending"
  }, {
    id: "loe",
    label: "Generating LOE documents",
    status: "pending"
  }]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<'uploading' | 'analyzing' | 'processing' | 'complete'>('uploading');
  const updateStepStatus = (stepId: string, status: "pending" | "processing" | "completed") => {
    setProcessingSteps(steps => steps.map(step => step.id === stepId ? {
      ...step,
      status
    } : step));
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) e.dataTransfer.dropEffect = "copy";
  };
  const validateFile = (file: File) => {
    if (!file.type.includes('pdf')) {
      setError("Please upload a PDF file only");
      return false;
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError(`File size exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
      return false;
    }
    return true;
  };
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);
    setGeneratedLoeUrl(null);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        setIsProcessing(true);
        setUploadProgress(0);
        setProcessingStage('uploading');
        updateStepStatus("upload", "processing");
        if (onFileAccepted) {
          onFileAccepted(droppedFile);
        } else if (leadId) {
          processFile(droppedFile, leadId);
        }
      }
    }
  };
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setGeneratedLoeUrl(null);
    if (disabled || !e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setIsProcessing(true);
      setUploadProgress(0);
      setProcessingStage('uploading');
      updateStepStatus("upload", "processing");
      if (onFileAccepted) {
        onFileAccepted(selectedFile);
      } else if (leadId) {
        processFile(selectedFile, leadId);
      }
    }
  };
  const processFile = async (file: File, leadId: string) => {
    setIsProcessing(true);
    setGeneratedLoeUrl(null);
    setUploadProgress(0);
    setProcessingStage('uploading');
    try {
      // Simulated upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      updateStepStatus("upload", "processing");
      const formData = new FormData();
      formData.append('file', file);
      const uniqueFileName = `${Date.now()}_${file.name}`;
      const fileType = "conditions";
      setProcessingStage('uploading');
      toast({
        title: "Analyzing Document",
        description: "Analyzing conditions document..."
      });
      console.log("Starting PDF analysis process...");
      console.log(`Processing file: ${file.name} (${file.size} bytes)`);
      console.log("Uploading PDF to Supabase storage...");
      const {
        error: uploadError,
        data
      } = await supabase.storage.from('borrower-documents').upload(`leads/${leadId}/conditions/${uniqueFileName}`, file);
      if (uploadError) {
        console.error("Error uploading document:", uploadError);
        throw new Error(`Error uploading document: ${uploadError.message}`);
      }
      updateStepStatus("upload", "completed");
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('borrower-documents').getPublicUrl(`leads/${leadId}/conditions/${uniqueFileName}`);
      console.log(`Document uploaded successfully at: ${publicUrl}`);
      console.log(`Starting analysis with analyze-pdf-document function. File URL: ${publicUrl}`);
      const analysisStartTime = Date.now();
      clearInterval(progressInterval);
      setUploadProgress(100);
      setProcessingStage('analyzing');
      const {
        data: analysisData,
        error: analysisError
      } = await supabase.functions.invoke('analyze-pdf-document', {
        body: {
          fileUrl: publicUrl,
          fileType: "conditions",
          leadId
        }
      });
      const analysisEndTime = Date.now();
      console.log(`Analysis completed in ${analysisEndTime - analysisStartTime}ms`);
      if (analysisError) {
        console.error("Error analyzing document:", analysisError);
        throw new Error(`Error analyzing document: ${analysisError.message}`);
      }
      console.log("Document analysis complete:", analysisData);
      const conditionsData = analysisData.data || {};
      if (conditionsData.rawExtractedText) {
        console.log("Raw extracted text sample:", conditionsData.rawExtractedText.fullText.substring(0, 500) + "...");
      }
      const totalConditions = (conditionsData.masterConditions || []).length + (conditionsData.generalConditions || []).length + (conditionsData.priorToFinalConditions || []).length + (conditionsData.complianceConditions || []).length;
      toast.success(`Found ${totalConditions} conditions in the document.`);
      if (analysisData && analysisData.data) {
        console.log("Starting LOE generation process...");
        const allConditions = [...(analysisData.data.masterConditions || []), ...(analysisData.data.generalConditions || []), ...(analysisData.data.priorToFinalConditions || []), ...(analysisData.data.complianceConditions || [])];
        console.log(`Found ${allConditions.length} total conditions`);
        const loeConditions = allConditions.filter(c => c.text && (c.text.toLowerCase().includes('explanation') || c.text.toLowerCase().includes('loe') || c.text.toLowerCase().includes('letter')));
        console.log(`Found ${loeConditions.length} conditions that may need a letter of explanation`);
        if (loeConditions.length > 0) {
          try {
            console.log("Calling loe-generator with conditions:", loeConditions);
            const loeStartTime = Date.now();
            const {
              data: loeData,
              error: loeError
            } = await supabase.functions.invoke('loe-generator', {
              body: {
                leadId,
                conditions: loeConditions
              }
            });
            const loeEndTime = Date.now();
            console.log(`LOE generation completed in ${loeEndTime - loeStartTime}ms`);
            if (loeError) {
              console.error("Error generating LOE documents:", loeError);
              toast.warning('Conditions processed, but LOE generation had errors.');
            } else {
              console.log("LOE generation completed successfully:", loeData);
              if (loeData?.results && loeData.results.length > 0 && loeData.results[0].generatedDocumentUrl) {
                setGeneratedLoeUrl(loeData.results[0].generatedDocumentUrl);
                toast.success(`Generated ${loeData?.results.length} LOE document(s)!`);
              } else {
                toast.success(`Successfully processed ${loeData?.processedCount || 0} LOE document(s)!`);
              }
            }
          } catch (loeGenError: any) {
            console.error("Exception in LOE generator call:", loeGenError);
            toast.warning({
              title: "LOE Generation Warning",
              description: `Conditions processed, but LOE generation encountered an error: ${loeGenError.message || 'Unknown error'}`
            });
          }
        } else {
          console.log("No conditions requiring letters of explanation were found");
          toast.info("No conditions requiring letters of explanation were found");
        }
      }
      if (!analysisData.automationTriggered) {
        console.log("Calling automation-matcher with conditions data");
        try {
          const autoStartTime = Date.now();
          const {
            data: automationData,
            error: automationError
          } = await supabase.functions.invoke('automation-matcher', {
            body: {
              leadId,
              conditions: analysisData.data
            }
          });
          const autoEndTime = Date.now();
          console.log(`Automation matching completed in ${autoEndTime - autoStartTime}ms`);
          if (automationError) {
            console.error("Error from automation-matcher:", automationError);
            toast.warning({
              title: "Automation Warning",
              description: 'Document processed, but automation had errors. Please check the conditions.'
            });
          } else {
            console.log("Automation matcher completed successfully:", automationData);
            toast.success('Document successfully analyzed and conditions processed!');
          }
        } catch (autoError: any) {
          console.error("Exception in automation-matcher call:", autoError);
          toast.warning({
            title: "Automation Error",
            description: `Document processed, but automation encountered an error: ${autoError.message || 'Unknown error'}`
          });
        }
      } else {
        toast.success('Document successfully analyzed and conditions processing is underway!');
      }
    } catch (error: any) {
      console.error('Error processing document:', error);
      toast.error(`Failed to process document: ${error.message || 'Unknown error'}`);
      setError(error.message || 'Failed to process document');
      setUploadProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };
  const getProcessingStageText = () => {
    switch (processingStage) {
      case 'uploading':
        return "Uploading your document...";
      case 'analyzing':
        return "AI is analyzing your conditions...";
      case 'processing':
        return "Processing and matching conditions...";
      case 'complete':
        return "Processing complete!";
      default:
        return "Processing...";
    }
  };
  return <Card className={`${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      
    </Card>;
};
export default PDFDropZone;