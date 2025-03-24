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
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const Navbar = () => {
  return (
    // Navigation
    <nav className="bg-white py-4 px-6 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-1">
          <div className="flex items-center">
            <Image
              src="/logo-tokenx.png"
              alt="TokenX"
              width={32}
              height={32}
              className="mr-2"
            />
            <span className="text-xl font-bold">TokenX</span>
          </div>

          <div className="hidden md:flex items-center ml-10 space-x-6">
            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
              <MdDashboard className="mr-2" />
              Dashboard
            </Link>
            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
              <ChartIcon className="mr-2" />
              Market
            </Link>
            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
              <FaTrophy className="mr-2" />
              Leaderboard
            </Link>
            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
              <HiInformationCircle className="mr-2" />
              How It Works
            </Link>
            <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
              <IoNewspaper className="mr-2" />
              Blogs
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm flex items-center">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="border border-gray-300 px-4 py-2 rounded-md text-sm">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
