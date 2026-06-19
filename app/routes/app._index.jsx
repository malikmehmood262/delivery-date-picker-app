import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// ── Loader ────────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await db.shop.findUnique({
    where: { domain: session.shop },
    include: { settings: true },
  });

  const s = shop?.settings;

  return {
    settings: s
      ? {
          enabled: s.enabled,
          leadTimeDays: s.leadTimeDays,
          cutoffTime: s.cutoffTime ?? "",
          maxDaysAhead: s.maxDaysAhead,
          blackoutDates: JSON.parse(s.blackoutDates),
          blackoutWeekdays: JSON.parse(s.blackoutWeekdays),
          giftMessageEnabled: s.giftMessageEnabled,
        }
      : null,
  };
};

// ── Action ────────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  let shop = await db.shop.findUnique({ where: { domain: session.shop } });
  if (!shop) {
    shop = await db.shop.create({ data: { domain: session.shop } });
  }

  await db.deliverySettings.upsert({
    where: { shopId: shop.id },
    update: {
      enabled: body.enabled,
      leadTimeDays: Number(body.leadTimeDays) || 2,
      cutoffTime: body.cutoffTime || null,
      maxDaysAhead: Number(body.maxDaysAhead) || 30,
      blackoutDates: JSON.stringify(body.blackoutDates ?? []),
      blackoutWeekdays: JSON.stringify(body.blackoutWeekdays ?? []),
      giftMessageEnabled: body.giftMessageEnabled,
    },
    create: {
      shopId: shop.id,
      enabled: body.enabled ?? true,
      leadTimeDays: Number(body.leadTimeDays) || 2,
      cutoffTime: body.cutoffTime || null,
      maxDaysAhead: Number(body.maxDaysAhead) || 30,
      blackoutDates: JSON.stringify(body.blackoutDates ?? []),
      blackoutWeekdays: JSON.stringify(body.blackoutWeekdays ?? []),
      giftMessageEnabled: body.giftMessageEnabled ?? false,
    },
  });

  return { success: true };
};

// ── Component ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_FORM = {
  enabled: true,
  leadTimeDays: 2,
  cutoffTime: "",
  maxDaysAhead: 30,
  blackoutDates: [],
  blackoutWeekdays: [],
  giftMessageEnabled: false,
};

export default function SettingsPage() {
  const { settings } = useLoaderData();
  const fetcher = useFetcher();
  const saving = fetcher.state !== "idle";

  const [form, setForm] = useState(settings ?? DEFAULT_FORM);
  const [newDate, setNewDate] = useState("");
  const [saved, setSaved] = useState(false);

  // Show saved banner after a successful action response
  useEffect(() => {
    if (fetcher.data?.success) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [fetcher.data]);

  const handleSave = () => {
    fetcher.submit(form, { method: "POST", encType: "application/json" });
  };

  const addBlackoutDate = () => {
    if (newDate && !form.blackoutDates.includes(newDate)) {
      setForm((f) => ({
        ...f,
        blackoutDates: [...f.blackoutDates, newDate].sort(),
      }));
      setNewDate("");
    }
  };

  const removeBlackoutDate = (date) =>
    setForm((f) => ({
      ...f,
      blackoutDates: f.blackoutDates.filter((d) => d !== date),
    }));

  const toggleWeekday = (index, checked) =>
    setForm((f) => ({
      ...f,
      blackoutWeekdays: checked
        ? [...f.blackoutWeekdays, index]
        : f.blackoutWeekdays.filter((d) => d !== index),
    }));

  return (
    <s-page heading="Delivery Settings">
      <s-button
        slot="primary-action"
        onClick={handleSave}
        {...(saving ? { loading: true } : {})}
      >
        Save changes
      </s-button>

      {saved && !saving && (
        <s-banner tone="success" title="Settings saved">
          <s-paragraph>Your delivery settings have been updated.</s-paragraph>
        </s-banner>
      )}

      {/* ── General ─────────────────────────────────────────────────── */}
      <s-section heading="General">
        <s-stack direction="block" gap="base">
          <s-checkbox
            label="Enable delivery date picker on storefront"
            checked={form.enabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, enabled: e.target.checked }))
            }
          />
          <s-checkbox
            label="Show gift message field"
            checked={form.giftMessageEnabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, giftMessageEnabled: e.target.checked }))
            }
          />
        </s-stack>
      </s-section>

      {/* ── Scheduling Rules ────────────────────────────────────────── */}
      <s-section heading="Scheduling Rules">
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Lead time (days)"
            type="number"
            value={String(form.leadTimeDays)}
            helpText="Minimum days between today and the first selectable delivery date"
            onInput={(e) =>
              setForm((f) => ({
                ...f,
                leadTimeDays: parseInt(e.target.value) || 1,
              }))
            }
          />
          <s-text-field
            label="Max days ahead"
            type="number"
            value={String(form.maxDaysAhead)}
            helpText="How far into the future customers can book a delivery"
            onInput={(e) =>
              setForm((f) => ({
                ...f,
                maxDaysAhead: parseInt(e.target.value) || 30,
              }))
            }
          />
          <s-text-field
            label="Order cutoff time"
            type="time"
            value={form.cutoffTime}
            helpText="Orders placed after this time push the earliest date by +1 day. Leave blank to disable."
            onInput={(e) =>
              setForm((f) => ({ ...f, cutoffTime: e.target.value }))
            }
          />
        </s-stack>
      </s-section>

      {/* ── Unavailable Days ────────────────────────────────────────── */}
      <s-section heading="Unavailable Days of Week">
        <s-stack direction="inline" gap="base" wrap="true">
          {WEEKDAYS.map((day, i) => (
            <s-checkbox
              key={i}
              label={day}
              checked={form.blackoutWeekdays.includes(i)}
              onChange={(e) => toggleWeekday(i, e.target.checked)}
            />
          ))}
        </s-stack>
      </s-section>

      {/* ── Blackout Dates ──────────────────────────────────────────── */}
      <s-section heading="Blackout Dates">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="tight" align="end">
            <s-text-field
              label="Add a date"
              type="date"
              value={newDate}
              onInput={(e) => setNewDate(e.target.value)}
            />
            <s-button onClick={addBlackoutDate}>Add</s-button>
          </s-stack>

          {form.blackoutDates.length > 0 ? (
            <s-stack direction="inline" gap="tight" wrap="true">
              {form.blackoutDates.map((date) => (
                <s-tag key={date} onRemove={() => removeBlackoutDate(date)}>
                  {date}
                </s-tag>
              ))}
            </s-stack>
          ) : (
            <s-paragraph>No blackout dates added yet.</s-paragraph>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
