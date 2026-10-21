/**
 * schemas.js - Strict Zod schemas for input validation and model output verification
 *
 * Rules:
 * - Allowlisted enums only
 * - Bounded numbers (non-negative, integer counts)
 * - Length-capped text
 * - Strict rejection of unknown / rogue keys
 */

import { z } from "zod";
import { ALLOWED_PATCH_OPS } from "../../web/js/engine/patch.js";

// Safe text sanitizer preventing control characters
const safeText = (maxLen = 200) =>
  z.string()
    .max(maxLen)
    .transform((str) => str.replace(/[\x00-\x1F\x7F]/g, " ").trim());

export const EventTypeEnum = z.enum(["wedding", "birthday", "community"]);
export const CurrencyEnum = z.enum(["INR", "USD", "EUR", "GBP", "AED"]);
export const LanguageEnum = z.enum(["en", "hi", "hinglish"]);

// ============================================================================
// 1. Intake Schemas
// ============================================================================

export const intakeInputSchema = z.object({
  type: EventTypeEnum.optional(),
  title: safeText(100).optional(),
  date: safeText(50).optional(),
  city: safeText(100).optional(),
  countryCode: safeText(10).optional(),
  currency: CurrencyEnum.optional(),
  budget: z.number().nonnegative().optional(),
  guests: z.number().int().positive().optional(),
  mustHaves: safeText(500).optional(),
  language: LanguageEnum.default("en")
}).strict();

export const intakeOutputSchema = z.object({
  ready: z.boolean(),
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    whyNeeded: z.string(),
    options: z.array(z.string()).optional()
  })).max(4).optional(),
  feasibilityPreview: z.object({
    band: z.string(),
    ratio: z.number(),
    summary: z.string()
  }).optional()
});

// ============================================================================
// 2. Plan Schemas
// ============================================================================

export const planInputSchema = z.object({
  section: z.enum(["core", "vendors", "ideas"]),
  type: EventTypeEnum,
  title: safeText(100).optional(),
  date: safeText(50),
  city: safeText(100),
  countryCode: safeText(10).default("IN"),
  currency: CurrencyEnum.default("INR"),
  budget: z.number().nonnegative(),
  guests: z.number().int().positive(),
  mustHaves: safeText(500).optional(),
  language: LanguageEnum.default("en")
}).strict();

export const planCoreOutputSchema = z.object({
  section: z.literal("core"),
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number(),
    planned: z.number()
  })).min(3),
  milestones: z.array(z.object({
    id: z.string(),
    title: z.string(),
    weeksBefore: z.number(),
    dueDate: z.string(),
    tasks: z.array(z.object({
      id: z.string(),
      title: z.string(),
      due: z.string()
    })).min(1)
  })).min(3)
});

export const planVendorsOutputSchema = z.object({
  section: z.literal("vendors"),
  vendors: z.array(z.object({
    id: z.string(),
    category: z.string(),
    name: z.string(),
    bookBy: z.string(),
    lookFor: z.array(z.string()).min(1),
    askThem: z.array(z.string()).min(1)
  })).min(3)
});

export const planIdeasOutputSchema = z.object({
  section: z.literal("ideas"),
  ideas: z.array(z.object({
    id: z.string(),
    section: z.string(),
    title: z.string(),
    whyItFits: z.string()
  })).min(2)
});

// ============================================================================
// 3. Critique Schemas
// ============================================================================

export const critiqueInputSchema = z.object({
  plan: z.object({
    type: EventTypeEnum,
    date: safeText(50),
    city: safeText(100),
    currency: CurrencyEnum,
    budget: z.object({
      total: z.number().nonnegative(),
      categories: z.array(z.any())
    }),
    guests: z.object({
      target: z.number().int().positive()
    }),
    milestones: z.array(z.any()).optional()
  }),
  language: LanguageEnum.default("en")
}).strict();

export const critiqueOutputSchema = z.object({
  risks: z.array(z.object({
    severity: z.enum(["low", "medium", "high"]),
    title: z.string(),
    detail: z.string(),
    suggestedFix: z.string()
  })).max(8)
});

// ============================================================================
// 4. Assist / Chat & Patch Schemas
// ============================================================================

export const assistInputSchema = z.object({
  message: safeText(1000),
  plan: z.any(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: safeText(1000)
  })).max(20).optional(),
  language: LanguageEnum.default("en")
}).strict();

export const assistOutputSchema = z.object({
  reply: z.string(),
  patch: z.object({
    op: z.enum(ALLOWED_PATCH_OPS),
    categoryId: z.string().optional(),
    weight: z.number().optional(),
    amount: z.number().optional(),
    total: z.number().optional(),
    milestoneId: z.string().optional(),
    title: z.string().optional(),
    due: z.string().optional(),
    newDueDate: z.string().optional(),
    weeksBefore: z.number().optional(),
    taskId: z.string().optional(),
    ideaId: z.string().optional(),
    section: z.string().optional(),
    whyItFits: z.string().optional(),
    category: z.string().optional()
  }).optional()
});

// ============================================================================
// 5. Vendor Message Schemas
// ============================================================================

export const vendorMessageInputSchema = z.object({
  category: safeText(50),
  vendorName: safeText(100).optional(),
  eventType: EventTypeEnum.default("wedding"),
  eventDate: safeText(50),
  city: safeText(100),
  guestCount: z.number().int().positive().optional(),
  channel: z.enum(["whatsapp", "email"]).default("whatsapp"),
  specificQuestions: z.array(safeText(200)).max(10).optional(),
  language: LanguageEnum.default("en")
}).strict();

export const vendorMessageOutputSchema = z.object({
  channel: z.enum(["whatsapp", "email"]),
  subject: z.string().optional(),
  body: z.string()
});
