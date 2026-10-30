/**
 * types.js - Central JSDoc type definitions for Utsav
 *
 * Provides shared type declarations for events, plans, tasks,
 * milestones, vendors, ideas, and allowlisted patch operations.
 */

/**
 * @typedef {"wedding" | "birthday" | "community"} EventType
 */

/**
 * @typedef {"INR" | "USD" | "EUR" | "GBP" | "AED"} CurrencyCode
 */

/**
 * @typedef {"comfortable" | "tight" | "short" | "unrealistic"} FeasibilityBand
 */

/**
 * @typedef {Object} BudgetCategory
 * @property {string} id
 * @property {string} name
 * @property {number} weight
 * @property {number} planned
 * @property {number} [spent]
 */

/**
 * @typedef {Object} EventBudget
 * @property {number} total
 * @property {BudgetCategory[]} categories
 */

/**
 * @typedef {Object} Milestone
 * @property {string} id
 * @property {string} title
 * @property {number} weeksBefore
 * @property {string} dueDate - ISO YYYY-MM-DD
 * @property {"pending" | "completed"} [status]
 * @property {boolean} [overdue]
 * @property {Task[]} [tasks]
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} [milestoneId]
 * @property {string} title
 * @property {string|null} [due] - ISO YYYY-MM-DD
 * @property {boolean} done
 * @property {boolean} [overdue]
 */

/**
 * @typedef {Object} Vendor
 * @property {string} id
 * @property {string} category
 * @property {string} name
 * @property {"to_find" | "contacted" | "quoted" | "booked"} status
 * @property {number} quote
 * @property {string} bookBy - ISO YYYY-MM-DD
 * @property {string[]} [lookFor]
 * @property {string[]} [askThem]
 */

/**
 * @typedef {Object} Idea
 * @property {string} id
 * @property {string} section
 * @property {string} title
 * @property {string} [whyItFits]
 * @property {boolean} saved
 */

/**
 * @typedef {Object} Guest
 * @property {string} id
 * @property {string} name
 * @property {string} [contact]
 * @property {"pending" | "confirmed" | "declined"} status
 * @property {string} [diet]
 */

/**
 * @typedef {Object} Expense
 * @property {string} id
 * @property {string} categoryId
 * @property {string} label
 * @property {number} amount
 * @property {string} date - ISO YYYY-MM-DD
 */

/**
 * @typedef {Object} TradeOff
 * @property {string} type
 * @property {string} detail
 * @property {string} [category]
 * @property {number} [targetGuests]
 * @property {number} [targetPerPlate]
 * @property {number} [savings]
 */

/**
 * @typedef {Object} FeasibilityVerdict
 * @property {FeasibilityBand} band
 * @property {number} ratio
 * @property {string} summary
 * @property {number} minimumCost
 * @property {number} comfortableCost
 * @property {TradeOff[]} tradeOffs
 */

/**
 * @typedef {Object} CritiqueRisk
 * @property {"high" | "medium" | "low"} severity
 * @property {string} title
 * @property {string} detail
 * @property {string} [suggestedFix]
 */

/**
 * @typedef {Object} CritiqueReport
 * @property {CritiqueRisk[]} risks
 */

/**
 * @typedef {Object} EventPlan
 * @property {number} schemaVersion
 * @property {string} id
 * @property {boolean} [isBaselineFallback]
 * @property {EventType} type
 * @property {string} title
 * @property {string} date - ISO YYYY-MM-DD
 * @property {string} city
 * @property {string} countryCode
 * @property {CurrencyCode} currency
 * @property {{ target: number, list: Guest[] }} guests
 * @property {EventBudget} budget
 * @property {Expense[]} expenses
 * @property {Milestone[]} milestones
 * @property {Task[]} tasks
 * @property {Vendor[]} vendors
 * @property {Idea[]} ideas
 * @property {FeasibilityVerdict} feasibility
 * @property {CritiqueReport} [critique]
 * @property {string} [language]
 */

/**
 * @typedef {"set_category_weight" | "set_category_planned" | "add_task" | "remove_task" | "move_milestone" | "add_milestone" | "add_idea" | "remove_idea" | "add_vendor_category" | "set_budget_total"} PatchOp
 */

/**
 * @typedef {Object} Patch
 * @property {PatchOp} op
 * @property {string} [categoryId]
 * @property {number} [weight]
 * @property {number} [amount]
 * @property {number} [total]
 * @property {string} [milestoneId]
 * @property {string} [title]
 * @property {string} [due]
 * @property {string} [dueDate]
 * @property {number} [weeksBefore]
 * @property {string} [taskId]
 * @property {string} [newDueDate]
 * @property {string} [section]
 * @property {string} [whyItFits]
 * @property {string} [ideaId]
 * @property {string} [category]
 */

/**
 * @typedef {Object} PatchDiff
 * @property {PatchOp} op
 * @property {string} summary
 * @property {Record<string, any>} details
 */

/**
 * @typedef {Object} PatchResult
 * @property {EventPlan} plan
 * @property {PatchDiff} diff
 */

export {};
