# Fundraising and compliance notes

Golden Archive Foundation is a United States 501(c)(3) public charity. The Foundation has authorized the public donation interface on this website.

## Active donation UI

With `donationsEnabled` set to `true` in `src/config/site.ts`:

- Donate links and buttons remain visible in navigation and page content.
- The `/donate` form is available to all visitors.
- State-registration lists, jurisdiction arrays, thresholds, or pending applications must **not** hide donation navigation or the donation form.

Stripe and PayPal checkout remain a separate integration task. Do not invent payment endpoints, credentials, or simulated successful transactions until that integration is connected.

## Configuration is not legal advice

Values in `src/config/site.ts` help developers present accurate public information. They are **not** a substitute for legal counsel, registration filings, or compliance review.

No developer should invent:

- registration status
- approved jurisdictions
- disclosure language
- EIN or determination details
- claims that filings exist when they have not been supplied

## Payment credentials

Ensure no payment credentials, Zelle handles, bank account numbers, or routing numbers are stored in the repository, comments, environment examples, or client-side code.
