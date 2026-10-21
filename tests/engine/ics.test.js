import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildICS,
  escapeICalText,
  formatICalDate,
  formatICalDateTime
} from "../../web/js/engine/ics.js";

describe("Engine: ics.js", () => {
  it("should escape special characters in iCal text according to RFC 5545", () => {
    const raw = "Dinner, Dancing; Fun & Family\\Friends\nNext Line";
    const escaped = escapeICalText(raw);
    assert.equal(escaped, "Dinner\\, Dancing\\; Fun & Family\\\\Friends\\nNext Line");
  });

  it("should format dates in RFC 5545 formats", () => {
    const dateStr = "2026-11-20";
    assert.equal(formatICalDate(dateStr), "20261120");

    const utcDate = new Date(Date.UTC(2026, 10, 20, 14, 30, 0));
    assert.equal(formatICalDateTime(utcDate), "20261120T143000Z");
  });

  it("should generate a strictly valid RFC 5545 .ics file with CRLF endings", () => {
    const event = {
      title: "Rohan & Aisha Wedding",
      date: "2026-12-15",
      milestones: [
        { id: "m1", title: "Book Grand Venue", dueDate: "2026-06-15" },
        { id: "m2", title: "Final Tasting", dueDate: "2026-10-15" }
      ],
      tasks: [
        { milestoneId: "m1", title: "Review contract", done: true },
        { milestoneId: "m1", title: "Pay advance", done: false }
      ]
    };

    const icsContent = buildICS(event);

    // Must use CRLF
    assert.ok(icsContent.includes("\r\n"));

    // Check VCALENDAR boundaries
    assert.ok(icsContent.startsWith("BEGIN:VCALENDAR\r\n"));
    assert.ok(icsContent.endsWith("END:VCALENDAR\r\n"));

    // Check mandatory RFC 5545 headers
    assert.ok(icsContent.includes("VERSION:2.0\r\n"));
    assert.ok(icsContent.includes("PRODID:-//Utsav//AI Celebration Planner//EN\r\n"));
    assert.ok(icsContent.includes("CALSCALE:GREGORIAN\r\n"));

    // Check VEVENT blocks
    const veventCount = (icsContent.match(/BEGIN:VEVENT/g) || []).length;
    // 1 main event + 2 milestones = 3 VEVENTs
    assert.equal(veventCount, 3);

    // Check milestone details
    assert.ok(icsContent.includes("SUMMARY:🎉 Rohan & Aisha Wedding\r\n"));
    assert.ok(icsContent.includes("SUMMARY:📌 Book Grand Venue\r\n"));
    assert.ok(icsContent.includes("DTSTART;VALUE=DATE:20261215\r\n"));
    assert.ok(icsContent.includes("DTSTART;VALUE=DATE:20260615\r\n"));
  });

  it("should handle empty milestones safely", () => {
    const ics = buildICS({ title: "Solo Event", date: "2026-10-10" });
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("END:VCALENDAR"));
  });
});
