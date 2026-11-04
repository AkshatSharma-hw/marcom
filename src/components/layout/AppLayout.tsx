import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ErrorBoundary } from "@/components/marcomm/ErrorBoundary";
import { HelpRail } from "@/components/playbook/HelpRail";
import { SynopsisPanel } from "@/components/playbook/SynopsisPanel";
import { OperationsPlaybook } from "@/components/playbook/OperationsPlaybook";
import { getHelpForPath } from "@/data/page-help";
import { IS_MENU_VISIBLE } from "@/lib/appChrome";

export function AppLayout() {
  const { pathname } = useLocation();
  const help = getHelpForPath(pathname);
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();

  // Auto-close panels when route changes to a page without help registered
  useEffect(() => {
    if (!help) {
      setSynopsisOpen(false);
      setPlaybookOpen(false);
    }
  }, [help, pathname]);

  // Close the mobile nav sheet on navigation or when resizing up to desktop
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobile) setMobileNavOpen(false);
  }, [isMobile]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Chrome is omitted entirely when a host platform frames this module —
          see src/lib/appChrome.ts. Not hidden with CSS: the sidebar reads the
          role and the topbar the scope, and mounting them invisibly would keep
          that work (and their keyboard focus stops) in a page that has no
          navigation. */}
      {IS_MENU_VISIBLE && (
        <>
          <AppSidebar />

          {/* Mobile navigation drawer (below md) */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent side="left" className="w-72 p-0 md:hidden" aria-describedby={undefined}>
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <AppSidebar variant="sheet" onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>
        </>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        {IS_MENU_VISIBLE && (
          <Topbar>
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
          </Topbar>
        )}
        <div className="flex-1 overflow-y-auto max-md:[&>*]:!p-4">
          {/* Route-level error isolation: a crash on one page never takes down
              the shell; keying by pathname lets navigation recover it. */}
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {IS_MENU_VISIBLE && help && synopsisOpen && (
        <SynopsisPanel
          open={synopsisOpen}
          onClose={() => setSynopsisOpen(false)}
          sections={help.synopsis}
        />
      )}

      {IS_MENU_VISIBLE && help && (
        <HelpRail
          synopsisOpen={synopsisOpen}
          onToggleSynopsis={() => setSynopsisOpen(o => !o)}
          onOpenPlaybook={() => setPlaybookOpen(true)}
        />
      )}

      {IS_MENU_VISIBLE && help && (
        <OperationsPlaybook
          open={playbookOpen}
          onClose={() => setPlaybookOpen(false)}
          title={help.playbookTitle}
          subtitle={help.playbookSubtitle}
          phases={help.playbook}
        />
      )}
    </div>
  );
}
