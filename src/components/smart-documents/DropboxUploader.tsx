
import React, { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DropboxUploaderProps {
  leadId?: string;
  onFilesAdded?: (files: File[]) => void;
}

const DropboxUploader: React.FC<DropboxUploaderProps> = ({ leadId, onFilesAdded }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (leadId) {
      handleFiles(files);
    } else if (onFilesAdded) {
      onFilesAdded(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (leadId) {
      handleFiles(files);
    } else if (onFilesAdded) {
      onFilesAdded(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!leadId) {
      toast.error("No lead ID provided for document upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simple progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Process and upload each file
      for (const file of files) {
        const category = "Dropbox";
        const subcategory = "Uploads";

        // Create form data for the file upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("leadId", leadId);
        formData.append("category", category);
        formData.append("subcategory", subcategory);

        // Upload file via edge function
        const { data, error } = await supabase.functions.invoke("store-document", {
          body: formData,
        });

        if (error) {
          throw new Error(error.message);
        }

        console.log("File uploaded:", data);
      }

      // Clear progress interval and finish upload
      setUploadProgress(100);
      toast.success("Files uploaded successfully");

    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error(error.message || "Failed to upload files");
    } finally {
      setIsUploading(false);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  };

  return (
    <div className="relative">
      <div
        className={`flex flex-col items-center justify-center w-full h-80 border-4 border-dashed border-blue-400 ${isUploading ? 'bg-blue-50/90' : 'bg-blue-50/60'} rounded-3xl p-8 cursor-pointer transition-all hover:bg-blue-100/80`}
        onClick={() => fileInput.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        tabIndex={0}
        role="button"
        aria-label="Upload documents"
      >
        {isUploading ? (
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-500 mb-3 animate-spin mx-auto" />
            <span className="font-semibold text-lg text-blue-800 mb-2 block">Uploading files...</span>
            <div className="w-64 h-2 bg-blue-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="text-sm text-blue-600 mt-2 block">{uploadProgress}%</span>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 text-blue-500 mb-2" />
            <span className="font-semibold text-lg text-blue-800 mb-1">Drop files here or click to upload</span>
            <span className="text-blue-600 text-sm mb-2">You can upload multiple PDF or image files</span>
          </>
        )}
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".pdf,image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default DropboxUploader;
