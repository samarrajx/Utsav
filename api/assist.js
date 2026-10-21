/**
 * /api/assist - Interactive AI planner assistant with verified patches
 *
 * Answers user questions, explains trade-offs, and when modifications are requested,
 * generates a strictly allowlisted patch that can be previewed as a diff.
 */

import { secureApiHandler } from "./_lib/security.js";
import { assistInputSchema, assistOutputSchema } from "./_lib/schemas.js";
import { callGeminiStructured } from "./_lib/gemini.js";
import { ALLOWED_PATCH_OPS } from "../web/js/engine/patch.js";

export default async function handler(req, res) {
  return secureApiHandler(req, res, {
    schema: assistInputSchema,
    handler: async (data) => {
      const { message, plan, history = [], language = "en" } = data;

      const systemInstruction = `You are the AI Event Assistant at Utsav.
You help the host refine their celebration plan, answer questions, and adjust budgets, tasks, milestones, and ideas.

CRITICAL PATCH DIRECTIVES:
When the user requests an adjustment to their plan, you MUST emit an optional "patch" object using ONLY the following operations:
- set_category_weight: { op: "set_category_weight", categoryId: "venue|catering|decor|photography|attire|entertainment", weight: number }
- set_category_planned: { op: "set_category_planned", categoryId: string, amount: number }
- add_task: { op: "add_task", milestoneId?: string, title: string, due?: string }
- remove_task: { op: "remove_task", taskId: string }
- move_milestone: { op: "move_milestone", milestoneId: string, newDueDate: "YYYY-MM-DD" }
- add_milestone: { op: "add_milestone", title: string, weeksBefore: number }
- add_idea: { op: "add_idea", section: string, title: string, whyItFits: string }
- remove_idea: { op: "remove_idea", ideaId: string }
- add_vendor_category: { op: "add_vendor_category", category: string }
- set_budget_total: { op: "set_budget_total", total: number } (ONLY if user explicitly asks to change total budget!)

If the user is asking a general question without requesting a plan change, omit the "patch" property entirely.
Language: ${language}.

Format your response strictly as JSON conforming to:
{
  "reply": "Clear, friendly, and practical answer explaining your recommendation",
  "patch": { ... } // optional
}`;

      const aiResponse = await callGeminiStructured({
        systemInstruction,
        data: {
          userMessage: message,
          conversationHistory: history,
          currentPlan: plan,
          allowedPatchOps: ALLOWED_PATCH_OPS,
          language
        },
        prompt: "Respond to the user. Include a verified patch if a plan change was requested.",
        responseSchema: assistOutputSchema,
        maxOutputTokens: 1024
      });

      return aiResponse;
    }
  });
}
