import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    return NextResponse.json({ captions });
  } catch (err: unknown) {
    console.error("OPENAI error ➜", err);
    return NextResponse.json(
      { error: "Failed to generate captions" },
      { status: 500 }
    );
  }
}
