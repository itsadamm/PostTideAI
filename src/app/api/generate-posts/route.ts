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
  query: string
): Promise<{ url: string; alt: string } | null> {
  /* Build REST URL:
     - encodeURIComponent handles spaces (“coffee shop” → coffee%20shop)
     - per_page=1 gives just one photo to stay under rate-limit          */
  const endpoint =
    "https://api.unsplash.com/search/photos" +
    `?query=${encodeURIComponent(query)}` +
    `&per_page=1&orientation=squarish`;

  /* Unsplash auth uses the public “Access Key” in a header            */
  const res = await fetch(endpoint, {
    headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
    /* Cache each (query) result for 24 h so repeated calls are free    */
    next: { revalidate: 24 * 60 * 60 },
  });

  /* Network / HTTP error → skip photo gracefully                      */
  if (!res.ok) return null;

  const data: UnsplashSearchResponse = await res.json();
  if (data.results.length === 0) return null;

  /* Grab the regular-size URL + alt-text (or fall back to query)      */
  const { urls, alt_description } = data.results[0];
  return { url: urls.regular, alt: alt_description ?? query };
}

/* ------------------------------------------------------------------ */
/*  3. POST /api/generate-posts                                       */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  /* ---------- a) Authorise user ----------------------------------- */
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ---------- b) Validate request body ---------------------------- */
  const { industry, tone, length } = await req.json();
  if (!industry || !tone || !length) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  /* ---------- c) Build OpenAI prompt ------------------------------ */
  const system =
    'You are a social-media copywriter. Always reply ONLY with valid JSON of the form {"captions": string[]}.';

  const userPrompt = `Write ${length} social-media captions for a business in the ${industry} industry. Tone: ${tone}. Return JSON only.`;

  try {
    /* ---------- d) Call OpenAI in strict JSON mode ---------------- */
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" }, // guarantees JSON
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: length * 40, // generous upper bound
    });

    /* ---------- e) Parse captions from reply ---------------------- */
    const raw = completion.choices[0].message?.content ?? "{}";
    const { captions } = JSON.parse(raw) as { captions: string[] };

    /* ---------- f) Fetch one Unsplash image ----------------------- */
    const image = await fetchUnsplashImage(industry);

    /* ---------- g) Merge caption + image into payload ------------- */
    const payload = captions.map((c) => ({
      caption: c,
      imageUrl: image?.url ?? null,
      alt: image?.alt ?? industry,
    }));

    /* ---------- h) Return to client ------------------------------ */
    return NextResponse.json({ results: payload }); // <- shape the UI expects
  } catch (err: unknown) {
    /* Any error (OpenAI, JSON parse, Unsplash) lands here            */
    console.error("OPENAI error ➜", err);
    return NextResponse.json(
      { error: "Failed to generate captions" },
      { status: 500 }
    );
  }
}
