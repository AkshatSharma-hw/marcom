import type { KeyboardEvent } from "react";

/** Spread props that make a non-button element (table row, card) keyboard-
 *  activatable: role, tabIndex, and Enter/Space activation mirroring click. */
export function rowInteractionProps(onActivate: () => void): {
  role: "button";
  tabIndex: 0;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
} {
  return {
    role: "button",
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}
