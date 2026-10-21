/**
 * vendors-tab.js - Celebration vendor checklist and outreach command center
 *
 * Provides vendor category cards with status chips (to_find, contacted, proposal, booked),
 * quote trackers, book-by dates, checklists, and message drafters.
 */

import { el, icon } from "../dom.js";
import { formatCurrency } from "../engine/money.js";
import { formatDisplayDate, daysBetween } from "../engine/dates.js";

const VENDOR_ICONS = {
  venue: "building",
  catering: "utensils",
  photography: "camera",
  decor: "sparkles",
  entertainment: "music",
  attire: "heart",
  invitations: "mail",
  makeup: "sparkles"
};

const STATUS_LABELS = {
  to_find: "To Find",
  contacted: "Contacted",
  proposal: "Proposal Received",
  booked: "Booked & Confirmed"
};

/**
 * Render the Vendors tab panel
 *
 * @param {Object} event
 * @param {Object} options
 * @param {Function} options.onUpdate
 * @param {Function} [options.onDraftMessage]
 * @param {Function} [options.announce]
 * @returns {HTMLElement}
 */
export function renderVendorsTab(event, { onUpdate, onDraftMessage, announce }) {
  const container = el("div", { className: "tabpanel-vendors" });

  const currency = event.currency || "INR";
  const vendors = Array.isArray(event.vendors) ? event.vendors : [];

  function renderView() {
    container.replaceChildren();

    const bookedCount = vendors.filter((v) => v.status === "booked").length;
    const contactedCount = vendors.filter((v) => v.status === "contacted" || v.status === "proposal").length;
    const toFindCount = vendors.filter((v) => v.status === "to_find").length;
    const totalCount = vendors.length;

    // 1. KPI Top Bar
    const topBar = el("div", { className: "card vendors-header-card" }, [
      el("div", { className: "vendors-kpi-row" }, [
        el("div", {}, [
          el("h2", { className: "tab-view-heading" }, "Vendor Management Checklist"),
          el("p", { className: "text-muted" }, "Track bids, quotes, contracts, and outreach across celebration domains.")
        ]),
        el("div", { className: "vendor-status-stats" }, [
          el("span", { className: "badge-status is-ok" }, `${bookedCount} of ${totalCount} Booked`),
          el("span", { className: "badge-status is-warning" }, `${contactedCount} In Discussion`),
          el("span", { className: "badge-status is-neutral" }, `${toFindCount} To Find`)
        ])
      ])
    ]);

    // 2. Vendors Grid
    const now = new Date();
    const vendorsGrid = el("div", { className: "vendors-cards-grid" },
      vendors.map((vendor) => {
        const iconName = VENDOR_ICONS[vendor.category] || "building";
        const isBookByPassed = vendor.bookBy && daysBetween(now, vendor.bookBy) < 0 && vendor.status !== "booked";

        return el("div", { className: `card vendor-item-card status-${vendor.status}` }, [
          // Header: Category, Status dropdown
          el("div", { className: "vendor-card-header" }, [
            el("div", { className: "vendor-cat-badge" }, [
              icon(iconName, "vendor-cat-icon"),
              el("h3", { className: "vendor-name" }, vendor.name || vendor.category)
            ]),
            el("select", {
              className: `vendor-status-select status-${vendor.status}`,
              "aria-label": `Change status for ${vendor.name || vendor.category}`,
              onChange: (e) => {
                vendor.status = e.target.value;
                onUpdate(event);
                renderView();
                announce?.(`Updated ${vendor.name} status to ${STATUS_LABELS[vendor.status]}.`);
              }
            }, [
              el("option", { value: "to_find", selected: vendor.status === "to_find" }, STATUS_LABELS.to_find),
              el("option", { value: "contacted", selected: vendor.status === "contacted" }, STATUS_LABELS.contacted),
              el("option", { value: "proposal", selected: vendor.status === "proposal" }, STATUS_LABELS.proposal),
              el("option", { value: "booked", selected: vendor.status === "booked" }, STATUS_LABELS.booked)
            ])
          ]),

          // Subheader: Book-by deadline & Quote
          el("div", { className: "vendor-meta-row" }, [
            el("div", { className: "vendor-bookby" }, [
              icon("clock"),
              el("span", { className: isBookByPassed ? "text-danger font-semibold" : "" },
                vendor.bookBy ? `Book by ${formatDisplayDate(vendor.bookBy)}` : "No book-by date"
              )
            ]),
            el("div", { className: "vendor-quote-input-wrap" }, [
              el("label", { htmlFor: `quote-${vendor.id}`, className: "sr-only" }, `Quote for ${vendor.name}`),
              el("span", { className: "currency-symbol" }, currency),
              el("input", {
                id: `quote-${vendor.id}`,
                type: "number",
                min: "0",
                step: "1000",
                className: "quote-input",
                placeholder: "Quote",
                value: vendor.quote || "",
                onChange: (e) => {
                  vendor.quote = Number(e.target.value) || 0;
                  onUpdate(event);
                  announce?.(`Saved quote of ${formatCurrency(vendor.quote, currency)} for ${vendor.name}.`);
                }
              })
            ])
          ]),

          // What to look for
          vendor.lookFor?.length > 0 ? el("div", { className: "vendor-section-box" }, [
            el("h4", { className: "vendor-box-title" }, "Key Selection Criteria:"),
            el("ul", { className: "criteria-list" },
              vendor.lookFor.map((item) => el("li", {}, item))
            )
          ]) : null,

          // Questions to ask
          vendor.askThem?.length > 0 ? el("div", { className: "vendor-section-box" }, [
            el("h4", { className: "vendor-box-title" }, "Questions to Ask Vendor:"),
            el("ul", { className: "questions-list" },
              vendor.askThem.map((q) => el("li", {}, q))
            )
          ]) : null,

          // Actions: Draft Message
          el("div", { className: "vendor-card-footer" }, [
            el("button", {
              type: "button",
              className: "btn btn-secondary btn-draft-outreach",
              onClick: () => {
                if (onDraftMessage) {
                  onDraftMessage(vendor);
                } else {
                  // Fallback draft copy
                  const text = `Hi, I am planning a celebration (${event.title}) on ${formatDisplayDate(event.date)} in ${event.city} for ~${event.guests?.target || 100} guests. Are you available on this date, and could you share your package pricing?`;
                  navigator.clipboard?.writeText(text);
                  alert(`Vendor outreach message copied to clipboard!\n\n"${text}"`);
                }
              }
            }, [icon("messageSquare"), "Draft Outreach Message"])
          ])
        ]);
      })
    );

    // 3. Add Custom Vendor Category Form
    const addVendorForm = el("form", {
      className: "card add-vendor-card",
      onSubmit: (e) => {
        e.preventDefault();
        const nameInput = addVendorForm.querySelector("#new-vendor-name");
        const catSelect = addVendorForm.querySelector("#new-vendor-category");
        const bookByInput = addVendorForm.querySelector("#new-vendor-bookby");

        const name = nameInput.value.trim();
        if (!name) return;

        const newVendor = {
          id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: catSelect.value,
          name,
          status: "to_find",
          quote: 0,
          bookBy: bookByInput.value || null,
          lookFor: ["Transparent quotation", "Proven track record"],
          askThem: ["Are you available on our event date?", "What are your deposit terms?"]
        };

        vendors.push(newVendor);
        nameInput.value = "";
        bookByInput.value = "";

        onUpdate(event);
        renderView();
        announce?.(`Added vendor category "${newVendor.name}".`);
      }
    }, [
      el("h3", { className: "card-title-sm" }, [icon("plus"), "Add Custom Vendor Category"]),
      el("div", { className: "form-row-grid" }, [
        el("div", { className: "form-group flex-2" }, [
          el("label", { htmlFor: "new-vendor-name", className: "form-label" }, "Category / Service Name"),
          el("input", {
            id: "new-vendor-name",
            type: "text",
            required: true,
            className: "form-input",
            placeholder: "e.g., Traditional Henna Artist / Live Band"
          })
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "new-vendor-category", className: "form-label" }, "Domain Type"),
          el("select", { id: "new-vendor-category", className: "form-input" }, [
            el("option", { value: "venue" }, "Venue"),
            el("option", { value: "catering" }, "Catering"),
            el("option", { value: "photography" }, "Photography"),
            el("option", { value: "decor" }, "Decor & Floral"),
            el("option", { value: "entertainment" }, "Entertainment"),
            el("option", { value: "attire" }, "Attire & Styling"),
            el("option", { value: "other" }, "Other Service")
          ])
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "new-vendor-bookby", className: "form-label" }, "Book-By Deadline"),
          el("input", { id: "new-vendor-bookby", type: "date", className: "form-input" })
        ])
      ]),
      el("div", { className: "form-actions-right" }, [
        el("button", { type: "submit", className: "btn btn-primary" }, [icon("plus"), "Add Vendor"])
      ])
    ]);

    container.append(topBar, vendorsGrid, addVendorForm);
  }

  renderView();
  return container;
}
