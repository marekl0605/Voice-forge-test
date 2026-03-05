"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  MessageSquare,
  Pencil,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceProfile } from "@/lib/types";

interface ProfileSummary {
  id: string;
  name: string;
  tone: string[];
  personality_markers: string[];
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editBuffer, setEditBuffer] = useState<string>("");
  const [editingName, setEditingName] = useState(false);
  const [nameBuffer, setNameBuffer] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchProfiles = useCallback(async () => {
    const res = await fetch("/api/voice/profile?all=true");
    const data = await res.json();
    setProfiles(data.profiles || []);
    setLoading(false);
  }, []);

  const fetchFullProfile = useCallback(async (id: string) => {
    const res = await fetch(`/api/voice/profile?id=${id}`);
    const data = await res.json();
    if (data.profile) {
      setProfile(data.profile);
      setNameBuffer(data.profile.name);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (profiles.length > 0 && !selectedId) {
      setSelectedId(profiles[0].id);
    }
  }, [profiles, selectedId]);

  useEffect(() => {
    if (selectedId) {
      fetchFullProfile(selectedId);
    }
  }, [selectedId, fetchFullProfile]);

  const saveField = async (field: string, value: unknown) => {
    if (!profile) return;
    setSaving(true);
    await fetch("/api/voice/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: profile.id, [field]: value }),
    });
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
    // Update name in sidebar list if it changed
    if (field === "name") {
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, name: value as string } : p))
      );
    }
    setEditing(null);
    setSaving(false);
  };

  const saveName = async () => {
    if (!profile || !nameBuffer.trim()) return;
    setEditingName(false);
    await saveField("name", nameBuffer.trim());
  };

  const deleteProfile = async () => {
    if (!profile) return;
    await fetch(`/api/voice/profile?id=${profile.id}`, { method: "DELETE" });
    const remaining = profiles.filter((p) => p.id !== profile.id);
    setProfiles(remaining);
    setConfirmDelete(false);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
    } else {
      setSelectedId(null);
      setProfile(null);
    }
  };

  const removeFromArray = async (field: string, index: number) => {
    if (!profile) return;
    const arr = [...((profile as unknown as Record<string, unknown>)[field] as string[])];
    arr.splice(index, 1);
    await saveField(field, arr);
  };

  const addToArray = async (field: string) => {
    if (!profile || !editBuffer.trim()) return;
    const arr = [...((profile as unknown as Record<string, unknown>)[field] as string[]), editBuffer.trim()];
    await saveField(field, arr);
    setEditBuffer("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-mid-gray">Loading profiles...</div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <User className="h-12 w-12 text-dark-gray mx-auto mb-4" />
          <h2 className="font-display text-xl text-warm-white mb-2">
            No voice profiles yet
          </h2>
          <p className="text-mid-gray mb-4">
            Complete the voice wizard to create your first profile.
          </p>
          <a
            href="/voice-wizard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-lime text-forest rounded-lg font-medium"
          >
            Start Wizard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Profile List Sidebar */}
      <div className="w-72 border-r border-forest-mid flex flex-col">
        <div className="p-4 border-b border-forest-mid flex items-center justify-between">
          <h2 className="text-sm font-medium text-warm-white">Voice Profiles</h2>
          <a
            href="/voice-wizard"
            className="p-1.5 rounded-lg bg-lime/10 text-lime hover:bg-lime/20 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </a>
        </div>
        <div className="flex-1 overflow-y-auto">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-forest-mid transition-colors",
                p.id === selectedId
                  ? "bg-lime/5 border-l-2 border-l-lime"
                  : "hover:bg-forest-light"
              )}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                p.id === selectedId ? "text-lime" : "text-warm-white"
              )}>
                {p.name}
              </div>
              <div className="text-xs text-mid-gray">
                {p.tone?.slice(0, 2).join(", ")}
                {p.personality_markers?.length > 0 && ` · ${p.personality_markers[0]}`}
              </div>
              <div className="text-xs text-dark-gray mt-1">
                {new Date(p.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Detail */}
      <div className="flex-1 overflow-y-auto">
        {profile ? (
          <div className="max-w-4xl mx-auto p-8">
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Header with editable name and delete */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  {editingName ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        value={nameBuffer}
                        onChange={(e) => setNameBuffer(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveName()}
                        autoFocus
                        className="bg-transparent border-b-2 border-lime font-display text-3xl font-bold text-warm-white focus:outline-none"
                      />
                      <button onClick={saveName} className="p-1 text-lime hover:text-lime-light">
                        <Check className="h-5 w-5" />
                      </button>
                      <button onClick={() => { setEditingName(false); setNameBuffer(profile.name); }} className="p-1 text-dark-gray">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingName(true)}
                      className="group flex items-center gap-2 mb-1"
                    >
                      <h1 className="font-display text-3xl font-bold text-warm-white">
                        {profile.name}
                      </h1>
                      <Pencil className="h-4 w-4 text-dark-gray opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                  <p className="text-warm-gray">
                    Click any section to edit. Hover the title to rename.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-mid-gray">
                    <MessageSquare className="h-4 w-4" />
                    {new Date(profile.updated_at).toLocaleDateString()}
                  </div>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">Delete?</span>
                      <button
                        onClick={deleteProfile}
                        className="px-3 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1 rounded bg-forest-mid text-mid-gray text-xs hover:text-warm-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="p-2 rounded-lg text-dark-gray hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tone Card */}
                <ProfileCard title="Tone">
                  <div className="flex flex-wrap gap-2">
                    {profile.tone.map((t, i) => (
                      <span
                        key={i}
                        className="group px-4 py-1.5 rounded-full bg-lime/10 text-lime text-base font-medium flex items-center gap-1.5"
                      >
                        {t}
                        <button
                          onClick={() => removeFromArray("tone", i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {editing === "tone" ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editBuffer}
                          onChange={(e) => setEditBuffer(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addToArray("tone")}
                          placeholder="Add tone..."
                          className="bg-forest border border-forest-mid rounded px-2 py-1 text-sm text-warm-white focus:border-lime focus:outline-none w-28"
                          autoFocus
                        />
                        <button onClick={() => addToArray("tone")} className="text-lime">
                          <Save className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setEditing(null); setEditBuffer(""); }} className="text-dark-gray">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing("tone")}
                        className="px-2 py-1 rounded-full border border-dashed border-forest-mid text-dark-gray hover:text-lime hover:border-lime text-sm transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </ProfileCard>

                {/* Formality Card */}
                <ProfileCard title="Formality">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-warm-gray w-14">Casual</span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={profile.formality_level}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setProfile((prev) => prev ? { ...prev, formality_level: val } : prev);
                      }}
                      onMouseUp={(e) =>
                        saveField("formality_level", parseInt((e.target as HTMLInputElement).value))
                      }
                      className="flex-1 accent-lime"
                    />
                    <span className="text-sm text-warm-gray w-14 text-right">Formal</span>
                  </div>
                  <p className="text-center text-lime text-base mt-2 font-mono font-medium">
                    {profile.formality_level}/10
                  </p>
                </ProfileCard>

                {/* Sentence Structure */}
                <ProfileCard title="Sentence Style">
                  <div className="space-y-4 text-base">
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Average Length</span>
                      <span className="text-warm-white font-medium capitalize">
                        {profile.sentence_structure.avg_length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Variety</span>
                      <span className="text-warm-white font-medium capitalize">
                        {profile.sentence_structure.variety}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Uses Fragments</span>
                      <span className={profile.sentence_structure.uses_fragments ? "text-lime font-medium" : "text-mid-gray"}>
                        {profile.sentence_structure.uses_fragments ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Uses Questions</span>
                      <span className={profile.sentence_structure.uses_questions ? "text-lime font-medium" : "text-mid-gray"}>
                        {profile.sentence_structure.uses_questions ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </ProfileCard>

                {/* Vocabulary */}
                <ProfileCard title="Vocabulary">
                  <div className="space-y-4 text-base">
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Complexity</span>
                      <span className="text-warm-white font-medium capitalize">
                        {profile.vocabulary.complexity}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-warm-gray">Jargon Level</span>
                      <span className="text-warm-white font-medium capitalize">
                        {profile.vocabulary.jargon_level}
                      </span>
                    </div>
                    {profile.vocabulary.industry_terms.length > 0 && (
                      <div>
                        <span className="text-warm-gray block mb-2">Industry Terms</span>
                        <div className="flex flex-wrap gap-2">
                          {profile.vocabulary.industry_terms.map((term, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded bg-forest text-sm text-warm-white font-mono"
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ProfileCard>

                {/* Phrases Used */}
                <ProfileCard title="Phrases You Use">
                  <div className="space-y-3">
                    {profile.phrases_used.map((p, i) => (
                      <div
                        key={i}
                        className="group flex items-center justify-between text-base"
                      >
                        <span className="text-lime-light font-mono">&ldquo;{p}&rdquo;</span>
                        <button
                          onClick={() => removeFromArray("phrases_used", i)}
                          className="opacity-0 group-hover:opacity-100 text-dark-gray hover:text-red-400 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {editing === "phrases_used" ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          value={editBuffer}
                          onChange={(e) => setEditBuffer(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addToArray("phrases_used")}
                          placeholder="Add phrase..."
                          className="flex-1 bg-forest border border-forest-mid rounded px-2 py-1 text-sm text-warm-white focus:border-lime focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => addToArray("phrases_used")} className="text-lime">
                          <Save className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing("phrases_used")}
                        className="flex items-center gap-1.5 text-sm text-mid-gray hover:text-lime transition-colors mt-3"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add phrase
                      </button>
                    )}
                  </div>
                </ProfileCard>

                {/* Phrases Avoided */}
                <ProfileCard title="Phrases You Avoid">
                  <div className="space-y-3">
                    {profile.phrases_avoided.map((p, i) => (
                      <div
                        key={i}
                        className="group flex items-center justify-between text-base"
                      >
                        <span className="text-warm-gray font-mono line-through">
                          &ldquo;{p}&rdquo;
                        </span>
                        <button
                          onClick={() => removeFromArray("phrases_avoided", i)}
                          className="opacity-0 group-hover:opacity-100 text-dark-gray hover:text-red-400 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {editing === "phrases_avoided" ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          value={editBuffer}
                          onChange={(e) => setEditBuffer(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addToArray("phrases_avoided")}
                          placeholder="Add phrase to avoid..."
                          className="flex-1 bg-forest border border-forest-mid rounded px-2 py-1 text-sm text-warm-white focus:border-lime focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => addToArray("phrases_avoided")} className="text-lime">
                          <Save className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing("phrases_avoided")}
                        className="flex items-center gap-1.5 text-sm text-mid-gray hover:text-lime transition-colors mt-3"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add phrase
                      </button>
                    )}
                  </div>
                </ProfileCard>

                {/* Personality Markers - Full Width */}
                <div className="md:col-span-2">
                  <ProfileCard title="Personality Markers">
                    <div className="flex flex-wrap gap-2">
                      {profile.personality_markers.map((m, i) => (
                        <span
                          key={i}
                          className="group px-4 py-2 rounded-full border border-mid-gray/30 text-warm-white text-base flex items-center gap-1.5"
                        >
                          {m}
                          <button
                            onClick={() => removeFromArray("personality_markers", i)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3 text-dark-gray hover:text-red-400" />
                          </button>
                        </span>
                      ))}
                      {editing === "personality_markers" ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editBuffer}
                            onChange={(e) => setEditBuffer(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addToArray("personality_markers")}
                            placeholder="Add marker..."
                            className="bg-forest border border-forest-mid rounded px-2 py-1 text-sm text-warm-white focus:border-lime focus:outline-none w-40"
                            autoFocus
                          />
                          <button onClick={() => addToArray("personality_markers")} className="text-lime">
                            <Save className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditing("personality_markers")}
                          className="px-2 py-1 rounded-full border border-dashed border-forest-mid text-dark-gray hover:text-lime hover:border-lime text-sm transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </ProfileCard>
                </div>

                {/* Raw Analysis - Full Width */}
                {profile.raw_analysis && (
                  <div className="md:col-span-2">
                    <ProfileCard title="Voice Blueprint">
                      <p className="text-base text-warm-gray leading-relaxed whitespace-pre-wrap">
                        {profile.raw_analysis}
                      </p>
                    </ProfileCard>
                  </div>
                )}
              </div>

              {saving && (
                <div className="fixed bottom-4 right-4 bg-lime text-forest px-4 py-2 rounded-lg text-sm font-medium">
                  Saving...
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-mid-gray">
            Select a profile from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-forest-light border border-forest-mid rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono text-warm-gray uppercase tracking-wider font-medium">
          {title}
        </h3>
        <Edit3 className="h-4 w-4 text-mid-gray" />
      </div>
      {children}
    </div>
  );
}
