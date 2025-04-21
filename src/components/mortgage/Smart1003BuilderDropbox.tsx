
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileUp, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Helper to create a file URL for a file object
const createFileURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface Smart1003BuilderDropboxProps {
  leadId: string;
}

const Smart1003BuilderDropbox: React.FC<Smart1003BuilderDropboxProps> = ({ leadId }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle drag over event
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.type === 'application/pdf' || 
        file.type === 'image/jpeg' || 
        file.type === 'image/png'
      );
      
      if (newFiles.length === 0) {
        toast({
          title: "Invalid files",
          description: "Only PDF, JPEG, and PNG files are accepted.",
          variant: "destructive"
        });
        return;
      }
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(file => 
        file.type === 'application/pdf' || 
        file.type === 'image/jpeg' || 
        file.type === 'image/png'
      );
      
      if (newFiles.length === 0) {
        toast({
          title: "Invalid files",
          description: "Only PDF, JPEG, and PNG files are accepted.",
          variant: "destructive"
        });
        return;
      }
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Process files
  const handleProcessFiles = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to process.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Start upload process
      setIsUploading(true);
      
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadProgress(i);
      }
      
      // Create file URLs (would normally be uploaded to storage)
      const fileUrls = await Promise.all(files.map(file => createFileURL(file)));
      
      setIsUploading(false);
      setIsProcessing(true);
      
      toast({
        title: "Processing documents",
        description: "Analyzing your documents to fill out the 1003 form...",
      });
      
      // Call the smart-1003-builder edge function
      try {
        const { data, error } = await supabase.functions.invoke('smart-1003-builder', {
          body: { fileUrls, leadId },
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        // Navigate to the Smart 1003 Builder page when done
        navigate(`/mortgage/smart-1003-builder/${leadId}`);
        
      } catch (error) {
        console.error("Error calling edge function:", error);
        toast({
          title: "Processing failed",
          description: "There was an error processing your documents. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: "Processing failed",
        description: "There was an error processing your documents. Please try again.",
        variant: "destructive"
      });
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-blue-300 hover:border-blue-500 transition-colors">
      <CardHeader className="bg-blue-50">
        <CardTitle className="text-blue-700 flex items-center gap-2">
          <FileUp className="h-5 w-5" />
          Smart 1003 Builder
        </CardTitle>
        <CardDescription>
          Upload your financial documents to automatically fill out your loan application
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* File Drop Area */}
        {files.length === 0 && (
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50 transition-colors"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <FileUp className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-medium text-lg mb-2">Upload Your Documents</h3>
            <p className="text-gray-500 mb-4">Drag and drop your documents here or click to browse</p>
            <Button size="sm" variant="outline" className="border-blue-300">
              Select Files
            </Button>
            <input 
              type="file" 
              id="file-upload" 
              multiple 
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" 
              className="hidden"
              onChange={handleFileInputChange}
            />
            <p className="text-xs text-gray-400 mt-4">
              Supported formats: PDF, JPEG, PNG
            </p>
          </div>
        )}
        
        {/* File List */}
        {files.length > 0 && (
          <div className="p-4">
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-md">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => handleRemoveFile(index)}
                  >
                    &times;
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Add more files button */}
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-sm"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <FileUp className="h-4 w-4 mr-1" />
                Add More Files
              </Button>
              
              <p className="text-sm text-gray-500">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            
            {/* Progress indicator */}
            {isUploading && (
              <div className="mb-4">
                <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-center mt-1 text-gray-500">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
            
            {/* Process button */}
            <Button 
              className="w-full" 
              onClick={handleProcessFiles}
              disabled={isUploading || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Documents...
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Process Documents & Build 1003
                </>
              )}
            </Button>
            
            <p className="text-xs text-center mt-2 text-gray-500">
              Your documents will be securely processed to auto-fill your 1003 form
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Smart1003BuilderDropbox;
