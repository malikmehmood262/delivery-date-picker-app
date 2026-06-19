import { useLoaderData, useSearchParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// ── Loader ────────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  const now = new Date();
  const year = parseInt(url.searchParams.get("year") ?? now.getFullYear());
  const month = parseInt(url.searchParams.get("month") ?? now.getMonth() + 1);

  const shop = await db.shop.findUnique({
    where: { domain: session.shop },
  });

  const deliveries = shop
    ? await db.deliveryRecord.findMany({
        where: {
          shopId: shop.id,
          deliveryDate: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
        orderBy: { deliveryDate: "asc" },
      })
    : [];

  return {
    deliveries: deliveries.map((d) => ({
      ...d,
      // Serialize dates to strings — React Router can't send Date objects as JSON
      deliveryDate: d.deliveryDate.toISOString(),
      createdAt: d.createdAt.toISOString(),
    })),
    year,
    month,
    total: deliveries.length,
  };
};

// ── Component ─────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEAR_OPTIONS = [2025, 2026, 2027, 2028].map((y) => ({
  label: String(y),
  value: String(y),
}));

export default function CalendarPage() {
  const { deliveries, year, month, total } = useLoaderData();
  const [, setSearchParams] = useSearchParams();

  const monthOptions = MONTHS.map((label, i) => ({
    label,
    value: String(i + 1),
  }));

  const rows = deliveries.map((d) => {
    const date = new Date(d.deliveryDate);
    return [
      date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      d.shopifyOrderName,
      d.customerName || "—",
      d.giftMessage || "—",
    ];
  });

  return (
    <s-page heading="Delivery Calendar">
      <s-section>
        <s-stack direction="inline" gap="base" align="end">
          <s-select
            label="Month"
            options={monthOptions}
            value={String(month)}
            onChange={(e) =>
              setSearchParams({ year: String(year), month: e.target.value })
            }
          />
          <s-select
            label="Year"
            options={YEAR_OPTIONS}
            value={String(year)}
            onChange={(e) =>
              setSearchParams({ year: e.target.value, month: String(month) })
            }
          />
          <s-badge tone={total > 0 ? "info" : "new"}>
            {total} {total === 1 ? "delivery" : "deliveries"}
          </s-badge>
        </s-stack>
      </s-section>

      <s-section>
        {rows.length > 0 ? (
          <s-data-table
            columnContentTypes={["text", "text", "text", "text"]}
            headings={["Delivery Date", "Order", "Customer", "Gift Message"]}
            rows={rows}
          />
        ) : (
          <s-stack direction="block" gap="base" align="center">
            <s-paragraph>
              No deliveries scheduled for {MONTHS[month - 1]} {year}.
            </s-paragraph>
            <s-paragraph>
              Deliveries appear here once customers place orders with a delivery
              date selected.
            </s-paragraph>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
