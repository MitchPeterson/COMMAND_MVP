// What the transactions say the household should know.
//
// The bar for a finding here is that it is checkable and that acting on it is
// obvious. "You spend a lot on dining" fails both: a lot compared to what, and
// do what about it. "Four subscriptions renew for $1,880 a year, and one of
// them went from $12.99 to $17.99 in June" passes both.
//
// So every finding below is arithmetic on transactions the household uploaded,
// carries the figure it was drawn from, and points at something specific. None
// of them is advice -- Command reports what the statements show and what it
// could not see, and whether a household should cancel a subscription or move
// its savings is theirs to decide.
//
// The other half of the job is knowing when to stay quiet. Findings drawn from
// one partial month are noise, so most of these require two whole months
// before they will say anything, and the ones that cannot are held back with a
// reason rather than shown with a shrug.

import type { Cashflow } from './cashflow';
import { overdraftCharges } from './cashflow';
import type { RecurringSummary } from './recurring';
import type { FinanceFinding } from './financesHealth';

export interface SpendingInsights {
  /** Things to act on, worst first. */
  findings: FinanceFinding[];
  /** Money that could be recovered, with the figure attached. */
  opportunities: FinanceFinding[];
  /** What Command cannot see, which shapes how much any of this is worth. */
  limits: FinanceFinding[];
  /** The one-line summary above them all. */
  headline: string;
  /**
   * Annual money that could actually be got back.
   *
   * Fees, overdrafts and price rises only. A subscription total is money
   * worth reviewing, not money recoverable -- nobody cancels all of them, and
   * adding the full figure here would put "$675 a year to get back" next to a
   * list the household mostly intends to keep paying.
   */
  recoverable: number;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const exact = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const pct = (value: number) => `${Math.round(value)}%`;

/**
 * Whether a recurring cost is one the household could stop paying next month.
 *
 * A mortgage, an insurance premium and the electricity bill recur exactly as
 * reliably as a streaming subscription, and nothing that can be said about one
 * applies to the other. Matched on substrings because the category can arrive
 * from the issuer, from a keyword rule or from the user, and all three spell
 * it differently.
 */
const COMMITTED = [
  'housing', 'loan', 'mortgage', 'rent', 'insur', 'utilit', 'tax',
  'health', 'medical', 'education', 'childcare', 'tuition', 'fee',
];

const isCommitted = (category: string | null | undefined) =>
  COMMITTED.some((c) => (category ?? '').toLowerCase().includes(c));

export function computeSpendingInsights(
  cashflow: Cashflow,
  recurring: RecurringSummary,
): SpendingInsights {
  const findings: FinanceFinding[] = [];
  const opportunities: FinanceFinding[] = [];
  const limits: FinanceFinding[] = [];
  let recoverable = 0;

  const whole = cashflow.wholeMonths.length;
  const enoughHistory = whole >= 2;

  // ── Red flags ─────────────────────────────────────────────────────────────

  // Spending past income. Only where income is credibly in view, because a
  // card export has no salary in it and would show every month overspent.
  if (cashflow.incomeVisible && cashflow.monthsOverspent.length > 0) {
    const worst = [...cashflow.monthsOverspent].sort((a, b) => a.net - b.net)[0];
    const total = cashflow.monthsOverspent.reduce((s, m) => s + Math.abs(m.net), 0);
    const all = cashflow.monthsOverspent.length === whole && whole > 1;
    findings.push({
      severity: all || cashflow.monthsOverspent.length >= 3 ? 'critical' : 'attention',
      title: all
        ? `Spending exceeded income in every month on file`
        : `Spending exceeded income in ${cashflow.monthsOverspent.length} of ${whole} months`,
      detail: `${money(total)} more went out than came in across those months, worst in `
        + `${worst.label} at ${money(Math.abs(worst.net))}. Transfers between your own accounts are `
        + `not counted either way, so this is spending against income, not money moved around.`,
    });
  }

  // Overdrafts are their own problem, with their own remedy.
  const overdrafts = overdraftCharges(cashflow);
  if (overdrafts.length > 0) {
    const total = overdrafts.reduce((s, f) => s + f.amount, 0);
    const count = overdrafts.reduce((s, f) => s + f.count, 0);
    findings.push({
      severity: 'critical',
      title: `${count} overdraft or returned-item fee${count === 1 ? '' : 's'}, ${money(total)}`,
      detail: `Charged over the ${cashflow.months.length} month${cashflow.months.length === 1 ? '' : 's'} on file. `
        + `Most banks will refund the first one asked about, and most offer an overdraft link to a `
        + `savings account that costs nothing.`,
    });
    recoverable += (total / Math.max(cashflow.months.length, 1)) * 12;
  }

  // Everything else charged as a fee or interest.
  const otherFees = cashflow.fees.items.filter((f) => !overdrafts.includes(f));
  if (otherFees.length > 0) {
    const total = otherFees.reduce((s, f) => s + f.amount, 0);
    const annual = (total / Math.max(cashflow.months.length, 1)) * 12;
    if (total >= 25) {
      findings.push({
        severity: annual >= 600 ? 'attention' : 'info',
        title: `${money(total)} in fees and interest`,
        detail: `Across ${cashflow.months.length} month${cashflow.months.length === 1 ? '' : 's'}, which runs at `
          + `about ${money(annual)} a year. The largest ${otherFees.length === 1 ? 'is' : 'are'} `
          + `${otherFees.slice(0, 3).map((f) => `${f.merchant} (${money(f.amount)})`).join(', ')}.`,
      });
      recoverable += annual;
    }
  }

  if (cashflow.cashAdvances.count > 0) {
    findings.push({
      severity: 'attention',
      title: `${cashflow.cashAdvances.count} cash advance${cashflow.cashAdvances.count === 1 ? '' : 's'}, ${money(cashflow.cashAdvances.total)}`,
      detail: 'Cash advances usually carry a fee, a higher rate than purchases, and no grace period — '
        + 'interest starts the day the money is taken rather than at the end of the statement.',
    });
  }

  // A category that moved sharply. Reported as a fact with both figures, not
  // as a judgement about whether the household should have spent it.
  if (enoughHistory && cashflow.categoryMoves.length > 0) {
    const move = cashflow.categoryMoves[0];
    // A category that went from nothing to something is usually the most
    // notable thing in the month -- a $4,000 trip against $0 of travel the
    // month before -- and an earlier version required prior > 0, so it was
    // the one move that could never be reported.
    const appeared = move.prior === 0 && move.recent > 400;
    if (appeared) {
      findings.push({
        severity: 'info',
        title: `${money(move.recent)} of ${move.label.toLowerCase()}, where there was none the month before`,
        detail: `Nothing in this category in ${cashflow.wholeMonths[1]?.label ?? 'the prior month'}. `
          + `One month is not a trend, but it is the largest move in your categories and worth `
          + `knowing whether it was expected.`,
      });
    } else if (move.change > 400 && move.changePct > 40 && move.prior > 0) {
      findings.push({
        severity: 'info',
        title: `${move.label} rose ${pct(move.changePct)} last month`,
        detail: `${money(move.recent)} against ${money(move.prior)} the month before, `
          + `${money(move.change)} more. One month is not a trend, but it is the largest move in your `
          + `categories and worth knowing whether it was deliberate.`,
      });
    }
  }

  // A thin savings rate, stated against the figure it came from.
  if (cashflow.savingsRate != null && enoughHistory) {
    if (cashflow.savingsRate < 0) {
      // Already covered by the overspent finding above; nothing to add.
    } else if (cashflow.savingsRate < 5) {
      findings.push({
        severity: 'attention',
        title: `About ${pct(cashflow.savingsRate)} of income is left over`,
        detail: `${money(cashflow.averageIncome!)} in, ${money(cashflow.averageExpenses!)} out, on average `
          + `across ${whole} whole month${whole === 1 ? '' : 's'}. That leaves `
          + `${money(cashflow.averageIncome! - cashflow.averageExpenses!)} a month against anything unplanned.`,
      });
    }
  }

  // ── Opportunities ─────────────────────────────────────────────────────────

  // A recurring charge whose price went up. The strongest single finding here:
  // nobody notices these, and nothing else in the household's records would
  // ever surface one.
  const raised = recurring.charges.filter((c) => c.priceIncrease);
  if (raised.length > 0) {
    const annual = raised.reduce((s, c) => s + (c.priceIncrease?.annualDifference ?? 0), 0);
    opportunities.push({
      severity: raised.length > 1 ? 'attention' : 'info',
      title: `${raised.length} recurring charge${raised.length === 1 ? ' went' : 's went'} up in price`,
      detail: raised.slice(0, 4).map((c) =>
        `${c.merchant} from ${exact(c.priceIncrease!.from)} to ${exact(c.priceIncrease!.to)} in `
        + `${c.priceIncrease!.since.slice(0, 7)}`).join('; ')
        + `. ${raised.length === 1 ? 'That is' : 'Together that is'} ${money(annual)} a year more than before.`,
    });
    recoverable += annual;
  }

  // What renews automatically, as a yearly figure. $14.99 a month is
  // invisible; $180 a year is a decision.
  //
  // Split, because a mortgage and a streaming subscription are both recurring
  // and nothing else about them is alike. Lumped together the headline read
  // "6 recurring charges cost $36,335 a year", which is true, useless, and
  // filed under money to get back -- as though the household could cancel its
  // mortgage. The committed side is reported as a fact; only the discretionary
  // side is framed as something to act on.
  if (recurring.charges.length > 0 && !recurring.singlePeriod) {
    const committed = recurring.charges.filter((c) => isCommitted(c.category));
    const optional = recurring.charges.filter((c) => !isCommitted(c.category));

    if (optional.length > 0) {
      const annual = optional.reduce((sum, c) => sum + c.annualCost, 0);
      opportunities.push({
        severity: annual >= 1200 ? 'attention' : 'info',
        title: `${optional.length} subscription${optional.length === 1 ? '' : 's'} and membership${optional.length === 1 ? '' : 's'} cost ${money(annual)} a year`,
        detail: `${optional.slice(0, 5).map((c) => `${c.merchant} (${money(c.annualCost)})`).join(', ')}. `
          + `Each was found by seeing it repeat, not guessed from the merchant's name — so this is `
          + `what is actually being charged, not what was signed up for.`,
      });
      // Deliberately not added to recoverable. See the note on the field.
    }

    if (committed.length > 0) {
      const annual = committed.reduce((sum, c) => sum + c.annualCost, 0);
      findings.push({
        severity: 'info',
        title: `${money(annual / 12)} a month is committed before anything else`,
        detail: `${committed.length} fixed commitment${committed.length === 1 ? '' : 's'} — `
          + `${committed.slice(0, 4).map((c) => c.merchant).join(', ')}`
          + `${committed.length > 4 ? ' and others' : ''}. These are not discretionary, and knowing `
          + `the figure is what makes the rest of the month legible.`,
      });
    }
  }

  // A charge that recurred and then stopped. Either it was cancelled, which
  // is worth confirming stuck, or a bill was missed.
  if (enoughHistory && cashflow.latest) {
    const currentMonth = cashflow.latest.slice(0, 7);
    const lapsed = recurring.charges.filter(
      (c) => c.occurrences >= 3 && c.lastSeen.slice(0, 7) < currentMonth && c.annualCost >= 120,
    );
    if (lapsed.length > 0) {
      opportunities.push({
        severity: 'info',
        title: `${lapsed.length} regular charge${lapsed.length === 1 ? '' : 's'} stopped appearing`,
        detail: `${lapsed.slice(0, 3).map((c) => `${c.merchant}, last seen ${c.lastSeen}`).join('; ')}. `
          + `Either it was cancelled — worth confirming it stayed cancelled — or a bill was missed.`,
      });
    }
  }

  // Concentration in one merchant, where it is large enough to matter and
  // where doing something about it is possible.
  //
  // Committed bills are excluded. The mortgage is reliably the largest
  // merchant in any checking account, and "39% of spending went to your
  // mortgage — consider a card that earns more on that category" is the sort
  // of thing that makes a household stop trusting the rest of the page.
  const discretionary = cashflow.merchants.filter((m) => !isCommitted(m.category));
  const biggest = discretionary[0];
  if (biggest && cashflow.totalExpenses > 0) {
    const share = (biggest.amount / cashflow.totalExpenses) * 100;
    if (share >= 12 && biggest.count >= 4) {
      opportunities.push({
        severity: 'info',
        title: `${pct(share)} of spending went to ${biggest.merchant}`,
        detail: `${money(biggest.amount)} over ${biggest.count} transactions, in ${biggest.category.toLowerCase()}. `
          + `A single merchant at this share is where a card that earns more on one category, or a `
          + `membership that changes the price, is worth the arithmetic.`,
      });
    }
  }

  // ── What limits this ──────────────────────────────────────────────────────

  if (!cashflow.incomeVisible) {
    limits.push({
      severity: 'info',
      title: 'No income in view',
      detail: cashflow.fromStatementsOnly
        ? 'Everything here came from card statements, which have no salary in them. Import a '
          + 'checking account export and the savings rate and the income comparison become available.'
        : 'Nothing imported looks like recurring income, so spending cannot be weighed against '
          + 'what came in.',
    });
  }

  // The largest hole this page can have, and the one that makes the leftover
  // figure above it too flattering: a card is being paid off from an account
  // on file, and that card's own purchases are not on file at all. The
  // payment is correctly excluded as a transfer, so the spending it stands
  // for is counted nowhere.
  if (cashflow.cardPayments.count > 0 && !cashflow.hasCardTransactions) {
    const monthly = cashflow.cardPayments.total / Math.max(cashflow.months.length, 1);
    limits.push({
      severity: 'info',
      title: `${money(monthly)} a month goes to a credit card that is not on file`,
      detail: `${cashflow.cardPayments.count} card payment${cashflow.cardPayments.count === 1 ? '' : 's'} `
        + `totalling ${money(cashflow.cardPayments.total)}. Those payments are correctly left out of `
        + `spending — they are a transfer, not a purchase — but the purchases behind them are not here `
        + `either, so the money left over above is more than what is really free. Import that card's `
        + `export and the two halves join up.`,
    });
  }

  const partial = cashflow.months.filter((m) => m.partial);
  if (partial.length > 0) {
    limits.push({
      severity: 'info',
      title: `${partial.map((m) => m.label).join(' and ')} ${partial.length === 1 ? 'is' : 'are'} only partly covered`,
      detail: 'A statement period does not start on the first of the month, so the months at each end '
        + 'of an import hold part of a month. They are shown, and left out of the averages.',
    });
  }

  if (!enoughHistory) {
    limits.push({
      severity: 'info',
      title: whole === 1 ? 'One whole month on file' : 'Less than a whole month on file',
      detail: 'Most of what this page can say needs two months to compare. Import a longer export, '
        + 'or add the next one when it arrives.',
    });
  }

  if (recurring.singlePeriod && recurring.considered > 0) {
    limits.push({
      severity: 'info',
      title: 'Recurring charges need more than one period',
      detail: 'Nothing can be seen repeating inside a single statement. A second one, from any month, '
        + 'is enough to start finding them.',
    });
  }

  const headline = cashflow.transactionCount === 0
    ? 'No transactions on file yet.'
    : cashflow.incomeVisible && cashflow.averageIncome && cashflow.averageExpenses
      ? `${money(cashflow.averageIncome)} in and ${money(cashflow.averageExpenses)} out in a typical month, `
        + `across ${cashflow.transactionCount} transactions.`
      : `${money(cashflow.totalExpenses)} of spending across ${cashflow.transactionCount} transactions `
        + `in ${cashflow.months.length} month${cashflow.months.length === 1 ? '' : 's'}.`;

  const rank = { critical: 0, attention: 1, info: 2 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
  opportunities.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return { findings, opportunities, limits, headline, recoverable };
}
