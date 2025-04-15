
import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListPlus, Users, Phone, Tag } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface CallingList {
  id: string;
  name: string;
  leadCount: number;
  createdAt: string;
}

const CallingListsPanel = () => {
  // This will be replaced with real data later
  const dummyLists: CallingList[] = [
    { id: '1', name: 'High Priority Leads', leadCount: 25, createdAt: '2024-04-15' },
    { id: '2', name: 'Follow Up List', leadCount: 42, createdAt: '2024-04-14' },
    { id: '3', name: 'New Prospects', leadCount: 15, createdAt: '2024-04-13' },
  ];

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-4">
      <div 
        className="flex items-center justify-between mb-4 p-3 rounded-t-lg"
        style={{
          background: 'linear-gradient(to right, #E5DEFF, #9b87f5)',
        }}
      >
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-white" strokeWidth={2} />
          <h2 className="font-semibold text-white">Calling Lists</h2>
        </div>
        <Button 
          className="bg-white/20 text-white hover:bg-white/30 rounded-lg"
        >
          <ListPlus className="h-4 w-4 mr-2" />
          Create List
        </Button>
      </div>

      <ScrollArea className="w-full" style={{ maxHeight: '180px' }}>
        <div className="flex gap-4 pb-4 overflow-x-auto">
          {dummyLists.map((list) => (
            <div
              key={list.id}
              className="flex-none w-64 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-crm-blue transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">{list.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Created {list.createdAt}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-gray-100">
                  <Users className="h-3 w-3 mr-1" />
                  {list.leadCount}
                </Badge>
              </div>
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-gray-300 hover:bg-crm-blue hover:text-white"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Start Calling
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CallingListsPanel;
