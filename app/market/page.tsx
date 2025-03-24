import { FaChartLine as ChartIcon } from 'react-icons/fa6';
import Navbar from '../components/Navbar';
import ClientSearchAndFilter from '../components/ClientSearchAndFilter';
import Footer from '../components/Footer';

type Crypto = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change: string | number;
  marketCap: string | number;
  volume: string | number;
  image: string;
};

// Create a new client component for the interactive search/filter UI
// ClientSearchAndFilter.tsx - mark with "use client"
// This will handle the search/filter state and UI

// Create a new client component for the interactive table
// ClientCryptoTable.tsx - mark with "use client"
// This will handle sorting and displaying the filtered data

async function getCryptoData() {
  try {
    const res = await fetch('http://localhost:3000/api/cryptos', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to fetch cryptocurrencies');
    }
    const data: Crypto[] = await res.json();

    // Process the data
    const updatedData = data.map(crypto => ({
      ...crypto,
      change: parseFloat(crypto.change as string) || 0,
      marketCap: parseFloat((crypto.marketCap as string).replace(/[^0-9.-]+/g, "")) || 0,
      volume: parseFloat((crypto.volume as string).replace(/[^0-9.-]+/g, "")) || 0,
    }));

    return updatedData;
  } catch (error) {
    console.error('There was an error fetching the data:', error);
    return [];
  }
}

export default async function Home() {
  // Server-side data fetching
  const cryptocurrencies = await getCryptoData();

  return (
    <div className="min-h-screen bg-white text-black">
      <head>
        <title>TokenX</title>
        <meta name="description" content="Simulate cryptocurrency trading without risk" />
        <link rel="icon" href="/logo-tokenx.png" />
      </head>

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

        {/* Client-side search and filter component */}
        <ClientSearchAndFilter cryptocurrencies={cryptocurrencies} />

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-6">Ready to Simulate Real Crypto Trading?</h2>
          <button className="bg-gray-900 text-white px-6 py-3 rounded-md font-medium hover:bg-gray-800 flex items-center mx-auto">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            Start Trading Now
          </button>
        </div>
        <Footer />
      </main>
    </div>
  );
}
