"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Project } from "@/lib/types";

export default function GenerateIndexPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects || []);
      setLoading(false);
    }
    fetchProjects();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-mid-gray">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="font-display text-3xl font-bold text-warm-white mb-2">
        Generate Content
      </h1>
      <p className="text-mid-gray mb-8">
        Select a project to generate content from.
      </p>
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 text-dark-gray mx-auto mb-4" />
          <p className="text-mid-gray">
            Create a project in the workspace first.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/generate/${p.id}`)}
              className="w-full bg-forest-light border border-forest-mid rounded-xl p-4 text-left hover:border-lime/30 transition-all"
            >
              <h3 className="font-display text-lg text-warm-white">{p.title}</h3>
              {p.description && (
                <p className="text-sm text-mid-gray mt-1">{p.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
