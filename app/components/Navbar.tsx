"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { HiInformationCircle } from "react-icons/hi";
import { MdDashboard } from "react-icons/md";
import { FaTrophy, FaRegStar } from "react-icons/fa";
import { FaChartLine as ChartIcon, FaDice } from "react-icons/fa6";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

/**
 * Every item points at a page that exists. An unbuilt destination belongs
 * here as a plain muted label, never as a link to the 404 page.
 *
 * `isActive` matches the path or a child of it rather than `startsWith`:
 * plain `startsWith("/market")` also lit up on /marketing-style paths and,
 * more to the point here, would mark Dashboard active on any route that
 * merely begins with the same letters.
 */
const NAV_ITEMS = [
  { label: "Market", href: "/market", Icon: ChartIcon },
  { label: "Dashboard", href: "/dashboard", Icon: MdDashboard },
  { label: "Watchlist", href: "/watchlist", Icon: FaRegStar },
  { label: "Leaderboard", href: "/leaderboard", Icon: FaTrophy },
  { label: "Games", href: "/games", Icon: FaDice },
  { label: "How it works", href: "/how-it-works", Icon: HiInformationCircle },
] as const;

const Navbar = () => {
  const pathname = usePathname();

  return (
    <nav className="bg-surface border-b border-line py-4">
      <div className="shell flex justify-between items-center gap-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center shrink-0" aria-label="TokenX home">
            <Image
              src="/logo-tokenx.png"
              alt=""
              width={32}
              height={32}
              className="mr-2"
              priority
            />
            <span className="text-xl font-bold">TokenX</span>
          </Link>

          <div className="hidden md:flex items-center ml-10 gap-5 lg:gap-6">
            {NAV_ITEMS.map(({ label, href, Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    isActive ? "text-ink font-medium" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-ink text-ink-inverse px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="border border-line-strong px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-raised transition-colors">
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
};

export default Navbar;
