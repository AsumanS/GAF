import { afterEach, describe, expect, it } from 'vitest';
import type { Env } from '../worker/env';
import {
  handleStripeSessionLookup,
  isCheckoutSessionId,
  isVerifiedPaidCheckoutSession,
} from '../worker/stripeSession';

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

describe('Checkout Session id validation', () => {
  it('accepts Stripe Checkout Session ids', () => {
    expect(isCheckoutSessionId('cs_test_a1b2c3')).toBe(true);
    expect(isCheckoutSessionId('cs_live_abcDEF123')).toBe(true);
  });

  it('rejects malformed session ids', () => {
    expect(isCheckoutSessionId('')).toBe(false);
    expect(isCheckoutSessionId('cs_')).toBe(false);
    expect(isCheckoutSessionId('pi_test_123')).toBe(false);
    expect(isCheckoutSessionId('cs_test_abc-def')).toBe(false);
    expect(isCheckoutSessionId('cs_test_a1B2_c3')).toBe(true);
    expect(isCheckoutSessionId(null)).toBe(false);
  });
});

describe('Checkout Session payment verification rules', () => {
  it('requires complete status with paid or no_payment_required', () => {
    expect(
      isVerifiedPaidCheckoutSession({
        status: 'complete',
        payment_status: 'paid',
        mode: 'payment',
      }),
    ).toBe(true);
    expect(
      isVerifiedPaidCheckoutSession({
        status: 'complete',
        payment_status: 'paid',
        mode: 'subscription',
      }),
    ).toBe(true);
    expect(
      isVerifiedPaidCheckoutSession({
        status: 'complete',
        payment_status: 'no_payment_required',
        mode: 'payment',
      }),
    ).toBe(true);
  });

  it('rejects incomplete or unpaid sessions', () => {
    expect(
      isVerifiedPaidCheckoutSession({
        status: 'open',
        payment_status: 'unpaid',
        mode: 'payment',
      }),
    ).toBe(false);
    expect(
      isVerifiedPaidCheckoutSession({
        status: 'complete',
        payment_status: 'unpaid',
        mode: 'subscription',
      }),
    ).toBe(false);
    expect(
      isVerifiedPaidCheckoutSession({
        status: 'expired',
        payment_status: 'paid',
        mode: 'payment',
      }),
    ).toBe(false);
  });
});

describe('GET /api/stripe/session', () => {
  it('rejects invalid session ids without calling Stripe', async () => {
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response('{}', { status: 200 });
    };

    const response = await handleStripeSessionLookup(
      new Request('https://example.com/api/stripe/session?session_id=not-valid'),
      baseEnv(),
    );
    const body = (await response.json()) as {
      success: boolean;
      verified?: boolean;
    };

    expect(called).toBe(false);
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.verified).toBe(false);
  });

  it('returns verified true for a complete paid one-time session', async () => {
    globalThis.fetch = async (input) => {
      expect(String(input)).toBe(
        'https://api.stripe.com/v1/checkout/sessions/cs_test_paid123',
      );
      return new Response(
        JSON.stringify({
          id: 'cs_test_paid123',
          status: 'complete',
          payment_status: 'paid',
          mode: 'payment',
        }),
        { status: 200 },
      );
    };

    const response = await handleStripeSessionLookup(
      new Request(
        'https://example.com/api/stripe/session?session_id=cs_test_paid123',
      ),
      baseEnv(),
    );
    const body = (await response.json()) as {
      success: boolean;
      verified: boolean;
      id?: string;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.verified).toBe(true);
    expect(body.id).toBeUndefined();
  });

  it('returns verified true for a complete paid subscription session', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          id: 'cs_test_sub123',
          status: 'complete',
          payment_status: 'paid',
          mode: 'subscription',
        }),
        { status: 200 },
      );

    const response = await handleStripeSessionLookup(
      new Request(
        'https://example.com/api/stripe/session?session_id=cs_test_sub123',
      ),
      baseEnv(),
    );
    const body = (await response.json()) as {
      success: boolean;
      verified: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.verified).toBe(true);
  });

  it('returns verified false when Stripe session is unpaid', async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          id: 'cs_test_open',
          status: 'open',
          payment_status: 'unpaid',
          mode: 'payment',
        }),
        { status: 200 },
      );

    const response = await handleStripeSessionLookup(
      new Request('https://example.com/api/stripe/session?session_id=cs_test_open'),
      baseEnv(),
    );
    const body = (await response.json()) as {
      success: boolean;
      verified: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.verified).toBe(false);
  });

  it('returns verified false when Stripe does not find the session', async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'No such checkout.session' } }), {
        status: 404,
      });

    const response = await handleStripeSessionLookup(
      new Request(
        'https://example.com/api/stripe/session?session_id=cs_test_missing',
      ),
      baseEnv(),
    );
    const body = (await response.json()) as {
      success: boolean;
      verified: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.verified).toBe(false);
  });
});
