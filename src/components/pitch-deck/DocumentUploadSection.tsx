
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, File, X, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface DocumentUploadSectionProps {
  pitchDeckId: string;
}

const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({ pitchDeckId }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, status: 'uploading' | 'success' | 'error'}[]>([]);
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (!files || files.length === 0) {
      return;
    }
    
    setUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Add file to the list with uploading status
      setUploadedFiles(prev => [...prev, { name: file.name, status: 'uploading' }]);
      
      try {
        // Replace this with your actual file upload logic
        // For demo purposes we're just simulating an upload
        const response = await simulateFileUpload(file);
        
        // Update file status to success
        setUploadedFiles(prev => 
          prev.map(f => 
            f.name === file.name ? { ...f, status: 'success' } : f
          )
        );
        
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        console.error("Upload error:", error);
        
        // Update file status to error
        setUploadedFiles(prev => 
          prev.map(f => 
            f.name === file.name ? { ...f, status: 'error' } : f
          )
        );
        
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setUploading(false);
    
    // Clear the file input
    event.target.value = '';
  };
  
  const simulateFileUpload = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Replace this with your actual upload logic
      // For example, with supabase:
      // const { error } = await supabase
      //   .storage
      //   .from('documents')
      //   .upload(`${pitchDeckId}/${file.name}`, file);
      
      // This is just a simulation
      setTimeout(() => {
        // 10% chance of error for demonstration
        if (Math.random() > 0.9) {
          reject(new Error("Upload failed"));
        } else {
          resolve();
        }
      }, 1000 + Math.random() * 2000); // Random time between 1-3 seconds
    });
  };
  
  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-6">Required Documents</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Upload Your Documents</CardTitle>
          <CardDescription>
            Please upload the following documents to help us process your refinance application faster:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <div className="font-medium">Required Documents:</div>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
                <li>Last 2 months of bank statements</li>
                <li>Most recent pay stubs (covering 30 days)</li>
                <li>Last 2 years of W-2s or tax returns</li>
                <li>Copy of your driver's license or ID</li>
                <li>Current mortgage statement</li>
              </ul>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Upload className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-lg font-medium mb-1">Click to upload documents</p>
                <p className="text-sm text-gray-500">or drag and drop files here</p>
                <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG up to 10MB each</p>
              </label>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="font-medium">Uploaded Files:</h4>
                {uploadedFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center space-x-3">
                      <File className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                    <div className="flex items-center">
                      {file.status === 'uploading' && (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full mr-2" />
                      )}
                      {file.status === 'success' && (
                        <Check className="h-5 w-5 text-green-500 mr-2" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <button 
                        onClick={() => removeFile(file.name)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button 
              className="w-full mt-4" 
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Documents'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUploadSection;
