# VoiceForge — Decision Log

## What I Built

The full P0 end-to-end flow:

1. **Voice Capture Wizard** — A 5-step conversational onboarding that collects writing samples, style preferences (formality, tone, sentence length, audience, industry), and generates a structured voice profile via GPT-4o analysis.

2. **Editable Voice Profile** — Card-based visual display of all voice attributes (tone, formality, sentence structure, vocabulary, phrases used/avoided, personality markers). Every field is editable inline.

3. **Content Workspace** — Projects organize raw materials by topic. Each project has a materials panel (supporting notes, links, articles, video URLs, voice notes, excerpts) and an AI chat partner for content distillation. Two modes: Guided (AI asks sharpening questions) and Automated (AI generates a content brief immediately).

4. **Multi-Format Generation** — Select from 4 formats (blog, guide, X/Twitter, LinkedIn) and 2 style variants (casual/human, formal/polished). Content streams in real-time, driven by the user's voice profile injected as system context. Optional content direction field for specific angles.

5. **Content Repository** — Library of all generated content with search, format/style filters, favorite toggle, expand/collapse, and one-click copy.

## What I Chose Not to Build (and Why)

- **P1: Visual/Thumbnail Style Generator** — Would require image generation APIs (DALL-E, Midjourney) which add cost and complexity without demonstrating the core voice→content value prop.
- **P1: Smart Source Extraction** — Would need URL scraping / YouTube transcript APIs. Valuable feature but not essential for the core flow demo.
- **P2: Automated Source Monitoring** — Cron-based feature that requires production scheduling infrastructure. Out of scope for a weekend build.
- **P2: Podcast Transcript Generation** — Nice output format but the 4 existing formats already demonstrate meaningful format differentiation.
- **User Authentication** — Spec explicitly says V1 doesn't need auth. Schema supports it — just add a `user_id` FK to `voice_profiles` and projects.

## Tech Stack & Reasoning

| Choice | Reasoning |
|--------|-----------|
| **Next.js 15 (App Router)** | Full-stack in one deployable unit. API routes + SSR + static pages. Deploys to Vercel in seconds. |
| **TypeScript** | Non-negotiable for a production-quality codebase. |
| **Tailwind CSS** | Fastest way to implement a custom design system. The AI Natives palette (lime/forest/warm-white) maps directly to Tailwind custom colors. |
| **Framer Motion** | Smooth page transitions, wizard step animations, profile reveal, and chat message animations. Small bundle cost, big UX impact. |
| **Supabase (PostgreSQL)** | Managed Postgres with great DX, free tier, and built-in auth for when V1 needs to add it. Row-level security ready. |
| **OpenAI GPT-4o** | Best writing quality for voice analysis and content generation. Supports streaming. The voice profile analysis requires nuanced pattern recognition that GPT-4o handles well. |
| **Vercel AI SDK** | Clean streaming abstraction with `streamText` and `generateText`. Handles SSE/streaming without boilerplate. |

## AI Integration Depth

AI is woven into every core feature, not bolted on:

- **Voice Analysis** — GPT-4o analyzes writing samples to extract tone patterns, vocabulary tendencies, sentence structure, and personality markers. Returns structured JSON that becomes the editable profile.
- **Voice Profile Injection** — The profile is converted to natural language instructions and injected as system context for ALL generation. This means different profiles produce meaningfully different outputs.
- **Content Distillation** — The AI chat acts as a content strategist. In Guided mode, it asks sharpening questions ("What resonated about this?" "Who's the audience?"). In Automated mode, it synthesizes a content brief from raw materials.
- **Format-Aware Generation** — Each format has specific prompt instructions (LinkedIn's hook→short paragraphs→question CTA, X's 280-char constraint, blog's subheading structure). Combined with the voice profile, outputs are genuinely differentiated.

## Development Tools

- **Claude Code** — AI-assisted development for architecture planning, code generation, and debugging.
- **Next.js + Vercel** — Zero-config deployment pipeline.

## What I'd Build Next

1. **URL content extraction** — When a user pastes a link, automatically scrape and extract the article text.
2. **Voice note transcription** — Integrate Whisper API for audio-to-text in the workspace.
3. **Content versioning** — Track edits and regenerations, allow A/B comparison.
4. **Authentication + multi-tenancy** — Supabase Auth with RLS policies, multiple voice profiles per user.
5. **Content templates** — Pre-built templates for specific content types (case study, thought leadership, product launch).
6. **Analytics** — Track which generated pieces get published, engagement feedback loop.
