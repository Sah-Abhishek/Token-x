"use client"
// components/TradingView.tsx
import React, { useState } from 'react';

const TradingView: React.FC = () => {
  const [activeTimeframe, setActiveTimeframe] = useState('1h');
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];

  return (
    <div className="p-4 bg-white text-black">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Bitcoin (BTC)</h2>
          <div className="flex items-center">
            <span className="text-2xl font-bold mr-2">$42,320.75</span>
            <span className="text-green-500 font-semibold">+2.5%</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className="bg-blue-500 text-white px-3 py-1 rounded-md">Add to Watchlist</button>
          <button className="bg-blue-500 text-white px-3 py-1 rounded-md">Trade Now</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <div className="text-gray-500">Market Cap</div>
          <div className="font-semibold">$800B</div>
        </div>
        <div>
          <div className="text-gray-500">24h Volume</div>
          <div className="font-semibold">$35B</div>
        </div>
        <div>
          <div className="text-gray-500">Circulating Supply</div>
          <div className="font-semibold">19M BTC</div>
        </div>
      </div>

      <div className="flex space-x-2 mb-4 border-b pb-2">
        {timeframes.map(tf => (
          <button
            key={tf}
            className={`px-2 py-1 text-sm rounded ${activeTimeframe === tf
              ? 'bg-blue-500 text-white'
              : 'text-gray-500 hover:bg-gray-100'
              }`}
            onClick={() => setActiveTimeframe(tf)}
          >
            {tf}
          </button>
        ))}
        <div className="ml-auto flex space-x-2">
          <button>📊</button>
          <button>🔍</button>
        </div>
      </div>

      {/* Placeholder for Chart */}
      <div className="h-80 bg-gray-100 flex items-center justify-center">
        Chart Placeholder
      </div>
    </div>
  );
};

export default TradingView;
