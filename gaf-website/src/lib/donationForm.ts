/**
 * Frontend donation form state helpers.
 * No payment processing — validation and presentation only.
 */

export type DonationFrequency = 'one-time' | 'monthly';

export type AmountSelection =
  | { kind: 'preset'; value: number }
  | { kind: 'other'; raw: string };

export type FrequencyAmountState = {
  selection: AmountSelection;
};

export type DonationFormState = {
  frequency: DonationFrequency;
  oneTime: FrequencyAmountState;
  monthly: FrequencyAmountState;
};

export type ParsedAmount =
  | { ok: true; cents: number; dollars: number }
  | { ok: false; message: string };

export type DonationSummary = {
  frequency: DonationFrequency;
  frequencyLabel: string;
  donationLabel: string;
  totalLabel: string;
  totalNote: string | null;
  valid: boolean;
  errorMessage: string | null;
  /** @deprecated Use donationLabel */
  amountLabel: string;
};

export const ONE_TIME_PRESETS = [25, 50, 100, 250, 500] as const;
export const MONTHLY_PRESETS = [10, 25, 50, 100, 250] as const;
export const DEFAULT_ONE_TIME_AMOUNT = 50;
export const DEFAULT_MONTHLY_AMOUNT = 25;
export const MIN_DONATION_DOLLARS = 1;

export const FREQUENCY_LABELS: Record<DonationFrequency, string> = {
  'one-time': 'One-time',
  monthly: 'Monthly',
};

const MONTHLY_NOTE =
  'Your donation will automatically recur every month. You can cancel your recurring donation at any time.';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function presetsForFrequency(frequency: DonationFrequency): readonly number[] {
  return frequency === 'monthly' ? MONTHLY_PRESETS : ONE_TIME_PRESETS;
}

export function defaultPresetForFrequency(frequency: DonationFrequency): number {
  return frequency === 'monthly' ? DEFAULT_MONTHLY_AMOUNT : DEFAULT_ONE_TIME_AMOUNT;
}

export function createInitialDonationFormState(): DonationFormState {
  return {
    frequency: 'one-time',
    oneTime: { selection: { kind: 'preset', value: DEFAULT_ONE_TIME_AMOUNT } },
    monthly: { selection: { kind: 'preset', value: DEFAULT_MONTHLY_AMOUNT } },
  };
}

export function activeAmountState(state: DonationFormState): FrequencyAmountState {
  return state.frequency === 'monthly' ? state.monthly : state.oneTime;
}

export function formatUsd(dollars: number): string {
  return currencyFormatter.format(dollars);
}

/**
 * Parse a custom USD amount string.
 * Accepts integers and up to two decimal places. Rejects negatives, zero,
 * empty values, invalid characters, and excess precision.
 */
export function parseDonationAmount(raw: string): ParsedAmount {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: 'Enter a donation amount of at least $1.00.' };
  }

  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    if (/[^\d.]/.test(trimmed) || (trimmed.match(/\./g) ?? []).length > 1) {
      return {
        ok: false,
        message: 'Enter a valid USD amount using numbers only (up to two decimal places).',
      };
    }
    if (/\.\d{3,}$/.test(trimmed)) {
      return {
        ok: false,
        message: 'Enter at most two decimal places.',
      };
    }
    return {
      ok: false,
      message: 'Enter a valid USD amount using numbers only (up to two decimal places).',
    };
  }

  const dollars = Number(trimmed);
  if (!Number.isFinite(dollars)) {
    return {
      ok: false,
      message: 'Enter a valid USD amount using numbers only (up to two decimal places).',
    };
  }

  if (dollars < MIN_DONATION_DOLLARS) {
    return { ok: false, message: 'The minimum donation is $1.00.' };
  }

  const cents = Math.round(dollars * 100);
  return { ok: true, cents, dollars: cents / 100 };
}

export function resolveSelectedAmount(selection: AmountSelection): ParsedAmount {
  if (selection.kind === 'preset') {
    if (selection.value < MIN_DONATION_DOLLARS) {
      return { ok: false, message: 'The minimum donation is $1.00.' };
    }
    return {
      ok: true,
      cents: Math.round(selection.value * 100),
      dollars: selection.value,
    };
  }
  return parseDonationAmount(selection.raw);
}

export function buildDonationSummary(state: DonationFormState): DonationSummary {
  const amount = resolveSelectedAmount(activeAmountState(state).selection);
  const frequencyLabel = FREQUENCY_LABELS[state.frequency];
  const totalNote = state.frequency === 'monthly' ? MONTHLY_NOTE : null;

  if (!amount.ok) {
    return {
      frequency: state.frequency,
      frequencyLabel,
      donationLabel: '—',
      totalLabel: '—',
      amountLabel: '—',
      totalNote,
      valid: false,
      errorMessage: amount.message,
    };
  }

  const donationLabel = formatUsd(amount.dollars);

  return {
    frequency: state.frequency,
    frequencyLabel,
    donationLabel,
    totalLabel: donationLabel,
    amountLabel: donationLabel,
    totalNote,
    valid: true,
    errorMessage: null,
  };
}

/** Public Donate CTAs are always available on the authorized donation interface. */
export function shouldShowDonationCtas(): boolean {
  return true;
}

/** Interactive donation form is available to all visitors. */
export function shouldShowInteractiveDonationForm(): boolean {
  return true;
}

/** Card checkout via Stripe is the only donation payment provider. */
export function areCardPaymentsEnabled(): boolean {
  return true;
}

/**
 * @deprecated Prefer areCardPaymentsEnabled.
 * Kept for older call sites; true only when card payments are on.
 */
export function areDonationPaymentControlsEnabled(options?: {
  paymentsIntegrated?: boolean;
}): boolean {
  if (options && options.paymentsIntegrated === false) {
    return false;
  }
  return areCardPaymentsEnabled();
}
