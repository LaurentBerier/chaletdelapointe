import assert from "node:assert/strict";
import test from "node:test";
import { bookingWindowError, getBookingWindow } from "./booking-window.ts";

test("the initial window includes 2027, but does not advance during 2027", () => {
  for (const instant of ["2026-11-23T12:00:00Z", "2027-01-01T05:00:00Z", "2028-01-01T04:59:59Z"]) {
    assert.equal(getBookingWindow(new Date(instant)).endDate, "2028-01-01");
  }
});

test("each next year opens at midnight in Quebec, not at midnight UTC", () => {
  for (const year of [2028, 2029, 2030]) {
    assert.equal(getBookingWindow(new Date(`${year}-01-01T04:59:59Z`)).endDate, `${year}-01-01`);
    assert.equal(getBookingWindow(new Date(`${year}-01-01T05:00:00Z`)).endDate, `${year + 1}-01-01`);
    assert.equal(getBookingWindow(new Date(`${year}-07-01T04:00:00Z`)).endDate, `${year + 1}-01-01`);
  }
});

test("checkout on the cutoff is allowed, but no closed night can be booked", () => {
  const now = new Date("2027-12-30T15:00:00Z");
  assert.equal(bookingWindowError("2027-12-30", "2028-01-01", now), null);
  assert.ok(bookingWindowError("2027-12-30", "2028-01-02", now));
  assert.ok(bookingWindowError("2028-01-01", "2028-01-02", now));
  assert.ok(bookingWindowError("2029-06-01", "2029-06-05", now));
});

test("opening a year allows its nights, including leap day, but not the next year", () => {
  const now = new Date("2028-01-01T05:00:00Z");
  assert.equal(bookingWindowError("2028-01-01", "2028-01-02", now), null);
  assert.equal(bookingWindowError("2028-02-29", "2028-03-01", now), null);
  assert.equal(bookingWindowError("2028-12-31", "2029-01-01", now), null);
  assert.ok(bookingWindowError("2028-12-31", "2029-01-02", now));
});
