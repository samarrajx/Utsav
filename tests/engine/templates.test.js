import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, EVENT_TYPES, getEventTemplate } from "../../web/js/engine/templates.js";

describe("Engine: templates.js", () => {
  it("should have templates defined for wedding, birthday, and community", () => {
    assert.ok(TEMPLATES[EVENT_TYPES.WEDDING]);
    assert.ok(TEMPLATES[EVENT_TYPES.BIRTHDAY]);
    assert.ok(TEMPLATES[EVENT_TYPES.COMMUNITY]);
  });

  it("should ensure default weights sum to EXACTLY 100 for all templates", () => {
    for (const type of Object.values(EVENT_TYPES)) {
      const template = TEMPLATES[type];
      const weightSum = template.defaultWeights.reduce((s, c) => s + c.weight, 0);
      assert.equal(weightSum, 100, `Template ${type} weights sum to ${weightSum}, expected 100`);
    }
  });

  it("should match documented wedding budget weights from PLAN.md", () => {
    const wedding = TEMPLATES[EVENT_TYPES.WEDDING];
    const weightMap = Object.fromEntries(wedding.defaultWeights.map((w) => [w.id, w.weight]));

    assert.equal(weightMap.venue, 31);
    assert.equal(weightMap.catering, 26);
    assert.equal(weightMap.decor, 18);
    assert.equal(weightMap.photography, 12);
    assert.equal(weightMap.attire, 8);
    assert.equal(weightMap.entertainment, 5);
  });

  it("should return wedding template as fallback for unknown type", () => {
    const fallback = getEventTemplate("corporate_conference");
    assert.equal(fallback.type, EVENT_TYPES.WEDDING);
  });
});
