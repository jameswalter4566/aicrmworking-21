
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  MessageCircle, 
  AlertTriangle, 
  ChevronRight,
  BookUser,
  Clock,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ClientPortalLanding = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-mortgage-purple to-mortgage-darkPurple text-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Your Mortgage Journey Made Simple</h1>
            <p className="text-xl opacity-90 mb-8">Stay updated on your loan progress with our personalized client portal</p>
            <Button 
              size="lg" 
              onClick={() => navigate('/client-portal/login')}
              className="bg-white text-mortgage-darkPurple hover:bg-gray-100"
            >
              Access Client Portal <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-mortgage-darkPurple">Everything You Need in One Place</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 text-center">
              <div className="inline-flex items-center justify-center p-3 bg-mortgage-purple/10 rounded-full mb-4">
                <FileText className="h-8 w-8 text-mortgage-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Document Management</h3>
              <p className="text-gray-600">Upload and manage all your required documents securely in one place</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 text-center">
              <div className="inline-flex items-center justify-center p-3 bg-mortgage-purple/10 rounded-full mb-4">
                <MessageCircle className="h-8 w-8 text-mortgage-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
              <p className="text-gray-600">Get answers to your questions anytime with our always-available support</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 text-center">
              <div className="inline-flex items-center justify-center p-3 bg-mortgage-purple/10 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-mortgage-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Important Alerts</h3>
              <p className="text-gray-600">Never miss critical deadlines with timely reminders and alerts</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100 text-center">
              <div className="inline-flex items-center justify-center p-3 bg-mortgage-purple/10 rounded-full mb-4">
                <Clock className="h-8 w-8 text-mortgage-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Loan Progress</h3>
              <p className="text-gray-600">Track every step of your loan's journey from application to funding</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-mortgage-darkPurple">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="relative pl-12 md:pl-0 md:text-center">
              <div className="md:mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-mortgage-purple text-white md:relative md:left-auto md:translate-x-0 absolute left-0 top-0">
                <span className="text-lg font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Login Securely</h3>
              <p className="text-gray-600">Access your personalized portal using your secure link</p>
            </div>
            
            <div className="relative pl-12 md:pl-0 md:text-center">
              <div className="md:mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-mortgage-purple text-white md:relative md:left-auto md:translate-x-0 absolute left-0 top-0">
                <span className="text-lg font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">View Requirements</h3>
              <p className="text-gray-600">Check outstanding conditions and required documents</p>
            </div>
            
            <div className="relative pl-12 md:pl-0 md:text-center">
              <div className="md:mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-mortgage-purple text-white md:relative md:left-auto md:translate-x-0 absolute left-0 top-0">
                <span className="text-lg font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Complete Tasks</h3>
              <p className="text-gray-600">Upload documents and sign disclosures to keep your loan moving</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-mortgage-darkPurple">Simplify Your Mortgage Experience</h2>
              <p className="text-gray-600 mb-6">Our client portal makes the mortgage process transparent and easy to navigate, keeping you informed every step of the way.</p>
              
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Real-time updates on your loan status</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Secure document upload and management</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Direct communication with your loan team</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span>Mobile-friendly design for access anywhere</span>
                </li>
              </ul>
              
              <Button 
                className="mt-8 bg-mortgage-purple hover:bg-mortgage-darkPurple"
                onClick={() => navigate('/client-portal/login')}
              >
                Access Your Portal
              </Button>
            </div>
            
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-6">
              <div className="space-y-4">
                <div className="h-2.5 rounded-full bg-green-500 w-full"></div>
                <h3 className="text-center text-sm text-gray-500">Loan Progress</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-500">Loan Amount</div>
                    <div className="text-xl font-bold">$320,000</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-500">Interest Rate</div>
                    <div className="text-xl font-bold">4.5%</div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-500">Monthly Payment</div>
                      <div className="text-xl font-bold text-green-700">$1,621.39</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Monthly Savings</div>
                      <div className="text-xl font-bold text-green-700">$478.61</div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BookUser className="h-5 w-5 text-mortgage-purple mr-2" />
                      <span className="text-sm">Loan Officer: Jane Doe</span>
                    </div>
                    <span className="text-xs bg-mortgage-purple/10 text-mortgage-darkPurple px-2 py-1 rounded-full">Available Now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-mortgage-purple/10">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold mb-4 text-mortgage-darkPurple">Ready to Access Your Loan Information?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">Take control of your mortgage journey with our comprehensive client portal</p>
          <Button 
            size="lg"
            onClick={() => navigate('/client-portal/login')}
            className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
          >
            Enter Client Portal
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center">
            <p className="text-sm opacity-75">© {new Date().getFullYear()} Mortgage Client Portal. All rights reserved.</p>
            <p className="text-xs opacity-50 mt-2">A secure way to manage your mortgage process</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortalLanding;
