import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} for ${shop}`);

  await handleOrderCreate(shop, payload);
  return new Response();
};

async function handleOrderCreate(shopDomain, order) {
  const shopRecord = await db.shop.findUnique({
    where: { domain: shopDomain },
  });
  if (!shopRecord) return;

  let deliveryDate = null;
  let giftMessage = "";

  // Cart path: delivery date stored as a line-item property
  for (const item of order.line_items ?? []) {
    for (const prop of item.properties ?? []) {
      if (prop.name === "Delivery Date") deliveryDate = prop.value;
      if (prop.name === "Gift Message") giftMessage = prop.value;
    }
  }

  // Checkout extension path (Plus): stored as an order metafield
  for (const mf of order.metafields ?? []) {
    if (mf.namespace === "delivery" && mf.key === "date") {
      deliveryDate = mf.value;
    }
  }

  if (!deliveryDate) return;

  const customer = order.customer ?? {};
  await db.deliveryRecord.upsert({
    where: { shopifyOrderId: String(order.id) },
    update: {},
    create: {
      shopId: shopRecord.id,
      shopifyOrderId: String(order.id),
      shopifyOrderName: order.name,
      deliveryDate: new Date(deliveryDate),
      giftMessage,
      customerName: `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim(),
    },
  });
}
