import { Fragment } from "react";
import { profile } from "@/lib/data";

export default function BlogLayout({ children }: LayoutProps<"/blog">) {
  return (
    <>
      {children}
      <footer>
        {profile.links.map((link, i) => (
          <Fragment key={link.href}>
            {i > 0 && <span className="sep">&middot;</span>}
            <a href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          </Fragment>
        ))}
        <span className="sep">&middot;</span>
        <span>{profile.email}</span>
      </footer>
    </>
  );
}
