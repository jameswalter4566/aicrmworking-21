
import React, { useState } from "react";

const labelClass = "block text-sm font-medium text-gray-700 mb-0.5";
const inputClass = "w-full px-3 py-2 border rounded text-sm bg-gray-50 text-gray-900 placeholder-gray-400 mb-3";
const selectClass = "w-full px-3 py-2 border rounded text-sm bg-gray-50 text-gray-900 placeholder-gray-400 mb-3";

const EmploymentIncomePlaceholder: React.FC = () => {
  const [employmentStatus, setEmploymentStatus] = useState<string>("");

  return (
    <div className="max-w-2xl mx-auto mt-4 bg-white rounded-xl shadow p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-mortgage-darkPurple mb-1">Employment & Income</h2>
        <hr className="mb-4" />
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="col-span-4">
            <label className={labelClass}>Employment Status</label>
            <select 
              className={selectClass} 
              disabled
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
            >
              <option value="">Select employment status</option>
              <option value="employed">Employed</option>
              <option value="self-employed">Self Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>
        
        {/* Employee Details - Always shown in placeholder mode */}
        <div className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <input className={inputClass} placeholder="Employed" disabled />
            </div>
            <div>
              <label className={labelClass}>Employer Name</label>
              <input className={inputClass} placeholder="Name of Employer" disabled />
            </div>
            <div>
              <label className={labelClass}>Employer Address</label>
              <input className={inputClass} placeholder="Employer Address Street" disabled />
            </div>
            <div>
              <label className={labelClass}>Street Address</label>
              <input className={inputClass} placeholder="Street Address" disabled />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
            <div>
              <label className={labelClass}>Employer Address City</label>
              <input className={inputClass} placeholder="City" disabled />
            </div>
            <div>
              <label className={labelClass}>Employer Address State</label>
              <input className={inputClass} placeholder="State" disabled />
            </div>
            <div>
              <label className={labelClass}>Employer Address Zipcode</label>
              <input className={inputClass} placeholder="Zipcode" disabled />
            </div>
            <div>
              <label className={labelClass}>Current Position</label>
              <input className={inputClass} placeholder="Position" disabled />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
            <div>
              <label className={labelClass}>Industry</label>
              <input className={inputClass} placeholder="Industry" disabled />
            </div>
            <div>
              <label className={labelClass}>Phone of Employer</label>
              <input className={inputClass} placeholder="Phone Number" disabled />
            </div>
            <div>
              <label className={labelClass}>Position/Title</label>
              <input className={inputClass} placeholder="Position/Title" disabled />
            </div>
            <div>
              <label className={labelClass}>Start Month</label>
              <select className={selectClass} disabled>
                <option>Month</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
            <div>
              <label className={labelClass}>Start Year</label>
              <select className={selectClass} disabled>
                <option>Year</option>
              </select>
            </div>
            <div className="col-span-3 flex items-center pt-4">
              <input type="checkbox" disabled className="mr-2" /> 
              <span className="text-sm">I am employed by a family member, property seller, real estate agent, or other party to the transaction.</span>
            </div>
          </div>
        </div>
        
        {/* Income Information */}
        <div className="mt-6">
          <h3 className="font-semibold text-mortgage-darkPurple mb-2">Gross Monthly Income (per month)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Base</label>
              <input className={inputClass} placeholder="$" disabled />
            </div>
            <div>
              <label className={labelClass}>Overtime</label>
              <input className={inputClass} placeholder="$" disabled />
            </div>
            <div>
              <label className={labelClass}>Bonus</label>
              <input className={inputClass} placeholder="$" disabled />
            </div>
            <div>
              <label className={labelClass}>Commission</label>
              <input className={inputClass} placeholder="$" disabled />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
            <div>
              <label className={labelClass}>Other</label>
              <input className={inputClass} placeholder="$" disabled />
            </div>
            <div>
              <label className={labelClass}>Total Income (per month)</label>
              <input className={inputClass} placeholder="$" disabled />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmploymentIncomePlaceholder;
