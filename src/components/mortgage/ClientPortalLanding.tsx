
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Shield, Clock, FileCheck, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ClientPortalLanding = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-800 to-green-900 text-white px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              Smart Mortgage Processing
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"> Powered by AI</span>
            </h1>
            <p className="text-xl mb-8 text-gray-100">
              Our technology streamlines your mortgage journey with faster approvals, 
              transparent processing, and 24/7 access to your loan status.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/client-portal/login')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Access Your Portal 
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="mt-4 text-sm text-gray-200 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Average processing time: 2-3 weeks faster than traditional lenders
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need in One Place</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Access</h3>
              <p className="text-gray-600">
                Bank-level security protects your sensitive information while providing 
                easy access to your documents.
              </p>
            </Card>

            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                <PieChart className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Updates</h3>
              <p className="text-gray-600">
                Track your loan's progress in real-time and get instant notifications 
                about important milestones.
              </p>
            </Card>

            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-4">
                <FileCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Document Management</h3>
              <p className="text-gray-600">
                Upload, sign, and manage all your loan documents in one centralized, 
                easy-to-use platform.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Access your personalized mortgage portal to track your loan progress, 
            upload documents, and stay connected with your loan team.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/client-portal/login')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            Enter Portal 
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm opacity-75">
            © {new Date().getFullYear()} Mortgage Client Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortalLanding;
