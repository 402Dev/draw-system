// Starter templates. Placeholder IDs are remapped on workspace creation.

const E = (id, label, iconName, x, y, opts = {}) => ({
  id,
  type: "iconNode",
  position: { x, y },
  data: {
    label,
    iconName,
    description: opts.desc || "",
    status: opts.status || null,
    tags: opts.tags || "",
    link: "",
  },
});

const G = (id, label, x, y, w, h, fill, border) => ({
  id,
  type: "groupNode",
  position: { x, y },
  data: {
    label,
    fill: fill || "rgba(99,102,241,0.08)",
    border: border || "#6366f1",
  },
  style: { width: w, height: h },
});

const S = (id, text, x, y) => ({
  id,
  type: "stickyNote",
  position: { x, y },
  data: { text },
});

const C = (id, label, x, y, rows) => ({
  id,
  type: "cardNode",
  position: { x, y },
  data: { label, rows: rows || [] },
});

const IX = (id, src, tgt, opts = {}) => ({
  id,
  source: src,
  target: tgt,
  data: {
    isBidirectional: opts.bi || false,
    natureOfInteraction: opts.nature || "",
  },
});

// ── Study App Demo ─────────────────────────────────────────────────────────
const studyAppElements = [
  // Group boxes first so they render behind everything else
  G(
    "g-learning",
    "Core Learning Engine",
    295,
    345,
    490,
    245,
    "rgba(99,102,241,0.07)",
    "#6366f1",
  ),
  G(
    "g-data",
    "Data Layer",
    960,
    445,
    310,
    180,
    "rgba(20,184,166,0.07)",
    "#14b8a6",
  ),

  // Auth & identity
  E("auth", "Auth Service", "Lock", 80, 60, {
    status: "active",
    tags: "auth,backend",
    desc: "Handles sign-up, sign-in, and session management using JWT tokens. Validates identity before granting dashboard access.",
  }),

  // The learner
  E("student", "Learner", "User", 80, 270, {
    status: "active",
    tags: "frontend",
    desc: "The end user. Opens the dashboard to study, take quizzes, and review flashcards on a daily schedule.",
  }),

  // Progress
  E("progress", "Progress Tracker", "TrendingUp", 80, 510, {
    status: "active",
    tags: "backend",
    desc: "Aggregates quiz scores, streak data, and completion rates. Feeds the dashboard summary and triggers reminder events.",
  }),

  // Dashboard
  E("dashboard", "Learning Dashboard", "Layout", 370, 110, {
    status: "active",
    tags: "frontend,backend",
    desc: "Central hub. Displays due reviews, course progress, AI recommendations, and activity streaks. Entry point for all learning flows.",
  }),

  // Core Learning Engine group members
  E("quiz", "Quiz Engine", "HelpCircle", 325, 415, {
    status: "active",
    tags: "backend",
    desc: "Serves adaptive multiple-choice and free-text questions. Adjusts difficulty based on learner performance history.",
  }),
  E("spaced", "Spaced Repetition", "RefreshCw", 510, 415, {
    status: "active",
    tags: "ai",
    desc: "SM-2 algorithm. Calculates next review interval from recall quality (0–5 rating). Surfaces due cards to the dashboard daily.",
  }),
  E("flashcard", "Flashcard System", "BookOpen", 695, 415, {
    status: "active",
    tags: "backend",
    desc: "Manages card decks organised by topic and difficulty. Reports recall quality to Spaced Repetition after each review.",
  }),

  // AI Tutor
  E("ai", "AI Tutor", "Cpu", 790, 80, {
    status: "planned",
    tags: "ai",
    desc: "LLM-powered assistant. Generates hints, explanations, and custom practice questions on demand. Currently in beta — falls back to static hint library if quota exceeded.",
  }),

  // Notifications
  E("notif", "Notification Service", "Bell", 1060, 70, {
    status: "planned",
    tags: "backend",
    desc: "Delivers push and email reminders when reviews are due or a study streak is at risk of breaking.",
  }),

  // Content Library
  E("content", "Content Library", "Archive", 1060, 260, {
    status: "active",
    tags: "storage",
    desc: "Single source of truth for all courses, modules, question banks, and flashcard decks. Consumed by Quiz Engine, Flashcard System, and AI Tutor.",
  }),

  // Data Layer group members
  E("userdb", "User DB", "Database", 985, 500, {
    status: "active",
    tags: "storage",
    desc: "Stores learner profiles, XP totals, streaks, and session history.",
  }),
  E("coursedb", "Course DB", "Database", 1145, 500, {
    status: "active",
    tags: "storage",
    desc: "Stores course metadata, module structure, and versioned content.",
  }),

  // Schema Cards
  C("sc-user", "User Profile", 1380, 80, [
    { key: "id", value: "uuid" },
    { key: "name", value: "string" },
    { key: "email", value: "string" },
    { key: "xp", value: "number" },
    { key: "level", value: "number" },
    { key: "streak", value: "number" },
    { key: "joined", value: "date" },
  ]),
  C("sc-course", "Course", 1380, 370, [
    { key: "courseId", value: "uuid" },
    { key: "title", value: "string" },
    { key: "modules", value: "array" },
    { key: "difficulty", value: "easy | medium | hard" },
    { key: "tags", value: "string[]" },
  ]),

  // Sticky notes
  S(
    "note1",
    "💡 Spaced repetition (SM-2) improves long-term retention by ~200% compared to passive re-reading alone.",
    310,
    645,
  ),
  S(
    "note2",
    "⚠️ AI Tutor is in beta — if OpenAI quota is exceeded, fall back to the static hint library stored in Content Library.",
    770,
    590,
  ),
];

const studyAppInteractions = [
  IX("ix1", "student", "dashboard", { nature: "navigates to" }),
  IX("ix2", "student", "auth", { nature: "authenticates via" }),
  IX("ix3", "auth", "dashboard", { nature: "issues session token to" }),
  IX("ix4", "dashboard", "quiz", { nature: "launches quiz in" }),
  IX("ix5", "dashboard", "flashcard", { nature: "opens flashcard deck in" }),
  IX("ix6", "dashboard", "ai", { nature: "queries hints from" }),
  IX("ix7", "dashboard", "progress", {
    bi: true,
    nature: "reads & writes learning progress",
  }),
  IX("ix8", "quiz", "spaced", { nature: "reports recall score to" }),
  IX("ix9", "flashcard", "spaced", { nature: "reports recall score to" }),
  IX("ix10", "spaced", "dashboard", { nature: "schedules due reviews for" }),
  IX("ix11", "ai", "content", { nature: "fetches study material from" }),
  IX("ix12", "content", "quiz", { nature: "supplies question bank to" }),
  IX("ix13", "content", "flashcard", { nature: "supplies flashcard decks to" }),
  IX("ix14", "progress", "notif", { nature: "triggers study reminders via" }),
  IX("ix15", "dashboard", "userdb", { nature: "reads / writes learner state" }),
  IX("ix16", "content", "coursedb", { nature: "persists course data to" }),
];

export const TEMPLATES = [
  {
    id: "blank",
    label: "Blank Canvas",
    description: "Start from scratch with an empty canvas.",
    elements: [],
    interactions: [],
  },
  {
    id: "study-app",
    label: "Study App Demo",
    description:
      "Adaptive learning platform — showcases all node types, statuses, tags, schema cards, and interactions.",
    elements: studyAppElements,
    interactions: studyAppInteractions,
  },
];
