import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { profile } from "@/lib/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: profile.name,
  description: profile.bio[0],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fffbf3] text-neutral-900">
        <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
          <header className="mb-12 flex items-baseline justify-between">
            <Link href="/" className="font-medium hover:underline">
              {profile.name}
            </Link>
            <nav className="flex gap-4 text-sm text-neutral-600">
              <Link href="/" className="hover:text-neutral-900 hover:underline">
                Home
              </Link>
              <Link href="/blog" className="hover:text-neutral-900 hover:underline">
                Blog
              </Link>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
