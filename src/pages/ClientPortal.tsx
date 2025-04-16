
import React, { useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Home, 
  FileText, 
  AlertTriangle, 
  MessageCircle,
  Upload,
  CheckCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PDFDropZone from "@/components/mortgage/PDFDropZone";

// Mock data - in a real implementation, this would come from an API
const mockClientData = {
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
  loanProgress: 6, // 0-11 based on progress steps
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
  ]
};

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

const ClientPortalNavbar = ({ activeTab, setActiveTab }: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void 
}) => {
  return (
    <div className="bg-mortgage-darkPurple text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-col items-center">
        <h1 className="text-xl font-bold mb-2">Your Mortgage Portal</h1>
        <div className="w-full mb-4">
          <Progress 
            value={((mockClientData.loanProgress + 1) / progressSteps.length) * 100} 
            className="h-2.5 bg-gray-200" 
          />
          
          <div className="mt-1 text-xs text-center text-mortgage-lightPurple">
            <span className="font-semibold">{progressSteps[mockClientData.loanProgress]}</span>
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
            {mockClientData.conditions.filter(c => c.urgent && !c.completed).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {mockClientData.conditions.filter(c => c.urgent && !c.completed).length}
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

const HomeTab = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-mortgage-darkPurple">Loan Summary</CardTitle>
          <CardDescription>Compare your new loan with your current one</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium">New Loan Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Loan Amount:</span>
                  <span className="font-medium">${mockClientData.loanAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest Rate:</span>
                  <span className="font-medium">{mockClientData.interestRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Term:</span>
                  <span className="font-medium">{mockClientData.loanTerm} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Payment:</span>
                  <span className="font-medium text-mortgage-darkPurple">${mockClientData.monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
              <h3 className="font-medium">Your Savings</h3>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="text-center">
                  <span className="block text-gray-600">Monthly Savings</span>
                  <span className="block text-2xl font-bold text-green-600">
                    ${mockClientData.savingsPerMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                  <span className="block text-sm text-gray-500 mt-1">
                    (${(mockClientData.savingsPerMonth * 12).toLocaleString()} per year)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-mortgage-darkPurple">Property Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-sm text-gray-600">Address</span>
                <p className="font-medium">{mockClientData.propertyAddress}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-600">Estimated Value</span>
                <p className="font-medium">${mockClientData.propertyValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-mortgage-darkPurple">Loan Officer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden">
                <img src={mockClientData.loanOfficer.photo} alt="Loan Officer" className="h-full w-full object-cover" />
              </div>
              <div>
                <h3 className="font-medium">{mockClientData.loanOfficer.name}</h3>
                <p className="text-sm text-gray-600">{mockClientData.loanOfficer.phone}</p>
                <p className="text-sm text-gray-600">{mockClientData.loanOfficer.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-mortgage-darkPurple">Loan Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span>{progressSteps[0]}</span>
                <span>{progressSteps[progressSteps.length - 1]}</span>
              </div>
              <Progress value={((mockClientData.loanProgress + 1) / progressSteps.length) * 100} className="h-2" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {progressSteps.map((step, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${index <= mockClientData.loanProgress ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} flex items-center space-x-2`}
                >
                  {index <= mockClientData.loanProgress ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${index <= mockClientData.loanProgress ? 'text-green-800' : 'text-gray-500'}`}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ConditionsTab = () => {
  const handleFileUpload = (file: File) => {
    console.log("File uploaded:", file.name);
    // In a real app, you would upload this to your backend
    alert(`Document "${file.name}" uploaded successfully!`);
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
            {mockClientData.conditions.map(condition => (
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

const AttentionTab = () => {
  const urgentConditions = mockClientData.conditions.filter(c => c.urgent && !c.completed);
  const pendingDisclosures = mockClientData.disclosures.filter(d => !d.completed);
  
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
    
    // Add user message to chat
    setChat([...chat, { sender: "user", text: message }]);
    setMessage("");
    
    // Simulate AI response after a short delay
    setTimeout(() => {
      let response = "Thank you for your message. A mortgage specialist will respond shortly. For urgent matters, please call your loan officer directly.";
      
      // Simple keyword-based responses
      if (message.toLowerCase().includes("status") || message.toLowerCase().includes("progress")) {
        response = `Your loan is currently in the ${progressSteps[mockClientData.loanProgress]} stage. It's progressing as expected!`;
      } else if (message.toLowerCase().includes("document") || message.toLowerCase().includes("upload")) {
        response = "You can upload documents in the Conditions tab. If you're having trouble, we can assist you in uploading them.";
      } else if (message.toLowerCase().includes("payment") || message.toLowerCase().includes("monthly")) {
        response = `Your estimated monthly payment will be $${mockClientData.monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}.`;
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

const ClientLogin = ({ onLogin }: { onLogin: () => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "user1" && password === "password") {
      onLogin();
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-mortgage-purple/20 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-mortgage-darkPurple">Client Portal Login</CardTitle>
          <CardDescription>Access your loan information securely</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">Username</label>
                <input
                  id="username"
                  type="text"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-mortgage-purple"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <input
                  id="password"
                  type="password"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-mortgage-purple"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full bg-mortgage-purple hover:bg-mortgage-darkPurple">
                Login
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-gray-500">
          <p>Username: user1</p>
          <p>Password: password</p>
        </CardFooter>
      </Card>
    </div>
  );
};

const ClientPortal = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  
  if (!authenticated) {
    return <ClientLogin onLogin={() => setAuthenticated(true)} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <ClientPortalNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="container mx-auto p-4 md:p-6 mt-2">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "conditions" && <ConditionsTab />}
        {activeTab === "attention" && <AttentionTab />}
        {activeTab === "support" && <SupportTab />}
      </div>
    </div>
  );
};

export default ClientPortal;
