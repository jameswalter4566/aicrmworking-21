import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  PhoneCall,
  Users,
  MessageCircle,
  BarChart3,
  FileText,
  Settings,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="fixed left-0 top-0 h-full w-16 md:w-64 bg-gray-900 text-white z-10 transition-all duration-300 ease-in-out">
      <div className="p-4 flex items-center justify-center md:justify-start">
        {/* Logo would go here */}
      </div>

      <nav className="mt-8">
        <ul className="space-y-2 px-2">
          {/* Keep existing links */}
          
          {/* Add the Power Dialer link */}
          <li>
            <Link
              to="/power-dialer"
              className={cn(
                "flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors",
                isActive("/power-dialer") && "bg-gray-700"
              )}
            >
              <PhoneCall className="h-5 w-5" />
              <span className="ml-3 hidden md:block">Power Dialer</span>
            </Link>
          </li>
          
          {/* Add the Predictive Dialer link */}
          <li>
            <Link
              to="/predictive-dialer"
              className={cn(
                "flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors",
                isActive("/predictive-dialer") && "bg-gray-700"
              )}
            >
              <Phone className="h-5 w-5" />
              <span className="ml-3 hidden md:block">Predictive Dialer</span>
            </Link>
          </li>
          
          {/* Keep rest of existing links */}
        </ul>
      </nav>
      
      {/* User profile section would go here */}
    </div>
  );
};

export default Sidebar;
