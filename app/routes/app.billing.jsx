import { useLoaderData, useSubmit, useNavigation } from "react-router";
import { redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = {
  FREE: {
    key: "FREE",
    name: "Free",
    price: "0",
    features: [
      "Delivery date picker on storefront",
      "Lead time & cutoff time rules",
      "Blackout dates & weekdays",
      "Delivery calendar view",
    ],
  },
  STANDARD: {
    key: "STANDARD",
    name: "Standard",
    price: "9.99",
    features: [
      "Everything in Free",
      "Up to 5 collection-specific rules",
      "Monthly delivery summary email",
      "Priority email support",
    ],
  },
  PREMIUM: {
    key: "PREMIUM",
    name: "Premium",
    price: "19.99",
    features: [
      "Everything in Standard",
      "Unlimited collection rules",
      "CSV export of delivery records",
      "Dedicated support",
    ],
  },
};

// ── Loader ────────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const url = new URL(request.url);

  // Post-billing callback: Shopify redirects back here with charge_id
  if (url.searchParams.get("charge_id")) {
    try {
      const { hasActivePayment, appSubscriptions } = await billing.check({
        plans: [PLANS.STANDARD.name, PLANS.PREMIUM.name],
        isTest: process.env.NODE_ENV !== "production",
      });

      if (hasActivePayment && appSubscriptions?.length > 0) {
        const activeName = appSubscriptions[0].name;
        const planKey = Object.values(PLANS).find(
          (p) => p.name === activeName
        )?.key;

        if (planKey) {
          await db.shop.updateMany({
            where: { domain: session.shop },
            data: { plan: planKey },
          });
        }
      }
    } catch (_) {
      // billing.check may throw if no active subscription — treat as FREE
    }

    return redirect("/app/billing");
  }

  const shop = await db.shop.findUnique({ where: { domain: session.shop } });
  return { currentPlan: shop?.plan ?? "FREE" };
};

// ── Action ────────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const body = await request.formData();
  const planKey = body.get("plan");
  const plan = PLANS[planKey];

  if (!plan || plan.key === "FREE") {
    return { error: "Invalid plan selection" };
  }

  const { confirmationUrl } = await billing.request({
    plan: plan.name,
    isTest: process.env.NODE_ENV !== "production",
    returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing`,
  });

  return redirect(confirmationUrl);
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { currentPlan } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  const handleUpgrade = (planKey) => {
    submit({ plan: planKey }, { method: "POST" });
  };

  return (
    <s-page heading="Plans & Billing">
      <s-stack direction="inline" gap="base" align="start" wrap="true">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = currentPlan === plan.key;
          const isDowngrade =
            (currentPlan === "PREMIUM" && plan.key === "STANDARD") ||
            (currentPlan !== "FREE" && plan.key === "FREE");

          return (
            <s-section key={plan.key} heading={plan.name}>
              <s-stack direction="block" gap="base">
                {/* Price */}
                <s-stack direction="inline" gap="tight" align="baseline">
                  <s-heading>
                    {plan.price === "0" ? "Free" : `$${plan.price}`}
                  </s-heading>
                  {plan.price !== "0" && <s-text>/ month</s-text>}
                </s-stack>

                {/* Features */}
                <s-unordered-list>
                  {plan.features.map((f) => (
                    <s-list-item key={f}>{f}</s-list-item>
                  ))}
                </s-unordered-list>

                {/* CTA */}
                {isCurrent ? (
                  <s-badge tone="success">Current plan</s-badge>
                ) : isDowngrade ? (
                  <s-paragraph>
                    To downgrade, cancel your subscription from the Shopify
                    billing settings.
                  </s-paragraph>
                ) : (
                  <s-button
                    variant="primary"
                    onClick={() => handleUpgrade(plan.key)}
                    {...(submitting ? { loading: true } : {})}
                  >
                    Upgrade to {plan.name}
                  </s-button>
                )}
              </s-stack>
            </s-section>
          );
        })}
      </s-stack>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
