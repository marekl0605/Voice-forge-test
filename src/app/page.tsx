"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Zap } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkProfile() {
      const { data } = await supabase
        .from("voice_profiles")
        .select("id")
        .limit(1);

      if (data && data.length > 0) {
        router.replace("/workspace");
      } else {
        router.replace("/voice-wizard");
      }
    }
    checkProfile();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <Zap className="h-12 w-12 text-lime mx-auto mb-4 animate-pulse" />
        <h1 className="font-display text-2xl text-warm-white">VoiceForge</h1>
        <p className="text-mid-gray mt-2 text-sm">Loading...</p>
      </div>
    </div>
  );
}
