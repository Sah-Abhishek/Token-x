
import Link from "next/link";
import { Home, ArrowLeft, Mail } from "lucide-react";
import Navbar from "./components/Navbar";

export default function NotFound() {
  return (
    <div className="text-black">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900">
        {/* Navbar */}
        {/* Content */}
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2"></circle>
              <path strokeWidth="2" d="M9 10h.01M15 10h.01M9 16a3 3 0 006 0"></path>
            </svg>
          </div>
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-lg text-gray-600 mt-2">Page Not Found</p>
          <p className="text-gray-500 mt-1">Oops! The page you're looking for doesn't exist.</p>

          {/* Buttons */}
          <div className="mt-6 flex flex-col md:flex-row justify-center space-y-3 md:space-y-0 md:space-x-4">
            <Link href="/" className="px-5 py-2.5 flex items-center bg-gray-900 text-white rounded-md hover:bg-gray-800 transition">
              <ArrowLeft className="w-5 h-5 mr-2" /> Go Back
            </Link>
            <Link href="/dashboard" className="px-5 py-2.5 flex items-center bg-gray-900 text-white rounded-md hover:bg-gray-800 transition">
              <Home className="w-5 h-5 mr-2" /> Return to Dashboard
            </Link>
            <Link href="/support" className="px-5 py-2.5 flex items-center bg-gray-900 text-white rounded-md hover:bg-gray-800 transition">
              <Mail className="w-5 h-5 mr-2" /> Contact Support
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-6 w-full text-center text-sm text-gray-500">
          <div className="flex justify-center space-x-6">
            <Link href="/terms" className="hover:text-gray-900">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-gray-900">Privacy Policy</Link>
            <Link href="/support" className="hover:text-gray-900">Contact Support</Link>
          </div>

          {/* Social Icons */}
          <div className="flex justify-center space-x-4 mt-4">
            <a href="#" className="hover:text-gray-900">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
              </svg>
            </a>
            <a href="#" className="hover:text-gray-900">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362z"></path>
              </svg>
            </a>
            <a href="#" className="hover:text-gray-900">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"></path>
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
