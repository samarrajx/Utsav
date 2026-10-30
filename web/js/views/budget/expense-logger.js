/**
 * expense-logger.js - Itemized expense logger card and manual expense creation form
 */

import { el, icon } from "../../dom.js";
import { formatCurrency } from "../../engine/money.js";
import { formatDisplayDate } from "../../engine/dates.js";
import { createSectionHeader, createEmptyState } from "../shared/ui-helpers.js";

function createExpenseTableRow(
  exp,
  categories,
  currency,
  { onUpdate, renderView, announce, event }
) {
  const cat = categories.find((c) => c.id === exp.categoryId);
  return el("tr", {}, [
    el("td", { className: "text-muted" }, exp.date ? formatDisplayDate(exp.date) : "—"),
    el("td", { className: "font-semibold" }, exp.label),
    el("td", {}, cat ? cat.name : exp.categoryId || "General"),
    el("td", { className: "text-right font-mono font-bold" }, formatCurrency(exp.amount, currency)),
    el("td", { className: "text-right" }, [
      el(
        "button",
        {
          type: "button",
          className: "btn-icon-subtle btn-delete-expense",
          "aria-label": `Delete expense "${exp.label}"`,
          onClick: () => {
            const idx = event.expenses.indexOf(exp);
            if (idx >= 0) {
              event.expenses.splice(idx, 1);
              onUpdate(event);
              renderView();
              announce?.(`Expense "${exp.label}" deleted.`);
            }
          }
        },
        [icon("trash")]
      )
    ])
  ]);
}

function createExpensesTable(expenses, categories, currency, context) {
  return el("div", { className: "table-responsive-wrapper" }, [
    el(
      "table",
      { className: "data-table expenses-table", "aria-label": "Itemized recorded expenses" },
      [
        el("thead", {}, [
          el("tr", {}, [
            el("th", { scope: "col" }, "Date"),
            el("th", { scope: "col" }, "Description"),
            el("th", { scope: "col" }, "Category"),
            el("th", { scope: "col", className: "text-right" }, "Amount"),
            el("th", { scope: "col", className: "text-right" }, "Action")
          ])
        ]),
        el(
          "tbody",
          {},
          expenses.map((exp) => createExpenseTableRow(exp, categories, currency, context))
        )
      ]
    )
  ]);
}

/**
 * Render recorded expenses card with table or empty state
 * @param {Array<Object>} expenses
 * @param {Array<Object>} categories
 * @param {string} currency
 * @param {Object} context
 * @returns {HTMLElement}
 */
export function createExpensesCard(expenses, categories, currency, context) {
  return el("div", { className: "card expenses-logger-card" }, [
    createSectionHeader("Recorded Expenses", "checklist", `${expenses.length} logged`),
    expenses.length > 0
      ? createExpensesTable(expenses, categories, currency, context)
      : createEmptyState(
          "No individual expenses recorded yet. Use the form below to track payments."
        )
  ]);
}

function createExpenseFormFields(categories, currency) {
  return el("div", { className: "form-row-grid" }, [
    el("div", { className: "form-group flex-2" }, [
      el("label", { htmlFor: "exp-desc", className: "form-label" }, "Expense Description"),
      el("input", {
        id: "exp-desc",
        type: "text",
        required: true,
        className: "form-input",
        placeholder: "e.g., Venue booking advance payment"
      })
    ]),
    el("div", { className: "form-group flex-1" }, [
      el("label", { htmlFor: "exp-category", className: "form-label" }, "Category"),
      el(
        "select",
        { id: "exp-category", className: "form-input" },
        categories.map((c) => el("option", { value: c.id }, c.name))
      )
    ]),
    el("div", { className: "form-group flex-1" }, [
      el("label", { htmlFor: "exp-amount", className: "form-label" }, `Amount (${currency})`),
      el("input", {
        id: "exp-amount",
        type: "number",
        min: "1",
        step: "any",
        required: true,
        className: "form-input",
        placeholder: "50000"
      })
    ]),
    el("div", { className: "form-group flex-1" }, [
      el("label", { htmlFor: "exp-date", className: "form-label" }, "Payment Date"),
      el("input", {
        id: "exp-date",
        type: "date",
        className: "form-input",
        value: new Date().toISOString().split("T")[0]
      })
    ])
  ]);
}

function handleExpenseSubmit(form, currency, context) {
  const descInput = form.querySelector("#exp-desc");
  const catSelect = form.querySelector("#exp-category");
  const amtInput = form.querySelector("#exp-amount");
  const dateInput = form.querySelector("#exp-date");

  const label = descInput.value.trim();
  const amount = Number(amtInput.value);
  if (!label || isNaN(amount) || amount <= 0) return;

  const newExpense = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    categoryId: catSelect.value,
    label,
    amount,
    date: dateInput.value || new Date().toISOString().split("T")[0]
  };

  context.event.expenses.push(newExpense);
  descInput.value = "";
  amtInput.value = "";

  context.onUpdate(context.event);
  context.renderView();
  context.announce?.(`Recorded expense: ${formatCurrency(amount, currency)} for ${label}.`);
}

/**
 * Render log new expense form card
 * @param {Array<Object>} categories
 * @param {string} currency
 * @param {Object} context
 * @returns {HTMLFormElement}
 */
export function createAddExpenseForm(categories, currency, context) {
  const form = el(
    "form",
    {
      className: "card add-expense-form",
      onSubmit: (e) => {
        e.preventDefault();
        handleExpenseSubmit(form, currency, context);
      }
    },
    [
      el("h3", { className: "card-title-sm" }, [icon("plus"), "Log New Expense"]),
      createExpenseFormFields(categories, currency),
      el("div", { className: "form-actions-right" }, [
        el("button", { type: "submit", className: "btn btn-primary" }, [
          icon("plus"),
          "Record Expense"
        ])
      ])
    ]
  );
  return form;
}
