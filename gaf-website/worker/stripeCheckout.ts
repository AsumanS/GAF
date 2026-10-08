import type { Env } from './env';

type CheckoutRequest = {
  frequency?: unknown;
  amountCents?: unknown;
  donationAmountCents?: unknown;
  anonymous?: unknown;
  coverProcessingCosts?: unknown;
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
  const anonymous = body.anonymous === true;
  const coverProcessingCosts = body.coverProcessingCosts === true;

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

  /*
   * When coverProcessingCosts is true, amountCents is the total charged
   * (donation + fee). donationAmountCents is the gift amount for metadata.
   */
  const donationAmountCents =
    Number.isInteger(body.donationAmountCents) &&
    typeof body.donationAmountCents === 'number' &&
    body.donationAmountCents >= 100
      ? body.donationAmountCents
      : amountCents;

  const origin = new URL(request.url).origin;
  const monthly = frequency === 'monthly';

  const params = new URLSearchParams();

  params.set('mode', monthly ? 'subscription' : 'payment');
  params.set(
    'success_url',
    `${origin}/donate?payment=success&session_id={CHECKOUT_SESSION_ID}`,
  );
  params.set('cancel_url', `${origin}/donate?payment=cancelled`);

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
  params.set('metadata[donation_amount_cents]', String(donationAmountCents));
  params.set('metadata[charge_amount_cents]', String(amountCents));
  params.set('metadata[anonymous]', anonymous ? 'true' : 'false');
  params.set(
    'metadata[cover_processing_costs]',
    coverProcessingCosts ? 'true' : 'false',
  );

  if (monthly) {
    params.set('subscription_data[metadata][frequency]', frequency);
    params.set(
      'subscription_data[metadata][donation_amount_cents]',
      String(donationAmountCents),
    );
    params.set(
      'subscription_data[metadata][charge_amount_cents]',
      String(amountCents),
    );
    params.set(
      'subscription_data[metadata][anonymous]',
      anonymous ? 'true' : 'false',
    );
    params.set(
      'subscription_data[metadata][cover_processing_costs]',
      coverProcessingCosts ? 'true' : 'false',
    );
  } else {
    params.set('payment_intent_data[metadata][frequency]', frequency);
    params.set(
      'payment_intent_data[metadata][donation_amount_cents]',
      String(donationAmountCents),
    );
    params.set(
      'payment_intent_data[metadata][charge_amount_cents]',
      String(amountCents),
    );
    params.set(
      'payment_intent_data[metadata][anonymous]',
      anonymous ? 'true' : 'false',
    );
    params.set(
      'payment_intent_data[metadata][cover_processing_costs]',
      coverProcessingCosts ? 'true' : 'false',
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
