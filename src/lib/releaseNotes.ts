// The application's version history.
//
// This file is the changelog *and* the version number: `RELEASE_NOTES[0].version`
// is what ships, and `package.json` is kept in step with it. Every deploy gets an
// entry — run `npm run release` on the branch rather than editing by hand:
//
//   npm run release -- patch --title "Profile you can edit" "Add a spouse or child" "…"
//
// Levels: patch for fixes and small changes, minor for a feature someone would
// notice, major only for a release that changes what the product is. Major
// versions should be rare.
//
// Keep items about what changed for the user, not what changed in the code.

import pkg from '../../package.json';

export interface ReleaseNote {
  /** Semver, and the identity of the release. Never reuse or rewrite one. */
  version: string;
  /** ISO date (YYYY-MM-DD) the release shipped. */
  date: string;
  title: string;
  items: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.44.2',
    date: '2026-08-17',
    title: 'Fix matching a person to an existing family member',
    items: [
      'Choosing the person no longer bounces back to the same question',
      'A shortened first name now ranks above relatives who only share the surname — Mitch is offered first for MITCHELL PETERSON',
      'Once matched, Family says so',
    ],
  },
  {
    version: '0.44.1',
    date: '2026-08-17',
    title: 'Match a document\'s name to someone you already have',
    items: [
      'Answering "is this person in your household?" now offers the people already on file before offering to add a new one',
      'Matches are recorded against the extracted record, so the question stops coming back',
      'Command never rewrites your own names from a document',
    ],
  },
  {
    version: '0.44.0',
    date: '2026-08-17',
    title: 'See what is on autopay',
    items: [
      'Credit now lists the charges that repeat, with what each costs over a year',
      'A charge counts as recurring when the statement marks it automatic, the same amount arrives in two periods, or a bill-like category repeats — two flights in two months no longer read as a subscription',
      'When only one statement has been read, the section says so rather than showing nothing',
    ],
  },
  {
    version: '0.43.1',
    date: '2026-08-17',
    title: 'Add a family member now does something',
    items: [
      'The Family section had no way to add anyone — the editor only existed on Profile — so its button pointed at nothing and answering "is this person in your household?" led nowhere',
    ],
  },
  {
    version: '0.43.0',
    date: '2026-08-17',
    title: 'Take your data, or delete all of it',
    items: [
      'Download everything Command holds as one file, or remove all of it permanently — including the uploaded documents themselves',
      'Profile now states plainly how your documents are read and what is stripped before anything is stored',
    ],
  },
  {
    version: '0.42.1',
    date: '2026-08-17',
    title: 'Identifiers cannot be stored, at three levels',
    items: [
      'Quoted excerpts from your documents are now scrubbed of Social Security numbers, tax IDs, bank accounts and driver\'s licence numbers — the previous rule only caught card numbers',
      'Every extraction path now tells the model not to produce them, and the database refuses to accept them regardless',
    ],
  },
  {
    version: '0.42.0',
    date: '2026-08-17',
    title: 'You can now type in what you own',
    items: [
      'A vehicle owned outright, or a balance you already know, can be added by hand — Finances promised that and only offered a file uploader',
      'Answering "do you still own the 2022 Volvo XC90?" opens a form with the vehicle already in it',
    ],
  },
  {
    version: '0.41.1',
    date: '2026-08-17',
    title: 'The industry\'s word for it, gone from the app',
    items: [
      'Every place Command asked for a "declarations page" now asks for an insurance policy — the section intro was only one of seven, and the rest were in the Insurance page and the coverage findings',
    ],
  },
  {
    version: '0.41.0',
    date: '2026-08-17',
    title: 'Your documents raise the next questions',
    items: [
      'A policy naming a driver Command has never heard of, or a car that is not among the things you own, now becomes a question you can answer in a second — filling in sections you had not thought about',
    ],
  },
  {
    version: '0.40.0',
    date: '2026-08-17',
    title: 'Plainer words, and every upload shows its worth',
    items: [
      'Insurance asks for a policy rather than a declarations page — you should not need the industry\'s word for it',
      'The Dashboard invites you to upload anything you have to hand, with examples, and says plainly that the picture fills in as you go',
      'Finishing an upload now tells you what Command found in it and offers to show you, instead of leaving you to go looking',
    ],
  },
  {
    version: '0.39.0',
    date: '2026-08-17',
    title: 'A friendlier start',
    items: [
      'A brand new Dashboard is a setup guide rather than a score of zero beside seven more — it welcomes you, shows three things worth doing, and becomes the summary once a few areas have something in them',
      'Every empty section now says what it is for, which other sections it strengthens, the one document worth starting with, and what else it can use',
    ],
  },
  {
    version: '0.38.0',
    date: '2026-08-17',
    title: 'An empty section explains itself',
    items: [
      'A section you have not started yet opens with what it is for and one thing to do, instead of a grade card reporting a dash and a list of everything it could not assess',
    ],
  },
  {
    version: '0.37.0',
    date: '2026-08-17',
    title: 'A weekly brief of what moved',
    items: [
      'Opens once a week, or from the header any time, showing new gaps found, scores that changed, what resolved, and what falls due next — assembled from the assessments each section already produces',
    ],
  },
  {
    version: '0.36.1',
    date: '2026-08-17',
    title: 'Only sections that exist',
    items: [
      'Advisory and Health are gone from the Dashboard — neither had a page, a scorer or a nav entry, and Health was reporting a score for an assessment that never ran',
      'New households no longer get those two rows created at onboarding',
    ],
  },
  {
    version: '0.36.0',
    date: '2026-08-17',
    title: 'Command shows what it found, before you go looking',
    items: [
      'A new household is shown its strongest cross-pillar finding on the Dashboard as soon as the first document is read, rather than having to open a section to discover it',
    ],
  },
  {
    version: '0.35.1',
    date: '2026-08-17',
    title: 'Unconfirmed readings stop counting, and a dead one says so',
    items: [
      'A reading cut off by the server now shows as failed with a prompt to run it again, instead of sitting silently forever',
      'Re-reading an insurance document and confirming it again updates the policy rather than adding a second copy',
      'The Legal grade and the spending breakdown no longer count readings you have not confirmed',
    ],
  },
  {
    version: '0.35.0',
    date: '2026-08-17',
    title: 'Usable on a phone',
    items: [
      'The navigation rail becomes a drawer below desktop widths — it was taking 200px of a 375px screen, leaving every section 175px wide',
      'Stat blocks that sit to the right of a heading on desktop now align left when they wrap beneath it on a phone',
      'The add-document sheet opens near the top of a small screen rather than half a screen down',
    ],
  },
  {
    version: '0.34.0',
    date: '2026-08-17',
    title: 'Search and add a document from anywhere',
    items: [
      'A header above every section searches your pillars and document names, and jumps straight to what it finds',
      'Add document is now reachable from any view — including the Document Vault, which had no uploader of its own',
    ],
  },
  {
    version: '0.33.0',
    date: '2026-08-17',
    title: 'One section crashing no longer takes the app with it',
    items: [
      'A view that throws now shows a recoverable message with the error detail, and the sidebar keeps working so you can navigate out instead of reloading',
    ],
  },
  {
    version: '0.32.1',
    date: '2026-08-17',
    title: 'The Legal section no longer blanks on a document with no observations',
    items: [
      'A column that holds a list was declared with an object default, so a reading with no execution observations crashed the whole page instead of showing one badge without them',
    ],
  },
  {
    version: '0.32.0',
    date: '2026-08-14',
    title: 'What each card is good for',
    items: [
      'Every card now carries a plain summary, its strengths and trade-offs, and the protections it comes with — extended warranty, travel cover, lounge access, foreign transaction fees and the rest',
      'Bonus categories are valued against your own spending, so a 6% grocery rate is reported with what it actually returned you and whether it covered the annual fee',
      'Alternatives are ranked on what they would net you after their own fee, not on headline rates',
    ],
  },
  {
    version: '0.31.1',
    date: '2026-08-14',
    title: 'Two things were both called confirm',
    items: [
      'Checking a statement\'s values and adding it to a card are different actions, and only the second one counts — every screen that showed zero now says which step is outstanding instead of telling you to confirm something you already confirmed',
    ],
  },
  {
    version: '0.31.0',
    date: '2026-08-14',
    title: 'A statement now tells you something',
    items: [
      'Reading a credit card statement shows what the spending was, what it earned, whether a card you already hold would have earned more on it, and whether a different card suits the mix — before you confirm anything',
      'Command now knows what common cards earn by category, so it can say a purchase went on the wrong card rather than only comparing your cards\' overall returns',
    ],
  },
  {
    version: '0.30.1',
    date: '2026-08-14',
    title: 'A long statement saves what it read',
    items: [
      'The transaction list is now abandoned at an internal deadline instead of the whole extraction being killed by the server — balances, limits and APRs are kept, and the list says it fell short',
      'Removed a stagger between concurrent passes that was measured to buy nothing and cost up to twelve seconds on exactly the documents that were timing out',
    ],
  },
  {
    version: '0.30.0',
    date: '2026-08-14',
    title: 'Where the money went',
    items: [
      'Monthly spending by category in Finances, built from the card statements Command has read — with what it covers stated first, because a breakdown of part of your spending looks exactly like a breakdown of all of it',
      'A card payment is treated as a transfer rather than negative spending; a refund offsets its own category',
    ],
  },
  {
    version: '0.29.1',
    date: '2026-08-13',
    title: 'The tuned extraction configuration',
    items: [
      'Effort is now split by the kind of work: full effort where a pass makes a judgment, less where it transcribes a list or lifts labeled fields off a form',
      'Documents no specialist path claims are read by the cheapest model rather than a mid-tier one',
    ],
  },
  {
    version: '0.29.0',
    date: '2026-08-12',
    title: 'See where the API money went',
    items: [
      'A collapsed report at the bottom of Profile breaking down every document reading by pass, model and file — including what was spent on readings that failed, and what the replay cache saved',
    ],
  },
  {
    version: '0.28.1',
    date: '2026-08-12',
    title: 'A spend limit reads as a spend limit',
    items: [
      'Hitting an Anthropic usage cap now says so, names the date it resets, and points at the setting that raises it — instead of being reported as an empty balance, which sends you to the wrong screen',
    ],
  },
  {
    version: '0.28.0',
    date: '2026-08-12',
    title: 'Stop paying twice for the same reading',
    items: [
      'Extractions are replayed from a cache when the document, the prompts, the schema and the model are all unchanged — re-reading a document you have already read now costs nothing',
      'The cost line reports what a replay saved',
    ],
  },
  {
    version: '0.27.1',
    date: '2026-08-12',
    title: 'A second property counts toward net worth',
    items: [
      'Real estate now comes from your itemized property records, falling back to the profile figure only when nothing is itemized — a rental or a cabin was being dropped from net worth entirely',
    ],
  },
  {
    version: '0.27.0',
    date: '2026-08-12',
    title: 'Finances becomes a real section',
    items: [
      'A Finances grade that reconciles the net worth you stated against what is actually on file — the figure the insurance findings depend on',
      'A balance sheet assembled from every section: accounts and property against the mortgage from Home, card balances from Credit, and loans',
      'Car, student, personal, HELOC and 401(k) loans can be recorded, and a car loan ties to the vehicle it is secured against',
    ],
  },
  {
    version: '0.26.0',
    date: '2026-08-11',
    title: 'Tell Command when it reads a document wrong',
    items: [
      'A "Wrong type?" control in the Document Vault re-reads a document down the path you pick — re-running extraction alone just repeats the same misclassification',
      'The classifier now knows how a credit card statement differs from a bank statement: a credit limit, a minimum payment and an APR table settle it, not the letterhead',
    ],
  },
  {
    version: '0.25.7',
    date: '2026-08-11',
    title: 'Signed, or a draft, said plainly',
    items: [
      'Legal documents now lead with whether the copy on file is signed, marked draft, recorded or silent on the question — the most consequential fact about a will, previously grey text next to the page count',
      'Command reports what the document says and what it could see, never whether it is valid — an unsigned copy in the vault does not mean no signed original exists',
    ],
  },
  {
    version: '0.25.6',
    date: '2026-08-11',
    title: 'One document, one entry',
    items: [
      'A document read more than once now appears once — the newest reading wins, and older ones are kept as history rather than shown as separate documents',
      'The Legal grade no longer counts a re-read document twice',
      'The same duplication in Insurance is fixed too, where confirming both readings would have put a policy on file twice',
    ],
  },
  {
    version: '0.25.5',
    date: '2026-08-11',
    title: 'Every section agrees with the vault',
    items: [
      'Insurance, Credit, Home and Taxes now show whether a record has a document behind it, the same way Legal does',
      'Every section lists files sitting in the vault that it isn\'t counting, and says the grade was calculated without them',
    ],
  },
  {
    version: '0.25.4',
    date: '2026-08-11',
    title: 'The vault and your sections now agree',
    items: [
      'Every legal record says whether a document sits behind it, and opens it when one does',
      'Every file in the vault says what it produced — or that nothing depends on it yet',
      'Legal files uploaded but never confirmed into the section are now listed instead of silently ignored',
      'Fixed the Legal page printing "no legal documents read yet" directly above a list of legal documents',
    ],
  },
  {
    version: '0.25.3',
    date: '2026-08-11',
    title: 'See what each extraction costs',
    items: [
      'Every extraction now reports what it cost, how many tokens hit the prompt cache, and the price of each pass',
      'Mortgage, warranty and tax-return reading moved to a cheaper model — those are printed tables read against a strict schema, not the judgment calls insurance and legal make',
      'Model and effort are now settable per path without a code change',
    ],
  },
  {
    version: '0.25.2',
    date: '2026-08-10',
    title: 'The dashboard and the Taxes page were not the same section',
    items: [
      'Section rows written at onboarding under "tax" and "healthcare" now resolve to the Taxes and Health sections — the live tax grade reaches the dashboard instead of silently missing it',
      'Sections with no page no longer look clickable',
      'Two rows that resolve to the same section collapse into one',
    ],
  },
  {
    version: '0.25.1',
    date: '2026-08-10',
    title: 'Planning for households that itemize',
    items: [
      'A household that itemized gets its own planning item — giving counts from the first dollar, which is the opposite of the bunching case',
      'Schedule A charitable totals are summed from their parts when the return prints only the components',
    ],
  },
  {
    version: '0.25.0',
    date: '2026-08-10',
    title: 'Tax planning against last year\'s return',
    items: [
      'Upload a filed 1040 and Command reads AGI, total tax, the deduction path, credits and carryforwards into a baseline — with the form and line each figure came from',
      'Planning items derived from your own figures: the safe-harbor payment target, bunching when itemizing is within reach, carryforwards that get lost between preparers, and a child aging out of the child tax credit',
      'A deduction log that records what was spent as it happens, flags a charitable gift over $250 that has no acknowledgment yet, and can pull charitable card transactions across without double-counting',
      'W-2s, 1099s and 1098s now tick their own box on the year\'s checklist when uploaded',
      'The tax grade counts a missing prior-year return and unsubstantiated entries',
    ],
  },
  {
    version: '0.24.0',
    date: '2026-08-10',
    title: 'Taxes, as a checklist and a calendar',
    items: [
      'The Taxes section now works out which forms you should expect — a 1098 because you have a mortgage, a K-1 because you have a business, childcare records because you have children under 13 — and tracks which have arrived.',
      'Figures already sitting in your own documents are surfaced where a preparer will ask for them: mortgage interest and escrowed property tax from your statement, charitable giving from card transactions, and how many children were under 17 at year end.',
      'A calendar of the dates that carry money, including the one people miss — April 15 is also the last day to fund an IRA or HSA for the previous year.',
      'Command is not a tax preparer and says so. It tracks what arrived and what the dates are; whether something is deductible is not a question it answers.',
    ],
  },
  {
    version: '0.23.0',
    date: '2026-08-10',
    title: 'Family, on a calendar',
    items: [
      'The Family section now builds a timeline from birth dates alone — when a child can drive and what that does to your auto premium, when they turn 18 and you lose the right to their medical information, when college starts, when custodial accounts transfer, and when they come off your health plan.',
      'A protection estimate shows what the family would need if a parent died against the life cover actually on file, with every line of the arithmetic and every assumption named. It uses your income, net worth, mortgage balance and extracted policies — nothing new to enter.',
      'Trump accounts: Command works out from birth dates which children qualify for the one-time $1,000 federal contribution and which can only hold an account, and says plainly that for education a 529 usually still wins.',
    ],
  },
  {
    version: '0.22.1',
    date: '2026-08-10',
    title: 'Read any document again',
    items: [
      'Any document in the vault can be read again, including ones already extracted. A second run updates what it found rather than creating a duplicate, so improvements to how a document type is handled can be applied to files you uploaded earlier.',
    ],
  },
  {
    version: '0.22.0',
    date: '2026-08-10',
    title: 'Home documents that actually land somewhere',
    items: [
      'Mortgage statements are now read properly — servicer, balance, rate, payment, escrow, maturity — and confirming them fills in your equity, rate and payment on the Home page.',
      'Warranty cards, manuals and receipts are read for what the equipment is and what the warranty covers, and can be tracked as a new system or filed against one you already have.',
      'Filing a document against an existing system fills only the gaps — nothing you recorded yourself is overwritten.',
      'An older statement never overwrites a newer balance.',
    ],
  },
  {
    version: '0.21.0',
    date: '2026-08-10',
    title: 'Cheaper to run, clearer when it can\'t',
    items: [
      'Reading a document costs roughly a third of what it did. The document is now sent to Claude once per extraction instead of three times, and classification runs on a smaller, cheaper model.',
      'When extraction stops because the Anthropic account is out of credits, Command says exactly that and where to fix it, instead of showing a raw API error.',
    ],
  },
  {
    version: '0.20.0',
    date: '2026-08-10',
    title: 'Home, rebuilt around what wears out',
    items: [
      'The Home section now tracks your major systems and appliances — furnace, water heater, roof, dishwasher, driveway — with make, model, age, warranty and where the paperwork lives.',
      'A replacement timeline shows what is likely to need money and roughly when, grouped by year with running totals, so an expensive year is something you see coming rather than something that happens to you.',
      'Equity, mortgage rate, balance and payment sit at the top. Add the loan by hand, or upload a statement.',
      'Service lives and replacement costs are typical figures, clearly labeled as estimates. Anything you enter yourself replaces them everywhere it appears.',
      'Children no longer appear on the Home page — they live on your profile and in Family.',
    ],
  },
  {
    version: '0.19.2',
    date: '2026-08-09',
    title: 'A vault that says what went wrong',
    items: [
      'Document Center is now the Document Vault.',
      'When extraction fails because a document took longer to read than the server allows, Command says so instead of reporting an unhelpful status code. Large or multi-account statements are the usual cause.',
      'Credit card statements with long transaction lists are read more efficiently, and a statement running past 200 transactions now returns the first 200 marked as partial rather than timing out with nothing.',
    ],
  },
  {
    version: '0.19.1',
    date: '2026-08-09',
    title: 'Offer research that fits in the time it has',
    items: [
      'Researching card offers now runs as two shorter steps instead of one long one. The single call was exceeding the server\'s time limit and failing outright; each step now finishes comfortably.',
      'The button reports which step it is on — searching, then reading what it found.',
    ],
  },
  {
    version: '0.19.0',
    date: '2026-08-09',
    title: 'Rewards strategy, grounded and researched',
    items: [
      'Command now shows what each of your cards actually returns — rewards earned divided by what you spent, measured from your own statements — alongside where your spending goes by category.',
      'It quantifies what putting spend on the wrong card costs you per year, and says plainly when interest is outrunning rewards, because until a balance is cleared no card earns its way out of it.',
      'Research current offers searches the web for cards that suit your spending and works out what each would return on your actual categories. Every card carries the page it was read from, the date it was read, and an explicit note that Command has not confirmed it with the issuer.',
      'Only category totals and card names ever leave your household for that search — no balances, no account numbers, no names.',
    ],
  },
  {
    version: '0.18.0',
    date: '2026-08-09',
    title: 'Credit card statements, read properly',
    items: [
      'Upload a credit card statement and Command reads the whole thing: institution, card, cycle dates, every balance line, each interest rate separately, rewards earned and redeemed, and every transaction.',
      'Confirm what it read and it creates or updates the card. A second statement for the same card builds history instead of overwriting it, and re-reading the same file never duplicates anything.',
      'Only the last four digits of a card number are ever stored, and any longer run of digits is redacted before it reaches the database.',
      'Statement balance and current balance are kept separate — a statement tells you what was owed at its closing date, not what you owe today.',
      'Transaction categories the issuer printed are marked apart from the ones Command worked out itself.',
    ],
  },
  {
    version: '0.17.0',
    date: '2026-08-09',
    title: 'Credit, graded',
    items: [
      'Credit now works like Insurance and Legal: a grade at the top scored against your own limits and income, your cards below it worst-first, and the uploader at the bottom.',
      'Utilization is checked overall and card by card, balances are weighed against household income, and annual fees are compared against the rewards actually recorded.',
      'Command is clear about what it cannot see — payment history, account ages and any card you have not told it about are not part of this, and it is not a credit score.',
      'Scores are whole numbers now.',
    ],
  },
  {
    version: '0.16.0',
    date: '2026-08-09',
    title: 'A health score that tells the truth about a new profile',
    items: [
      'The household health score now has two readings: what you have built, and the full picture across every section. Toggle between them — a half-finished profile scoring 13 because four sections are empty was discouraging and wrong.',
      'Sections you have not started drop to the bottom of Section Status and say so, rather than showing a 0.0 that looks like failure.',
      'Fixed a layout bug where a long document title stretched the dashboard sideways and pushed Priority Actions off the edge of the screen.',
    ],
  },
  {
    version: '0.15.0',
    date: '2026-08-09',
    title: 'A dashboard that points at the work',
    items: [
      'Action items are now ranked by what actually matters — live findings from your coverage and legal documents, merged with your saved actions, ordered by severity and value. Stale items the current data has overtaken drop off.',
      'Each action links straight to the section that resolves it.',
      'Anything waiting on you is listed by document name, and clicking it opens that document\'s review directly rather than dropping you at the top of a page.',
      'Document upload moved to the bottom of the dashboard. The summary comes first.',
    ],
  },
  {
    version: '0.14.0',
    date: '2026-08-09',
    title: 'One shape for every section',
    items: [
      'Legal now reads like Insurance: the grade leads, your documents follow, and the uploader sits at the bottom where it belongs.',
      'The dashboard no longer tells a stale story. Legal is scored live from your documents the way Insurance already was, so uploading or confirming something moves the household score immediately.',
      'A new \'Waiting on you\' panel shows anything still being read, waiting for review, or that failed — and clicking it takes you straight there.',
      'Section rows on the dashboard are clickable.',
    ],
  },
  {
    version: '0.13.0',
    date: '2026-08-09',
    title: 'Review what Command read, then decide',
    items: [
      'Every detail Command reads from a legal document can now be confirmed, edited, rejected or left for later — and only what you confirm reaches your profile.',
      'People named in a document can be matched to your household, added as new members, or marked as outsiders. A different spelling never rewrites someone\'s existing profile.',
      'Confidence decides how much work you have to do: high and moderate values can be confirmed in bulk, low-confidence ones need a look each.',
      'A second document of the same type never overwrites the first. Command keeps both and asks you which one is current.',
    ],
  },
  {
    version: '0.12.0',
    date: '2026-08-08',
    title: 'Legal health, graded',
    items: [
      'The Legal section now carries a grade, the way Insurance does — scored on how well what you have fits your household, not on how many files you have uploaded.',
      'Findings are sized to your situation: minor children make a will critical rather than advisable, a net worth above $1M raises the trust question, and a business interest without an operating agreement gets called out.',
      'Command says what it has and has not seen, never what you do or do not have. Where an answer depends on your state or on how a document was signed, it says an attorney is the right person to ask.',
      'US spelling throughout.',
    ],
  },
  {
    version: '0.11.0',
    date: '2026-08-08',
    title: 'Legal documents, read in full',
    items: [
      'Command now reads a legal document end to end: the dates, the jurisdiction, the recording details, everyone named in it and the role each one holds, and the provisions particular to that kind of document.',
      'Every value shows the page it came from, the wording behind it and how confident Command is. Click through to open the document at that page and check it yourself.',
      'What Command could not see is stated as plainly as what it could — a missing notarization page is reported as not detected in your copy, never as a judgement about the document.',
      'Social Security numbers, tax IDs and account numbers are masked on screen until you choose to reveal them.',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-08-08',
    title: 'Legal documents, recognized',
    items: [
      'Upload a will, trust, power of attorney, healthcare directive, deed or business agreement from the Legal section and Command tells you what it is — with the reason it thinks so and how confident it is.',
      'Fifty-odd legal document types across five categories. When Command is not sure, it says so, keeps the file exactly as uploaded, and lets you set the type yourself.',
      'Identical re-uploads are recognized as duplicates rather than filed twice, and re-reading a document adds a new version instead of overwriting the last one.',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-08-08',
    title: 'A profile you can edit',
    items: [
      'Add, edit and remove the people in your household — spouse or partner and children — each with a birth date, so ages stay current without anyone re-typing them.',
      'Household income and net worth can be corrected in place. Coverage health grades against these figures, so an out-of-date net worth was quietly skewing your liability findings.',
      'The app version now has a history behind it. Click the version number to see every release and what changed in it.',
      'The household change log is now labeled Activity, separately from release history — it tracks what you changed, not what we shipped.',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-08-08',
    title: 'Policies you control',
    items: [
      'Policies can be added manually when you cannot find the document, and every policy can be edited — useful when a carrier writes its own name three different ways.',
      'Fixed phantom vehicles and false duplicate warnings on the insurance page.',
      'Every change to a policy is versioned. Open History on any policy to see what changed, when, and what it was before.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-08-08',
    title: 'Coverage health',
    items: [
      'Coverage health grades how well your policies fit your household, comparing liability against net worth and dwelling limits against home value.',
      'Gaps in your paperwork are reported separately from gaps in your coverage, so a missing declarations page never drags the grade down.',
      'Each policy carries an executive summary and per-vehicle deductibles.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-08-08',
    title: 'Insurance, in depth',
    items: [
      'Upload a policy or declarations page and Command reads the coverages, limits, deductibles and covered vehicles — with the exact line it came from, so you can check any figure against the document.',
      'Extraction runs its passes concurrently, so a long policy finishes instead of timing out.',
      'The insurance page was rebuilt around coverage rather than paperwork.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-08-08',
    title: 'Sign-in that stays signed in',
    items: [
      'Fixed the hang that could leave the app on a loading spinner forever, and the sign-out button that silently did nothing.',
      'Onboarding no longer locks you out when one write fails.',
      'Your documents now live in a vault you can open, retry extraction on, and delete from — including the option to remove what a document added to your profile.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-08-03',
    title: 'Upload a document',
    items: [
      'Drag a document into Command and it is stored, read and filed against your household.',
      'Extracted detail is shown for review before anything is written to your profile.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-08-02',
    title: 'Family and returning users',
    items: [
      'Family milestones track the dates that trigger a review — a birthday, a graduation, a move.',
      'Returning users are recognized instead of being sent back through onboarding.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-05-31',
    title: 'Live household data',
    items: ['The Home view reads your real household data rather than sample content.'],
  },
  {
    version: '0.1.0',
    date: '2026-03-04',
    title: 'Accounts and onboarding',
    items: [
      'Create an account, answer a guided set of questions, and Command builds your household profile.',
    ],
  },
];

/** The running version. `npm run release` moves this and package.json together. */
export const APP_VERSION: string = RELEASE_NOTES[0]?.version ?? pkg.version;

if (import.meta.env.DEV && RELEASE_NOTES[0]?.version !== pkg.version) {
  console.warn(
    `Version drift: package.json is ${pkg.version} but the newest release note is ` +
      `${RELEASE_NOTES[0]?.version}. Use \`npm run release\` so the two move together.`,
  );
}

export function formatReleaseDate(iso: string): string {
  // Parsed as UTC; formatting in local time would show the previous day west of
  // Greenwich.
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}

const STORAGE_KEY = 'command:last-seen-version';

export function latestRelease(): ReleaseNote | null {
  return RELEASE_NOTES[0] ?? null;
}

/** Releases shipped since the user last looked, newest first. */
export function unseenReleases(): ReleaseNote[] {
  let lastSeen: string | null = null;
  try {
    lastSeen = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode). Showing the notes once per
    // session is a better failure than suppressing them entirely.
  }
  if (!lastSeen) return RELEASE_NOTES.slice(0, 1);

  const index = RELEASE_NOTES.findIndex((r) => r.version === lastSeen);
  // An unrecognized version means the stored value predates this build; show the
  // newest rather than assuming everything has been seen.
  return index === -1 ? RELEASE_NOTES.slice(0, 1) : RELEASE_NOTES.slice(0, index);
}

export function markReleasesSeen(): void {
  const latest = latestRelease();
  if (!latest) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, latest.version);
  } catch {
    // Nothing to do — it will simply prompt again next time.
  }
}
