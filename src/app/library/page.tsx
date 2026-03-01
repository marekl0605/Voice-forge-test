"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Library,
  Copy,
  Check,
  Star,
  Search,
  FileText,
  BookOpen,
  Twitter,
  Linkedin,
  X,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneratedContent, ContentFormat, ContentStyle } from "@/lib/types";

const FORMAT_META: Record<string, { label: string; icon: typeof FileText }> = {
  blog: { label: "Blog Post", icon: FileText },
  guide: { label: "Guide", icon: BookOpen },
  x_post: { label: "X Post", icon: Twitter },
  x_thread: { label: "X Thread", icon: Twitter },
  linkedin: { label: "LinkedIn", icon: Linkedin },
};

export default function LibraryPage() {
  const [content, setContent] = useState<(GeneratedContent & { projects?: { title: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFormat, setFilterFormat] = useState<ContentFormat | "">("");
  const [filterStyle, setFilterStyle] = useState<ContentStyle | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchContent();
  }, [filterFormat, filterStyle]);

  async function fetchContent() {
    const params = new URLSearchParams();
    if (filterFormat) params.set("format", filterFormat);
    if (filterStyle) params.set("style", filterStyle);

    const res = await fetch(`/api/content?${params}`);
    const data = await res.json();
    setContent(data.content || []);
    setLoading(false);
  }

  async function toggleFavorite(id: string, current: boolean) {
    await fetch("/api/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_favorite: !current }),
    });
    setContent((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_favorite: !current } : c))
    );
  }

  async function copyContent(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = content.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.content.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.source_summary?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-warm-white">
              Content Library
            </h1>
            <p className="text-mid-gray mt-1">
              {content.length} piece{content.length !== 1 ? "s" : ""} generated
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-gray" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content..."
              className="w-full bg-forest-light border border-forest-mid rounded-lg pl-10 pr-3 py-2 text-sm text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none"
            />
          </div>

          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value as ContentFormat | "")}
            className="bg-forest-light border border-forest-mid rounded-lg px-3 py-2 text-sm text-warm-white focus:border-lime focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">All Formats</option>
            <option value="blog">Blog Post</option>
            <option value="guide">Guide</option>
            <option value="x_post">X Post</option>
            <option value="x_thread">X Thread</option>
            <option value="linkedin">LinkedIn</option>
          </select>

          <select
            value={filterStyle}
            onChange={(e) => setFilterStyle(e.target.value as ContentStyle | "")}
            className="bg-forest-light border border-forest-mid rounded-lg px-3 py-2 text-sm text-warm-white focus:border-lime focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">All Styles</option>
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
          </select>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="text-center py-12 text-mid-gray">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Library className="h-12 w-12 text-dark-gray mx-auto mb-4" />
            <h2 className="font-display text-xl text-warm-white mb-2">
              {content.length === 0
                ? "Your library is empty"
                : "No matching content"}
            </h2>
            <p className="text-mid-gray">
              {content.length === 0
                ? "Generate content from your workspace to see it here."
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item, i) => {
              const meta = FORMAT_META[item.format] || FORMAT_META.blog;
              const Icon = meta.icon;
              const isExpanded = expandedId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-forest-light border border-forest-mid rounded-xl overflow-hidden"
                >
                  {/* Header */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : item.id); }}
                    className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-forest-mid/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-lime" />
                      <span className="px-2 py-0.5 rounded bg-lime/10 text-lime text-xs font-mono uppercase">
                        {meta.label}
                      </span>
                      <span className="text-xs text-dark-gray capitalize">
                        {item.style}
                      </span>
                      {item.projects && (
                        <span className="text-xs text-mid-gray">
                          from {(item.projects as { title: string }).title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-dark-gray">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id, item.is_favorite);
                        }}
                        className="p-1"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4 transition-colors",
                            item.is_favorite
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-dark-gray hover:text-yellow-400"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Preview (always visible) */}
                  <div className="px-5 pb-3">
                    <p className="text-sm text-mid-gray line-clamp-2">
                      {item.content.slice(0, 200)}
                      {item.content.length > 200 ? "..." : ""}
                    </p>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 border-t border-forest-mid pt-4">
                          <div className="text-sm text-warm-white whitespace-pre-wrap leading-relaxed mb-4 max-h-96 overflow-y-auto">
                            {item.content}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyContent(item.content, item.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-lime/10 text-lime text-xs font-medium hover:bg-lime/20 transition-colors"
                            >
                              {copied === item.id ? (
                                <>
                                  <Check className="h-3 w-3" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setExpandedId(null)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-dark-gray text-xs hover:text-mid-gray transition-colors"
                            >
                              <X className="h-3 w-3" /> Close
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
