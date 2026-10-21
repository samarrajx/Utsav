/**
 * assistant.js - Interactive AI Event Assistant with verified patch diffs & undo
 *
 * Provides real-time chat, suggestion chips, plan modification patch diffs,
 * safe application via patch.js, and multi-level undo.
 */

import { el, icon } from "../dom.js";
import { fetchAssist, getAssistAbortSignal } from "../api.js";
import { applyPatch, deepClone } from "../engine/patch.js";

const undoStack = [];

function createTranscriptView(messages, isThinking) {
  const transcript = el(
    "div",
    {
      className: "assistant-transcript",
      role: "log",
      "aria-label": "Assistant conversation history",
      "aria-live": "polite"
    },
    messages.map((msg) => {
      const isUser = msg.role === "user";
      return el("div", { className: `chat-bubble-wrap ${isUser ? "is-user" : "is-assistant"}` }, [
        el("div", { className: `chat-bubble ${isUser ? "user-bubble" : "assistant-bubble"}` }, [
          el("p", { className: "chat-text" }, msg.text)
        ])
      ]);
    })
  );

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

  return transcript;
}

function createPatchDiffCard(activeDiff, onAccept, onDiscard) {
  return el("div", { className: "patch-diff-card" }, [
    el("div", { className: "patch-diff-header" }, [
      icon("checklist", "patch-icon"),
      el("h4", { className: "patch-title" }, "Proposed Plan Modification")
    ]),
    el("p", { className: "patch-summary-text" }, activeDiff.summary),
    el("div", { className: "patch-actions-row" }, [
      el(
        "button",
        {
          type: "button",
          className: "btn btn-primary btn-sm btn-accept-patch",
          onClick: onAccept
        },
        [icon("check"), "Accept & Apply"]
      ),
      el(
        "button",
        {
          type: "button",
          className: "btn btn-secondary btn-sm btn-discard-patch",
          onClick: onDiscard
        },
        "Discard"
      )
    ])
  ]);
}

function createUndoBanner(onUndo) {
  return el("div", { className: "undo-toast-banner" }, [
    el("span", { className: "undo-label" }, "Plan modification active."),
    el(
      "button",
      {
        type: "button",
        className: "btn-text-link btn-undo-action",
        onClick: onUndo
      },
      "Undo Change"
    )
  ]);
}

function createPromptChips(isThinking, onSelectPrompt) {
  const chips = [
    {
      label: '💡 "Suggest creative entry ideas"',
      query: "Suggest 3 creative and memorable entry ideas for our celebration."
    },
    {
      label: '💰 "Make catering 10% cheaper"',
      query: "Make catering 10% cheaper and reallocate to venue and decor."
    },
    {
      label: '⚠️ "Audit timeline risks"',
      query: "What are the biggest risks or timeline bottlenecks in our plan right now?"
    },
    {
      label: '📋 "Add sangeet choreography task"',
      query: "Add a task: Book sangeet choreographer under the 8-week milestone."
    }
  ];

  return el(
    "div",
    { className: "assistant-prompt-chips", "aria-label": "Suggested questions" },
    chips.map(({ label, query }) =>
      el(
        "button",
        {
          type: "button",
          className: "prompt-chip",
          disabled: isThinking,
          onClick: () => onSelectPrompt(query)
        },
        label
      )
    )
  );
}

function createInputForm(isThinking, onSend) {
  const form = el(
    "form",
    {
      className: "assistant-input-form",
      onSubmit: (e) => {
        e.preventDefault();
        const input = form.querySelector(".assistant-input");
        const query = input.value.trim();
        if (query) {
          input.value = "";
          onSend(query);
        }
      }
    },
    [
      el("input", {
        type: "text",
        className: "form-input assistant-input",
        placeholder: "Ask assistant or adjust plan...",
        disabled: isThinking,
        "aria-label": "Message AI assistant"
      }),
      el(
        "button",
        {
          type: "submit",
          className: "btn btn-primary btn-send-assistant",
          disabled: isThinking,
          "aria-label": "Send message"
        },
        [icon("arrowRight")]
      )
    ]
  );
  return form;
}

function getOfflineFallbackResponse(event, queryText) {
  const lower = queryText.toLowerCase();

  if (lower.includes("catering") && (lower.includes("cheaper") || lower.includes("reduce"))) {
    const currentWeight = event.budget?.categories?.find((c) => c.id === "catering")?.weight || 26;
    const patch = {
      op: "set_category_weight",
      categoryId: "catering",
      weight: Math.max(10, currentWeight - 3)
    };
    return {
      text: "I've generated an adjustment to trim your catering budget allocation and rebalance other categories evenly.",
      patch
    };
  }

  if (lower.includes("task") || lower.includes("choreographer")) {
    const patch = {
      op: "add_task",
      title: "Book Sangeet Choreographer & Rehearsals",
      due: event.date
    };
    return {
      text: "I've prepared a new milestone task for booking your sangeet choreographer.",
      patch
    };
  }

  if (lower.includes("entry") || lower.includes("idea")) {
    const patch = {
      op: "add_idea",
      section: "entertainment",
      title: "Cold Pyrotechnic Walkway Entry with Dhol Ensemble",
      whyItFits:
        "Creates a theatrical, celebratory grand entry that thrills guests and produces stunning photography."
    };
    return {
      text: "Here is a celebration concept: a dynamic Dhol and cold-pyro walkway entry. You can accept this into your Ideas list below.",
      patch
    };
  }

  return {
    text: `Based on your plan for ${event.city}, I recommend confirming venue arrangements 8 weeks before ${event.date} and keeping a 5% plate buffer for pending guests.`,
    patch: null
  };
}

function renderAssistantView(container, state, actions) {
  container.replaceChildren();

  const header = el("div", { className: "assistant-header" }, [
    el("div", { className: "assistant-title-wrap" }, [
      icon("sparkles", "assistant-sparkle-icon"),
      el("h3", { className: "assistant-title" }, "AI Event Assistant")
    ]),
    el(
      "span",
      { className: `assistant-status-pill ${state.isThinking ? "is-thinking" : "is-ready"}` },
      state.isThinking ? "Thinking..." : "Ready"
    )
  ]);

  const transcript = createTranscriptView(state.messages, state.isThinking);

  let patchCard = null;
  if (state.activePatch && state.activeDiff) {
    patchCard = createPatchDiffCard(
      state.activeDiff,
      actions.onAcceptPatch,
      actions.onDiscardPatch
    );
  }

  let undoBanner = null;
  if (undoStack.length > 0) {
    undoBanner = createUndoBanner(actions.onUndo);
  }

  const promptChips = createPromptChips(state.isThinking, actions.onSendMessage);
  const inputForm = createInputForm(state.isThinking, actions.onSendMessage);

  container.append(header, transcript);
  if (patchCard) container.appendChild(patchCard);
  if (undoBanner) container.appendChild(undoBanner);
  container.append(promptChips, inputForm);

  setTimeout(() => {
    transcript.scrollTop = transcript.scrollHeight;
  }, 50);
}

async function sendAssistantMessage(queryText, state, event, onUpdate, rerender) {
  state.messages.push({ role: "user", text: queryText });
  state.isThinking = true;
  rerender();

  try {
    const signal = getAssistAbortSignal();
    const res = await fetchAssist(
      {
        message: queryText,
        plan: event,
        history: state.messages.slice(-4),
        language: event.language || "en"
      },
      { signal }
    );

    if (res.ok && res.data) {
      const { reply, patch } = res.data;
      state.messages.push({ role: "assistant", text: reply || "I've reviewed your request." });
      if (patch && typeof patch === "object" && patch.op) {
        const testResult = applyPatch(deepClone(event), patch);
        state.activePatch = patch;
        state.activeDiff = testResult.diff;
      }
    } else {
      applyOfflineFallback(queryText, state, event);
    }
  } catch {
    applyOfflineFallback(queryText, state, event);
  } finally {
    state.isThinking = false;
    rerender();
  }
}

function applyOfflineFallback(queryText, state, event) {
  const { text, patch } = getOfflineFallbackResponse(event, queryText);
  state.messages.push({ role: "assistant", text });
  if (patch) {
    const testResult = applyPatch(deepClone(event), patch);
    state.activePatch = patch;
    state.activeDiff = testResult.diff;
  }
}

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

  const state = {
    messages: [
      {
        role: "assistant",
        text: `Namaste! I'm your AI Celebration Assistant for "${event.title}". Ask me to adjust your budget, suggest creative traditions, or draft vendor inquiries.`
      }
    ],
    isThinking: false,
    activePatch: null,
    activeDiff: null
  };

  const rerender = () => renderAssistantView(container, state, actions);

  const actions = {
    onAcceptPatch: () => {
      undoStack.push(deepClone(event));
      const result = applyPatch(event, state.activePatch);
      Object.assign(event, result.plan);
      const summaryText = state.activeDiff.summary;
      state.activePatch = null;
      state.activeDiff = null;
      onUpdate(event);
      rerender();
      announce?.(`Plan updated: ${summaryText}. Undo is available.`);
    },
    onDiscardPatch: () => {
      state.activePatch = null;
      state.activeDiff = null;
      rerender();
      announce?.("Proposed changes discarded.");
    },
    onUndo: () => {
      const previous = undoStack.pop();
      if (previous) {
        Object.assign(event, previous);
        onUpdate(event);
        rerender();
        announce?.("Previous plan version restored.");
      }
    },
    onSendMessage: (queryText) => {
      sendAssistantMessage(queryText, state, event, onUpdate, rerender);
    }
  };

  rerender();
  return container;
}
