import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const postsDirectory = path.join(process.cwd(), "content/posts");

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
};

export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(postsDirectory).filter((f) => f.endsWith(".md"));

  return files
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const fileContents = fs.readFileSync(path.join(postsDirectory, filename), "utf8");
      const { data } = matter(fileContents);
      return {
        slug,
        title: data.title as string,
        date: data.date as string,
        excerpt: data.excerpt as string | undefined,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostSlugs(): string[] {
  return fs
    .readdirSync(postsDirectory)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export async function getPostBySlug(slug: string) {
  const fileContents = fs.readFileSync(path.join(postsDirectory, `${slug}.md`), "utf8");
  const { data, content } = matter(fileContents);
  const processed = await remark().use(html).process(content);

  return {
    slug,
    title: data.title as string,
    date: data.date as string,
    contentHtml: processed.toString(),
  };
}
