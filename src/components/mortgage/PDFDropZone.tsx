
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, CheckCircle, AlertCircle } from "lucide-react";

interface PDFDropZoneProps {
  onFileAccepted?: (file: File) => void;
  className?: string;
  disabled?: boolean;
}

const PDFDropZone: React.FC<PDFDropZoneProps> = ({ 
  onFileAccepted, 
  className = "", 
  disabled = false 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      }
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
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <FileUp className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-gray-700 font-medium">Drop your 1003 PDF file here</p>
              <p className="text-gray-500 text-sm mb-4">or click to browse</p>
              
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
          <p>Upload your 1003 PDF file to automatically populate application data</p>
          <p className="text-xs mt-1 italic">Supported format: PDF up to 10MB</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFDropZone;
