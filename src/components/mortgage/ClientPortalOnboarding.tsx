import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LeadProfile, leadProfileService } from '@/services/leadProfile';

interface OnboardingStep {
  title: string;
  description: string;
  component: React.ReactNode;
}

interface ClientPortalOnboardingProps {
  leadId: number | string;
  onComplete: () => void;
  initialData?: LeadProfile;
}

export const ClientPortalOnboarding = ({ leadId, onComplete, initialData }: ClientPortalOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [leadData, setLeadData] = useState<LeadProfile>(initialData || {});

  const PersonalInfoStep = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input 
            id="firstName" 
            value={leadData.firstName || ''} 
            onChange={(e) => setLeadData({...leadData, firstName: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="middleName">Middle Name (optional)</Label>
          <Input 
            id="middleName" 
            value={(leadData.mortgageData?.borrower?.fullLegalName?.split(' ')[1]) || ''}
            onChange={(e) => {
              const firstName = leadData.mortgageData?.borrower?.fullLegalName?.split(' ')[0] || leadData.firstName || '';
              const lastName = leadData.mortgageData?.borrower?.fullLegalName?.split(' ').slice(2).join(' ') || leadData.lastName || '';
              const fullLegalName = `${firstName} ${e.target.value} ${lastName}`.trim();
              
              setLeadData({
                ...leadData, 
                mortgageData: {
                  ...leadData.mortgageData,
                  borrower: {
                    ...leadData.mortgageData?.borrower,
                    fullLegalName: fullLegalName
                  }
                }
              });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input 
            id="lastName" 
            value={leadData.lastName || ''} 
            onChange={(e) => setLeadData({...leadData, lastName: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone1">Primary Phone</Label>
          <Input 
            id="phone1" 
            value={leadData.phone1 || ''} 
            onChange={(e) => setLeadData({...leadData, phone1: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            value={leadData.email || ''} 
            onChange={(e) => setLeadData({...leadData, email: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmEmail">Confirm Email</Label>
          <Input 
            id="confirmEmail" 
            value={leadData.email || ''} 
            onChange={(e) => {
              setLeadData({...leadData, email: e.target.value})
            }}
          />
        </div>
      </div>
    </div>
  );

  const PropertyInfoStep = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="propertyAddress">Property Address (if different from mailing address)</Label>
        <Input 
          id="propertyAddress" 
          value={leadData.propertyAddress || ''} 
          onChange={(e) => setLeadData({...leadData, propertyAddress: e.target.value})}
          placeholder="Enter the property address"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="mailingAddress">Current Mailing Address</Label>
        <Input 
          id="mailingAddress" 
          value={leadData.mailingAddress || ''} 
          onChange={(e) => setLeadData({...leadData, mailingAddress: e.target.value})}
          placeholder="Enter your current mailing address"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Property Type</Label>
        <RadioGroup 
          value={leadData.mortgageData?.property?.propertyType || 'SingleFamily'}
          onValueChange={(value) => setLeadData({
            ...leadData, 
            mortgageData: {
              ...leadData.mortgageData,
              property: {
                ...leadData.mortgageData?.property,
                propertyType: value
              }
            }
          })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="SingleFamily" id="propertyType1" />
            <Label htmlFor="propertyType1">Single Family</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Condo" id="propertyType2" />
            <Label htmlFor="propertyType2">Condominium</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="MultiFamily" id="propertyType3" />
            <Label htmlFor="propertyType3">Multi-Family</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="PUD" id="propertyType4" />
            <Label htmlFor="propertyType4">PUD (Planned Unit Development)</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
  
  const CurrentMortgageStep = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Do you currently have a mortgage?</Label>
        <RadioGroup 
          value={leadData.mortgageData?.loan?.loanType === 'Refinance' ? 'yes' : 'no'} 
          onValueChange={(value) => setLeadData({
            ...leadData, 
            mortgageData: {
              ...leadData.mortgageData,
              loan: {
                ...leadData.mortgageData?.loan,
                loanType: value === 'yes' ? 'Refinance' : 'Purchase'
              }
            }
          })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="hasLoan-yes" />
            <Label htmlFor="hasLoan-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="hasLoan-no" />
            <Label htmlFor="hasLoan-no">No</Label>
          </div>
        </RadioGroup>
      </div>
      
      {leadData.mortgageData?.loan?.loanType === 'Refinance' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loanBalance">Current Loan Balance ($)</Label>
              <Input 
                id="loanBalance" 
                type="number"
                value={leadData.mortgageData?.loan?.interestRate || ''} 
                onChange={(e) => setLeadData({
                  ...leadData, 
                  mortgageData: {
                    ...leadData.mortgageData,
                    loan: {
                      ...leadData.mortgageData?.loan,
                      interestRate: e.target.value
                    }
                  }
                })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interestRate">Current Interest Rate (%)</Label>
              <Input 
                id="interestRate" 
                type="number"
                step="0.125"
                value={leadData.mortgageData?.loan?.interestRate || ''} 
                onChange={(e) => setLeadData({
                  ...leadData, 
                  mortgageData: {
                    ...leadData.mortgageData,
                    loan: {
                      ...leadData.mortgageData?.loan,
                      interestRate: e.target.value
                    }
                  }
                })}
                placeholder="0.0"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mortgageInsurance">Current Monthly Payment ($)</Label>
            <Input 
              id="mortgageInsurance" 
              type="number"
              value={leadData.mortgageData?.loan?.mortgageInsurance || ''} 
              onChange={(e) => setLeadData({
                ...leadData, 
                mortgageData: {
                  ...leadData.mortgageData,
                  loan: {
                    ...leadData.mortgageData?.loan,
                    mortgageInsurance: e.target.value
                  }
                }
              })}
              placeholder="0"
            />
          </div>
        </>
      )}
    </div>
  );
  
  const LoanPreferencesStep = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>What is your primary goal for this mortgage?</Label>
        <RadioGroup 
          value={leadData.mortgageData?.loan?.loanType || 'Purchase'} 
          onValueChange={(value) => setLeadData({
            ...leadData, 
            mortgageData: {
              ...leadData.mortgageData,
              loan: {
                ...leadData.mortgageData?.loan,
                loanType: value
              }
            }
          })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Purchase" id="purpose1" />
            <Label htmlFor="purpose1">Purchasing a new home</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Refinance" id="purpose2" />
            <Label htmlFor="purpose2">Refinancing an existing mortgage</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="CashOut" id="purpose3" />
            <Label htmlFor="purpose3">Cash-out refinance</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="loanType">Preferred Loan Type</Label>
        <Select 
          value={leadData.mortgageData?.loan?.loanType || 'Conventional'} 
          onValueChange={(value) => setLeadData({
            ...leadData, 
            mortgageData: {
              ...leadData.mortgageData,
              loan: {
                ...leadData.mortgageData?.loan,
                loanType: value
              }
            }
          })}
        >
          <SelectTrigger id="loanType">
            <SelectValue placeholder="Select loan type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Conventional">Conventional</SelectItem>
            <SelectItem value="FHA">FHA</SelectItem>
            <SelectItem value="VA">VA</SelectItem>
            <SelectItem value="USDA">USDA</SelectItem>
            <SelectItem value="Jumbo">Jumbo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="loanTerm">Preferred Loan Term</Label>
        <Select 
          value={leadData.mortgageData?.loan?.mortgageTerm || '30'} 
          onValueChange={(value) => setLeadData({
            ...leadData, 
            mortgageData: {
              ...leadData.mortgageData,
              loan: {
                ...leadData.mortgageData?.loan,
                mortgageTerm: value
              }
            }
          })}
        >
          <SelectTrigger id="loanTerm">
            <SelectValue placeholder="Select loan term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30-Year Fixed</SelectItem>
            <SelectItem value="20">20-Year Fixed</SelectItem>
            <SelectItem value="15">15-Year Fixed</SelectItem>
            <SelectItem value="10">10-Year Fixed</SelectItem>
            <SelectItem value="7">7-Year ARM</SelectItem>
            <SelectItem value="5">5-Year ARM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
  
  const FinancialInfoStep = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="baseIncome">Estimated Annual Income ($)</Label>
          <Input 
            id="baseIncome" 
            type="number"
            value={leadData.mortgageData?.income?.baseIncome || ''} 
            onChange={(e) => setLeadData({
              ...leadData, 
              mortgageData: {
                ...leadData.mortgageData,
                income: {
                  ...leadData.mortgageData?.income,
                  baseIncome: e.target.value
                }
              }
            })}
            placeholder="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="creditScoreRange">Estimated Credit Score</Label>
          <Select 
            value={leadData.mortgageData?.borrower?.fullLegalName?.includes('credit:') ? 
              leadData.mortgageData?.borrower?.fullLegalName.split('credit:')[1].trim() : ''} 
            onValueChange={(value) => {
              const currentName = leadData.mortgageData?.borrower?.fullLegalName?.split('credit:')[0] || 
                `${leadData.firstName || ''} ${leadData.lastName || ''}`.trim();
              
              setLeadData({
                ...leadData, 
                mortgageData: {
                  ...leadData.mortgageData,
                  borrower: {
                    ...leadData.mortgageData?.borrower,
                    fullLegalName: `${currentName} credit:${value}`
                  }
                }
              });
            }}
          >
            <SelectTrigger id="creditScore">
              <SelectValue placeholder="Select credit score range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="800+">Excellent (800+)</SelectItem>
              <SelectItem value="740-799">Very Good (740-799)</SelectItem>
              <SelectItem value="670-739">Good (670-739)</SelectItem>
              <SelectItem value="580-669">Fair (580-669)</SelectItem>
              <SelectItem value="<580">Below 580</SelectItem>
              <SelectItem value="unknown">I don't know</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="employmentStatus">Employment Status</Label>
          <Select 
            value={leadData.mortgageData?.employment?.isSelfEmployed ? 'SelfEmployed' : 
                  (leadData.mortgageData?.employment?.employerName ? 'FullTime' : '')} 
            onValueChange={(value) => setLeadData({
              ...leadData, 
              mortgageData: {
                ...leadData.mortgageData,
                employment: {
                  ...leadData.mortgageData?.employment,
                  isSelfEmployed: value === 'SelfEmployed',
                  employerName: value === 'SelfEmployed' ? 'Self Employed' : 
                               (value === 'FullTime' ? 'Full Time Employment' : 
                               (value === 'PartTime' ? 'Part Time Employment' : 
                               (value === 'Retired' ? 'Retired' : 
                               (value === 'Unemployed' ? 'Unemployed' : ''))))
                }
              }
            })}
          >
            <SelectTrigger id="employmentStatus">
              <SelectValue placeholder="Select employment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FullTime">Full-Time</SelectItem>
              <SelectItem value="PartTime">Part-Time</SelectItem>
              <SelectItem value="SelfEmployed">Self-Employed</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
              <SelectItem value="Unemployed">Unemployed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
  
  const steps: OnboardingStep[] = [
    {
      title: "Confirm Personal Information",
      description: "Please confirm or update your personal details",
      component: PersonalInfoStep
    },
    {
      title: "Property Information",
      description: "Tell us about your property",
      component: PropertyInfoStep
    },
    {
      title: "Current Mortgage",
      description: "Information about your existing mortgage",
      component: CurrentMortgageStep
    },
    {
      title: "Loan Preferences",
      description: "Tell us your mortgage preferences",
      component: LoanPreferencesStep
    },
    {
      title: "Financial Information",
      description: "Help us understand your financial situation",
      component: FinancialInfoStep
    }
  ];
  
  const saveStepData = async () => {
    setIsLoading(true);
    try {
      await leadProfileService.updateLead(leadId, leadData);
      toast.success("Information saved successfully");
    } catch (error) {
      console.error("Error saving lead data:", error);
      toast.error("Failed to save information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNext = async () => {
    await saveStepData();
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{steps[currentStep].title}</CardTitle>
        <CardDescription>{steps[currentStep].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {steps.map((_, index) => (
              <div 
                key={index}
                className={`relative flex items-center justify-center w-8 h-8 rounded-full ${
                  index < currentStep 
                    ? 'bg-green-500 text-white' 
                    : index === currentStep 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
                
                {index < steps.length - 1 && (
                  <div className={`absolute top-1/2 left-full h-0.5 w-full -translate-y-1/2 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-xs text-center text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>
        
        {steps[currentStep].component}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0 || isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : currentStep < steps.length - 1 ? (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Complete
              <Check className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
