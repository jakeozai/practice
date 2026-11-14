/** jobs.category values (migration 0011 added video·design·motion_3d·dev·writing for scope C). */
export const JOB_CATEGORIES = ["language", "domain", "labeling", "video", "design", "motion_3d", "dev", "writing", "other"] as const;
export type JobCategoryValue = (typeof JOB_CATEGORIES)[number];
