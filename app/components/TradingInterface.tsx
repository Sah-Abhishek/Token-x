"use client"
// components/TradingInterface.tsx
import React, { useState } from 'react';

const TradingInterface: React.FC = () => {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');

  return (
    <div className="bg-white p-4 border rounded-md">
      <div className="flex mb-4">
        <button
          className={`w-1/2 py-2 ${orderType === 'market'
            ? 'bg-blue-500 text-white'
            : 'text-gray-500 hover:bg-gray-100'
            }`}
          onClick={() => setOrderType('market')}
        >
          Market Order
        </button>
        <button
          className={`w-1/2 py-2 ${orderType === 'limit'
            ? 'bg-blue-500 text-white'
            : 'text-gray-500 hover:bg-gray-100'
            }`}
          onClick={() => setOrderType('limit')}
        >
          Limit Order
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Amount (BTC)</label>
          <input
            type="text"
            placeholder="0.00"
            className="w-full border rounded-md p-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Estimated Cost (SOL)</label>
          <input
            type="text"
            placeholder="0.00"
            className="w-full border rounded-md p-2"
          />
        </div>
        <div className="flex space-x-2">
          <button className="w-1/2 bg-blue-500 text-white py-2 rounded-md">
            Buy BTC
          </button>
          <button className="w-1/2 bg-gray-200 text-gray-700 py-2 rounded-md">
            Sell BTC
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradingInterface;
