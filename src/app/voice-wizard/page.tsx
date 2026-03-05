"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  FileText,
  SlidersHorizontal,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Upload,
  File,
  Pencil,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceProfile, WizardData, WizardSample } from "@/lib/types";

const TONE_OPTIONS = [
  "Conversational",
  "Direct",
  "Warm",
  "Authoritative",
  "Witty",
  "Analytical",
  "Inspirational",
  "Provocative",
  "Empathetic",
  "Bold",
];

const steps = [
  { id: "welcome", icon: Mic, label: "Welcome" },
  { id: "samples", icon: FileText, label: "Writing Samples" },
  { id: "preferences", icon: SlidersHorizontal, label: "Style" },
  { id: "analyzing", icon: Loader2, label: "Analyzing" },
  { id: "reveal", icon: Sparkles, label: "Your Voice" },
];

export default function VoiceWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({
    samples: [{ content: "", type: "writing" }],
    formality: 5,
    tonePreferences: [],
    sentenceLength: "medium",
    audienceType: "",
    industryContext: "",
  });
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [profileName, setProfileName] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (text.trim().length > 0) {
          const isTranscript = file.name.toLowerCase().includes("transcript") ||
            file.name.toLowerCase().includes("meeting") ||
            file.name.toLowerCase().includes("call");
          const newSample: WizardSample = {
            content: text,
            type: isTranscript ? "transcript" : "upload",
            fileName: file.name,
          };
          setWizardData((prev) => ({
            ...prev,
            samples: [...prev.samples, newSample],
          }));
        }
      };
      reader.readAsText(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "text/csv": [".csv"],
    },
    multiple: true,
  });

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true;
      case 1:
        return wizardData.samples.some((s) => s.content.trim().length > 50);
      case 2:
        return wizardData.tonePreferences.length >= 2 && wizardData.audienceType.trim().length > 0;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 2) {
      setCurrentStep(3);
      await analyzeVoice();
    } else if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const analyzeVoice = async () => {
    setError(null);
    try {
      const validSamples = wizardData.samples
        .filter((s) => s.content.trim().length > 0)
        .map((s) => ({ content: s.content, type: s.type }));

      const res = await fetch("/api/voice/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          samples: validSamples,
          formality: wizardData.formality,
          tonePreferences: wizardData.tonePreferences,
          sentenceLength: wizardData.sentenceLength,
          audienceType: wizardData.audienceType,
          industryContext: wizardData.industryContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setProfile(data.profile);
      setProfileName(data.profile.name || "My Voice");
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCurrentStep(2);
    }
  };

  const toggleTone = (tone: string) => {
    setWizardData((prev) => ({
      ...prev,
      tonePreferences: prev.tonePreferences.includes(tone)
        ? prev.tonePreferences.filter((t) => t !== tone)
        : [...prev.tonePreferences, tone],
    }));
  };

  const removeSample = (index: number) => {
    setWizardData((prev) => ({
      ...prev,
      samples: prev.samples.filter((_, j) => j !== index),
    }));
  };

  const updateSampleContent = (index: number, content: string) => {
    setWizardData((prev) => {
      const newSamples = [...prev.samples];
      newSamples[index] = { ...newSamples[index], content };
      return { ...prev, samples: newSamples };
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="border-b border-forest-mid px-8 py-4">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex items-center gap-2 text-xs font-medium transition-colors",
                  i <= currentStep ? "text-lime" : "text-dark-gray"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center border transition-colors",
                    i < currentStep
                      ? "bg-lime border-lime text-forest"
                      : i === currentStep
                        ? "border-lime text-lime"
                        : "border-forest-mid text-dark-gray"
                  )}
                >
                  <step.icon className={cn("h-3.5 w-3.5", i === 3 && currentStep === 3 && "animate-spin")} />
                </div>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px transition-colors",
                    i < currentStep ? "bg-lime" : "bg-forest-mid"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            {/* Step 0: Welcome */}
            {currentStep === 0 && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-lime/10 flex items-center justify-center mx-auto mb-6">
                  <Mic className="h-8 w-8 text-lime" />
                </div>
                <h1 className="font-display text-4xl font-bold text-warm-white mb-4">
                  Let&apos;s capture your voice
                </h1>
                <p className="text-mid-gray text-lg mb-2 max-w-md mx-auto">
                  We&apos;re going to learn how you write and think — so every piece of
                  content sounds authentically like you.
                </p>
                <p className="text-dark-gray text-sm mb-8 max-w-md mx-auto">
                  This takes about 3 minutes. You&apos;ll share some writing samples,
                  tell us about your style, and we&apos;ll build your voice profile.
                </p>
              </div>
            )}

            {/* Step 1: Writing Samples + File Upload */}
            {currentStep === 1 && (
              <div>
                <h2 className="font-display text-2xl font-bold text-warm-white mb-2">
                  Share your writing
                </h2>
                <p className="text-mid-gray mb-6">
                  Paste writing samples, or upload meeting transcripts and documents.
                  The more material, the more accurate your voice profile.
                </p>

                {/* File Upload Zone */}
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-6",
                    isDragActive
                      ? "border-lime bg-lime/5"
                      : "border-forest-mid hover:border-dark-gray"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className={cn("h-8 w-8 mx-auto mb-3", isDragActive ? "text-lime" : "text-dark-gray")} />
                  <p className="text-sm text-mid-gray mb-1">
                    {isDragActive
                      ? "Drop files here..."
                      : "Drag & drop files, or click to browse"}
                  </p>
                  <p className="text-xs text-dark-gray">
                    .txt, .md files — meeting transcripts, blog drafts, emails, notes
                  </p>
                </div>

                {/* Uploaded file badges */}
                {wizardData.samples.some((s) => s.fileName) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {wizardData.samples
                      .map((s, i) => ({ ...s, index: i }))
                      .filter((s) => s.fileName)
                      .map((s) => (
                        <div
                          key={s.index}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-forest-light border border-forest-mid"
                        >
                          <File className="h-3.5 w-3.5 text-lime" />
                          <span className="text-xs text-warm-white">{s.fileName}</span>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            s.type === "transcript" ? "bg-lime/10 text-lime" : "bg-forest-mid text-mid-gray"
                          )}>
                            {s.type === "transcript" ? "transcript" : "document"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSample(s.index);
                            }}
                            className="text-dark-gray hover:text-warm-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                {/* Manual text areas */}
                <div className="space-y-4">
                  {wizardData.samples
                    .map((sample, i) => ({ ...sample, index: i }))
                    .filter((s) => !s.fileName)
                    .map((sample) => (
                      <div key={sample.index} className="relative">
                        <textarea
                          value={sample.content}
                          onChange={(e) => updateSampleContent(sample.index, e.target.value)}
                          placeholder={`Writing sample — paste a LinkedIn post, blog paragraph, email, or anything you've written...`}
                          className="w-full h-36 bg-forest-light border border-forest-mid rounded-lg p-4 text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none resize-none font-body text-sm"
                        />
                        {wizardData.samples.filter((s) => !s.fileName).length > 1 && (
                          <button
                            onClick={() => removeSample(sample.index)}
                            className="absolute top-2 right-2 p-1 text-dark-gray hover:text-warm-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  {wizardData.samples.length < 8 && (
                    <button
                      onClick={() =>
                        setWizardData((prev) => ({
                          ...prev,
                          samples: [...prev.samples, { content: "", type: "writing" }],
                        }))
                      }
                      className="flex items-center gap-2 text-sm text-lime hover:text-lime-light transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Add another sample
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Style Preferences */}
            {currentStep === 2 && (
              <div>
                <h2 className="font-display text-2xl font-bold text-warm-white mb-2">
                  Your style preferences
                </h2>
                <p className="text-mid-gray mb-6">
                  Help us understand how you like to communicate.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Formality Slider */}
                <div className="mb-8">
                  <label className="text-sm font-medium text-warm-white mb-3 block">
                    Formality Level
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-mid-gray w-16">Casual</span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={wizardData.formality}
                      onChange={(e) =>
                        setWizardData((prev) => ({
                          ...prev,
                          formality: parseInt(e.target.value),
                        }))
                      }
                      className="flex-1 accent-lime"
                    />
                    <span className="text-xs text-mid-gray w-16 text-right">Formal</span>
                  </div>
                  <p className="text-center text-lime text-sm mt-1">
                    {wizardData.formality}/10
                  </p>
                </div>

                {/* Tone Selection */}
                <div className="mb-8">
                  <label className="text-sm font-medium text-warm-white mb-3 block">
                    Pick 2-4 words that describe your tone
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map((tone) => (
                      <button
                        key={tone}
                        onClick={() => toggleTone(tone)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                          wizardData.tonePreferences.includes(tone)
                            ? "bg-lime/20 border-lime text-lime"
                            : "border-forest-mid text-mid-gray hover:border-dark-gray"
                        )}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sentence Length */}
                <div className="mb-8">
                  <label className="text-sm font-medium text-warm-white mb-3 block">
                    How do you tend to write?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["short", "medium", "long"] as const).map((len) => (
                      <button
                        key={len}
                        onClick={() =>
                          setWizardData((prev) => ({ ...prev, sentenceLength: len }))
                        }
                        className={cn(
                          "p-3 rounded-lg border text-sm transition-all text-center",
                          wizardData.sentenceLength === len
                            ? "bg-lime/10 border-lime text-lime"
                            : "border-forest-mid text-mid-gray hover:border-dark-gray"
                        )}
                      >
                        <div className="font-medium capitalize mb-1">{len}</div>
                        <div className="text-xs text-dark-gray">
                          {len === "short"
                            ? "Punchy. Gets to the point."
                            : len === "medium"
                              ? "Balanced mix of lengths."
                              : "Detailed, flowing sentences."}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audience & Industry */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-warm-white mb-2 block">
                      Who do you write for?
                    </label>
                    <input
                      value={wizardData.audienceType}
                      onChange={(e) =>
                        setWizardData((prev) => ({
                          ...prev,
                          audienceType: e.target.value,
                        }))
                      }
                      placeholder="e.g., Marketing leaders, founders"
                      className="w-full bg-forest-light border border-forest-mid rounded-lg p-3 text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-warm-white mb-2 block">
                      Your industry / domain
                    </label>
                    <input
                      value={wizardData.industryContext}
                      onChange={(e) =>
                        setWizardData((prev) => ({
                          ...prev,
                          industryContext: e.target.value,
                        }))
                      }
                      placeholder="e.g., SaaS, consulting, AI"
                      className="w-full bg-forest-light border border-forest-mid rounded-lg p-3 text-warm-white placeholder:text-dark-gray focus:border-lime focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Analyzing */}
            {currentStep === 3 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-lime/10 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="h-10 w-10 text-lime animate-spin" />
                </div>
                <h2 className="font-display text-2xl font-bold text-warm-white mb-3">
                  Analyzing your voice...
                </h2>
                <p className="text-mid-gray max-w-md mx-auto">
                  Reading your writing samples, detecting patterns in your tone,
                  rhythm, and word choice. Building your unique voice profile.
                </p>
                <div className="mt-8 flex justify-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-lime"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Profile Reveal */}
            {currentStep === 4 && profile && (
              <div>
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-16 h-16 rounded-2xl bg-lime/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <Sparkles className="h-8 w-8 text-lime" />
                  </motion.div>
                  <h2 className="font-display text-3xl font-bold text-warm-white mb-2">
                    Your voice, captured
                  </h2>
                  <p className="text-mid-gray">
                    Here&apos;s what we learned. You can fine-tune this anytime.
                  </p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-forest-light border border-forest-mid rounded-xl p-6 space-y-6"
                >
                  {/* Voice Name — editable */}
                  <div className="text-center">
                    {editingName ? (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setEditingName(false);
                              if (profile && profileName.trim()) {
                                fetch("/api/voice/profile", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: profile.id, name: profileName.trim() }),
                                });
                                setProfile({ ...profile, name: profileName.trim() });
                              }
                            }
                          }}
                          autoFocus
                          className="bg-transparent border-b-2 border-lime text-center font-display text-xl font-bold text-lime focus:outline-none w-64"
                        />
                        <button
                          onClick={() => {
                            setEditingName(false);
                            if (profile && profileName.trim()) {
                              fetch("/api/voice/profile", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: profile.id, name: profileName.trim() }),
                              });
                              setProfile({ ...profile, name: profileName.trim() });
                            }
                          }}
                          className="p-1 text-lime hover:text-lime-light"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingName(true)}
                        className="group flex items-center justify-center gap-2 mx-auto"
                      >
                        <h3 className="font-display text-xl font-bold text-lime">
                          {profileName}
                        </h3>
                        <Pencil className="h-3.5 w-3.5 text-dark-gray opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                    <p className="text-xs text-dark-gray mt-1">Click to rename</p>
                  </div>

                  {/* Tone */}
                  <div>
                    <h3 className="text-xs font-mono text-dark-gray uppercase tracking-wider mb-2">
                      Tone
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.tone?.map((t: string) => (
                        <span
                          key={t}
                          className="px-3 py-1 rounded-full bg-lime/10 text-lime text-sm font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Formality */}
                  <div>
                    <h3 className="text-xs font-mono text-dark-gray uppercase tracking-wider mb-2">
                      Formality
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-forest-mid rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-lime rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(profile.formality_level / 10) * 100}%` }}
                          transition={{ delay: 0.6, duration: 0.8 }}
                        />
                      </div>
                      <span className="text-lime text-sm font-mono">
                        {profile.formality_level}/10
                      </span>
                    </div>
                  </div>

                  {/* Phrases */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-xs font-mono text-dark-gray uppercase tracking-wider mb-2">
                        You say
                      </h3>
                      <div className="space-y-1">
                        {profile.phrases_used?.slice(0, 5).map((p: string, i: number) => (
                          <p key={i} className="text-sm text-lime-light font-mono">
                            &ldquo;{p}&rdquo;
                          </p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-mono text-dark-gray uppercase tracking-wider mb-2">
                        You avoid
                      </h3>
                      <div className="space-y-1">
                        {profile.phrases_avoided?.slice(0, 5).map((p: string, i: number) => (
                          <p key={i} className="text-sm text-mid-gray font-mono line-through">
                            &ldquo;{p}&rdquo;
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Personality */}
                  <div>
                    <h3 className="text-xs font-mono text-dark-gray uppercase tracking-wider mb-2">
                      Personality markers
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.personality_markers?.map((m: string, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full border border-forest-mid text-warm-white text-sm"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Raw Analysis */}
                  {profile.raw_analysis && (
                    <div>
                      <h3 className="text-xs font-mono text-dark-gray uppercase tracking-wider mb-2">
                        Voice Blueprint
                      </h3>
                      <p className="text-sm text-mid-gray leading-relaxed whitespace-pre-line">
                        {profile.raw_analysis}
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="border-t border-forest-mid px-8 py-4">
        <div className="max-w-2xl mx-auto flex justify-between">
          {currentStep > 0 && currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="flex items-center gap-2 px-4 py-2 text-mid-gray hover:text-warm-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all",
                canProceed()
                  ? "bg-lime text-forest hover:bg-lime-dark"
                  : "bg-forest-mid text-dark-gray cursor-not-allowed"
              )}
            >
              {currentStep === 2 ? "Analyze My Voice" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {currentStep === 4 && (
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-lime text-forest font-medium hover:bg-lime-dark transition-colors ml-auto"
            >
              View Full Profile
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
