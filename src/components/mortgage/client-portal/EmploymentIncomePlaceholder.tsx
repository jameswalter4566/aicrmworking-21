
import React, { useState } from "react";

const statusOptions = [
  { value: "", label: "Select employment status" },
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self-Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "retired", label: "Retired" },
];

const months = [
  { value: "", label: "Month" },
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
  { value: "12", label: "December" },
];

const getYears = () => {
  const now = new Date().getFullYear();
  return Array.from({ length: 50 }, (_, i) => ({
    value: (now - i).toString(),
    label: (now - i).toString()
  }));
};

const labelClass = "block text-sm font-medium text-gray-700 mb-0.5";
const inputClass = "w-full px-3 py-2 border rounded text-sm bg-gray-50 text-gray-900 placeholder-gray-400 mb-3";
const selectClass = inputClass;
const rowClass = "grid grid-cols-1 md:grid-cols-4 gap-4";

const EmploymentIncomePlaceholder: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState("");

  return (
    <div className="max-w-3xl mx-auto mt-6 bg-white rounded-xl shadow p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-mortgage-darkPurple mb-1">Employment & Income</h2>
        <hr className="mb-4" />

        <div className={rowClass}>
          <div>
            <label className={labelClass}>Employment Status</label>
            <select
              className={selectClass}
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              disabled
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {(selectedStatus === "employed" ||
          selectedStatus === "self_employed" ||
          selectedStatus === "") && (
          <>
            <div className={rowClass}>
              <div>
                <label className={labelClass}>Employer Name</label>
                <input className={inputClass} placeholder="Name of Employer" disabled />
              </div>
              <div>
                <label className={labelClass}>Employer Address Street</label>
                <input className={inputClass} placeholder="Street Address" disabled />
              </div>
              <div>
                <label className={labelClass}>Employer Address City</label>
                <input className={inputClass} placeholder="City" disabled />
              </div>
              <div>
                <label className={labelClass}>Employer Address State</label>
                <input className={inputClass} placeholder="State" disabled />
              </div>
            </div>
            <div className={rowClass}>
              <div>
                <label className={labelClass}>Employer Address Zipcode</label>
                <input className={inputClass} placeholder="Zipcode" disabled />
              </div>
              <div>
                <label className={labelClass}>Position/Title</label>
                <input className={inputClass} placeholder="Position/Title" disabled />
              </div>
              <div>
                <label className={labelClass}>Industry</label>
                <input className={inputClass} placeholder="Industry" disabled />
              </div>
              <div>
                <label className={labelClass}>Phone of Employer</label>
                <input className={inputClass} placeholder="Phone Number" disabled />
              </div>
            </div>
            <div className={rowClass}>
              <div>
                <label className={labelClass}>Start Month</label>
                <select className={selectClass} disabled>
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Start Year</label>
                <select className={selectClass} disabled>
                  <option>Year</option>
                  {getYears().map(y => (
                    <option key={y.value} value={y.value}>{y.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center pt-7">
                <input type="checkbox" className="mr-2" disabled />
                <span className="text-sm">I am employed by a family member, property seller, real estate agent, or other party to the transaction.</span>
              </div>
            </div>
            {/* Income section */}
            <div>
              <h4 className="font-semibold text-mortgage-darkPurple mb-2 mt-6">Gross Monthly Income (per month)</h4>
              <div className={rowClass}>
                <div>
                  <label className={labelClass}>Base</label>
                  <input className={inputClass} placeholder="$0.00" disabled />
                </div>
                <div>
                  <label className={labelClass}>Overtime</label>
                  <input className={inputClass} placeholder="$0.00" disabled />
                </div>
                <div>
                  <label className={labelClass}>Bonus</label>
                  <input className={inputClass} placeholder="$0.00" disabled />
                </div>
                <div>
                  <label className={labelClass}>Commission</label>
                  <input className={inputClass} placeholder="$0.00" disabled />
                </div>
              </div>
              <div className={rowClass}>
                <div>
                  <label className={labelClass}>Other</label>
                  <input className={inputClass} placeholder="$0.00" disabled />
                </div>
                <div>
                  <label className={labelClass}>Total Income (per month)</label>
                  <input className={inputClass} placeholder="$0.00" disabled />
                </div>
              </div>
            </div>
          </>
        )}

        {(selectedStatus === "unemployed" || selectedStatus === "retired") && (
          <div className="mt-4 text-gray-500 italic">No employment details required for status: {selectedStatus === "unemployed" ? "Unemployed" : "Retired"}</div>
        )}
      </div>
    </div>
  );
};

export default EmploymentIncomePlaceholder;

