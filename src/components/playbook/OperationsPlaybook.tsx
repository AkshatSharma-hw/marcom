import { useEffect, useId, useRef, useState } from "react";
import { X, LucideIcon, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface PlaybookCard {
  icon: LucideIcon;
  title: string;
  frequency?: string;
  description: string;
  checklist: string[];
}

export interface PlaybookExampleMetric {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger" | "default";
}

export interface PlaybookExample {
  code: string;
  title: string;
  status: "Completed" | "In Progress" | "Planned" | "Blocked" | "Remediated";
  industry?: string;
  description: string;
  sponsor: string;
  duration: string;
  metrics?: PlaybookExampleMetric[];
  walkthrough: { phase: string; detail: string }[];
  outcome?: string;
}

export interface PlaybookPhase {
  id: string;
  navLabel: string;
  navIcon: LucideIcon;
  phaseLabel: string; // e.g. "Phase 1: Overview"
  phaseTitle: string;
  phaseDescription: string;
  intro?: { icon: LucideIcon; text: string };
  cards?: PlaybookCard[];
  examples?: PlaybookExample[];
  bestPractices?: { title: string; items: string[] };
}

interface OperationsPlaybookProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  phases: PlaybookPhase[];
}

export function OperationsPlaybook({ open, onClose, title, subtitle, phases }: OperationsPlaybookProps) {
  const [activeId, setActiveId] = useState(phases[0]?.id);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const active = phases.find(p => p.id === activeId) ?? phases[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-background rounded-xl shadow-2xl w-full max-w-[1280px] h-[92vh] flex flex-col overflow-hidden border border-border"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-4 border-b border-border">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold text-foreground tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close playbook"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left nav */}
          <aside className="w-full md:w-[270px] shrink-0 max-h-[40%] md:max-h-none border-b md:border-b-0 md:border-r border-border bg-muted/30 flex flex-col">
            <nav className="flex-1 overflow-auto p-3 space-y-1">
              {phases.map((p, i) => {
                const Icon = p.navIcon;
                const isActive = p.id === active.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                      isActive
                        ? "bg-foreground text-background font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{p.navLabel}</span>
                    <span className={cn("text-xs", isActive ? "text-background/70" : "text-muted-foreground/70")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main */}
          <div className="flex-1 overflow-auto bg-muted/20">
            <div className="max-w-5xl mx-auto p-4">
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{active.phaseLabel}</div>
                <h2 className="text-2xl font-semibold text-foreground">{active.phaseTitle}</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{active.phaseDescription}</p>
              </div>

              {active.intro && (
                <div className="flex items-start gap-3 p-4 mb-4 rounded-xl bg-accent/5 border border-accent/20">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/15 text-accent shrink-0">
                    <active.intro.icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed pt-1.5">{active.intro.text}</p>
                </div>
              )}

              {active.cards && active.cards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {active.cards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <div key={i} className="bg-background rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-foreground text-background">
                            <Icon className="w-4 h-4" />
                          </div>
                          {card.frequency && (
                            <Badge variant="secondary" className="text-xs">{card.frequency}</Badge>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1.5">{card.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{card.description}</p>
                        <ul className="space-y-1.5">
                          {card.checklist.map((item, j) => (
                            <li key={j} className="flex items-start gap-2 text-xs text-foreground">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}

              {active.examples && active.examples.length > 0 && (
                <ExamplesBlock examples={active.examples} />
              )}

              {active.bestPractices && (
                <div className="mt-4 bg-background rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">{active.bestPractices.title}</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {active.bestPractices.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamplesBlock({ examples }: { examples: PlaybookExample[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const ex = examples[activeIdx] ?? examples[0];

  const statusTone: Record<PlaybookExample["status"], string> = {
    Completed: "bg-success/15 text-success border-success/30",
    "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
    Planned: "bg-muted text-muted-foreground border-border",
    Blocked: "bg-destructive/15 text-destructive border-destructive/30",
    Remediated: "bg-amber-100 text-amber-700 border-amber-200",
  };

  const metricTone = (t?: PlaybookExampleMetric["tone"]) => {
    switch (t) {
      case "success": return "text-success";
      case "warning": return "text-amber-600";
      case "danger": return "text-destructive";
      default: return "text-foreground";
    }
  };

  return (
    <div className="mt-2">
      {examples.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {examples.map((e, i) => (
            <button
              key={e.code}
              onClick={() => setActiveIdx(i)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs border transition-colors",
                i === activeIdx
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              )}
            >
              <span className="font-mono mr-1.5 opacity-70">{e.code}</span>
              {e.title}
            </button>
          ))}
        </div>
      )}

      <div className="bg-background rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-[11px] font-mono px-2 py-1 rounded-md bg-foreground text-background">{ex.code}</span>
            <h3 className="text-lg font-semibold text-foreground flex-1">{ex.title}</h3>
            <span className={cn("text-[11px] px-2 py-1 rounded-md border font-medium", statusTone[ex.status])}>{ex.status}</span>
          </div>
          {ex.industry && (
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">{ex.industry}</div>
          )}
          <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{ex.description}</p>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sponsor</div>
              <div className="text-sm font-medium text-foreground mt-1">{ex.sponsor}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Duration</div>
              <div className="text-sm font-medium text-foreground mt-1">{ex.duration}</div>
            </div>
          </div>
        </div>

        {ex.metrics && ex.metrics.length > 0 && (
          <div className="px-4 py-4 bg-muted/30 border-b border-border">
            <div className="text-xs font-semibold text-foreground mb-3">Scenario Metrics</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ex.metrics.map((m, i) => (
                <div key={i}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</div>
                  <div className={cn("text-base font-semibold mt-0.5", metricTone(m.tone))}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4">
          <div className="text-xs font-semibold text-foreground mb-3">Walkthrough</div>
          <ol className="space-y-3">
            {ex.walkthrough.map((step, i) => (
              <li key={i} className="flex gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-foreground text-background text-[11px] font-semibold flex items-center justify-center">{i + 1}</div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-foreground">{step.phase}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.detail}</div>
                </div>
              </li>
            ))}
          </ol>

          {ex.outcome && (
            <div className="mt-4 p-4 rounded-lg bg-success/5 border border-success/20">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-success mb-1">Outcome</div>
              <div className="text-xs text-foreground leading-relaxed">{ex.outcome}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
