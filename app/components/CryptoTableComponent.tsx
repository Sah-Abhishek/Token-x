"use client";

import Image from "next/image";
import Link from "next/link";

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

interface ClientCryptoTableProps {
  cryptos: Crypto[];
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export default function ClientCryptoTable({
  cryptos,
  currentPage,
  totalPages,
  onNextPage,
  onPrevPage
}: ClientCryptoTableProps) {
  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
            {cryptos.map((crypto, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {((currentPage - 1) * 10) + index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Image src={crypto.image} alt={crypto.name} width={24} height={24} className="mr-2" />
                    <span>{crypto.name} <span className="text-gray-500 font-bold"> {(crypto.symbol.toUpperCase())}</span></span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${crypto.price.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={
                      `font-bold ${crypto.change < 0 ? "text-red-500 bg-red-100 p-1 rounded-md" : "text-green-500 bg-green-100 p-1 rounded-md"}` // Adding font weight and color
                    }
                  >
                    {crypto.change.toFixed(2)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${crypto.marketCap.toLocaleString()}B</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${crypto.volume.toLocaleString()}B</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link href={`/market/${crypto.name}`}>
                    <button className="bg-gray-50 py-1 px-2 rounded-md hover:text-black hover:bg-gray-300">
                      View Details
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex justify-between items-center p-4 mt-10 bg-gray-50">
          <button
            onClick={onPrevPage}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-md ${currentPage === 1 ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-200 hover:bg-gray-300"}`}
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={onNextPage}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-md ${currentPage === totalPages ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gray-200 hover:bg-gray-300"}`}
          >
            Next
          </button>
        </div>
      </div>
    </div >
  );
}
