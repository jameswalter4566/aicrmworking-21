import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { 
  Home, 
  FileText, 
  AlertTriangle, 
  MessageCircle,
  Upload,
  CheckCircle,
  Loader2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PDFDropZone from "@/components/mortgage/PDFDropZone";
import { ClientPortalConditions } from "@/components/mortgage/ClientPortalConditions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ClientPortalLoanProgress from "@/components/mortgage/ClientPortalLoanProgress";
import LoanProgressTracker from "@/components/mortgage/LoanProgressTracker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PersonalInfoPlaceholder from "@/components/mortgage/client-portal/PersonalInfoPlaceholder";
import EmploymentIncomeSection from "@/components/mortgage/client-portal/EmploymentIncomeSection";
import ClientPortalAssetForm from "@/components/mortgage/client-portal/ClientPortalAssetForm";
import RealEstateOwnedSection from "@/components/mortgage/client-portal/RealEstateOwnedSection";

const progressSteps = [
  "Application Created",
  "Disclosures Sent",
  "Disclosures Signed",
  "Submitted",
  "Processing",
  "Approved",
  "CD Generated",
  "CD Signed",
  "CTC",
  "Docs Out",
  "Closing",
  "FUNDED"
];

interface ClientData {
  leadId?: string | number;
  name: string;
  email: string;
  phone: string;
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  monthlyPayment: number;
  currentMonthlyPayment: number;
  savingsPerMonth: number;
  propertyAddress: string;
  propertyValue: number;
  loanOfficer: {
    name: string;
    phone: string;
    email: string;
    photo: string;
  };
  loanProgress: number; // 0-11 based on progress steps
  conditions: Array<{
    id: number;
    title: string;
    completed: boolean;
    urgent: boolean;
  }>;
  disclosures: Array<{
    id: number;
    title: string;
    completed: boolean;
    dueDate: string;
  }>;
}

const ClientPortalNavbar = ({ clientData, activeTab, setActiveTab }: { 
  clientData: ClientData;
  activeTab: string; 
  setActiveTab: (tab: string) => void 
}) => {
  return (
    <div className="bg-mortgage-darkPurple text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-col items-center">
        <h1 className="text-xl font-bold mb-2">Your Mortgage Portal</h1>
        <div className="w-full mb-4">
          {clientData.leadId ? (
            <LoanProgressTracker leadId={clientData.leadId} displayStyle="compact" />
          ) : (
            <Progress 
              value={((clientData.loanProgress + 1) / progressSteps.length) * 100} 
              className="h-2.5 bg-gray-200" 
            />
          )}
          
          <div className="mt-1 text-xs text-center text-mortgage-lightPurple">
            <span className="font-semibold">{progressSteps[clientData.loanProgress]}</span>
          </div>
        </div>
        
        <div className="flex justify-center space-x-6 mt-2">
          <button 
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center ${activeTab === "home" ? "text-white" : "text-gray-300"}`}
          >
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("conditions")}
            className={`flex flex-col items-center ${activeTab === "conditions" ? "text-white" : "text-gray-300"}`}
          >
            <FileText size={20} />
            <span className="text-xs mt-1">Conditions</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("attention")}
            className={`flex flex-col items-center ${activeTab === "attention" ? "text-white" : "text-gray-300"} relative`}
          >
            <AlertTriangle size={20} />
            <span className="text-xs mt-1">Attention</span>
            {clientData.conditions.filter(c => c.urgent && !c.completed).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {clientData.conditions.filter(c => c.urgent && !c.completed).length}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab("support")}
            className={`flex flex-col items-center ${activeTab === "support" ? "text-white" : "text-gray-300"}`}
          >
            <MessageCircle size={20} />
            <span className="text-xs mt-1">Support</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const HomeTab = ({ clientData }: { clientData: ClientData }) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  const handleFileUpload = async (file: File) => {
    try {
      console.log("File uploaded:", file.name);
      toast.success("Document uploaded successfully", {
        description: "Our AI is now processing your document."
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Upload failed", {
        description: "There was an error uploading your document. Please try again."
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="p-6 bg-sky-100/80 rounded-xl shadow-lg transition-transform duration-200 hover:scale-105">
          <h3 className="font-medium text-sky-900 mb-4">New Loan Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sky-900">
              <span className="text-sky-700">Loan Amount:</span>
              <span className="font-medium">${clientData.loanAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sky-900">
              <span className="text-sky-700">Interest Rate:</span>
              <span className="font-medium">{clientData.interestRate}%</span>
            </div>
            <div className="flex justify-between text-sky-900">
              <span className="text-sky-700">Term:</span>
              <span className="font-medium">{clientData.loanTerm} years</span>
            </div>
            <div className="flex justify-between text-sky-900">
              <span className="text-sky-700">Monthly Payment:</span>
              <span className="font-medium">${clientData.monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-green-100/80 rounded-xl shadow-lg transition-transform duration-200 hover:scale-105">
          <h3 className="font-medium text-green-900 mb-4">Your Savings</h3>
          <div className="text-center">
            <div className="mb-2">
              <div className="text-green-800 mb-1">Monthly Savings</div>
              <div className="text-3xl font-bold text-green-900">
                ${clientData.savingsPerMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
            </div>
            <div className="text-sm text-green-700">
              (${(clientData.savingsPerMonth * 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} per year)
            </div>
          </div>
        </div>
      </div>

      <Collapsible open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <div className="flex justify-center mb-4">
          <CollapsibleTrigger asChild>
            <Button 
              className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
              size="lg"
            >
              {isUploadOpen ? (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Close Upload Center
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Start Uploading Documents
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="space-y-4">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl text-mortgage-darkPurple flex items-center gap-2">
                Document Upload Center
                <FileText className="h-5 w-5 text-mortgage-purple" />
              </CardTitle>
              <CardDescription>
                Upload your requested documents securely. Our AI technology will process and submit them to underwriting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="border rounded-lg p-4 bg-blue-50/50">
                  <h4 className="font-medium text-blue-800 mb-2">Required Documents</h4>
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>Last 2 months bank statements</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-blue-600">
                        Upload
                      </Button>
                    </li>
                    <li className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>Most recent pay stubs (30 days)</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-blue-600">
                        Upload
                      </Button>
                    </li>
                    <li className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>W-2s (last 2 years)</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-blue-600">
                        Upload
                      </Button>
                    </li>
                    <li className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>Tax Returns (last 2 years)</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-blue-600">
                        Upload
                      </Button>
                    </li>
                  </ul>
                </div>
                
                <PDFDropZone 
                  onFileAccepted={handleFileUpload}
                  className="border-2 border-dashed border-blue-200 bg-blue-50/30 hover:bg-blue-50"
                />

                <div className="text-center text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">AI-Powered Document Processing</span>
                  </div>
                  Our advanced AI will automatically analyze your documents, verify the information,
                  and submit them directly to underwriting for faster processing.
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-mortgage-darkPurple">Recent Alerts</CardTitle>
          <CardDescription>Your most recent important notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-3 text-gray-500">
            No urgent alerts at this time
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="transition-transform duration-200 hover:scale-105 bg-sky-100/80">
          <CardHeader>
            <CardTitle className="text-lg text-mortgage-darkPurple">Property Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-sm text-gray-600">Address</span>
                <p className="font-medium">{clientData.propertyAddress}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-600">Estimated Value</span>
                <p className="font-medium">${clientData.propertyValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-transform duration-200 hover:scale-105 bg-sky-100/80">
          <CardHeader>
            <CardTitle className="text-lg text-mortgage-darkPurple">Loan Officer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden">
                <img src={clientData.loanOfficer.photo} alt="Loan Officer" className="h-full w-full object-cover" />
              </div>
              <div>
                <h3 className="font-medium">{clientData.loanOfficer.name}</h3>
                <p className="text-sm text-gray-600">{clientData.loanOfficer.phone}</p>
                <p className="text-sm text-gray-600">{clientData.loanOfficer.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ConditionsTab = ({ clientData, refreshData }: { clientData: ClientData, refreshData: () => void }) => {
  const handleFileUpload = async (file: File) => {
    try {
      console.log("File uploaded:", file.name);
      
      toast.success("Document uploaded successfully", {
        description: `${file.name} has been uploaded and will be reviewed.`
      });
      
      setTimeout(refreshData, 1000);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Upload failed", {
        description: "There was an error uploading your document. Please try again."
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-mortgage-darkPurple">Remaining Conditions</CardTitle>
          <CardDescription>Documents and information needed to complete your loan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientData.conditions.map(condition => (
              <div 
                key={condition.id} 
                className={`p-4 rounded-lg border flex items-start justify-between ${
                  condition.completed 
                    ? 'bg-green-50 border-green-200' 
                    : condition.urgent 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div>
                    {condition.completed ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : (
                      <FileText size={20} className={condition.urgent ? "text-red-500" : "text-gray-400"} />
                    )}
                  </div>
                  <div>
                    <h4 className={`font-medium ${condition.completed ? 'line-through text-green-800' : condition.urgent ? 'text-red-800' : 'text-gray-800'}`}>
                      {condition.title}
                    </h4>
                    {condition.urgent && !condition.completed && (
                      <Badge className="mt-1 bg-red-500">Urgent</Badge>
                    )}
                  </div>
                </div>
                
                {!condition.completed && (
                  <Button size="sm" className="bg-mortgage-purple hover:bg-mortgage-darkPurple">
                    <Upload size={16} className="mr-1" /> Upload
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-mortgage-darkPurple">Upload Documents</CardTitle>
          <CardDescription>Securely upload any required documents here</CardDescription>
        </CardHeader>
        <CardContent>
          <PDFDropZone onFileAccepted={handleFileUpload} className="w-full" />
        </CardContent>
      </Card>
    </div>
  );
};

const AttentionTab = ({ clientData }: { clientData: ClientData }) => {
  const urgentConditions = clientData.conditions.filter(c => c.urgent && !c.completed);
  const pendingDisclosures = clientData.disclosures.filter(d => !d.completed);
  
  return (
    <div className="space-y-6">
      {(urgentConditions.length === 0 && pendingDisclosures.length === 0) ? (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center">
            <CheckCircle size={48} className="text-green-500 mb-4" />
            <h3 className="text-xl font-medium text-center">No urgent items at this time</h3>
            <p className="text-gray-500 text-center mt-2">Your loan process is moving along nicely!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {urgentConditions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-mortgage-darkPurple">Urgent Conditions</CardTitle>
                <CardDescription>These items are delaying your loan process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {urgentConditions.map(condition => (
                    <div key={condition.id} className="p-4 rounded-lg border border-red-200 bg-red-50">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle size={20} className="text-red-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-800">{condition.title}</h4>
                          <p className="text-sm text-red-600 mt-1">
                            Please upload this document as soon as possible to avoid delays.
                          </p>
                          <Button size="sm" className="mt-3 bg-mortgage-purple hover:bg-mortgage-darkPurple">
                            <Upload size={16} className="mr-1" /> Upload Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {pendingDisclosures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-mortgage-darkPurple">Required Signatures</CardTitle>
                <CardDescription>Documents that need your signature</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingDisclosures.map(disclosure => (
                    <div key={disclosure.id} className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                      <div className="flex items-start space-x-3">
                        <FileText size={20} className="text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800">{disclosure.title}</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Due: {new Date(disclosure.dueDate).toLocaleDateString()}
                          </p>
                          <Button size="sm" className="mt-3 bg-mortgage-purple hover:bg-mortgage-darkPurple">
                            Review & Sign
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

const SupportTab = () => {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    { sender: "system", text: "Welcome to 24/7 Loan Support! How can I assist you with your loan today?" }
  ]);
  
  const sendMessage = () => {
    if (!message.trim()) return;
    
    setChat([...chat, { sender: "user", text: message }]);
    setMessage("");
    
    setTimeout(() => {
      let response = "Thank you for your message. A mortgage specialist will respond shortly. For urgent matters, please call your loan officer directly.";
      
      if (message.toLowerCase().includes("status") || message.toLowerCase().includes("progress")) {
        response = "Your loan is currently in the Processing stage. It's progressing as expected!";
      } else if (message.toLowerCase().includes("document") || message.toLowerCase().includes("upload")) {
        response = "You can upload documents in the Conditions tab. If you're having trouble, we can assist you in uploading them.";
      } else if (message.toLowerCase().includes("payment") || message.toLowerCase().includes("monthly")) {
        response = "Your estimated monthly payment will be $1,621.39 based on your current loan terms.";
      } else if (message.toLowerCase().includes("closing") || message.toLowerCase().includes("when")) {
        response = "Based on your current progress, we're targeting to close your loan in approximately 2-3 weeks.";
      }
      
      setChat([...chat, { sender: "user", text: message }, { sender: "system", text: response }]);
    }, 1000);
  };
  
  return (
    <div className="space-y-6">
      <Card className="flex flex-col h-[calc(100vh-300px)] min-h-[500px]">
        <CardHeader>
          <CardTitle className="text-xl text-mortgage-darkPurple">24/7 Support</CardTitle>
          <CardDescription>Get answers about your loan anytime</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          <div className="space-y-4">
            {chat.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.sender === 'user' 
                      ? 'bg-mortgage-purple text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="border-t p-4">
          <div className="flex w-full space-x-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mortgage-purple"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} className="bg-mortgage-purple hover:bg-mortgage-darkPurple">
              <MessageCircle size={18} />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

const mockClientData: ClientData = {
  name: "John Smith",
  email: "john.smith@example.com",
  phone: "(555) 123-4567",
  loanAmount: 320000,
  interestRate: 4.5,
  loanTerm: 30,
  monthlyPayment: 1621.39,
  currentMonthlyPayment: 2100.00,
  savingsPerMonth: 478.61,
  propertyAddress: "123 Main St, Anytown, CA 12345",
  propertyValue: 400000,
  loanOfficer: {
    name: "Jane Doe",
    phone: "(555) 987-6543",
    email: "jane.doe@mortgage.com",
    photo: "https://randomuser.me/api/portraits/women/44.jpg"
  },
  loanProgress: 6,
  conditions: [
    { id: 1, title: "Most recent pay stub", completed: false, urgent: true },
    { id: 2, title: "Bank statements (last 2 months)", completed: false, urgent: true },
    { id: 3, title: "Tax returns (last 2 years)", completed: true, urgent: false },
    { id: 4, title: "Proof of insurance", completed: false, urgent: false },
    { id: 5, title: "Photo ID", completed: true, urgent: false },
    { id: 6, title: "Gift letter", completed: false, urgent: true },
  ],
  disclosures: [
    { id: 1, title: "Initial Disclosure Package", completed: true, dueDate: "2023-05-15" },
    { id: 2, title: "Intent to Proceed", completed: true, dueDate: "2023-05-17" },
    { id: 3, title: "Closing Disclosure", completed: false, dueDate: "2023-06-01" },
  ],
  leadId: "12345"
};

import { SidebarProvider } from "@/components/ui/sidebar";
import ClientPortalSidebar from "@/components/mortgage/ClientPortalSidebar";

const ClientPortal = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [activeTab, setActiveTab] = useState("home");
  const [activeAppSection, setActiveAppSection] = useState<string | null>("personal-info");

  useEffect(() => {
    const verifyAccess = async () => {
      if (!slug || !token) {
        setLoading(false);
        return;
      }
      
      try {
        console.log("Verifying portal access for slug:", slug);
        const { data: portalData, error: portalError } = await supabase
          .from('client_portal_access')
          .select('*')
          .eq('portal_slug', slug)
          .eq('access_token', token)
          .single();
        
        if (portalError || !portalData) {
          console.error("Portal access error:", portalError);
          setLoading(false);
          return;
        }

        console.log("Portal access verified, updating last accessed");
        await supabase
          .from('client_portal_access')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('id', portalData.id);
        
        const clientDataWithLeadId = {
          ...mockClientData,
          leadId: portalData.lead_id
        };
        console.log("Setting client data with leadId:", clientDataWithLeadId);
        setClientData(clientDataWithLeadId);
        setAuthenticated(true);
      } catch (error) {
        console.error("Error verifying access:", error);
      } finally {
        setLoading(false);
      }
    };
    
    verifyAccess();
  }, [slug, token]);

  const refreshData = async () => {
    if (clientData) {
      const updatedConditions = [...clientData.conditions];
      const urgentIndex = updatedConditions.findIndex(c => c.urgent && !c.completed);
      if (urgentIndex !== -1) {
        updatedConditions[urgentIndex].completed = true;
        setClientData({
          ...clientData,
          conditions: updatedConditions
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 size={48} className="animate-spin text-mortgage-purple mb-4" />
          <p className="text-lg font-medium text-gray-700">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!slug || slug === "login" || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-mortgage-purple/20 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-mortgage-darkPurple">Client Portal Access</CardTitle>
            <CardDescription>Please use the link provided in your email to access your portal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center p-4">
              <p className="mb-4">If you have received a portal access link, please use it to access your loan information.</p>
              <p className="text-sm text-gray-500">If you need assistance, contact your loan officer.</p>
            </div>
          </CardContent>
          <CardFooter className="justify-center">
            <Button onClick={() => navigate('/client-portal-landing')} className="bg-mortgage-purple hover:bg-mortgage-darkPurple">
              Back to Portal Landing
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!authenticated || !clientData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-100 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">Access Denied</CardTitle>
            <CardDescription>Unable to verify your portal access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center p-4">
              <p className="mb-4">The portal link you used is invalid or has expired.</p>
              <p className="text-sm text-gray-500">Please contact your loan officer for a new access link.</p>
            </div>
          </CardContent>
          <CardFooter className="justify-center">
            <Button onClick={() => navigate('/client-portal-landing')} className="bg-mortgage-purple hover:bg-mortgage-darkPurple">
              Back to Portal Landing
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50/70">
        <ClientPortalSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          urgentCount={clientData?.conditions.filter(c => c.urgent && !c.completed).length || 0}
          activeAppSection={activeAppSection!}
          setActiveAppSection={setActiveAppSection}
        />
        
        <main className="flex-1 px-8 pt-8 ml-4">
          {clientData?.leadId && (
            <div className="w-full mb-6">
              <LoanProgressTracker 
                leadId={clientData.leadId} 
                className=""
              />
            </div>
          )}
          
          <div>
            {activeTab === "application" && activeAppSection === "personal-info" && (
              <PersonalInfoPlaceholder />
            )}
            {activeTab === "application" && activeAppSection === "employment-income" && (
              <EmploymentIncomeSection />
            )}
            {activeTab === "application" && activeAppSection === "assets" && (
              <ClientPortalAssetForm
                isEditable={true}
              />
            )}
            {activeTab === "application" && activeAppSection === "liabilities-real-estate-owned" && (
              <RealEstateOwnedSection />
            )}
            {activeTab === "home" && <HomeTab clientData={clientData} />}
            {activeTab === "conditions" && clientData?.leadId && (
              <ClientPortalConditions leadId={clientData.leadId} refreshData={refreshData} />
            )}
            {activeTab === "attention" && <AttentionTab clientData={clientData} />}
            {activeTab === "support" && <SupportTab />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ClientPortal;
