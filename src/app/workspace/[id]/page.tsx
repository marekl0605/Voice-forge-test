"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  Link2,
  BookOpen,
  Video,
  Mic,
  Quote,
  Plus,
  Trash2,
  Send,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  X,
  ArrowRight,
  TrendingUp,
  ChevronDown,
  Flame,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Material } from "@/lib/types";
import { VoiceProfileSelector } from "@/components/voice-profile-selector";

const MATERIAL_TYPES = [
  { value: "note", label: "Note", icon: FileText },
  { value: "link", label: "Link", icon: Link2 },
  { value: "article", label: "Article", icon: BookOpen },
  { value: "video", label: "Video", icon: Video },
  { value: "voice_note", label: "Voice Note", icon: Mic },
  { value: "excerpt", label: "Excerpt", icon: Quote },
] as const;

export default function ProjectWorkspacePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [materialType, setMaterialType] = useState<string>("note");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialContent, setMaterialContent] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [mode, setMode] = useState<"guided" | "automated">("guided");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [voiceProfileId, setVoiceProfileId] = useState<string | null>(null);
  const [trends, setTrends] = useState<{ youtube?: { title: string; context: string; relevance: number }[]; twitter?: { topic: string; context: string; relevance: number }[] } | null>(null);
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(chatMessages);
  messagesRef.current = chatMessages;

  const sendMessage = useCallback(async (userMessage: string) => {
    const userMsg = { role: "user" as const, content: userMessage };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    // Build from ref to avoid stale closure
    const allMessages = [...messagesRef.current, userMsg];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, messages: allMessages, mode }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            assistantContent += decoder.decode(value, { stream: true });
            const content = assistantContent;
            setChatMessages(prev => {
              // Replace trailing assistant msg (streaming) or append new one
              const base = prev.length > 0 && prev[prev.length - 1].role === "assistant"
                ? prev.slice(0, -1)
                : prev;
              return [...base, { role: "assistant" as const, content }];
            });
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [
        ...prev,
        { role: "assistant" as const, content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [projectId, mode]);

  useEffect(() => {
    fetchProject();
    fetchMaterials();
  }, [projectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function fetchProject() {
    const res = await fetch(`/api/projects`);
    const data = await res.json();
    const project = data.projects?.find((p: { id: string }) => p.id === projectId);
    if (project) setProjectTitle(project.title);
    setLoading(false);
  }

  async function fetchMaterials() {
    const res = await fetch(`/api/materials?project_id=${projectId}`);
    const data = await res.json();
    setMaterials(data.materials || []);
  }

  async function addMaterial() {
    if (!materialContent.trim()) return;
    await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        type: materialType,
        title: materialTitle || null,
        content: materialContent,
        url: materialUrl || null,
      }),
    });
    setMaterialTitle("");
    setMaterialContent("");
    setMaterialUrl("");
    setShowAddMaterial(false);
    fetchMaterials();
  }

  async function deleteMaterial(id: string) {
    await fetch(`/api/materials?id=${id}`, { method: "DELETE" });
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  async function fetchTrends(industry: string) {
    setTrendsLoading(true);
    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, keywords: [] }),
      });
      const data = await res.json();
      if (data.trends) setTrends(data.trends);
    } catch (err) {
      console.error("Trends error:", err);
    } finally {
      setTrendsLoading(false);
    }
  }

  async function addTrendAsMaterial(title: string, context: string, source: string) {
    await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        type: "note",
        title: `[Trending on ${source}] ${title}`,
        content: context,
      }),
    });
    fetchMaterials();
  }

  const getTypeIcon = (type: string) => {
    const found = MATERIAL_TYPES.find((t) => t.value === type);
    return found ? found.icon : FileText;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-mid-gray">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-forest-mid px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-warm-white">
            {projectTitle}
          </h1>
          <p className="text-xs text-mid-gray">
            {materials.length} material{materials.length !== 1 ? "s" : ""} collected
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VoiceProfileSelector
            selectedId={voiceProfileId}
            onSelect={setVoiceProfileId}
          />
          <button
            onClick={() => router.push(`/generate/${projectId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-lime text-forest rounded-lg font-medium hover:bg-lime-dark transition-colors"
          >
            <Sparkles className="h-4 w-4" /> Generate Content
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content: Materials + Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Materials Panel */}
        <div className="w-80 border-r border-forest-mid flex flex-col">
          <div className="p-4 border-b border-forest-mid flex items-center justify-between">
            <h2 className="text-sm font-medium text-warm-white">Raw Materials</h2>
            <button
              onClick={() => setShowAddMaterial(true)}
              className="p-1.5 rounded-lg bg-lime/10 text-lime hover:bg-lime/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add Material Form */}
          {showAddMaterial && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-4 border-b border-forest-mid bg-forest-light"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-mid-gray">Add Material</span>
                <button onClick={() => setShowAddMaterial(false)} className="text-dark-gray">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {MATERIAL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setMaterialType(t.value)}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-medium transition-colors",
                      materialType === t.value
                        ? "bg-lime/20 text-lime"
                        : "text-dark-gray hover:text-mid-gray"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <input
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full bg-forest border border-forest-mid rounded px-2 py-1.5 text-sm text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none mb-2"
              />
              <textarea
                value={materialContent}
                onChange={(e) => setMaterialContent(e.target.value)}
                placeholder="Paste your content, notes, or thoughts..."
                className="w-full bg-forest border border-forest-mid rounded px-2 py-1.5 text-sm text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none h-24 resize-none mb-2"
              />
              {(materialType === "link" || materialType === "video") && (
                <input
                  value={materialUrl}
                  onChange={(e) => setMaterialUrl(e.target.value)}
                  placeholder="URL"
                  className="w-full bg-forest border border-forest-mid rounded px-2 py-1.5 text-sm text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none mb-2"
                />
              )}
              <button
                onClick={addMaterial}
                disabled={!materialContent.trim()}
                className="w-full py-1.5 rounded bg-lime text-forest text-sm font-medium hover:bg-lime-dark transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </motion.div>
          )}

          {/* Materials List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {materials.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-dark-gray mx-auto mb-2" />
                <p className="text-xs text-dark-gray">
                  No materials yet. Add notes, links, or excerpts.
                </p>
              </div>
            ) : (
              materials.map((m) => {
                const Icon = getTypeIcon(m.type);
                return (
                  <div
                    key={m.id}
                    className="group bg-forest border border-forest-mid rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-lime" />
                        <span className="text-xs font-medium text-mid-gray uppercase">
                          {m.type}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteMaterial(m.id)}
                        className="opacity-0 group-hover:opacity-100 text-dark-gray hover:text-red-400 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {m.title && (
                      <p className="text-sm font-medium text-warm-white mb-1">
                        {m.title}
                      </p>
                    )}
                    <p className="text-xs text-mid-gray line-clamp-3">
                      {m.content}
                    </p>
                    {m.url && (
                      <p className="text-xs text-lime mt-1 truncate">{m.url}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Middle: Trending Panel (collapsible) */}
        {trendsOpen && (
          <div className="w-72 border-r border-forest-mid flex flex-col">
            <div className="p-4 border-b border-forest-mid flex items-center justify-between">
              <h2 className="text-sm font-medium text-warm-white flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-400" /> Trending Now
              </h2>
              <button onClick={() => setTrendsOpen(false)} className="text-dark-gray hover:text-warm-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {trendsLoading ? (
                <div className="text-center py-8 text-mid-gray text-xs">Loading trends...</div>
              ) : !trends ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-6 w-6 text-dark-gray mx-auto mb-2" />
                  <p className="text-xs text-dark-gray mb-3">Enter your industry to discover trends</p>
                  <form onSubmit={(e) => { e.preventDefault(); const input = (e.target as HTMLFormElement).elements.namedItem("industry") as HTMLInputElement; if (input.value.trim()) fetchTrends(input.value.trim()); }}>
                    <input name="industry" placeholder="e.g., AI, SaaS, Marketing" className="w-full bg-forest border border-forest-mid rounded px-2 py-1.5 text-xs text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none mb-2" />
                    <button type="submit" className="w-full py-1.5 rounded bg-lime/10 text-lime text-xs font-medium hover:bg-lime/20 transition-colors">Find Trends</button>
                  </form>
                </div>
              ) : (
                <>
                  {trends.twitter && trends.twitter.length > 0 && (
                    <div>
                      <h3 className="text-xs font-mono text-dark-gray uppercase mb-2">X / Twitter</h3>
                      {trends.twitter.map((t, i) => (
                        <div key={i} className="bg-forest border border-forest-mid rounded-lg p-2.5 mb-2">
                          <p className="text-xs font-medium text-warm-white mb-1">{t.topic}</p>
                          <p className="text-xs text-mid-gray line-clamp-2 mb-2">{t.context}</p>
                          <button
                            onClick={() => addTrendAsMaterial(t.topic, t.context, "X")}
                            className="text-xs text-lime hover:text-lime-light transition-colors flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Use as material
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {trends.youtube && trends.youtube.length > 0 && (
                    <div>
                      <h3 className="text-xs font-mono text-dark-gray uppercase mb-2">YouTube</h3>
                      {trends.youtube.map((t, i) => (
                        <div key={i} className="bg-forest border border-forest-mid rounded-lg p-2.5 mb-2">
                          <p className="text-xs font-medium text-warm-white mb-1">{t.title}</p>
                          <p className="text-xs text-mid-gray line-clamp-2 mb-2">{t.context}</p>
                          <button
                            onClick={() => addTrendAsMaterial(t.title, t.context, "YouTube")}
                            className="text-xs text-lime hover:text-lime-light transition-colors flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Use as material
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => { setTrends(null); }}
                    className="w-full py-1.5 rounded bg-forest-mid text-mid-gray text-xs hover:text-warm-white transition-colors"
                  >
                    Search different topic
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Right: AI Chat */}
        <div className="flex-1 flex flex-col">
          {/* Mode Toggle */}
          <div className="px-6 py-3 border-b border-forest-mid">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-warm-white">
                  AI Content Partner
                </h2>
                {!trendsOpen && (
                  <button
                    onClick={() => setTrendsOpen(true)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-mid-gray hover:text-orange-400 hover:bg-orange-400/5 transition-colors"
                  >
                    <Flame className="h-3.5 w-3.5" /> Trends
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = mode === "guided" ? "automated" : "guided";
                    setMode(next);
                    if (chatMessages.length > 0) {
                      setChatMessages([]);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    mode === "guided"
                      ? "bg-lime/10 text-lime border border-lime/20"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  )}
                >
                  {mode === "guided" ? (
                    <ToggleLeft className="h-4 w-4" />
                  ) : (
                    <ToggleRight className="h-4 w-4" />
                  )}
                  {mode === "guided" ? "Guided" : "Automated"}
                </button>
              </div>
            </div>
            <p className="text-xs text-dark-gray mt-1.5">
              {mode === "guided"
                ? "I'll ask questions to sharpen your idea before generating content."
                : "Drop your topic and I'll produce a full content brief instantly."}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="h-8 w-8 text-lime/30 mx-auto mb-3" />
                <p className="text-mid-gray text-sm">
                  {mode === "guided"
                    ? "I'll ask questions to help shape your content. Start by telling me what you're working on."
                    : "Share your topic or idea, and I'll distill it into a content brief."}
                </p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-3 text-sm",
                    msg.role === "user"
                      ? "bg-lime/10 text-warm-white"
                      : "bg-forest-light border border-forest-mid text-mid-gray"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </motion.div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-forest-light border border-forest-mid rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-lime"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-forest-mid">
            <div className="flex items-end gap-3">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.trim() && !chatLoading) {
                      sendMessage(chatInput);
                      setChatInput("");
                    }
                  }
                }}
                placeholder="Share your thoughts, ideas, or ask a question..."
                rows={1}
                className="flex-1 bg-forest-light border border-forest-mid rounded-lg px-4 py-3 text-sm text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (chatInput.trim() && !chatLoading) {
                    sendMessage(chatInput);
                    setChatInput("");
                  }
                }}
                disabled={!chatInput.trim() || chatLoading}
                className="p-3 bg-lime text-forest rounded-lg hover:bg-lime-dark transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
