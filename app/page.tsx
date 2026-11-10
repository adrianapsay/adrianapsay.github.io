import { Fragment } from "react";
import { profile, timeline } from "@/lib/data";
import { BirdSky } from "@/components/BirdSky";

export default function Home() {
  return (
    <>
      <BirdSky src="/profile.jpg" alt={profile.name} />

      <main>
        <section className="hero">
          <h1>{profile.name}</h1>
          {profile.bio.map((paragraph, i) => (
            <p key={i} className={i === 0 ? "tagline" : undefined}>
              {paragraph}
            </p>
          ))}
          <p className="socials">
            <span className="email">{profile.email}</span>
            {profile.links.map((link) => (
              <Fragment key={link.href}>
                <span className="sep">&middot;</span>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </Fragment>
            ))}
          </p>
        </section>

        <section>
          <h2 className="section-title">Recent-ish Updates...</h2>
          <ul className="timeline">
            {timeline.map((item, i) => (
              <li key={i}>
                <time>{item.date}</time>
                <p>
                  {item.text}
                  {item.links && (
                    <span className="links">
                      {item.links.map((link) => (
                        <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                          {link.label}
                        </a>
                      ))}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
