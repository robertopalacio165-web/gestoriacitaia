import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      return res.status(400).send("No signature");
    }

    return res.status(200).json({
      received: true,
    });

  } catch (err: any) {
    console.error(err);

    return res.status(400).send(err.message);
  }
}
