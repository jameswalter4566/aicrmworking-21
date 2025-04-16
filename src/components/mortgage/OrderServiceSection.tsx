import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Briefcase, FileText, BookText, Search } from "lucide-react";

interface OrderServiceSectionProps {
  serviceName: string;
  leadId: string;
}

const OrderServiceSection = ({ serviceName, leadId }: OrderServiceSectionProps) => {
  const handleOrderService = () => {
    toast.success(`${serviceName} order initiated for lead ID: ${leadId}`);
  };

  const renderServiceForm = () => {
    switch (serviceName) {
      case "employmentVerification":
        return (
          <Card className="bg-white border border-blue-100">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg font-medium text-blue-900 flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Employment Verification
              </CardTitle>
              <CardDescription className="text-blue-700">
                Order verification of employment and income information
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm text-blue-800">
                This service will verify the borrower's employment status, salary/wage information, 
                and length of employment with their current employer.
              </p>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-md">
                <div>
                  <h3 className="font-medium text-blue-900">Third-Party VOE</h3>
                  <p className="text-sm text-blue-700">Standard processing time: 48 hours</p>
                </div>
                <Button 
                  onClick={handleOrderService}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Order Now
                </Button>
              </div>
            </CardContent>
          </Card>
        );
        
      case "titleOrder":
        return (
          <Card className="bg-white border border-blue-100">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg font-medium text-blue-900 flex items-center">
                <BookText className="h-5 w-5 mr-2" />
                Title Order
              </CardTitle>
              <CardDescription className="text-blue-700">
                Order title search from title company
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm text-blue-800">
                This service will initiate a comprehensive title search on the property to verify ownership,
                identify any liens, encumbrances, or title defects.
              </p>
              
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-md">
                <div>
                  <h3 className="font-medium text-blue-900">Title Search & Insurance</h3>
                  <p className="text-sm text-blue-700">Standard processing time: 3-5 business days</p>
                </div>
                <Search className="h-5 w-5 text-blue-700 mx-4" />
                <Button 
                  onClick={handleOrderService}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Order Now
                </Button>
              </div>
            </CardContent>
          </Card>
        );
        
      default:
        return (
          <div className="py-8 text-center text-blue-800">
            Please select a service to order
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-blue-800 mb-4">
        Order {serviceName === "employmentVerification" ? "Employment Verification" : "Title Search"}
      </h2>
      
      {renderServiceForm()}
    </div>
  );
};

export default OrderServiceSection;
