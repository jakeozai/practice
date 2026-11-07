import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAshby, parseGreenhouse, parseLever, parseRecruitee, parseSource, sourceUrl } from "./adapters";
import { bodyHash, escapedHtmlToText, htmlToText } from "./text";

test("greenhouse: decodes the double-escaped content", () => {
  const out = parseGreenhouse({
    jobs: [
      {
        id: 4650951101,
        title: " Korean Speaker - Freelance AI Trainer Project ",
        absolute_url: "https://job-boards.greenhouse.io/agency/jobs/4650951101",
        location: { name: "South Korea" },
        content: "&lt;p&gt;Are you fluent in Korean?&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Remote&amp;nbsp;work&lt;/li&gt;&lt;/ul&gt;",
        metadata: null,
      },
    ],
    meta: { total: 1 },
  });
  assert.deepEqual(out, [
    {
      external_id: "4650951101",
      url: "https://job-boards.greenhouse.io/agency/jobs/4650951101",
      title: "Korean Speaker - Freelance AI Trainer Project",
      location_raw: "South Korea",
      body: "Are you fluent in Korean?\n- Remote work",
    },
  ]);
});

test("lever: joins description, lists and locations", () => {
  const [p] = parseLever([
    {
      id: "d70afa3f-68d0-495b-b0b3-d0a2ec891b67",
      text: "AI Data Specialist - Korean",
      hostedUrl: "https://jobs.lever.co/rws/d70afa3f",
      categories: { location: "Seoul", allLocations: ["Seoul"], commitment: "Temporary/Contract" },
      country: "KR",
      workplaceType: "remote",
      descriptionPlain: "Freelance, work from home.",
      lists: [{ text: "Requirements", content: "<li>Native Korean</li><li>English B2+</li>" }],
      additionalPlain: "",
      createdAt: 1750000000000,
    },
  ]);
  assert.equal(p.location_raw, "Seoul / KR / remote");
  assert.equal(p.body, "Freelance, work from home.\n\nRequirements\n- Native Korean\n- English B2+");
});

test("ashby: skips unlisted jobs and adds Remote", () => {
  const out = parseAshby({
    apiVersion: "1",
    jobs: [
      {
        id: "a1",
        title: "AI Tutor",
        location: "San Francisco",
        secondaryLocations: [{ location: "New York" }],
        isRemote: true,
        isListed: true,
        jobUrl: "https://jobs.ashbyhq.com/x/a1",
        descriptionPlain: "Teach models.",
      },
      { id: "a2", title: "Hidden", isListed: false, jobUrl: "https://jobs.ashbyhq.com/x/a2" },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].location_raw, "San Francisco / New York / Remote");
});

test("recruitee: published offers only, description + requirements", () => {
  const out = parseRecruitee({
    offers: [
      {
        id: 2819269,
        title: "Korean Annotator (Freelance)",
        careers_url: "https://transperfect.com/o/korean-annotator",
        location: "Seoul, South Korea",
        country: "South Korea",
        country_code: "KR",
        remote: true,
        status: "published",
        description: "<p>Label Korean audio.</p>",
        requirements: "<p>Fluent Korean</p>",
      },
      { id: 2, title: "Draft", careers_url: "https://transperfect.com/o/draft", status: "draft" },
    ],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].location_raw, "Seoul, South Korea / South Korea / KR / Remote");
  assert.equal(out[0].body, "Label Korean audio.\n\nFluent Korean");
});

test("parseSource drops entries without an http(s) link", () => {
  const out = parseSource("greenhouse", {
    jobs: [{ id: 1, title: "X", absolute_url: "javascript:alert(1)", content: "" }],
  });
  assert.deepEqual(out, []);
});

test("unexpected response shape throws instead of storing garbage", () => {
  assert.throws(() => parseGreenhouse({ data: [] }));
  assert.throws(() => parseLever({ jobs: [] }));
});

test("sourceUrl validates the board token", () => {
  assert.equal(sourceUrl("lever", "rws"), "https://api.lever.co/v0/postings/rws?mode=json");
  assert.equal(sourceUrl("recruitee", "transperfect"), "https://transperfect.recruitee.com/api/offers/");
  assert.throws(() => sourceUrl("greenhouse", "../admin"));
  assert.throws(() => sourceUrl("recruitee", "evil.com/x"));
});

test("text helpers", () => {
  assert.equal(htmlToText("<p>A&nbsp;&amp;&#39;B&#x27;</p><br><p>C</p>"), "A &'B'\n\nC");
  assert.equal(escapedHtmlToText("&lt;b&gt;Hi&lt;/b&gt;"), "Hi");
  assert.equal(bodyHash("a  b\n c"), bodyHash("a b c"), "hash ignores whitespace-only edits");
  assert.notEqual(bodyHash("a b"), bodyHash("a c"));
});
