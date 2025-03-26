

import React from 'react';

const Portfolio: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 animate-fade-in">
      <h2 className="text-xl font-semibold mb-4">Your Portfolio</h2>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Amount Held</span>
          <span className="font-medium">0.015 BTC</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Value</span>
          <span className="font-medium">$1298.70</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Profit/Loss</span>
          <span className="text-green-600 font-medium">+15.2%</span>
        </div>
      </div>

      <button className="w-full mt-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors">
        Sell Now
      </button>
    </div>
  );
};

export default Portfolio;
