/* --------------------------------------------------------------------------
   /api/generate-posts/route.ts
   --------------------------------------------------------------------------
   Server-side endpoint that:
   1. Verifies the user is logged in (NextAuth Session)
   2. Asks OpenAI (gpt-4o-mini) for JSON captions
   3. Fetches one royalty-free Unsplash photo for the industry keyword
   4. Merges caption + photo into an array of objects
   5. Returns { results: GeneratedItem[] } to the client
--------------------------------------------------------------------------- */

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import type { UnsplashSearchResponse } from "@/types/unsplash";

/* ------------------------------------------------------------------ */
/*  1. Initialise OpenAI client                                       */
/* ------------------------------------------------------------------ */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------------------------------------------------------------ */
/*  2. Helper: fetch first Unsplash image for a keyword               */
/* ------------------------------------------------------------------ */
async function fetchUnsplashImage(
  query: string,
  page = 1
): Promise<{ url: string; alt: string } | null> {
  /* Build REST URL:
     - encodeURIComponent handles spaces (“coffee shop” → coffee%20shop)
     - per_page=1 gives just one photo to stay under rate-limit          */
  const endpoint =
    "https://api.unsplash.com/search/photos" +
    `?query=${encodeURIComponent(query)}` +
    `&per_page=1&page=${page}&orientation=landscape`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
    next: { revalidate: 86400 }, // 24 h CDN cache
  });
  if (!res.ok) return null;

  const data: UnsplashSearchResponse = await res.json();
  if (!data.results.length) return null;

  const { urls, alt_description } = data.results[0];
  return { url: urls.regular, alt: alt_description ?? query };
}

/* ------------------------------------------------------------------ */
/*  3. JSON extractor (robust)                                        */
/* ------------------------------------------------------------------ */
/** Remove ``` fences, then return the first { … } block if any. */
function extractJson(raw: string): string | null {
  // Strip ``` blocks (```json or ```).
  const withoutTicks = raw.replace(/```(?:json)?|```/gi, "").trim();
  // Grab first brace to last brace inclusive.
  const match = withoutTicks.match(/{[\s\S]*}/);
  return match ? match[0] : null;
}

/* ------------------------------------------------------------------ */
/*  4. POST handler                                                   */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  /* ---------- a) Auth ---------- */
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ---------- b) Validate body --*/
  const { industry, tone, length } = await req.json();
  if (!industry || !tone || !length) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  /* ---------- c) Prompt ---------*/
  const system =
    'You are a social-media copywriter. Always reply ONLY with valid JSON of the form {"captions": string[]}.';
  const userPrompt = `Write ${length} social-media captions for a business in the ${industry} industry. Tone: ${tone}. Return JSON only.`;

  try {
    /* ---------- d) OpenAI call ---*/
    let parsedCaptions: string[] | null = null;

    for (let attempt = 0; attempt < 2 && !parsedCaptions; attempt++) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        temperature: attempt === 0 ? 0.6 : 0,
        max_tokens: attempt === 0 ? length * 40 : length * 30,
      });

      const raw = completion.choices[0].message?.content ?? "{}";

      try {
        const attemptCaps = JSON.parse(raw) as { captions: string[] };
        parsedCaptions = attemptCaps.captions;
        break;
      } catch {
        const cleaned = extractJson(raw);
        if (cleaned) {
          try {
            const attemptCaps = JSON.parse(cleaned) as { captions: string[] };
            parsedCaptions = attemptCaps.captions;
            break;
          } catch {
            /* still invalid – loop will retry or bubble out */
          }
        }
      }
    }

    if (!parsedCaptions) throw new Error("OpenAI returned invalid JSON twice");

    /* e) Unsplash photo (random page 1-10 for variety) */
    const image = await fetchUnsplashImage(
      industry,
      Math.floor(Math.random() * 10) + 1
    );

    /* f) Build payload */
    const results = parsedCaptions.map((c) => ({
      caption: c,
      imageUrl: image?.url ?? null,
      alt: image?.alt ?? industry,
    }));

    /* g) Respond */
    return NextResponse.json({ results });
  } catch (err) {
    console.error("generate-posts error ➜", err);
    return NextResponse.json(
      { error: "Failed to generate captions" },
      { status: 502 }
    );
  }
}