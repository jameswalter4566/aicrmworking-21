import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, CheckCircle, AlertCircle, Brain } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PDFDropZoneProps {
  onFileAccepted?: (file: File) => void;
  className?: string;
  disabled?: boolean;
  leadId?: string;
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        if (onFileAccepted) {
          onFileAccepted(droppedFile);
        } else if (leadId) {
          // If no handler is provided but leadId is available, handle internally
          processFile(droppedFile, leadId);
        }
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (disabled || !e.target.files || e.target.files.length === 0) return;
    
    const selectedFile = e.target.files[0];
    
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      if (onFileAccepted) {
        onFileAccepted(selectedFile);
      } else if (leadId) {
        // If no handler is provided but leadId is available, handle internally
        processFile(selectedFile, leadId);
      }
    }
  };

  const processFile = async (file: File, leadId: string) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uniqueFileName = `${Date.now()}_${file.name}`;
      const fileType = "conditions"; // Assuming we're processing conditions
      
      toast.info("Analyzing conditions document...");
      console.log("Starting PDF analysis process...");
      
      // Step 1: Upload the document to Supabase Storage
      console.log("Uploading PDF to Supabase storage...");
      const { error: uploadError, data } = await supabase.storage
        .from('borrower-documents')
        .upload(`leads/${leadId}/conditions/${uniqueFileName}`, file);
        
      if (uploadError) {
        throw new Error(`Error uploading document: ${uploadError.message}`);
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('borrower-documents')
        .getPublicUrl(`leads/${leadId}/conditions/${uniqueFileName}`);
      
      console.log(`Document uploaded successfully at: ${publicUrl}`);
      console.log(`Starting analysis with analyze-pdf-document function...`);
      
      // Step 2: Call analyze-pdf-document edge function with explicit fileType
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-pdf-document', {
        body: { 
          fileUrl: publicUrl, 
          fileType: "conditions", // Explicitly stating this is a conditions document
          leadId
        }
      });
      
      if (analysisError) {
        console.error("Error analyzing document:", analysisError);
        throw new Error(`Error analyzing document: ${analysisError.message}`);
      }
      
      console.log("Document analysis complete:", analysisData);
      
      // Step 3: Explicitly call the LOE generator function with the conditions data
      if (analysisData && analysisData.data) {
        console.log("Starting LOE generation process...");
        try {
          const { data: loeData, error: loeError } = await supabase.functions.invoke('loe-generator', {
            body: { 
              leadId,
              conditions: [
                ...(analysisData.data.masterConditions || []),
                ...(analysisData.data.generalConditions || []),
                ...(analysisData.data.priorToFinalConditions || []),
                ...(analysisData.data.complianceConditions || [])
              ].filter(c => 
                c.text && (
                  c.text.toLowerCase().includes('explanation') || 
                  c.text.toLowerCase().includes('loe') ||
                  c.text.toLowerCase().includes('letter')
                )
              )
            }
          });
          
          if (loeError) {
            console.error("Error generating LOE documents:", loeError);
            toast.warning('Conditions processed, but LOE generation had errors.');
          } else {
            console.log("LOE generation completed successfully:", loeData);
            toast.success(`Successfully generated ${loeData?.processedCount || 0} LOE document(s)!`);
          }
        } catch (loeGenError: any) {
          console.error("Exception in LOE generator call:", loeGenError);
          toast.warning(`Conditions processed, but LOE generation encountered an error: ${loeGenError.message || 'Unknown error'}`);
        }
      }
      
      // Step 4: Call automation-matcher if not already triggered
      if (!analysisData.automationTriggered) {
        console.log("Calling automation-matcher with conditions data");
        try {
          const { data: automationData, error: automationError } = await supabase.functions.invoke('automation-matcher', {
            body: { 
              leadId,
              conditions: analysisData.data
            }
          });
          
          if (automationError) {
            console.error("Error from automation-matcher:", automationError);
            toast.warning('Document processed, but automation had errors. Please check the conditions.');
          } else {
            console.log("Automation matcher completed successfully:", automationData);
            toast.success('Document successfully analyzed and conditions processed!');
          }
        } catch (autoError: any) {
          console.error("Exception in automation-matcher call:", autoError);
          toast.warning(`Document processed, but automation encountered an error: ${autoError.message || 'Unknown error'}`);
        }
      } else {
        toast.success('Document successfully analyzed and conditions processing is underway!');
      }
      
    } catch (error: any) {
      console.error('Error processing document:', error);
      toast.error(`Failed to process document: ${error.message || 'Unknown error'}`);
      setError(error.message || 'Failed to process document');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={`${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <CardContent>
        <div
          className={`
            border-2 border-dashed rounded-md p-8 text-center transition-colors
            ${isDragging ? 'border-mortgage-purple bg-mortgage-lightPurple/20' : 'border-gray-300'}
            ${disabled ? 'bg-gray-100' : 'hover:bg-gray-50'}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
              <p className="text-gray-700 font-medium">{file.name}</p>
              <p className="text-gray-500 text-sm">
                {(file.size / (1024 * 1024)).toFixed(2)}MB • PDF
              </p>
              {isProcessing && (
                <div className="mt-2 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-mortgage-purple mr-2"></div>
                  <span className="text-sm text-mortgage-purple">Processing...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Brain className="h-12 w-12 text-mortgage-purple mb-3" />
              <h3 className="text-xl font-bold text-mortgage-darkPurple mb-2">
                AI Loan Officer Assist
              </h3>
              <p className="text-gray-700 font-medium mb-1">
                Drop your borrower documents here
              </p>
              <p className="text-gray-500 text-sm mb-4">
                or click to browse
              </p>
              
              <label className="cursor-pointer bg-mortgage-purple hover:bg-mortgage-darkPurple text-white px-4 py-2 rounded-md transition-colors">
                Select PDF
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf" 
                  onChange={handleFileInputChange}
                  disabled={disabled}
                />
              </label>
              
              {error && (
                <div className="mt-4 flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          <p className="font-medium text-mortgage-darkPurple">
            AI-Powered Document Analysis
          </p>
          <p className="text-gray-600">
            Upload mortgage statements, W-2s, paystubs, or any borrower document and our AI will automatically populate your 1003 application
          </p>
          <p className="text-xs mt-1 italic">
            Supported format: PDF up to 10MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFDropZone;
