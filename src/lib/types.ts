export interface VoiceProfile {
  id: string;
  name: string;
  tone: string[];
  formality_level: number;
  sentence_structure: {
    avg_length: "short" | "medium" | "long";
    variety: "low" | "medium" | "high";
    uses_fragments: boolean;
    uses_questions: boolean;
  };
  vocabulary: {
    complexity: "simple" | "moderate" | "sophisticated";
    jargon_level: "none" | "some" | "heavy";
    industry_terms: string[];
  };
  phrases_used: string[];
  phrases_avoided: string[];
  personality_markers: string[];
  writing_samples: string[];
  raw_analysis: string;
  writing_guideline?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  voice_profile_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  project_id: string;
  type: "note" | "link" | "article" | "video" | "voice_note" | "excerpt";
  title: string | null;
  content: string;
  url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  messages: ChatMessage[];
  distilled_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export type ContentFormat = "blog" | "guide" | "x_post" | "x_thread" | "linkedin";
export type ContentStyle = "casual" | "formal";

export interface GeneratedContent {
  id: string;
  project_id: string;
  voice_profile_id: string;
  format: ContentFormat;
  style: ContentStyle;
  title: string | null;
  content: string;
  source_summary: string | null;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export type SampleType = "writing" | "transcript" | "upload";

export interface WizardSample {
  content: string;
  type: SampleType;
  fileName?: string;
}

export interface WizardData {
  samples: WizardSample[];
  formality: number;
  tonePreferences: string[];
  sentenceLength: "short" | "medium" | "long";
  audienceType: string;
  industryContext: string;
}

export interface TrendingTopic {
  source: "youtube" | "twitter";
  title: string;
  url?: string;
  context?: string;
  relevance?: number;
}
