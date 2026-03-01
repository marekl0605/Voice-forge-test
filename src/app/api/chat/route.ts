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
    if (project?.voice_profile_id) {
      const { data: profile } = await supabase
        .from("voice_profiles")
        .select("*")
        .eq("id", project.voice_profile_id)
        .single();
      if (profile) {
        voiceContext = `\n\nThe user has the following voice profile — keep this in mind when suggesting content direction:\n${buildVoiceProfileContext(profile)}`;
      }
    }

    const materialsContext = materials && materials.length > 0
      ? `\n\n## User's Raw Materials\n${materials.map((m) => `[${m.type.toUpperCase()}] ${m.title || ""}: ${m.content}${m.url ? ` (${m.url})` : ""}`).join("\n\n")}`
      : "\n\nThe user hasn't added any materials yet. Ask them what they're thinking about or what topic they want to create content about.";

    const systemPrompt = buildDistillationPrompt(mode as "guided" | "automated") + materialsContext + voiceContext;

    // Save conversation to Supabase
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (conv) {
      await supabase
        .from("conversations")
        .update({
          messages: messages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conv.id);
    }

    const result = streamText({
      model: openrouter("openai/gpt-4o"),
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
