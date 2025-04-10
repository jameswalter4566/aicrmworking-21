
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "@/components/layouts/MainLayout";
import { leadProfileService, type LeadProfile as LeadProfileType, LeadNote, LeadActivity } from "@/services/leadProfile";
import { useIndustry } from "@/context/IndustryContext";
import { toast } from "sonner";
import Mortgage1003Form from "@/components/mortgage/Mortgage1003Form";
import LeadHeader from "@/components/lead/LeadHeader";
import DispositionCard from "@/components/lead/DispositionCard";
import ContactInfoCard from "@/components/lead/ContactInfoCard";
import LeadInfoCard from "@/components/lead/LeadInfoCard";
import NotesSection from "@/components/lead/NotesSection";
import ActivityLog from "@/components/lead/ActivityLog";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const LeadProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { activeIndustry } = useIndustry();
  const [lead, setLead] = useState<LeadProfileType | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState<LeadProfileType>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchLeadData = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const leadData = await leadProfileService.getLeadById(id);
        setLead(leadData);
        setEditedLead(leadData);
        
        const [notesData, activitiesData] = await Promise.all([
          leadProfileService.getLeadNotes(id),
          leadProfileService.getLeadActivities(id)
        ]);
        
        setNotes(notesData);
        setActivities(activitiesData);
      } catch (err) {
        console.error("Error fetching lead data:", err);
        setError(err instanceof Error ? err.message : "Failed to load lead data");
        toast.error("Failed to load lead data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeadData();
  }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    
    try {
      const addedNote = await leadProfileService.addNote(id, newNote);
      setNotes(prev => [addedNote, ...prev]);
      setNewNote("");
      toast.success("Note added successfully");
    } catch (err) {
      console.error("Error adding note:", err);
      toast.error("Failed to add note");
    }
  };

  const toggleEditMode = () => {
    if (editMode) {
      setEditedLead(lead || {});
    }
    setEditMode(!editMode);
  };

  const handleSaveChanges = async () => {
    if (!id || !editedLead) return;
    
    try {
      setIsSaving(true);
      const updatedLead = await leadProfileService.updateLead(id, editedLead);
      setLead(updatedLead);
      setEditMode(false);
      
      const updatedActivity = {
        id: crypto.randomUUID(),
        lead_id: Number(id),
        type: "Edit",
        description: "Lead information was updated",
        timestamp: new Date().toISOString()
      };
      
      setActivities(prev => [updatedActivity, ...prev]);
      
      toast.success("Lead information updated successfully");
    } catch (err) {
      console.error("Error updating lead:", err);
      toast.error("Failed to update lead information");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditChange = (field: keyof LeadProfileType, value: string) => {
    setEditedLead(prev => ({ ...prev, [field]: value }));
  };

  const handleDispositionChange = async (disposition: string) => {
    if (!id || !lead || lead.disposition === disposition) return;
    
    try {
      setIsSaving(true);
      const updatedLeadData = { ...lead, disposition };
      const updatedLead = await leadProfileService.updateLead(id, updatedLeadData);
      setLead(updatedLead);
      
      const updatedActivity = {
        id: crypto.randomUUID(),
        lead_id: Number(id),
        type: "Disposition Change",
        description: `Disposition updated to ${disposition}`,
        timestamp: new Date().toISOString()
      };
      
      setActivities(prev => [updatedActivity, ...prev]);
      
      toast.success(`Disposition updated to ${disposition}`);
    } catch (err) {
      console.error("Error updating disposition:", err);
      toast.error("Failed to update lead disposition");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMortgageDataSave = async (section: string, data: Record<string, any>) => {
    if (!id || !lead) return;
    
    try {
      setIsSaving(true);
      
      // Create updated mortgage data by merging the new section data with existing data
      const currentMortgageData = lead.mortgageData || {};
      const updatedMortgageData = {
        ...currentMortgageData,
        [section]: data
      };
      
      // Update the lead with the new mortgage data
      const updatedLeadData = { 
        ...lead, 
        mortgageData: updatedMortgageData 
      };
      
      const updatedLead = await leadProfileService.updateLead(id, updatedLeadData);
      setLead(updatedLead);
      
      const updatedActivity = {
        id: crypto.randomUUID(),
        lead_id: Number(id),
        type: "Mortgage Information Update",
        description: `Updated ${section} information`,
        timestamp: new Date().toISOString()
      };
      
      setActivities(prev => [updatedActivity, ...prev]);
      
      toast.success(`Mortgage ${section} information updated successfully`);
    } catch (err) {
      console.error("Error updating mortgage data:", err);
      toast.error(`Failed to update ${section} information`);
    } finally {
      setIsSaving(false);
    }
  };

  const getIndustryOutlineColor = () => {
    switch(activeIndustry) {
      case "mortgage":
        return "border-blue-500";
      case "realEstate":
        return "border-green-500";
      case "debtSettlement":
        return "border-purple-500";
      default:
        return "border-gray-200";
    }
  };

  const handlePushToMortgagePipeline = async () => {
    if (!id || !lead) return;
    
    try {
      const updatedLead = await leadProfileService.updateLead(id, {
        ...lead,
        isMortgageLead: true
      });
      
      setLead(updatedLead);
      
      const pipelineActivity = {
        id: crypto.randomUUID(),
        lead_id: Number(id),
        type: "Pipeline",
        description: "Lead pushed to Mortgage Pipeline",
        timestamp: new Date().toISOString()
      };
      
      setActivities(prev => [pipelineActivity, ...prev]);
      
      toast.success("Lead added to Mortgage Pipeline");
    } catch (err) {
      console.error("Error pushing lead to pipeline:", err);
      toast.error("Failed to add lead to pipeline");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-500">Loading lead information...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 mb-4">⚠️ {error}</div>
          <Link to="/people">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  if (!lead) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-gray-500 mb-4">Lead not found</div>
          <Link to="/people">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <LeadHeader 
        lead={lead} 
        editMode={editMode} 
        isSaving={isSaving} 
        toggleEditMode={toggleEditMode} 
      />

      <div className="space-y-6">
        <DispositionCard
          lead={lead}
          editMode={editMode}
          editedLead={editedLead}
          isSaving={isSaving}
          activeIndustry={activeIndustry}
          handleDispositionChange={handleDispositionChange}
          handleEditChange={handleEditChange}
          handlePushToMortgagePipeline={handlePushToMortgagePipeline}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ContactInfoCard
            lead={lead}
            editMode={editMode}
            editedLead={editedLead}
            isSaving={isSaving}
            getIndustryOutlineColor={getIndustryOutlineColor}
            handleEditChange={handleEditChange}
            handleSaveChanges={handleSaveChanges}
          />
          
          <LeadInfoCard lead={lead} />
        </div>

        {/* Mortgage 1003 Form - Only show for mortgage industry */}
        {activeIndustry === 'mortgage' && (
          <Mortgage1003Form 
            lead={lead} 
            onSave={handleMortgageDataSave}
            isEditable={!editMode} 
            isSaving={isSaving}
          />
        )}
        
        <NotesSection
          notes={notes}
          newNote={newNote}
          setNewNote={setNewNote}
          handleAddNote={handleAddNote}
        />
        
        <ActivityLog activities={activities} />
      </div>
    </MainLayout>
  );
};

export default LeadProfile;
