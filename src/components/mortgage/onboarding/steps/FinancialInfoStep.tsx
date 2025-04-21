
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { LeadProfile } from '@/services/leadProfile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Plus } from 'lucide-react';

interface FinancialInfoStepProps {
  leadData: Partial<LeadProfile>;
  onSave: (data: Partial<LeadProfile>) => void;
}

const employmentTypes = [
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self-Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "retired", label: "Retired" }
];

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" }
];

const states = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" }
];

// Generate years for dropdown (past 50 years)
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  
  for (let i = 0; i < 50; i++) {
    const year = currentYear - i;
    years.push({ value: year.toString(), label: year.toString() });
  }
  
  return years;
};

const EmploymentForm = ({ register, watch, control, prefix, index = 0 }) => {
  const employmentType = watch(`${prefix}.employmentType`);
  
  return (
    <div className="space-y-6 p-4 border border-gray-200 rounded-md bg-white/50">
      <div>
        <Label htmlFor={`${prefix}.employmentType`}>Employment Status</Label>
        <Select 
          onValueChange={(value) => {
            // Using register's onChange
            const event = { target: { name: `${prefix}.employmentType`, value } };
            register(`${prefix}.employmentType`).onChange(event);
          }}
          defaultValue={watch(`${prefix}.employmentType`) || ""}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select employment status" />
          </SelectTrigger>
          <SelectContent>
            {employmentTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(employmentType === "employed" || employmentType === "self_employed") && (
        <>
          <div>
            <Label htmlFor={`${prefix}.employerName`}>Employer Name</Label>
            <Input 
              id={`${prefix}.employerName`}
              placeholder="Name of Employer"
              {...register(`${prefix}.employerName`)} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Employer Address</Label>
            <Input 
              placeholder="Street Address"
              {...register(`${prefix}.employerStreet`)} 
            />
            <div className="grid grid-cols-2 gap-2">
              <Input 
                placeholder="City"
                {...register(`${prefix}.employerCity`)} 
              />
              
              <Select 
                onValueChange={(value) => {
                  const event = { target: { name: `${prefix}.employerState`, value } };
                  register(`${prefix}.employerState`).onChange(event);
                }}
                defaultValue={watch(`${prefix}.employerState`) || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {states.map(state => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input 
              placeholder="Zipcode"
              {...register(`${prefix}.employerZipcode`)} 
            />
          </div>
          
          <div>
            <Label htmlFor={`${prefix}.positionTitle`}>Position/Title</Label>
            <Input 
              id={`${prefix}.positionTitle`}
              placeholder="Position/Title"
              {...register(`${prefix}.positionTitle`)} 
            />
          </div>
          
          <div>
            <Label htmlFor={`${prefix}.industry`}>Industry</Label>
            <Input 
              id={`${prefix}.industry`}
              placeholder="Industry"
              {...register(`${prefix}.industry`)} 
            />
          </div>
          
          <div>
            <Label htmlFor={`${prefix}.employerPhone`}>Phone of Employer</Label>
            <Input 
              id={`${prefix}.employerPhone`}
              placeholder="Phone Number"
              {...register(`${prefix}.employerPhone`)} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Start Date</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select 
                onValueChange={(value) => {
                  const event = { target: { name: `${prefix}.startMonth`, value } };
                  register(`${prefix}.startMonth`).onChange(event);
                }}
                defaultValue={watch(`${prefix}.startMonth`) || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                onValueChange={(value) => {
                  const event = { target: { name: `${prefix}.startYear`, value } };
                  register(`${prefix}.startYear`).onChange(event);
                }}
                defaultValue={watch(`${prefix}.startYear`) || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {generateYears().map(year => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              id={`${prefix}.isFamilyMember`}
              {...register(`${prefix}.isFamilyMember`)} 
            />
            <Label htmlFor={`${prefix}.isFamilyMember`} className="text-sm">
              I am employed by a family member, property seller, real estate agent, or other party to the transaction.
            </Label>
          </div>
          
          <div className="space-y-4">
            <Label>Gross Monthly Income</Label>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Label htmlFor={`${prefix}.incomeBase`} className="text-sm">Base</Label>
                <Input 
                  id={`${prefix}.incomeBase`}
                  type="number"
                  {...register(`${prefix}.incomeBase`)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Label htmlFor={`${prefix}.incomeOvertime`} className="text-sm">Overtime</Label>
                <Input 
                  id={`${prefix}.incomeOvertime`}
                  type="number"
                  {...register(`${prefix}.incomeOvertime`)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Label htmlFor={`${prefix}.incomeBonus`} className="text-sm">Bonus</Label>
                <Input 
                  id={`${prefix}.incomeBonus`}
                  type="number"
                  {...register(`${prefix}.incomeBonus`)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Label htmlFor={`${prefix}.incomeCommission`} className="text-sm">Commission</Label>
                <Input 
                  id={`${prefix}.incomeCommission`}
                  type="number"
                  {...register(`${prefix}.incomeCommission`)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Label htmlFor={`${prefix}.incomeOther`} className="text-sm">Other</Label>
                <Input 
                  id={`${prefix}.incomeOther`}
                  type="number"
                  {...register(`${prefix}.incomeOther`)} 
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const FinancialInfoStep = ({ leadData, onSave }: FinancialInfoStepProps) => {
  const [hasCoApplicant, setHasCoApplicant] = useState(false);
  
  // Check if user is married with co-applicant
  useEffect(() => {
    if (leadData.mortgageData?.borrower?.maritalStatus === 'married_applying_with_spouse') {
      setHasCoApplicant(true);
    }
  }, [leadData.mortgageData?.borrower?.maritalStatus]);

  const { register, watch, handleSubmit, control } = useForm({
    defaultValues: {
      primaryEmployment: {
        employmentType: leadData.mortgageData?.employment?.employmentType || "",
        employerName: leadData.mortgageData?.employment?.employerName || "",
        employerStreet: leadData.mortgageData?.employment?.employerAddress || "",
        employerCity: "",
        employerState: "",
        employerZipcode: "",
        positionTitle: leadData.mortgageData?.employment?.jobTitle || "",
        industry: "",
        employerPhone: "",
        startMonth: "",
        startYear: "",
        isFamilyMember: false,
        incomeBase: leadData.mortgageData?.income?.baseIncome || "",
        incomeOvertime: leadData.mortgageData?.income?.overtimeIncome || "",
        incomeBonus: "",
        incomeCommission: "",
        incomeOther: leadData.mortgageData?.income?.otherIncome || ""
      },
      coApplicantEmployment: {
        employmentType: "",
        employerName: "",
        employerStreet: "",
        employerCity: "",
        employerState: "",
        employerZipcode: "",
        positionTitle: "",
        industry: "",
        employerPhone: "",
        startMonth: "",
        startYear: "",
        isFamilyMember: false,
        incomeBase: "",
        incomeOvertime: "",
        incomeBonus: "",
        incomeCommission: "",
        incomeOther: ""
      }
    }
  });

  const onFormSubmit = (data: any) => {
    // Process form data and transform it to match our leadData structure
    const employmentData = {
      employmentType: data.primaryEmployment.employmentType,
      employerName: data.primaryEmployment.employerName,
      employerAddress: `${data.primaryEmployment.employerStreet}, ${data.primaryEmployment.employerCity}, ${data.primaryEmployment.employerState} ${data.primaryEmployment.employerZipcode}`,
      jobTitle: data.primaryEmployment.positionTitle,
      startDate: data.primaryEmployment.startMonth && data.primaryEmployment.startYear ? 
        `${data.primaryEmployment.startYear}-${data.primaryEmployment.startMonth}-01` : "",
      isSelfEmployed: data.primaryEmployment.employmentType === "self_employed",
      industry: data.primaryEmployment.industry,
      employerPhone: data.primaryEmployment.employerPhone,
      isFamilyMember: data.primaryEmployment.isFamilyMember
    };

    // Income data
    const incomeData = {
      baseIncome: data.primaryEmployment.incomeBase || "0",
      overtimeIncome: data.primaryEmployment.incomeOvertime || "0",
      bonusIncome: data.primaryEmployment.incomeBonus || "0",
      commissionIncome: data.primaryEmployment.incomeCommission || "0",
      otherIncome: data.primaryEmployment.incomeOther || "0"
    };

    // Create co-applicant data if applicable
    let coApplicantData = {};
    if (hasCoApplicant) {
      coApplicantData = {
        coApplicant: {
          employmentType: data.coApplicantEmployment.employmentType,
          employerName: data.coApplicantEmployment.employerName,
          employerAddress: `${data.coApplicantEmployment.employerStreet}, ${data.coApplicantEmployment.employerCity}, ${data.coApplicantEmployment.employerState} ${data.coApplicantEmployment.employerZipcode}`,
          jobTitle: data.coApplicantEmployment.positionTitle,
          startDate: data.coApplicantEmployment.startMonth && data.coApplicantEmployment.startYear ? 
            `${data.coApplicantEmployment.startYear}-${data.coApplicantEmployment.startMonth}-01` : "",
          isSelfEmployed: data.coApplicantEmployment.employmentType === "self_employed",
          industry: data.coApplicantEmployment.industry,
          employerPhone: data.coApplicantEmployment.employerPhone,
          isFamilyMember: data.coApplicantEmployment.isFamilyMember,
          income: {
            baseIncome: data.coApplicantEmployment.incomeBase || "0",
            overtimeIncome: data.coApplicantEmployment.incomeOvertime || "0",
            bonusIncome: data.coApplicantEmployment.incomeBonus || "0",
            commissionIncome: data.coApplicantEmployment.incomeCommission || "0",
            otherIncome: data.coApplicantEmployment.incomeOther || "0"
          }
        }
      };
    }

    // Update leadData with new information
    const updatedLeadData: Partial<LeadProfile> = {
      mortgageData: {
        ...(leadData.mortgageData || {}),
        employment: employmentData,
        income: incomeData,
        ...coApplicantData
      }
    };

    onSave(updatedLeadData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 pt-4">
      <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1769aa]">
        Employment History
      </h2>
      <p className="text-center text-gray-600 mb-4">
        Please provide details of your current employment.
      </p>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold text-[#1769aa] mb-3">Primary Borrower Employment</h3>
          <EmploymentForm 
            register={register}
            watch={watch}
            control={control}
            prefix="primaryEmployment"
          />
        </div>
        
        {hasCoApplicant && (
          <div>
            <h3 className="text-xl font-semibold text-[#1769aa] mb-3">Co-Borrower Employment</h3>
            <EmploymentForm 
              register={register}
              watch={watch}
              control={control}
              prefix="coApplicantEmployment"
            />
          </div>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full bg-[#1769aa] text-white hover:bg-[#145089] text-lg rounded-xl py-4 mt-6"
      >
        Complete
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
};

export default FinancialInfoStep;
