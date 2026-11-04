import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { useLiveDB } from "@/data/useLiveDB";
import type { SeedDB } from "@/data/types";
import { canSeeNav, useRole, type AppRole, type NavKey } from "@/lib/rbac";
import { agencyScopeForRole, type AgencyScope } from "@/lib/agencyScope";

const MAX_PER_GROUP = 8;

/** Roles allowed to read Restricted communication subjects. */
const RESTRICTED_VIEWERS: readonly AppRole[] = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Platform Admin",
];

interface SearchItem {
  id: string;
  label: string;
  status: string;
  to: string;
}

interface SearchGroup {
  heading: string;
  navKey: NavKey;
  items: SearchItem[];
}

function buildGroups(
  db: SeedDB,
  query: string,
  role: AppRole,
  agencyScope: AgencyScope | null,
  canSeeRestricted: boolean,
): SearchGroup[] {
  const q = query.trim().toLowerCase();
  const matches = (label: string) => q === "" || label.toLowerCase().includes(q);
  const top = (items: SearchItem[]) => items.slice(0, MAX_PER_GROUP);

  const groups: SearchGroup[] = [
    {
      heading: "Campaigns",
      navKey: "campaigns",
      items: top(
        db.campaigns
          .filter((c) => !agencyScope || agencyScope.campaignIds.has(c.id))
          .filter((c) => matches(c.name))
          .map((c) => ({ id: c.id, label: c.name, status: c.status, to: `/campaigns/${c.id}` })),
      ),
    },
    {
      heading: "Content",
      navKey: "content",
      items: top(
        db.contents
          .filter((c) => !agencyScope || agencyScope.contentIds.has(c.id))
          .filter((c) => matches(c.title))
          .map((c) => ({ id: c.id, label: c.title, status: c.status, to: `/content/${c.id}` })),
      ),
    },
    {
      heading: "Ideas",
      navKey: "ideas",
      items: agencyScope
        ? []
        : top(
            db.ideas
              .filter((i) => matches(i.title))
              .map((i) => ({ id: i.id, label: i.title, status: i.status, to: `/ideas?id=${i.id}` })),
          ),
    },
    {
      heading: "Assets",
      navKey: "assets",
      items: top(
        db.assets
          .filter((a) => !agencyScope || agencyScope.assetIds.has(a.id))
          .filter((a) => matches(a.filename))
          .map((a) => ({ id: a.id, label: a.filename, status: a.status, to: `/assets?id=${a.id}` })),
      ),
    },
    {
      heading: "Audiences",
      navKey: "audiences",
      items: top(
        db.audiences
          .filter((a) => matches(a.name))
          .map((a) => ({ id: a.id, label: a.name, status: a.audienceKind, to: `/audiences?id=${a.id}` })),
      ),
    },
    {
      heading: "Communications",
      navKey: "communications",
      items: top(
        db.communications
          .map((c) => ({
            id: c.id,
            label:
              c.classification === "Restricted" && !canSeeRestricted
                ? "Restricted communication"
                : c.subject,
            status: c.status,
            to: `/communications?id=${c.id}`,
          }))
          .filter((c) => matches(c.label)),
      ),
    },
  ];

  return groups.filter(
    (group) => canSeeNav(role, group.navKey) && group.items.length > 0,
  );
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { role } = useRole();
  const db = useLiveDB();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const canSeeRestricted = RESTRICTED_VIEWERS.includes(role);
  const agencyScope = useMemo(() => agencyScopeForRole(db, role), [db, role]);

  const groups = useMemo(
    () => buildGroups(db, query, role, agencyScope, canSeeRestricted),
    [db, query, role, agencyScope, canSeeRestricted],
  );

  const handleSelect = (to: string) => {
    setOpen(false);
    setQuery("");
    navigate(to);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Search everything"
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Search</span>
        <kbd className="pointer-events-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search campaigns, content, ideas, assets…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.id}`}
                  onSelect={() => handleSelect(item.to)}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <StatusBadge status={item.status} className="ml-2 shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
