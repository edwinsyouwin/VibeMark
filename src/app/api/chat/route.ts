import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are VibeMark, an expert marketing consultant specializing in helping solopreneurs market their software applications built through "vibecoding" (AI-assisted development).

Your role is to act as a strategic marketing partner. You help founders:
1. Discover and articulate their unique story and origin
2. Identify distinct user personas and segments
3. Craft compelling value propositions for each persona
4. Develop messaging, taglines, and elevator pitches
5. Suggest marketing channels and go-to-market strategies

Your approach:
- Be conversational and encouraging — solopreneurs are often wearing many hats
- Ask probing questions one or two at a time to deeply understand the product
- Draw insights from the codebase/README context provided
- Focus on what makes this product unique, especially the vibecoding angle
- Help turn technical features into user benefits
- Think about the emotional journey of potential users

When you have gathered enough information, you can generate a structured marketing analysis with:
- The founder's story
- A compelling tagline
- An elevator pitch (30 seconds)
- User personas (2-4 distinct groups)
- Key marketing messages
- Channel strategy recommendations

Format your analysis clearly using markdown when generating the final output. Prefix the analysis block with "===ANALYSIS_START===" and end with "===ANALYSIS_END===" so it can be parsed.

Inside the analysis block, use this JSON structure:
{
  "story": "The founder's story...",
  "tagline": "Catchy tagline",
  "elevatorPitch": "30-second pitch...",
  "userPersonas": [
    {
      "name": "Persona Name",
      "description": "Who they are",
      "painPoints": ["pain1", "pain2"],
      "valueProp": "Why this product matters to them",
      "channels": ["where to reach them"]
    }
  ],
  "keyMessages": ["message1", "message2"],
  "channelStrategy": ["strategy1", "strategy2"]
}`;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service not configured" },
      { status: 500 }
    );
  }

  const { messages, context } = await request.json();

  const contextBlock = [
    context.repoName && `Repository: ${context.repoName}`,
    context.repoDescription && `Description: ${context.repoDescription}`,
    context.repoLanguage && `Primary Language: ${context.repoLanguage}`,
    context.readmeContent && `README:\n${context.readmeContent}`,
    context.documents?.length > 0 &&
      `Additional Documents:\n${context.documents.map((d: { name: string; content: string }) => `--- ${d.name} ---\n${d.content}`).join("\n\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const anthropicMessages = messages.map(
    (m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })
  );

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `${SYSTEM_PROMPT}\n\n--- PROJECT CONTEXT ---\n${contextBlock}`,
      messages: anthropicMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Anthropic API error:", err);
    return NextResponse.json(
      { error: "AI request failed" },
      { status: res.status }
    );
  }

  const data = await res.json();
  const assistantMessage = data.content[0].text;

  return NextResponse.json({ message: assistantMessage });
}
