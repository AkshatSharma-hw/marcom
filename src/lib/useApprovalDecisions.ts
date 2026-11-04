/**
 * The approvals decision path, shared by the `/approvals` inbox and the routed
 * `/approvals/:id` record page.
 *
 * Both surfaces must apply exactly the same rules — the same subject-title
 * resolution, the same GR-09 ownership test, the same status propagation onto
 * the subject. One shared hook is what stops the detail page becoming a second,
 * laxer path to the same mutation. It lives outside both component modules so
 * neither page owns the other's logic.
 */

import { toast } from "sonner";

import { getSeedDB } from "@/data/seed";
import type {
  Approval,
  ApprovalStatus,
  Brand,
  Brief,
  BriefStatus,
  Campaign,
  CampaignStatus,
  Communication,
  CommunicationStatus,
  Content,
  ContentStatus,
  EntityName,
  SeedDB,
  Stakeholder,
} from "@/data/types";
import { useLiveDB } from "@/data/useLiveDB";
import { useRole, type AppRole } from "@/lib/rbac";
import { useCollection, type Collection } from "@/store/DataStore";

export const PENDING: ApprovalStatus[] = ["Requested", "In Review", "Escalated"];

/**
 * GR-09 segregation of duties — the person who owns (or authored) the subject of
 * an approval may never be the person who decides it. The rule is enforced in
 * two places: the row's decision buttons are disabled, and `decide()` refuses
 * the mutation so the guard cannot be bypassed.
 */
export const SOD_NOTE =
  "Segregation of duties — you own this item; another approver must decide";

/** Roles with org-wide SLA visibility (BLUEPRINT.md Part 9 — workload visibility). */
export const SLA_BOARD_ROLES: AppRole[] = [
  "CMO",
  "Corporate Comms Manager",
  "Legal/Compliance Reviewer",
  "Platform Admin",
];

/**
 * Everything a surface needs to read and decide an approval.
 *
 * The inbox and the routed detail page (`/approvals/:id`) must apply exactly
 * the same rules — the same subject-title resolution, the same GR-09 ownership
 * test, the same status propagation onto the subject. One shared hook is what
 * stops the detail page becoming a second, laxer path to the same mutation.
 */
export interface ApprovalDecisions {
  /** Live DB — reflects decisions taken in this session, not the frozen seed. */
  db: SeedDB;
  /** Seeded stakeholder holding the signed-in role, when one does. */
  stakeholder: Stakeholder | undefined;
  approvals: Collection<Approval>;
  subjectTitle: (entity: EntityName, id: string) => string;
  approverName: (stakeholderId: string) => string;
  stageName: (workflowStageId: string) => string;
  /** Stakeholder who owns/authored the subject, when the entity records one. */
  subjectOwnerStakeholderId: (approval: Approval) => string | undefined;
  /** GR-09 — true when the signed-in stakeholder owns the approval's subject. */
  ownsSubject: (approval: Approval) => boolean;
  /** Records the decision. Returns false when GR-09 refused the mutation. */
  decide: (approval: Approval, status: ApprovalStatus, verb: string) => boolean;
}

export function useApprovalDecisions(): ApprovalDecisions {
  /* Labels and blockers read the live DB, not the frozen seed: a campaign
     promoted on the Ideation hub, a brief created with it, or a stage published
     in the workflow designer used to render here as a raw id (`CMP-021`,
     `WFS-016`) because the decision paths below write the store while the
     lookups read the shipped dataset. */
  const db = useLiveDB();
  const { role } = useRole();
  const approvals = useCollection<Approval>("approvals", getSeedDB().approvals);
  // Subject collections — registered with the exact ids the rest of the app
  // uses ("contents" AdminPage/useLiveDB, "campaigns" IdeationHub/AdminPage,
  // "briefs" seed graph) so decisions surface app-wide through useLiveDB.
  const contents = useCollection<Content>("contents", getSeedDB().contents);
  const briefs = useCollection<Brief>("briefs", getSeedDB().briefs);
  const campaigns = useCollection<Campaign>("campaigns", getSeedDB().campaigns);
  const communications = useCollection<Communication>(
    "communications",
    getSeedDB().communications,
  );
  const brands = useCollection<Brand>("brands", getSeedDB().brands);

  // The signed-in demo identity maps to the seed stakeholder holding that role.
  const stakeholder = db.stakeholders.find((s) => s.role === role);

  const subjectTitle = (entity: EntityName, id: string): string => {
    const pools: Partial<Record<EntityName, { id: string }[]>> = {
      Brief: db.briefs,
      Content: db.contents,
      ContentVersion: db.contentVersions,
      Campaign: db.campaigns,
      Communication: db.communications,
      Asset: db.assets,
      Budget: db.budgets,
      Brand: db.brands,
    };
    const row = pools[entity]?.find((r) => r.id === id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return id;
    for (const key of ["title", "name", "subject", "filename"]) {
      const v = row[key];
      if (typeof v === "string" && v.length > 0) return v;
    }
    return id;
  };

  const approverName = (stakeholderId: string): string =>
    db.stakeholders.find((s) => s.id === stakeholderId)?.name ?? stakeholderId;

  /**
   * Stakeholder who owns the approval's subject, when the entity records one:
   *   Content / Campaign / Communication → ownerStakeholderId
   *   Brief                              → authorStakeholderId
   *   ContentVersion                     → the parent Content's owner
   * Entities with no ownership field (Asset, Budget, Brand) return undefined,
   * which never matches a stakeholder id, so they stay decidable.
   */
  const subjectOwnerStakeholderId = (approval: Approval): string | undefined => {
    switch (approval.subjectEntity) {
      case "Content":
        return contents.records.find((c) => c.id === approval.subjectId)
          ?.ownerStakeholderId;
      case "ContentVersion": {
        const version = db.contentVersions.find((v) => v.id === approval.subjectId);
        return version
          ? contents.records.find((c) => c.id === version.contentId)?.ownerStakeholderId
          : undefined;
      }
      case "Brief":
        return briefs.records.find((b) => b.id === approval.subjectId)
          ?.authorStakeholderId;
      case "Campaign":
        return campaigns.records.find((c) => c.id === approval.subjectId)
          ?.ownerStakeholderId;
      case "Communication":
        return communications.records.find((c) => c.id === approval.subjectId)
          ?.ownerStakeholderId;
      default:
        return undefined;
    }
  };

  /** GR-09 — true when the signed-in stakeholder owns the approval's subject. */
  const ownsSubject = (approval: Approval): boolean =>
    stakeholder !== undefined &&
    subjectOwnerStakeholderId(approval) === stakeholder.id;

  const stageName = (workflowStageId: string): string =>
    db.workflowStages.find((s) => s.id === workflowStageId)?.name ?? workflowStageId;

  /**
   * Propagate a decision onto the approval's subject record.
   *
   * Transition table (decision → subject status):
   *   Content:  Approved → 'Approved' · Rejected → 'Rework'  · Changes Requested → 'Rework'
   *   Brief:    Approved → 'Approved' · Rejected → 'Draft'   · Changes Requested → 'Draft'
   *   Campaign:      Approved → 'Approved' · Rejected → 'Planned' · Changes Requested → 'Planned'
   *   Communication: Approved → 'Approved' · Rejected → 'Rework'  · Changes Requested → 'Rework'
   *   Brand:    Approved → the tone proposed in the approval comment is applied
   *
   * Returns the subject's new status, or null when the subject entity has no
   * lifecycle to advance (or the record no longer exists).
   */
  const advanceSubject = (
    approval: Approval,
    decision: ApprovalStatus,
    now: string,
  ): string | null => {
    const approved = decision === "Approved";
    switch (approval.subjectEntity) {
      case "Content": {
        if (!contents.records.some((r) => r.id === approval.subjectId)) return null;
        const next: ContentStatus = approved ? "Approved" : "Rework";
        contents.updateIn(approval.subjectId, { status: next, updatedAt: now });
        return next;
      }
      case "Brief": {
        if (!briefs.records.some((r) => r.id === approval.subjectId)) return null;
        const next: BriefStatus = approved ? "Approved" : "Draft";
        briefs.updateIn(approval.subjectId, { status: next, updatedAt: now });
        return next;
      }
      case "Campaign": {
        if (!campaigns.records.some((r) => r.id === approval.subjectId)) return null;
        const next: CampaignStatus = approved ? "Approved" : "Planned";
        campaigns.updateIn(approval.subjectId, { status: next, updatedAt: now });
        return next;
      }
      case "Communication": {
        if (!communications.records.some((r) => r.id === approval.subjectId)) return null;
        const next: CommunicationStatus = approved ? "Approved" : "Rework";
        communications.updateIn(approval.subjectId, { status: next, updatedAt: now });
        return next;
      }
      case "Brand": {
        if (!approved) return null;
        if (!brands.records.some((r) => r.id === approval.subjectId)) return null;
        const proposed = /^Proposed tone:\s*([\s\S]+)$/.exec(approval.comment ?? "");
        if (!proposed) return null;
        brands.updateIn(approval.subjectId, { tone: proposed[1], updatedAt: now });
        return null;
      }
      default:
        return null;
    }
  };

  const decide = (
    approval: Approval,
    status: ApprovalStatus,
    verb: string,
  ): boolean => {
    // GR-09 — server-side equivalent of the disabled buttons: an owner can never
    // decide their own item, however the call is reached. The routed detail
    // page calls this same function, so the rule holds there too.
    if (ownsSubject(approval)) {
      toast.error("Blocked by segregation of duties", {
        description: `${approval.id} · you own ${subjectTitle(
          approval.subjectEntity,
          approval.subjectId,
        )} — another approver must decide it.`,
      });
      return false;
    }
    const now = new Date().toISOString();
    approvals.updateIn(approval.id, {
      status,
      decidedAt: now,
      updatedAt: now,
    });
    const title = subjectTitle(approval.subjectEntity, approval.subjectId);
    const nextStatus = advanceSubject(approval, status, now);
    if (nextStatus !== null) {
      toast.success(`${verb} — ${title} moved to ${nextStatus}`, {
        description: `${approval.id} · decision recorded`,
      });
    } else {
      toast.success(`${verb} '${title}'`, {
        description: `${approval.id} · decision recorded`,
      });
    }
    return true;
  };

  return {
    db,
    stakeholder,
    approvals,
    subjectTitle,
    approverName,
    stageName,
    subjectOwnerStakeholderId,
    ownsSubject,
    decide,
  };
}
