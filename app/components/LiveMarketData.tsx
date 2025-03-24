"use client"
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

interface CryptoData {
  name: string;
  price: string;
  change: string;
  isPositive: boolean;
  logo: string;
}


interface BinanceCoinData {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
}

const LiveMarketData: React.FC = () => {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);

  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        const response = await fetch(
          'https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT"]'
        );
        const data = await response.json();

        const formattedData: CryptoData[] = data.map((coin: BinanceCoinData) => {
          // Determine the logo based on the coin name
          const logo = coin.symbol.replace('USDT', '') === 'BTC'
            ? '/bitcoin-logo.png'
            : '/ethereum-logo.png';

          return {
            name: coin.symbol.replace('USDT', ''), // Convert BTCUSDT -> BTC
            price: `$${parseFloat(coin.lastPrice).toLocaleString()}`,
            change: `${parseFloat(coin.priceChangePercent).toFixed(2)}%`,
            isPositive: parseFloat(coin.priceChangePercent) >= 0,
            logo: logo // Add the logo path
          };
        });

        setCryptoData(formattedData);
      } catch (error) {
        console.error('Error fetching crypto data:', error);
      }
    };

    fetchCryptoPrices();

    const interval = setInterval(fetchCryptoPrices, 5000); // Refresh every 5 sec

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 px-6 bg-gray-50">
      <div className="container mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Live Market Data</h2>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">24h Change</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cryptoData.map((crypto) => (
                <tr key={crypto.name}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-6 w-6 flex-shrink-0 relative">
                        <Image src={crypto.logo} alt={crypto.name} height={24} width={24} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{crypto.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{crypto.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex text-sm font-semibold ${crypto.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {crypto.change}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="bg-gray-800 text-white px-4 py-2 rounded text-xs">Trade</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default LiveMarketData;
