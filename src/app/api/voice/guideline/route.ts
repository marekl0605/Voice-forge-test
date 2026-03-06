import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openrouter } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { buildWritingGuidelinePrompt } from "@/lib/prompts";
import { VoiceProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { profileId } = await req.json();

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const prompt = buildWritingGuidelinePrompt(profile as VoiceProfile);

    const { text } = await generateText({
      model: openrouter("anthropic/claude-sonnet-4-5"),
      prompt,
      temperature: 0.7,
      maxOutputTokens: 4000,
    });

    // Save the guideline to the profile
    const { error: updateError } = await supabase
      .from("voice_profiles")
      .update({
        writing_guideline: text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ guideline: text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate guideline" },
      { status: 500 }
    );
  }
}
