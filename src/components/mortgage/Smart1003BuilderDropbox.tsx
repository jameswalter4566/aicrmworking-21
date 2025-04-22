import React, { useState } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileUp, FileText, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const createFileURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface Smart1003BuilderDropboxProps {
  leadId: string;
  dropboxId?: string;
  returnUrl?: string;
  preserveMortgageStatus?: boolean;
  isClientPortal?: boolean;
}

const Smart1003BuilderDropbox: React.FC<Smart1003BuilderDropboxProps> = ({ 
  leadId, 
  dropboxId, 
  returnUrl,
  preserveMortgageStatus = true,
  isClientPortal = false
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processedFields, setProcessedFields] = useState<Record<string, any>>({});
  const [missingFields, setMissingFields] = useState<Array<any>>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.type === 'application/pdf' || 
        file.type === 'image/jpeg' || 
        file.type === 'image/png'
      );
      
      if (newFiles.length === 0) {
        toast({
          title: "Invalid files",
          description: "Only PDF, JPEG, and PNG files are accepted.",
          variant: "destructive"
        });
        return;
      }
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(file => 
        file.type === 'application/pdf' || 
        file.type === 'image/jpeg' || 
        file.type === 'image/png'
      );
      
      if (newFiles.length === 0) {
        toast({
          title: "Invalid files",
          description: "Only PDF, JPEG, and PNG files are accepted.",
          variant: "destructive"
        });
        return;
      }
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    if (isClientPortal && slug) {
      const token = searchParams.get('token');
      if (token) {
        navigate(`/client-portal/dashboard/${slug}?token=${token}`);
      } else {
        navigate(`/client-portal/dashboard/${slug}`);
      }
    } else {
      navigate('/client-portal');
    }
  };

  const handleProcessFiles = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to process.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      const fileUrls = await Promise.all(files.map(file => createFileURL(file)));
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsUploading(false);
      setIsProcessing(true);
      
      toast({
        title: "Processing documents",
        description: "Analyzing your documents to fill out the 1003 form...",
      });
      
      try {
        const { data, error } = await supabase.functions.invoke('smart-1003-builder', {
          body: { 
            fileUrls, 
            leadId,
            dropboxId,
            preserveMortgageStatus
          },
        });
        
        if (error) {
          throw new Error(error.message);
        }

        if (isClientPortal) {
          toast({
            title: "Documents processed successfully",
            description: "Your documents have been analyzed and your loan application has been updated.",
          });
          
          setProcessedFields(data?.processedFields || {});
          setMissingFields(data?.missingFields || []);
          setProcessingComplete(true);
          setIsProcessing(false);
          return;
        }
        
        let redirectParams = '';
        if (returnUrl) {
          redirectParams = `?origin=${encodeURIComponent(returnUrl)}`;
        } else if (dropboxId) {
          redirectParams = `?origin=${encodeURIComponent(dropboxId)}`;
        }
        
        const redirectUrl = `/mortgage/smart-1003-builder/${leadId}${redirectParams}`;
        navigate(redirectUrl);
        
        toast({
          title: "Documents processed successfully",
          description: "Your documents have been analyzed and your 1003 form is being filled out."
        });
        
      } catch (error: any) {
        console.error("Error calling edge function:", error);
        toast({
          title: "Processing failed",
          description: error?.message || "There was an error processing your documents. Please try again.",
          variant: "destructive"
        });
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error("Error processing files:", error);
      toast({
        title: "Processing failed",
        description: error?.message || "There was an error processing your documents. Please try again.",
        variant: "destructive"
      });
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  if (isClientPortal && processingComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Processing Complete
          </CardTitle>
          <CardDescription>
            We've analyzed your documents and filled out your 1003 form
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-green-800">Form Auto-Fill Complete</h3>
                <p className="text-sm text-green-700">
                  We've successfully extracted information from your documents and filled out your 1003 form.
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-3">Successfully Extracted Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(processedFields).length > 0 ? (
                  Object.entries(processedFields).map(([sectionKey, sectionData]: [string, any]) => {
                    if (!sectionData || typeof sectionData !== 'object') return null;
                    
                    const sectionTitle = {
                      borrower: 'Borrower Information',
                      employment: 'Employment & Income',
                      assets: 'Assets & Accounts',
                      liabilities: 'Liabilities & Debts',
                      property: 'Property Information'
                    }[sectionKey as keyof typeof sectionTitle];

                    if (!sectionTitle) return null;

                    return (
                      <Card key={sectionKey} className="bg-green-50">
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm">{sectionTitle}</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 px-4">
                          <div className="space-y-2">
                            {Object.entries(sectionData).length > 0 ? (
                              Object.entries(sectionData).map(([key, value]) => {
                                if (typeof value === 'object') return null;
                                return (
                                  <div key={key} className="flex items-center">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mr-2" />
                                    <p className="text-sm">
                                      <span className="font-medium">{key}: </span>
                                      <span className="text-gray-700">{value?.toString()}</span>
                                    </p>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-sm text-gray-500">No fields extracted for this section</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-2">
                    <p className="text-gray-500">No fields were successfully extracted from your documents.</p>
                  </div>
                )}
              </div>
            </div>
            
            {missingFields && missingFields.length > 0 && (
              <div>
                <h3 className="font-medium text-lg mb-3 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                  Missing Fields
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  The following fields could not be extracted from your documents and need to be filled out manually.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <Accordion type="multiple" className="space-y-2">
                    {missingFields.map((field, index) => {
                      const key = `${field.section}__${field.field}__${index}`;
                      return (
                        <AccordionItem value={key} key={key} className="border-b border-amber-200">
                          <AccordionTrigger className="hover:no-underline">
                            <span className="flex items-center text-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mr-2" />
                              <span className="text-sm font-medium">{field.label}</span>
                              <span className="text-xs text-amber-600 ml-2">
                                ({field.section})
                              </span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-3">
                            <p className="text-sm text-gray-600 pl-6">
                              This field needs to be completed in your loan application.
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </div>
            )}
            
            <div className="flex justify-center items-center gap-4 pt-4">
              <Button 
                className="w-full sm:w-auto"
                onClick={handleFinish}
              >
                Finish
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-dashed border-blue-300 hover:border-blue-500 transition-colors">
      <CardHeader className="bg-blue-50">
        <CardTitle className="text-blue-700 flex items-center gap-2">
          <FileUp className="h-5 w-5" />
          Smart 1003 Builder
        </CardTitle>
        <CardDescription>
          Upload your financial documents to automatically fill out your loan application
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        {files.length === 0 && (
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50 transition-colors"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <FileUp className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-medium text-lg mb-2">Upload Your Documents</h3>
            <p className="text-gray-500 mb-4">Drag and drop your documents here or click to browse</p>
            <Button size="sm" variant="outline" className="border-blue-300">
              Select Files
            </Button>
            <input 
              type="file" 
              id="file-upload" 
              multiple 
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" 
              className="hidden"
              onChange={handleFileInputChange}
            />
            <p className="text-xs text-gray-400 mt-4">
              Supported formats: PDF, JPEG, PNG
            </p>
          </div>
        )}
        
        {files.length > 0 && (
          <div className="p-4">
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-md">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => handleRemoveFile(index)}
                    disabled={isUploading || isProcessing}
                  >
                    &times;
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-sm"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploading || isProcessing}
              >
                <FileUp className="h-4 w-4 mr-1" />
                Add More Files
              </Button>
              
              <p className="text-sm text-gray-500">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            
            {isUploading && (
              <div className="mb-4">
                <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-center mt-1 text-gray-500">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
            
            <Button 
              className="w-full" 
              onClick={handleProcessFiles}
              disabled={isUploading || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Documents...
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Process Documents & Build 1003
                </>
              )}
            </Button>
            
            <p className="text-xs text-center mt-2 text-gray-500">
              Your documents will be securely processed to auto-fill your 1003 form
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Smart1003BuilderDropbox;
