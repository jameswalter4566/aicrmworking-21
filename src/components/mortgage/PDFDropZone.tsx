
import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { FileUp, CheckCircle, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PDFDropZoneProps {
  onFileAccepted: (file: File) => void;
  maxSizeMB?: number;
}

const PDFDropZone: React.FC<PDFDropZoneProps> = ({ 
  onFileAccepted,
  maxSizeMB = 10
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };
  
  const processFile = (file: File) => {
    // Check if it's a PDF
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    
    // Check file size (convert maxSizeMB to bytes)
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`File size exceeds the maximum limit of ${maxSizeMB}MB`);
      return;
    }
    
    setUploadedFile(file);
    setIsProcessing(true);
    
    // Call the callback with the file
    onFileAccepted(file);
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  };
  
  const handleClearFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className="w-full">
      {!uploadedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-blue-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          style={{ minHeight: '200px', cursor: 'pointer' }}
        >
          <FileUp className="h-10 w-10 text-blue-500 mb-4" />
          <p className="mb-2 text-lg font-medium text-gray-700">
            Upload Approval PDF
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Drag and drop your file here, or click to browse
          </p>
          <p className="text-xs text-gray-400">
            PDF only, max {maxSizeMB}MB
          </p>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept="application/pdf"
          />
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <File className="h-6 w-6 text-blue-600" />
              </div>
              
              <div>
                <p className="font-medium text-gray-800">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm text-blue-600">Processing...</span>
                </div>
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFile}
                className="text-gray-500 hover:text-red-500 p-1 h-auto"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {uploadedFile && !isProcessing && (
        <div className="mt-4">
          <Button onClick={triggerFileInput} variant="outline" className="mr-2">
            Upload Different File
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDFDropZone;
