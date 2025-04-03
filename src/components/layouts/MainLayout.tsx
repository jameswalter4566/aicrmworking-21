
import React from "react";
import Navbar from "../navigation/Navbar";
import Sidebar from "../navigation/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col">
      {isMobile ? (
        <>
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Navbar />
            <main className="flex-1 bg-gray-50 p-6">
              {children}
            </main>
          </div>
        </>
      ) : (
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Navbar />
            <main className="flex-1 bg-gray-50 p-6">
              {children}
            </main>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
