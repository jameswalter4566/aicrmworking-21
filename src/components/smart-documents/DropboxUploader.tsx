
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
  const [processingFiles, setProcessingFiles] = useState<{ file: string, progress: number }[]>([]);

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
    
    // Initialize progress tracking for all files
    setProcessingFiles(files.map(file => ({ 
      file: file.name, 
      progress: 0 
    })));

    try {
      // Simple overall progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 500);

      // Process each file with the new smart document analyzer
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update processing status for this specific file
        setProcessingFiles(prev => prev.map((item, idx) => 
          idx === i ? { ...item, progress: 10 } : item
        ));
        
        // Create form data for file analysis
        const formData = new FormData();
        formData.append("file", file);
        formData.append("leadId", leadId);

        try {
          // Start with analysis to determine the category
          setProcessingFiles(prev => prev.map((item, idx) => 
            idx === i ? { ...item, progress: 25 } : item
          ));
          
          // Call the new analyze-document-type function
          const { data, error } = await supabase.functions.invoke("analyze-document-type", {
            body: formData,
          });

          if (error) {
            console.error("Error analyzing document:", error);
            toast.error(`Failed to analyze ${file.name}: ${error.message}`);
          } else {
            console.log("Document processed successfully:", data);
            
            setProcessingFiles(prev => prev.map((item, idx) => 
              idx === i ? { ...item, progress: 100 } : item
            ));
            
            // Increment success count
            successCount++;
            
            // Show category in toast
            if (data?.data?.classification) {
              const { category, subcategory } = data.data.classification;
              toast.success(`Document stored: ${category} > ${subcategory}`);
            }
          }
        } catch (uploadError) {
          console.error(`Error processing ${file.name}:`, uploadError);
          toast.error(`Failed to process ${file.name}`);
        }
      }

      // Complete the progress
      setUploadProgress(100);
      clearInterval(progressInterval);
      
      // Show final success message
      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} of ${files.length} documents`);
      }

    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error(error.message || "Failed to upload files");
    } finally {
      setIsUploading(false);
      setProcessingFiles([]);
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
          <div className="text-center w-full">
            <Loader2 className="h-12 w-12 text-blue-500 mb-3 animate-spin mx-auto" />
            <span className="font-semibold text-lg text-blue-800 mb-2 block">Uploading and analyzing files...</span>
            
            {/* Overall progress */}
            <div className="w-64 h-2 bg-blue-100 rounded-full overflow-hidden mx-auto mb-4">
              <div 
                className="h-full bg-blue-600 transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="text-sm text-blue-600 mb-4 block">{uploadProgress}% Overall</span>
            
            {/* Individual file progress */}
            {processingFiles.length > 0 && (
              <div className="max-w-md mx-auto mt-2 text-left">
                <p className="text-sm text-gray-600 mb-1">Processing {processingFiles.length} files:</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {processingFiles.map((item, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="truncate max-w-[200px]">{item.file}</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300" 
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 text-blue-500 mb-2" />
            <span className="font-semibold text-lg text-blue-800 mb-1">Drop files here or click to upload</span>
            <span className="text-blue-600 text-sm mb-2">Upload documents to be automatically categorized</span>
            <span className="text-xs text-gray-500">Our AI will organize your documents in the right categories</span>
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
