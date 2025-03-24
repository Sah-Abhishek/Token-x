
import { RiTwitterXFill } from "react-icons/ri";
import { BsDiscord } from "react-icons/bs";
import { IoNewspaper } from "react-icons/io5";
import { HiInformationCircle } from "react-icons/hi";
import { MdDashboard } from "react-icons/md";
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FaChartLine, FaCoins, FaTrophy, FaTelegram } from 'react-icons/fa';
import { FaChartLine as ChartIcon } from 'react-icons/fa6';
import LiveMarketData from './components/LiveMarketData';
import Testimonials from './components/Testimonials';
import CallToAction from './components/CallToAction';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Navbar from "./components/Navbar";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <Head>
        <title>TokenX - Practice Crypto Trading Without Risk</title>
        <meta name="description" content="Simulate real-world crypto trading with real-time market data" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 md:pr-10">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Practice Crypto Trading Without Risk!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Simulate real-world crypto trading with real-time market data
              and in-game currency. Learn, trade, and master the market—
              risk-free!
            </p>
            <div className="flex space-x-4">
              <button className="cursor-pointer bg-gray-900 text-white px-6 py-3 rounded-md font-medium">
                Start Trading
              </button>
              <button className="bg-white border border-gray-300 text-gray-800 px-6 py-3 rounded-md font-medium">
                Learn More
              </button>
            </div>
          </div>
          <div className="md:w-1/2 mt-10 md:mt-0">
            <div className=" rounded-lg flex items-center justify-center text-white">
              <Image
                src="/screenshot2.png"
                alt="Screenshot"
                height={700}
                width={700}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Live Market Data Section */}
      <LiveMarketData />

      {/* Why Choose Section */}
      <section className="py-16 px-6 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Why Choose TokenX?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-lg border border-gray-100 hover:shadow-lg transition duration-300">
              <div className="mb-6">
                <FaChartLine className="text-4xl text-gray-800" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-time Market Data</h3>
              <p className="text-gray-600">
                Powered by CoinGecko API for accurate market simulation
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-lg border border-gray-100 hover:shadow-lg transition duration-300">
              <div className="mb-6">
                <FaCoins className="text-4xl text-gray-800" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Free 5 SOL to Start</h3>
              <p className="text-gray-600">
                Begin trading with virtual currency, completely free
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-lg border border-gray-100 hover:shadow-lg transition duration-300">
              <div className="mb-6">
                <FaTrophy className="text-4xl text-gray-800" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Leaderboard & Competitions</h3>
              <p className="text-gray-600">
                Compete with traders worldwide
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <Testimonials />

      {/* Call to Action Section */}
      {/*footer*/}


      <footer className="text-black py-12 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 text-black">TokenX</h3>
              <p className="text-gray-600">Practice trading with zero risk.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-black">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/learn" className="text-gray-600 hover:text-gray-900">Learning Center</Link></li>
                <li><Link href="/faq" className="text-gray-600 hover:text-gray-900">FAQ</Link></li>
                <li><Link href="/api" className="text-gray-600 hover:text-gray-900">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-black">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-600 hover:text-gray-900">About Us</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link></li>
                <li><Link href="/careers" className="text-gray-600 hover:text-gray-900">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-black">Connect</h4>
              <ul className="space-x-4 flex">
                <li><Link href="/twitter" className="text-gray-600 hover:text-gray-900"><RiTwitterXFill size={24} /></Link></li>
                <li><Link href="/discord" className="text-gray-600 hover:text-gray-900"></Link><BsDiscord size={24} /></li>
                <li><Link href="/telegram" className="text-gray-600 hover:text-gray-900"><FaTelegram size={24} /></Link></li>
              </ul>
            </div>
          </div>
          <div className=" border-gray-800 mt-10 pt-6 text-center text-gray-500">
            <p>© {new Date().getFullYear()} TokenX. All rights reserved.</p>
          </div>
        </div>
      </footer>
      {/* Floating tools panel */}
      <div className="fixed bottom-6 right-6 flex items-center space-x-2 bg-white p-2 rounded-full shadow-lg">
        <button className="p-2 rounded-full hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Home;
