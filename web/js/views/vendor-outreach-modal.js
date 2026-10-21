/**
 * vendor-outreach-modal.js - AI Vendor Outreach Message Drafter Modal
 *
 * Accessible dialog supporting WhatsApp and Email channels,
 * inquiry questions, instant copy-to-clipboard, and direct action links.
 */

import { el, icon } from "../dom.js";
import { fetchVendorMessage } from "../api.js";
import { formatDisplayDate } from "../engine/dates.js";

function buildOfflineDraft(channel, vendor, event) {
  const formattedDate = formatDisplayDate(event.date);
  const guests = event.guests?.target || 100;
  const questions =
    Array.isArray(vendor.askThem) && vendor.askThem.length > 0
      ? vendor.askThem.map((q) => `• ${q}`).join("\n")
      : "• Availability on this date\n• Initial pricing package and inclusions\n• Portfolio or previous work samples";

  if (channel === "email") {
    return {
      subject: `Inquiry: ${vendor.name || vendor.category} for ${event.title} on ${formattedDate}`,
      body: `Dear ${vendor.name || "Vendor Team"},

I hope this message finds you well.

We are currently planning a celebration (${event.title}) scheduled for ${formattedDate} in ${event.city}, with approximately ${guests} expected guests.

We came across your work and would love to inquire about your availability and services. Specifically, could you please share:

${questions}

Looking forward to hearing from you soon.

Warm regards,
Event Host`
    };
  }

  return {
    subject: "",
    body: `Hi ${vendor.name || "there"}! 👋

Planning a celebration (${event.title}) on ${formattedDate} in ${event.city} for ~${guests} guests.

Wanted to check:
${questions}

Could you share your packages and availability? Thank you!`
  };
}

function buildVendorMessagePayload(vendor, event, channel) {
  const category = vendor.category || "venue";
  const vendorName = vendor.name || category;
  const eventType = event.type || "wedding";
  const city = event.city || "Mumbai";
  const guestCount = event.guests?.target || 100;
  const specificQuestions = Array.isArray(vendor.askThem) ? vendor.askThem : [];
  const language = event.language || "en";

  return {
    category,
    vendorName,
    eventType,
    eventDate: event.date,
    city,
    guestCount,
    channel,
    specificQuestions,
    language
  };
}

function extractDraftResult(data, vendor, event) {
  const defaultSubject = `Inquiry: ${vendor.name} for ${event.title} (${formatDisplayDate(event.date)})`;
  return {
    subject: data.subject || defaultSubject,
    body: data.body || ""
  };
}

async function requestDraft(vendor, event, channel) {
  try {
    const payload = buildVendorMessagePayload(vendor, event, channel);
    const res = await fetchVendorMessage(payload);

    if (res.ok && res.data) {
      return extractDraftResult(res.data, vendor, event);
    }
  } catch {
    // Fall back to offline template
  }
  return buildOfflineDraft(channel, vendor, event);
}

function createChannelTabs(activeChannel, onSelectChannel) {
  return el(
    "div",
    { className: "channel-selector-bar", role: "tablist", "aria-label": "Outreach channel" },
    [
      el(
        "button",
        {
          type: "button",
          role: "tab",
          className: `channel-tab ${activeChannel === "whatsapp" ? "is-active" : ""}`,
          "aria-selected": activeChannel === "whatsapp" ? "true" : "false",
          onClick: () => onSelectChannel("whatsapp")
        },
        [icon("messageSquare"), "WhatsApp"]
      ),
      el(
        "button",
        {
          type: "button",
          role: "tab",
          className: `channel-tab ${activeChannel === "email" ? "is-active" : ""}`,
          "aria-selected": activeChannel === "email" ? "true" : "false",
          onClick: () => onSelectChannel("email")
        },
        [icon("mail"), "Email"]
      )
    ]
  );
}

function createEditorSection(isDrafting, activeChannel, subject, body, onSubject, onBody) {
  if (isDrafting) {
    return el("div", { className: "drafting-skeleton-box" }, [
      el("div", { className: "skeleton-bar", style: { marginBottom: "0.75rem" } }),
      el("div", { className: "skeleton-bar skeleton-short", style: { marginBottom: "0.75rem" } }),
      el("div", { className: "skeleton-bar" }),
      el(
        "p",
        { className: "text-muted drafting-label" },
        "Drafting personalized inquiry with event details..."
      )
    ]);
  }

  const fields = [];
  if (activeChannel === "email") {
    fields.push(
      el("div", { className: "form-group", style: { marginBottom: "0.75rem" } }, [
        el("label", { htmlFor: "email-subject", className: "form-label" }, "Email Subject"),
        el("input", {
          id: "email-subject",
          type: "text",
          className: "form-input",
          value: subject,
          onInput: (e) => onSubject(e.target.value)
        })
      ])
    );
  }

  fields.push(
    el("div", { className: "form-group" }, [
      el("label", { htmlFor: "message-body", className: "form-label" }, "Message Content"),
      el(
        "textarea",
        {
          id: "message-body",
          className: "form-input draft-textarea",
          rows: activeChannel === "email" ? 9 : 7,
          onInput: (e) => onBody(e.target.value)
        },
        body
      )
    ])
  );

  return el("div", { className: "draft-editor-wrapper" }, fields);
}

function createModalFooter(isDrafting, activeChannel, subject, body, closeModal, announce) {
  const textToCopy = activeChannel === "email" && subject ? `Subject: ${subject}\n\n${body}` : body;

  const openBtn =
    activeChannel === "whatsapp"
      ? el(
          "a",
          {
            href: `https://api.whatsapp.com/send?text=${encodeURIComponent(body)}`,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "btn btn-primary btn-open-channel"
          },
          [icon("arrowRight"), "Open WhatsApp"]
        )
      : el(
          "a",
          {
            href: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
            className: "btn btn-primary btn-open-channel"
          },
          [icon("arrowRight"), "Open Email Client"]
        );

  return el("div", { className: "modal-footer" }, [
    el("button", { type: "button", className: "btn btn-secondary", onClick: closeModal }, "Cancel"),
    el(
      "button",
      {
        type: "button",
        className: "btn btn-secondary btn-copy-message",
        disabled: isDrafting,
        onClick: (e) => {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(textToCopy);
          }
          const origText = e.currentTarget.textContent;
          e.currentTarget.textContent = "✓ Copied to Clipboard!";
          announce?.("Vendor inquiry message copied to clipboard.");
          setTimeout(() => {
            if (e.currentTarget) e.currentTarget.textContent = origText;
          }, 2000);
        }
      },
      [icon("checklist"), "Copy to Clipboard"]
    ),
    openBtn
  ]);
}

function renderOutreachModalContent(modal, vendor, event, state, actions) {
  modal.replaceChildren();

  const header = el("div", { className: "modal-header" }, [
    el("div", {}, [
      el("h3", { id: "outreach-modal-title", className: "modal-title" }, [
        icon("mail"),
        `Draft Outreach: ${vendor.name || vendor.category}`
      ]),
      el(
        "p",
        { className: "text-muted" },
        `${formatDisplayDate(event.date)} • ${event.city} • ~${event.guests?.target || 100} guests`
      )
    ]),
    el(
      "button",
      {
        type: "button",
        className: "modal-close-btn",
        "aria-label": "Close outreach drafter",
        onClick: actions.closeModal
      },
      [icon("close")]
    )
  ]);

  const channelBar = createChannelTabs(state.channel, actions.onSelectChannel);
  const editorSection = createEditorSection(
    state.isDrafting,
    state.channel,
    state.subject,
    state.body,
    actions.onSubject,
    actions.onBody
  );
  const footer = createModalFooter(
    state.isDrafting,
    state.channel,
    state.subject,
    state.body,
    actions.closeModal,
    actions.announce
  );

  modal.append(header, channelBar, editorSection, footer);
}

/**
 * Open the Vendor Outreach Drafter modal
 *
 * @param {Object} params
 * @param {Object} params.vendor - Vendor item { category, name, quote, askThem, bookBy }
 * @param {Object} params.event - Active celebration event
 * @param {Function} [params.announce] - Screen reader announcer
 * @param {Function} [params.onClose] - Close callback
 * @returns {HTMLElement}
 */
export function openVendorOutreachModal({ vendor, event, announce, onClose }) {
  const state = {
    channel: "whatsapp",
    isDrafting: false,
    subject: "",
    body: ""
  };

  const backdrop = el("div", {
    className: "modal-backdrop",
    onClick: (e) => {
      if (e.target === backdrop) closeModal();
    }
  });

  const modal = el("div", {
    className: "modal-dialog vendor-outreach-dialog card",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "outreach-modal-title"
  });

  const handleKeydown = (e) => {
    if (e.key === "Escape") closeModal();
  };

  const closeModal = () => {
    if (typeof window !== "undefined") window.removeEventListener("keydown", handleKeydown);
    if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    else if (typeof backdrop.remove === "function") backdrop.remove();
    onClose?.();
  };

  if (typeof window !== "undefined") window.addEventListener("keydown", handleKeydown);

  const render = () =>
    renderOutreachModalContent(modal, vendor, event, state, {
      closeModal,
      onSelectChannel: async (newChannel) => {
        if (state.channel !== newChannel) {
          state.channel = newChannel;
          state.isDrafting = true;
          render();
          const draft = await requestDraft(vendor, event, state.channel);
          state.subject = draft.subject;
          state.body = draft.body;
          state.isDrafting = false;
          render();
        }
      },
      onSubject: (s) => {
        state.subject = s;
      },
      onBody: (b) => {
        state.body = b;
      },
      announce
    });

  const init = async () => {
    state.isDrafting = true;
    render();
    const draft = await requestDraft(vendor, event, state.channel);
    state.subject = draft.subject;
    state.body = draft.body;
    state.isDrafting = false;
    render();
  };

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  init();

  return backdrop;
}
