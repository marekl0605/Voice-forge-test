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
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentFormat, ContentStyle } from "@/lib/types";
import { VoiceProfileSelector } from "@/components/voice-profile-selector";

const FORMATS: { value: ContentFormat; label: string; icon: typeof FileText; description: string }[] = [
  { value: "blog", label: "Blog Post", icon: FileText, description: "Long-form with anti-AI-pattern enforcement" },
  { value: "guide", label: "Guide", icon: BookOpen, description: "Comprehensive how-to with structured sections" },
  { value: "x_post", label: "X Post", icon: Twitter, description: "Single viral-ready post, 280 chars" },
  { value: "x_thread", label: "X Thread", icon: MessageSquare, description: "5-8 tweet thread, each standalone" },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin, description: "Hook-first, short paragraphs, mobile-ready" },
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
  const [guidelineActive, setGuidelineActive] = useState<boolean | null>(null);
  const [generatingGuideline, setGeneratingGuideline] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "full">("mobile");
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedPreviews((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Check if selected profile has a writing guideline
  const checkGuideline = async (profileId: string) => {
    try {
      const res = await fetch(`/api/voice/profile?id=${profileId}`);
      const data = await res.json();
      setGuidelineActive(!!data.profile?.writing_guideline);
    } catch {
      setGuidelineActive(null);
    }
  };

  const generateGuidelineNow = async () => {
    if (!voiceProfileId) return;
    setGeneratingGuideline(true);
    try {
      const res = await fetch("/api/voice/guideline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: voiceProfileId }),
      });
      const data = await res.json();
      if (data.guideline) {
        setGuidelineActive(true);
      }
    } catch {
      // silent fail
    } finally {
      setGeneratingGuideline(false);
    }
  };

  // Load project's default voice profile
  useEffect(() => {
    async function loadProjectProfile() {
      const res = await fetch(`/api/projects`);
      const data = await res.json();
      const project = data.projects?.find((p: { id: string }) => p.id === projectId);
      if (project?.voice_profile_id) {
        setVoiceProfileId(project.voice_profile_id);
        checkGuideline(project.voice_profile_id);
      } else {
        // Fallback to latest profile
        const profileRes = await fetch("/api/voice/profile");
        const profileData = await profileRes.json();
        if (profileData.profile?.id) {
          setVoiceProfileId(profileData.profile.id);
          checkGuideline(profileData.profile.id);
        }
      }
    }
    loadProjectProfile();
  }, [projectId]);

  // Re-check guideline when profile changes via selector
  const handleProfileSelect = (id: string | null) => {
    setVoiceProfileId(id);
    if (id) checkGuideline(id);
    else setGuidelineActive(null);
  };

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
            onSelect={handleProfileSelect}
          />
        </div>
        <p className="text-mid-gray mb-4">
          Select formats and style, then generate content in your voice.
        </p>

        {/* Writing Guideline Status */}
        {guidelineActive !== null && (
          <div className={cn(
            "flex items-center justify-between px-4 py-3 rounded-lg border mb-6 text-sm",
            guidelineActive
              ? "bg-lime/5 border-lime/20"
              : "bg-yellow-500/5 border-yellow-500/20"
          )}>
            <div className="flex items-center gap-2">
              {guidelineActive ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-lime" />
                  <span className="text-lime font-medium">Writing Guideline active</span>
                  <span className="text-dark-gray">— your Personal Brand Style Guide is powering all generation</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500 font-medium">No Writing Guideline</span>
                  <span className="text-dark-gray">— generate one for significantly better voice matching</span>
                </>
              )}
            </div>
            {!guidelineActive && (
              <button
                onClick={generateGuidelineNow}
                disabled={generatingGuideline}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime/10 text-lime text-xs font-medium hover:bg-lime/20 transition-colors disabled:opacity-50 shrink-0"
              >
                {generatingGuideline ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Now
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="bg-forest-light border border-forest-mid rounded-xl p-6 mb-8">
          {/* Format Selection */}
          <div className="mb-6">
            <label className="text-sm font-medium text-warm-white mb-3 block">
              Output Formats
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => toggleFormat(f.value)}
                  className={cn(
                    "relative flex flex-col items-start gap-1.5 px-4 py-3 rounded-lg border text-left transition-all",
                    selectedFormats.includes(f.value)
                      ? "bg-lime/10 border-lime"
                      : "border-forest-mid hover:border-dark-gray"
                  )}
                >
                  <div className={cn(
                    "flex items-center gap-2 text-sm font-medium",
                    selectedFormats.includes(f.value) ? "text-lime" : "text-mid-gray"
                  )}>
                    <f.icon className="h-4 w-4" />
                    {f.label}
                  </div>
                  <p className="text-xs text-dark-gray leading-snug">{f.description}</p>
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
              <div className="flex items-center gap-3">
                {/* Preview mode toggle */}
                <div className="flex items-center gap-1 bg-forest-light border border-forest-mid rounded-lg p-0.5">
                  <button
                    onClick={() => setPreviewMode("mobile")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                      previewMode === "mobile"
                        ? "bg-lime/15 text-lime"
                        : "text-dark-gray hover:text-mid-gray"
                    )}
                  >
                    <Smartphone className="h-3.5 w-3.5" /> Mobile
                  </button>
                  <button
                    onClick={() => setPreviewMode("full")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                      previewMode === "full"
                        ? "bg-lime/15 text-lime"
                        : "text-dark-gray hover:text-mid-gray"
                    )}
                  >
                    <Monitor className="h-3.5 w-3.5" /> Full
                  </button>
                </div>
                <button
                  onClick={saveAll}
                  className="flex items-center gap-2 text-sm text-lime hover:text-lime-light transition-colors"
                >
                  <Save className="h-4 w-4" /> Save All to Library
                </button>
              </div>
            </div>
            <div className="space-y-6">
              {results.map((piece, i) => {
                const isMobileFormat = ["x_post", "x_thread", "linkedin"].includes(piece.format);
                const showMobileFrame = isMobileFormat && previewMode === "mobile";
                const pieceKey = `${piece.format}-${piece.style}`;
                const isExpanded = expandedPreviews.has(pieceKey);
                // LinkedIn truncates ~5 lines, X shows full for single posts but truncates threads
                const truncateLines = piece.format === "linkedin" ? 5 : piece.format === "x_post" ? 3 : piece.format === "x_thread" ? 8 : 0;
                const contentLines = piece.content.split("\n");
                const shouldTruncate = showMobileFrame && truncateLines > 0 && contentLines.length > truncateLines;
                const displayContent = shouldTruncate && !isExpanded
                  ? contentLines.slice(0, truncateLines).join("\n")
                  : piece.content;

                return (
                  <motion.div
                    key={`${piece.format}-${piece.style}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-forest-light border border-forest-mid rounded-xl overflow-hidden"
                  >
                    {/* Header bar */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-forest-mid">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-lime/10 text-lime text-xs font-mono uppercase">
                          {piece.format.replace("_", " ")}
                        </span>
                        <span className="text-xs text-dark-gray capitalize">
                          {piece.style}
                        </span>
                        {showMobileFrame && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono uppercase">
                            <Smartphone className="h-3 w-3" /> Preview
                          </span>
                        )}
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

                    {/* Content area */}
                    <div className="p-5">
                      {showMobileFrame ? (
                        /* Mobile phone frame preview */
                        <div className="flex justify-center">
                          <div className="w-[375px] bg-[#0A0A0A] rounded-[2rem] border-2 border-[#2a2a2a] shadow-2xl shadow-black/50 overflow-hidden">
                            {/* Phone notch */}
                            <div className="flex justify-center pt-2 pb-1">
                              <div className="w-28 h-6 bg-[#1a1a1a] rounded-full" />
                            </div>

                            {/* Platform header */}
                            <div className="px-4 py-3 border-b border-[#2a2a2a]">
                              {piece.format === "linkedin" ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                                    <Linkedin className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-white text-sm font-semibold">Jared</div>
                                    <div className="text-[#999] text-xs">Just now · <span className="text-[#999]">🌐</span></div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1d9bf0] to-[#0d8ed9] flex items-center justify-center">
                                    <Twitter className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-white text-sm font-semibold">Jared <span className="text-[#666] font-normal">@jared</span></div>
                                    <div className="text-[#666] text-xs">Just now</div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Post content */}
                            <div className={cn(
                              "px-4 py-3",
                              isExpanded && "max-h-[480px] overflow-y-auto scrollbar-thin"
                            )}>
                              <div className="text-[15px] text-white whitespace-pre-wrap leading-[1.45] font-body">
                                {displayContent}
                                {shouldTruncate && !isExpanded && (
                                  <>
                                    {"... "}
                                    <button
                                      onClick={() => toggleExpanded(pieceKey)}
                                      className="text-[#999] hover:text-white transition-colors inline"
                                    >
                                      more
                                    </button>
                                  </>
                                )}
                              </div>
                              {isExpanded && shouldTruncate && (
                                <button
                                  onClick={() => toggleExpanded(pieceKey)}
                                  className="text-[#999] hover:text-white text-[13px] mt-2 transition-colors"
                                >
                                  Show less
                                </button>
                              )}
                            </div>

                            {/* Engagement bar */}
                            <div className="px-4 py-3 border-t border-[#2a2a2a] flex justify-around">
                              {piece.format === "linkedin" ? (
                                <>
                                  <span className="text-[#999] text-xs">👍 Like</span>
                                  <span className="text-[#999] text-xs">💬 Comment</span>
                                  <span className="text-[#999] text-xs">🔁 Repost</span>
                                  <span className="text-[#999] text-xs">📤 Send</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[#666] text-xs">💬 0</span>
                                  <span className="text-[#666] text-xs">🔁 0</span>
                                  <span className="text-[#666] text-xs">❤️ 0</span>
                                  <span className="text-[#666] text-xs">📊 0</span>
                                </>
                              )}
                            </div>

                            {/* Phone home bar */}
                            <div className="flex justify-center py-2">
                              <div className="w-32 h-1 bg-[#3a3a3a] rounded-full" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Full-width text preview (blog/guide or when toggle is "full") */
                        <div className="text-sm text-warm-white whitespace-pre-wrap leading-relaxed font-body">
                          {piece.content}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
