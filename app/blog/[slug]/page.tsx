import { getPostBySlug, getPostSlugs } from "@/lib/posts";

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
    <article>
      <h1 className="mb-2 text-2xl font-semibold">{post.title}</h1>
      <div className="mb-8 text-sm text-neutral-500">{post.date}</div>
      <div
        className="prose prose-neutral max-w-none prose-a:text-neutral-900"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
