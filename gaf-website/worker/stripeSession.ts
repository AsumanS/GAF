import type { Env } from './env';

/** Stripe Checkout Session id prefix (test or live). */
const CHECKOUT_SESSION_ID_PATTERN = /^cs_[a-zA-Z0-9_]+$/;

type StripeCheckoutSessionLookup = {
  id?: string;
  status?: string | null;
  payment_status?: string | null;
  mode?: string | null;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === 'string' && CHECKOUT_SESSION_ID_PATTERN.test(value);
}

/**
 * True when the Checkout Session represents a completed paid (or no-payment)
 * donation — one-time payment or first subscription invoice.
 */
export function isVerifiedPaidCheckoutSession(
  session: StripeCheckoutSessionLookup,
): boolean {
  if (session.status !== 'complete') {
    return false;
  }
  return (
    session.payment_status === 'paid' ||
    session.payment_status === 'no_payment_required'
  );
}

/**
 * GET /api/stripe/session?session_id=cs_…
 * Confirms Checkout Session payment status with Stripe (server-side).
 * Does not return session ids, amounts, or PII to the client.
 */
export async function handleStripeSessionLookup(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'GET') {
    return json(405, {
      success: false,
      error: 'method_not_allowed',
    });
  }

  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!isCheckoutSessionId(sessionId)) {
    return json(400, {
      success: false,
      error: 'invalid_session',
      verified: false,
    });
  }

  const stripeResponse = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      },
    },
  );

  let session: StripeCheckoutSessionLookup;
  try {
    session = (await stripeResponse.json()) as StripeCheckoutSessionLookup;
  } catch {
    return json(502, {
      success: false,
      error: 'stripe_invalid_response',
      verified: false,
    });
  }

  if (!stripeResponse.ok) {
    return json(200, {
      success: true,
      verified: false,
    });
  }

  return json(200, {
    success: true,
    verified: isVerifiedPaidCheckoutSession(session),
  });
}
