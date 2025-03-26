"use client"
import React from 'react';
import { Star } from 'lucide-react';
import PriceChart from '../../components/PriceChart';
import MarketInfo from '../../components/Marketinfo';
import OrderPanel from '../../components/OrderPanel';
import Portfolio from '../../components/Portfolio';

const Index: React.FC = () => {
  return (
    <div className="text-black min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Bitcoin (BTC)</h1>
              <div className="flex items-center">
                <span className="text-3xl font-semibold mr-3">$86,580.00</span>
                <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md text-sm font-medium">-0.6%</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button className="flex items-center gap-2 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Star size={18} />
                <span>Add to Watchlist</span>
              </button>
              <button className="py-2 px-6 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors">
                Trade Now
              </button>
            </div>
          </div>
        </div>

        <MarketInfo />

        <PriceChart />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2">
            <OrderPanel />
          </div>

          <div>
            <Portfolio />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
