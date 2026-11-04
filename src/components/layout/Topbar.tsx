import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, SlidersHorizontal, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopilotPanel } from "@/components/marcomm/CopilotPanel";
import { GlobalSearch } from "@/components/marcomm/GlobalSearch";
import { NotificationPopover } from "@/components/marcomm/NotificationPopover";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/rbac";
import {
  BRANDS,
  BUSINESS_UNITS,
  LOCALES,
  REGIONS,
  useScope,
  type BrandId,
  type BusinessUnitId,
  type LocaleId,
  type RegionId,
} from "@/lib/scope";
import { LOCALE_SCOPE_HINT, localeScopeApplies } from "@/lib/localeScope";

const ALL = "all";

/**
 * Brand / business unit / region / language selects, shared by the desktop row
 * and mobile popover. Language is a scope dimension like the other three:
 * content is held per locale, so "which language" is a question about which
 * records are in view, not a display preference.
 */
function ScopeSelects({ stacked = false }: { stacked?: boolean }) {
  const { brandId, businessUnitId, regionId, localeId, setScope } = useScope();
  const { pathname } = useLocation();
  const localeApplies = localeScopeApplies(pathname);

  const trigger = (width: string) =>
    stacked ? "h-8 w-full text-xs" : `h-8 ${width} text-xs`;

  const field = (label: string, select: ReactNode) =>
    stacked ? (
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        {select}
      </div>
    ) : (
      select
    );

  return (
    <>
      {field(
        "Brand",
        <Select
          value={brandId ?? ALL}
          onValueChange={(v) =>
            setScope({ brandId: v === ALL ? undefined : (v as BrandId) })
          }
        >
          <SelectTrigger className={trigger("w-[130px]")} aria-label="Brand scope">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All brands</SelectItem>
            {BRANDS.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}

      {field(
        "Business unit",
        <Select
          value={businessUnitId ?? ALL}
          onValueChange={(v) =>
            setScope({ businessUnitId: v === ALL ? undefined : (v as BusinessUnitId) })
          }
        >
          <SelectTrigger className={trigger("w-[140px]")} aria-label="Business unit scope">
            <SelectValue placeholder="All BUs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All BUs</SelectItem>
            {BUSINESS_UNITS.map((bu) => (
              <SelectItem key={bu.id} value={bu.id}>
                {bu.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}

      {field(
        "Region",
        <Select
          value={regionId ?? ALL}
          onValueChange={(v) =>
            setScope({ regionId: v === ALL ? undefined : (v as RegionId) })
          }
        >
          <SelectTrigger className={trigger("w-[120px]")} aria-label="Region scope">
            <SelectValue placeholder="All regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All regions</SelectItem>
            {REGIONS.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}

      {field(
        "Language",
        <Select
          value={localeId ?? ALL}
          onValueChange={(v) =>
            setScope({ localeId: v === ALL ? undefined : (v as LocaleId) })
          }
        >
          <SelectTrigger
            className={cn(trigger("w-[150px]"), !localeApplies && "opacity-60")}
            aria-label="Language scope"
            // Only content and rulebook records carry a locale, so on other
            // pages the control is honest about having no effect rather than
            // looking global and silently doing nothing.
            title={
              localeApplies
                ? "Language scope"
                : `Language scope applies to ${LOCALE_SCOPE_HINT}. Records on this page have no language.`
            }
          >
            <SelectValue placeholder="All languages" />
          </SelectTrigger>
          {/* No hint node inside SelectContent: Radix collects its children as
              items and throws on anything else, including a bare SelectLabel
              outside a SelectGroup. The reach is carried by the trigger's
              title and its dimmed state instead. */}
          <SelectContent>
            <SelectItem value={ALL}>All languages</SelectItem>
            {LOCALES.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}
    </>
  );
}

interface TopbarProps {
  /** Current page context slot rendered on the left. */
  children?: ReactNode;
  className?: string;
}

export function Topbar({ children, className }: TopbarProps) {
  const { currentUser } = useRole();

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between border-b bg-card px-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">{children}</div>

      <div className="flex items-center gap-2">
        {/* Below md the search trigger collapses to its icon */}
        <div className="max-md:[&_button]:w-8 max-md:[&_button]:justify-center max-md:[&_button]:px-0 max-md:[&_button>span]:hidden max-md:[&_kbd]:hidden">
          <GlobalSearch />
        </div>

        {/* Full scope row only where it actually fits.
            Measured: the row needs 1017px of header, and header width is
            viewport minus the sidebar and padding — so it fits from ~1306px up.
            It was gated at `md` (768px), which meant five controls totalling
            ~700px were rendered into a header that could not hold them and the
            right-hand end was silently clipped (26px at 1280, 126px at 1180).
            Below the threshold the compact Filters popover below takes over —
            it already exists for exactly this. */}
        <div className="hidden items-center gap-2 min-[1320px]:flex">
          <ScopeSelects />
        </div>

        {/* Mobile scope switcher: single Filters popover (below md) */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Scope filters"
              className="flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[1320px]:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Filters</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-64 space-y-3 p-3 min-[1320px]:hidden"
            onInteractOutside={(e) => {
              // Select dropdowns portal outside the popover; keep it open while using them
              if (
                e.target instanceof Element &&
                e.target.closest("[data-radix-popper-content-wrapper]")
              ) {
                e.preventDefault();
              }
            }}
          >
            <ScopeSelects stacked />
          </PopoverContent>
        </Popover>

        {/* MarCom Copilot (agent A8) — answers from this workspace's records */}
        <CopilotPanel />

        <NotificationPopover />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border bg-background py-1 pl-1 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:gap-1 max-md:pr-2"
              aria-label={`Signed in as ${currentUser.name}`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {currentUser.initials}
              </span>
              <span className="max-w-[140px] truncate text-xs font-medium max-md:hidden">
                {currentUser.name}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{currentUser.name}</div>
              <div className="text-xs text-muted-foreground">
                {currentUser.title}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/login">
                <UserRound className="mr-2 h-4 w-4" aria-hidden="true" />
                Switch identity
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
