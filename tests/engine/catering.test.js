import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateAttendance,
  calculateAttendanceFromList,
  calculateCateringEstimate
} from "../../web/js/engine/catering.js";

describe("Engine: catering.js", () => {
  describe("calculateAttendance", () => {
    it("should calculate expected attendance according to documented formula", () => {
      // 100 confirmed, 40 pending, 20 declined, default showUpRate = 0.75
      // Expected = 100 + (40 * 0.75) = 130
      const result = calculateAttendance({
        confirmed: 100,
        pending: 40,
        declined: 20
      });

      assert.equal(result.confirmed, 100);
      assert.equal(result.pending, 40);
      assert.equal(result.declined, 20);
      assert.equal(result.totalInvited, 160);
      assert.equal(result.showUpRate, 0.75);
      assert.equal(result.expectedAttendance, 130);
    });

    it("should allow custom showUpRate", () => {
      // 50 confirmed, 20 pending with 50% show up rate
      // Expected = 50 + (20 * 0.5) = 60
      const result = calculateAttendance({
        confirmed: 50,
        pending: 20,
        declined: 10,
        showUpRate: 0.5
      });

      assert.equal(result.expectedAttendance, 60);
    });

    it("should handle 0 RSVPs safely", () => {
      const result = calculateAttendance({});
      assert.equal(result.expectedAttendance, 0);
      assert.equal(result.totalInvited, 0);
    });
  });

  describe("calculateAttendanceFromList", () => {
    it("should aggregate guest statuses from an array of guest records", () => {
      const guests = [
        { name: "A", status: "confirmed" },
        { name: "B", status: "confirmed" },
        { name: "C", status: "confirmed" },
        { name: "D", status: "pending" },
        { name: "E", status: "pending" },
        { name: "F", status: "pending" },
        { name: "G", status: "pending" },
        { name: "H", status: "declined" }
      ];
      // 3 confirmed + 4 * 0.75 = 6
      const result = calculateAttendanceFromList(guests, 0.75);
      assert.equal(result.confirmed, 3);
      assert.equal(result.pending, 4);
      assert.equal(result.declined, 1);
      assert.equal(result.expectedAttendance, 6);
    });
  });

  describe("calculateCateringEstimate", () => {
    it("should compute plate requirements with safety buffer and total cost", () => {
      // 100 expected attendance, ₹1500 per plate, 5% buffer
      // Buffer = 5 plates -> 105 plates to order
      // Total cost = 105 * 1500 = 157,500
      const estimate = calculateCateringEstimate({
        expectedAttendance: 100,
        perPlateCost: 1500,
        bufferPercent: 5
      });

      assert.equal(estimate.expectedAttendance, 100);
      assert.equal(estimate.bufferPlates, 5);
      assert.equal(estimate.platesToOrder, 105);
      assert.equal(estimate.baseCateringCost, 150000);
      assert.equal(estimate.totalCateringCost, 157500);
    });
  });
});
