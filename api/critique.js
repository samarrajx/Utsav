/**
 * /api/critique - Independent plan auditor and critic endpoint
 *
 * Second model pass auditing a generated celebration plan for risks,
 * seasonal constraints, timeline bottlenecks, and budget allocation gaps.
 */

import { secureApiHandler } from "./_lib/security.js";
import { critiqueInputSchema, critiqueOutputSchema } from "./_lib/schemas.js";
import { callGeminiStructured } from "./_lib/gemini.js";
import { checkFeasibility } from "../web/js/engine/index.js";

export default async function handler(req, res) {
  return secureApiHandler(req, res, {
    schema: critiqueInputSchema,
    handler: async (data) => {
      const { plan, language = "en" } = data;

      // Ground critique with feasibility engine calculation
      const feasibility = checkFeasibility({
        type: plan.type,
        budget: plan.budget.total,
        currency: plan.currency,
        guests: plan.guests.target,
        city: plan.city,
        date: plan.date
      });

      const systemInstruction = `You are the chief event risk auditor at Utsav.
Review this celebration plan objectively. Look for hidden bottlenecks:
1. Feasibility: Engine band is "${feasibility.band}" (${feasibility.summary}).
2. Timeline: Are milestones realistic given the event date (${plan.date})?
3. Seasonal / Weather: Are there rain, extreme heat, or peak-season vendor supply challenges in ${plan.city}?
4. Category Allocation: Are any vital categories missing or underfunded?

Language: ${language}.
Format your response strictly as JSON conforming to:
{
  "risks": [
    {
      "severity": "low" | "medium" | "high",
      "title": "string",
      "detail": "string",
      "suggestedFix": "string"
    }
  ]
}`;

      const aiResponse = await callGeminiStructured({
        systemInstruction,
        data: {
          plan,
          feasibilityBand: feasibility.band,
          feasibilitySummary: feasibility.summary,
          language
        },
        prompt: "Audit this plan and provide actionable risk warnings with suggested fixes.",
        responseSchema: critiqueOutputSchema
      });

      return aiResponse;
    }
  });
}
