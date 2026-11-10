import type { Metadata } from "next";
import { IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { profile } from "@/lib/data";
import { Nav } from "@/components/Nav";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  style: ["normal", "italic"],
  axes: ["opsz"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: profile.name,
  description: profile.bio[0],
};

// Dark by default; light only when the visitor picked it. Runs before first paint.
const themeScript = `(function(){try{document.documentElement.setAttribute("data-theme",localStorage.getItem("theme")==="light"?"light":"dark")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${plexMono.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <header>
          <Link className="name" href="/">
            {profile.name}
          </Link>
          <Nav />
        </header>
        {children}
      </body>
    </html>
  );
}
