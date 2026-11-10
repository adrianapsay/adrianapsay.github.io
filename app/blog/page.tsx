import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function Blog() {
  const posts = getAllPosts();

  return (
    <main>
      <h1 className="page-title">Blog</h1>
      {posts.map((post) => (
        <article key={post.slug} className="entry">
          <p className="meta">{post.date}</p>
          <h3>
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          </h3>
          {post.excerpt && <p className="r">{post.excerpt}</p>}
        </article>
      ))}
    </main>
  );
}
