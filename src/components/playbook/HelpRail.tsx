import { BookOpen, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpRailProps {
  synopsisOpen: boolean;
  onToggleSynopsis: () => void;
  onOpenPlaybook: () => void;
}

export function HelpRail({ synopsisOpen, onToggleSynopsis, onOpenPlaybook }: HelpRailProps) {
  return (
    <div className="w-[49px] flex-shrink-0 h-screen border-l border-border bg-background flex flex-col items-center pt-4 gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Open Operations Playbook"
            onClick={onOpenPlaybook}
            className={cn(
              "w-8 h-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center p-0 m-0 transition-colors",
              "text-muted-foreground hover:bg-foreground hover:text-background hover:border-foreground"
            )}
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">Operations Playbook</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Toggle Synopsis"
            onClick={onToggleSynopsis}
            className={cn(
              "w-8 h-8 rounded-full border shadow-sm flex items-center justify-center p-0 m-0 transition-colors",
              synopsisOpen
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:bg-foreground hover:text-background hover:border-foreground"
            )}
          >
            <Info className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">Synopsis</TooltipContent>
      </Tooltip>
    </div>
  );
}
