
export interface LeadProfile {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  mailingAddress?: string;
  propertyAddress?: string;
  disposition?: string;
  tags?: string[];
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  isMortgageLead?: boolean;
  addedToPipelineAt?: string;
  mortgageData?: {
    onboardingCompleted?: boolean;
    creditScore?: string;
    property?: {
      subjectPropertyAddress?: string;
      propertyType?: string;
      propertyValue?: string;
      occupancy?: string;
      loanPurpose?: string;
      loanAmount?: string;
    };
    loan?: {
      loanType?: string;
      mortgageTerm?: string;
      currentRate?: string;
      currentPayment?: string;
    };
    employment?: {
      employmentStatus?: string;
      employerName?: string;
      jobTitle?: string;
      isSelfEmployed?: boolean;
    };
    income?: {
      baseIncome?: string;
    };
    liabilities?: {
      monthlyPayments?: string;
    };
    [key: string]: any;
  };
  [key: string]: any;
}
