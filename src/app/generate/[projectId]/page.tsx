"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  FileText,
  BookOpen,
  Twitter,
  Linkedin,
  Check,
  Copy,
  Loader2,
  Save,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentFormat, ContentStyle } from "@/lib/types";
import { VoiceProfileSelector } from "@/components/voice-profile-selector";

const FORMATS: { value: ContentFormat; label: string; icon: typeof FileText }[] = [
  { value: "blog", label: "Blog Post", icon: FileText },
  { value: "guide", label: "Guide", icon: BookOpen },
  { value: "x_post", label: "X Post", icon: Twitter },
  { value: "x_thread", label: "X Thread", icon: MessageSquare },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
];

const STYLES: { value: ContentStyle; label: string; description: string }[] = [
  { value: "casual", label: "Casual / Human", description: "Conversational, relaxed, authentic" },
  { value: "formal", label: "Formal / Polished", description: "Professional, clean, authoritative" },
];

interface GeneratedPiece {
  format: ContentFormat;
  style: ContentStyle;
  content: string;
  saved: boolean;
}

export default function GeneratePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedFormats, setSelectedFormats] = useState<ContentFormat[]>(["blog", "linkedin"]);
  const [selectedStyle, setSelectedStyle] = useState<ContentStyle>("casual");
  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedPiece[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [currentFormat, setCurrentFormat] = useState<string | null>(null);
  const [voiceProfileId, setVoiceProfileId] = useState<string | null>(null);

  // Load project's default voice profile
  useEffect(() => {
    async function loadProjectProfile() {
      const res = await fetch(`/api/projects`);
      const data = await res.json();
      const project = data.projects?.find((p: { id: string }) => p.id === projectId);
      if (project?.voice_profile_id) {
        setVoiceProfileId(project.voice_profile_id);
      } else {
        // Fallback to latest profile
        const profileRes = await fetch("/api/voice/profile");
        const profileData = await profileRes.json();
        if (profileData.profile?.id) setVoiceProfileId(profileData.profile.id);
      }
    }
    loadProjectProfile();
  }, [projectId]);

  const toggleFormat = (format: ContentFormat) => {
    setSelectedFormats((prev) =>
      prev.includes(format)
        ? prev.filter((f) => f !== format)
        : [...prev, format]
    );
  };

  const generateContent = async () => {
    if (selectedFormats.length === 0) return;
    setGenerating(true);
    setResults([]);

    for (const format of selectedFormats) {
      setCurrentFormat(format);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            format,
            style: selectedStyle,
            summary: summary || undefined,
            voiceProfileId: voiceProfileId || undefined,
          }),
        });

        if (!res.ok) throw new Error("Generation failed");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let content = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            content += chunk;
            setResults((prev) => {
              const existing = prev.findIndex(
                (r) => r.format === format && r.style === selectedStyle
              );
              const piece: GeneratedPiece = {
                format,
                style: selectedStyle,
                content,
                saved: false,
              };
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = piece;
                return updated;
              }
              return [...prev, piece];
            });
          }
        }
      } catch (error) {
        console.error(`Error generating ${format}:`, error);
      }
    }

    setCurrentFormat(null);
    setGenerating(false);
  };

  const copyContent = async (content: string, key: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveContent = async (piece: GeneratedPiece) => {
    await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        voice_profile_id: voiceProfileId,
        format: piece.format,
        style: piece.style,
        content: piece.content,
        source_summary: summary || null,
      }),
    });
    setResults((prev) =>
      prev.map((r) =>
        r.format === piece.format && r.style === piece.style
          ? { ...r, saved: true }
          : r
      )
    );
  };

  const saveAll = async () => {
    const unsaved = results.filter((r) => !r.saved);
    if (unsaved.length === 0) return;

    await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        unsaved.map((r) => ({
          project_id: projectId,
          voice_profile_id: voiceProfileId,
          format: r.format,
          style: r.style,
          content: r.content,
          source_summary: summary || null,
        }))
      ),
    });
    setResults((prev) => prev.map((r) => ({ ...r, saved: true })));
  };

  const getFormatLabel = (format: string) =>
    FORMATS.find((f) => f.value === format)?.label || format;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-3xl font-bold text-warm-white">
            Generate Content
          </h1>
          <VoiceProfileSelector
            selectedId={voiceProfileId}
            onSelect={setVoiceProfileId}
          />
        </div>
        <p className="text-mid-gray mb-8">
          Select formats and style, then generate content in your voice.
        </p>

        {/* Controls */}
        <div className="bg-forest-light border border-forest-mid rounded-xl p-6 mb-8">
          {/* Format Selection */}
          <div className="mb-6">
            <label className="text-sm font-medium text-warm-white mb-3 block">
              Output Formats
            </label>
            <div className="flex flex-wrap gap-3">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => toggleFormat(f.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                    selectedFormats.includes(f.value)
                      ? "bg-lime/10 border-lime text-lime"
                      : "border-forest-mid text-mid-gray hover:border-dark-gray"
                  )}
                >
                  <f.icon className="h-4 w-4" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div className="mb-6">
            <label className="text-sm font-medium text-warm-white mb-3 block">
              Style Variant
            </label>
            <div className="grid grid-cols-2 gap-3">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSelectedStyle(s.value)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    selectedStyle === s.value
                      ? "bg-lime/10 border-lime"
                      : "border-forest-mid hover:border-dark-gray"
                  )}
                >
                  <div
                    className={cn(
                      "text-sm font-medium mb-0.5",
                      selectedStyle === s.value ? "text-lime" : "text-warm-white"
                    )}
                  >
                    {s.label}
                  </div>
                  <div className="text-xs text-dark-gray">{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Direction */}
          <div className="mb-6">
            <label className="text-sm font-medium text-warm-white mb-2 block">
              Content Direction{" "}
              <span className="text-dark-gray font-normal">(optional)</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Give the AI specific direction — e.g., 'Focus on why AI tools strip away authenticity. Target audience: marketing leaders. Angle: provocative hot take.'"
              className="w-full bg-forest border border-forest-mid rounded-lg p-3 text-sm text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none resize-none h-20"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generateContent}
            disabled={selectedFormats.length === 0 || generating}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
              selectedFormats.length > 0 && !generating
                ? "bg-lime text-forest hover:bg-lime-dark"
                : "bg-forest-mid text-dark-gray cursor-not-allowed"
            )}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating {getFormatLabel(currentFormat || "")}...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate {selectedFormats.length} Format
                {selectedFormats.length !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-warm-white">
                Generated Content
              </h2>
              <button
                onClick={saveAll}
                className="flex items-center gap-2 text-sm text-lime hover:text-lime-light transition-colors"
              >
                <Save className="h-4 w-4" /> Save All to Library
              </button>
            </div>
            <div className="space-y-6">
              {results.map((piece, i) => (
                <motion.div
                  key={`${piece.format}-${piece.style}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-forest-light border border-forest-mid rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-3 border-b border-forest-mid">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-lime/10 text-lime text-xs font-mono uppercase">
                        {piece.format.replace("_", " ")}
                      </span>
                      <span className="text-xs text-dark-gray capitalize">
                        {piece.style}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {piece.saved && (
                        <span className="flex items-center gap-1 text-xs text-lime">
                          <Check className="h-3 w-3" /> Saved
                        </span>
                      )}
                      <button
                        onClick={() =>
                          copyContent(piece.content, `${piece.format}-${piece.style}`)
                        }
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-mid-gray hover:text-warm-white transition-colors"
                      >
                        {copied === `${piece.format}-${piece.style}` ? (
                          <>
                            <Check className="h-3 w-3 text-lime" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                      {!piece.saved && (
                        <button
                          onClick={() => saveContent(piece)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-lime hover:text-lime-light transition-colors"
                        >
                          <Save className="h-3 w-3" /> Save
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-sm text-warm-white whitespace-pre-wrap leading-relaxed font-body">
                      {piece.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
