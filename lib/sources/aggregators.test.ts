import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HIMALAYAS_NO_RESTRICTION,
  companyFromBody,
  coveredCompanyKeys,
  himalayasListing,
  himalayasUrl,
  jobicyListing,
  jobicyUrl,
  parseHimalayas,
  parseJobicy,
} from "./aggregators";
import { koreaEligibleFromLocation } from "../eligibility";

// Shapes of live responses (2026-11-14), trimmed.
const jobicy = {
  apiVersion: "2.2.19",
  jobs: [
    { id: 1, url: "https://jobicy.com/jobs/1-motion-designer", jobTitle: "Motion Designer (Contract)", companyName: "Acme Studio", jobGeo: "Anywhere", jobType: ["Contract"], jobDescription: "<p>Make <b>short</b> videos.</p>", salaryMin: 30, salaryMax: 45, salaryCurrency: "USD", salaryPeriod: "hourly" },
    { id: 2, url: "https://jobicy.com/jobs/2-engineer", jobTitle: "Staff Engineer", companyName: "Flex", jobGeo: "Anywhere", jobType: ["Full-Time"], jobDescription: "<p>Full time.</p>" },
    { id: 3, url: "https://jobicy.com/jobs/3-review", jobTitle: "English to Latvian Review Lead", companyName: "Welo Global", jobGeo: "South Korea,  Japan", jobType: ["Contract"], jobDescription: "<p>Review.</p>" },
    { id: 4, url: "https://jobicy.com/jobs/4-tutor", jobTitle: "Early Childhood Teacher (PT)", companyName: "Think Academy US", jobGeo: "Anywhere", jobType: ["Part-Time"] },
  ],
};

const himalayasPage = {
  comments: "Search results come 20 to a page.",
  totalCount: 579,
  jobs: [
    {
      guid: "https://himalayas.app/companies/simpletiger/jobs/web-developer",
      title: "Web Developer: WordPress & HubSpot (U.S. Based, Remote Contractor)",
      companyName: "SimpleTiger",
      applicationLink: "https://himalayas.app/companies/simpletiger/jobs/web-developer?utm_source=api",
      employmentType: "Contractor",
      locationRestrictions: [],
      description: "<p>Part-time contract web developer.</p>",
      minSalary: 20,
      maxSalary: 30,
      currency: "USD",
      salaryPeriod: "hourly",
      expiryDate: 1795799025,
    },
    {
      guid: "https://himalayas.app/companies/kirin/jobs/3d-artist",
      title: "3D Artist",
      companyName: "Kirin",
      applicationLink: "https://himalayas.app/companies/kirin/jobs/3d-artist?utm_source=api",
      employmentType: "Contractor",
      locationRestrictions: ["South Korea", "Japan"],
      description: "<p>Blender.</p>",
      expiryDate: 1700000000,
    },
  ],
};

const covered = coveredCompanyKeys(["Welo Data", "TransPerfect / DataForce", "Invisible (Freelance AI Trainer)"]);

test("Jobicy: short-term only, boards we already collect are skipped, company and pay lead the body", () => {
  const { posts, complete } = jobicyListing(parseJobicy(jobicy), covered);
  assert.deepEqual(posts.map((p) => p.external_id), ["1", "4"], "full-time out; Welo Global is collected from Welo's own board");
  assert.equal(complete, true, "fewer than a full page");
  const p = posts[0];
  assert.equal(p.url, "https://jobicy.com/jobs/1-motion-designer", "apply goes to the feed's own URL");
  assert.equal(companyFromBody(p.body), "Acme Studio");
  assert.match(p.body, /^Pay: USD 30-45 per hour$/m);
  assert.ok(p.body.endsWith("Make short videos."));
  assert.equal(p.location_raw, "Anywhere");
});

test("Himalayas: unique by guid, expired dropped, applicationLink kept, no restriction left to the extraction", () => {
  const page = parseHimalayas(himalayasPage);
  const { posts, complete } = himalayasListing([page, page], covered, true, new Date("2026-11-14T00:00:00Z"));
  assert.equal(complete, true);
  assert.deepEqual(posts.map((p) => p.title), ["Web Developer: WordPress & HubSpot (U.S. Based, Remote Contractor)"], "deduped; the expired 3D job is out");
  const p = posts[0];
  assert.equal(p.url, "https://himalayas.app/companies/simpletiger/jobs/web-developer?utm_source=api");
  assert.equal(p.location_raw, HIMALAYAS_NO_RESTRICTION);
  assert.equal(koreaEligibleFromLocation(p.location_raw), null, "not read as worldwide");
  assert.equal(companyFromBody(p.body), "SimpleTiger");
  assert.match(p.body, /^Pay: USD 20-30 per hour$/m);
});

test("Himalayas: listed countries become the location", () => {
  const page = parseHimalayas({ jobs: [{ ...himalayasPage.jobs[1], expiryDate: null }] });
  const [p] = himalayasListing([page], covered, false, new Date("2026-11-14T00:00:00Z")).posts;
  assert.equal(p.location_raw, "South Korea / Japan");
  assert.equal(koreaEligibleFromLocation(p.location_raw), true);
});

test("request URLs", () => {
  assert.equal(jobicyUrl("south-korea"), "https://jobicy.com/api/v2/remote-jobs?count=100&geo=south-korea");
  assert.equal(himalayasUrl("KR", "Part Time", 2), "https://himalayas.app/jobs/api/search?country=KR&employment_type=Part+Time&page=2");
});
