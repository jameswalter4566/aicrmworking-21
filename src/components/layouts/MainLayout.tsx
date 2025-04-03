
import React from "react";
import Navbar from "../navigation/Navbar";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col font-poppins font-semibold">
      <Navbar />
      <main className="flex-1 bg-gray-50 p-6">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
