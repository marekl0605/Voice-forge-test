import { VoiceProfile } from "./types";
import { loadSkill } from "./skills";

export function buildVoiceAnalysisPrompt(
  samples: { content: string; type: "writing" | "transcript" | "upload" }[],
  preferences: {
    formality: number;
    tonePreferences: string[];
    sentenceLength: string;
    audienceType: string;
    industryContext: string;
  }
) {
  const samplesText = samples.map((s, i) => {
    const label = s.type === "transcript"
      ? `### Sample ${i + 1} (Meeting Transcript — analyze for speaking patterns, verbal tics, how they explain ideas conversationally)`
      : s.type === "upload"
        ? `### Sample ${i + 1} (Uploaded Document)`
        : `### Sample ${i + 1} (Writing Sample)`;
    return `${label}\n${s.content}`;
  }).join("\n\n");

  const skill = loadSkill("voice-analyst");
  const hasTranscripts = samples.some(s => s.type === "transcript");

  // Remove the transcript section from skill if no transcripts provided
  const skillContent = hasTranscripts
    ? skill
    : skill.replace(/## Transcript-Specific Instructions[\s\S]*?(?=## Output Format)/, "");

  return `${skillContent}

## Writing Samples
${samplesText}

## User Preferences
- Formality Level: ${preferences.formality}/10
- Tone Preferences: ${preferences.tonePreferences.join(", ")}
- Preferred Sentence Length: ${preferences.sentenceLength}
- Target Audience: ${preferences.audienceType}
- Industry/Domain: ${preferences.industryContext}`;
}

export function buildVoiceProfileContext(profile: VoiceProfile, writingGuideline?: string): string {
  // Convert personality markers into behavioral instructions
  const personalityInstructions = profile.personality_markers.map(marker => {
    const m = marker.toLowerCase();
    if (m.includes("opinionated") || m.includes("bold")) return "Take strong stances. Don't hedge with 'it depends' or 'there are many perspectives.' State what you believe and defend it.";
    if (m.includes("humor") || m.includes("funny") || m.includes("witty")) return "Use humor as a tool — dry asides, unexpected analogies, or self-deprecating moments. Never force it; let it emerge naturally.";
    if (m.includes("vulnerable") || m.includes("honest") || m.includes("authentic")) return "Share real experiences and admit uncertainty when genuine. Don't perform vulnerability — be matter-of-fact about failures and lessons.";
    if (m.includes("analytical") || m.includes("data") || m.includes("logical")) return "Back claims with evidence, frameworks, or specific examples. Structure arguments logically. Use 'because' and 'here's why' to build reasoning chains.";
    if (m.includes("provocat") || m.includes("contrarian") || m.includes("challenge")) return "Challenge conventional wisdom. Open with a surprising counter-take. Make the reader reconsider what they assumed.";
    if (m.includes("storytell") || m.includes("narrative")) return "Anchor abstract ideas in concrete stories and examples. Start with a scene or moment, then zoom out to the lesson.";
    if (m.includes("pragmatic") || m.includes("practical") || m.includes("action")) return "Focus on what works, not what's theoretically perfect. Give specific, implementable advice. Skip the philosophy and get to the 'do this' part.";
    if (m.includes("warm") || m.includes("empathetic") || m.includes("supportive")) return "Write with warmth. Acknowledge the reader's challenges before offering solutions. Use 'we' and 'you' to create intimacy.";
    if (m.includes("sarcas") || m.includes("irreverent") || m.includes("edgy")) return "Don't take things too seriously. Use sarcasm sparingly but effectively. Poke fun at industry clichés and pretension.";
    return `Embody this trait in your writing: ${marker}.`;
  }).join("\n");

  // Build sentence rhythm instructions
  const rhythmInstructions = (() => {
    const parts: string[] = [];
    const s = profile.sentence_structure;
    if (s.avg_length === "short") parts.push("Keep sentences tight. 8-15 words is your sweet spot. Punch, don't ramble.");
    if (s.avg_length === "long") parts.push("Let sentences breathe and flow — use subordinate clauses, em-dashes, and parentheticals to layer ideas within a single thought.");
    if (s.variety === "high") parts.push("Vary your rhythm dramatically. Follow a long flowing sentence with a short punch. Then a fragment. Then build again.");
    if (s.uses_fragments) parts.push("Use fragments intentionally for emphasis. Not every thought needs a subject and verb. Like this.");
    if (s.uses_questions) parts.push("Drop in rhetorical questions to create dialogue with the reader. 'But does it actually work?' 'Here's the real question.' Make them think.");
    return parts.join(" ");
  })();

  // Build vocabulary instructions
  const vocabInstructions = (() => {
    const v = profile.vocabulary;
    const parts: string[] = [];
    if (v.complexity === "simple") parts.push("Use plain, direct language. If a simpler word exists, use it. Write like you're explaining to a smart friend, not a textbook.");
    if (v.complexity === "sophisticated") parts.push("Don't shy away from precise, elevated vocabulary when it serves the point. But never use a big word just to sound smart.");
    if (v.jargon_level === "heavy" && v.industry_terms.length > 0) parts.push(`Naturally use industry terms like: ${v.industry_terms.join(", ")}. Don't define them — assume the reader is a peer.`);
    if (v.jargon_level === "none") parts.push("Avoid jargon completely. If an industry term is necessary, immediately explain it in plain language.");
    return parts.join(" ");
  })();

  const formalityDesc = profile.formality_level <= 3
    ? "Write like you're texting a smart colleague. Contractions, incomplete thoughts, casual asides — all fair game."
    : profile.formality_level <= 5
      ? "Conversational but competent. You can be casual without being sloppy. Think 'smart person at a dinner party' not 'academic paper' or 'slack message.'"
      : profile.formality_level <= 7
        ? "Professional and polished, but still human. Clean prose, well-structured arguments, but with personality showing through."
        : "Authoritative and precise. Measured language, careful word choice, strong command of structure. Think editorial in a respected publication.";

  // If a writing guideline exists, use it as the primary voice instruction
  const guidelineSection = writingGuideline
    ? `\n\n## PERSONAL BRAND STYLE GUIDE\nThe following is the user's comprehensive writing guideline. This is the MASTER RULESET — follow it precisely.\n\n${writingGuideline}`
    : "";

  return `You are ghostwriting as a specific person. Your job is to be INDISTINGUISHABLE from their real writing. Every sentence should pass a blind test — someone who knows this person should read it and think "that sounds exactly like them."

## VOICE DNA

### Tone & Formality
${profile.tone.join(", ")} | Formality: ${profile.formality_level}/10
${formalityDesc}

### Sentence Rhythm
${rhythmInstructions}

### Vocabulary Rules
${vocabInstructions}

### Behavioral Instructions
${personalityInstructions}

### Signature Phrases — WEAVE THESE IN NATURALLY
${profile.phrases_used.map(p => `- "${p}"`).join("\n")}
Don't force them in. Use 2-3 per piece where they'd naturally occur. They should feel organic, not dropped in as tokens.

### BANNED Phrases — NEVER USE THESE
${profile.phrases_avoided.map(p => `- "${p}"`).join("\n")}
If you catch yourself writing any of these, stop and rewrite the sentence. These are voice-killers that would immediately reveal AI wrote this.

### Voice Blueprint
${profile.raw_analysis}
${guidelineSection}

## QUALITY CHECK
Before finalizing, mentally re-read your output and ask:
1. Does every paragraph sound like THIS person, not a generic AI?
2. Did I use their actual phrases (not just mention their existence)?
3. Is the sentence rhythm varied the way THEY vary it?
4. Would someone who reads this person regularly notice anything off?

If any answer is "no," rewrite those sections.`;
}

export function buildDistillationPrompt(mode: "guided" | "automated", voiceTraits?: { personality: string[]; tone: string[] }): string {
  const skill = loadSkill("content-strategist");
  const voiceHint = voiceTraits
    ? `\n\nThis person's voice is ${voiceTraits.tone.join(", ")} with traits: ${voiceTraits.personality.join(", ")}. Tailor your questions and suggestions to angles that play to these strengths.`
    : "";

  // The skill file contains both modes separated by "---"
  const sections = skill.split("---");
  const guidedSection = sections[0] || "";
  const automatedSection = sections[1] || "";

  if (mode === "guided") {
    return `${guidedSection.trim()}${voiceHint}`;
  }

  return `${automatedSection.trim()}${voiceHint}`;
}

export function buildGenerationPrompt(
  format: string,
  style: string,
  summary: string,
  materials: string,
  trendContext?: string
): string {
  // Load format-specific skill file
  const formatSkillMap: Record<string, string> = {
    blog: "blog-expert",
    guide: "guide-expert",
    x_post: "x-expert",
    x_thread: "x-expert",
    linkedin: "linkedin-expert",
  };

  const skillName = formatSkillMap[format] || "blog-expert";
  const formatInstructions = loadSkill(skillName);

  // For x_post vs x_thread, extract the right section from the same skill file
  let formatSection = formatInstructions;
  if (format === "x_post") {
    // Single post only — extract everything before the thread section
    const threadMarker = "## FORMAT: Thread";
    const idx = formatInstructions.indexOf(threadMarker);
    if (idx > 0) {
      formatSection = formatInstructions.substring(0, idx).trim();
    }
  } else if (format === "x_thread") {
    // Thread only — extract from the thread section onward
    const threadMarker = "## FORMAT: Thread";
    const idx = formatInstructions.indexOf(threadMarker);
    if (idx > 0) {
      formatSection = formatInstructions.substring(idx).trim();
    }
  }

  const styleLayer = style === "formal"
    ? `\n\nSTYLE OVERLAY: While maintaining the voice profile, lean toward the more polished end of their range. Tighter prose, fewer fragments, stronger structure. Think "their best writing day" not "their casual Tuesday."`
    : `\n\nSTYLE OVERLAY: Lean into the conversational, human side of their voice. If they use humor, more of it. If they're casual, be casually brilliant. Think "their most authentic, relaxed writing."`;

  const trendLayer = trendContext
    ? `\n\n## TRENDING CONTEXT\n${trendContext}\nIf any of these trends are relevant to the topic, weave in timely references to increase relevance and shareability. Don't force it — only reference trends that genuinely connect to the content.`
    : "";

  return `${formatSection}
${styleLayer}

## CONTENT DIRECTION
${summary}

## SOURCE MATERIAL
${materials || "No raw materials provided. Generate based on the content direction above."}
${trendLayer}

## OUTPUT RULES
- Output ONLY the finished content. No meta-commentary, no "Here's your blog post:", no labels.
- The content must sound like a real person wrote it, not an AI. Read it back — if it sounds like ChatGPT, rewrite it.
- Every sentence should earn its place. Cut filler ruthlessly.`;
}

export function buildWritingGuidelinePrompt(profile: VoiceProfile): string {
  const skill = loadSkill("writing-guideline-generator");

  return `${skill}

## Voice Profile Data

**Name:** ${profile.name}
**Tone:** ${profile.tone.join(", ")}
**Formality:** ${profile.formality_level}/10

**Sentence Structure:**
- Average length: ${profile.sentence_structure.avg_length}
- Variety: ${profile.sentence_structure.variety}
- Uses fragments: ${profile.sentence_structure.uses_fragments}
- Uses questions: ${profile.sentence_structure.uses_questions}

**Vocabulary:**
- Complexity: ${profile.vocabulary.complexity}
- Jargon level: ${profile.vocabulary.jargon_level}
- Industry terms: ${profile.vocabulary.industry_terms.join(", ")}

**Signature Phrases:** ${profile.phrases_used.map(p => `"${p}"`).join(", ")}

**Phrases to Avoid:** ${profile.phrases_avoided.map(p => `"${p}"`).join(", ")}

**Personality Markers:** ${profile.personality_markers.join(", ")}

**Voice Blueprint:**
${profile.raw_analysis}

---

Now generate the complete Personal Brand Style Guide based on this voice profile data. Output it as clean markdown.`;
}

export function buildTrendContext(trends: { youtube?: { title: string; url: string }[]; twitter?: { topic: string; context: string }[] }): string {
  const parts: string[] = [];
  if (trends.youtube?.length) {
    parts.push("**Trending on YouTube:**\n" + trends.youtube.map(t => `- "${t.title}"`).join("\n"));
  }
  if (trends.twitter?.length) {
    parts.push("**Trending on X/Twitter:**\n" + trends.twitter.map(t => `- ${t.topic}: ${t.context}`).join("\n"));
  }
  return parts.join("\n\n") || "";
}
