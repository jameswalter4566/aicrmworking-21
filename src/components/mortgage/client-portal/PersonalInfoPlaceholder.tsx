
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const labelClass = "block text-sm font-medium text-gray-700 mb-0.5";
const inputClass = "w-full px-3 py-2 border rounded text-sm bg-white text-gray-900 placeholder-gray-400 mb-3";

const PersonalInfoPlaceholder: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [leadId, setLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    socialSecurityNumber: '',
    dateOfBirth: '',
    maritalStatus: 'Single',
    dependents: '0',
    dependentAges: '',
    citizenship: 'U.S. Citizen',
    isVeteran: false,
    
    email: '',
    homePhone: '',
    cellPhone: '',
    workPhone: '',
    workExt: '',
    noEmail: false,
    
    presentAddress: '',
    presentAddressUnit: '',
    presentCity: '',
    presentState: '',
    presentZipCode: '',
    timeAtResidence: '',
    presentOwnership: 'Rent',
  });

  useEffect(() => {
    if (!slug || !token) return;
    
    const fetchLeadData = async () => {
      try {
        setLoading(true);
        // Get lead ID from portal access
        const { data: portalData, error: portalError } = await supabase
          .from('client_portal_access')
          .select('lead_id')
          .eq('portal_slug', slug)
          .eq('access_token', token)
          .single();
        
        if (portalError || !portalData?.lead_id) {
          console.error("Error fetching portal access:", portalError);
          return;
        }
        
        setLeadId(portalData.lead_id.toString());
        
        // Get lead data
        const { data: response, error: profileError } = await supabase.functions.invoke('lead-profile', {
          body: { id: portalData.lead_id }
        });

        if (profileError || !response.success || !response.data.lead) {
          console.error("Error fetching lead data:", profileError || response.error);
          return;
        }
        
        const lead = response.data.lead;
        const mortgageData = lead.mortgageData || {};
        const personalInfo = mortgageData.personalInfo?.personalInfo || mortgageData.borrower?.data?.personalInfo || {};
        const contactDetails = mortgageData.personalInfo?.contactDetails || mortgageData.borrower?.data?.contactDetails || {};
        const addressHistory = mortgageData.personalInfo?.addressHistory || mortgageData.borrower?.data?.addressHistory || {};
        
        setFormData({
          firstName: personalInfo.firstName || lead.firstName || '',
          middleName: personalInfo.middleName || '',
          lastName: personalInfo.lastName || lead.lastName || '',
          suffix: personalInfo.suffix || '',
          socialSecurityNumber: personalInfo.socialSecurityNumber || '',
          dateOfBirth: personalInfo.dateOfBirth || '',
          maritalStatus: personalInfo.maritalStatus || 'Single',
          dependents: personalInfo.numberOfDependents || '0',
          dependentAges: personalInfo.ageOfDependents || '',
          citizenship: personalInfo.citizenship || 'U.S. Citizen',
          isVeteran: personalInfo.isVeteran || false,
          
          email: contactDetails.emailAddress || lead.email || '',
          homePhone: contactDetails.homePhoneNumber || '',
          cellPhone: contactDetails.cellPhoneNumber || lead.phone1 || '',
          workPhone: contactDetails.workPhoneNumber || lead.phone2 || '',
          workExt: contactDetails.workPhoneExt || '',
          noEmail: contactDetails.noEmail || false,
          
          presentAddress: addressHistory.presentAddressLine1 || lead.propertyAddress || '',
          presentAddressUnit: addressHistory.presentAddressUnit || '',
          presentCity: addressHistory.presentCity || '',
          presentState: addressHistory.presentState || '',
          presentZipCode: addressHistory.presentZipCode || '',
          timeAtResidence: addressHistory.presentTimeAtResidence || '',
          presentOwnership: addressHistory.presentOwnership || 'Rent',
        });
      } catch (error) {
        console.error("Error in fetchLeadData:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeadData();
  }, [slug, token]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!leadId) {
      toast.error("Cannot save: Lead ID is missing");
      return;
    }
    
    try {
      setSaving(true);
      
      // Build the mortgage data structure that matches update-lead expectations
      const mortgageData = {
        personalInfo: {
          personalInfo: {
            firstName: formData.firstName,
            middleName: formData.middleName,
            lastName: formData.lastName,
            suffix: formData.suffix,
            socialSecurityNumber: formData.socialSecurityNumber,
            dateOfBirth: formData.dateOfBirth,
            maritalStatus: formData.maritalStatus,
            numberOfDependents: formData.dependents,
            ageOfDependents: formData.dependentAges,
            citizenship: formData.citizenship,
            isVeteran: formData.isVeteran
          },
          contactDetails: {
            emailAddress: formData.email,
            homePhoneNumber: formData.homePhone,
            cellPhoneNumber: formData.cellPhone, 
            workPhoneNumber: formData.workPhone,
            workPhoneExt: formData.workExt,
            noEmail: formData.noEmail
          },
          addressHistory: {
            presentAddressLine1: formData.presentAddress,
            presentAddressUnit: formData.presentAddressUnit,
            presentCity: formData.presentCity,
            presentState: formData.presentState,
            presentZipCode: formData.presentZipCode,
            presentTimeAtResidence: formData.timeAtResidence,
            presentOwnership: formData.presentOwnership,
            presentCountry: "USA"
          }
        }
      };
      
      // Save both to mortgageData and top-level fields
      const leadData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone1: formData.cellPhone,
        phone2: formData.workPhone,
        mortgageData: mortgageData
      };
      
      const { data, error } = await supabase.functions.invoke('update-lead', {
        body: { 
          leadId: leadId,
          leadData: leadData
        }
      });
      
      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Failed to update information");
      }
      
      toast.success("Personal information saved successfully");
    } catch (error) {
      console.error("Error saving personal information:", error);
      toast.error("Failed to save information");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-4 bg-white rounded-xl shadow p-6 flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-mortgage-purple" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mt-4 bg-white rounded-xl shadow p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-mortgage-darkPurple mb-1">Primary Information</h2>
        <hr className="mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Names */}
          <div>
            <label className={labelClass}>First Name</label>
            <input 
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={inputClass} 
              placeholder="First Name" 
            />
          </div>
          <div>
            <label className={labelClass}>Middle Name</label>
            <input 
              name="middleName"
              value={formData.middleName}
              onChange={handleChange}
              className={inputClass} 
              placeholder="Middle Name" 
            />
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            <input 
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={inputClass} 
              placeholder="Last Name" 
            />
          </div>
          <div>
            <label className={labelClass}>Suffix</label>
            <select 
              name="suffix"
              value={formData.suffix}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select suffix</option>
              <option value="Jr.">Jr.</option>
              <option value="Sr.">Sr.</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Social Security Number</label>
            <input 
              name="socialSecurityNumber"
              value={formData.socialSecurityNumber}
              onChange={handleChange}
              className={inputClass} 
              placeholder="XXX-XX-XXXX" 
            />
          </div>
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input 
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className={inputClass} 
            />
          </div>
          <div>
            <label className={labelClass}>Marital Status</label>
            <select 
              name="maritalStatus"
              value={formData.maritalStatus}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Separated">Separated</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>No. of Dependents</label>
            <input 
              type="number"
              name="dependents"
              value={formData.dependents}
              onChange={handleChange}
              className={inputClass}
              min="0"
            />
          </div>
          <div>
            <label className={labelClass}>Age of Dependents</label>
            <input 
              name="dependentAges"
              value={formData.dependentAges}
              onChange={handleChange}
              className={inputClass} 
              placeholder="e.g., 10, 12, 15" 
            />
          </div>
          <div>
            <label className={labelClass}>Citizenship</label>
            <select
              name="citizenship"
              value={formData.citizenship}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="U.S. Citizen">U.S. Citizen</option>
              <option value="Permanent Resident Alien">Permanent Resident Alien</option>
              <option value="Non-Permanent Resident Alien">Non-Permanent Resident Alien</option>
            </select>
          </div>
          <div className="flex items-center pt-6">
            <input 
              type="checkbox" 
              id="isVeteran"
              name="isVeteran"
              checked={formData.isVeteran}
              onChange={handleCheckboxChange}
              className="mr-2" 
            /> 
            <label htmlFor="isVeteran">Veteran</label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-mortgage-darkPurple mb-2 mt-2">Contact Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Home Phone Number</label>
            <input 
              name="homePhone"
              value={formData.homePhone}
              onChange={handleChange}
              className={inputClass} 
              placeholder="(XXX) XXX-XXXX" 
            />
          </div>
          <div>
            <label className={labelClass}>Cell Phone Number</label>
            <input 
              name="cellPhone"
              value={formData.cellPhone}
              onChange={handleChange}
              className={inputClass} 
              placeholder="(XXX) XXX-XXXX" 
            />
          </div>
          <div>
            <label className={labelClass}>Work Phone Number</label>
            <input 
              name="workPhone"
              value={formData.workPhone}
              onChange={handleChange}
              className={inputClass} 
              placeholder="(XXX) XXX-XXXX" 
            />
          </div>
          <div>
            <label className={labelClass}>Ext.</label>
            <input 
              name="workExt"
              value={formData.workExt}
              onChange={handleChange}
              className={inputClass} 
            />
          </div>
          <div>
            <label className={labelClass}>Email Address</label>
            <input 
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={inputClass} 
              placeholder="your@email.com" 
            />
          </div>
          <div className="flex items-center pt-4">
            <input 
              type="checkbox" 
              id="noEmail"
              name="noEmail"
              checked={formData.noEmail}
              onChange={handleCheckboxChange}
              className="mr-2" 
            /> 
            <label htmlFor="noEmail">No Email</label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-mortgage-darkPurple mb-2 mt-2">Address History</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Present Address Line 1</label>
            <input 
              name="presentAddress"
              value={formData.presentAddress}
              onChange={handleChange}
              className={inputClass} 
              placeholder="Address Line 1" 
            />
          </div>
          <div>
            <label className={labelClass}>Unit #</label>
            <input 
              name="presentAddressUnit"
              value={formData.presentAddressUnit}
              onChange={handleChange}
              className={inputClass} 
              placeholder="Unit #" 
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input 
              name="presentCity"
              value={formData.presentCity}
              onChange={handleChange}
              className={inputClass} 
              placeholder="City" 
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input 
              name="presentState"
              value={formData.presentState}
              onChange={handleChange}
              className={inputClass} 
              placeholder="State" 
            />
          </div>
          <div>
            <label className={labelClass}>ZIP Code</label>
            <input 
              name="presentZipCode"
              value={formData.presentZipCode}
              onChange={handleChange}
              className={inputClass} 
              placeholder="ZIP Code" 
            />
          </div>
          <div>
            <label className={labelClass}>Time at Residence (Years)</label>
            <input 
              name="timeAtResidence"
              value={formData.timeAtResidence}
              onChange={handleChange}
              className={inputClass}
              placeholder="1" 
            />
          </div>
          <div>
            <label className={labelClass}>Ownership</label>
            <select 
              name="presentOwnership"
              value={formData.presentOwnership}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="Own">Own</option>
              <option value="Rent">Rent</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={saving}
          className="bg-mortgage-purple hover:bg-mortgage-darkPurple"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Information'
          )}
        </Button>
      </div>
    </form>
  );
};

export default PersonalInfoPlaceholder;
