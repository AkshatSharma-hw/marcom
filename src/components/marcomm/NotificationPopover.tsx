import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlarmClock,
  AlertTriangle,
  Bell,
  CheckSquare,
  ImageOff,
  type LucideIcon,
} from "lucide-react";
import { getSeedDB } from "@/data/seed";
import type { Notification, NotifKind } from "@/data/types";
import { useCollection } from "@/store/DataStore";
import { canSeeNav, useRole, type AppRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/** The seed dataset is frozen around this date; relative times anchor to it. */
const DEMO_NOW = Date.parse("2026-08-13T12:00:00Z");

const KIND_ICONS: Record<NotifKind, LucideIcon> = {
  "approval-due": CheckSquare,
  "sla-breach": AlarmClock,
  "asset-expiry": ImageOff,
  crisis: AlertTriangle,
};

/** '5m ago' / '3h ago' / '2d ago' relative to the frozen demo date. */
function relTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const mins = Math.max(0, Math.round((DEMO_NOW - t) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Route for a notification's subject, or null when there is nothing this role
 * can open.
 *
 * Crisis notifications are addressed to the war room, which is not the same set
 * of roles the governance center admits: in the shipped pack NTF-039 goes to
 * the PR Manager, and `/governance` excludes that role. Sending them there
 * turned the one notification whose whole purpose is to be opened into a trip
 * to the restricted-area notice, so the row stays put instead.
 */
function subjectPath(n: Notification, role: AppRole): string | null {
  switch (n.subjectEntity) {
    case "CrisisIncident":
      return canSeeNav(role, "governance") ? "/governance" : null;
    case "Approval":
      return "/approvals";
    case "Campaign":
      return `/campaigns/${n.subjectId}`;
    case "Content":
      return `/content/${n.subjectId}`;
    case "Asset":
      return `/assets?id=${n.subjectId}`;
    case "CampaignActivity": {
      const activity = getSeedDB().campaignActivities.find(
        (a) => a.id === n.subjectId,
      );
      return activity ? `/campaigns/${activity.campaignId}` : null;
    }
    default:
      return null;
  }
}

/** Bell + unread badge + notification list for the signed-in stakeholder. */
export function NotificationPopover() {
  const db = getSeedDB();
  const { role } = useRole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const notifications = useCollection<Notification>(
    "notifications",
    getSeedDB().notifications,
  );

  // The signed-in demo identity maps to the seed stakeholder holding that role.
  const stakeholder = db.stakeholders.find((s) => s.role === role);

  const mine = notifications.records
    .filter(
      (n) =>
        stakeholder !== undefined &&
        n.recipientStakeholderId === stakeholder.id,
    )
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at, DEFAULT_LOCALE));

  const unread = mine.filter((n) => !n.read);

  const markRead = (n: Notification): void => {
    if (n.read) return;
    notifications.updateIn(n.id, {
      read: true,
      updatedAt: new Date().toISOString(),
    });
  };

  const openItem = (n: Notification): void => {
    markRead(n);
    const path = subjectPath(n, role);
    if (path) {
      setOpen(false);
      navigate(path);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={
            unread.length > 0
              ? `Notifications, ${unread.length} unread`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unread.length > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground tabular-nums"
            >
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => unread.forEach(markRead)}
            >
              Mark all read
            </Button>
          )}
        </div>
        {mine.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications
          </p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {mine.map((n) => {
              const Icon = KIND_ICONS[n.notifKind] ?? Bell;
              // A row with no route this role can open still marks itself read;
              // saying so beats a click that silently does nothing.
              const openable = subjectPath(n, role) !== null;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    title={
                      openable
                        ? undefined
                        : "Marks as read only — this subject has no page open to your role."
                    }
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-xs leading-snug",
                          n.read ? "text-muted-foreground" : "font-medium",
                        )}
                      >
                        {n.message}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {relTime(n.at)}
                      </span>
                    </span>
                    {!n.read && (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                        role="img"
                        aria-label="Unread"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
