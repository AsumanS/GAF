import type { Env } from './env';
import {
  DONATION_PROJECT_METADATA_KEY,
  GENERAL_DONATION_PROJECT,
  resolveDonationProjectId,
} from './donationProjects';

/**
 * Appears on the PaymentIntent / Charge for one-time Checkout (`mode=payment`).
 * Stripe documents this as receipt-customization text for payment receipts.
 */
export const ONE_TIME_DONATION_PAYMENT_DESCRIPTION =
  'Charitable contribution to Golden Archive Foundation (EIN: 41-2754875). No goods or services were provided in exchange for this contribution.';

type CheckoutRequest = {
  frequency?: unknown;
  amountCents?: unknown;
  /** Donation project designation — validated against an allowlist. */
  project?: unknown;
};

type StripeCheckoutSession = {
  id?: string;
  url?: string | null;
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

export async function handleStripeCheckout(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST') {
    return json(405, {
      success: false,
      error: 'method_not_allowed',
    });
  }

  let body: CheckoutRequest;

  try {
    body = (await request.json()) as CheckoutRequest;
  } catch {
    return json(400, {
      success: false,
      error: 'invalid_request',
    });
  }

  const frequency = body.frequency;
  const amountCents = body.amountCents;

  if (frequency !== 'one-time' && frequency !== 'monthly') {
    return json(400, {
      success: false,
      error: 'invalid_frequency',
    });
  }

  if (
    !Number.isInteger(amountCents) ||
    typeof amountCents !== 'number' ||
    amountCents < 100 ||
    amountCents > 99_999_999
  ) {
    return json(400, {
      success: false,
      error: 'invalid_amount',
    });
  }

  const origin = new URL(request.url).origin;
  const monthly = frequency === 'monthly';
  // Unsupported client values become `general` — never honor arbitrary project ids.
  const projectId = resolveDonationProjectId(body.project);

  const params = new URLSearchParams();

  params.set('mode', monthly ? 'subscription' : 'payment');

  // Keep `{CHECKOUT_SESSION_ID}` unencoded — Stripe substitutes it literally.
  const projectQuery =
    projectId !== GENERAL_DONATION_PROJECT
      ? `project=${encodeURIComponent(projectId)}&`
      : '';
  params.set(
    'success_url',
    `${origin}/donate?${projectQuery}payment=success&session_id={CHECKOUT_SESSION_ID}`,
  );
  params.set(
    'cancel_url',
    `${origin}/donate?${projectQuery}payment=cancelled`,
  );

  // Collect full billing address (and name) on Stripe Checkout for IRS reporting.
  // Stored by Stripe on Customer / PaymentMethod — not in Foundation D1.
  params.set('billing_address_collection', 'required');

  // One-time payments default to guest checkout (no Customer). Create a Customer so
  // name/address appear in Stripe Customers exports. Subscriptions already create one.
  if (!monthly) {
    params.set('customer_creation', 'always');
  }

  params.set('line_items[0][price_data][currency]', 'usd');
  params.set(
    'line_items[0][price_data][product_data][name]',
    monthly
      ? 'Monthly donation to Golden Archive Foundation'
      : 'Donation to Golden Archive Foundation',
  );
  params.set(
    'line_items[0][price_data][unit_amount]',
    String(amountCents),
  );
  params.set('line_items[0][quantity]', '1');

  if (monthly) {
    params.set(
      'line_items[0][price_data][recurring][interval]',
      'month',
    );
  }

  params.set('metadata[frequency]', frequency);
  params.set('metadata[donation_amount_cents]', String(amountCents));
  params.set(`metadata[${DONATION_PROJECT_METADATA_KEY}]`, projectId);

  if (monthly) {
    params.set('subscription_data[metadata][frequency]', frequency);
    params.set(
      'subscription_data[metadata][donation_amount_cents]',
      String(amountCents),
    );
    // Copied to each renewal Invoice as subscription_details.metadata (Stripe docs).
    params.set(
      `subscription_data[metadata][${DONATION_PROJECT_METADATA_KEY}]`,
      projectId,
    );
  } else {
    params.set(
      'payment_intent_data[description]',
      ONE_TIME_DONATION_PAYMENT_DESCRIPTION,
    );
    params.set('payment_intent_data[metadata][frequency]', frequency);
    params.set(
      'payment_intent_data[metadata][donation_amount_cents]',
      String(amountCents),
    );
    params.set(
      `payment_intent_data[metadata][${DONATION_PROJECT_METADATA_KEY}]`,
      projectId,
    );
  }

  const stripeResponse = await fetch(
    'https://api.stripe.com/v1/checkout/sessions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  );

  let stripeSession: StripeCheckoutSession;

  try {
    stripeSession =
      (await stripeResponse.json()) as StripeCheckoutSession;
  } catch {
    return json(502, {
      success: false,
      error: 'stripe_invalid_response',
    });
  }

  if (!stripeResponse.ok || !stripeSession.url) {
    return json(502, {
      success: false,
      error: 'stripe_checkout_failed',
    });
  }

  return json(200, {
    success: true,
    checkoutUrl: stripeSession.url,
  });
}
