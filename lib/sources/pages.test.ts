import { test } from "node:test";
import assert from "node:assert/strict";
import { robotsAllows } from "./robots";
import { canonicalUrl, parseSitemap } from "./sitemap";
import { findJobPosting, jobPostingLocation, jobPostingToText } from "./jsonld";

// Shaped like work.mercor.com/robots.txt (2026-11-07)
const mercorRobots = `# *
User-agent: *
Allow: /
Disallow: /api/
Disallow: /jobs/apply/
Disallow: /offer/*
Sitemap: https://work.mercor.com/sitemap.xml`;

test("robots: longest match wins, wildcards, groups", () => {
  assert.equal(robotsAllows(mercorRobots, "https://work.mercor.com/jobs/list_AAAB/music-producer"), true);
  assert.equal(robotsAllows(mercorRobots, "https://work.mercor.com/jobs/apply/interview"), false);
  assert.equal(robotsAllows(mercorRobots, "https://work.mercor.com/api/listings"), false);
  assert.equal(robotsAllows(mercorRobots, "https://work.mercor.com/offer/123"), false);
  assert.equal(robotsAllows("", "https://x.example/anything"), true, "no robots.txt → allowed");
  const specific = "User-agent: *\nAllow: /\n\nUser-agent: AIJob5Bot\nDisallow: /jobs/";
  assert.equal(robotsAllows(specific, "https://x.example/jobs/1"), false, "our own group applies");
  assert.equal(robotsAllows("User-agent: *\nDisallow: /*.pdf$", "https://x.example/a.pdf"), false);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /*.pdf$", "https://x.example/a.pdf?x=1"), true);
  assert.equal(robotsAllows("User-agent: *\nDisallow:", "https://x.example/jobs"), true, "empty Disallow allows all");
  assert.equal(robotsAllows("User-agent: *\nDisallow: /", "https://x.example/jobs"), false);
});

test("sitemap index vs urlset; canonical urls", () => {
  const index = parseSitemap(
    `<?xml version="1.0"?><sitemapindex><sitemap><loc>https://www.opentrain.ai/sitemap-jobs/1.xml</loc></sitemap></sitemapindex>`,
  );
  assert.deepEqual(index, { isIndex: true, locs: ["https://www.opentrain.ai/sitemap-jobs/1.xml"] });
  const set = parseSitemap(`<urlset><url><loc> https://a.example/jobs/x?y=1&amp;z=2 </loc><lastmod>2026-11-06</lastmod></url></urlset>`);
  assert.deepEqual(set, { isIndex: false, locs: ["https://a.example/jobs/x?y=1&z=2"] });
  assert.equal(canonicalUrl("https://a.example/jobs/x/?ref=1#top"), "https://a.example/jobs/x");
});

const page = (ld: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head></html>`;

test("JSON-LD JobPosting: applicant countries win over office location", () => {
  const job = findJobPosting(
    page({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "AI Content Annotator (Mandarin, C1 English)",
      description: "<p>Annotate content.</p>",
      datePosted: "2025-09-02T12:48:31.626Z",
      jobLocationType: "TELECOMMUTE",
      applicantLocationRequirements: [
        { "@type": "Country", name: "Indonesia" },
        { "@type": "Country", name: "Malaysia" },
      ],
      jobLocation: { "@type": "Place", address: { addressCountry: "US" } },
      baseSalary: { "@type": "MonetaryAmount", currency: "USD", value: { "@type": "QuantitativeValue", value: 12, unitText: "HOUR" } },
    }),
  );
  assert.ok(job);
  assert.equal(jobPostingLocation(job), "Indonesia / Malaysia / Remote");
  const { title, body } = jobPostingToText(job);
  assert.equal(title, "AI Content Annotator (Mandarin, C1 English)");
  assert.match(body, /^Annotate content\./);
  assert.match(body, /Pay: 12 USD per hour/);
  assert.match(body, /Posted: 2025-09-02/);
});

test("JSON-LD: office location, @graph, and pages without a JobPosting", () => {
  const mercor = findJobPosting(
    page({
      "@graph": [
        { "@type": "BreadcrumbList" },
        {
          "@type": "JobPosting",
          title: "Music Producer (AI Evaluation)",
          jobLocation: { "@type": "Place", address: { addressLocality: "United States", addressCountry: "USA" } },
          baseSalary: { currency: "USD", value: { minValue: 70, maxValue: 120, unitText: "HOUR" } },
        },
      ],
    }),
  );
  assert.ok(mercor);
  assert.equal(jobPostingLocation(mercor), "United States, USA");
  assert.match(jobPostingToText(mercor).body, /Pay: 70-120 USD per hour/);
  assert.equal(findJobPosting(page({ "@type": "WebSite" })), null);
  assert.equal(findJobPosting("<script type='application/ld+json'>{broken</script>"), null);
});

test("listJobUrls: follows a sitemap index, filters by pattern and robots", async () => {
  const { listJobUrls, parseJobPage, PAGE_SITES } = await import("./pages");
  const files: Record<string, string> = {
    "https://www.opentrain.ai/sitemap-jobs.xml":
      "<sitemapindex><sitemap><loc>https://www.opentrain.ai/sitemap-jobs/1.xml</loc></sitemap><sitemap><loc>https://evil.example/s.xml</loc></sitemap></sitemapindex>",
    "https://www.opentrain.ai/sitemap-jobs/1.xml":
      "<urlset><url><loc>https://www.opentrain.ai/jobs/generalist-for-data-annotation--cmw5n4qh0004n08jq0px7mh3r/</loc></url>" +
      "<url><loc>https://www.opentrain.ai/jobs/private-x/</loc></url><url><loc>https://www.opentrain.ai/blog/post</loc></url></urlset>",
  };
  const fetched: string[] = [];
  const fetchText = async (u: string) => (fetched.push(u), files[u] ?? null);
  const robots = "User-agent: *\nAllow: /\nDisallow: /jobs/private-";
  const urls = await listJobUrls("www.opentrain.ai", PAGE_SITES["www.opentrain.ai"], robots, fetchText);
  assert.deepEqual(urls, ["https://www.opentrain.ai/jobs/generalist-for-data-annotation--cmw5n4qh0004n08jq0px7mh3r"]);
  assert.ok(!fetched.includes("https://evil.example/s.xml"), "never leaves the site's host");

  await assert.rejects(
    listJobUrls("www.opentrain.ai", PAGE_SITES["www.opentrain.ai"], "User-agent: *\nDisallow: /", fetchText),
    /robots\.txt disallows/,
  );

  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "JobPosting",
    title: "Generalist for Data Annotation",
    description: "Label data.",
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: [{ "@type": "Country", name: "South Korea" }],
  })}</script>`;
  const p = parseJobPage(urls[0], html);
  assert.equal(p?.location_raw, "South Korea / Remote");
  assert.equal(p?.external_id, urls[0]);
  assert.equal(parseJobPage(urls[0], "<html></html>"), null);
});

test("page site patterns match real URL shapes", async () => {
  const { PAGE_SITES } = await import("./pages");
  const ok: [string, string][] = [
    ["work.mercor.com", "https://work.mercor.com/jobs/list_AAABoa1sLA0lq8iNfmRFUqbI/music-producer-audio-post-specialist-ai-evaluation"],
    ["www.opentrain.ai", "https://www.opentrain.ai/jobs/video-editor--cmw5xbalk006608l80rlwg91h"],
    ["www.oneforma.com", "https://www.oneforma.com/projects/indoor-3d-home-capture-study"],
  ];
  for (const [host, url] of ok) assert.ok(PAGE_SITES[host].jobUrl.test(url), url);
  assert.ok(!PAGE_SITES["work.mercor.com"].jobUrl.test("https://work.mercor.com/jobs/apply/interview-scheduled"));
});
