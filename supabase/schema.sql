-- VoiceForge Content Engine — Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Voice profiles
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Voice',
  tone TEXT[] DEFAULT '{}',
  formality_level INTEGER DEFAULT 5 CHECK (formality_level >= 1 AND formality_level <= 10),
  sentence_structure JSONB DEFAULT '{"avg_length": "medium", "variety": "medium", "uses_fragments": false, "uses_questions": false}',
  vocabulary JSONB DEFAULT '{"complexity": "moderate", "jargon_level": "none", "industry_terms": []}',
  phrases_used TEXT[] DEFAULT '{}',
  phrases_avoided TEXT[] DEFAULT '{}',
  personality_markers TEXT[] DEFAULT '{}',
  writing_samples TEXT[] DEFAULT '{}',
  raw_analysis TEXT DEFAULT '',
  writing_guideline TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Add writing_guideline column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voice_profiles' AND column_name = 'writing_guideline') THEN
    ALTER TABLE voice_profiles ADD COLUMN writing_guideline TEXT DEFAULT '';
  END IF;
END $$;

-- Projects / topics in the workspace
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voice_profile_id UUID REFERENCES voice_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw materials for content generation
CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('note', 'link', 'article', 'video', 'voice_note', 'excerpt')),
  title TEXT,
  content TEXT NOT NULL,
  url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI conversation history for content distillation
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  messages JSONB DEFAULT '[]',
  distilled_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated content repository
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  voice_profile_id UUID REFERENCES voice_profiles(id) ON DELETE SET NULL,
  format TEXT NOT NULL CHECK (format IN ('blog', 'guide', 'x_post', 'x_thread', 'linkedin')),
  style TEXT NOT NULL CHECK (style IN ('casual', 'formal')),
  title TEXT,
  content TEXT NOT NULL,
  source_summary TEXT,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_materials_project ON materials(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_project ON generated_content(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_format ON generated_content(format);
CREATE INDEX IF NOT EXISTS idx_generated_content_created ON generated_content(created_at DESC);
