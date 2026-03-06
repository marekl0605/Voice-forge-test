import { NextRequest } from "next/server";
import { streamText, generateText } from "ai";
import { openrouter } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { buildDistillationPrompt, buildVoiceProfileContext } from "@/lib/prompts";

async function distillConversation(
  conversationId: string,
  messages: { role: string; content: string }[]
) {
  try {
    const transcript = messages
      .map((m) => `${m.role === "user" ? "USER" : "AI"}: ${m.content}`)
      .join("\n\n");

    const { text } = await generateText({
      model: openrouter("anthropic/claude-sonnet-4-5"),
      system: `You distill conversations into content briefs. Extract the key decisions and direction from this conversation into a concise content brief that a content generator can use.

Output format:
THESIS: [One sentence — the core idea]
ANGLE: [What makes this take unique]
KEY POINTS: [2-4 bullet points]
TARGET AUDIENCE: [Who this is for]
TONE: [How it should feel]
HOOK DIRECTION: [Suggested opening approach]`,
      prompt: transcript,
      temperature: 0.3,
      maxOutputTokens: 500,
    });

    await supabase
      .from("conversations")
      .update({
        distilled_summary: text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  } catch (error) {
    console.error("Distillation error:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, messages, mode = "guided" } = await req.json();

    // Fetch project materials
    const { data: materials } = await supabase
      .from("materials")
      .select("*")
      .eq("project_id", projectId);

    // Fetch voice profile
    const { data: project } = await supabase
      .from("projects")
      .select("voice_profile_id")
      .eq("id", projectId)
      .single();

    let voiceContext = "";
    let voiceTraits: { personality: string[]; tone: string[] } | undefined;
    if (project?.voice_profile_id) {
      const { data: profile } = await supabase
        .from("voice_profiles")
        .select("*")
        .eq("id", project.voice_profile_id)
        .single();
      if (profile) {
        voiceContext = `\n\n${buildVoiceProfileContext(profile, profile.writing_guideline || undefined)}`;
        voiceTraits = { personality: profile.personality_markers || [], tone: profile.tone || [] };
      }
    }

    const materialsContext = materials && materials.length > 0
      ? `\n\n## User's Raw Materials\n${materials.map((m) => `[${m.type.toUpperCase()}] ${m.title || ""}: ${m.content}${m.url ? ` (${m.url})` : ""}`).join("\n\n")}`
      : "\n\nThe user hasn't added any materials yet. Ask them what they're thinking about or what topic they want to create content about.";

    const systemPrompt = buildDistillationPrompt(mode as "guided" | "automated", voiceTraits) + materialsContext + voiceContext;

    // Save conversation to Supabase — create if it doesn't exist
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId: string;
    if (conv) {
      conversationId = conv.id;
      await supabase
        .from("conversations")
        .update({
          messages: messages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conv.id);
    } else {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          project_id: projectId,
          messages: messages,
        })
        .select("id")
        .single();
      conversationId = newConv?.id;
    }

    // Count user messages to decide when to distill
    const userMessageCount = messages.filter((m: { role: string }) => m.role === "user").length;
    const shouldDistill = mode === "automated" || (mode === "guided" && userMessageCount >= 3);

    const result = streamText({
      model: openrouter("anthropic/claude-sonnet-4-5"),
      system: systemPrompt,
      messages,
      temperature: 0.8,
      maxOutputTokens: 1000,
      onFinish: async ({ text }) => {
        if (shouldDistill && conversationId) {
          const fullMessages = [...messages, { role: "assistant", content: text }];
          distillConversation(conversationId, fullMessages);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Chat failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
