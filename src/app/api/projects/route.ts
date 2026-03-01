import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ projects: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, description, voice_profile_id } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get voice profile if not provided
    let profileId = voice_profile_id;
    if (!profileId) {
      const { data: profiles } = await supabase
        .from("voice_profiles")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);
      profileId = profiles?.[0]?.id || null;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({ title, description, voice_profile_id: profileId })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create a conversation for this project
    await supabase
      .from("conversations")
      .insert({ project_id: data.id, messages: [] });

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
