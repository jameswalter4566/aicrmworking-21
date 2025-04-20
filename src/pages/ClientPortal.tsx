
// Find the HomeTab component and modify the grid section
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
  <div className="p-6 bg-sky-400 bg-opacity-30 rounded-xl shadow-lg">
    <h3 className="font-medium text-white mb-4">New Loan Details</h3>
    <div className="space-y-3">
      <div className="flex justify-between text-white">
        <span className="text-gray-200">Loan Amount:</span>
        <span className="font-medium">${clientData.loanAmount.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-white">
        <span className="text-gray-200">Interest Rate:</span>
        <span className="font-medium">{clientData.interestRate}%</span>
      </div>
      <div className="flex justify-between text-white">
        <span className="text-gray-200">Term:</span>
        <span className="font-medium">{clientData.loanTerm} years</span>
      </div>
      <div className="flex justify-between text-white">
        <span className="text-gray-200">Monthly Payment:</span>
        <span className="font-medium">${clientData.monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
      </div>
    </div>
  </div>

  <div className="p-6 bg-green-600 rounded-xl shadow-lg">
    <h3 className="font-medium text-white mb-4">Your Savings</h3>
    <div className="text-center">
      <div className="mb-2">
        <div className="text-gray-100 mb-1">Monthly Savings</div>
        <div className="text-3xl font-bold text-white">
          ${clientData.savingsPerMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        </div>
      </div>
      <div className="text-sm text-gray-100">
        (${(clientData.savingsPerMonth * 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} per year)
      </div>
    </div>
  </div>
</div>
