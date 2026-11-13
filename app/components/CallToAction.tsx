import React from "react";
import Link from "next/link";

const CallToAction: React.FC = () => {
  return (
    <section className="bg-ink">
      <div className="shell py-16 md:py-20">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="max-w-[22ch] text-3xl md:text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink-inverse">
              Open the market and look around.
            </h2>
            <p className="mt-4 max-w-[48ch] text-ink-inverse/70">
              You do not need a card or a deposit. The balance is virtual and
              the prices are not.
            </p>
          </div>

          {/* Same label as the hero button: one action keeps one name. */}
          <Link
            href="/market"
            className="press shrink-0 rounded-md bg-surface px-7 py-3.5 font-medium text-ink hover:opacity-90"
          >
            Open the market
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
