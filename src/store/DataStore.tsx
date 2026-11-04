import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

import { activeDemoPackId } from "@/lib/demoPack";
import {
  actorIdForRole,
  appendAudit,
  collectionForEntity,
  describeCollection,
  diffFields,
  parseAuditLog,
  type AuditDraft,
} from "@/lib/auditTrail";
import { useRole } from "@/lib/rbac";
import type { AuditRecord } from "@/data/types";

/**
 * Client-side record store for the MarComm demo.
 *
 * There is no backend and no network layer in this app — every screen ships
 * with its data as a module-level seed array. This store gives Save/Delete
 * buttons somewhere to write to, and persists to localStorage so records
 * survive a reload.
 *
 * Collections are *self-registering*: a screen passes its existing seed array
 * to `useCollection` and gets back live records plus CRUD helpers. Nothing is
 * copied into storage until it is actually mutated, so untouched modules keep
 * rendering their original seed and the payload stays small.
 *
 * Every mutation also writes an `AuditRecord` (src/data/types.ts) into a
 * durable, append-only trail persisted in the same payload as the records. The
 * shape and the append rules live in src/lib/auditTrail.ts; this file owns the
 * React state and the storage round-trip.
 *
 * Ported from the sibling governance app (ui/governance/src/app/store/DataStore.tsx).
 */

/**
 * Persisted state is scoped to the active demo pack.
 *
 * Records are keyed by collection id ("approvals", "campaigns"), which is not
 * unique across packs — an unscoped key meant switching VITE_DEMO_PACK loaded
 * the previous pack's mutations on top of the new pack's seed, so an approval
 * decided in one industry world reappeared, dangling, in another.
 */
const STORAGE_KEY = `marcomm-store:${activeDemoPackId()}`;
const VERSION = "v1"; // bump to discard saved data after a breaking seed change

/** Every record the store manages must carry a stable string id. */
export interface StoreRecord {
  id: string;
}

type StoredRow = StoreRecord & Record<string, unknown>;
type Collections = Record<string, StoredRow[]>;

/**
 * Flat view of one audit record, as the audit surfaces consume it.
 *
 * This is a projection, not the source of truth — the persisted trail holds
 * full `AuditRecord`s. It stays because RecordAuditTrail, AgentActivityRail and
 * the crisis timeline all key off `recordId`/`ts`, and because those surfaces
 * merge these entries with seeded `AuditRecord`s: keeping the projection means
 * their merge keeps working unchanged now that the entries survive a reload.
 *
 * `action` covers the two trail-level events as well as the CRUD verbs —
 * a cap trim and a store reset are things that happened to the record set and
 * are recorded rather than performed silently.
 */
export interface AuditEntry {
  id: string;
  ts: number;
  collection: string;
  recordId: string;
  action: "create" | "update" | "delete" | "reset" | "trim";
  label: string;
}

/** Action-string suffix → the verb the flat projection exposes. */
const ENTRY_ACTIONS: Record<string, AuditEntry["action"]> = {
  created: "create",
  updated: "update",
  deleted: "delete",
  reset: "reset",
  trimmed: "trim",
};

/** `AuditRecord` → `AuditEntry`; lossless because entity ↔ collection is 1:1. */
function toEntry(record: AuditRecord): AuditEntry {
  const suffix = record.action.slice(record.action.lastIndexOf(".") + 1);
  return {
    id: record.id,
    ts: Date.parse(record.at),
    collection: collectionForEntity(record.entityType),
    recordId: record.entityId,
    action: ENTRY_ACTIONS[suffix] ?? "update",
    label: record.detail,
  };
}

interface DataContextValue {
  data: Collections;
  seeded: (collectionId: string, seed: StoredRow[]) => StoredRow[];
  createIn: (
    collectionId: string,
    seed: StoredRow[],
    record: Partial<StoredRow>,
    idPrefix?: string
  ) => string;
  updateIn: (
    collectionId: string,
    seed: StoredRow[],
    recordId: string,
    patch: Partial<StoredRow>
  ) => void;
  removeFrom: (collectionId: string, seed: StoredRow[], recordId: string) => void;
  resetCollection: (collectionId: string) => void;
  resetAll: () => void;
  audit: AuditEntry[];
  /** The durable trail itself, in the shape every audit surface already reads. */
  auditRecords: AuditRecord[];
}

const DataContext = createContext<DataContextValue | null>(null);

/* The random `uid()` that used to id audit entries is gone: a durable trail
   needs ids that are stable across reloads and orderable against each other,
   which is what auditTrail.ts's `ADT-RT-nnnn` sequence provides. */

/** Next sequential id following the convention already present in a collection. */
export function nextId(
  records: ReadonlyArray<{ id?: unknown; code?: unknown }>,
  prefix = "REC-"
): string {
  let learnedPrefix = prefix;
  let width = 3;
  let max = 0;
  for (const r of records) {
    const raw = String(r?.code ?? r?.id ?? "");
    const m = raw.match(/^(.*?)(\d+)$/);
    if (m) {
      learnedPrefix = m[1];
      width = Math.max(width, m[2].length);
      max = Math.max(max, parseInt(m[2], 10));
    }
  }
  return `${learnedPrefix}${String(max + 1).padStart(width, "0")}`;
}

interface PersistedState {
  data: Collections;
  audit: AuditRecord[];
}

/**
 * Read the saved payload.
 *
 * The audit trail rides in the same key as the records rather than one of its
 * own: they are written by the same mutations, they are scoped to the same demo
 * pack, and a version bump that discards stale records must discard the trail
 * describing them too — two keys would drift apart on exactly the change that
 * makes drift hardest to spot.
 */
function loadInitial(): PersistedState {
  const empty: PersistedState = { data: {}, audit: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        (parsed as { __v?: unknown }).__v === VERSION &&
        typeof (parsed as { data?: unknown }).data === "object" &&
        (parsed as { data?: unknown }).data !== null
      ) {
        return {
          data: (parsed as { data: Collections }).data,
          audit: parseAuditLog((parsed as { audit?: unknown }).audit),
        };
      }
    }
  } catch {
    /* corrupt or unavailable storage — fall back to seeds */
  }
  return empty;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadInitial);
  const [data, setData] = useState<Collections>(initial.data);
  /* Oldest-first, and only ever appended to — see appendAudit(). Deliberately
     no setter is exposed that can edit or remove an entry. */
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(initial.audit);
  // Lazy persistence: nothing is written to localStorage until a mutation
  // (create/update/remove/reset) actually happens in this session.
  const dirty = useRef(false);

  /* The signed-in identity is the audit actor. DataProvider therefore has to
     sit inside RoleProvider — it does, in App.tsx. Reading the role here rather
     than at each call site keeps every mutation attributable without asking
     twenty screens to pass an actor they have no other reason to know. */
  const { role } = useRole();

  useEffect(() => {
    if (!dirty.current) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ __v: VERSION, data, audit: auditRecords })
      );
    } catch {
      /* quota exceeded — keep working in memory */
    }
  }, [data, auditRecords]);

  /**
   * Append one entry to the trail.
   *
   * Takes the actor from the current role and everything else from the caller;
   * `appendAudit` assigns the id and the pinned-clock timestamp so ordering
   * cannot depend on which call site got there first.
   */
  const record = useCallback(
    (draft: Omit<AuditDraft, "actorStakeholderId">) =>
      setAuditRecords((log) =>
        appendAudit(log, { ...draft, actorStakeholderId: actorIdForRole(role) })
      ),
    [role]
  );

  /** Audit one create/update/delete against a collection's entity type. */
  const logMutation = useCallback(
    (
      collectionId: string,
      recordId: string,
      verb: "created" | "updated" | "deleted",
      before: StoredRow | Record<string, never>,
      after: StoredRow | Record<string, never>
    ) => {
      const { entity, noun } = describeCollection(collectionId);
      const past = `${verb[0].toUpperCase()}${verb.slice(1)}`;
      record({
        action: `${noun}.${verb}`,
        entityType: entity,
        entityId: recordId,
        detail: `${past} ${noun} ${recordId}. ${diffFields(before, after)}`,
      });
    },
    [record]
  );

  /** Live rows for a collection — the saved copy if it exists, else the seed. */
  const seeded = useCallback(
    (collectionId: string, seed: StoredRow[]) => data[collectionId] ?? seed,
    [data]
  );

  const createIn = useCallback(
    (
      collectionId: string,
      seed: StoredRow[],
      record: Partial<StoredRow>,
      idPrefix?: string
    ): string => {
      const current = data[collectionId] ?? seed;
      const recordId = record.id ?? nextId(current, idPrefix);
      const row: StoredRow = { ...record, id: String(recordId) };
      dirty.current = true;
      setData((prev) => ({
        ...prev,
        [collectionId]: [row, ...(prev[collectionId] ?? seed)],
      }));
      logMutation(collectionId, String(recordId), "created", {}, row);
      return String(recordId);
    },
    [data, logMutation]
  );

  const updateIn = useCallback(
    (
      collectionId: string,
      seed: StoredRow[],
      recordId: string,
      patch: Partial<StoredRow>
    ) => {
      /* The "before" row is read from the render-time snapshot rather than from
         inside the setData updater: updaters must stay pure, and logging from
         one would fire twice under StrictMode. Same snapshot createIn already
         reads, with the same consequence — two updates dispatched in a single
         tick diff against the same before. */
      const before = (data[collectionId] ?? seed).find(
        (r) => String(r.id) === String(recordId)
      );
      dirty.current = true;
      setData((prev) => ({
        ...prev,
        [collectionId]: (prev[collectionId] ?? seed).map((r) =>
          String(r.id) === String(recordId) ? { ...r, ...patch } : r
        ),
      }));
      logMutation(
        collectionId,
        String(recordId),
        "updated",
        before ?? {},
        before ? { ...before, ...patch } : (patch as StoredRow)
      );
    },
    [data, logMutation]
  );

  const removeFrom = useCallback(
    (collectionId: string, seed: StoredRow[], recordId: string) => {
      const before = (data[collectionId] ?? seed).find(
        (r) => String(r.id) === String(recordId)
      );
      dirty.current = true;
      setData((prev) => ({
        ...prev,
        [collectionId]: (prev[collectionId] ?? seed).filter(
          (r) => String(r.id) !== String(recordId)
        ),
      }));
      /* The deleted row is the whole point of the diff here: once it is gone
         the trail is the only place its field values still exist. */
      logMutation(collectionId, String(recordId), "deleted", before ?? {}, {});
    },
    [data, logMutation]
  );

  /** Drop local edits for one collection so it falls back to its seed. */
  const resetCollection = useCallback(
    (collectionId: string) => {
      dirty.current = true;
      setData((prev) => {
        const next = { ...prev };
        delete next[collectionId];
        return next;
      });
      /* Discarding every edit to a collection is a bigger change than any one
         update, so it cannot be the one thing the trail stays quiet about. It
         is filed against the trail itself, not the collection's entity, because
         no single record id is being reset. */
      record({
        action: "store.reset",
        entityType: "AuditRecord",
        entityId: "",
        detail: `Runtime edits to the "${collectionId}" collection were discarded; it now renders the shipped seed. Records created or edited in it are no longer present, though their audit entries above remain.`,
      });
    },
    [record]
  );

  const resetAll = useCallback(() => {
    dirty.current = true;
    setData({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — in-memory reset is enough */
    }
    /* The trail deliberately survives a full reset — it is append-only, and an
       audit log that any user can erase with one button is not evidence of
       anything. The persist effect rewrites the key immediately after this,
       with empty records and the trail intact. */
    record({
      action: "store.reset",
      entityType: "AuditRecord",
      entityId: "",
      detail:
        "Every collection was reset to its shipped seed from the admin screen. All runtime records were discarded; this trail was not.",
    });
  }, [record]);

  /* Newest-first, matching what the audit surfaces consumed when this was an
     unshifted in-memory array; they sort by timestamp anyway, but ties would
     otherwise resolve to whichever end the array grew from. */
  const audit = useMemo(
    () => auditRecords.map(toEntry).reverse(),
    [auditRecords]
  );

  const value = useMemo(
    () => ({
      data,
      seeded,
      createIn,
      updateIn,
      removeFrom,
      resetCollection,
      resetAll,
      audit,
      auditRecords,
    }),
    [
      data,
      seeded,
      createIn,
      updateIn,
      removeFrom,
      resetCollection,
      resetAll,
      audit,
      auditRecords,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function useStore(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useCollection must be used inside <DataProvider>");
  return ctx;
}

export interface Collection<T extends StoreRecord> {
  /** Live records — saved copy if the collection has been touched, else the seed. */
  records: T[];
  /** Create a record; id is derived via nextId() when omitted. Returns the id. */
  createIn: (record: Omit<T, "id"> & { id?: string }, idPrefix?: string) => string;
  updateIn: (recordId: string, patch: Partial<T>) => void;
  removeFrom: (recordId: string) => void;
  /** Discard local edits for this collection and fall back to the shipped seed. */
  resetCollection: () => void;
  /** Discard local edits for every collection. */
  resetAll: () => void;
  audit: AuditEntry[];
}

/**
 * Register a screen's seed data with the store and get live records + CRUD back.
 *
 * @param collectionId stable collection key, e.g. "campaigns"
 * @param seed         the array the screen previously rendered directly
 */
export function useCollection<T extends StoreRecord>(
  collectionId: string,
  seed: T[]
): Collection<T> {
  const store = useStore();
  const seedRows = seed as unknown as StoredRow[];
  const records = store.seeded(collectionId, seedRows) as unknown as T[];

  return useMemo(
    () => ({
      records,
      createIn: (record: Omit<T, "id"> & { id?: string }, idPrefix?: string) =>
        store.createIn(collectionId, seedRows, record as Partial<StoredRow>, idPrefix),
      updateIn: (recordId: string, patch: Partial<T>) =>
        store.updateIn(collectionId, seedRows, recordId, patch as Partial<StoredRow>),
      removeFrom: (recordId: string) =>
        store.removeFrom(collectionId, seedRows, recordId),
      resetCollection: () => store.resetCollection(collectionId),
      resetAll: store.resetAll,
      audit: store.audit,
    }),
    [records, collectionId, seedRows, store]
  );
}

/** Flat, newest-first view of the durable trail. */
export function useAuditTrail(): AuditEntry[] {
  return useStore().audit;
}

/**
 * The durable trail as `AuditRecord`s, oldest-first.
 *
 * Same shape as `db.auditRecords`, so a surface can concatenate the seeded
 * history with what this session wrote and sort the result by `at` without
 * translating between two event vocabularies.
 */
export function useAuditRecords(): AuditRecord[] {
  return useStore().auditRecords;
}
