
import React, { useState } from 'react';

const OrderPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('market');
  const [amount, setAmount] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('0.00');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);

    // Calculate estimated cost (mock calculation)
    if (value && !isNaN(parseFloat(value))) {
      const estimatedValue = (parseFloat(value) * 86580).toFixed(2);
      setEstimatedCost(estimatedValue);
    } else {
      setEstimatedCost('0.00');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-all ${activeTab === 'market'
            ? 'border-b-2 border-black text-black'
            : 'text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('market')}
        >
          Market Order
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center font-medium transition-all ${activeTab === 'limit'
            ? 'border-b-2 border-black text-black'
            : 'text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('limit')}
        >
          Limit Order
        </button>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount (BTC)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.00"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Cost (USD)
          </label>
          <input
            type="text"
            id="cost"
            value={estimatedCost}
            readOnly
            className="w-full p-3 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="py-3 px-4 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors">
            Buy BTC
          </button>
          <button className="py-3 px-4 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors">
            Sell BTC
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderPanel;
