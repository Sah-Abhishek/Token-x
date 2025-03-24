"use client";

import { FaChartLine as ChartIcon } from 'react-icons/fa6';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import CryptoTableSkeleton from '../components/CryptoTableSkeleton';
import Link from 'next/link';

type Crypto = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: string;
  marketCap: string;
  volume: string;
  image: string;
};
type CryptoConverted = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number; // Converted to number
  marketCap: number; // Converted to number
  volume: number; // Converted to number
  image: string;
};

export default function Home() {
  const [cryptocurrencies, setCryptocurrencies] = useState<CryptoConverted[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('Market Cap');
  const [filterBy, setFilterBy] = useState<string>('All Coins');
  const [isLoading, setLoading] = useState<boolean>(false);

  // Helper function to clean and convert market cap and volume to numbers
  const cleanAndConvert = (value: string): number => {
    if (!value) return 0;

    // Remove non-numeric characters except for . and -
    const cleanedValue = value.replace(/[^0-9.-]+/g, '');

    // Convert cleaned value to a number first before applying the logic
    let numericValue = parseFloat(cleanedValue);

    // Check if it's in billions (B) or millions (M) and multiply accordingly
    if (value.includes('B')) {
      numericValue *= 1e9; // Convert to number and multiply by 1 billion
    } else if (value.includes('M')) {
      numericValue *= 1e6; // Convert to number and multiply by 1 million
    }

    return isNaN(numericValue) ? 0 : numericValue; // Return 0 if it's not a valid number
  };
  useEffect(() => {
    // Fetch cryptocurrencies data from the API
    async function fetchCryptos() {
      try {
        const res = await fetch('http://localhost:3000/api/cryptos');
        if (!res.ok) {
          throw new Error('Failed to fetch cryptocurrencies');
        }
        const data: Crypto[] = await res.json();

        // Convert change, marketCap, and volume to numbers
        const updatedData: CryptoConverted[] = data.map(crypto => ({
          ...crypto,
          change: parseFloat(crypto.change) || 0, // Convert to number or 0 if invalid
          marketCap: cleanAndConvert(crypto.marketCap), // Clean and convert marketCap
          volume: cleanAndConvert(crypto.volume), // Clean and convert volume
        }));

        setCryptocurrencies(updatedData); // Set the cleaned data in state
      } catch (error) {
        console.error('There was an error fetching the data:', error);
      } finally {
        setLoading(false);
      }
    }

    setLoading(true); // Start loading when the component mounts
    fetchCryptos();
  }, []);
  // Filter cryptocurrencies based on the search term
  const filteredCryptos = cryptocurrencies.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase())
    // crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort the filtered cryptocurrencies based on the selected criteria
  const sortedCryptos = filteredCryptos.sort((a, b) => {
    switch (sortBy) {
      case 'Price':
        return b.price - a.price;
      case '24h Change':
        return b.change - a.change;
      case 'Volume':
        return b.volume - a.volume;
      case 'Market Cap':
      default:
        return b.marketCap - a.marketCap;
    }
  });

  // Limit the number of results based on the filter
  const filteredAndSortedCryptos = filterBy === 'All Coins'
    ? sortedCryptos
    : sortedCryptos.slice(0, filterBy === 'Top 10' ? 10 : filterBy === 'Top 50' ? 50 : 100);

  return (
    <div className="min-h-screen bg-white text-black">
      <Head>
        <title>TokenX</title>
        <meta name="description" content="Simulate cryptocurrency trading without risk" />
        <link rel="icon" href="/logo-tokenx.png" />
      </Head>

      {/* Navigation Bar */}
      <Navbar />
      <main className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center mb-2">
            <span>
              <ChartIcon className='mr-2' />
            </span>
            Live Crypto Market Prices
          </h1>
          <p className="text-gray-600">Track real-time prices and trends of top cryptocurrencies.</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row md:items-center mb-8 space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search for a cryptocurrency..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-4">
            <div className="w-40">
              <select
                className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option>Market Cap</option>
                <option>Price</option>
                <option>24h Change</option>
                <option>Volume</option>
              </select>
            </div>
            <div className="w-32">
              <select
                className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
              >
                <option>All Coins</option>
                <option>Top 10</option>
                <option>Top 50</option>
                <option>Top 100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Crypto Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isLoading ? (
            <CryptoTableSkeleton />
          ) : (
            <div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">24h Change</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Cap</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedCryptos.map((crypto, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Image src={crypto.image} alt={crypto.name} width={24} height={24} className="mr-2" />
                          <span>{crypto.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${crypto.price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{crypto.change}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${crypto.marketCap.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${crypto.volume.toLocaleString()}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'><button className='
                        bg-gray-50 py-1 px-2 rounded-md hover:text-black hover:bg-gray-300
                        '>View Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-6">Ready to Simulate Real Crypto Trading?</h2>
        <button className="bg-gray-900 text-white px-6 py-3 rounded-md font-medium hover:bg-gray-800 flex items-center mx-auto">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          Start Trading Now
        </button>
      </div>
      <footer className="bg-white border-t border-gray-200 mt-16 py-8 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex space-x-6 mb-4 md:mb-0">
              <Link href="/terms" className="text-gray-600 hover:text-gray-900">Terms of Service</Link>
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy Policy</Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact Us</Link>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-600 hover:text-gray-900">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.687 8.687 0 0112 3.475zm-3.633.803a53.896 53.896 0 013.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 014.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.25.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.522 8.522 0 01-2.19-5.705zM12 20.547a8.482 8.482 0 01-5.239-1.8c.152-.315 1.888-3.656 6.703-6.197-.396-.159-.797-.325-1.169-.485-1.554-.666-3.352-1.423-4.97-2.181-.54-.31-.489-.5-.559-.659z"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
