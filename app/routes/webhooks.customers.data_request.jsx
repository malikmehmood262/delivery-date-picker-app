import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`GDPR ${topic} for ${shop}`);
  return new Response();
};
