import Link from "next/link";
import { getPostBySlug, getPostSlugs } from "@/lib/posts";
import { profile } from "@/lib/data";

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export default async function Post({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  return (
    <main className="post">
      <h1>{post.title}</h1>
      <div className="post-meta">
        <span>{profile.name}</span>
        <span>&middot;</span>
        <time>{post.date}</time>
      </div>
      <article dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      <div className="post-foot">
        <Link href="/blog">&larr; blog</Link>
      </div>
    </main>
  );
}
