import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function Blog() {
  const posts = getAllPosts();

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold">Blog</h1>
      <ul className="space-y-6">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="font-medium hover:underline">
              {post.title}
            </Link>
            <div className="text-sm text-neutral-500">{post.date}</div>
            {post.excerpt && (
              <p className="mt-1 text-sm text-neutral-600">{post.excerpt}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
