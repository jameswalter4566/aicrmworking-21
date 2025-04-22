import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText, FolderClosed, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Color palette
const categoryColors = [
  "bg-[#9b87f5]", // Primary Purple
  "bg-[#7E69AB]",
  "bg-[#8E9196]",
  "bg-[#1A1F2C]",
  "bg-[#F1F1F1] text-[#1A1F2C]",
  "bg-sky-200",
  "bg-pink-200",
  "bg-green-200",
  "bg-yellow-200",
  "bg-teal-200",
  "bg-orange-200",
  "bg-gray-200",
  "bg-purple-300",
  "bg-emerald-200",
  "bg-orange-100"
];

const DOCUMENT_STRUCTURE = [
  {
    name: "Identification",
    subcategories: [
      "Driver’s License",
      "Social Security Card",
      "Passport"
    ]
  },
  {
    name: "Income",
    subcategories: [
      "Pay Stubs",
      "W-2s / 1099s",
      "Tax Returns (1040s, K-1s, etc.)",
      "Profit & Loss Statements",
      "Social Security / Pension Award Letters",
      "Unemployment Benefits",
      "Child Support / Alimony Income"
    ]
  },
  {
    name: "Assets",
    subcategories: [
      "Bank Statements",
      "Retirement Account Statements",
      "Investment Statements",
      "Gift Letters",
      "Asset Verification Forms"
    ]
  },
  {
    name: "Property Documents",
    subcategories: [
      "Purchase Agreement",
      "Appraisal Report",
      "Homeowners Insurance",
      "Flood Insurance",
      "Title Report / Title Commitment",
      "Preliminary Title",
      "Survey",
      "Pest Inspection",
      "Property Photos"
    ]
  },
  {
    name: "Credit & Liabilities",
    subcategories: [
      "Credit Report",
      "Credit Explanation Letter",
      "Student Loan Statements",
      "Car Loan / Lease Docs",
      "Credit Card Statements"
    ]
  },
  {
    name: "Employment / VOE",
    subcategories: [
      "Written Verification of Employment (VOE)",
      "Verbal VOE",
      "Employer Letters"
    ]
  },
  {
    name: "Compliance / Disclosures",
    subcategories: [
      "Loan Estimate (LE)",
      "Closing Disclosure (CD)",
      "Truth in Lending (TIL)",
      "Right to Cancel Notice",
      "ECOA / Fair Lending Disclosure",
      "eConsent",
      "Initial & Final Disclosures"
    ]
  },
  {
    name: "Legal",
    subcategories: [
      "Divorce Decree",
      "Child Support Order",
      "Bankruptcy Discharge",
      "Power of Attorney",
      "Trust Documentation"
    ]
  },
  {
    name: "HOA Documents",
    subcategories: [
      "HOA Questionnaire",
      "HOA Dues Statement",
      "HOA Insurance Certificate"
    ]
  },
  {
    name: "Underwriting Conditions",
    subcategories: [
      "Letter of Explanation (LOE)",
      "Condition Clearing Docs",
      "Risk Assessment Docs",
      "AUS Findings (DU/LP)"
    ]
  },
  {
    name: "Title & Escrow",
    subcategories: [
      "Escrow Instructions",
      "Title Insurance",
      "Settlement Statement (HUD-1 / ALTA)",
      "Wiring Instructions",
      "Bailee Letter"
    ]
  },
  {
    name: "Mortgage Insurance",
    subcategories: [
      "MI Certificate",
      "MI Application",
      "MI Cancellation Request"
    ]
  },
  {
    name: "Investor / Funding",
    subcategories: [
      "Purchase Advice",
      "Loan Purchase Agreement",
      "Investor Commitment"
    ]
  },
  {
    name: "Audit / Quality Control",
    subcategories: [
      "Pre-Funding QC Review",
      "Post-Closing Audit Docs",
      "Fraud Check / Compliance Reports"
    ]
  },
  {
    name: "Other / Miscellaneous",
    subcategories: [
      "Notes from Borrower",
      "Correspondence",
      "Internal Memos",
      "Supporting Docs Not Elsewhere Categorized"
    ]
  }
];

// For simplicity, fake uploaded docs for demo (You will hook this into backend later)
const fakeUploads = {
  "Pay Stubs": true,
  "Driver’s License": true,
  // ... other stubbed data as needed
};

type SmartDocumentSidebarProps = {
  onSelect?: (category: string, subcategory: string) => void;
  activeCategory?: string;
  activeSubcategory?: string;
};

export const SmartDocumentSidebar: React.FC<SmartDocumentSidebarProps> = ({
  onSelect,
  activeCategory,
  activeSubcategory
}) => {
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [onlyShowWithFiles, setOnlyShowWithFiles] = useState(false);

  // For real implementation, you would check uploads based on available data.
  const isUploaded = (subcategory: string) => {
    // Placeholder: stub logic
    if (!onlyShowWithFiles) return true;
    return !!fakeUploads[subcategory];
  };

  const handleCategoryClick = (cat: string) => {
    setOpenCategories((prev) =>
      prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat]
    );
  };

  return (
    <aside className="w-80 min-w-[16rem] max-w-xs h-full p-3 flex flex-col bg-[#F1F1F1] border-r border-neutral-200">
      {/* Filter Checkbox */}
      <div className="flex items-center mb-4 pl-2">
        <Checkbox
          id="show-with-files"
          checked={onlyShowWithFiles}
          onCheckedChange={(checked) => setOnlyShowWithFiles(!!checked)}
        />
        <label htmlFor="show-with-files" className="ml-2 font-medium text-sm text-[#7E69AB]">
          Only show documents that contain files
        </label>
      </div>
      <nav className="flex-1 overflow-y-auto pb-6 pr-1">
        {DOCUMENT_STRUCTURE.map((cat, idx) => {
          const colorClass = categoryColors[idx % categoryColors.length];
          const isOpen = openCategories.includes(cat.name);
          return (
            <div
              key={cat.name}
              className={cn(
                "rounded-xl mb-4 transition-shadow shadow-sm",
                colorClass,
                isOpen ? "ring-2 ring-[#9b87f5]" : ""
              )}
            >
              {/* Category Header */}
              <button
                onClick={() => handleCategoryClick(cat.name)}
                className={cn(
                  "flex items-center w-full px-4 py-3 rounded-xl text-base font-semibold justify-between focus:outline-none",
                  colorClass,
                  isOpen
                    ? "border-b-2 border-[#7E69AB]"
                    : "border-0"
                )}
              >
                <span className="flex items-center gap-2 text-inherit">
                  <FolderClosed className="h-5 w-5" />
                  {cat.name}
                </span>
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              {/* Subcategory List */}
              {isOpen && (
                <ul className="py-2 pl-10 pr-2">
                  {cat.subcategories.filter(isUploaded).map((sub) => (
                    <li key={sub} className="mb-2 last:mb-0">
                      <button
                        onClick={() => onSelect?.(cat.name, sub)}
                        className={cn(
                          "flex items-center w-full px-3 py-1.5 rounded-md text-[15px] font-medium transition-colors",
                          colorClass,
                          activeSubcategory === sub
                            ? "outline-none ring-2 ring-[#7E69AB] bg-opacity-90"
                            : "opacity-90 hover:bg-opacity-70"
                        )}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {sub}
                        {/* Demo: show uploaded icon if present */}
                        {fakeUploads[sub] && (
                          <CheckSquare className="ml-auto h-4 w-4 text-green-500" />
                        )}
                      </button>
                    </li>
                  ))}
                  {/* If no items after filtering, show empty state */}
                  {cat.subcategories.filter(isUploaded).length === 0 && (
                    <li className="text-xs text-gray-500 italic py-2 px-2">No documents uploaded</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default SmartDocumentSidebar;
