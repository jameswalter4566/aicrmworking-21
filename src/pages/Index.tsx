import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import ActivityTable from "@/components/dashboard/ActivityTable";
import FilterBar from "@/components/dashboard/FilterBar";
import { Button } from "@/components/ui/button";
import { FilterX, Settings } from "lucide-react";
import { useIndustry } from "@/context/IndustryContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import NotificationStrip, { Notification } from "@/components/dashboard/NotificationStrip";
import { supabase } from "@/integrations/supabase/client";

const contacts = [
  {
    id: 1,
    name: "Dan Corkill",
    email: "hi@followupboss.com",
    phone: "(218) 304-6145",
    lastActivity: "Opened Email via Follow Up Boss",
    time: "an hour ago",
    stage: "Lead",
    assigned: "study bolt",
  },
];

const Index = () => {
  const { activeIndustry } = useIndustry();

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) =>
      prev.some((n) => n.id === notification.id) ? prev : [...prev, notification]
    );
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    const leadsChannel = supabase.channel("dashboard-onboarding")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const first = payload.new?.first_name || "A client";
          const last = payload.new?.last_name ? ` ${payload.new.last_name}` : "";
          addNotification({
            id: `onboarding-${payload.new.id || Math.random()}`,
            type: "onboarding",
            message: `${first}${last} has completed their onboarding.`,
            createdAt: new Date().toISOString(),
          });
        }
      )
      .subscribe();

    const docChannel = supabase.channel("dashboard-docs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "document_files" },
        (payload) => {
          const fname = payload.new?.original_name || "A new document";
          addNotification({
            id: `doc-${payload.new.id || Math.random()}`,
            type: "document",
            message: `A new document has been uploaded: ${fname}`,
            createdAt: new Date().toISOString(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(docChannel);
    };
  }, []);

  return (
    <MainLayout>
      {!activeIndustry && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <AlertTitle className="flex items-center text-blue-700">
            <Settings className="mr-2 h-4 w-4" />
            Customize your CRM experience
          </AlertTitle>
          <AlertDescription className="text-blue-600">
            Tailor fit your CRM based on your industry for a more personalized experience.
            <div className="mt-2">
              <Button 
                variant="default" 
                className="bg-blue-600 hover:bg-blue-700" 
                size="sm"
                asChild
              >
                <Link to="/settings">Get Started Now</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <FilterBar />
      <div className="bg-white p-4 rounded-2xl border border-gray-200 mb-4">
        <MetricsGrid />
      </div>
      
      <div className="bg-white p-4 rounded-2xl border border-gray-200 mb-4">
        <div className="flex flex-col gap-2 mb-4">
          {notifications.map((notification) => (
            <NotificationStrip
              key={notification.id}
              notification={notification}
              onClear={clearNotification}
            />
          ))}
        </div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-700 uppercase text-sm">Recent Activity</h2>
          <Button variant="outline" size="sm" className="text-xs">
            <FilterX className="h-3 w-3 mr-1" />
            Filter Activity
          </Button>
        </div>
        
        <ActivityTable contacts={contacts} />
        
        <div className="mt-4 flex justify-center">
          <Button variant="outline" className="bg-crm-blue text-white hover:bg-crm-blue/90">
            View all people
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
