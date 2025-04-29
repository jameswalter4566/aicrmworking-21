
import React from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { AutoDialerController } from "@/components/power-dialer/AutoDialerController";

const PowerDialer = () => {
  return (
    <MainLayout>
      <AutoDialerController 
        sessionId="default-session" 
        isActive={true}
        onCallComplete={() => {}}
      />
    </MainLayout>
  );
};

export default PowerDialer;
