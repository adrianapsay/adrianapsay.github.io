"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav>
      {LINKS.map((l) => {
        const current = l.href === "/" ? path === "/" : path === l.href || path.startsWith(l.href + "/");
        return (
          <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
      <ThemeToggle />
    </nav>
  );
}
