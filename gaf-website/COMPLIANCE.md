# Fundraising and compliance notes

Golden Archive Foundation is a United States 501(c)(3) public charity. This website ships with **donation functionality intentionally disabled**.

## Why donations are disabled

The organization may have operational banking tools available for legitimate administrative use. That operational capability is **not** the same as being ready to solicit charitable contributions through a public website in every applicable jurisdiction.

Website donation features must not be activated merely because:

- a bank account exists
- Zelle access exists
- payment processors are available
- a developer wants a Donate button for completeness

## Required review before activation

Before setting `donationsEnabled` to `true` in `src/config/site.ts`:

1. Complete legal review of charitable solicitation requirements.
2. Confirm state-registration status for every jurisdiction where solicitation will occur.
3. Supply required jurisdiction-specific disclosures in configuration (do not invent them).
4. Confirm approved jurisdictions in `approvedDonationJurisdictions`.
5. Update privacy policy and any related public notices.
6. Ensure no payment credentials, Zelle handles, bank account numbers, or routing numbers are stored in the repository, comments, environment examples, or client-side code.

## Configuration is not legal advice

Values in `src/config/site.ts` help developers avoid premature fundraising UI. They are **not** a substitute for legal counsel, registration filings, or compliance review.

No developer should invent:

- registration status
- approved jurisdictions
- disclosure language
- EIN or determination details
- claims that filings exist when they have not been supplied

## Implementation rules while disabled

When `donationsEnabled` is `false`:

- Do not show Donate links in navigation, footer, page content, metadata, or structured data.
- Do not render disabled donation anchors in hidden HTML.
- Do not use IP geolocation as a compliance substitute.
- Do not ask visitors to contribute funds.
- Do not use fundraising slogans such as “Give now,” “Donate today,” or “Your gift makes this possible.”

The Transparency page may include this neutral notice:

> Online giving is not currently available. Golden Archive Foundation is completing the compliance and administrative work required for future fundraising activities.

That notice is informational. It is not a solicitation.
