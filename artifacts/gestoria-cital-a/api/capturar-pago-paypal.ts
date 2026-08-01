import type { NextApiRequest, NextApiResponse } from "next";

const PAYPAL_BASE = "https://api-m.paypal.com";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { token } = req.query;

    const clientId = process.env.PAYPAL_CLIENT_ID!;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

    const auth = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

    // TOKEN
    const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const access = await tokenRes.json();

    // CAPTURAR PAGO
    const captureRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${token}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const capture = await captureRes.json();

    if (capture.status === "COMPLETED") {
      return res.redirect(
        `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paypal=success`
      );
    }

    return res.redirect(
      `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paypal=error`
    );

  } catch (e) {
    return res.redirect(
      `${process.env.NEXT_PUBLIC_URL}/trabajo-malta?paypal=error`
    );
  }
}
