import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { IS_MENU_VISIBLE } from "@/lib/appChrome";
import { duplicatesNavLabel } from "@/lib/navLabels";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned actions slot. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  const { pathname } = useLocation();

  /* With the sidebar on screen the active item already names the page, in a
     highlighted row carrying aria-current — so printing the same words again
     directly beneath it is noise.

     Two conditions have to hold before dropping it, and both are about the
     title still being the page's only name somewhere:
      - IS_MENU_VISIBLE: with the chrome off (a host platform frames this
        module) there is no menu at all, so the title always renders.
      - the `md:` prefix below: the sidebar is `max-md:hidden`, so on a narrow
        viewport the menu is a drawer the user has to open. Nothing on screen
        names the page there either, so the title comes back.

     Even when hidden it stays in the accessibility tree rather than being
     removed — it is the page's only top-level heading, and screen reader users
     navigate by heading. */
  const redundant = IS_MENU_VISIBLE && duplicatesNavLabel(pathname, title);

  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className={cn("text-xl font-medium", redundant && "md:sr-only")}>{title}</h1>
        {description && (
          <p
            className={cn(
              "mt-0.5 text-sm text-muted-foreground",
              // Where the title is hidden the description becomes the page's
              // opening line, so it loses the offset that tucked it under one.
              redundant && "md:mt-0",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
