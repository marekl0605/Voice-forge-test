"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileSummary {
  id: string;
  name: string;
  tone: string[];
  personality_markers: string[];
  created_at: string;
}

interface VoiceProfileSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VoiceProfileSelector({ selectedId, onSelect }: VoiceProfileSelectorProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      const res = await fetch("/api/voice/profile?all=true");
      const data = await res.json();
      setProfiles(data.profiles || []);
      setLoading(false);
    }
    fetchProfiles();
  }, []);

  const selected = profiles.find((p) => p.id === selectedId);

  if (loading) {
    return (
      <div className="h-10 w-64 bg-forest-light border border-forest-mid rounded-lg animate-pulse" />
    );
  }

  if (profiles.length === 0) {
    return (
      <button
        onClick={() => router.push("/voice-wizard")}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-forest-mid text-sm text-mid-gray hover:border-lime hover:text-lime transition-colors"
      >
        <Plus className="h-4 w-4" /> Create Voice Profile
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors min-w-[200px]",
          open ? "border-lime bg-lime/5" : "border-forest-mid hover:border-dark-gray"
        )}
      >
        <User className="h-4 w-4 text-lime shrink-0" />
        <div className="flex-1 text-left">
          <span className="text-warm-white">{selected?.name || "Select voice"}</span>
          {selected?.tone && (
            <span className="text-xs text-mid-gray ml-2">
              {selected.tone.slice(0, 2).join(", ")}
            </span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-mid-gray transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-forest-light border border-forest-mid rounded-lg shadow-xl overflow-hidden">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p.id);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-forest-mid last:border-b-0",
                p.id === selectedId
                  ? "bg-lime/10 text-lime"
                  : "text-warm-white hover:bg-forest-mid"
              )}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-mid-gray mt-0.5">
                {p.tone?.slice(0, 3).join(", ")}
                {p.personality_markers?.length > 0 && ` · ${p.personality_markers[0]}`}
              </div>
            </button>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              router.push("/voice-wizard");
            }}
            className="w-full text-left px-3 py-2.5 text-sm text-mid-gray hover:text-lime hover:bg-forest-mid transition-colors flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> Create New Profile
          </button>
        </div>
      )}
    </div>
  );
}
