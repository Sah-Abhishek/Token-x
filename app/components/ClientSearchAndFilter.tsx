"use client";

import { useState, useEffect, useMemo } from "react";
import ClientCryptoTable from "./CryptoTableComponent";
import type { Crypto } from "../lib/market";

const SORT_OPTIONS = ["Market Cap", "Price", "24h Change", "Volume"] as const;
const FILTER_OPTIONS = ["All Coins", "Top 10", "Top 50", "Top 100"] as const;

type SortOption = (typeof SORT_OPTIONS)[number];
type FilterOption = (typeof FILTER_OPTIONS)[number];

interface ClientSearchAndFilterProps {
  cryptocurrencies: Crypto[];
}

const FIELD =
  "w-full py-2 px-3 border border-line-strong bg-surface rounded-md text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition-shadow";

export default function ClientSearchAndFilter({
  cryptocurrencies,
}: ClientSearchAndFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("Market Cap");
  const [filterBy, setFilterBy] = useState<FilterOption>("All Coins");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredAndSortedCryptos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    // Match on symbol as well as name: people search "btc", not "bitcoin".
    const matched = query
      ? cryptocurrencies.filter(
          (crypto) =>
            crypto.name.toLowerCase().includes(query) ||
            crypto.symbol.toLowerCase().includes(query),
        )
      : cryptocurrencies;

    const sorted = [...matched].sort((a, b) => {
      switch (sortBy) {
        case "Price":
          return b.price - a.price;
        case "24h Change":
          return b.change - a.change;
        case "Volume":
          return b.volume - a.volume;
        case "Market Cap":
        default:
          return b.marketCap - a.marketCap;
      }
    });

    if (filterBy === "All Coins") return sorted;
    const limit = filterBy === "Top 10" ? 10 : filterBy === "Top 50" ? 50 : 100;
    return sorted.slice(0, limit);
  }, [cryptocurrencies, searchTerm, sortBy, filterBy]);

  // Guard against 0 so an empty result set cannot render "Page 1 of 0".
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedCryptos.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedCryptos = filteredAndSortedCryptos.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, filterBy]);

  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center mb-8 gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-ink-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <label htmlFor="crypto-search" className="sr-only">
            Search for a cryptocurrency
          </label>
          <input
            id="crypto-search"
            type="search"
            placeholder="Search by name or symbol..."
            className={`${FIELD} pl-10`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <div className="w-40">
            <label htmlFor="sort-by" className="sr-only">
              Sort by
            </label>
            <select
              id="sort-by"
              className={FIELD}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label htmlFor="filter-by" className="sr-only">
              Filter
            </label>
            <select
              id="filter-by"
              className={FIELD}
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ClientCryptoTable
        cryptos={paginatedCryptos}
        currentPage={safePage}
        totalPages={totalPages}
        onNextPage={goToNextPage}
        onPrevPage={goToPrevPage}
      />
    </>
  );
}
