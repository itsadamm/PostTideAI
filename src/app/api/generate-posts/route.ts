import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { industry, tone, length } = body;

  if (!industry || !tone || !length) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const prompt = `
You are a marketing copywriter. Write ${length} social media post captions for a business in the ${industry} industry. Use a ${tone} tone. Return the result as a JSON array of strings only — no commentary, no explanation. The output must be strictly valid JSON.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const raw = response.choices[0].message?.content || "[]";
    const captions: string[] = JSON.parse(raw);

    return NextResponse.json({ captions });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error("Unexpected error", err);
    }
    return NextResponse.json({ error: "Failed to generate captions" }, { status: 500 });
  }
}
