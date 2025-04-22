
import React, { useState } from "react";
import { FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartDocumentSidebar from "@/components/smart-documents/SmartDocumentSidebar";

const SmartDocumentManager: React.FC = () => {
  // State for selected doc (for later: can show preview/detail panel etc)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>();

  return (
    <div className="flex h-[calc(100vh-60px)] bg-white">
      {/* Sidebar */}
      <SmartDocumentSidebar
        onSelect={(cat, sub) => {
          setSelectedCategory(cat);
          setSelectedSubcategory(sub);
        }}
        activeCategory={selectedCategory}
        activeSubcategory={selectedSubcategory}
      />
      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto p-10">
        <div className="flex items-center mb-6">
          <FilePlus className="h-7 w-7 mr-3 text-blue-600" />
          <h1 className="text-3xl font-bold text-blue-700">Smart Document Manager</h1>
        </div>
        <p className="mb-8 text-gray-700">
          Welcome to the Smart Document Manager. Here you’ll be able to upload and manage documents, and soon, our AI will automatically analyze and categorize your PDFs so you can easily find what you need.
          <br />
          <span className="font-semibold">Advanced lead-based and user-only access controls will be enforced here.</span>
        </p>
        <div className="border-2 border-dashed border-blue-300 rounded-xl p-10 flex items-center justify-center bg-blue-50">
          <span className="text-blue-400 text-lg">
            {selectedCategory && selectedSubcategory ? (
              <>Selected: <span className="font-bold">{selectedSubcategory}</span> in <span className="font-bold">{selectedCategory}</span></>
            ) : (
              <>Document storage & analysis coming soon…</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SmartDocumentManager;
