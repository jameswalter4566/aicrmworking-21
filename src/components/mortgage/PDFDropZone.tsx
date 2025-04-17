
import React, { useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, CheckCircle, AlertCircle, Brain } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PDFDropZoneProps {
  onFileAccepted?: (file: File) => void;
  className?: string;
  disabled?: boolean;
  leadId?: string;
  fileType?: string;
  autoProcessConditions?: boolean;
}

const PDFDropZone: React.FC<PDFDropZoneProps> = ({ 
  onFileAccepted, 
  className = "", 
  disabled = false,
  leadId,
  fileType = "",
  autoProcessConditions = true
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const validateFile = useCallback((file: File) => {
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
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;
    
    setFile(file);
    setIsProcessing(true);
    setError(null);

    try {
      // Create a URL for the file to upload to Supabase storage
      const timestamp = new Date().getTime();
      const filePath = `uploads/${timestamp}_${file.name}`;
      
      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload error: ${uploadError.message}`);
      }

      // Get a temporary public URL for the uploaded file
      const { data: urlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);

      if (!urlData || !urlData.signedUrl) {
        throw new Error('Failed to get file URL');
      }

      const fileUrl = urlData.signedUrl;

      // Call the analyze-pdf-document edge function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        'analyze-pdf-document',
        {
          body: { 
            fileUrl,
            fileType: fileType || (fileType === "conditions" ? "conditions" : ""),
            leadId
          }
        }
      );

      if (analysisError) {
        throw new Error(`Analysis error: ${analysisError.message}`);
      }

      console.log('PDF Analysis completed successfully:', analysisData);
      toast.success('Document analyzed successfully');

      // If this is a conditions document and we have a leadId, run the automation matcher
      if (autoProcessConditions && fileType === "conditions" && leadId && analysisData?.data) {
        try {
          console.log('Running condition automation matcher...');
          const { data: automationData, error: automationError } = await supabase.functions.invoke(
            'automation-matcher',
            {
              body: { 
                leadId,
                conditions: analysisData.data
              }
            }
          );

          if (automationError) {
            console.error('Error running automation:', automationError);
            toast.error('Error running condition automation');
          } else {
            console.log('Automation results:', automationData);
            toast.success('Condition automation completed');
          }
        } catch (automationErr) {
          console.error('Exception running automation:', automationErr);
        }
      }

      // Call the external onFileAccepted prop if provided
      if (onFileAccepted) {
        onFileAccepted(file);
      }
    } catch (err: any) {
      console.error('Error processing file:', err);
      setError(err.message || 'An error occurred while processing the file');
      toast.error('Error processing document');
    } finally {
      setIsProcessing(false);
    }
  }, [validateFile, leadId, fileType, onFileAccepted, autoProcessConditions]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        processFile(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: disabled || isProcessing
  });

  return (
    <Card className={`${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <CardContent className="p-4">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-md p-6 text-center transition-colors
            ${isDragActive ? 'border-mortgage-purple bg-mortgage-lightPurple/20' : 'border-gray-300'}
            ${disabled || isProcessing ? 'bg-gray-100' : 'hover:bg-gray-50'}
            ${disabled || isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <input {...getInputProps()} />
          
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-mortgage-purple border-t-transparent mb-2"></div>
              <p className="text-gray-700 font-medium">Processing...</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
              <p className="text-gray-700 font-medium">{file.name}</p>
              <p className="text-gray-500 text-sm">
                {(file.size / (1024 * 1024)).toFixed(2)}MB • PDF
              </p>
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
              
              <div className="cursor-pointer bg-mortgage-purple hover:bg-mortgage-darkPurple text-white px-4 py-2 rounded-md transition-colors">
                Select PDF
              </div>
              
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
