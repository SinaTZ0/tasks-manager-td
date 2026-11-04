import { useEffect, useState } from "react";

import { cn } from "#/lib/utils";

/*===== Study Bar =====*/
// Copy into the study's folder. Study-only chrome pinned to the bottom of the window: the option keys, the notes, and
// one line of live measurements. Keys 0–9 pick an option, `n` opens the notes. It is English on purpose: it is for the
// people comparing the options and never reaches the app, so none of its text is a message.

export type StudyOption = {
  name: string;
  /** What it is and why, in two sentences at most. */
  lead: string;
  good: string[];
  /** The real risks: hidden content, covered text, dark mode, a long name. */
  watch: string[];
  /** What it costs in this codebase: components, primitives, tokens, any backend change. */
  build: string[];
};

export function StudyBar({
  options,
  opt,
  onPick,
  measure,
}: {
  options: StudyOption[];
  opt: number;
  onPick: (opt: number) => void;
  /** A live reading to print, such as a panel's height; read once a second, since data arrives after first paint. */
  measure?: () => string;
}) {
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState("");
  const note = options[opt] ?? options[0];

  useEffect(() => {
    if (!measure) return;
    const timer = setInterval(() => setReading(measure()), 1000);
    return () => clearInterval(timer);
  }, [measure, opt]);

  useEffect(() => {
    const press = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if (/^\d$/.test(event.key) && options[Number(event.key)]) onPick(Number(event.key));
      if (event.key === "n") setOpen((value) => !value);
    };
    document.addEventListener("keydown", press);
    return () => document.removeEventListener("keydown", press);
  }, [onPick, options]);

  const list = (title: string, items: string[]) => (
    <div>
      <h3 className="mb-1 text-caption text-muted-foreground">{title}</h3>
      <ul className="list-disc space-y-1 ps-4 text-body-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div
      data-study-bar
      dir="ltr"
      className="fixed inset-x-4 bottom-3 z-40 rounded-housing border border-border bg-popover text-popover-foreground shadow-md"
    >
      {open && note && (
        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-6 border-b border-border p-4">
          <div>
            <h3 className="mb-1 text-caption text-muted-foreground">{`${opt} · ${note.name}`}</h3>
            <p className="text-body-sm">{note.lead}</p>
          </div>
          {list("Good", note.good)}
          {list("Watch", note.watch)}
          {list("Build", note.build)}
        </div>
      )}
      <div className="flex items-center gap-1 p-1.5">
        {options.map((option, index) => (
          <button
            key={option.name}
            type="button"
            aria-pressed={index === opt}
            onClick={() => onPick(index)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1 text-start text-body-sm font-semibold",
              index === opt ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            <span className="me-1.5 font-mono opacity-70">{index}</span>
            {option.name}
          </button>
        ))}
        <span className="ms-auto font-mono text-caption text-muted-foreground">{reading}</span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="ms-3 cursor-pointer rounded-md px-3 py-1 text-body-sm font-semibold hover:bg-accent"
        >
          {open ? "Hide notes" : "Notes (n)"}
        </button>
      </div>
    </div>
  );
}
