import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import type { UnsplashSearchResponse } from "@/types/unsplash";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchUnsplashImage(
  query: string
): Promise<{ url: string; alt: string } | null> {
  const endpoint = 'https://api.unsplash.com/search/photos' + 
  `?query=${encodeURIComponent(query)}` + 
  `&per_page=1&orientation=squarish`;

  const res = await fetch(endpoint, {
    headers: {Authorization: `Client-ID ${process.env.UNSPASH_ACCESS_KEY}`},
    next: { revalidate: 24 * 60 * 60 }, // 24 h cache
  });

  if (!res.ok) return null;

  const data: UnsplashSearchResponse = await res.json();
  if (data.results.length === 0) return null; 

  const { urls, alt_description } = data.results[0];
  return { url: urls.regular, alt: alt_description ?? query };
}

export async function POST(req: Request) {
  /* -------------------------------------------------- auth check */
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* -------------------------------------------------- validate body */
  const { industry, tone, length } = await req.json();
  if (!industry || !tone || !length) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  /* -------------------------------------------------- compose prompt */
  const system = `You are a social-media copywriter. Always reply ONLY with valid JSON of the form {"captions": string[]}.`;

  const userPrompt = `Write ${length} social-media captions for a business in the ${industry} industry. Tone: ${tone}. Return JSON only.`;

  try {
    /* --------------- GPT call in strict JSON mode */
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: length * 40, // generous upper bound
    });

    const raw = completion.choices[0].message?.content ?? "{}";
    const { captions } = JSON.parse(raw) as { captions: string[] };

        // fetch one Unsplash image using the industry keyword 
    const image = await fetchUnsplashImage(industry);
    const payload = captions.map((c) => ({
      caption: c,
      imageUrl: image?.url ?? null,
      alt: image?.alt ?? industry,
    }));

    return NextResponse.json({ payload });
  } catch (err: unknown) {
    console.error("OPENAI error ➜", err);
    return NextResponse.json(
      { error: "Failed to generate captions" },
      { status: 500 }
    );
  }
}
