
import React from "react";

interface Feature {
  title: string;
  description: string;
}

const industryFeatures: Record<'mortgage' | 'realEstate' | 'debtSettlement', Feature[]> = {
  mortgage: [
    {
      title: "AI Loan Officer",
      description: "Advanced AI assistant trained in mortgage processes to help qualify leads and handle common questions"
    },
    {
      title: "Quick Pricer",
      description: "Instantly calculate and compare loan scenarios with real-time market rates"
    },
    {
      title: "Processor Assist",
      description: "Automated file review and condition clearing to accelerate loan processing"
    },
    {
      title: "Pitch Deck Pro",
      description: "Create professional loan presentations with automated comparisons and analytics"
    },
    {
      title: "Smart 1003",
      description: "AI-powered loan application builder that extracts data from documents automatically"
    }
  ],
  realEstate: [
    {
      title: "AI Realtor",
      description: "Virtual assistant trained to handle property inquiries and schedule showings"
    },
    {
      title: "Listing Presentation Builder",
      description: "Create stunning property presentations with market analysis and comps"
    },
    {
      title: "Property Analytics",
      description: "Real-time market data and neighborhood insights for better pricing decisions"
    },
    {
      title: "Open House Manager",
      description: "Digital sign-in and automated follow-up for open house visitors"
    },
    {
      title: "Transaction Coordinator",
      description: "Automated checklist and deadline tracking for real estate transactions"
    }
  ],
  debtSettlement: [
    {
      title: "Debt Analysis AI",
      description: "Automated debt analysis and settlement probability calculator"
    },
    {
      title: "Creditor Negotiation Assistant",
      description: "AI-powered templates and scripts for creditor negotiations"
    },
    {
      title: "Payment Scheduler",
      description: "Smart payment planning and tracking for debt settlement plans"
    },
    {
      title: "Settlement Calculator",
      description: "Real-time calculations for potential settlement savings"
    },
    {
      title: "Progress Tracker",
      description: "Visual debt reduction progress tracking for clients"
    }
  ]
};

interface IndustryFeaturesProps {
  industry: 'mortgage' | 'realEstate' | 'debtSettlement';
}

export const IndustryFeatures = ({ industry }: IndustryFeaturesProps) => {
  const features = industryFeatures[industry];
  
  return (
    <div className="p-6 space-y-8">
      <h2 className="text-lg font-semibold text-gray-900">Key Features</h2>
      <div className="space-y-6">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start">
            <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <div className="ml-4">
              <h3 className="text-base font-medium text-gray-900">{feature.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
