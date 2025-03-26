

import React from 'react';

const MarketInfo: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <h3 className="text-sm text-gray-500 mb-1">Market Cap</h3>
        <p className="text-lg font-semibold">$1645.0B</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <h3 className="text-sm text-gray-500 mb-1">24h Volume</h3>
        <p className="text-lg font-semibold">$28313</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
        <h3 className="text-sm text-gray-500 mb-1">Circulating Supply</h3>
        <p className="text-lg font-semibold">19M BTC</p>
      </div>
    </div>
  );
};

export default MarketInfo;
