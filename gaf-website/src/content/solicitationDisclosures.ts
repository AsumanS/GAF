/**
 * State charitable solicitation disclosure copy.
 * Verified wording only. Do not invent registration claims or regulatory language.
 */
export type SolicitationDisclosure = {
  jurisdiction: string;
  paragraphs: string[];
};

export const solicitationDisclosuresContent = {
  metaDescription:
    'State charitable solicitation disclosures for Golden Archive Foundation.',
  heading: 'State Charitable Solicitation Disclosures',
  paragraphs: [
    'Golden Archive Foundation is a Texas nonprofit corporation recognized by the Internal Revenue Service as a tax-exempt public charity under Section 501(c)(3) of the Internal Revenue Code. Golden Archive Foundation is located at 1522 Weiskopf Loop, Round Rock, Texas 78664. EIN: 41-2754875.',
    'This solicitation is made directly by Golden Archive Foundation on its own behalf. Contributions support the Foundation’s charitable and educational mission to preserve, rediscover, and share cultural and historical knowledge through research, publishing, cultural preservation, educational resources, and public programs.',
    'Contributions to Golden Archive Foundation may be tax deductible under Section 170(c) of the Internal Revenue Code to the extent permitted by law. Unless expressly stated otherwise in connection with a particular contribution, no goods or services are provided in exchange for contributions made through the Foundation’s standard donation page.',
    'A current financial statement and a written description of Golden Archive Foundation’s programs and activities are available upon request. Information concerning the use of contributions, including amounts or percentages used for charitable purposes, fundraising, and administrative costs, is also available upon request. Requests and other inquiries may be directed to Golden Archive Foundation, 1522 Weiskopf Loop, Round Rock, TX 78664; contact@goldenarchivefoundation.org.',
    'Registration, filing, or exemption under a state charitable solicitation law does not constitute or imply endorsement, approval, or recommendation of Golden Archive Foundation by that state.',
  ],
  disclosures: [
    {
      jurisdiction: 'Maryland',
      paragraphs: [
        'A copy of the current financial statement of Golden Archive Foundation is available by writing to Golden Archive Foundation, 1522 Weiskopf Loop, Round Rock, TX 78664. Documents and information submitted under the Maryland Solicitations Act are also available, for the cost of postage and copies, from the Maryland Secretary of State, State House, Annapolis, MD 21401, (410) 974-5534.',
      ],
    },
    {
      jurisdiction: 'New York',
      paragraphs: [
        'Contributions support Golden Archive Foundation’s charitable and educational activities, including research, publishing, cultural preservation, educational resources, and public programs. A more detailed description of the Foundation’s programs and activities is available upon request.',
        'Information about charitable organizations may be obtained from the New York State Office of the Attorney General at CharitiesNYS.com or by calling the Charities Bureau at (212) 416-8401.',
      ],
    },
    {
      jurisdiction: 'West Virginia',
      paragraphs: [
        'West Virginia residents may obtain a summary of the registration and financial documents from the Secretary of State, State Capitol, Charleston, West Virginia 25305. Registration does not imply endorsement.',
      ],
    },
  ] satisfies SolicitationDisclosure[],
};
