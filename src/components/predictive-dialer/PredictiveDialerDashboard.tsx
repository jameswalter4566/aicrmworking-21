
import React, { useState, useEffect } from 'react';
import PredictiveDialerAgentManager from './PredictiveDialerAgentManager';
import PredictiveDialerContactsList from './PredictiveDialerContactsList';
import PredictiveDialerQueueMonitor from './PredictiveDialerQueueMonitor';
import TwilioDeviceSetup from './TwilioDeviceSetup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { thoughtlyService } from '@/services/thoughtly';
import { supabase } from '@/integrations/supabase/client';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationSizeSelector,
} from "@/components/ui/pagination";

// Available page sizes
const pageSizeOptions = [10, 20, 50, 100];

const PredictiveDialerDashboard = () => {
  const [isDialerRunning, setIsDialerRunning] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [callsInProgress, setCallsInProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('dialer');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);

  const fetchContacts = async (page = currentPage, size = pageSize) => {
    setIsLoading(true);
    try {
      console.log(`Fetching contacts for predictive dialer with page=${page}, pageSize=${size}...`);
      const result = await thoughtlyService.retrieveLeads({
        page: page,
        pageSize: size
      });
      
      console.log("Fetch contacts result:", result);
      
      if (result && result.data && Array.isArray(result.data)) {
        console.log(`Setting ${result.data.length} contacts from API`);
        
        // Transform the data to match what the PredictiveDialerContactsList expects
        const transformedContacts = result.data.map(contact => ({
          id: contact.id,
          name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
          phone_number: contact.phone1 || '',
          status: contact.disposition === 'Not Contacted' ? 'not_contacted' : 
                  contact.disposition === 'Contacted' ? 'contacted' :
                  contact.disposition === 'DNC' ? 'dnc' : 'other',
          notes: contact.notes || ''
        }));
        
        setContacts(transformedContacts);
        setTotalPages(result.metadata.totalPages);
        setTotalContacts(result.metadata.totalLeadCount);
      } else {
        console.warn("No contacts found in API response");
        setContacts([]);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const startDialer = async () => {
    try {
      setIsDialerRunning(true);
      toast.success('Predictive dialer started');
      
      // Make API call to start the dialer
      const { data, error } = await supabase.functions.invoke('start-predictive-dialer', {
        body: { 
          contacts: contacts.filter(contact => 
            contact.status === 'not_contacted' && contact.phone_number
          ).slice(0, 10) // Start with first 10 contacts for testing
        }
      });
      
      if (error) {
        console.error('Error starting dialer:', error);
        toast.error('Failed to start dialer');
        setIsDialerRunning(false);
      } else {
        console.log('Dialer started successfully:', data);
      }
      
    } catch (error) {
      console.error('Error starting predictive dialer:', error);
      toast.error('Failed to start dialer');
      setIsDialerRunning(false);
    }
  };

  const stopDialer = async () => {
    try {
      // Make API call to stop the dialer
      const { data, error } = await supabase.functions.invoke('stop-predictive-dialer', {});
      
      if (error) {
        console.error('Error stopping dialer:', error);
        toast.error('Failed to stop dialer');
      } else {
        console.log('Dialer stopped successfully:', data);
        toast.success('Predictive dialer stopped');
      }
      
      setIsDialerRunning(false);
    } catch (error) {
      console.error('Error stopping predictive dialer:', error);
      toast.error('Failed to stop dialer');
    }
  };

  const refreshContacts = () => {
    fetchContacts(currentPage, pageSize);
  };

  // Generate page numbers for pagination
  const generatePagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // If we have fewer pages than the max visible, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);
      
      // Calculate start and end of visible page range
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust range to ensure we show maxVisiblePages - 2 pages (accounting for first and last)
      if (end - start < maxVisiblePages - 3) {
        if (currentPage < totalPages / 2) {
          end = Math.min(totalPages - 1, start + maxVisiblePages - 3);
        } else {
          start = Math.max(2, end - (maxVisiblePages - 3));
        }
      }
      
      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('ellipsis-start');
      }
      
      // Add visible page numbers
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis-end');
      }
      
      // Always include last page if we have more than one page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Generate pagination items
  const paginationItems = generatePagination();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Predictive Dialer</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={refreshContacts}
            className="gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Refresh
          </Button>
          {isDialerRunning ? (
            <Button 
              variant="destructive" 
              onClick={stopDialer}
              className="gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="14" x="4" y="5" rx="2"/><rect width="6" height="14" x="14" y="5" rx="2"/></svg>
              Stop Dialer
            </Button>
          ) : (
            <Button 
              onClick={startDialer}
              className="gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Start Dialer
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="dialer" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="dialer">Dialer</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dialer" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Contacts</span>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">
                      Showing {contacts.length} of {totalContacts} contacts
                    </div>
                    <PaginationSizeSelector 
                      options={pageSizeOptions} 
                      value={pageSize} 
                      onChange={handlePageSizeChange}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-10 flex flex-col items-center justify-center">
                    <Progress value={45} className="w-[60%] mb-4" />
                    <p className="text-sm text-gray-500">Loading contacts...</p>
                  </div>
                ) : (
                  <>
                    <PredictiveDialerContactsList contacts={contacts} />
                    
                    {totalPages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            {currentPage > 1 && (
                              <PaginationItem>
                                <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
                              </PaginationItem>
                            )}
                            
                            {paginationItems.map((page, i) => {
                              if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                                return (
                                  <PaginationItem key={`ellipsis-${i}`}>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                );
                              }
                              
                              return (
                                <PaginationItem key={`page-${page}`}>
                                  <PaginationLink 
                                    isActive={currentPage === page}
                                    onClick={() => handlePageChange(page as number)}
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}
                            
                            {currentPage < totalPages && (
                              <PaginationItem>
                                <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
                              </PaginationItem>
                            )}
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Dialer Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Status</h3>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDialerRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {isDialerRunning ? 'Running' : 'Stopped'}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Calls in Progress</h3>
                    <p className="text-2xl font-bold">{callsInProgress}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Total Contacts</h3>
                    <p className="text-2xl font-bold">{totalContacts}</p>
                  </div>
                  
                  {isDialerRunning && (
                    <Button 
                      variant="destructive" 
                      onClick={stopDialer}
                      className="w-full"
                    >
                      Stop Dialer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Agent Management</CardTitle>
            </CardHeader>
            <CardContent>
              <PredictiveDialerAgentManager />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Call Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <PredictiveDialerQueueMonitor />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Twilio Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <TwilioDeviceSetup />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PredictiveDialerDashboard;
