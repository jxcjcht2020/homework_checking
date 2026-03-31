import type { Location } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to: string;
}

export interface BreadcrumbState {
  trail?: BreadcrumbItem[];
}

export function getPathFromLocation(location: Pick<Location, "pathname" | "search" | "hash">) {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function getBreadcrumbTrail(state: unknown): BreadcrumbItem[] {
  if (!state || typeof state !== "object" || !Array.isArray((state as BreadcrumbState).trail)) {
    return [];
  }
  const trail = (state as BreadcrumbState).trail ?? [];
  return trail.filter(
    (item): item is BreadcrumbItem => !!item && typeof item.label === "string" && typeof item.to === "string",
  );
}

export function createBreadcrumbState(
  location: Pick<Location, "pathname" | "search" | "hash" | "state">,
  currentLabel: string,
) {
  const base = getBreadcrumbTrail(location.state);
  const currentPath = getPathFromLocation(location);
  if (base.length && base[base.length - 1]?.to === currentPath) {
    return { trail: base };
  }
  return {
    trail: [...base, { label: currentLabel, to: currentPath }],
  } satisfies BreadcrumbState;
}
