
import { useNavigate } from "react-router-dom";
import { TableRow } from "@/components/ui/table";
import { ThoughtlyContact } from "@/services/thoughtly";

interface LeadClickableRowProps {
  lead: ThoughtlyContact;
  children: React.ReactNode;
}

const LeadClickableRow: React.FC<LeadClickableRowProps> = ({ 
  lead, 
  children 
}) => {
  const navigate = useNavigate();
  
  const handleRowClick = () => {
    if (lead.id) {
      navigate(`/lead/${lead.id}`);
    }
  };
  
  return (
    <TableRow 
      onClick={handleRowClick} 
      className="hover:bg-crm-lightBlue transition-all duration-200 cursor-pointer my-4 shadow-sm hover:shadow-md hover:scale-[1.01]"
    >
      {children}
    </TableRow>
  );
};

export default LeadClickableRow;
