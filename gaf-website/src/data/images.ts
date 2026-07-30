/**
 * Image credit record shape for future licensed or public-domain assets.
 * Do not invent credit data. Leave fields empty until verified.
 */
export type ImageCredit = {
  fileName: string;
  title: string;
  creator: string;
  date: string;
  sourceInstitution: string;
  sourceUrl: string;
  rightsStatement: string;
  license: string;
  requiredCreditLine: string;
  altText: string;
  caption: string;
};

/** Registry of credited images. Populate when assets are added under public/images/. */
export const imageCredits: ImageCredit[] = [];
