import { unauthenticated } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  // Verifies Shopify's proxy HMAC signature — rejects invalid requests automatically
  await unauthenticated.public.appProxy(request);

  const shopDomain = new URL(request.url).searchParams.get("shop") ?? "";

  if (!shopDomain) {
    return Response.json({ enabled: false });
  }

  const shop = await db.shop.findUnique({
    where: { domain: shopDomain },
    include: {
      settings: { include: { collectionRules: true } },
    },
  });

  if (!shop?.settings) {
    return Response.json({ enabled: false });
  }

  const s = shop.settings;

  return Response.json({
    enabled: s.enabled,
    leadTimeDays: s.leadTimeDays,
    cutoffTime: s.cutoffTime,
    maxDaysAhead: s.maxDaysAhead,
    blackoutDates: JSON.parse(s.blackoutDates),
    blackoutWeekdays: JSON.parse(s.blackoutWeekdays),
    giftMessageEnabled: s.giftMessageEnabled,
    collectionRules: s.collectionRules.map((r) => ({
      collectionGid: r.collectionGid,
      leadTimeDays: r.leadTimeDays,
      blackoutDates: JSON.parse(r.blackoutDates),
    })),
  });
};
