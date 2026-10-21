/**
 * assistant.js - Interactive AI Event Assistant with verified patch diffs & undo
 *
 * Provides real-time chat, suggestion chips, plan modification patch diffs,
 * safe application via patch.js, and multi-level undo.
 */

import { el, icon } from "../dom.js";
import { fetchAssist } from "../api.js";
import { applyPatch, deepClone } from "../engine/patch.js";

// Session undo stack
const undoStack = [];

/**
 * Render the interactive AI Event Assistant widget
 *
 * @param {Object} event - Active event plan
 * @param {Object} options
 * @param {Function} options.onUpdate - Callback when plan is updated
 * @param {Function} [options.announce] - Screen reader live announcer
 * @returns {HTMLElement}
 */
export function renderAssistantWidget(event, { onUpdate, announce }) {
  const container = el("div", { className: "assistant-widget-container card" });

  // Initial messages
  const messages = [
    {
      role: "assistant",
      text: `Namaste! I'm your AI Celebration Assistant for "${event.title}". Ask me to adjust your budget, suggest creative traditions, or draft vendor inquiries.`
    }
  ];

  let isThinking = false;
  let activePatch = null;
  let activeDiff = null;

  function renderView() {
    container.replaceChildren();

    // 1. Header
    const header = el("div", { className: "assistant-header" }, [
      el("div", { className: "assistant-title-wrap" }, [
        icon("sparkles", "assistant-sparkle-icon"),
        el("h3", { className: "assistant-title" }, "AI Event Assistant")
      ]),
      el("span", { className: `assistant-status-pill ${isThinking ? "is-thinking" : "is-ready"}` },
        isThinking ? "Thinking..." : "Ready"
      )
    ]);

    // 2. Chat messages transcript
    const transcript = el("div", {
      className: "assistant-transcript",
      role: "log",
      "aria-label": "Assistant conversation history",
      "aria-live": "polite"
    }, messages.map((msg) => {
      const isUser = msg.role === "user";
      return el("div", { className: `chat-bubble-wrap ${isUser ? "is-user" : "is-assistant"}` }, [
        el("div", { className: `chat-bubble ${isUser ? "user-bubble" : "assistant-bubble"}` }, [
          el("p", { className: "chat-text" }, msg.text)
        ])
      ]);
    }));

    // Loading indicator if thinking
    if (isThinking) {
      transcript.appendChild(
        el("div", { className: "chat-bubble-wrap is-assistant" }, [
          el("div", { className: "chat-bubble assistant-bubble is-loading" }, [
            el("div", { className: "typing-indicator" }, [
              el("span", { className: "dot" }),
              el("span", { className: "dot" }),
              el("span", { className: "dot" })
            ])
          ])
        ])
      );
    }

    // 3. Patch Diff Card (if a patch was proposed and not yet resolved)
    let patchCard = null;
    if (activePatch && activeDiff) {
      patchCard = el("div", { className: "patch-diff-card" }, [
        el("div", { className: "patch-diff-header" }, [
          icon("checklist", "patch-icon"),
          el("h4", { className: "patch-title" }, "Proposed Plan Modification")
        ]),
        el("p", { className: "patch-summary-text" }, activeDiff.summary),
        el("div", { className: "patch-actions-row" }, [
          el("button", {
            type: "button",
            className: "btn btn-primary btn-sm btn-accept-patch",
            onClick: () => {
              try {
                // Save snapshot for undo
                undoStack.push(deepClone(event));

                // Apply patch through verified engine
                const result = applyPatch(event, activePatch);
                Object.assign(event, result.plan);

                const summaryText = activeDiff.summary;
                activePatch = null;
                activeDiff = null;

                onUpdate(event);
                renderView();
                announce?.(`Plan updated: ${summaryText}. Undo is available.`);
              } catch (err) {
                alert(`Could not apply patch: ${err.message}`);
              }
            }
          }, [icon("check"), "Accept & Apply"]),
          el("button", {
            type: "button",
            className: "btn btn-secondary btn-sm btn-discard-patch",
            onClick: () => {
              activePatch = null;
              activeDiff = null;
              renderView();
              announce?.("Proposed changes discarded.");
            }
          }, "Discard")
        ])
      ]);
    }

    // 4. Undo notification banner (if undo stack has snapshots)
    let undoBanner = null;
    if (undoStack.length > 0) {
      undoBanner = el("div", { className: "undo-toast-banner" }, [
        el("span", { className: "undo-label" }, "Plan modification active."),
        el("button", {
          type: "button",
          className: "btn-text-link btn-undo-action",
          onClick: () => {
            const previous = undoStack.pop();
            if (previous) {
              Object.assign(event, previous);
              onUpdate(event);
              renderView();
              announce?.("Previous plan version restored.");
            }
          }
        }, "Undo Change")
      ]);
    }

    // 5. Quick Suggestion Prompt Chips
    const promptChips = el("div", { className: "assistant-prompt-chips", "aria-label": "Suggested questions" }, [
      createPromptChip("💡 \"Suggest creative entry ideas\"", "Suggest 3 creative and memorable entry ideas for our celebration."),
      createPromptChip("💰 \"Make catering 10% cheaper\"", "Make catering 10% cheaper and reallocate to venue and decor."),
      createPromptChip("⚠️ \"Audit timeline risks\"", "What are the biggest risks or timeline bottlenecks in our plan right now?"),
      createPromptChip("📋 \"Add sangeet choreography task\"", "Add a task: Book sangeet choreographer under the 8-week milestone.")
    ]);

    function createPromptChip(label, queryText) {
      return el("button", {
        type: "button",
        className: "prompt-chip",
        disabled: isThinking,
        onClick: () => handleSendMessage(queryText)
      }, label);
    }

    // 6. Input Form
    const inputForm = el("form", {
      className: "assistant-input-form",
      onSubmit: (e) => {
        e.preventDefault();
        const input = inputForm.querySelector(".assistant-input");
        const query = input.value.trim();
        if (query) {
          input.value = "";
          handleSendMessage(query);
        }
      }
    }, [
      el("input", {
        type: "text",
        className: "form-input assistant-input",
        placeholder: "Ask assistant or adjust plan...",
        disabled: isThinking,
        "aria-label": "Message AI assistant"
      }),
      el("button", {
        type: "submit",
        className: "btn btn-primary btn-send-assistant",
        disabled: isThinking,
        "aria-label": "Send message"
      }, [icon("arrowRight")])
    ]);

    container.append(header, transcript);
    if (patchCard) container.appendChild(patchCard);
    if (undoBanner) container.appendChild(undoBanner);
    container.append(promptChips, inputForm);

    // Scroll transcript to bottom
    setTimeout(() => {
      transcript.scrollTop = transcript.scrollHeight;
    }, 50);
  }

  async function handleSendMessage(queryText) {
    if (isThinking || !queryText) return;

    // Append user message
    messages.push({ role: "user", text: queryText });
    isThinking = true;
    renderView();

    try {
      const res = await fetchAssist({
        message: queryText,
        plan: event,
        history: messages.slice(-4),
        language: event.language || "en"
      });

      if (res.ok && res.data) {
        const { reply, patch } = res.data;
        messages.push({ role: "assistant", text: reply || "I've reviewed your request." });

        if (patch && typeof patch === "object" && patch.op) {
          try {
            // Test patch on clone to calculate exact diff
            const testResult = applyPatch(deepClone(event), patch);
            activePatch = patch;
            activeDiff = testResult.diff;
          } catch (patchErr) {
            console.warn("[Patch Warning] Model suggested invalid patch:", patchErr);
          }
        }
      } else {
        // Fallback deterministic handling if API unavailable
        handleOfflineFallbackReply(queryText);
      }
    } catch {
      handleOfflineFallbackReply(queryText);
    } finally {
      isThinking = false;
      renderView();
    }
  }

  function handleOfflineFallbackReply(queryText) {
    const lower = queryText.toLowerCase();

    if (lower.includes("catering") && (lower.includes("cheaper") || lower.includes("reduce"))) {
      // Offline fallback: reduce catering weight by 2%
      const patch = { op: "set_category_weight", categoryId: "catering", weight: Math.max(10, ((event.budget?.categories?.find((c) => c.id === "catering")?.weight || 26) - 3)) };
      const testResult = applyPatch(deepClone(event), patch);
      activePatch = patch;
      activeDiff = testResult.diff;
      messages.push({
        role: "assistant",
        text: "I've generated an adjustment to trim your catering budget allocation and rebalance other categories evenly."
      });
    } else if (lower.includes("task") || lower.includes("choreographer")) {
      const patch = { op: "add_task", title: "Book Sangeet Choreographer & Rehearsals", due: event.date };
      const testResult = applyPatch(deepClone(event), patch);
      activePatch = patch;
      activeDiff = testResult.diff;
      messages.push({
        role: "assistant",
        text: "I've prepared a new milestone task for booking your sangeet choreographer."
      });
    } else if (lower.includes("entry") || lower.includes("idea")) {
      const patch = {
        op: "add_idea",
        section: "entertainment",
        title: "Cold Pyrotechnic Walkway Entry with Dhol Ensemble",
        whyItFits: "Creates a theatrical, celebratory grand entry that thrills guests and produces stunning photography."
      };
      const testResult = applyPatch(deepClone(event), patch);
      activePatch = patch;
      activeDiff = testResult.diff;
      messages.push({
        role: "assistant",
        text: "Here is a celebration concept: a dynamic Dhol and cold-pyro walkway entry. You can accept this into your Ideas list below."
      });
    } else {
      messages.push({
        role: "assistant",
        text: `Based on your plan for ${event.city}, I recommend confirming venue arrangements 8 weeks before ${event.date} and keeping a 5% plate buffer for pending guests.`
      });
    }
  }

  renderView();
  return container;
}
