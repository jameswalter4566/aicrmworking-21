
import React, { useState, useEffect } from "react";
import { FilePlus, FolderOpenIcon, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartDocumentSidebar from "@/components/smart-documents/SmartDocumentSidebar";
import DropboxUploader from "@/components/smart-documents/DropboxUploader";
import DocumentUploader from "@/components/smart-documents/DocumentUploader";
import DocumentList from "@/components/smart-documents/DocumentList";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const SmartDocumentManager: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>();
  const [refreshDocuments, setRefreshDocuments] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [validLeadId, setValidLeadId] = useState<string | null>(null);
  const { id: routeLeadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryLeadId = searchParams.get('leadId');
  
  useEffect(() => {
    async function validateAndGetLead() {
      setIsLoading(true);
      
      try {
        // Try to get a valid lead ID from our edge function
        // First check route param, then query param
        const leadIdToCheck = routeLeadId || queryLeadId;
        
        // If nothing found, try to get by email or name
        const paramsToSend: any = {};
        
        if (leadIdToCheck) {
          paramsToSend.leadId = leadIdToCheck;
        } else {
          // We could add search by email/name here if available
          const email = searchParams.get('email');
          const name = searchParams.get('name');
          
          if (email) paramsToSend.email = email;
          if (name) paramsToSend.name = name;
        }
        
        console.log("Checking lead with params:", paramsToSend);
        
        const { data, error } = await supabase.functions.invoke('get-lead-for-document-manager', {
          body: paramsToSend
        });
        
        console.log("Lead validation response:", data, error);
        
        if (error) {
          console.error("Error validating lead:", error);
          toast.error("Failed to validate lead");
          setValidLeadId(null);
        } else if (data && data.success && data.data?.leadId) {
          // We got a valid lead ID
          setValidLeadId(data.data.leadId);
          
          if (routeLeadId !== data.data.leadId) {
            // If the route ID is different from the valid one, update the URL
            navigate(`/smart-document-manager/${data.data.leadId}`, { replace: true });
          }
          
          // Show a confirmation message with the lead name if available
          if (data.data.firstName || data.data.lastName) {
            toast.success(`Documents for ${data.data.firstName || ''} ${data.data.lastName || ''}`);
          } else {
            toast.success("Valid lead ID found and connected");
          }
        } else {
          // No valid lead ID found
          setValidLeadId(null);
          toast.error(data?.error || "No valid lead found. Please select a lead first.");
        }
      } catch (err) {
        console.error("Error fetching lead:", err);
        toast.error("Failed to fetch lead information");
        setValidLeadId(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    validateAndGetLead();
  }, [routeLeadId, queryLeadId, navigate, searchParams]);
  
  // Handle when documents have been uploaded to trigger a refresh
  const handleDocumentsUploaded = () => {
    setRefreshDocuments(prev => !prev);
  };

  const handleSidebarSelect = (cat: string, sub: string | null) => {
    setSelectedCategory(cat);
    setSelectedSubcategory(sub ?? undefined);
  };

  // If we're still loading, show a spinner
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-60px)] bg-white">
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
          <h3 className="text-xl font-medium text-gray-700">Loading document manager...</h3>
        </div>
      </div>
    );
  }

  // If no valid lead ID was found, show an error/search page
  if (!validLeadId) {
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
            <DropboxUploader leadId={validLeadId} />
          </div>
        ) : selectedCategory && selectedSubcategory ? (
          <div>
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
                leadId={validLeadId}
                category={selectedCategory}
                subcategory={selectedSubcategory}
                onUploadComplete={handleDocumentsUploaded}
              />
              
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Documents</h2>
                <DocumentList
                  leadId={validLeadId}
                  category={selectedCategory}
                  subcategory={selectedSubcategory}
                  refresh={refreshDocuments}
                />
              </div>
            </div>
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
