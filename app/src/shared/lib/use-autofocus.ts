"use client"

import { useCallback } from "react"

/** Focuses an element as soon as it mounts — same timing as the JSX `autoFocus` attribute,
 * but SonarQube (S9379) flags `autoFocus` itself as an accessibility risk since it can steal
 * focus unexpectedly. A stable callback ref (not a plain useRef + mount-effect) is used so
 * this fires correctly even when the surrounding component doesn't itself remount — e.g. a
 * persistent modal whose Dialog wrapper mounts/unmounts its children on open/close, or an
 * inline form toggled by local state within an otherwise-stable component: the callback only
 * re-runs when the specific DOM node it's attached to is created or removed. */
export function useAutoFocus<T extends HTMLElement>() {
  return useCallback((el: T | null) => {
    el?.focus()
  }, [])
}
