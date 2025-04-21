
import React from "react";

const labelClass = "block text-sm font-medium text-gray-700 mb-0.5";
const inputClass = "w-full px-3 py-2 border rounded text-sm bg-gray-50 text-gray-900 placeholder-gray-400 mb-3";

const PersonalInfoPlaceholder: React.FC = () => (
  <div className="max-w-2xl mx-auto mt-4 bg-white rounded-xl shadow p-6 space-y-8">
    <div>
      <h2 className="text-xl font-bold text-mortgage-darkPurple mb-1">Primary Information</h2>
      <hr className="mb-4" />
      <div className="grid grid-cols-4 gap-4">
        {/* Row 1 */}
        <div>
          <label className={labelClass}>First Name</label>
          <input className={inputClass} placeholder="First Name" disabled />
        </div>
        <div>
          <label className={labelClass}>Middle Name</label>
          <input className={inputClass} placeholder="Middle Name" disabled />
        </div>
        <div>
          <label className={labelClass}>Last Name</label>
          <input className={inputClass} placeholder="Last Name" disabled />
        </div>
        <div>
          <label className={labelClass}>Suffix</label>
          <select className={inputClass} disabled>
            <option>Select suffix</option>
          </select>
        </div>
        {/* Row 2 */}
        <div>
          <label className={labelClass}>Social Security Number</label>
          <input className={inputClass} placeholder="XXX-XX-XXXX" disabled />
        </div>
        <div>
          <label className={labelClass}>Date of Birth</label>
          <input className={inputClass} placeholder="mm/dd/yyyy" disabled />
        </div>
        <div>
          <label className={labelClass}>Marital Status</label>
          <select className={inputClass} disabled>
            <option>Select status</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>No. of Dependents</label>
          <input className={inputClass} placeholder="0" disabled />
        </div>
        {/* Row 3 */}
        <div>
          <label className={labelClass}>Age of Dependents</label>
          <input className={inputClass} placeholder="e.g., 10, 12, 15" disabled />
        </div>
        <div>
          <label className={labelClass}>Joined to Borrower</label>
          <input className={inputClass} disabled />
        </div>
        <div>
          <label className={labelClass}>Tax Filing Address Same As</label>
          <input className={inputClass} disabled />
        </div>
        <div>
          <label className={labelClass}>Present Address Same As</label>
          <input className={inputClass} disabled />
        </div>
        {/* Row 4 */}
        <div>
          <label className={labelClass}>Citizenship</label>
          <input className={inputClass} placeholder="U.S. Citizen" disabled />
        </div>
        <div>
          <label className={labelClass}>Veteran</label>
          <input className={inputClass} disabled />
        </div>
        {/* Empty col placeholders for alignment */}
        <div></div>
        <div></div>
      </div>
    </div>

    <div>
      <h3 className="font-semibold text-mortgage-darkPurple mb-2 mt-2">Contact Details</h3>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className={labelClass}>Home Phone Number</label>
          <input className={inputClass} placeholder="(XXX) XXX-XXXX" disabled />
        </div>
        <div>
          <label className={labelClass}>Cell Phone Number</label>
          <input className={inputClass} placeholder="(XXX) XXX-XXXX" disabled />
        </div>
        <div>
          <label className={labelClass}>Work Phone Number</label>
          <input className={inputClass} placeholder="(XXX) XXX-XXXX" disabled />
        </div>
        <div>
          <label className={labelClass}>Ext.</label>
          <input className={inputClass} placeholder="" disabled />
        </div>
        <div>
          <label className={labelClass}>Email Address</label>
          <input className={inputClass} placeholder="" disabled />
        </div>
        <div className="flex items-center pt-7 col-span-3">
          <input type="checkbox" disabled className="mr-2" /> <span>No Email</span>
        </div>
      </div>
    </div>

    <div>
      <h3 className="font-semibold text-mortgage-darkPurple mb-2 mt-2">Address History</h3>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className={labelClass}>Present Address Line 1</label>
          <input className={inputClass} placeholder="Address Line 1" disabled />
        </div>
        <div>
          <label className={labelClass}>Unit #</label>
          <input className={inputClass} placeholder="Unit #" disabled />
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input className={inputClass} placeholder="City" disabled />
        </div>
        <div>
          <label className={labelClass}>State</label>
          <input className={inputClass} placeholder="State" disabled />
        </div>
        <div>
          <label className={labelClass}>ZIP Code</label>
          <input className={inputClass} placeholder="ZIP Code" disabled />
        </div>
        <div>
          <label className={labelClass}>Country</label>
          <input className={inputClass} placeholder="USA" disabled />
        </div>
        <div>
          <label className={labelClass}>Time at Residence (Years)</label>
          <input className={inputClass} placeholder="1" disabled />
        </div>
        <div>
          <label className={labelClass}>Ownership</label>
          <select className={inputClass} disabled>
            <option>Select ownership</option>
          </select>
        </div>
      </div>

      <p className="text-xs mt-2 text-gray-500 col-span-4">
        * If residing at present address for less than two years, then the details of previous address must be added.
      </p>
    </div>

    <div>
      <h4 className="font-semibold text-mortgage-darkPurple mt-4 mb-1">Previous Address Details</h4>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className={labelClass}>Address Line 1</label>
          <input className={inputClass} placeholder="Address Line 1" disabled />
        </div>
        <div>
          <label className={labelClass}>Unit #</label>
          <input className={inputClass} placeholder="Unit #" disabled />
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input className={inputClass} placeholder="City" disabled />
        </div>
        <div>
          <label className={labelClass}>State</label>
          <input className={inputClass} placeholder="State" disabled />
        </div>
        <div>
          <label className={labelClass}>ZIP Code</label>
          <input className={inputClass} placeholder="ZIP Code" disabled />
        </div>
        <div>
          <label className={labelClass}>Country</label>
          <input className={inputClass} placeholder="USA" disabled />
        </div>
        <div>
          <label className={labelClass}>Time at Residence (Years)</label>
          <input className={inputClass} placeholder="" disabled />
        </div>
        <div>
          <label className={labelClass}>Ownership</label>
          <select className={inputClass} disabled>
            <option>Select ownership</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Rent Amount</label>
          <input className={inputClass} placeholder="$" disabled />
        </div>
        <div className="col-span-2"></div>
      </div>
    </div>

    <div>
      <h4 className="font-semibold text-mortgage-darkPurple mt-4 mb-1">Mailing Address</h4>
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-2">
          <label className={labelClass}>Mailing Address</label>
          <input className={inputClass} placeholder="" disabled />
        </div>
        <div className="flex items-center pt-7 col-span-2">
          <input type="checkbox" disabled className="mr-2" /> <span>Same as Present Address</span>
        </div>
      </div>
    </div>
  </div>
);

export default PersonalInfoPlaceholder;
