
import React, { useState, useEffect } from "react";
import { FilePlus, FolderOpenIcon, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartDocumentSidebar from "@/components/smart-documents/SmartDocumentSidebar";
import DropboxUploader from "@/components/smart-documents/DropboxUploader";
import DocumentUploader from "@/components/smart-documents/DocumentUploader";
import DocumentList from "@/components/smart-documents/DocumentList";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

const SmartDocumentManager: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>();
  const [refreshDocuments, setRefreshDocuments] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const { id: leadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // If no valid leadId is provided in the URL, show error and provide navigation options
    if (!leadId || leadId === "undefined") {
      toast.error("No valid lead ID provided");
    }
  }, [leadId, navigate]);
  
  // Handle when documents have been uploaded to trigger a refresh
  const handleDocumentsUploaded = () => {
    setRefreshDocuments(prev => !prev);
  };

  const handleSidebarSelect = (cat: string, sub: string | null) => {
    setSelectedCategory(cat);
    setSelectedSubcategory(sub ?? undefined);
  };

  // Helper function to check if lead ID is valid
  const isValidLeadId = (id: string | undefined): boolean => {
    return !!id && id !== "undefined" && id !== "null";
  };

  // If we don't have a valid lead ID, show a search/entry form
  if (!isValidLeadId(leadId)) {
    return (
      <div className="flex h-[calc(100vh-60px)] bg-white">
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-md mx-auto mt-12">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-center mb-4 text-orange-500">
                  <AlertTriangle size={48} />
                </div>
                <h2 className="text-xl font-semibold text-center">Invalid or Missing Lead ID</h2>
                <p className="text-gray-600 text-center mb-4">
                  To access the document manager, you need to provide a valid lead ID.
                </p>
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => navigate('/leads')} 
                    className="w-full"
                  >
                    Go to Leads
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    Go Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-60px)] bg-white">
      {/* Sidebar */}
      <SmartDocumentSidebar
        onSelect={handleSidebarSelect}
        activeCategory={selectedCategory}
        activeSubcategory={selectedSubcategory}
      />
      
      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedCategory === "Dropbox" ? (
          <div className="mt-4">
            {/* Welcome Message shown above DropboxUploader */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-3">
                Welcome to the Smart Document Manager
              </h2>
              <p className="text-lg font-medium">
                Here you'll be able to upload and manage documents for your mortgage application.
              </p>
              <p className="mt-1 text-base">
                <span className="font-semibold">Upload your documents and we'll organize them for you.</span>
              </p>
            </div>
            <h2 className="text-2xl font-bold text-blue-700 mb-6 flex items-center gap-3">
              <FilePlus className="h-7 w-7 mr-2 text-blue-600" />
              Dropbox: Upload Your Documents
            </h2>
            <DropboxUploader />
          </div>
        ) : selectedCategory && selectedSubcategory ? (
          <div>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                    <FolderOpenIcon className="h-6 w-6 mr-3 text-blue-600" />
                    {selectedCategory}: {selectedSubcategory}
                  </h1>
                  <p className="mt-1 text-gray-600">
                    Upload and manage documents in this category.
                  </p>
                </div>
                
                <div className="space-y-6">
                  <DocumentUploader
                    leadId={leadId}
                    category={selectedCategory}
                    subcategory={selectedSubcategory}
                    onUploadComplete={handleDocumentsUploaded}
                  />
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h2 className="text-lg font-semibold mb-4">Documents</h2>
                    <DocumentList
                      leadId={leadId}
                      category={selectedCategory}
                      subcategory={selectedSubcategory}
                      refresh={refreshDocuments}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center mb-6">
              <FilePlus className="h-7 w-7 mr-3 text-blue-600" />
              <h1 className="text-3xl font-bold text-blue-700">Smart Document Manager</h1>
            </div>
            <p className="mb-8 text-gray-700">
              Welcome to the Smart Document Manager. Here you'll be able to upload and manage documents for your mortgage application.
              <br />
              <span className="font-semibold">Select a document category from the sidebar to get started.</span>
            </p>
            <div className="border-2 border-dashed border-blue-300 rounded-xl p-10 flex items-center justify-center bg-blue-50">
              <span className="text-blue-400 text-lg">
                Select a category and subcategory from the sidebar to upload documents.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SmartDocumentManager;
