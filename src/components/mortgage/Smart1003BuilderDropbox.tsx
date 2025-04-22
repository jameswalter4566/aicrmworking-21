
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface Smart1003BuilderDropboxProps {
  leadId: string;
  returnUrl?: string;
  preserveMortgageStatus?: boolean;
}

const Smart1003BuilderDropbox: React.FC<Smart1003BuilderDropboxProps> = ({ 
  leadId, 
  returnUrl,
  preserveMortgageStatus = true
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { getAuthToken } = useAuth();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are accepted');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  const processDocument = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      // Generate a unique filename
      const timestamp = Date.now();
      const fileName = `smart1003_${timestamp}_${file.name.replace(/\s+/g, '_')}`;
      
      // Upload the file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('borrower-documents')
        .upload(`leads/${leadId}/${fileName}`, file);

      if (uploadError) {
        throw new Error(`Error uploading file: ${uploadError.message}`);
      }

      // Get the URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('borrower-documents')
        .getPublicUrl(`leads/${leadId}/${fileName}`);

      setUploading(false);
      setProcessing(true);

      const token = await getAuthToken();
      console.log("Starting Smart 1003 Builder process with auth token");

      // Process with smart 1003 builder edge function
      const { data: extractionData, error: extractionError } = await supabase.functions.invoke('smart-1003-builder', {
        body: { 
          fileUrl: publicUrl, 
          fileName: fileName,
          leadId, 
          preserveMortgageStatus  // Pass this flag to ensure mortgage status is preserved
        },
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : undefined
      });

      if (extractionError || (extractionData && !extractionData.success)) {
        throw new Error(extractionError?.message || extractionData?.error || 'Error processing document');
      }

      setSuccess(true);
      toast.success('Document processed successfully!');
      
      // Allow viewing the success state briefly before navigating
      setTimeout(() => {
        // If returnUrl is provided, use that, otherwise construct default URL
        if (returnUrl) {
          navigate(returnUrl);
        } else {
          navigate(`/loan-application/${leadId}`);
        }
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'An error occurred during processing');
      console.error('Error in Smart 1003 Builder:', err);
      toast.error('Failed to process document');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <div className="w-full">
      {!file && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-3">
            <Upload className="h-10 w-10 text-blue-500" />
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop the PDF here' : 'Drag & drop your 1003 PDF here'}
            </p>
            <p className="text-gray-500 text-sm">
              or click to select a file
            </p>
          </div>
        </div>
      )}

      {file && !success && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-500 mr-3" />
            <div className="flex-1">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {!uploading && !processing && (
              <Button variant="ghost" size="sm" onClick={clearFile}>
                <XCircle className="h-5 w-5 text-gray-500" />
              </Button>
            )}
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-50 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mt-4">
            <Button 
              onClick={processDocument} 
              disabled={uploading || processing || !!error}
              className="w-full"
            >
              {uploading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {processing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {uploading ? 'Uploading...' : processing ? 'Processing Document...' : 'Process Document'}
            </Button>
          </div>
        </div>
      )}

      {success && (
        <div className="border rounded-lg p-6 text-center bg-green-50 border-green-200">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-green-700">Document Processed Successfully!</h3>
          <p className="text-green-600 mt-1">
            The information has been extracted and your loan application is being updated.
          </p>
        </div>
      )}
    </div>
  );
};

export default Smart1003BuilderDropbox;
