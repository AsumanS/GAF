import { afterEach, describe, expect, it } from 'vitest';
import type { Env } from '../worker/env';
import {
  ONE_TIME_DONATION_PAYMENT_DESCRIPTION,
  handleStripeCheckout,
} from '../worker/stripeCheckout';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function baseEnv(): Env {
  return {
    ASSETS: {} as Env['ASSETS'],
    SUBMISSIONS_DB: {} as Env['SUBMISSIONS_DB'],
    SUBMISSION_FILES: {} as Env['SUBMISSION_FILES'],
    TURNSTILE_SECRET_KEY: 'turnstile',
    GMAIL_CLIENT_ID: 'gmail-id',
    GMAIL_CLIENT_SECRET: 'gmail-secret',
    GMAIL_REFRESH_TOKEN: 'gmail-refresh',
    SUBMISSION_FILE_LINK_SECRET: 'hmac',
    STRIPE_SECRET_KEY: 'sk_test_stripe_secret',
  };
}

async function captureStripeCheckoutBody(
  body: Record<string, unknown>,
): Promise<URLSearchParams> {
  let captured = '';
  globalThis.fetch = async (input, init) => {
    expect(String(input)).toBe('https://api.stripe.com/v1/checkout/sessions');
    captured = String(init?.body ?? '');
    return new Response(
      JSON.stringify({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      }),
      { status: 200 },
    );
  };

  const response = await handleStripeCheckout(
    new Request('https://example.com/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    baseEnv(),
  );
  expect(response.status).toBe(200);
  return new URLSearchParams(captured);
}

describe('Stripe Checkout Session — billing address collection', () => {
  it('requires billing address and creates a Customer for one-time payments', async () => {
    const params = await captureStripeCheckoutBody({
      frequency: 'one-time',
      amountCents: 5000,
    });

    expect(params.get('mode')).toBe('payment');
    expect(params.get('billing_address_collection')).toBe('required');
    expect(params.get('customer_creation')).toBe('always');
  });

  it('requires billing address for monthly subscriptions without customer_creation', async () => {
    const params = await captureStripeCheckoutBody({
      frequency: 'monthly',
      amountCents: 2500,
    });

    expect(params.get('mode')).toBe('subscription');
    expect(params.get('billing_address_collection')).toBe('required');
    // Subscription mode already creates a Customer; customer_creation is payment-mode only.
    expect(params.has('customer_creation')).toBe(false);
  });
});

describe('Stripe Checkout Session — one-time receipt description', () => {
  it('sets the exact payment_intent description for mode=payment', async () => {
    const params = await captureStripeCheckoutBody({
      frequency: 'one-time',
      amountCents: 5000,
    });

    expect(params.get('mode')).toBe('payment');
    expect(params.get('payment_intent_data[description]')).toBe(
      ONE_TIME_DONATION_PAYMENT_DESCRIPTION,
    );
    expect(params.get('payment_intent_data[description]')).toBe(
      'Charitable contribution to Golden Archive Foundation (EIN: 41-2754875). No goods or services were provided in exchange for this contribution.',
    );
  });

  it('preserves one-time amount, metadata, and redirect URLs', async () => {
    const params = await captureStripeCheckoutBody({
      frequency: 'one-time',
      amountCents: 5000,
    });

    expect(params.get('line_items[0][price_data][unit_amount]')).toBe('5000');
    expect(params.get('line_items[0][price_data][currency]')).toBe('usd');
    expect(params.get('metadata[frequency]')).toBe('one-time');
    expect(params.get('metadata[donation_amount_cents]')).toBe('5000');
    expect(params.has('metadata[cover_processing_costs]')).toBe(false);
    expect(params.has('metadata[charge_amount_cents]')).toBe(false);
    expect(params.get('payment_intent_data[metadata][donation_amount_cents]')).toBe(
      '5000',
    );
    expect(params.get('success_url')).toBe(
      'https://example.com/donate?payment=success&session_id={CHECKOUT_SESSION_ID}',
    );
    expect(params.get('cancel_url')).toBe(
      'https://example.com/donate?payment=cancelled',
    );
    expect(params.has('invoice_creation[enabled]')).toBe(false);
    expect(params.get('billing_address_collection')).toBe('required');
    expect(params.get('customer_creation')).toBe('always');
  });
});

describe('Stripe Checkout Session — monthly unchanged', () => {
  it('does not set payment_intent_data description for subscriptions', async () => {
    const params = await captureStripeCheckoutBody({
      frequency: 'monthly',
      amountCents: 2500,
    });

    expect(params.get('mode')).toBe('subscription');
    expect(params.has('payment_intent_data[description]')).toBe(false);
    expect(params.has('payment_intent_data[metadata][frequency]')).toBe(false);
    expect(params.get('subscription_data[metadata][frequency]')).toBe('monthly');
    expect(params.get('subscription_data[metadata][donation_amount_cents]')).toBe(
      '2500',
    );
    expect(params.get('line_items[0][price_data][recurring][interval]')).toBe(
      'month',
    );
    expect(params.get('line_items[0][price_data][product_data][name]')).toBe(
      'Monthly donation to Golden Archive Foundation',
    );
    expect(params.get('billing_address_collection')).toBe('required');
  });
});

describe('Stripe Checkout Session — project metadata', () => {
  it('defaults one-time donations to project=general on Session and PaymentIntent', async () => {
    const params = await captureStripeCheckoutBody({
      frequency: 'one-time',
      amountCents: 5000,
    });

    expect(params.get('metadata[project]')).toBe('general');
    expect(params.get('payment_intent_data[metadata][project]')).toBe('general');
    expect(params.has('subscription_data[metadata][project]')).toBe(false);
  });

  it('attaches each supported project id for one-time Checkout', async () => {
    for (const project of ['hidden-works', 'worlds-imagined'] as const) {
      const params = await captureStripeCheckoutBody({
        frequency: 'one-time',
        amountCents: 2500,
        project,
      });
      expect(params.get('metadata[project]')).toBe(project);
      expect(params.get('payment_intent_data[metadata][project]')).toBe(project);
      expect(params.get('success_url')).toBe(
        `https://example.com/donate?project=${project}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
      );
      expect(params.get('cancel_url')).toBe(
        `https://example.com/donate?project=${project}&payment=cancelled`,
      );
    }
  });

  it('ignores manipulated project ids and records general instead', async () => {
    const params = await captureStripeCheckoutBody({
      frequency: 'one-time',
      amountCents: 2500,
      project: 'not-a-real-project',
    });
    expect(params.get('metadata[project]')).toBe('general');
    expect(params.get('payment_intent_data[metadata][project]')).toBe('general');
    expect(params.get('success_url')).toBe(
      'https://example.com/donate?payment=success&session_id={CHECKOUT_SESSION_ID}',
    );
  });

  it('attaches project to Session and Subscription metadata for monthly Checkout', async () => {
    const params = await captureStripeCheckoutBody({
      frequency: 'monthly',
      amountCents: 2500,
      project: 'hidden-works',
    });

    expect(params.get('mode')).toBe('subscription');
    expect(params.get('metadata[project]')).toBe('hidden-works');
    expect(params.get('subscription_data[metadata][project]')).toBe('hidden-works');
    // Renewal attribution: Stripe copies Subscription metadata onto each Invoice
    // as subscription_details.metadata (not onto renewal PaymentIntents).
    expect(params.has('payment_intent_data[metadata][project]')).toBe(false);
    expect(params.get('cancel_url')).toBe(
      'https://example.com/donate?project=hidden-works&payment=cancelled',
    );
  });

  it('defaults monthly donations to project=general on Subscription metadata', async () => {
    const params = await captureStripeCheckoutBody({
      frequency: 'monthly',
      amountCents: 1000,
    });
    expect(params.get('metadata[project]')).toBe('general');
    expect(params.get('subscription_data[metadata][project]')).toBe('general');
  });
});
