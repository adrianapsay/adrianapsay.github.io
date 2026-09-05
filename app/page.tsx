import { profile, timeline } from "@/lib/data";

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="flow-root">
        <img
          src="/profile.jpg"
          alt={profile.name}
          className="mx-auto mb-6 block w-48 rounded-lg sm:float-right sm:mx-0 sm:mb-4 sm:ml-8 sm:w-64"
        />
        <h1 className="mb-2 text-2xl font-semibold">{profile.name}</h1>
        <p className="text-center font-courier text-sm text-neutral-600">{profile.email}</p>
        <div className="mt-1 flex justify-center gap-3 font-courier text-sm">
          {profile.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-neutral-600 hover:text-neutral-900 hover:underline"
            >
              {link.label}
            </a>
          ))}
        </div>
        <p className="mt-4 leading-relaxed">{profile.bio}</p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">News</h2>
        <ul className="space-y-2">
          {timeline.map((item, i) => (
            <li key={i} className="flex gap-4 text-sm leading-relaxed">
              <span className="w-16 shrink-0 text-neutral-500">{item.date}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}