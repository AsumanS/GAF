# Golden Archive Foundation Website

Public website for **Golden Archive Foundation**, a United States nonprofit organization recognized by the IRS as a tax-exempt public charity under Section 501(c)(3).

This project is a static site prepared for local review first. Inspect and approve the site locally before creating a GitHub repository or connecting Cloudflare Pages.

## Project purpose

The site presents the foundation’s mission, early project directions (Lost Stories and Worlds Imagined), transparency information, and contact pathways. It intentionally does **not** solicit or process donations in the initial release.

## Technology stack

- [Astro](https://astro.build) (static site generation)
- TypeScript (strict)
- Tailwind CSS v4
- npm
- Cloudflare Pages–compatible `dist` output

No React, no database, no CMS, no authentication, no analytics, no cookies, and no remotely hosted fonts in the initial release.

## Directory structure

```text
gaf-website/
├── public/
│   ├── _headers
│   ├── favicon.svg
│   ├── site.webmanifest
│   ├── js/menu.js
│   └── images/
├── src/
│   ├── components/
│   │   ├── editorial/
│   │   ├── media/
│   │   └── trust/
│   ├── config/site.ts
│   ├── content/
│   │   ├── home.ts
│   │   ├── about.ts
│   │   └── projects/
│   ├── data/
│   ├── layouts/
│   ├── pages/
│   ├── styles/global.css
│   └── types/content.ts
├── COMPLIANCE.md
├── CONTENT_ASSET_CHECKLIST.md
├── DESIGN_SYSTEM.md
├── IMAGE_CREDITS.md
└── README.md
```

Design direction is documented in `DESIGN_SYSTEM.md` (Working Archive concept).

## Installation

```bash
cd websites/gaf-website
npm install
```

## Local development

```bash
npm run dev
```

Open the printed local URL (typically `http://localhost:4321`).

## Type checking

```bash
npm run check
```

## Formatting

```bash
npm run format
npm run format:check
```

## Building

```bash
npm run build
```

Output is written to `dist/`.

## Local production preview

```bash
npm run build
npm run preview
```

Use this path to review the production build before any GitHub or Cloudflare setup.

## Cloudflare Pages settings

When you are ready to deploy (after local review):

```text
Build command: npm run build
Build output directory: dist
```

Node version should meet the project `engines` requirement (`>=22.12.0`).

## Configuration editing

Edit `src/config/site.ts` for organization facts:

| Field                                           | Purpose                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `siteUrl`                                       | Production origin (no trailing slash). Required for absolute canonical URLs and sitemap absolute locs. |
| `organizationName` / `shortName`                | Public names                                                                                           |
| `legalStatus` / `foundationClassification`      | Tax-exempt framing                                                                                     |
| `ein`                                           | Displayed only when non-empty                                                                          |
| `publicEmail` / `mailingAddress`                | Contact details; empty values show honest “to be added” copy                                           |
| `determinationLetterUrl` / `irsSearchUrl`       | Transparency links                                                                                     |
| `socialLinks`                                   | Footer social links appear only when URLs are present                                                  |
| `donationsEnabled`                              | Master switch for donation UI/metadata (**keep `false` until legal review**)                           |
| `zelleEnabled`                                  | Reserved; must not display payment details while donations are disabled                                |
| `fundraisingStatus`                             | Operational status label for future use                                                                |
| `approvedDonationJurisdictions`                 | Must not be invented                                                                                   |
| `donationDisclosure`                            | Jurisdiction disclosures for a future release                                                          |
| `submissionsOpen` / `volunteerApplicationsOpen` | Participation flags                                                                                    |

Do not invent EIN numbers, addresses, emails, dates, statistics, or partnerships.

## Adding project content

1. Update `src/data/projects.ts`.
2. Edit or expand the matching page under `src/pages/projects/`.
3. Keep summaries factual. Do not claim open submissions unless configuration and page copy both confirm it.

## Adding credited images

1. Place files under the appropriate `public/images/...` folder.
2. Record rights data in `src/data/images.ts` and `IMAGE_CREDITS.md`.
3. Provide accurate alt text and required credit lines.
4. Do not download images from the web without confirmed rights.

## Donation safeguards

Donation functionality is intentionally disabled. Availability of a bank account or Zelle access is **not** a reason to enable giving on the website.

Read `COMPLIANCE.md` before changing `donationsEnabled`.

While `donationsEnabled` is `false`:

- No Donate navigation item
- No donation buttons or payment instructions
- No Zelle, bank, routing, QR, or processor details in code or content
- No donation actions in structured data

## Deployment checklist

1. Run `npm run check` and `npm run build` locally.
2. Run `npm run preview` and review every route.
3. Confirm no donation or payment content appears.
4. Fill real values in `src/config/site.ts` only when verified.
5. Set `siteUrl` to the production origin.
6. Update privacy/accessibility/contact copy if forms or analytics are introduced later.
7. Only then create a GitHub repository and connect Cloudflare Pages.

## Routes

- `/`
- `/about`
- `/projects`
- `/projects/lost-stories`
- `/projects/worlds`
- `/transparency`
- `/contact`
- `/privacy`
- `/accessibility`
- `/terms`
- Custom `404`
- `/sitemap.xml`
- `/robots.txt`
