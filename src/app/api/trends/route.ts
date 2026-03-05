import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openrouter } from "@/lib/openai";

// Simple in-memory cache (1 hour TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  try {
    const { industry, keywords } = await req.json();

    if (!industry && (!keywords || keywords.length === 0)) {
      return NextResponse.json({ error: "industry or keywords required" }, { status: 400 });
    }

    const cacheKey = `${industry}-${(keywords || []).join(",")}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Use Claude to identify trending topics (works without external API keys)
    const searchTerms = [industry, ...(keywords || [])].filter(Boolean).join(", ");

    const { text } = await generateText({
      model: openrouter("anthropic/claude-sonnet-4-5"),
      prompt: `You are a trending topics analyst. Identify what's currently trending and generating buzz in the following space: ${searchTerms}

Based on your knowledge, identify:

1. **YouTube Trends** — 5 video topics or content themes that are getting high engagement right now in this space. Think about what creators and thought leaders are publishing.

2. **X/Twitter Trends** — 5 conversations, debates, or hot takes currently circulating in this space. Think about what people are arguing about, sharing, or reacting to.

For each trend, explain WHY it's trending and what angle a content creator could take.

Return ONLY valid JSON (no markdown fences):
{
  "youtube": [
    {"title": "trending topic/video theme", "context": "why it's trending and suggested angle", "relevance": 0.9}
  ],
  "twitter": [
    {"topic": "trending conversation/debate", "context": "why it's hot right now and suggested angle", "relevance": 0.9}
  ]
}

Relevance is 0-1 based on how directly this relates to "${searchTerms}".
Be specific and current. Don't give generic evergreen topics — think about what's HAPPENING NOW in this space.`,
      temperature: 0.8,
      maxOutputTokens: 1500,
    });

    let trends;
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      trends = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse trends", raw: text }, { status: 500 });
    }

    // Fetch from YouTube Data API if key is available
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const query = encodeURIComponent(searchTerms);
        const publishedAfter = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&order=viewCount&publishedAfter=${publishedAfter}&maxResults=5&key=${process.env.YOUTUBE_API_KEY}`
        );
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          const ytTrends = ytData.items?.map((item: { id: { videoId: string }; snippet: { title: string } }) => ({
            title: item.snippet.title,
            url: `https://youtube.com/watch?v=${item.id.videoId}`,
            context: "Trending on YouTube",
            relevance: 0.8,
          }));
          if (ytTrends?.length > 0) {
            trends.youtube_live = ytTrends;
          }
        }
      } catch {
        // YouTube API optional — continue without it
      }
    }

    const result = { trends, industry: searchTerms, generated_at: new Date().toISOString() };
    cache.set(cacheKey, { data: result, ts: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Trends error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
