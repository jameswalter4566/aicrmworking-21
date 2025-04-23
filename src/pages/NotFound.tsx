
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, FileText } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoBack = () => {
    navigate(-1); // Go back to the previous page
  };

  const handleGoHome = () => {
    navigate('/'); // Go to home page
  };

  const handleGoToDocuments = () => {
    navigate('/smart-document-manager'); // Go to document manager
  };

  const isDocumentsRelated = location.pathname.includes('document') ||
                             location.pathname.includes('smart-document');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="text-2xl font-semibold mb-2 text-gray-800">Oops! Page not found</p>
        <p className="text-gray-600 mb-6">
          {isDocumentsRelated 
            ? "Unable to find documents for this lead. The lead ID may be invalid or missing."
            : "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleGoBack}
          >
            <ArrowLeft size={16} />
            Go Back
          </Button>
          
          <Button 
            className="flex items-center gap-2"
            onClick={handleGoHome}
          >
            <Home size={16} />
            Return to Home
          </Button>
          
          {isDocumentsRelated && (
            <Button 
              variant="secondary"
              className="flex items-center gap-2"
              onClick={handleGoToDocuments}
            >
              <FileText size={16} />
              Document Manager
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
