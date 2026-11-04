import { useCallback, useState } from "react";

export interface SavedView<F> {
  name: string;
  filters: F;
}

const storageKey = (pageId: string): string => `marcomm-views:${pageId}`;

function readViews<F>(pageId: string): SavedView<F>[] {
  try {
    const raw = localStorage.getItem(storageKey(pageId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedView<F>[]) : [];
  } catch {
    return [];
  }
}

/** Per-page saved filter views persisted to localStorage ('marcomm-views:<pageId>'). */
export function useSavedViews<F>(pageId: string, onApply: (filters: F) => void) {
  const [views, setViews] = useState<SavedView<F>[]>(() => readViews<F>(pageId));

  const persist = useCallback(
    (next: SavedView<F>[]) => {
      setViews(next);
      try {
        localStorage.setItem(storageKey(pageId), JSON.stringify(next));
      } catch {
        // Storage unavailable — views still work for the session.
      }
    },
    [pageId],
  );

  const saveView = useCallback(
    (name: string, filters: F) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      persist([...views.filter((v) => v.name !== trimmed), { name: trimmed, filters }]);
    },
    [views, persist],
  );

  const applyView = useCallback(
    (name: string) => {
      const view = views.find((v) => v.name === name);
      if (view) onApply(view.filters);
    },
    [views, onApply],
  );

  const deleteView = useCallback(
    (name: string) => {
      persist(views.filter((v) => v.name !== name));
    },
    [views, persist],
  );

  return { views, saveView, applyView, deleteView };
}
