
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Phone, 
  UserX, 
  PhoneOff, 
  MessageSquare, 
  Ban, 
  PhoneMissed,
  Clock,
  RotateCcw,
  Pause,
  StopCircle,
  Play,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { customSupabase } from "@/utils/supabase-custom-client";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone1?: string;
  company?: string;
}

interface PreviewDialerWindowProps {
  currentCall: any;
  onDisposition: (type: string) => void;
  onEndCall: () => void;
}

const PreviewDialerWindow: React.FC<PreviewDialerWindowProps> = ({
  currentCall,
  onDisposition,
  onEndCall
}) => {
  const [isDialingStarted, setIsDialingStarted] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 50;

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data: leadsData, error } = await customSupabase
        .functions
        .invoke('retrieve-leads', {
          body: {
            page: currentPage,
            limit: itemsPerPage
          }
        });

      if (error) {
        console.error('Error fetching leads:', error);
        return;
      }

      setLeads(leadsData?.data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartDialing = async () => {
    await fetchLeads();
    setIsDialingStarted(true);
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => ({
      ...prev,
      [leadId]: !prev[leadId]
    }));
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    await fetchLeads();
  };

  const totalSelectedLeads = Object.values(selectedLeads).filter(Boolean).length;

  if (!isDialingStarted) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <Button 
          onClick={handleStartDialing}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-8 rounded-lg text-lg flex items-center gap-2"
        >
          <Play className="h-6 w-6" />
          Start Dialing
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card className="bg-gray-800 p-4 rounded-lg mb-0">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((line) => (
            <Card key={line} className="bg-white">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-600">Line {line}</span>
                  </div>
                  <Badge variant="outline" className="bg-white text-gray-600 border-gray-200">
                    FREE
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card className="col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                Lead Selection
              </div>
              {totalSelectedLeads > 0 && (
                <Badge variant="default" className="bg-green-500">
                  {totalSelectedLeads} Leads Selected
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading leads...</div>
            ) : leads.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-450px)]">
                <div className="space-y-2">
                  {leads.map((lead) => (
                    <div key={lead.id} className="flex items-center space-x-4 p-2 hover:bg-gray-50 rounded-lg">
                      <Checkbox
                        checked={selectedLeads[lead.id] || false}
                        onCheckedChange={() => handleSelectLead(lead.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{`${lead.firstName} ${lead.lastName}`}</div>
                        <div className="text-sm text-gray-500">{lead.phone1}</div>
                        {lead.company && (
                          <div className="text-sm text-gray-500">{lead.company}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink>Page {currentPage}</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={leads.length < itemsPerPage}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4">
                No leads available. Try adjusting your filters or add some leads.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-white">Disposition</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-650px)]">
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600" 
                  onClick={() => onDisposition('contact')}
                >
                  <Phone className="mr-2 h-4 w-4 text-green-400" />
                  Contact
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('no-contact')}
                >
                  <UserX className="mr-2 h-4 w-4 text-gray-400" />
                  No Contact
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('bad-number')}
                >
                  <PhoneMissed className="mr-2 h-4 w-4 text-red-400" />
                  Bad Number
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('drop-message')}
                >
                  <MessageSquare className="mr-2 h-4 w-4 text-blue-400" />
                  Drop Message
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('dnc-contact')}
                >
                  <Ban className="mr-2 h-4 w-4 text-yellow-400" />
                  DNC Contact
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('dnc-number')}
                >
                  <PhoneOff className="mr-2 h-4 w-4 text-orange-400" />
                  DNC Number
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('callback')}
                >
                  <Clock className="mr-2 h-4 w-4 text-purple-400" />
                  Quick Callback
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={() => onDisposition('redial')}
                >
                  <RotateCcw className="mr-2 h-4 w-4 text-indigo-400" />
                  Redial
                </Button>
              </div>
              
              <div className="pt-4 border-t border-gray-600 mt-4 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-center bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-center bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
                  onClick={onEndCall}
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Hang Up
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-center bg-red-900/50 hover:bg-red-900 text-white border-red-900"
                >
                  <StopCircle className="mr-2 h-4 w-4 text-red-400" />
                  Stop
                </Button>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PreviewDialerWindow;
