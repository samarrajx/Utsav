/**
 * /api/vendor-message - AI vendor outreach message generator
 *
 * Generates ready-to-send, professional WhatsApp or Email inquiries
 * complete with event dates, location, guest headcounts, and vetting questions.
 */

import { secureApiHandler } from "./_lib/security.js";
import { vendorMessageInputSchema, vendorMessageOutputSchema } from "./_lib/schemas.js";
import { callGeminiStructured } from "./_lib/gemini.js";

export default async function handler(req, res) {
  return secureApiHandler(req, res, {
    schema: vendorMessageInputSchema,
    handler: async (data) => {
      const {
        category,
        vendorName = "Vendor",
        eventType,
        eventDate,
        city,
        guestCount = 100,
        channel = "whatsapp",
        specificQuestions = [],
        language = "en"
      } = data;

      const systemInstruction = `You are an expert event manager at Utsav.
Draft a polite, professional, and clear initial inquiry message to a vendor for a ${eventType}.
Channel: ${channel} (if email, provide a catchy subject line; if WhatsApp, keep it concise, polite, with clear bullet points).
Vendor Category: ${category}.
Vendor Name: ${vendorName}.
Event Date: ${eventDate}.
City: ${city}.
Expected Guests: ~${guestCount}.
Specific Questions to Include: ${specificQuestions.length > 0 ? specificQuestions.join(", ") : "Availability, initial pricing quote, and portfolio link"}.
Language: ${language}.

Format your response strictly as JSON conforming to:
{
  "channel": "${channel}",
  "subject": "Subject line here (required for email, optional for whatsapp)",
  "body": "Formatted message text ready to copy-paste"
}`;

      const aiResponse = await callGeminiStructured({
        systemInstruction,
        data: {
          category,
          vendorName,
          eventType,
          eventDate,
          city,
          guestCount,
          channel,
          specificQuestions,
          language
        },
        prompt: `Draft a high-conversion inquiry for ${channel}.`,
        responseSchema: vendorMessageOutputSchema
      });

      return aiResponse;
    }
  });
}
