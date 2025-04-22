
import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText, FolderClosed, CheckSquare, Square, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Transparent blue background (tailwind: bg-blue-500/60), text-white, rounded top-right, shadow
const sidebarBg = "bg-blue-500/60";
const roundedTopRight = "rounded-tr-3xl";
const whiteText = "text-white";

// Solid background color for each category
const categoryColors = [
  "bg-[#394268]", // deep blue for contrast (adjust as needed)
  "bg-[#3b2b63]",
  "bg-[#3C6997]",
  "bg-[#1A1F2C]",
  "bg-[#4A5E80]",
  "bg-[#335C81]",
  "bg-[#2F4858]",
  "bg-[#183153]",
  "bg-[#255C99]",
  "bg-[#3A506B]",
  "bg-[#1A535C]",
  "bg-[#235789]",
  "bg-[#1F4068]",
  "bg-[#374785]",
  "bg-[#24305E]"
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
  const navigate = useNavigate();

  const isUploaded = (subcategory: string) => {
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
    <aside
      className={cn(
        "w-80 min-w-[16rem] max-w-xs h-full pt-7 px-3 pb-6 flex flex-col border-r border-neutral-200 shadow-2xl",
        sidebarBg,
        roundedTopRight
      )}
      style={{
        // Add a subtle glass effect, blue transparency
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)",
        borderTopRightRadius: "2rem",
      }}
    >
      {/* Back Button + Label */}
      <div className="flex items-center pl-1 pb-3 mb-2 gap-2 select-none">
        <button
          className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition w-10 h-10 text-white border border-white/30 shadow-md"
          onClick={() => navigate(-1)}
          aria-label="Go Back"
          type="button"
        >
          {/* Left Arrow, horizontal */}
          <ArrowLeft className="h-6 w-6" />
        </button>
        <span className="ml-2 text-xl font-extrabold text-white tracking-wide">File Manager</span>
      </div>
      {/* Filter Checkbox */}
      <div className="flex items-center mb-6 pl-2">
        <Checkbox
          id="show-with-files"
          checked={onlyShowWithFiles}
          onCheckedChange={(checked) => setOnlyShowWithFiles(!!checked)}
        />
        <label htmlFor="show-with-files" className="ml-2 font-medium text-sm text-white select-none">
          Only show documents that contain files
        </label>
      </div>
      <nav className="flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-4">
          {DOCUMENT_STRUCTURE.map((cat, idx) => {
            const colorClass = categoryColors[idx % categoryColors.length];
            const isOpen = openCategories.includes(cat.name);

            return (
              <div
                key={cat.name}
                className={cn(
                  "rounded-2xl shadow-lg transition-shadow",
                  colorClass,
                  isOpen ? "ring-2 ring-white/80" : ""
                )}
              >
                {/* Category Header */}
                <button
                  onClick={() => handleCategoryClick(cat.name)}
                  className={cn(
                    "flex items-center w-full px-5 py-3 rounded-2xl text-lg font-bold justify-between focus:outline-none",
                    whiteText,
                    isOpen ? "border-b-2 border-white/30" : "border-0",
                    colorClass
                  )}
                >
                  <span className="flex items-center gap-2">
                    <FolderClosed className="h-5 w-5" />
                    {cat.name}
                  </span>
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                {/* Subcategory List */}
                {isOpen && (
                  <ul className="py-3 px-3 flex flex-col gap-3">
                    {cat.subcategories.filter(isUploaded).map((sub) => (
                      <li key={sub}>
                        <button
                          onClick={() => onSelect?.(cat.name, sub)}
                          className={cn(
                            "flex items-center w-full px-4 py-2 rounded-xl font-medium text-base border-2 outline-none transition-transform duration-150 group",
                            whiteText,
                            activeSubcategory === sub
                              ? "border-white bg-white/20 ring-2 ring-white/70 scale-[1.025] font-bold"
                              : "border-[#8E9196] bg-white/10 hover:bg-white/15 hover:scale-[1.01]",
                            colorClass
                          )}
                          style={{
                            textShadow: "0 1px 8px rgba(20,26,84,0.18)",
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2 opacity-90" />
                          {sub}
                          {fakeUploads[sub] && (
                            <CheckSquare className="ml-auto h-4 w-4 text-green-300" />
                          )}
                        </button>
                      </li>
                    ))}
                    {cat.subcategories.filter(isUploaded).length === 0 && (
                      <li className="text-xs text-white/60 italic py-2 px-2">
                        No documents uploaded
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};

export default SmartDocumentSidebar;

