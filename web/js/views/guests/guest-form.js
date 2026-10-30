/**
 * guest-form.js - Form builder and submission handler for adding attendees
 */

import { el, icon } from "../../dom.js";

function buildGuestFormFields() {
  return el("div", { className: "form-row-grid" }, [
    el("div", { className: "form-group flex-2" }, [
      el("label", { htmlFor: "guest-name", className: "form-label" }, "Guest / Family Name"),
      el("input", {
        id: "guest-name",
        type: "text",
        required: true,
        className: "form-input",
        placeholder: "e.g., Sharma Family (4 members)"
      })
    ]),
    el("div", { className: "form-group flex-1" }, [
      el("label", { htmlFor: "guest-contact", className: "form-label" }, "Phone or Email"),
      el("input", {
        id: "guest-contact",
        type: "text",
        className: "form-input",
        placeholder: "+91 98765 43210"
      })
    ]),
    el("div", { className: "form-group flex-1" }, [
      el("label", { htmlFor: "guest-status", className: "form-label" }, "RSVP Status"),
      el("select", { id: "guest-status", className: "form-input" }, [
        el("option", { value: "pending" }, "Pending"),
        el("option", { value: "confirmed" }, "Confirmed"),
        el("option", { value: "declined" }, "Declined")
      ])
    ]),
    el("div", { className: "form-group flex-1" }, [
      el("label", { htmlFor: "guest-diet", className: "form-label" }, "Dietary Preferences"),
      el("input", {
        id: "guest-diet",
        type: "text",
        className: "form-input",
        placeholder: "e.g., Pure Jain / Vegetarian"
      })
    ])
  ]);
}

function handleGuestFormSubmit(form, guestList, { onUpdate, renderView, announce, event }) {
  const nameInput = form.querySelector("#guest-name");
  const contactInput = form.querySelector("#guest-contact");
  const statusSelect = form.querySelector("#guest-status");
  const dietInput = form.querySelector("#guest-diet");
  const name = nameInput.value.trim();
  if (!name) return;

  const newGuest = {
    id: `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    contact: contactInput.value.trim() || "",
    status: statusSelect.value || "pending",
    diet: dietInput.value.trim() || ""
  };

  guestList.push(newGuest);
  nameInput.value = "";
  contactInput.value = "";
  dietInput.value = "";

  onUpdate(event);
  renderView();
  announce?.(`Added guest "${newGuest.name}" to directory.`);
}

/**
 * Render the add guest form card
 * @param {Array<Object>} guestList
 * @param {Object} context
 * @returns {HTMLFormElement}
 */
export function createAddGuestForm(guestList, context) {
  const form = el(
    "form",
    {
      className: "card add-guest-card",
      onSubmit: (e) => {
        e.preventDefault();
        handleGuestFormSubmit(form, guestList, context);
      }
    },
    [
      el("h3", { className: "card-title-sm" }, [icon("plus"), "Add Guest / Party to List"]),
      buildGuestFormFields(),
      el("div", { className: "form-actions-right" }, [
        el("button", { type: "submit", className: "btn btn-primary" }, [icon("plus"), "Add Guest"])
      ])
    ]
  );
  return form;
}
