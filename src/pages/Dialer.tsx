
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dialer = () => {
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Dialer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            This is a placeholder for the dialer page. The full implementation would include
            dialer controls and functionality for making calls.
          </p>
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-blue-700">This page is under construction.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dialer;
