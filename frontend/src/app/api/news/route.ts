import { NextResponse } from "next/server";

function decodeHtml(html: string) {
  return html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const lang = url.searchParams.get("lang") ?? "en";

    const rssUrl =
      lang === "hi"
        ? "https://news.google.com/rss/search?q=युद्ध+भारत&hl=hi&gl=IN&ceid=IN:hi"
        : "https://news.google.com/rss/search?q=war+india";

    const res = await fetch(rssUrl);
    if (!res.ok) return NextResponse.json({ items: [] });

    const text = await res.text();
    const items: any[] = [];

    const itemMatches = text.match(/<item[\s\S]*?<\/item>/g);
    if (itemMatches) {
      for (const block of itemMatches.slice(0, 10)) {
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
        const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
        const pubMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        items.push({
          title: titleMatch ? decodeHtml(titleMatch[1].trim()) : "",
          link: linkMatch ? decodeHtml(linkMatch[1].trim()) : "",
          source: sourceMatch ? decodeHtml(sourceMatch[1].trim()) : undefined,
          pubDate: pubMatch ? pubMatch[1].trim() : undefined,
        });
      }
    }

    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json({ items: [] });
  }
}
