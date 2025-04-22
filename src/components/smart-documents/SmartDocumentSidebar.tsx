import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText, FolderClosed, CheckSquare, Square, ArrowLeft, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const categoryColors = [
  "bg-gradient-to-r from-blue-700 via-purple-500 to-pink-500",
  "bg-gradient-to-r from-green-600 via-lime-400 to-green-300",
  "bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-400",
  "bg-gradient-to-r from-cyan-800 via-teal-500 to-emerald-300",
  "bg-gradient-to-r from-indigo-900 via-blue-600 to-blue-400",
  "bg-gradient-to-r from-red-800 via-orange-500 to-yellow-400",
  "bg-gradient-to-r from-fuchsia-900 via-pink-600 to-pink-200",
  "bg-gradient-to-r from-teal-900 via-green-700 to-emerald-300",
  "bg-gradient-to-r from-rose-700 via-pink-500 to-purple-500",
  "bg-gradient-to-r from-sky-800 via-blue-500 to-indigo-300",
  "bg-gradient-to-r from-violet-800 via-purple-500 to-fuchsia-400",
  "bg-gradient-to-r from-lime-900 via-yellow-400 to-amber-200",
  "bg-gradient-to-r from-gray-900 via-gray-600 to-gray-400",
  "bg-gradient-to-r from-orange-900 via-yellow-500 to-pink-200",
  "bg-gradient-to-r from-slate-700 via-slate-500 to-slate-300"
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
  const [showDropbox, setShowDropbox] = useState(false);
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
        "bg-blue-500/60",
        "rounded-tr-3xl"
      )}
      style={{
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)",
        borderTopRightRadius: "2rem",
      }}
    >
      <div className="flex items-center pl-1 pb-3 mb-2 gap-2 select-none">
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

      <div className="flex items-center gap-3 mb-4 pl-2">
        <button
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 bg-gradient-to-r from-blue-400 to-pink-400 shadow transition", 
            showDropbox ? "ring-2 ring-pink-100" : ""
          )}
          style={{
            color: "#fff",
            fontWeight: 700,
          }}
          onClick={() => setShowDropbox((s) => !s)}
        >
          <Upload className="h-5 w-5 mr-2" />
          Dropbox
        </button>
      </div>
      {showDropbox && (
        <div className="mb-5 px-2">
          <div className="rounded-xl border-4 border-pink-200 bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center py-8 flex-col gap-2">
            <Upload className="text-pink-400 h-12 w-12 mb-2" />
            <div className="text-white text-lg font-semibold">Drop PDF or image files here</div>
            <button className="mt-2 px-4 py-2 rounded-full bg-pink-500/70 text-white shadow hover:bg-pink-600 transition">
              Browse Files
            </button>
            <div className="text-xs text-white/60 mt-2">You can also drag and drop files to upload multiple at once.</div>
          </div>
        </div>
      )}

      <div className="flex items-center mb-6 pl-2">
        <label 
          htmlFor="show-with-files" 
          className="flex items-center gap-3 select-none"
        >
          <span 
            className="relative flex items-center justify-center"
            style={{ width: 28, height: 28 }}
          >
            <input
              id="show-with-files"
              type="checkbox"
              checked={onlyShowWithFiles}
              onChange={() => setOnlyShowWithFiles(!onlyShowWithFiles)}
              className={cn(
                "appearance-none absolute w-full h-full cursor-pointer",
                "z-10"
              )}
              style={{ zIndex: 10 }}
            />
            <span
              className={cn(
                "block rounded-lg border-4 border-white/70",
                "w-7 h-7",
                "bg-blue-200/20",
                "transition-colors"
              )}
              style={{
                boxShadow: onlyShowWithFiles
                  ? "0 0 0 3px #60A5FA88"
                  : undefined,
                borderWidth: "3px",
              }}
            />
            {onlyShowWithFiles && (
              <CheckSquare className="absolute text-blue-400 h-6 w-6 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </span>
          <span className="ml-1 font-medium text-base text-white">
            Only show documents that contain files
          </span>
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
                <button
                  onClick={() => handleCategoryClick(cat.name)}
                  className={cn(
                    "flex items-center w-full px-5 py-3 rounded-2xl text-lg font-bold justify-between focus:outline-none",
                    "text-white",
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
                            "flex items-center w-full px-4 py-3 rounded-xl font-medium text-base border-2 outline-none transition-transform duration-150 group",
                            "text-white",
                            activeSubcategory === sub
                              ? "border-white bg-white/20 ring-2 ring-white/70 scale-[1.025] font-bold"
                              : "border-white/40 bg-white/10 hover:bg-white/15 hover:scale-[1.01]",
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
