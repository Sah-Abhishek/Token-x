import Link from "next/link";
import { RiTwitterXFill } from "react-icons/ri";
import { BsDiscord } from "react-icons/bs";
import { FaTelegram } from 'react-icons/fa';

const Footer = () => {
  return (

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
  )
}

export default Footer;
