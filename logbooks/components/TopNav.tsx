"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Route {
  href: string;
  label: string;
}

const DOC_ROUTES: Route[] = [
  { href: "/admiral",         label: "About" },
  { href: "/getting-started", label: "Setup" },
  { href: "/tutorial",        label: "Tutorial" },
];

const LOGBOOK_ROUTES: Route[] = [
  { href: "/chronicle", label: "Chronicle" },
  { href: "/phases",    label: "Phases" },
  { href: "/graph",     label: "Graph" },
];

export default function TopNav() {
  const pathname = usePathname() || "/";

  function renderRoute(r: Route) {
    const isActive =
      r.href === "/" ? pathname === "/" : pathname.startsWith(r.href);
    return (
      <Link
        key={r.href}
        href={r.href}
        className={`route${isActive ? " active" : ""}`}
      >
        {r.label}
      </Link>
    );
  }

  return (
    <nav className="top-nav" aria-label="Primary">
      <div className="top-nav-inner">
        <Link href="/" className="brand">The Helm Chronicle</Link>
        {DOC_ROUTES.map(renderRoute)}
        <span className="nav-sep" aria-hidden="true" />
        {LOGBOOK_ROUTES.map(renderRoute)}
      </div>
    </nav>
  );
}
