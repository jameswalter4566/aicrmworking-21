
import React, { useState, useCallback } from "react";
import { Upload, CheckCircle, AlertCircle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface IntelligentFileUploadProps {
  onImportComplete: (importedLeads: any[]) => void;
}

const IntelligentFileUpload: React.FC<IntelligentFileUploadProps> = ({ 
  onImportComplete 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fileInfo, setFileInfo] = useState<{name: string, size: string} | null>(null);
  const [processingStage, setProcessingStage] = useState<'reading' | 'analyzing' | 'mapping'>('reading');

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const processFile = (file: File) => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType !== 'csv' && fileType !== 'xls' && fileType !== 'xlsx') {
      toast.error("Only CSV and Excel files are supported");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingStage('reading');
    setFileInfo({
      name: file.name,
      size: formatFileSize(file.size)
    });

    // Simulate initial reading progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 40) {
          clearInterval(progressInterval);
        }
        return newProgress;
      });
    }, 150);

    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) throw new Error("Failed to read file content");
        
        if (fileType === 'csv') {
          clearInterval(progressInterval);
          setProgress(40);
          setProcessingStage('analyzing');
          
          // Parse CSV to get headers and sample data
          const rows = content.split("\n");
          if (rows.length < 2) throw new Error("File has insufficient data");
          
          const headers = rows[0].split(",").map(h => h.trim());
          
          // Get sample data for AI analysis
          const sampleData = [];
          for (let i = 1; i < Math.min(6, rows.length); i++) {
            if (!rows[i].trim()) continue;
            const columns = rows[i].split(",").map(col => col.trim());
            sampleData.push(columns);
          }
          
          // Update progress to show we're analyzing
          setProgress(50);
          
          try {
            // Call OpenAI via Supabase Edge Function
            setProcessingStage('analyzing');
            const aiResponse = await supabase.functions.invoke('analyze-csv-data', {
              body: { headers, columnData: sampleData }
            });
            
            if (aiResponse.error) {
              throw new Error(`AI analysis failed: ${aiResponse.error.message}`);
            }
            
            // Update progress to show we're mapping
            setProgress(70);
            setProcessingStage('mapping');
            
            const headerMap = aiResponse.data.mapping || {};
            
            // Fallback to traditional mapping if AI doesn't find matches
            if (Object.keys(headerMap).length < 2) {
              // Use traditional mapping as fallback
              const fieldMappings = {
                firstName: ["first name", "firstname", "first", "given name", "givenname", "name"],
                lastName: ["last name", "lastname", "last", "surname", "family name", "familyname"],
                email: ["email", "e-mail", "emailaddress", "email address", "e-mail address"],
                mailingAddress: ["mailing address", "mailingaddress", "address", "mailing", "postal address"],
                propertyAddress: ["property address", "propertyaddress", "property", "real estate address"],
                phone1: ["phone", "phone1", "primary phone", "telephone", "mobile", "cell", "phone number"],
                phone2: ["phone2", "secondary phone", "other phone", "alternate phone", "work phone"],
              };
              
              Object.entries(fieldMappings).forEach(([fieldName, variations]) => {
                if (headerMap[fieldName] === undefined) {
                  const matchIndex = headers.findIndex(header => 
                    variations.some(variation => 
                      header.toLowerCase().includes(variation) || 
                      variation.includes(header.toLowerCase())
                    )
                  );
                  
                  if (matchIndex >= 0) {
                    headerMap[fieldName] = matchIndex;
                  }
                }
              });
            }
            
            // Fallback to position-based mapping for essential fields if needed
            if (headerMap.firstName === undefined && headers.length > 0) headerMap.firstName = 0;
            if (headerMap.lastName === undefined && headers.length > 1) headerMap.lastName = 1;
            if (headerMap.email === undefined && headers.length > 2) headerMap.email = 2;
            
            // Process the data with the AI-enhanced mapping
            const importedLeads = [];
            for (let i = 1; i < rows.length; i++) {
              if (!rows[i].trim()) continue;
              
              const columns = rows[i].split(",").map(col => col.trim());
              if (columns.length < Math.min(3, headers.length)) continue;
              
              const newLead = {
                id: Date.now() + i, // Unique ID
                firstName: headerMap.firstName >= 0 && headerMap.firstName < columns.length ? columns[headerMap.firstName] : "",
                lastName: headerMap.lastName >= 0 && headerMap.lastName < columns.length ? columns[headerMap.lastName] : "",
                email: headerMap.email >= 0 && headerMap.email < columns.length ? columns[headerMap.email] : "",
                mailingAddress: headerMap.mailingAddress >= 0 && headerMap.mailingAddress < columns.length ? columns[headerMap.mailingAddress] : "",
                propertyAddress: headerMap.propertyAddress >= 0 && headerMap.propertyAddress < columns.length ? columns[headerMap.propertyAddress] : "",
                phone1: headerMap.phone1 >= 0 && headerMap.phone1 < columns.length ? columns[headerMap.phone1] : "",
                phone2: headerMap.phone2 >= 0 && headerMap.phone2 < columns.length ? columns[headerMap.phone2] : "",
                stage: "Lead",
                assigned: "",
                avatar: "",
                disposition: "Not Contacted",
              };
              
              // Require at least a first name or email to be valid
              if (newLead.firstName || newLead.email) {
                importedLeads.push(newLead);
              }
            }
            
            // Complete the progress bar
            setProgress(100);
            
            if (importedLeads.length > 0) {
              setUploadStatus('success');
              toast.success(`Successfully mapped ${importedLeads.length} leads with AI assistance`);
              onImportComplete(importedLeads);
            } else {
              setUploadStatus('error');
              toast.error("No valid leads found in the file");
            }
            
          } catch (aiError) {
            console.error("AI processing error:", aiError);
            toast.error(`AI analysis failed: ${aiError.message}`);
            
            // Fallback to traditional processing
            const importedLeads = processCSVData(content);
            
            if (importedLeads.length > 0) {
              setProgress(100);
              setUploadStatus('success');
              toast.success(`Successfully mapped ${importedLeads.length} leads using standard mapping`);
              onImportComplete(importedLeads);
            } else {
              setUploadStatus('error');
              toast.error("No valid leads found in the file");
            }
          }
          
        } else {
          toast.error("Excel file processing is not implemented in this demo");
          setUploadStatus('error');
          clearInterval(progressInterval);
          setProgress(0);
        }
      } catch (error) {
        clearInterval(progressInterval);
        setProgress(0);
        setUploadStatus('error');
        toast.error(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.onerror = () => {
      clearInterval(progressInterval);
      setProgress(0);
      setUploadStatus('error');
      setIsProcessing(false);
      toast.error("Error reading file");
    };

    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    processFile(files[0]);
  }, []);

  const processCSVData = (content: string) => {
    try {
      const rows = content.split("\n");
      if (rows.length < 2) throw new Error("File has insufficient data");
      
      const headers = rows[0].split(",").map(h => h.trim());
      
      // Intelligent field mapping with common variations
      const fieldMappings = {
        firstName: ["first name", "firstname", "first", "given name", "givenname", "name"],
        lastName: ["last name", "lastname", "last", "surname", "family name", "familyname"],
        email: ["email", "e-mail", "emailaddress", "email address", "e-mail address"],
        mailingAddress: ["mailing address", "mailingaddress", "address", "mailing", "postal address"],
        propertyAddress: ["property address", "propertyaddress", "property", "real estate address"],
        phone1: ["phone", "phone1", "primary phone", "telephone", "mobile", "cell", "phone number"],
        phone2: ["phone2", "secondary phone", "other phone", "alternate phone", "work phone"],
      };
      
      // AI-like intelligent mapping
      const headerMap: Record<string, number> = {};
      
      Object.entries(fieldMappings).forEach(([fieldName, variations]) => {
        // Find the best matching header
        const matchIndex = headers.findIndex(header => 
          variations.some(variation => 
            header.toLowerCase().includes(variation) || 
            variation.includes(header.toLowerCase())
          )
        );
        
        if (matchIndex >= 0) {
          headerMap[fieldName] = matchIndex;
        }
      });
      
      // Fallback to position-based mapping if needed fields missing
      if (headerMap.firstName === undefined && headers.length > 0) headerMap.firstName = 0;
      if (headerMap.lastName === undefined && headers.length > 1) headerMap.lastName = 1;
      if (headerMap.email === undefined && headers.length > 2) headerMap.email = 2;
      
      const importedLeads = [];
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        const columns = rows[i].split(",").map(col => col.trim());
        if (columns.length < Math.min(3, headers.length)) continue;
        
        const newLead = {
          id: Date.now() + i, // Unique ID
          firstName: headerMap.firstName >= 0 && headerMap.firstName < columns.length ? columns[headerMap.firstName] : "",
          lastName: headerMap.lastName >= 0 && headerMap.lastName < columns.length ? columns[headerMap.lastName] : "",
          email: headerMap.email >= 0 && headerMap.email < columns.length ? columns[headerMap.email] : "",
          mailingAddress: headerMap.mailingAddress >= 0 && headerMap.mailingAddress < columns.length ? columns[headerMap.mailingAddress] : "",
          propertyAddress: headerMap.propertyAddress >= 0 && headerMap.propertyAddress < columns.length ? columns[headerMap.propertyAddress] : "",
          phone1: headerMap.phone1 >= 0 && headerMap.phone1 < columns.length ? columns[headerMap.phone1] : "",
          phone2: headerMap.phone2 >= 0 && headerMap.phone2 < columns.length ? columns[headerMap.phone2] : "",
          stage: "Lead",
          assigned: "",
          avatar: "",
          disposition: "Not Contacted",
        };
        
        // Require at least a first name or email to be valid
        if (newLead.firstName || newLead.email) {
          importedLeads.push(newLead);
        }
      }
      
      return importedLeads;
    } catch (error) {
      console.error("CSV parsing error:", error);
      throw error;
    }
  };

  const getProcessingStageText = () => {
    switch (processingStage) {
      case 'reading':
        return "Reading your file...";
      case 'analyzing':
        return "AI is analyzing your data structure...";
      case 'mapping':
        return "Mapping columns to the right fields...";
      default:
        return "Processing your file...";
    }
  };

  return (
    <div className="upload-container">
      {isProcessing ? (
        <div className="space-y-4 p-6 text-center">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Processing your file</h3>
            <p className="text-sm text-gray-500 mt-1">
              {fileInfo?.name} ({fileInfo?.size})
            </p>
          </div>
          <Progress value={progress} className="w-full h-2" />
          <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
            {processingStage === 'analyzing' && <Brain className="h-4 w-4 text-blue-500 animate-pulse" />}
            {getProcessingStageText()}
          </p>
        </div>
      ) : uploadStatus === 'success' ? (
        <div className="p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-green-700 mb-2">Import Successful!</h3>
          <p className="text-sm text-gray-600">
            Your leads have been successfully imported and are ready to use.
          </p>
        </div>
      ) : uploadStatus === 'error' ? (
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-red-700 mb-2">Import Failed</h3>
          <p className="text-sm text-gray-600 mb-4">
            There was an error processing your file. Please try again with a valid CSV file.
          </p>
          <div 
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
            onClick={() => document.getElementById('file-upload')?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Try again with a different file</p>
            <input
              id="file-upload"
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      ) : (
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">Drag and drop your file here</h3>
          <p className="text-sm text-gray-500 mb-4">
            or <span className="text-blue-500">browse</span> to select a file
          </p>
          <p className="text-xs text-gray-400">
            Supported file formats: .CSV, .XLS, .XLSX
          </p>
          <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              AI-Powered Import
            </h4>
            <p className="text-xs text-gray-500">
              Our AI will automatically analyze your file and intelligently map columns to the correct fields, 
              even for complex or irregularly formatted data.
            </p>
          </div>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xls,.xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
};

export default IntelligentFileUpload;
