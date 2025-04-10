import React from "react";
import PersonalInfoForm from "./Mortgage1003PersonalInfo";

interface Mortgage1003FormProps {
  section: string;
  loanData?: any;
  onSave: (data: any) => void;
}

const Mortgage1003Form: React.FC<Mortgage1003FormProps> = ({ section, loanData, onSave }) => {
  // Render different form sections based on the section parameter
  switch (section) {
    case "personalInfo":
      return (
        <PersonalInfoForm 
          initialData={loanData?.personalInfo} 
          onSave={(data) => onSave(data)} 
        />
      );
    case "employment":
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Employment & Income</h2>
          <p className="text-gray-600">
            Enter employment and income information.
          </p>
          {/* Employment form fields will be implemented here */}
        </div>
      );
    case "assets":
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Assets</h2>
          <p className="text-gray-600">
            Enter information about your assets.
          </p>
          {/* Assets form fields will be implemented here */}
        </div>
      );
    case "liabilities":
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Liabilities</h2>
          <p className="text-gray-600">
            Enter information about your liabilities.
          </p>
          {/* Liabilities form fields will be implemented here */}
        </div>
      );
    case "realEstate":
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Real Estate Owned</h2>
          <p className="text-gray-600">
            Enter information about real estate you own.
          </p>
          {/* Real Estate form fields will be implemented here */}
        </div>
      );
    case "loanInfo":
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Loan Information</h2>
          <p className="text-gray-600">
            Enter information about the loan.
          </p>
          {/* Loan Information form fields will be implemented here */}
        </div>
      );
    case "housingExpenses":
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Housing Expenses</h2>
          <p className="text-gray-600">
            Enter information about your housing expenses.
          </p>
          {/* Housing Expenses form fields will be implemented here */}
        </div>
      );
    case "transaction":
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Details of Transaction</h2>
          <p className="text-gray-600">
            Enter details about the transaction.
          </p>
          {/* Transaction Details form fields will be implemented here */}
        </div>
      );
    case "declarations":
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Declarations</h2>
          <p className="text-gray-600">
            Answer the required declaration questions.
          </p>
          {/* Declarations form fields will be implemented here */}
        </div>
      );
    case "monitoring":
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Government Monitoring</h2>
          <p className="text-gray-600">
            Enter government monitoring information.
          </p>
          {/* Government Monitoring form fields will be implemented here */}
        </div>
      );
    default:
      return (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Form 1003</h2>
          <p className="text-gray-600">
            Please select a section from the menu to continue filling out the form.
          </p>
        </div>
      );
  }
};

export default Mortgage1003Form;
