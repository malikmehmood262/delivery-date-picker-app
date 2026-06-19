import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook can fire multiple times; session may already be gone on a repeat.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // Mark shop inactive — preserves delivery data for GDPR compliance window.
  await db.shop.updateMany({
    where: { domain: shop },
    data: { isActive: false },
  });

  return new Response();
};
