
import React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Phone, Mail, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  lastActivity: string;
  time: string;
  stage: string;
  assigned: string;
  avatar?: string;
}

interface ActivityTableProps {
  contacts: Contact[];
}

const ActivityTable = ({ contacts }: ActivityTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white divide-y divide-gray-200 rounded-md border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Activity
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stage
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assigned
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {contacts.map((contact) => (
            <tr key={contact.id} className="table-row">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8">
                    <Avatar>
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} />
                      ) : (
                        <span className="text-xs">{contact.name.charAt(0)}</span>
                      )}
                    </Avatar>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-crm-blue">{contact.email}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 flex items-center">
                  <Phone className="h-4 w-4 text-green-500 mr-1" />
                  {contact.phone}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 flex items-center">
                  <Mail className="h-4 w-4 text-gray-400 mr-1" />
                  {contact.lastActivity}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-1" />
                  {contact.time}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge variant="outline" className="bg-crm-lightBlue text-crm-blue">
                  {contact.stage}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {contact.assigned}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActivityTable;
