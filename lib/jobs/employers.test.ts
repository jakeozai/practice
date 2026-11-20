import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPLOYERS, companyKey, employerFor, employerLine, indexEmployers, isListable, listedCompanyNames, type Employer } from "./employers";

const sample: Employer[] = [
  {
    names: ["G2i", "G2i Inc."],
    legalName: "G2i Inc.",
    address: "1 Example St, Miami, FL, USA",
    phone: null,
    source: "https://www.g2i.co/terms",
    checked: "2026-11-20",
  },
  { names: ["NoContact"], legalName: "NoContact Ltd", address: null, phone: null, source: "https://example.com", checked: "2026-11-20" },
];
const idx = indexEmployers(sample);

test("company names match ignoring case, punctuation and Inc./LLC", () => {
  assert.equal(companyKey("G2i Inc."), companyKey("g2i"));
  assert.equal(companyKey("Welo Data"), companyKey("welo-data"));
  assert.notEqual(companyKey("Invisible"), companyKey("Invisible Labs"));
  assert.equal(employerFor("G2I INC", idx)?.legalName, "G2i Inc.");
  assert.equal(employerFor("Unknown Co", idx), null);
  assert.equal(employerFor(null, idx), null);
});

test("only identified companies with an address or phone go out; anonymous marketplaces never", () => {
  assert.equal(isListable({ company: "G2i", url: "https://himalayas.app/companies/g2i/jobs/x" }, idx), true);
  assert.equal(isListable({ company: "NoContact", url: "https://example.com/j" }, idx), false, "no address or phone");
  assert.equal(isListable({ company: "Unknown", url: "https://example.com/j" }, idx), false, "not checked");
  assert.equal(isListable({ company: "G2i", url: "https://www.freelancer.com/projects/123" }, idx), false, "anonymous client");
  assert.equal(employerLine("G2i Inc.", idx), "G2i Inc. · 1 Example St, Miami, FL, USA");
  assert.equal(employerLine("NoContact", idx), null);
  assert.deepEqual(listedCompanyNames(sample), ["G2i", "G2i Inc."]);
});

test("every entry in the real list is complete and traceable", () => {
  for (const e of EMPLOYERS) {
    assert.ok(e.names.length > 0 && e.legalName.trim(), `${e.legalName}: names and legal name`);
    assert.ok(e.address || e.phone, `${e.legalName}: an address or phone is the point of the entry`);
    assert.match(e.source, /^https:\/\//, `${e.legalName}: source page`);
    assert.match(e.checked, /^\d{4}-\d{2}-\d{2}$/, `${e.legalName}: checked date`);
  }
  const keys = EMPLOYERS.flatMap((e) => e.names.map(companyKey));
  assert.equal(new Set(keys).size, keys.length, "a company name appears in two entries");
});
