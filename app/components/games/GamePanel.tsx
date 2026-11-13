import type { ReactNode } from "react";

/** The frame the three games share: a title, the odds stated up front, the
 *  controls, and one slot for the result. */
export default function GamePanel({
  title,
  description,
  odds,
  children,
  result,
}: {
  title: string;
  description: string;
  odds: string;
  children: ReactNode;
  result?: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-lg border border-line bg-surface p-6">
      <header>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
        <p className="mt-3 font-mono text-xs text-ink-body" data-numeric>
          {odds}
        </p>
      </header>

      <div className="mt-5 flex-1 space-y-4">{children}</div>

      {result && <div className="mt-5 border-t border-line pt-5">{result}</div>}
    </section>
  );
}
