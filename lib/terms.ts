/**
 * 이용약관 version (app/(site)/terms). Signing up on /auth/confirm records
 * this version in profiles.terms_version; bump it whenever the terms change
 * (and follow 제3조: notice 7 days ahead, 30 days and a mail when it is worse
 * for members).
 */
export const TERMS_VERSION = "1.0";
export const TERMS_EFFECTIVE = "2026년 11월 17일";
/** Members who joined before the terms existed are bound from this day (부칙 2, 7 days' notice). */
export const TERMS_EXISTING_MEMBERS_FROM = "2026년 11월 24일";

/** The one required box on /auth/confirm (the form field is `agree=1`). */
export const SIGNUP_AGREEMENT = "만 14세 이상이고, 이용약관에 동의해요";
