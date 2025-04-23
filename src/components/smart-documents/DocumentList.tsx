
import React, { useEffect, useState } from "react";
import { FileText, DownloadCloud, Loader2, Eye, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentFile {
  id: number;
  file_name: string;
  original_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  url: string;
}

interface DocumentListProps {
  leadId: string;
  category: string;
  subcategory: string;
  refresh?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({ 
  leadId, 
  category, 
  subcategory,
  refresh = false
}) => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualRefresh, setManualRefresh] = useState(false);

  // Check if lead ID is valid
  const isValidLeadId = (id: string | undefined | null): boolean => {
    return !!id && id !== "undefined" && id !== "null";
  };

  useEffect(() => {
    if (isValidLeadId(leadId)) {
      fetchDocuments();
    } else {
      setError("Invalid lead ID");
      setIsLoading(false);
    }
  }, [leadId, category, subcategory, refresh, manualRefresh]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching documents for lead: ${leadId}, category: ${category}, subcategory: ${subcategory}`);
      
      const { data, error } = await supabase.functions.invoke('retrieve-documents', {
        body: { 
          leadId, 
          category, 
          subcategory 
        }
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw new Error(error.message);
      }

      if (!data.success) {
        console.error("Function error response:", data.error);
        throw new Error(data.error || "Failed to retrieve documents");
      }

      console.log(`Retrieved ${data.data?.length || 0} documents`);
      setDocuments(data.data || []);
      
      if (data.data?.length === 0) {
        toast.info(`No documents found for lead ID: ${leadId} in category: ${category}/${subcategory}`);
      }
    } catch (err: any) {
      console.error("Error fetching documents:", err);
      setError(err.message || "An unexpected error occurred");
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setManualRefresh(prev => !prev);
    toast.info("Refreshing document list...");
  };

  const handleOpenDocument = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (!isValidLeadId(leadId)) {
    return (
      <div className="p-4 border border-amber-200 rounded-lg bg-amber-50 text-amber-700 flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
        <p>Cannot retrieve documents: Invalid lead ID</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">
          {isLoading ? 'Loading documents...' : `${documents.length} document(s) found`}
        </h3>
        <button 
          onClick={handleRefresh} 
          disabled={isLoading}
          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
          title="Refresh document list"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading documents...</span>
        </div>
      ) : error ? (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-600">
          <p>Error loading documents: {error}</p>
          <button 
            className="mt-2 text-blue-500 underline"
            onClick={() => fetchDocuments()}
          >
            Try again
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>No documents found in this category</p>
          <p className="text-sm mt-2">Upload documents to see them here</p>
          <p className="text-xs mt-4 text-amber-600">Lead ID: {leadId}</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center overflow-hidden">
                <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mr-3" />
                <div className="overflow-hidden">
                  <p className="font-medium text-sm truncate" title={doc.original_name}>
                    {doc.original_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex ml-4">
                <button
                  onClick={() => handleOpenDocument(doc.url)}
                  className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                  title="View document"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <a 
                  href={doc.url} 
                  download={doc.original_name}
                  className="p-1 text-gray-600 hover:text-blue-600 transition-colors ml-1"
                  title="Download document"
                >
                  <DownloadCloud className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentList;
