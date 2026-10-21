/**
 * vendor-outreach-modal.js - AI Vendor Outreach Message Drafter Modal
 *
 * Accessible dialog supporting WhatsApp and Email channels,
 * inquiry questions, instant copy-to-clipboard, and direct action links.
 */

import { el, icon } from "../dom.js";
import { fetchVendorMessage } from "../api.js";
import { formatDisplayDate } from "../engine/dates.js";

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
  let activeChannel = "whatsapp"; // 'whatsapp' | 'email'
  let isDrafting = false;
  let currentSubject = "";
  let currentBody = "";

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

  function closeModal() {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", handleKeydown);
    }
    if (backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    } else if (typeof backdrop.remove === "function") {
      backdrop.remove();
    }
    onClose?.();
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      closeModal();
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", handleKeydown);
  }

  async function generateDraft() {
    isDrafting = true;
    renderModalContent();

    try {
      const res = await fetchVendorMessage({
        category: vendor.category || "venue",
        vendorName: vendor.name || vendor.category,
        eventType: event.type || "wedding",
        eventDate: event.date,
        city: event.city || "Mumbai",
        guestCount: event.guests?.target || 100,
        channel: activeChannel,
        specificQuestions: Array.isArray(vendor.askThem) ? vendor.askThem : [],
        language: event.language || "en"
      });

      if (res.ok && res.data) {
        currentSubject = res.data.subject || `Inquiry: ${vendor.name} for ${event.title} (${formatDisplayDate(event.date)})`;
        currentBody = res.data.body || "";
      } else {
        createOfflineFallbackDraft();
      }
    } catch {
      createOfflineFallbackDraft();
    } finally {
      isDrafting = false;
      renderModalContent();
    }
  }

  function createOfflineFallbackDraft() {
    const formattedDate = formatDisplayDate(event.date);
    const guests = event.guests?.target || 100;
    const questions = Array.isArray(vendor.askThem) && vendor.askThem.length > 0
      ? vendor.askThem.map((q) => `• ${q}`).join("\n")
      : "• Availability on this date\n• Initial pricing package and inclusions\n• Portfolio or previous work samples";

    if (activeChannel === "email") {
      currentSubject = `Inquiry: ${vendor.name || vendor.category} for ${event.title} on ${formattedDate}`;
      currentBody = `Dear ${vendor.name || "Vendor Team"},

I hope this message finds you well.

We are currently planning a celebration (${event.title}) scheduled for ${formattedDate} in ${event.city}, with approximately ${guests} expected guests.

We came across your work and would love to inquire about your availability and services. Specifically, could you please share:

${questions}

Looking forward to hearing from you soon.

Warm regards,
Event Host`;
    } else {
      currentBody = `Hi ${vendor.name || "there"}! 👋

Planning a celebration (${event.title}) on ${formattedDate} in ${event.city} for ~${guests} guests.

Wanted to check:
${questions}

Could you share your packages and availability? Thank you!`;
    }
  }

  function renderModalContent() {
    modal.replaceChildren();

    // 1. Header
    const header = el("div", { className: "modal-header" }, [
      el("div", {}, [
        el("h3", { id: "outreach-modal-title", className: "modal-title" }, [
          icon("mail"),
          `Draft Outreach: ${vendor.name || vendor.category}`
        ]),
        el("p", { className: "text-muted" },
          `${formatDisplayDate(event.date)} • ${event.city} • ~${event.guests?.target || 100} guests`
        )
      ]),
      el("button", {
        type: "button",
        className: "modal-close-btn",
        "aria-label": "Close outreach drafter",
        onClick: closeModal
      }, [icon("close")])
    ]);

    // 2. Channel Selector Tabs
    const channelBar = el("div", { className: "channel-selector-bar", role: "tablist", "aria-label": "Outreach channel" }, [
      el("button", {
        type: "button",
        role: "tab",
        className: `channel-tab ${activeChannel === "whatsapp" ? "is-active" : ""}`,
        "aria-selected": activeChannel === "whatsapp" ? "true" : "false",
        onClick: () => {
          if (activeChannel !== "whatsapp") {
            activeChannel = "whatsapp";
            generateDraft();
          }
        }
      }, [icon("messageSquare"), "WhatsApp"]),
      el("button", {
        type: "button",
        role: "tab",
        className: `channel-tab ${activeChannel === "email" ? "is-active" : ""}`,
        "aria-selected": activeChannel === "email" ? "true" : "false",
        onClick: () => {
          if (activeChannel !== "email") {
            activeChannel = "email";
            generateDraft();
          }
        }
      }, [icon("mail"), "Email"])
    ]);

    // 3. Draft Editor Area
    let editorSection;
    if (isDrafting) {
      editorSection = el("div", { className: "drafting-skeleton-box" }, [
        el("div", { className: "skeleton-bar", style: { marginBottom: "0.75rem" } }),
        el("div", { className: "skeleton-bar skeleton-short", style: { marginBottom: "0.75rem" } }),
        el("div", { className: "skeleton-bar" }),
        el("p", { className: "text-muted drafting-label" }, "Drafting personalized inquiry with event details...")
      ]);
    } else {
      const fields = [];

      if (activeChannel === "email") {
        fields.push(
          el("div", { className: "form-group", style: { marginBottom: "0.75rem" } }, [
            el("label", { htmlFor: "email-subject", className: "form-label" }, "Email Subject"),
            el("input", {
              id: "email-subject",
              type: "text",
              className: "form-input",
              value: currentSubject,
              onInput: (e) => { currentSubject = e.target.value; }
            })
          ])
        );
      }

      fields.push(
        el("div", { className: "form-group" }, [
          el("label", { htmlFor: "message-body", className: "form-label" }, "Message Content"),
          el("textarea", {
            id: "message-body",
            className: "form-input draft-textarea",
            rows: activeChannel === "email" ? 9 : 7,
            onInput: (e) => { currentBody = e.target.value; }
          }, currentBody)
        ])
      );

      editorSection = el("div", { className: "draft-editor-wrapper" }, fields);
    }

    // 4. Action Buttons Footer
    const footer = el("div", { className: "modal-footer" }, [
      el("button", {
        type: "button",
        className: "btn btn-secondary",
        onClick: closeModal
      }, "Cancel"),
      el("button", {
        type: "button",
        className: "btn btn-secondary btn-copy-message",
        disabled: isDrafting,
        onClick: (e) => {
          const textToCopy = activeChannel === "email" && currentSubject
            ? `Subject: ${currentSubject}\n\n${currentBody}`
            : currentBody;

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
      }, [icon("checklist"), "Copy to Clipboard"]),
      activeChannel === "whatsapp" ? el("a", {
        href: `https://api.whatsapp.com/send?text=${encodeURIComponent(currentBody)}`,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "btn btn-primary btn-open-channel"
      }, [icon("arrowRight"), "Open WhatsApp"]) : el("a", {
        href: `mailto:?subject=${encodeURIComponent(currentSubject)}&body=${encodeURIComponent(currentBody)}`,
        className: "btn btn-primary btn-open-channel"
      }, [icon("arrowRight"), "Open Email Client"])
    ]);

    modal.append(header, channelBar, editorSection, footer);
  }

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Generate initial draft
  generateDraft();

  return backdrop;
}
