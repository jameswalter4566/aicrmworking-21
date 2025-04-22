import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText, FolderClosed, CheckSquare, ArrowLeft, Box } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Rainbow/varied solid color backgrounds for each category (no gradients)
const categoryColors = [
  "bg-[#ea384c] text-white", // red
  "bg-[#F97316] text-white", // orange
  "bg-[#FEF7CD] text-black", // yellow (dark text)
  "bg-[#63e6be] text-white", // green
  "bg-[#33C3F0] text-white", // sky blue
  "bg-[#3B82F6] text-white", // blue
  "bg-[#8B5CF6] text-white", // vivid purple
  "bg-[#D946EF] text-white", // magenta pink
  "bg-[#36cfc9] text-white", // teal-aqua
  "bg-[#f472b6] text-white", // pink
  "bg-[#60a5fa] text-white", // cornflower blue
  "bg-[#e879f9] text-white", // light purple
  "bg-[#fde68a] text-black", // pale yellow (dark text)
  "bg-[#fbbf24] text-white", // gold
  "bg-[#34d399] text-white"  // emerald green
];

// Inserted at the top
const DROPBOX_OPTION = {
  isDropbox: true,
  name: "Dropbox",
  icon: Box,
};

// Document structure as before
const DOCUMENT_STRUCTURE = [
  // starts at index 1 for colors, since index 0 = Dropbox
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
  onSelect?: (category: string, subcategory: string | null) => void;
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

  // Combine Dropbox at the top with normal categories
  const allCategories = [
    DROPBOX_OPTION,
    ...DOCUMENT_STRUCTURE.map((cat, i) => ({
      ...cat,
      colorClass: categoryColors[(i + 1) % categoryColors.length],
      index: i + 1
    }))
  ];

  return (
    <aside
      className={cn(
        "w-80 min-w-[16rem] max-w-xs h-full pt-7 px-3 pb-6 flex flex-col border-r border-neutral-200 shadow-2xl bg-blue-500/60 rounded-tr-3xl text-white"
      )}
      style={{
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)",
        borderTopRightRadius: "2rem",
      }}
    >
      {/* Back Button + Label */}
      <div className="flex items-center pl-1 pb-3 mb-2 gap-2 select-none text-white">
        <button
          className="flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition w-10 h-10 text-white border border-white/30 shadow-md"
          onClick={() => navigate(-1)}
          aria-label="Go Back"
          type="button"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <span className="ml-2 text-xl font-extrabold text-white tracking-wide">File Manager</span>
      </div>
      {/* Filter Checkbox */}
      <div className="flex items-center mb-6 pl-2 text-white">
        <Checkbox
          id="show-with-files"
          checked={onlyShowWithFiles}
          onCheckedChange={(checked) => setOnlyShowWithFiles(!!checked)}
        />
        <label htmlFor="show-with-files" className="ml-4 font-semibold text-base text-white select-none">
          Only show documents that contain files
        </label>
      </div>
      <nav className="flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-4">
          {/* Dropbox category */}
          <div
            key="Dropbox"
            className={cn(
              "rounded-2xl shadow-lg transition-shadow bg-[#0ea5e9] hover:bg-[#0369a1] text-white font-bold border-2 border-blue-100",
              activeCategory === "Dropbox" ? "ring-2 ring-white/80 scale-[1.01]" : ""
            )}
          >
            <button
              onClick={() => onSelect?.("Dropbox", null)}
              className={cn(
                "flex items-center w-full px-5 py-4 rounded-2xl text-lg font-bold justify-between focus:outline-none"
              )}
            >
              <span className="flex items-center gap-3">
                <Box className="h-5 w-5" />
                Dropbox
              </span>
            </button>
          </div>
          {/* Document categories */}
          {DOCUMENT_STRUCTURE.map((cat, idx) => {
            const colorClass = categoryColors[(idx + 1) % categoryColors.length];
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
                <button
                  onClick={() => handleCategoryClick(cat.name)}
                  className={cn(
                    "flex items-center w-full px-5 py-3 rounded-2xl text-lg font-bold justify-between focus:outline-none",
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
                {isOpen && (
                  <ul className="py-3 px-3 flex flex-col gap-3">
                    {cat.subcategories.filter(isUploaded).map((sub) => (
                      <li key={sub}>
                        <button
                          onClick={() => onSelect?.(cat.name, sub)}
                          className={cn(
                            "flex items-center w-full px-4 py-2 rounded-xl font-medium text-base border-2 outline-none transition-transform duration-150 group",
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
