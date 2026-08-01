import type { NextApiRequest, NextApiResponse } from "next";

const PAYPAL_BASE = "https://api-m.paypal.com";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const clientId = process.env.PAYPAL_CLIENT_ID!;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    // TOKEN
    const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const token = await tokenRes.json();

    const body = req.body;

    const amount =
      body.plan === "weekly"
        ? "0.02"
        : "19.99";

    // CREAR ORDEN
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "EUR",
              value: amount,
            },
          },
        ],
        application_context: {
         return_url:
`${process.env.NEXT_PUBLIC_URL}/api/paypal-return`,
          cancel_url:
            `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?cancel=true`,
          user_action: "PAY_NOW",
        },
      }),
    });

    const order = await orderRes.json();
console.log("PAYPAL RESPONSE:");
console.log(order);
    if (!order.links) {
  return res.status(500).json(order);
}
    const approve = order.links.find(
      (x: any) => x.rel === "approve"
    );

    return res.status(200).json({
      url: approve.href,
    });

  } catch (e: any) {
    res.status(500).json({
      error: e.message,
    });
  }
}
