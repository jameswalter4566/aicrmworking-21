import React, { useState, useEffect } from 'react';
import { useCallStatus } from '@/hooks/use-call-status';

interface Props {
  sessionId: string | null;
}

export default function PreviewDialerWindow({ sessionId }: Props) {
  const { callStatuses } = useCallStatus(sessionId);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Call Status</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-300"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Call Status Updates</h3>
        {Object.entries(callStatuses).map(([callSid, status]) => (
          <div key={callSid} className="text-sm mb-2 p-2 bg-gray-700 rounded">
            <div className="flex justify-between">
              <span className="font-medium">
                {status.phoneNumber || 'Unknown Number'}
              </span>
              <span className={`px-2 py-0.5 rounded ${
                status.status === 'completed' ? 'bg-green-600' :
                status.status === 'in-progress' ? 'bg-blue-600' :
                status.status === 'failed' ? 'bg-red-600' :
                'bg-gray-600'
              }`}>
                {status.status}
              </span>
            </div>
            {status.errorMessage && (
              <p className="text-red-400 mt-1 text-xs">{status.errorMessage}</p>
            )}
            {status.duration && (
              <p className="text-gray-400 mt-1 text-xs">
                Duration: {status.duration}s
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
