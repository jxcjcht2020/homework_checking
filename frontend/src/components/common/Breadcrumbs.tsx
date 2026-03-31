import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { BreadcrumbItem } from "../../lib/navigation";
import { getBreadcrumbTrail } from "../../lib/navigation";

interface BreadcrumbsProps {
  fallback?: BreadcrumbItem[];
  current?: ReactNode;
}

export function Breadcrumbs({ fallback = [], current }: BreadcrumbsProps) {
  const location = useLocation();
  const trail = getBreadcrumbTrail(location.state);
  const items = trail.length ? trail : fallback;

  if (!items.length && !current) return null;

  return (
    <div className="breadcrumb-row">
      {items.map((item, index) => (
        <span key={`${item.to}-${index}`}>
          <Link to={item.to}>{item.label}</Link>
          {current || index < items.length - 1 ? <span> / </span> : null}
        </span>
      ))}
      {current ? <span>{current}</span> : null}
    </div>
  );
}

