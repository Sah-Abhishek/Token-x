"use client"
import { useState, useEffect } from 'react';
import ClientCryptoTable from './CryptoTableComponent';

type Crypto = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
  marketCap: number;
  volume: number;
  image: string;
};

interface ClientSearchAndFilterProps {
  cryptocurrencies: Crypto[];
}

export default function ClientSearchAndFilter({ cryptocurrencies }: ClientSearchAndFilterProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('Market Cap');
  const [filterBy, setFilterBy] = useState<string>('All Coins');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter cryptocurrencies based on the search term
  const filteredCryptos = cryptocurrencies.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort the filtered cryptocurrencies based on the selected criteria
  const sortedCryptos = [...filteredCryptos].sort((a, b) => {
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

  // Handle pagination
  const totalPages = Math.ceil(filteredAndSortedCryptos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCryptos = filteredAndSortedCryptos.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when search/filter/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, filterBy]);

  // Handle pagination
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <>
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

      {/* Crypto Table with pagination information */}
      <ClientCryptoTable
        cryptos={paginatedCryptos}
        currentPage={currentPage}
        totalPages={totalPages}
        onNextPage={goToNextPage}
        onPrevPage={goToPrevPage}
      />
    </>
  );
}
