"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FolderOpen,
  Plus,
  ArrowRight,
  Calendar,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Project } from "@/lib/types";

export default function WorkspacePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects || []);
    setLoading(false);
  }

  async function createProject() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDescription }),
    });
    const data = await res.json();
    if (data.project) {
      router.push(`/workspace/${data.project.id}`);
    }
    setCreating(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-warm-white">
              Content Workspace
            </h1>
            <p className="text-mid-gray mt-1">
              Organize your ideas into projects. Each project is a content topic.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-lime text-forest rounded-lg font-medium hover:bg-lime-dark transition-colors"
          >
            <Plus className="h-4 w-4" /> New Project
          </button>
        </div>

        {/* Create Dialog */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-forest-light border border-forest-mid rounded-xl p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-warm-white">
                New Project
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-dark-gray hover:text-warm-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Project title — e.g., 'AI in Marketing', 'Leadership Lessons'"
              className="w-full bg-forest border border-forest-mid rounded-lg p-3 text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none text-sm mb-3"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createProject()}
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Brief description (optional)"
              className="w-full bg-forest border border-forest-mid rounded-lg p-3 text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none text-sm mb-4 h-20 resize-none"
            />
            <button
              onClick={createProject}
              disabled={!newTitle.trim() || creating}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                newTitle.trim()
                  ? "bg-lime text-forest hover:bg-lime-dark"
                  : "bg-forest-mid text-dark-gray cursor-not-allowed"
              )}
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </motion.div>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="text-mid-gray text-center py-12">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-12 w-12 text-dark-gray mx-auto mb-4" />
            <h2 className="font-display text-xl text-warm-white mb-2">
              No projects yet
            </h2>
            <p className="text-mid-gray mb-4">
              Create a project to start collecting ideas and generating content.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project, i) => (
              <motion.button
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/workspace/${project.id}`)}
                className="bg-forest-light border border-forest-mid rounded-xl p-5 text-left hover:border-lime/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-bold text-warm-white group-hover:text-lime transition-colors">
                      {project.title}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-mid-gray mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3 text-xs text-dark-gray">
                      <Calendar className="h-3 w-3" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-dark-gray group-hover:text-lime transition-colors mt-1" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
