
import React from "react";
import { X } from "lucide-react";

type NotificationType = "onboarding" | "document";

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  createdAt: string;
}

interface NotificationStripProps {
  notification: Notification;
  onClear: (id: string) => void;
}

const NotificationStrip: React.FC<NotificationStripProps> = ({
  notification,
  onClear,
}) => {
  // Use different colors for each type
  const colors =
    notification.type === "onboarding"
      ? "bg-green-50 border-green-400 text-green-700"
      : "bg-blue-50 border-blue-400 text-blue-900";
  const icon =
    notification.type === "onboarding"
      ? (
          // Bell ring for onboarding
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8a6 6 0 10-12 0c0 7-3 9-3 10h18c0-1-3-3-3-10zM13.73 21a2 2 0 01-3.46 0" />
          </svg>
        )
      : (
          // Bell for document upload
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8a6 6 0 00-12 0c0 7-3 9-3 10h18c0-1-3-3-3-10zM13.73 21a2 2 0 01-3.46 0" />
          </svg>
        );

  return (
    <div className={`flex items-center justify-between border-l-4 rounded-md px-4 py-3 mb-2 shadow-sm ${colors}`}>
      <div className="flex items-center">
        {icon}
        <div>
          <div className="font-medium">{notification.message}</div>
          <div className="text-xs text-gray-500">{new Date(notification.createdAt).toLocaleString()}</div>
        </div>
      </div>
      <button
        className="ml-4 p-1 rounded hover:bg-gray-100"
        onClick={() => onClear(notification.id)}
        aria-label="Clear notification"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default NotificationStrip;
