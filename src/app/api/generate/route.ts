import { NextRequest } from "next/server";
import { streamText } from "ai";
import { openrouter } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { buildVoiceProfileContext, buildGenerationPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const { projectId, format, style, summary, voiceProfileId: overrideProfileId } = await req.json();

    // Fetch materials
    const { data: materials } = await supabase
      .from("materials")
      .select("*")
      .eq("project_id", projectId);

    // Fetch voice profile — use override if provided, else project default
    let profileIdToUse = overrideProfileId;
    if (!profileIdToUse) {
      const { data: project } = await supabase
        .from("projects")
        .select("voice_profile_id")
        .eq("id", projectId)
        .single();
      profileIdToUse = project?.voice_profile_id;
    }

    let voiceContext = "";
    let voiceProfileId: string | null = null;
    if (profileIdToUse) {
      const { data: profile } = await supabase
        .from("voice_profiles")
        .select("*")
        .eq("id", profileIdToUse)
        .single();
      if (profile) {
        voiceContext = buildVoiceProfileContext(profile);
        voiceProfileId = profile.id;
      }
    }

    const materialsText = materials
      ?.map((m) => `[${m.type.toUpperCase()}] ${m.title || ""}: ${m.content}`)
      .join("\n\n") || "";

    // Fetch conversation summary if available
    const { data: conv } = await supabase
      .from("conversations")
      .select("distilled_summary")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    const contentSummary = summary || conv?.distilled_summary || "Generate content based on the raw materials provided.";

    const generationPrompt = buildGenerationPrompt(format, style, contentSummary, materialsText);

    const result = streamText({
      model: openrouter("anthropic/claude-sonnet-4-5"),
      system: voiceContext || "Write high-quality content based on the user's direction.",
      prompt: generationPrompt,
      temperature: 0.7,
      maxOutputTokens: 3000,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Generation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
