import { useState } from "react";
import { ChevronDown, X, LucideIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SynopsisItem {
  label: string;
  /** Formal / detailed definition or value. */
  value: string;
  /** Optional plain-language restatement ("in simple words"). */
  simple?: string;
  /** Optional tip line shown with green left-border + blue text (reference style). */
  tip?: string;
  /**
   * What this build does NOT do, where `value` describes the operating model
   * rather than the running code.
   *
   * Several definitions here describe enforcement — a send-time suppression
   * service, append-only audit writes — that the product genuinely intends but
   * does not yet implement. Written in the present tense next to a shield icon,
   * those read to a reviewing DPO or auditor as a statement of fact about the
   * system in front of them, which is a compliance misstatement rather than a
   * roadmap gap. Keeping the definition and naming the gap beside it is more
   * useful than deleting either.
   */
  notInThisBuild?: string;
}

export interface SynopsisSection {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  /** Tailwind classes for the soft pastel circle (bg + text color). The bg-* class is
   *  also reused as the soft header tint when the section is expanded. */
  tone: string;
  items: SynopsisItem[];
}

interface SynopsisPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  sections: SynopsisSection[];
}

/** Extract the `bg-*-100` class from a tone string so we can reuse it as the soft header tint. */
function softBgFromTone(tone: string): string {
  const match = tone.split(" ").find(c => c.startsWith("bg-"));
  return match ?? "";
}

export function SynopsisPanel({ open, onClose, title = "Synopsis", sections }: SynopsisPanelProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>(() =>
    sections.reduce((acc, s, i) => ({ ...acc, [s.id]: i === 0 }), {})
  );

  if (!open) return null;

  const toggle = (id: string) => setOpenIds(o => ({ ...o, [id]: !o[id] }));

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 shadow-xl bg-background md:static md:z-auto md:shadow-none md:bg-muted/30 w-[300px] lg:w-[340px] xl:w-[400px] 2xl:w-[440px] shrink-0 h-screen border-l border-border flex flex-col"
      aria-label="Synopsis panel"
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-foreground">
            <Info className="w-4 h-4 text-background" />
          </div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close synopsis"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {sections.map(section => {
          const Icon = section.icon;
          const isOpen = !!openIds[section.id];
          const softBg = softBgFromTone(section.tone);
          return (
            <div
              key={section.id}
              className={cn(
                "rounded-xl border border-border bg-card overflow-hidden transition-shadow",
                isOpen && "shadow-sm"
              )}
            >
              <button
                onClick={() => toggle(section.id)}
                aria-expanded={isOpen}
                aria-controls={`synopsis-${section.id}`}
                className={cn(
                  "w-full flex items-start gap-3 p-4 text-left transition-colors",
                  isOpen ? softBg : "hover:bg-muted/40"
                )}
              >
                <div className={cn("flex items-center justify-center w-9 h-9 rounded-full shrink-0", section.tone)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground leading-tight">{section.title}</div>
                  {section.subtitle && (
                    <div className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</div>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground shrink-0 transition-transform mt-1",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div
                  id={`synopsis-${section.id}`}
                  role="region"
                  aria-label={section.title}
                  className="px-4 pb-4 pt-3 border-t border-border/60 bg-card"
                >
                  <div className="space-y-4">
                    {section.items.map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          item.tip && "border-l-2 border-emerald-500 pl-3"
                        )}
                      >
                        <div className="text-sm font-semibold text-foreground">{item.label}</div>
                        <div className="text-sm text-foreground/80 leading-relaxed mt-1">{item.value}</div>
                        {item.simple && (
                          <div className="text-xs text-muted-foreground leading-relaxed mt-1.5 italic">
                            In simple words: {item.simple}
                          </div>
                        )}
                        {item.tip && (
                          <div className="text-sm text-blue-600 dark:text-blue-400 leading-relaxed mt-2">
                            → {item.tip}
                          </div>
                        )}
                        {item.notInThisBuild && (
                          <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-2.5 py-1.5 text-xs leading-relaxed text-foreground/80">
                            <span className="font-semibold">Not in this build: </span>
                            {item.notInThisBuild}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
