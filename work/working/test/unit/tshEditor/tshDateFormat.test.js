// Tests of the Date/time widget text tshDateFormat.js: TSH Soft's own replacements before Delphi FormatDateTime
// (FUN_00a9cc5c: lowercase m is minutes), Delphi tokens, literals, Polish genitive months (table 0x00ade260).
// Run: npm --prefix work/working/tools test  (from the repo root)
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const D = require(path.join(__dirname, "../../../src/renderer/app/desktop/tshEditor/tshDateFormat.js"));

// Saturday 2026-11-14 22:25:26.007 (plan 2026-11-14, task 5).
const AT = new Date(2026, 10, 14, 22, 25, 26, 7);
const pl = (f, date = AT) => D.formatTshDate(f, date, "pl");
const en = (f, date = AT) => D.formatTshDate(f, date, "en");

describe("TSH date formats", () => {
  it("formats TSH's default format", () => {
    assert.equal(pl("dd.MM.yyyy hh:mm:ss"), "14.11.2026 22:25:26");
  });
  it("writes day and month names in the input language, the Polish month in the genitive as TSH does", () => {
    assert.equal(pl("dddd, d MMMM yyyy"), "sobota, 14 listopada 2026");
    assert.equal(en("dddd, d MMMM yyyy"), "Saturday, 14 November 2026");
    assert.equal(D.formatTshDate("dddd, d MMMM yyyy", AT, "PL"), "sobota, 14 listopada 2026");
    assert.equal(D.formatTshDate("dddd, d MMMM yyyy", AT, "de"), "Saturday, 14 November 2026");
    assert.equal(pl("d MMMM", new Date(2026, 4, 1)), "1 maja");
  });
  it("formats minutes with n and nn", () => {
    assert.equal(pl("hh:nn"), "22:25");
    assert.equal(pl("h:n", new Date(2026, 0, 2, 3, 4, 5)), "3:4");
  });
  it("reads lowercase m as minutes everywhere, because TSH replaces it before Delphi sees it", () => {
    assert.equal(pl("ddd dd.mm.yy"), "sob. 14.25.26");
    assert.equal(pl("ddd dd.MM.yy"), "sob. 14.11.26");
    assert.equal(pl("mmmm"), "25");
  });
  it("reads uppercase M right after an H token as minutes (Delphi)", () => {
    assert.equal(pl("HH:MM"), "22:25");
    assert.equal(pl("HH dd MM"), "22 14 11");
  });
  it("keeps quoted literals", () => {
    assert.equal(pl("'godz.' hh"), "godz. 22");
    assert.equal(pl('"Dzień" d'), "Dzień 14");
    assert.equal(pl("'open"), "open");
  });
  it("gives an empty text for an empty format", () => {
    assert.equal(pl(""), "");
    assert.equal(D.formatTshDate(undefined, AT, "pl"), "");
  });
  it("passes unknown letters and other characters through", () => {
    assert.equal(pl("Q-x_w!"), "Q-x_w!");
  });
  it("is case-insensitive for the tokens", () => {
    assert.equal(pl("YYYY DD hh:NN SS"), "2026 14 22:25 26");
    assert.equal(pl("yy y"), "26 26");
  });
  it("expands TSH's own shortcuts dddddd, ddddd, tt, t and c", () => {
    assert.equal(pl("dddddd"), "14 listopada 2026");
    assert.equal(en("dddddd"), "14 November 2026");
    assert.equal(pl("ddddd"), "14-11-2026");
    assert.equal(pl("tt"), "22:25:26");
    assert.equal(pl("t"), "22:25");
    assert.equal(pl("c"), "2026-11-14 22:25:26");
  });
  it("formats short names, one-digit numbers, milliseconds and the separators of the language", () => {
    assert.equal(pl("ddd MMM d.M"), "sob. lis 14.11");
    assert.equal(en("ddd MMM yyyy/MM/dd"), "Sat Nov 2026/11/14");
    assert.equal(pl("yyyy/MM/dd"), "2026.11.14");
    assert.equal(pl("ss.z ss.zzz"), "26.7 26.007");
  });
  it("switches hh to 12 hours with AM/PM and A/P", () => {
    assert.equal(en("h:nn AM/PM"), "10:25 PM");
    assert.equal(en("h:nn a/p"), "10:25 p");
    assert.equal(en("hh AMPM", new Date(2026, 0, 1, 0, 5)), "12 AM");
    assert.equal(en("h AAAA AAA"), "22 Saturday Sat");
  });
});
