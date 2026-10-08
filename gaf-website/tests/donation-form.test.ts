import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MONTHLY_AMOUNT,
  DEFAULT_ONE_TIME_AMOUNT,
  MONTHLY_PRESETS,
  ONE_TIME_PRESETS,
  areCardPaymentsEnabled,
  areDonationPaymentControlsEnabled,
  arePaypalPaymentsEnabled,
  buildDonationSummary,
  calculateCoveredProcessingFee,
  createInitialDonationFormState,
  formatUsd,
  isProcessingCostOptionEnabled,
  parseDonationAmount,
  presetsForFrequency,
  shouldShowDonationCtas,
  shouldShowInteractiveDonationForm,
} from '../src/lib/donationForm';
import { site } from '../src/config/site';

describe('donation form defaults', () => {
  it('selects one-time by default with $50', () => {
    const state = createInitialDonationFormState();
    expect(state.frequency).toBe('one-time');
    expect(state.oneTime.selection).toEqual({ kind: 'preset', value: DEFAULT_ONE_TIME_AMOUNT });
    expect(DEFAULT_ONE_TIME_AMOUNT).toBe(50);
    expect(state.coverProcessingCosts).toBe(false);
  });

  it('exposes the correct one-time amount presets', () => {
    expect([...ONE_TIME_PRESETS]).toEqual([25, 50, 100, 250, 500]);
    expect(presetsForFrequency('one-time')).toEqual(ONE_TIME_PRESETS);
  });

  it('exposes the correct monthly amount presets and default', () => {
    expect([...MONTHLY_PRESETS]).toEqual([10, 25, 50, 100, 250]);
    expect(DEFAULT_MONTHLY_AMOUNT).toBe(25);
    expect(presetsForFrequency('monthly')).toEqual(MONTHLY_PRESETS);
  });
});

describe('donation frequency and independent amounts', () => {
  it('keeps independent amount selections when switching frequency', () => {
    const state = createInitialDonationFormState();
    state.oneTime.selection = { kind: 'preset', value: 250 };
    state.monthly.selection = { kind: 'preset', value: 100 };

    state.frequency = 'monthly';
    expect(buildDonationSummary(state).donationLabel).toBe(formatUsd(100));

    state.frequency = 'one-time';
    expect(buildDonationSummary(state).donationLabel).toBe(formatUsd(250));
  });

  it('preserves a custom one-time amount while editing monthly', () => {
    const state = createInitialDonationFormState();
    state.oneTime.selection = { kind: 'other', raw: '75.50' };
    state.frequency = 'monthly';
    state.monthly.selection = { kind: 'preset', value: 10 };

    expect(buildDonationSummary(state).donationLabel).toBe(formatUsd(10));

    state.frequency = 'one-time';
    const summary = buildDonationSummary(state);
    expect(summary.valid).toBe(true);
    expect(summary.donationLabel).toBe(formatUsd(75.5));
  });
});

describe('custom amount validation', () => {
  it('accepts valid decimal amounts', () => {
    expect(parseDonationAmount('25')).toEqual({ ok: true, cents: 2500, dollars: 25 });
    expect(parseDonationAmount('1.00')).toEqual({ ok: true, cents: 100, dollars: 1 });
    expect(parseDonationAmount('12.5')).toEqual({ ok: true, cents: 1250, dollars: 12.5 });
    expect(parseDonationAmount('99.99')).toEqual({ ok: true, cents: 9999, dollars: 99.99 });
  });

  it('rejects empty, zero, negative, and invalid input', () => {
    expect(parseDonationAmount('').ok).toBe(false);
    expect(parseDonationAmount('0').ok).toBe(false);
    expect(parseDonationAmount('0.00').ok).toBe(false);
    expect(parseDonationAmount('-5').ok).toBe(false);
    expect(parseDonationAmount('abc').ok).toBe(false);
    expect(parseDonationAmount('12.345').ok).toBe(false);
    expect(parseDonationAmount('1,000').ok).toBe(false);
    expect(parseDonationAmount('$10').ok).toBe(false);
  });

  it('surfaces custom-amount errors in the summary', () => {
    const state = createInitialDonationFormState();
    state.oneTime.selection = { kind: 'other', raw: '0.50' };
    const summary = buildDonationSummary(state);
    expect(summary.valid).toBe(false);
    expect(summary.errorMessage).toMatch(/minimum/i);
    expect(summary.totalLabel).toBe('—');
  });
});

describe('donation summary', () => {
  it('shows donation, optional fee, and total payable', () => {
    const state = createInitialDonationFormState();
    let summary = buildDonationSummary(state);
    expect(summary.donationLabel).toBe(formatUsd(50));
    expect(summary.processingFeeLabel).toBe(formatUsd(0));
    expect(summary.totalLabel).toBe(formatUsd(50));
    expect(summary.totalNote).toBeNull();

    state.frequency = 'monthly';
    state.monthly.selection = { kind: 'preset', value: 25 };
    summary = buildDonationSummary(state);
    expect(summary.donationLabel).toBe(formatUsd(25));
    expect(summary.totalLabel).toBe(formatUsd(25));
    expect(summary.totalNote).toBe(
      'Your donation will automatically recur every month. You can cancel your recurring donation at any time.',
    );
  });

  it('adds covered processing fee to the total when selected', () => {
    expect(isProcessingCostOptionEnabled()).toBe(true);
    expect(calculateCoveredProcessingFee(50)).toBe(1.8);

    const state = createInitialDonationFormState();
    state.coverProcessingCosts = true;
    const summary = buildDonationSummary(state);
    expect(summary.donationLabel).toBe(formatUsd(50));
    expect(summary.processingFeeLabel).toBe(formatUsd(1.8));
    expect(summary.totalLabel).toBe(formatUsd(51.8));
  });
});

describe('anonymous and processing-cost controls', () => {
  it('tracks anonymous selection in form state', () => {
    const state = createInitialDonationFormState();
    expect(state.anonymous).toBe(false);
    state.anonymous = true;
    expect(state.anonymous).toBe(true);
  });

  it('enables the processing-cost option', () => {
    expect(isProcessingCostOptionEnabled()).toBe(true);
  });
});

describe('payment and donation-access safeguards', () => {
  it('keeps donationsEnabled true in site configuration', () => {
    expect(site.donationsEnabled).toBe(true);
    expect(site.fundraisingStatus).toBe('enabled');
  });

  it('keeps Donate CTAs and the interactive form available to visitors', () => {
    expect(shouldShowDonationCtas()).toBe(true);
    expect(shouldShowInteractiveDonationForm()).toBe(true);
  });

  it('does not let empty jurisdiction lists hide donation access helpers', () => {
    expect(site.approvedDonationJurisdictions).toEqual([]);
    expect(shouldShowDonationCtas()).toBe(true);
    expect(shouldShowInteractiveDonationForm()).toBe(true);
  });

  it('keeps card payments enabled and PayPal disabled', () => {
    expect(areCardPaymentsEnabled()).toBe(true);
    expect(arePaypalPaymentsEnabled()).toBe(false);
    expect(areDonationPaymentControlsEnabled()).toBe(true);
  });

  it('does not invent PayPal payment request endpoints in the donation helpers', () => {
    const source = [
      shouldShowInteractiveDonationForm.name,
      areCardPaymentsEnabled.name,
      arePaypalPaymentsEnabled.name,
      buildDonationSummary.name,
    ].join(' ');
    expect(source).not.toMatch(/paypal\.com/i);
  });
});

describe('accessibility-oriented control contracts', () => {
  it('exposes keyboard-friendly frequency labels and amount presets', () => {
    expect(presetsForFrequency('one-time')).toHaveLength(5);
    expect(presetsForFrequency('monthly')).toHaveLength(5);
    const state = createInitialDonationFormState();
    expect(buildDonationSummary(state).frequencyLabel).toBe('One-time');
  });

  it('formats currency for screen-readable summaries', () => {
    expect(formatUsd(50)).toBe('$50.00');
    expect(formatUsd(10)).toBe('$10.00');
  });
});
