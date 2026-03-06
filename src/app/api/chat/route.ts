import { NextRequest } from "next/server";
import { streamText } from "ai";
import { openrouter } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { buildDistillationPrompt, buildVoiceProfileContext } from "@/lib/prompts";

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
        voiceContext = `\n\n${buildVoiceProfileContext(profile)}`;
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

    if (conv) {
      await supabase
        .from("conversations")
        .update({
          messages: messages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conv.id);
    } else {
      await supabase
        .from("conversations")
        .insert({
          project_id: projectId,
          messages: messages,
        });
    }

    const result = streamText({
      model: openrouter("anthropic/claude-sonnet-4-5"),
      system: systemPrompt,
      messages,
      temperature: 0.8,
      maxOutputTokens: 1000,
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
