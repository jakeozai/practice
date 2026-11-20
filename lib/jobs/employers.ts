/**
 * Hiring companies whose name, address or phone we checked ourselves.
 *
 * 2026-11-20 labor ministry reply (docs/legal/moel-reply-2026-11-20.md): a job listing must name
 * the hiring party and give its address or phone number (직업안정법 시행령 제28조 제1·2호). A
 * homepage, the original link or a platform's payment check doesn't count, and an anonymous
 * client can't be listed. So only jobs from a company in this list go out (loadCandidatePool),
 * and the mail shows the entry's legal name and address.
 *
 * Add a company only from its own website (contact, legal notice, terms, privacy policy) or an
 * official register, with the page in `source`. Never from a directory or a guess: a wrong
 * address is worse than none.
 */
export type Employer = {
  /** The company as job data spells it (`jobs.company`); matched ignoring case, punctuation and Inc./LLC. */
  names: string[];
  legalName: string;
  address: string | null;
  phone: string | null;
  /** The page the address or phone was read from. */
  source: string;
  /** When it was checked (YYYY-MM-DD). */
  checked: string;
};

/**
 * Checked 2026-11-20. micro1 from its own page fetched directly; Busuu, RWS and TELUS also from
 * an official register or filing; the rest from the company's own page as shown by web search
 * (the top five by volume searched twice on their own domain). Not listed yet: G2i (two different
 * addresses on its own site), MOTIONART and Kirin (no company page found).
 */
export const EMPLOYERS: Employer[] = [
  {
    names: ["Invisible"],
    legalName: "Invisible Technologies, Inc.",
    address: "548 Market St #85820, San Francisco, CA 94104, USA",
    phone: null,
    source: "https://invisibletech.ai/privacy-policy",
    checked: "2026-11-20",
  },
  {
    names: ["micro1"],
    legalName: "micro1, Inc.",
    address: "655 Montgomery St, San Francisco, CA 94111, USA",
    phone: null,
    source: "https://www.micro1.ai/legal/privacy-policy",
    checked: "2026-11-20",
  },
  {
    names: ["Welo Data", "Welocalize"],
    legalName: "Welocalize, Inc.",
    address: "136 Madison Avenue, 6th Floor, New York, NY 10016, USA",
    phone: "+1 212 581 8870",
    source: "https://www.welocalize.com/legal-entities/",
    checked: "2026-11-20",
  },
  {
    names: ["Xperteez Technology"],
    legalName: "Xperteez Technology",
    address: "Webel IT Park PH-2, DH Block, Action Area I, Rajarhat New Town, Kolkata, West Bengal 700160, India",
    phone: "+91 33 4809 5752",
    source: "https://www.xperteez.co.in/contact-us",
    checked: "2026-11-20",
  },
  {
    names: ["Ulatus"],
    legalName: "Crimson Interactive Pvt. Ltd. (Ulatus)",
    address: "1001, 10th Floor, Techniplex-II, Veer Savarkar Flyover, S.V. Road, Goregaon (W), Mumbai 400062, India",
    phone: "+91 22 6193 5000",
    source: "https://www.ulatus.com/contact-us.htm",
    checked: "2026-11-20",
  },
  {
    names: ["TELUS Digital"],
    legalName: "TELUS Digital",
    address: "Floor 5, 510 West Georgia Street, Vancouver, BC V6B 0M3, Canada",
    phone: "+1 604 695 3455",
    source: "https://www.sec.gov/Archives/edgar/data/1825155/000162828025005299/tixt-20241231.htm",
    checked: "2026-11-20",
  },
  {
    names: ["TSMG"],
    legalName: "TSMG Holding Sp. z o.o.",
    address: "Koszykowa 60/62, Office 39, 00-673 Warsaw, Poland",
    phone: null,
    source: "https://tsmg.io/privacy-policy/",
    checked: "2026-11-20",
  },
  {
    names: ["Superside"],
    legalName: "Konsus, Inc. (Superside)",
    address: "1201 North Market Street, Suite 111, Wilmington, DE 19801, USA",
    phone: null,
    source: "https://www.superside.com/terms-of-use",
    checked: "2026-11-20",
  },
  {
    names: ["Busuu"],
    legalName: "Busuu Limited",
    address: "5th Floor, Business Cube, 43 Worship Street, London EC2A 2DU, United Kingdom",
    phone: null,
    source: "https://www.busuu.com/en/terms",
    checked: "2026-11-20",
  },
  {
    names: ["Authority.inc"],
    legalName: "Join Authority Inc.",
    address: "169 Madison Avenue, New York, NY, USA",
    phone: "+1 949 393 4244",
    source: "https://www.authority.inc/contact",
    checked: "2026-11-20",
  },
  {
    names: ["Lifted (an Upwork Company)"],
    legalName: "Lifted Solutions LLC",
    address: "201 W 5th St, Suite 1600, Austin, TX 78701, USA",
    phone: null,
    source: "https://go-lifted.com/legal/privacy-notice",
    checked: "2026-11-20",
  },
  {
    names: ["Language Services Associates"],
    legalName: "Language Services Associates, Inc.",
    address: "455 Business Center Drive, Suite 100, Horsham, PA 19044, USA",
    phone: "+1 215 259 7000",
    source: "https://app.lsa.inc/PrivacyPolicy",
    checked: "2026-11-20",
  },
  {
    names: ["Motu Novu LLC"],
    legalName: "Motu Novu LLC",
    address: "501 Stone Street, Cody, WY 82414, USA",
    phone: "+1 307 263 4108",
    source: "https://motunovu.com/",
    checked: "2026-11-20",
  },
  {
    names: ["ModSquad"],
    legalName: "ModSquad, Inc.",
    address: "5225 Tech Data Dr., 2nd Floor, #1755, Clearwater, FL 33760, USA",
    phone: "+1 855 818 6637",
    source: "https://modsquad.com/company/facts/",
    checked: "2026-11-20",
  },
  {
    names: ["TransPerfect / DataForce", "TransPerfect"],
    legalName: "TransPerfect Translations International Inc.",
    address: "1250 Broadway, 32nd Floor, New York, NY 10001, USA",
    phone: "+1 212 689 5555",
    source: "https://www.dataforce.ai/data-privacy-notice-vendors",
    checked: "2026-11-20",
  },
  {
    names: ["AsiaLocalize"],
    legalName: "AsiaLocalize",
    address: "Level 33, Ilham Tower, No. 8 Jalan Binjai, 50450 Kuala Lumpur, Malaysia",
    phone: "+60 3 2169 6313",
    source: "https://asialocalize.com/contact/",
    checked: "2026-11-20",
  },
  {
    names: ["RWS TrainAI", "RWS"],
    legalName: "RWS Holdings plc",
    address: "Compass House, Vanwall Business Park, Vanwall Road, Maidenhead, Berkshire SL6 4UB, United Kingdom",
    phone: null,
    source: "https://find-and-update.company-information.service.gov.uk/company/03002645",
    checked: "2026-11-20",
  },
  {
    names: ["OneForma"],
    legalName: "Centific Global Solutions, Inc. (OneForma)",
    // Suite number differs between its own pages (100 / 120), so it is left out.
    address: "14980 NE 31st Way, Redmond, WA 98052, USA",
    phone: "+1 425 233 8578",
    source: "https://www.centific.com/legal/legal-info",
    checked: "2026-11-20",
  },
  {
    names: ["Udacity"],
    legalName: "Udacity, Inc.",
    address: "2440 W. El Camino Real, 6th Floor, Mountain View, CA 94040, USA",
    phone: null,
    source: "https://www.udacity.com/en-US/legal/privacy",
    checked: "2026-11-20",
  },
  {
    names: ["Kodland"],
    legalName: "Odreval Ltd (Kodland)",
    address: "Florinis 7, GREG Tower, Floor 2, 1065 Nicosia, Cyprus",
    phone: null,
    source: "https://en.kodland.org/tos",
    checked: "2026-11-20",
  },
  {
    names: ["Turing"],
    legalName: "Turing Enterprises, Inc.",
    address: "548 Market Street, PMB 18282, San Francisco, CA 94104, USA",
    phone: null,
    source: "https://www.turing.com/policy",
    checked: "2026-11-20",
  },
  {
    names: ["LILT"],
    legalName: "LILT, Inc.",
    // Its privacy policy (the newest legal page) gives this; an older cookie policy says Emeryville.
    address: "2 Embarcadero Center, Floor 8, San Francisco, CA 94111, USA",
    phone: null,
    source: "https://lilt.com/legal/privacy",
    checked: "2026-11-20",
  },
  {
    names: ["Appen"],
    legalName: "Appen Limited",
    address: "Suite 8.03, Level 8, 1 Market Street, Sydney NSW 2000, Australia",
    phone: "+61 2 9468 6300",
    source: "https://www.appen.com/contact-us",
    checked: "2026-11-20",
  },
];

/** "G2i Inc." and "G2i" are the same key; so are "Welo Data" and "welo-data". */
export function companyKey(name: string | null | undefined): string {
  return (name ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\b(?:inc|llc|ltd|limited|gmbh|plc|bv|corp|corporation|co)\b\.?/g, "")
    .replace(/[^a-z0-9가-힣]+/g, "");
}

function index(list: Employer[]): Map<string, Employer> {
  return new Map(list.flatMap((e) => e.names.map((n) => [companyKey(n), e] as const)).filter(([k]) => k));
}
const BY_KEY = index(EMPLOYERS);

export function employerFor(company: string | null | undefined, list: Map<string, Employer> = BY_KEY): Employer | null {
  const key = companyKey(company);
  return (key && list.get(key)) || null;
}

/** Marketplaces that keep the client anonymous: their postings are never listed. */
const ANONYMOUS_CLIENT_HOST = /(^|\.)freelancer\.com$/i;

function host(url: string | null | undefined): string {
  try {
    return new URL(url ?? "").hostname;
  } catch {
    return "";
  }
}

/** A job may go out only when its hiring company is identified, with an address or phone on file. */
export function isListable(job: { company: string | null; url: string | null }, list: Map<string, Employer> = BY_KEY): boolean {
  if (ANONYMOUS_CLIENT_HOST.test(host(job.url))) return false;
  const e = employerFor(job.company, list);
  return Boolean(e && (e.address || e.phone));
}

/** The line every listing carries: "Invisible Technologies Inc. · 주소 · 전화". */
export function employerLine(company: string | null | undefined, list: Map<string, Employer> = BY_KEY): string | null {
  const e = employerFor(company, list);
  if (!e || !(e.address || e.phone)) return null;
  return [e.legalName, e.address, e.phone].filter(Boolean).join(" · ");
}

/** Exact `jobs.company` spellings to ask the database for (the pool query filters on them first). */
export function listedCompanyNames(list: Employer[] = EMPLOYERS): string[] {
  return [...new Set(list.filter((e) => e.address || e.phone).flatMap((e) => e.names))];
}

/** For tests: an index over another list. */
export const indexEmployers = index;
