
import React from "react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const FilterBar = () => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="space-x-2 flex">
        <Select defaultValue="everyone">
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Everyone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="everyone">Everyone</SelectItem>
            <SelectItem value="team">My Team</SelectItem>
            <SelectItem value="me">Just Me</SelectItem>
          </SelectContent>
        </Select>
        
        <Select defaultValue="30days">
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FilterBar;
