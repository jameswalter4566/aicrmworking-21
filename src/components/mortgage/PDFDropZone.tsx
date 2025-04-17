
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Props {
  leadId?: string;
  onConditionsFound?: (conditions: any, automationResults?: any) => void;
}

const PDFDropZone: React.FC<Props> = ({ leadId, onConditionsFound }) => {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const file = acceptedFiles[0];
      
      // Upload file to get a URL
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`temp/${Date.now()}_${file.name}`, file);

      if (uploadError) throw uploadError;

      // Get the URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path);

      // Analyze the PDF
      const { data, error } = await supabase.functions.invoke('analyze-pdf-document', {
        body: { 
          fileUrl: publicUrl,
          fileType: "conditions",
          leadId
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze document');
      }

      toast.success('Document analyzed successfully');
      
      // Pass both conditions and automation results to parent
      if (onConditionsFound) {
        onConditionsFound(data.conditions, data.automationResults);
      }

    } catch (error: any) {
      console.error('Error processing document:', error);
      toast.error(error.message || 'Failed to process document');
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  return (
    <Card 
      {...getRootProps()} 
      className={`p-8 border-2 border-dashed cursor-pointer transition-colors ${
        isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <input {...getInputProps()} />
      <div className="text-center">
        {isUploading ? (
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing document...</span>
          </div>
        ) : isDragActive ? (
          <p className="text-blue-600">Drop the PDF here</p>
        ) : (
          <p>Drag and drop a PDF here, or click to select one</p>
        )}
      </div>
    </Card>
  );
};

export default PDFDropZone;
