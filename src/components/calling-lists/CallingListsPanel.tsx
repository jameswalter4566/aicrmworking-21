import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListPlus, Users, TagIcon, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface CallingList {
  id: string;
  name: string;
  leadCount: number;
  createdAt: string;
}

const CallingListsPanel = () => {
  const navigate = useNavigate();
  const [lists, setLists] = useState<CallingList[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCallingLists();
  }, []);

  const fetchCallingLists = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-calling-lists');
      
      if (error) {
        console.error("Error fetching calling lists:", error);
        toast.error("Failed to load calling lists");
        return;
      }
      
      if (data && Array.isArray(data)) {
        setLists(data);
      }
    } catch (error) {
      console.error("Error in fetchCallingLists:", error);
      toast.error("Failed to load calling lists");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newListName.trim()) {
      toast.error("Please enter a list name");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('store-calling-list', {
        body: { name: newListName.trim() }
      });
      
      if (error) {
        console.error("Error creating calling list:", error);
        toast.error("Failed to create calling list");
        return;
      }
      
      if (data && data.id) {
        toast.success("Calling list created successfully");
        setNewListName("");
        setIsOpen(false);
        await fetchCallingLists();
        navigate(`/calling-list/${data.id}`);
      }
    } catch (error) {
      console.error("Error in handleCreateList:", error);
      toast.error("Failed to create calling list");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewList = (listId: string) => {
    navigate(`/calling-list/${listId}`);
  };

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-4">
      <div 
        className="flex items-center justify-between mb-4 p-3 rounded-t-lg bg-mortgage-purple"
      >
        <div className="flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-white" strokeWidth={2} />
          <h2 className="font-semibold text-white">Calling Lists</h2>
        </div>
        
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full max-w-md">
          <CollapsibleTrigger asChild>
            <Button 
              className="bg-white/20 text-white hover:bg-white/30 rounded-lg"
            >
              <ListPlus className="h-4 w-4 mr-2" />
              Create List
              {isOpen ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50 mt-4">
            <form onSubmit={handleCreateList} className="flex gap-3 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Enter list name..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="focus:ring-mortgage-purple focus:border-mortgage-purple"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <Button 
                type="submit"
                className="bg-mortgage-purple hover:bg-mortgage-purple/80 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Save List'
                )}
              </Button>
            </form>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
        </div>
      ) : lists.length > 0 ? (
        <ScrollArea className="w-full" style={{ maxHeight: '180px' }}>
          <div className="flex gap-4 pb-4 overflow-x-auto">
            {lists.map((list) => (
              <div
                key={list.id}
                onClick={() => handleViewList(list.id)}
                className="flex-none w-64 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-crm-blue transition-colors cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">{list.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Created {new Date(list.createdAt).toLocaleDateString()}
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
                    View List
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="py-8 text-center text-gray-500">
          <p>No calling lists found. Create your first list to get started.</p>
        </div>
      )}
    </div>
  );
};

export default CallingListsPanel;
