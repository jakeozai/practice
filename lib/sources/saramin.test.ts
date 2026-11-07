import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalSaraminUrl, parseSaramin, saraminSearchUrl, SaraminApiError } from "./saramin";
import { koreaEligibleFromLocation } from "../eligibility";
import { matchesJobKeywords } from "../jobs/keywords";

// Shaped like the documented sample response (oapi.saramin.co.kr/guide/job-search).
const sample = {
  jobs: {
    count: 2,
    start: 0,
    total: "7629",
    job: [
      {
        url: "http://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=27614114&utm_source=job-search-api&utm_medium=api&utm_campaign=saramin-job-search-api",
        active: 1,
        company: { detail: { href: "http://www.saramin.co.kr/zf_user/company-info/view?csn=1", name: "(주)예시데이터" } },
        position: {
          title: "AI 학습데이터 라벨링 재택 프리랜서",
          industry: { code: "301", name: "솔루션·SI·ERP·CRM" },
          location: { code: "101050", name: "서울 > 관악구" },
          "job-type": { code: "9", name: "프리랜서" },
          "job-code": { code: "2323", name: "데이터라벨링" },
          "experience-level": { code: 0, min: 0, max: 0, name: "경력무관" },
          "required-education-level": { code: "0", name: "학력무관" },
        },
        keyword: "데이터라벨링,AI,재택",
        salary: { code: "99", name: "면접후 결정" },
        id: "27614114",
        "posting-timestamp": "1559191564",
        "posting-date": "2026-11-05T13:46:04+0900",
        "expiration-date": "2026-11-30T23:59:59+0900",
      },
      {
        url: "http://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=2",
        active: 0,
        position: { title: "마감된 공고" },
        id: 2,
      },
    ],
  },
};

test("parses the documented response; closed postings are dropped", () => {
  const { total, postings } = parseSaramin(sample);
  assert.equal(total, 7629);
  assert.equal(postings.length, 1);
  const [p] = postings;
  assert.equal(p.external_id, "27614114");
  assert.equal(p.url, "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=27614114");
  assert.equal(p.title, "AI 학습데이터 라벨링 재택 프리랜서");
  assert.equal(p.location_raw, "서울 > 관악구 / South Korea");
  assert.match(p.body, /회사: \(주\)예시데이터/);
  assert.match(p.body, /근무형태: 프리랜서/);
  assert.match(p.body, /마감: 2026-11-30/);
  assert.equal(koreaEligibleFromLocation(p.location_raw), true);
  assert.equal(matchesJobKeywords(p.title, p.body), true);
});

test("API errors surface as SaraminApiError", () => {
  assert.throws(() => parseSaramin({ code: 2, message: "사용 불가능한 access-key 입니다." }), SaraminApiError);
  assert.throws(() => parseSaramin({ code: "4", message: "일일 최대 요청 가능 횟수 초과" }), /4/);
});

test("search URL: one keyword, short-term job types, max page size, newest first", () => {
  const u = new URL(saraminSearchUrl("KEY", "데이터 라벨링", ["2", "9"], 1));
  assert.equal(u.origin + u.pathname, "https://oapi.saramin.co.kr/job-search");
  assert.equal(u.searchParams.get("access-key"), "KEY");
  assert.equal(u.searchParams.get("keywords"), "데이터 라벨링");
  assert.equal(u.searchParams.get("job_type"), "2,9");
  assert.equal(u.searchParams.get("count"), "110");
  assert.equal(u.searchParams.get("start"), "1");
  assert.equal(u.searchParams.get("sort"), "pd");
});

test("canonical URL drops utm parameters and upgrades to https", () => {
  assert.equal(
    canonicalSaraminUrl("http://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=1&utm_source=x&utm_medium=y"),
    "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=1",
  );
});
