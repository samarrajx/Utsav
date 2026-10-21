/**
 * settings.js - Settings modal and preferences manager
 *
 * Allows configuring Country, Currency, and Language options.
 */

import { el, icon } from "../dom.js";
import { getSettings, saveSettings } from "../storage.js";

/**
 * Render the settings dialog modal
 *
 * @param {Object} options
 * @param {Function} options.onClose
 * @param {Function} options.onSave
 * @returns {HTMLElement}
 */
export function renderSettingsModal({ onClose, onSave }) {
  const current = getSettings();

  const langSelect = el("select", { id: "settings-language", className: "form-select" }, [
    el("option", { value: "en", selected: current.language === "en" }, "English"),
    el("option", { value: "hi", selected: current.language === "hi" }, "हिंदी (Hindi)"),
    el("option", { value: "hinglish", selected: current.language === "hinglish" }, "Hinglish (Casual)")
  ]);

  const countrySelect = el("select", { id: "settings-country", className: "form-select" }, [
    el("option", { value: "IN", selected: current.countryCode === "IN" }, "India (Detailed City Tiers)"),
    el("option", { value: "US", selected: current.countryCode === "US" }, "United States"),
    el("option", { value: "GB", selected: current.countryCode === "GB" }, "United Kingdom"),
    el("option", { value: "AE", selected: current.countryCode === "AE" }, "United Arab Emirates"),
    el("option", { value: "DE", selected: current.countryCode === "DE" }, "Germany / EU")
  ]);

  const currencySelect = el("select", { id: "settings-currency", className: "form-select" }, [
    el("option", { value: "INR", selected: current.currency === "INR" }, "INR (₹ - Indian Rupee)"),
    el("option", { value: "USD", selected: current.currency === "USD" }, "USD ($ - US Dollar)"),
    el("option", { value: "EUR", selected: current.currency === "EUR" }, "EUR (€ - Euro)"),
    el("option", { value: "GBP", selected: current.currency === "GBP" }, "GBP (£ - British Pound)"),
    el("option", { value: "AED", selected: current.currency === "AED" }, "AED (د.إ - UAE Dirham)")
  ]);

  const handleSave = () => {
    const updated = saveSettings({
      language: langSelect.value,
      countryCode: countrySelect.value,
      currency: currencySelect.value
    });
    if (onSave) onSave(updated);
    if (onClose) onClose();
  };

  const modal = el("div", {
    className: "modal-backdrop",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "settings-modal-title",
    onClick: (e) => {
      if (e.target === modal) onClose();
    }
  }, [
    el("div", { className: "modal-card" }, [
      el("div", { className: "modal-header" }, [
        el("div", { className: "modal-title-group" }, [
          icon("settings", "modal-icon"),
          el("h2", { id: "settings-modal-title", className: "modal-title" }, "Preferences & Regional Settings")
        ]),
        el("button", {
          type: "button",
          className: "btn-icon-close",
          "aria-label": "Close settings",
          onClick: onClose
        }, [icon("close")])
      ]),

      el("div", { className: "modal-body" }, [
        el("div", { className: "form-group" }, [
          el("label", { htmlFor: "settings-language", className: "form-label" }, "AI Assistant Language"),
          langSelect,
          el("p", { className: "form-hint" }, "Controls language for intake questions, suggestions, and chat.")
        ]),

        el("div", { className: "form-group" }, [
          el("label", { htmlFor: "settings-country", className: "form-label" }, "Country & Market Multiplier"),
          countrySelect,
          el("p", { className: "form-hint" }, "Adjusts venue and vendor baseline cost benchmarks.")
        ]),

        el("div", { className: "form-group" }, [
          el("label", { htmlFor: "settings-currency", className: "form-label" }, "Budget Currency"),
          currencySelect,
          el("p", { className: "form-hint" }, "Default currency for budget allocations and expense tracking.")
        ])
      ]),

      el("div", { className: "modal-footer" }, [
        el("button", {
          type: "button",
          className: "btn btn-secondary",
          onClick: onClose
        }, "Cancel"),
        el("button", {
          type: "button",
          className: "btn btn-primary",
          onClick: handleSave
        }, "Save Preferences")
      ])
    ])
  ]);

  return modal;
}
