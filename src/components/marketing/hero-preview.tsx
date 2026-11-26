import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Illustrative product preview for the landing page (static marketing art,
 * not live data).
 */
const rows = [
  { pos: 1, name: "Arjun", p: 12, gd: "+14", pts: 28, form: ["W", "W", "D", "W", "W"] },
  { pos: 2, name: "Dev", p: 12, gd: "+9", pts: 25, form: ["W", "L", "W", "W", "D"] },
  { pos: 3, name: "Rahul", p: 11, gd: "+3", pts: 19, form: ["D", "W", "L", "W", "L"] },
  { pos: 4, name: "Vishnu", p: 12, gd: "-6", pts: 13, form: ["L", "D", "W", "L", "L"] },
];

const formColor: Record<string, string> = {
  W: "bg-win text-primary-foreground",
  D: "bg-draw/70 text-background",
  L: "bg-loss text-white",
};

export function HeroPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md select-none">
      <div className="rounded-xl border bg-card/90 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Friends League</p>
            <p className="text-sm font-semibold">Season 3 · Standings</p>
          </div>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">LIVE</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">#</th>
              <th className="py-2 text-left font-medium">Player</th>
              <th className="py-2 text-right font-medium">P</th>
              <th className="py-2 text-right font-medium">GD</th>
              <th className="px-4 py-2 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.pos} className="border-t">
                <td className={cn("tabular px-4 py-2.5", r.pos === 1 ? "text-primary" : "text-muted-foreground")}>
                  {r.pos}
                </td>
                <td className="py-2.5">
                  <div className="font-medium">{r.name}</div>
                  <div className="mt-1 flex gap-0.5">
                    {r.form.map((f, i) => (
                      <span key={i} className={cn("grid size-3.5 place-items-center rounded-[3px] text-[0.55rem] font-bold", formColor[f])}>
                        {f}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="tabular py-2.5 text-right text-muted-foreground">{r.p}</td>
                <td className="tabular py-2.5 text-right text-muted-foreground">{r.gd}</td>
                <td className="tabular px-4 py-2.5 text-right font-semibold">{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating result card */}
      <div className="absolute -bottom-10 -left-2 w-64 rounded-xl border bg-popover p-3 shadow-xl shadow-black/50 sm:-left-10">
        <div className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-warning">
          <Clock className="size-3.5" /> Awaiting confirmation
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Rahul</span>
          <span className="tabular rounded-md bg-secondary px-2.5 py-1 text-lg font-bold">
            3 <span className="text-muted-foreground">–</span> 2
          </span>
          <span className="text-sm font-medium">Vishnu</span>
        </div>
        <div className="mt-2.5 flex gap-2">
          <span className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            <Check className="size-3.5" /> Approve
          </span>
          <span className="flex h-7 flex-1 items-center justify-center rounded-md border text-xs font-medium text-muted-foreground">
            Dispute
          </span>
        </div>
      </div>
    </div>
  );
}
