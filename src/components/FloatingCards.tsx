
import React from "react";

export const FeatureCard = ({ 
  title, 
  value, 
  icon, 
  className = "" 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  className?: string 
}) => {
  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-4 w-48 text-white ${className}`}>
      <div className="flex items-center">
        <div className="rounded-full bg-blue-500/20 p-2">
          {icon}
        </div>
        <div className="ml-3">
          <div className="text-sm opacity-80">{title}</div>
          <div className="text-xl font-extrabold">{value}</div>
        </div>
      </div>
    </div>
  );
};

export const CouponCard = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`bg-gradient-to-br from-indigo-900/90 to-blue-800/80 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-4 w-64 text-white ${className}`}>
      <div className="font-semibold text-sm mb-1">Coupon Code</div>
      <div className="text-xs opacity-80 mb-3">Save 25% on annual subscriptions</div>
      <div className="flex items-center gap-2">
        <div className="bg-white/10 rounded px-3 py-2 flex-1 text-center font-mono">
          SALES25OFF
        </div>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition-colors">
          Copy
        </button>
      </div>
    </div>
  );
};

export const StatsCard = ({ 
  title, 
  value, 
  icon, 
  className = "" 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  className?: string 
}) => {
  return (
    <div className={`bg-gradient-to-br from-slate-900/90 to-slate-800/80 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-4 w-48 text-white ${className}`}>
      <div className="flex items-center">
        <div className="rounded-full bg-blue-500/20 p-2">
          {icon}
        </div>
        <div className="ml-3">
          <div className="text-xl font-extrabold">{value}</div>
          <div className="text-xs opacity-80">{title}</div>
        </div>
      </div>
    </div>
  );
};

export const PayoutCard = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`bg-gradient-to-br from-gray-900/90 to-slate-800/80 backdrop-blur-md rounded-xl shadow-xl border border-white/20 p-5 w-64 text-white ${className}`}>
      <div className="font-semibold mb-2 flex justify-between items-center">
        <span>Request Payout</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      </div>
      <div className="text-xs opacity-80 mb-2">Requesting amount to be withdrawn</div>
      <div className="text-2xl font-extrabold mb-3">$10,000</div>
      <button className="bg-blue-500 hover:bg-blue-600 transition-colors w-full text-white py-1.5 rounded text-sm">
        Request Payout
      </button>
      <div className="flex justify-between text-xs mt-3 opacity-70">
        <span>Next Available Withdrawal Date:</span>
        <span>2023-04-15</span>
      </div>
    </div>
  );
};
