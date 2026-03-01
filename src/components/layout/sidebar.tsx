"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mic,
  User,
  FolderOpen,
  Sparkles,
  Library,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/voice-wizard", icon: Mic, label: "Voice Wizard" },
  { href: "/profile", icon: User, label: "Voice Profile" },
  { href: "/workspace", icon: FolderOpen, label: "Workspace" },
  { href: "/generate", icon: Sparkles, label: "Generate" },
  { href: "/library", icon: Library, label: "Library" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-forest-mid bg-forest flex flex-col">
      <div className="p-6 border-b border-forest-mid">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-lime" />
          <span className="font-display text-xl font-bold text-warm-white">
            VoiceForge
          </span>
        </Link>
        <p className="text-xs text-mid-gray mt-1 font-body">
          Content in your voice
        </p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-lime/10 text-lime"
                  : "text-mid-gray hover:text-warm-white hover:bg-forest-light"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-forest-mid">
        <p className="text-xs text-dark-gray text-center">
          Built for{" "}
          <span className="text-lime font-medium">The AI Natives</span>
        </p>
      </div>
    </aside>
  );
}
