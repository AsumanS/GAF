export const workTypeOptions = [
  'Literature / Fiction',
  'Poetry',
  'History',
  'Philosophy',
  'Religion / Mythology',
  'Science / Natural History',
  'Travel / Geography',
  'Folklore',
  'Essays / Letters',
  'Reference / Scholarly Work',
  'Drama',
  'Other',
] as const;

export type AgreementClause = {
  title: string;
  label: string;
  link?: { text: string; href: string };
};

export type AgreementGroup = {
  name: string;
  title: string;
  clauses: AgreementClause[];
  acceptanceLabel: string;
};

export const hiddenWorksSubmitContent = {
  metaDescription:
    'Submit a historically significant public-domain work for consideration in the Hidden Works Discovery Contest.',
  intro: [
    'Help us discover important works from the world’s literary heritage that have remained outside the reach of a wider American readership.',
    'The Hidden Works Discovery Contest invites participants to identify historically significant public-domain works and document why they deserve renewed attention. Three selected works will be translated into English, professionally prepared for publication, and introduced to readers in the United States.',
    'The participant who brought each selected work forward will be credited in the resulting edition and on the book cover under their chosen public credit name.',
  ],
  submissionsOpenHtml: '<strong>Submissions are currently open.</strong>',
  submissionPeriodHtml:
    '<strong>Submission period:</strong> Submissions will close on <strong>May 31, 2027, at 11:59 p.m. Central Time</strong>, or when <strong>100 eligible submissions have been accepted for review</strong>, whichever occurs first.',
  orderNote:
    'Submissions are considered in the order in which complete entries are received. A submission does not count toward the 100-submission limit until Golden Archive Foundation determines that it has passed the initial eligibility review.',
  noFeeHtml: '<strong>No purchase, donation, or entry fee is required.</strong>',
  eligibility: {
    heading: 'Eligibility at a Glance',
    /** Compact key facts for the submission page header. Detailed rules remain in Official Contest Rules. */
    facts: [
      { label: 'Eligible participants', value: 'Worldwide, age 18+' },
      { label: 'Entry limit', value: 'Maximum 2 works per entrant or team' },
      {
        label: 'Historical cutoff',
        value:
          'First published or first made available in book form on or before May 31, 1777',
      },
      {
        label: 'Public-domain requirement',
        value: 'Underlying historical work must be in the U.S. public domain',
      },
      {
        label: 'Source',
        value: 'A complete and reasonably obtainable source must exist',
      },
      {
        label: 'Scope',
        value:
          'Approximately 20,000–100,000 source-language words, or equivalent editorial scope where appropriate',
      },
      {
        label: 'Competition category',
        value: 'Untranslated Discovery or General Reader Recovery',
      },
      {
        label: 'Submission deadline',
        value: 'May 31, 2027 at 11:59 p.m. Central Time',
      },
      {
        label: 'Submission cap',
        value: '100 eligible submissions accepted for review',
      },
      { label: 'Entry fee', value: 'None' },
    ],
    items: [
      'The contest is open to eligible participants worldwide.',
      'Entrants must be at least 18 years old.',
      'Entries must be submitted using the entrant’s true legal identity.',
      'A pen name may be used for public recognition if an entry is selected.',
      'Each entrant may submit a maximum of two works.',
      {
        html: 'The work must have been first published—or first made available to readers in book form—in its country of origin <strong>on or before May 31, 1777</strong>.',
      },
      'The underlying historical work must be in the public domain in the United States.',
      'The submitted work must be complete and independently publishable.',
      'A complete and reasonably obtainable source must exist.',
      {
        html: 'The work should contain approximately <strong>20,000–100,000 source-language words</strong>, or an equivalent editorial scope for poetry, drama, mixed-form works, or works for which a reliable word count is unavailable.',
      },
      {
        html: 'The entry must qualify as either an <strong>Untranslated Discovery</strong> or a <strong>General Reader Recovery</strong>.',
      },
      'The entrant must provide sufficient evidence for Golden Archive Foundation to verify publication history, source availability, public-domain status, and the claimed English-language publication gap.',
      'Three qualifying works are intended to be selected for English translation and publication for readers in the United States.',
    ],
  },
  rules: {
    heading: 'Official Contest Rules',
    intro:
      'Review the rules governing eligibility, evidence, evaluation, verification, selection, and participation.',
    sections: [
      {
        heading: 'Organizer',
        paragraphs: [
          {
            html: 'The Hidden Works Discovery Contest is organized and administered by <strong>Golden Archive Foundation</strong>, a Texas nonprofit corporation.',
          },
        ],
      },
      {
        heading: 'Who May Enter',
        paragraphs: [
          'The contest is open to individuals and teams worldwide, except where participation is prohibited or restricted by applicable law.',
          'Every individual entrant and every member of a team must be at least 18 years old.',
          'For a team submission, one person must be designated as the lead entrant. All team members must be identified and must agree to the certifications and submission terms.',
        ],
      },
      {
        heading: 'Who May Not Enter',
        intro: 'The following are not eligible to participate in the same contest cycle:',
        items: [
          'current Golden Archive Foundation board members or officers;',
          'Foundation staff or contractors substantially involved in administering the contest;',
          'reviewers, jurors, eligibility decision-makers, or advisors who have access to confidential contest submissions;',
          'members of the immediate household of an excluded person; or',
          'anyone prohibited from entering under applicable law.',
        ],
      },
      {
        heading: 'Entry Limit',
        paragraphs: [
          {
            html: 'Each individual entrant or team may submit a maximum of <strong>two works</strong> during the contest cycle.',
          },
          'Each entry must be independently complete and satisfy all submission and eligibility requirements.',
          'The same entrant or team may not submit the same work more than once.',
        ],
      },
      {
        heading: 'Submission Period',
        intro: 'Submissions remain open until the earlier of:',
        items: [
          {
            html: '<strong>May 31, 2027, at 11:59 p.m. Central Time; or</strong>',
          },
          {
            html: 'the date on which Golden Archive Foundation has accepted <strong>100 eligible submissions for review</strong>.',
          },
        ],
        paragraphs: [
          'A submission counts toward the 100-submission limit only after it passes an initial eligibility review.',
          'If the limit is reached before May 31, 2027, submissions will close early.',
        ],
      },
      {
        heading: 'Competition Categories',
        paragraphs: ['Every submission must qualify under one of the following categories.'],
        subsections: [
          {
            heading: 'Category 1 — Untranslated Discovery',
            paragraphs: [
              'The complete work has never been published in English as a book or equivalent complete edition intended for general readers in the United States.',
              'The following do not by themselves disqualify a work:',
            ],
            items: [
              'bibliographic references or catalog records;',
              'academic discussion, summaries, or descriptions;',
              'brief quotations or translated excerpts;',
              'facsimiles;',
              'original-language editions.',
            ],
            after: [
              'A complete or substantially complete English edition previously published or distributed for general U.S. readers normally makes the work ineligible for this category.',
            ],
          },
          {
            heading: 'Category 2 — General Reader Recovery',
            paragraphs: [
              'A full or substantial English translation exists in a thesis, dissertation, journal, archive, specialist collection, scholarly publication, or similar limited context, but the work has never been prepared and published as a standalone English-language edition for general U.S. readers.',
              'The existence of a modern translation does not mean that translation may be reused. Copyright or other rights in a modern translation remain separate from the public-domain status of the historical work.',
            ],
          },
        ],
      },
      {
        heading: 'Work Eligibility Requirements',
        paragraphs: ['A work must satisfy all applicable mandatory requirements.'],
        subsections: [
          {
            heading: 'Historical Age',
            paragraphs: [
              {
                html: 'The work must have been first published—or first made available to readers in book form—in its country of origin on or before <strong>May 31, 1777</strong>.',
              },
              'If the precise date is uncertain, the entrant must provide the best-supported date or date range available. The latest reasonably supported date must satisfy the eligibility threshold.',
            ],
          },
          {
            heading: 'U.S. Public-Domain Status',
            paragraphs: [
              'The underlying historical work must be in the public domain in the United States.',
              'Entrants must provide the facts and sources supporting their public-domain reasoning. Golden Archive Foundation will conduct its own verification before final selection.',
            ],
          },
          {
            heading: 'Completeness',
            paragraphs: [
              'The submitted unit must constitute a complete and independently publishable work.',
              'A historically recognized story cycle, collection, or multi-part work may qualify when the submitted unit is historically established as a coherent work.',
              'Newly assembled anthologies, isolated excerpts, disconnected fragments, or arbitrary collections created for the contest do not qualify.',
              'A surviving fragment may qualify only where the surviving text itself constitutes a coherent and responsibly publishable work.',
            ],
          },
          {
            heading: 'Source Availability',
            paragraphs: [
              'At least one complete, legible, and reasonably obtainable source must be identified.',
              'The source may be a manuscript, facsimile, scan, reliable original-language edition, or another source suitable for scholarly verification and preparation of a responsible edition.',
            ],
          },
          {
            heading: 'Length',
            paragraphs: [
              {
                html: 'The work should contain approximately <strong>20,000–100,000 source-language words</strong>.',
              },
              'For poetry, drama, mixed-form works, manuscripts without a reliable word count, or other special formats, an equivalent editorial and translation scope will be considered.',
              'Where an exact word count is unavailable, entrants should provide available information such as page count, format, script density, or another reasonable basis for estimating scope.',
            ],
          },
          {
            heading: 'Recoverability',
            paragraphs: [
              'The work must be capable of responsible translation or editorial recovery without reconstruction so speculative that the resulting edition would materially misrepresent the source.',
            ],
          },
          {
            heading: 'Public Interest',
            paragraphs: [
              'The submission must make a credible case that the work has meaningful literary, cultural, historical, philosophical, intellectual, narrative, or other public value.',
            ],
          },
        ],
      },
      {
        heading: 'Publication-Gap Evidence',
        paragraphs: [
          'Entrants are not expected to prove with absolute certainty that no qualifying English edition has ever existed.',
          'They are expected to conduct and document a diligent, reproducible search sufficient for independent reviewers to evaluate the claimed publication gap.',
          'Evidence should address, where reasonably available:',
        ],
        items: [
          'original and alternate titles;',
          'translated title variants;',
          'alternate romanizations;',
          'author-name variants or pseudonyms;',
          'major library and national-library catalogs;',
          'scholarly bibliographies;',
          'book and full-text databases;',
          'publisher and bookseller records;',
          'language-specific sources;',
          'apparent English editions or references located during the search; and',
          'why any apparent match does or does not disqualify the work.',
        ],
      },
      {
        heading: 'Duplicate Discoveries',
        paragraphs: [
          'If different entrants submit the same historical work, the entries will not automatically be treated as separate winning works.',
          'Golden Archive Foundation may compare the quality and independence of the submitted research. The strongest independently documented qualifying dossier may advance.',
          'If substantially equivalent qualifying submissions concern the same work, the timestamp of the complete submission may be used to determine priority.',
        ],
      },
      {
        heading: 'Initial Eligibility Review',
        paragraphs: [
          'Before merit scoring, Golden Archive Foundation will review submissions for basic eligibility and completeness.',
          'The review may include:',
        ],
        items: [
          'entrant eligibility;',
          'required fields and certifications;',
          'historical age;',
          'category fit;',
          'source completeness and availability;',
          'approximate length;',
          'public-domain rationale;',
          'publication-gap evidence; and',
          'obvious disqualifying conditions.',
        ],
        after: [
          'A submission does not count toward the 100-submission limit until it passes this initial review.',
          'Golden Archive Foundation may request limited clarification or additional evidence where appropriate.',
        ],
      },
      {
        heading: 'Selection Criteria',
        paragraphs: ['Eligible entries will be evaluated on a 100-point framework.'],
        subsections: [
          {
            heading: 'Strength of Discovery Evidence — 25 points',
            paragraphs: [
              'The quality, breadth, reproducibility, and reliability of the research supporting the claimed publication gap.',
            ],
          },
          {
            heading: 'Literary, Cultural, or Historical Significance — 25 points',
            paragraphs: [
              'The importance and distinctiveness of the work and the strength of the case for its recovery.',
            ],
          },
          {
            heading: 'Potential for General U.S. Readers — 20 points',
            paragraphs: [
              'The work’s potential to engage, inform, or interest general readers in the United States while preserving the essential character of the original.',
            ],
          },
          {
            heading: 'Feasibility of a Responsible Edition — 15 points',
            paragraphs: [
              'Source completeness and condition, length, required expertise, rights issues, editorial complexity, and the practical feasibility of producing a responsible edition.',
            ],
          },
          {
            heading: 'Value Added to Public Cultural Access — 15 points',
            paragraphs: [
              'The extent to which the project would make an overlooked voice, tradition, perspective, story, or body of knowledge more accessible to the public.',
            ],
          },
        ],
      },
      {
        heading: 'Final Selection',
        paragraphs: [
          {
            html: 'Golden Archive Foundation intends to select <strong>three qualifying works</strong>.',
          },
          'A work must satisfy final verification of eligibility, source availability, public-domain status, and publication feasibility before its selection is confirmed.',
          'The three selected works will be prepared for English-language publication for readers in the United States.',
        ],
      },
      {
        heading: 'Ties',
        paragraphs: [
          {
            html: 'If two or more works remain tied for a winning position after final evaluation, <strong>each tied work will be considered selected</strong>, provided that each independently satisfies all final eligibility and verification requirements.',
          },
          'A tie may therefore result in more than three works being selected during the contest cycle.',
        ],
      },
      {
        heading: 'No Qualified Selection',
        paragraphs: [
          'Golden Archive Foundation is not required to select an entry that does not satisfy the published eligibility and selection standards.',
          'If fewer than three submissions satisfy the required standards, fewer than three works may be selected.',
        ],
      },
      {
        heading: 'Notification of Selected Entrants',
        paragraphs: [
          'Selected entrants will be notified using the email address provided with the submission.',
          {
            html: 'A selected entrant must respond <strong>within 14 calendar days from the date the selection notice is sent</strong>.',
          },
          'If the entrant does not respond within that period, Golden Archive Foundation may treat the selection as declined and may offer the position to another qualifying entry.',
          'Entrants are responsible for providing an accurate email address and monitoring it during the selection period.',
        ],
      },
      {
        heading: 'Verification',
        paragraphs: [
          'Golden Archive Foundation may request reasonable additional documentation to verify:',
        ],
        items: [
          'legal identity;',
          'age;',
          'publication history;',
          'authorship or attribution;',
          'source availability;',
          'source completeness;',
          'public-domain status;',
          'English-language publication history;',
          'bibliographic claims; or',
          'other material eligibility information.',
        ],
        after: [
          'Failure to provide reasonably requested verification may result in disqualification.',
        ],
      },
      {
        heading: 'Reconsideration of Eligibility Decisions',
        paragraphs: [
          {
            html: 'An entrant may request reconsideration of an eligibility decision within <strong>seven calendar days</strong> after notice only where the entrant believes:',
          },
        ],
        items: [
          'a documented administrative error occurred;',
          'the submission or entrant was mistaken for another; or',
          'material evidence submitted on time was overlooked.',
        ],
        after: [
          'A reconsideration request may not substitute a different work or materially rebuild the submission after the deadline.',
          'Judging scores and substantive jury judgments are final and are not subject to reconsideration.',
        ],
      },
      {
        heading: 'Withdrawal',
        paragraphs: [
          'An entrant may withdraw an entry before final selection by contacting Golden Archive Foundation.',
          'Withdrawal does not require deletion of records that the Foundation reasonably retains for contest administration, fraud prevention, dispute resolution, legal compliance, or organizational recordkeeping.',
        ],
      },
      {
        heading: 'Contest Integrity',
        paragraphs: [
          'Golden Archive Foundation may modify, suspend, extend, or cancel the contest when reasonably necessary because of fraud, attempted manipulation, significant technical failure, security incidents, force majeure, legal or regulatory requirements, or other circumstances that materially impair fair or lawful administration of the contest.',
          'Material changes affecting participants will be published on the contest website.',
        ],
      },
      {
        heading: 'Governing Law',
        paragraphs: [
          {
            html: 'The contest and these rules are governed by the laws of the <strong>State of Texas</strong> and applicable United States federal law.',
          },
        ],
      },
    ],
  },
  categories: {
    untranslated: {
      title: 'Untranslated Discovery',
      body: 'The complete work has never been published in English as a book or equivalent edition intended for general readers in the United States.',
    },
    recovery: {
      title: 'General Reader Recovery',
      body: 'A full or substantial English translation exists in a thesis, dissertation, journal, archive, specialist collection, or similar context, but the work has never been prepared and published as a standalone edition for general U.S. readers.',
    },
  },
  publicDomainNote:
    'Submit only files that you are legally permitted to share. A historical work may be in the public domain while a modern translation, edition, introduction, annotation, photograph, scan, transcription, or other derivative material remains protected.',
  englishTranslationNote:
    'Include translator, title, publisher or repository, date, format, completeness, intended audience, and availability where known.',
  conflictsNote:
    'This may include a relationship with Golden Archive Foundation staff, board members, reviewers, jurors, translators, publishers, donors, rights holders, archives, or other persons or organizations materially connected to the submission.',
  readerCaseHint: '500–1,000 words',
  agreementIntro: 'Please review and accept each section before submitting.',
  teamTypedNameNote:
    'For a team submission, each team member must provide a typed legal name confirming the certifications above.',
  agreementGroups: [
    {
      name: 'agree_eligibility_accuracy',
      title: 'Eligibility, Identity & Accuracy',
      acceptanceLabel:
        'I have read and agree to the Eligibility, Identity & Accuracy terms above.',
      clauses: [
        {
          title: 'Age and Legal Identity',
          label:
            'I confirm that I am at least 18 years old and that I am entering the Hidden Works Discovery Contest under my true legal identity.',
        },
        {
          title: 'Entrant Eligibility',
          label:
            'I confirm that I am not prohibited from entering under the Official Contest Rules, including the exclusions relating to Golden Archive Foundation board members, officers, contest personnel, reviewers, jurors, decision-makers, and other persons whose participation would create a prohibited conflict.',
        },
        {
          title: 'Entry Limit',
          label:
            'I understand that I may submit no more than two works during this contest cycle.',
        },
        {
          title: 'Accuracy of Submission',
          label:
            'I certify that the information I have provided is accurate and complete to the best of my knowledge after reasonable research and that I have not knowingly submitted false, misleading, altered, or fabricated evidence.',
        },
        {
          title: 'Eligibility Verification',
          label:
            'I understand that Golden Archive Foundation may independently investigate and verify the work’s publication history, public-domain status, English-language availability, source completeness, source availability, length, attribution, and compliance with the contest requirements.',
        },
        {
          title: 'Initial Eligibility Review and Submission Limit',
          label:
            'I understand that my submission does not count toward the limit of 100 accepted submissions until Golden Archive Foundation determines that it has passed an initial eligibility review and that submissions may therefore close before May 31, 2027.',
        },
        {
          title: 'Identity and Age Verification',
          label:
            'I understand that Golden Archive Foundation may request reasonable proof of my identity and age if my submission passes initial eligibility review, advances in the contest, or is selected. Failure to provide requested verification may result in disqualification.',
        },
        {
          title: 'Legal Name and Pen Name',
          label:
            'I understand that I must enter under my true legal identity. If my submission is selected, I may choose to be publicly credited under my legal name or a pen name. Golden Archive Foundation may retain my legal identity in its internal administrative and legal records.',
        },
        {
          title: 'Source and Access Disclosures',
          label:
            'I have disclosed known source restrictions, archive conditions, access requirements, costs, cultural protocols, rights issues, and other material limitations relevant to the work.',
        },
        {
          title: 'Original Submission',
          label:
            'I confirm that the submission dossier was prepared by me or by the identified members of my team and that any substantial outside assistance has been disclosed.',
        },
      ],
    },
    {
      name: 'agree_rights_materials',
      title: 'Rights, Ownership & Submitted Materials',
      acceptanceLabel:
        'I have read and agree to the Rights, Ownership & Submitted Materials terms above.',
      clauses: [
        {
          title: 'Public-Domain Requirement',
          label:
            'I understand that the underlying historical work must satisfy the contest’s U.S. public-domain requirement and that submission or initial acceptance of an entry does not constitute a final legal determination that the work is in the public domain.',
        },
        {
          title: 'Third-Party Rights',
          label:
            'I confirm that I have the right to provide the files, scans, photographs, translations, annotations, research materials, or other content included with my submission. I understand that public-domain status of the underlying historical work does not necessarily apply to modern editions, translations, annotations, photographs, scans, transcriptions, or other derivative material.',
        },
        {
          title: 'No Ownership Claim in the Historical Work',
          label:
            'I understand that discovering, researching, or submitting a public-domain historical work does not give me ownership of the underlying work.',
        },
        {
          title: 'Use of Submission Materials',
          label:
            'I grant Golden Archive Foundation a non-exclusive, worldwide, royalty-free license to reproduce, store, copy, review, research, analyze, internally distribute to authorized reviewers and advisors, quote, excerpt, and otherwise use the materials I submit as reasonably necessary to administer and evaluate the contest, verify eligibility, maintain contest records, and carry out the Hidden Works project if the submission is selected.',
        },
        {
          title: 'Ownership of My Original Submission Material',
          label:
            'I understand that submitting an entry does not transfer ownership of my original research, writing, or other original submission material to Golden Archive Foundation except for the rights expressly granted in this Submission Agreement or in any later written agreement that I choose to enter into.',
        },
        {
          title: 'Submitted Materials Will Not Be Returned',
          label:
            'I understand that materials submitted through the contest will not be returned. I will not submit the sole copy of any original, unique, valuable, or irreplaceable material.',
        },
        {
          title: 'No Confidentiality',
          label:
            'I understand that my submission is not being received under an obligation of confidentiality and that I should not submit confidential, proprietary, privileged, or sensitive information that I am not authorized to disclose.',
        },
      ],
    },
    {
      name: 'agree_contest_administration',
      title: 'Contest Administration, Selection & Publication',
      acceptanceLabel:
        'I have read and agree to the Contest Administration, Selection & Publication terms above.',
      clauses: [
        {
          title: 'Additional Information and Documentation',
          label:
            'I understand that Golden Archive Foundation may contact me for clarification, additional sources, supporting documents, source files, identity verification, or other information reasonably necessary to evaluate or verify my submission.',
        },
        {
          title: 'Selection Is Not Guaranteed',
          label:
            'I understand that submitting an entry, receiving a confirmation, passing initial eligibility review, being shortlisted, or being asked for additional information does not mean that my submission has been selected.',
        },
        {
          title: 'Disqualification',
          label:
            'I understand that Golden Archive Foundation may reject or disqualify an entry that is incomplete, unverifiable, ineligible, materially misleading, fraudulent, unlawful, submitted using materials the entrant is not entitled to provide, or otherwise fails to comply with the Official Contest Rules.',
        },
        {
          title: 'Selected Works',
          label:
            'I understand that the contest is intended to select three qualifying works and that ties for a winning position may result in more than three works being selected.',
        },
        {
          title: 'Public Credit',
          label:
            'If my submission is selected, I authorize Golden Archive Foundation to identify and credit me using the public credit name I selected in this form in contest announcements, project materials, the resulting edition, and on the book cover.',
        },
        {
          title: 'Publication and Editorial Development',
          label:
            'If my submission is selected, I understand that Golden Archive Foundation will determine the translation, editing, design, production, publication, distribution, and presentation of the Foundation edition.',
        },
        {
          title: 'No Cash Prize or Automatic Financial Interest',
          label:
            'I understand that entry and selection do not create a cash prize, finder’s fee, royalty, ownership interest, or other financial entitlement unless Golden Archive Foundation and I later enter into a separate written agreement providing otherwise.',
        },
        {
          title: 'Notification Requirement',
          label:
            'I understand that if my submission is selected, I must respond to the selection notice within 14 calendar days after it is sent or Golden Archive Foundation may treat the selection as declined.',
        },
      ],
    },
    {
      name: 'agree_rules_privacy',
      title: 'Participation Terms, Rules & Privacy',
      acceptanceLabel:
        'I have read and agree to the Participation Terms, Official Contest Rules, Submission Agreement, and Privacy Policy above.',
      clauses: [
        {
          title: 'No Entry Fee or Purchase Requirement',
          label:
            'I understand that no purchase, donation, payment, or entry fee is required to participate.',
        },
        {
          title: 'Privacy Policy',
          label:
            'I have read the Golden Archive Foundation Privacy Policy and understand how information submitted through this form may be collected, used, retained, and disclosed.',
          link: { text: 'Privacy Policy', href: '/privacy' },
        },
        {
          title: 'Official Contest Rules and Submission Agreement',
          label:
            'I have read, understand, and agree to the Official Contest Rules and Submission Agreement presented on this page.',
        },
      ],
    },
  ] satisfies AgreementGroup[],
};

export type RichText = string | { html: string };
