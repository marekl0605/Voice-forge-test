import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openrouter } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { buildVoiceAnalysisPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { samples, formality, tonePreferences, sentenceLength, audienceType, industryContext } = body;

    if (!samples || samples.length === 0) {
      return NextResponse.json({ error: "At least one writing sample is required" }, { status: 400 });
    }

    const prompt = buildVoiceAnalysisPrompt(samples, {
      formality,
      tonePreferences,
      sentenceLength,
      audienceType,
      industryContext,
    });

    const { text } = await generateText({
      model: openrouter("openai/gpt-4o"),
      prompt,
      temperature: 0.7,
      maxOutputTokens: 2000,
    });

    // Parse the JSON response
    let profileData;
    try {
      // Strip markdown fences if present
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      profileData = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse voice profile", raw: text }, { status: 500 });
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from("voice_profiles")
      .insert({
        name: profileData.name || "My Voice",
        tone: profileData.tone || [],
        formality_level: profileData.formality_level || formality,
        sentence_structure: profileData.sentence_structure || {},
        vocabulary: profileData.vocabulary || {},
        phrases_used: profileData.phrases_used || [],
        phrases_avoided: profileData.phrases_avoided || [],
        personality_markers: profileData.personality_markers || [],
        writing_samples: samples,
        raw_analysis: profileData.raw_analysis || "",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Voice analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
