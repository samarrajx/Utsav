/**
 * tools.js - Deterministic tool wrappers over the Utsav planning engine
 *
 * Implements server-side tool calling and grounding facts generation.
 */

import {
  getEventTemplate,
  checkFeasibility,
  allocateBudget,
  scheduleMilestones
} from "../../web/js/engine/index.js";

export const ENGINE_TOOLS = {
  get_event_template: (params) => {
    return getEventTemplate(params?.type);
  },

  check_feasibility: (params) => {
    return checkFeasibility({
      type: params?.type,
      budget: params?.budget,
      currency: params?.currency,
      guests: params?.guests,
      city: params?.city,
      date: params?.date,
      countryCode: params?.countryCode
    });
  },

  allocate_budget: (params) => {
    return allocateBudget(params?.totalBudget, params?.categories);
  },

  schedule_milestones: (params) => {
    return scheduleMilestones(params?.eventDate, params?.milestones);
  }
};

/**
 * Execute an allowlisted engine tool by name
 * @param {string} toolName
 * @param {any} params
 * @returns {any}
 */
export function executeEngineTool(toolName, params) {
  const tool = ENGINE_TOOLS[toolName];
  if (!tool) {
    throw new Error(`Engine tool '${toolName}' not found`);
  }
  return tool(params);
}
