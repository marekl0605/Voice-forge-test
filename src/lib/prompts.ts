import { VoiceProfile } from "./types";

export function buildVoiceAnalysisPrompt(
  samples: string[],
  preferences: {
    formality: number;
    tonePreferences: string[];
    sentenceLength: string;
    audienceType: string;
    industryContext: string;
  }
) {
  return `You are a world-class writing style analyst. Analyze the following writing samples and style preferences to create a detailed voice profile.

## Writing Samples
${samples.map((s, i) => `### Sample ${i + 1}\n${s}`).join("\n\n")}

## User Preferences
- Formality Level: ${preferences.formality}/10
- Tone Preferences: ${preferences.tonePreferences.join(", ")}
- Preferred Sentence Length: ${preferences.sentenceLength}
- Target Audience: ${preferences.audienceType}
- Industry/Domain: ${preferences.industryContext}

## Your Task
Analyze the writing samples deeply. Look for:
- Recurring patterns in tone, rhythm, and word choice
- How they start sentences and paragraphs
- Their use of questions, fragments, analogies, humor
- Vocabulary complexity and jargon usage
- Phrases or constructions they favor
- Things they seem to avoid

Return a JSON object with EXACTLY this structure (no markdown, no code fences, just valid JSON):
{
  "name": "My Voice",
  "tone": ["array", "of", "3-5", "tone", "descriptors"],
  "formality_level": <number 1-10>,
  "sentence_structure": {
    "avg_length": "short" | "medium" | "long",
    "variety": "low" | "medium" | "high",
    "uses_fragments": <boolean>,
    "uses_questions": <boolean>
  },
  "vocabulary": {
    "complexity": "simple" | "moderate" | "sophisticated",
    "jargon_level": "none" | "some" | "heavy",
    "industry_terms": ["relevant", "industry", "terms", "they", "use"]
  },
  "phrases_used": ["actual phrases or constructions from their writing", "at least 5"],
  "phrases_avoided": ["types of phrases they clearly avoid", "at least 3"],
  "personality_markers": ["specific personality traits visible in writing", "at least 4"],
  "raw_analysis": "A 2-3 paragraph natural language summary of this person's writing voice, written as if describing them to someone who needs to write in their style."
}`;
}

export function buildVoiceProfileContext(profile: VoiceProfile): string {
  const formalityDesc = profile.formality_level <= 3
    ? "very casual and informal"
    : profile.formality_level <= 5
      ? "conversational but professional"
      : profile.formality_level <= 7
        ? "professional and polished"
        : "highly formal and authoritative";

  return `You are writing as someone with this exact voice profile. Match their patterns precisely — do NOT default to generic AI writing.

VOICE PROFILE:
- TONE: ${profile.tone.join(", ")}
- FORMALITY: ${profile.formality_level}/10 — ${formalityDesc}
- SENTENCES: ${profile.sentence_structure.avg_length} average length, ${profile.sentence_structure.variety} variety${profile.sentence_structure.uses_fragments ? ", uses fragments for emphasis" : ""}${profile.sentence_structure.uses_questions ? ", asks rhetorical questions" : ""}
- VOCABULARY: ${profile.vocabulary.complexity} complexity, ${profile.vocabulary.jargon_level} jargon${profile.vocabulary.industry_terms.length > 0 ? `. Industry terms: ${profile.vocabulary.industry_terms.join(", ")}` : ""}
- PHRASES THEY USE: ${profile.phrases_used.map(p => `"${p}"`).join(", ")}
- PHRASES THEY NEVER USE: ${profile.phrases_avoided.map(p => `"${p}"`).join(", ")}
- PERSONALITY: ${profile.personality_markers.join(", ")}

CRITICAL: Write as if you ARE this person. Use their phrases naturally. Match their sentence rhythm. If they're casual, be casual. If they use fragments, use fragments. If they ask questions, ask questions. The output should be indistinguishable from something they'd actually write.`;
}

export function buildDistillationPrompt(mode: "guided" | "automated"): string {
  if (mode === "guided") {
    return `You are a brilliant content strategist helping someone develop their ideas into publishable content. You have access to their raw materials (notes, links, articles, thoughts).

Your job is to ASK GREAT QUESTIONS. Don't generate content yet. Instead:
- Ask what resonated most from their source material
- Ask who the audience is for this piece
- Ask what the one key takeaway should be
- Push back when ideas are vague — help them sharpen their thinking
- Surface connections between different pieces of material
- Suggest angles they might not have considered

Be direct, smart, and occasionally opinionated. You're a collaborator, not a yes-machine. Keep responses concise — 2-4 sentences per response, followed by a focused question.`;
  }

  return `You are a brilliant content strategist. The user has shared raw materials and wants you to quickly distill the core themes and generate a content brief.

Analyze all the materials provided and produce:
1. **Core Message** — The single most important idea
2. **Key Themes** — 3-5 supporting themes or angles
3. **Target Audience** — Who this content is for
4. **Suggested Hook** — An attention-grabbing opening angle
5. **Content Direction** — A 2-3 sentence summary of the content direction

Be sharp and opinionated. Don't hedge. Make bold recommendations.`;
}

export function buildGenerationPrompt(
  format: string,
  style: string,
  summary: string,
  materials: string
): string {
  const formatInstructions: Record<string, string> = {
    blog: `Write a blog post (600-1000 words). Include a compelling headline, strong opening hook, clear structure with subheadings if appropriate, and a memorable closing. The post should feel like a real blog entry someone would publish on their personal site.`,
    guide: `Write a comprehensive guide (1000-1500 words). Include a clear title, introduction explaining what the reader will learn, well-structured sections with actionable insights, examples or frameworks where relevant, and a strong conclusion. This should feel like a definitive resource.`,
    x_post: `Write a single X/Twitter post (max 280 characters). Make it punchy, memorable, and shareable. It should stand alone as a complete thought. Also write an alternative X thread version (3-5 tweets, each under 280 chars) that unpacks the idea further. Separate the single post and thread with "---THREAD---".`,
    x_thread: `Write an X/Twitter thread (5-8 tweets, each under 280 characters). Start with a hook tweet that makes people stop scrolling. Build the argument across tweets. End with a strong closer or call-to-action. Number each tweet.`,
    linkedin: `Write a LinkedIn post (150-300 words). Start with a hook line that creates curiosity. Use short paragraphs (1-2 sentences each). Include a personal angle or story. End with a question or call to engage. LinkedIn formatting: use line breaks between paragraphs, no bullet points in the first few lines.`,
  };

  const styleInstructions: Record<string, string> = {
    casual: `STYLE: Casual and human. Relaxed grammar is fine. Contractions encouraged. Can break conventional writing rules for effect. Should feel like talking to a smart friend. Conversational, warm, maybe a little edgy.`,
    formal: `STYLE: Formal and polished. Clean grammar, professional tone. Well-structured sentences. Should feel like reading a respected publication. Authoritative but not stuffy.`,
  };

  return `${formatInstructions[format] || formatInstructions.blog}

${styleInstructions[style] || styleInstructions.casual}

## Source Material & Direction
${summary}

## Raw Materials
${materials}

Write the content now. Output ONLY the content itself — no meta-commentary, no "here's the content", no labels. Just the finished piece.`;
}
