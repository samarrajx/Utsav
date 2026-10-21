import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseDate,
  toISODateString,
  addDays,
  addWeeks,
  daysBetween,
  formatDisplayDate,
  scheduleMilestones
} from "../../web/js/engine/dates.js";

describe("Engine: dates.js", () => {
  describe("Date parsing and arithmetic across boundaries", () => {
    it("should format dates to ISO string", () => {
      const d = parseDate("2026-11-20");
      assert.equal(toISODateString(d), "2026-11-20");
    });

    it("should handle month boundaries cleanly", () => {
      // 2026-11-05 minus 2 weeks = 2026-10-22
      const result = addWeeks("2026-11-05", -2);
      assert.equal(result, "2026-10-22");
    });

    it("should handle year boundaries cleanly", () => {
      // 2027-01-15 minus 4 weeks = 2026-12-18
      const result = addWeeks("2027-01-15", -4);
      assert.equal(result, "2026-12-18");
    });

    it("should handle leap year boundaries correctly", () => {
      // 2028 is a leap year (Feb has 29 days)
      // 2028-03-07 minus 1 week = 2028-02-29
      const leapMinusOneWeek = addWeeks("2028-03-07", -1);
      assert.equal(leapMinusOneWeek, "2028-02-29");

      // 2028-02-28 plus 1 day = 2028-02-29
      assert.equal(addDays("2028-02-28", 1), "2028-02-29");
      // 2028-02-29 plus 1 day = 2028-03-01
      assert.equal(addDays("2028-02-29", 1), "2028-03-01");

      // Non-leap year: 2027-02-28 plus 1 day = 2027-03-01
      assert.equal(addDays("2027-02-28", 1), "2027-03-01");
    });

    it("should compute daysBetween accurately", () => {
      assert.equal(daysBetween("2026-10-01", "2026-10-21"), 20);
      assert.equal(daysBetween("2026-10-21", "2026-10-01"), -20);
      assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
    });

    it("should format display dates nicely", () => {
      const display = formatDisplayDate("2026-11-20");
      assert.ok(display.includes("2026") && (display.includes("Nov") || display.includes("11")));
    });

    it("should throw on invalid date input", () => {
      assert.throws(() => parseDate("invalid-date-string"));
    });
  });

  describe("scheduleMilestones & Overdue Pull-Forward with Injected Clock", () => {
    it("should back-schedule milestones and flag overdue items using injected clock", () => {
      // Freeze clock to 2026-06-01
      const mockNow = () => new Date(Date.UTC(2026, 5, 1)); // 2026-06-01

      // Event is on 2026-08-01 (approx 8.7 weeks away)
      const eventDate = "2026-08-01";

      const milestoneTemplates = [
        { id: "m1", title: "Book venue", weeksBefore: 24, tasks: ["Shortlist", "Visit"] }, // 24 weeks before ~ Feb 2026 (OVERDUE)
        { id: "m2", title: "Lock caterer", weeksBefore: 16, tasks: ["Tasting"] }, // 16 weeks before ~ April 2026 (OVERDUE)
        { id: "m3", title: "Send invites", weeksBefore: 4, tasks: ["Address list"] }, // 4 weeks before ~ July 2026 (FUTURE)
        { id: "m4", title: "Event day", weeksBefore: 0, tasks: ["Celebrate"] } // 0 weeks before ~ Aug 2026 (FUTURE)
      ];

      const scheduled = scheduleMilestones(eventDate, milestoneTemplates, mockNow);

      // m1 was due in Feb 2026 -> overdue relative to June 1, 2026
      assert.equal(scheduled[0].overdue, true);
      assert.equal(scheduled[0].status, "overdue");
      assert.equal(scheduled[0].actionNote, "Do now");
      assert.equal(scheduled[0].dueDate, "2026-06-01"); // Pulled forward to mockNow
      assert.equal(scheduled[0].tasks[0].overdue, true);

      // m2 was due in April 2026 -> overdue relative to June 1, 2026
      assert.equal(scheduled[1].overdue, true);
      assert.equal(scheduled[1].dueDate, "2026-06-01");

      // m3 is due 4 weeks before Aug 1 = 2026-07-04 -> in the future relative to June 1
      assert.equal(scheduled[2].overdue, false);
      assert.equal(scheduled[2].status, "pending");
      assert.equal(scheduled[2].dueDate, "2026-07-04");
      assert.equal(scheduled[2].actionNote, undefined);

      // m4 is event day = 2026-08-01
      assert.equal(scheduled[3].overdue, false);
      assert.equal(scheduled[3].dueDate, "2026-08-01");
    });
  });
});
