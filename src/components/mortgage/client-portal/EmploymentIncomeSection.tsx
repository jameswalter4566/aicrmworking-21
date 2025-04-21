
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

type EmploymentType = "employed" | "self_employed" | "unemployed" | "retired" | "";

const initialFields = {
  employmentType: "" as EmploymentType,
  employerName: "",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressZip: "",
  industry: "",
  phone: "",
  position: "",
  startMonth: "",
  startYear: "",
  isRelated: false,
  incomeBase: "",
  incomeOvertime: "",
  incomeBonus: "",
  incomeCommission: "",
  incomeOther: "",
};

const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export default function EmploymentIncomeSection() {
  const [fields, setFields] = useState(initialFields);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields({ ...fields, [e.target.name]: e.target.value });
  };
  const handleSelect = (name: string, value: string) => {
    setFields({ ...fields, [name]: value });
  };

  const handleCheckbox = (checked: boolean) => {
    setFields({ ...fields, isRelated: checked });
  };

  // Only show form if user selects a type:
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Employment & Income</CardTitle>
        <CardDescription>
          Please provide your current employment and income details below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label>Employment Type</Label>
          <Select
            value={fields.employmentType}
            onValueChange={val => handleSelect("employmentType", val)}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select employment status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employed">Employed</SelectItem>
              <SelectItem value="self_employed">Self-employed</SelectItem>
              <SelectItem value="unemployed">Unemployed</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {fields.employmentType === "employed" || fields.employmentType === "self_employed" ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="employerName">Name of Employer</Label>
                <Input
                  id="employerName"
                  name="employerName"
                  value={fields.employerName}
                  onChange={handleChange}
                  placeholder={fields.employmentType === "self_employed" ? "Name of Business" : "Employer Name"}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  name="industry"
                  value={fields.industry}
                  onChange={handleChange}
                  placeholder="Industry"
                />
              </div>
            </div>
            <div>
              <Label>Employer Address</Label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-1">
                <Input placeholder="Street Address" value={fields.addressStreet} name="addressStreet" onChange={handleChange} />
                <Input placeholder="City" value={fields.addressCity} name="addressCity" onChange={handleChange} />
                <Input placeholder="State" value={fields.addressState} name="addressState" onChange={handleChange} />
                <Input placeholder="Zip" value={fields.addressZip} name="addressZip" onChange={handleChange} />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="phone">Phone of Employer</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={fields.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="position">Position/Title</Label>
                <Input
                  id="position"
                  name="position"
                  value={fields.position}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="startMonth">Start Month</Label>
                <Select
                  value={fields.startMonth}
                  onValueChange={val => handleSelect("startMonth", val)}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="startYear">Start Year</Label>
                <Input
                  id="startYear"
                  name="startYear"
                  type="number"
                  min="1900"
                  value={fields.startYear}
                  onChange={handleChange}
                  placeholder="Year"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="related"
                checked={fields.isRelated}
                onCheckedChange={checked => handleCheckbox(!!checked)}
              />
              <Label htmlFor="related">
                I am employed by a family member, property seller, real estate agent, or other party to the transaction.
              </Label>
            </div>
            <div className="space-y-2 mt-6">
              <h4 className="font-semibold text-gray-800 mb-2">Gross Monthly Income</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  name="incomeBase"
                  value={fields.incomeBase}
                  onChange={handleChange}
                  placeholder="Base"
                  type="number"
                  min="0"
                  prefix="$"
                />
                <Input
                  name="incomeOvertime"
                  value={fields.incomeOvertime}
                  onChange={handleChange}
                  placeholder="Overtime"
                  type="number"
                  min="0"
                  prefix="$"
                />
                <Input
                  name="incomeBonus"
                  value={fields.incomeBonus}
                  onChange={handleChange}
                  placeholder="Bonus"
                  type="number"
                  min="0"
                  prefix="$"
                />
                <Input
                  name="incomeCommission"
                  value={fields.incomeCommission}
                  onChange={handleChange}
                  placeholder="Commission"
                  type="number"
                  min="0"
                  prefix="$"
                />
                <Input
                  name="incomeOther"
                  value={fields.incomeOther}
                  onChange={handleChange}
                  placeholder="Other"
                  type="number"
                  min="0"
                  prefix="$"
                />
              </div>
              <div className="font-medium mt-2">
                Total: ${[
                  fields.incomeBase, 
                  fields.incomeOvertime, 
                  fields.incomeBonus, 
                  fields.incomeCommission, 
                  fields.incomeOther
                ].map(Number).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0).toLocaleString(undefined, {minimumFractionDigits: 2})} per month
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button className="bg-mortgage-purple" disabled>
                Save (Coming Soon)
              </Button>
            </div>
          </div>
        ) : fields.employmentType === "unemployed" || fields.employmentType === "retired" ? (
          <div className="p-4 rounded bg-gray-50 border text-gray-700 animate-fade-in">
            No employment details necessary for this status.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
