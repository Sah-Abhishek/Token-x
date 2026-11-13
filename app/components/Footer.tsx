import Link from "next/link";
import { RiTwitterXFill } from "react-icons/ri";
import { BsDiscord } from "react-icons/bs";
import { FaTelegram } from "react-icons/fa";

/**
 * Every link here used to point at a route that does not exist (/learn, /faq,
 * /api, /about, /contact, /careers, /twitter, /discord, /telegram): nine
 * links to the 404 page. Only real destinations are links; the rest stay
 * plain labels until those pages exist.
 */
const RESOURCES = [
  { label: "Market", href: "/market" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Games", href: "/games" },
  { label: "How it works", href: "/how-it-works" },
] as const;

const COMPANY = [
  { label: "About Us", href: null },
  { label: "Contact", href: null },
  { label: "Careers", href: null },
] as const;

const SOCIALS = [
  { label: "X", Icon: RiTwitterXFill },
  { label: "Discord", Icon: BsDiscord },
  { label: "Telegram", Icon: FaTelegram },
] as const;

const Footer = () => {
  return (
    <footer className="border-t border-line py-12">
      <div className="shell">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">TokenX</h3>
            <p className="text-ink-muted text-sm">Practice trading with zero risk.</p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-4 text-ink">
              Resources
            </h4>
            <ul className="space-y-2 text-sm">
              {RESOURCES.map(({ label, href }) => (
                <li key={label}>
                  {href ? (
                    <Link href={href} className="text-ink-body hover:text-ink transition-colors">
                      {label}
                    </Link>
                  ) : (
                    <span className="text-ink-muted/60 cursor-default">{label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-4 text-ink">
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              {COMPANY.map(({ label, href }) => (
                <li key={label}>
                  {href ? (
                    <Link href={href} className="text-ink-body hover:text-ink transition-colors">
                      {label}
                    </Link>
                  ) : (
                    <span className="text-ink-muted/60 cursor-default">{label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-4 text-ink">
              Connect
            </h4>
            {/* The Discord icon previously sat outside its <Link>, so it was
                not clickable at all. */}
            <ul className="flex gap-4">
              {SOCIALS.map(({ label, Icon }) => (
                <li key={label}>
                  <span
                    title={`${label} is not live yet`}
                    aria-label={label}
                    className="inline-flex text-ink-muted/60 cursor-default"
                  >
                    <Icon size={22} aria-hidden="true" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-line mt-10 pt-6 text-center text-sm text-ink-muted">
          <p>© {new Date().getFullYear()} TokenX. All rights reserved.</p>
          <p className="mt-1 text-xs">
            Simulated trading only. No real funds and no real orders are involved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
