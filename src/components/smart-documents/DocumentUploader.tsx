
import React, { useState, useRef } from "react";
import { FileUp, File, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DocumentUploaderProps {
  leadId: string;
  category: string;
  subcategory: string;
  onUploadComplete?: () => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ 
  leadId, 
  category, 
  subcategory,
  onUploadComplete 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    await uploadFiles(files);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    await uploadFiles(files);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Check if lead ID is valid
  const isValidLeadId = (id: string | undefined | null): boolean => {
    return !!id && id !== "undefined" && id !== "null";
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    // Validate lead ID before proceeding
    if (!isValidLeadId(leadId)) {
      toast.error("Cannot upload: Invalid or missing lead ID");
      return;
    }
    
    setIsUploading(true);
    setUploadingFiles(files);
    
    const totalFiles = files.length;
    let successCount = 0;
    
    try {
      for (const file of files) {
        // Check file size (limit to 15MB for example)
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`${file.name} exceeds the 15MB limit.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('leadId', leadId);
        formData.append('category', category);
        formData.append('subcategory', subcategory);

        const { data, error } = await supabase.functions.invoke('store-document', {
          body: formData,
        });

        if (error || !data?.success) {
          console.error("Upload error:", error || data?.error);
          toast.error(`Failed to upload ${file.name}: ${error?.message || data?.error || 'Unknown error'}`);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          successCount === totalFiles 
            ? `Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}` 
            : `Uploaded ${successCount} of ${totalFiles} documents`
        );
        
        if (onUploadComplete) {
          onUploadComplete();
        }
      }
    } catch (err) {
      console.error("Error in uploadFiles:", err);
      toast.error("An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
      setUploadingFiles([]);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
        isDragging 
          ? 'bg-blue-50 border-blue-400' 
          : 'bg-white border-gray-300 hover:border-blue-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center text-center p-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
            <p className="text-sm text-gray-600">Uploading document{uploadingFiles.length > 1 ? 's' : ''}...</p>
          </div>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center focus:outline-none"
            type="button"
          >
            <FileUp className="h-8 w-8 text-blue-500 mb-2" />
            <p className="font-medium text-blue-600">Click or drag files to upload</p>
            <p className="text-xs text-gray-500 mt-1">PDF, Word, Excel, and image files supported</p>
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentUploader;
