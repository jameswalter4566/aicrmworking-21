
import React from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Mortgage1003Form from "@/components/mortgage/Mortgage1003Form";

const MortgageApplication: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto p-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mortgage Application</CardTitle>
          </CardHeader>
          <CardContent>
            <Mortgage1003Form />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default MortgageApplication;
