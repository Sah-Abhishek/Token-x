import Navbar from "./Navbar";
import Footer from "./Footer";

/** Nav, one page width, footer. Every full page uses this so the header and
 *  the content cannot drift to different gutters again. */
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <Navbar />
      <main className="shell flex-1 py-12">{children}</main>
      <Footer />
    </div>
  );
}
