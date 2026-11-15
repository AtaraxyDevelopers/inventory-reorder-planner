import { round, sum, ratio, days, money, metric, notice } from "./lib.mjs";
export const config = {
  slug: "inventory-reorder-planner",
  title: "Inventory Reorder Planner",
  description:
    "Plan replenishment from observed demand, supplier lead times, and available stock.",
  scope:
    "A local planning workspace. Review suggestions before acting; no automatic messages or financial transactions.",
  method:
    "Average daily demand = sold / observation days. Reorder point = demand × (lead + safety days). Inventory position includes on-order units. If position is at/below the point, order to lead + safety + coverage days, rounded up to a pack. This assumes steady demand and timely existing orders.",
  port: 4429,
  asOf: "2026-11-15",
  fields: [
    {
      key: "name",
      label: "Product / SKU",
      type: "text",
    },
    {
      key: "sold",
      label: "Units sold in observation period",
      type: "number",
      min: 0,
      max: 100000000,
      integer: true,
    },
    {
      key: "observationDays",
      label: "Observation period (days)",
      type: "number",
      min: 1,
      max: 3650,
      integer: true,
    },
    {
      key: "stock",
      label: "Units on hand",
      type: "number",
      min: 0,
      max: 100000000,
      integer: true,
    },
    {
      key: "onOrder",
      label: "Units already ordered",
      type: "number",
      min: 0,
      max: 100000000,
      integer: true,
    },
    {
      key: "leadDays",
      label: "Supplier lead time (days)",
      type: "number",
      min: 0,
      max: 365,
      integer: true,
    },
    {
      key: "unitCost",
      label: "Unit purchase cost",
      type: "number",
      min: 0,
      max: 100000000,
    },
    {
      key: "pack",
      label: "Order pack size",
      type: "number",
      min: 1,
      max: 100000,
      integer: true,
    },
  ],
  settings: [
    {
      key: "currency",
      label: "Currency code (one currency per workspace)",
      type: "text",
      maxLength: 3,
    },
    {
      key: "safetyDays",
      label: "Safety stock (days of demand)",
      type: "number",
      min: 0,
      max: 365,
      integer: true,
    },
    {
      key: "coverageDays",
      label: "Additional coverage after delivery (days)",
      type: "number",
      min: 1,
      max: 365,
      integer: true,
    },
  ],
  actions: [],
  document: false,
};

export const example = {
  schemaVersion: 1,
  project: "inventory-reorder-planner",
  settings: {
    currency: "USD",
    safetyDays: 5,
    coverageDays: 30,
  },
  records: [
    {
      id: "sku-1",
      name: "Shipping boxes",
      sold: 300,
      observationDays: 30,
      stock: 80,
      onOrder: 20,
      leadDays: 7,
      unitCost: 2,
      pack: 25,
    },
    {
      id: "sku-2",
      name: "Seasonal labels",
      sold: 0,
      observationDays: 30,
      stock: 200,
      onOrder: 0,
      leadDays: 5,
      unitCost: 1,
      pack: 10,
    },
  ],
};
export function analyze(records, s) {
  const rows = records.map((r) => {
    const demand = r.sold / r.observationDays,
      position = r.stock + r.onOrder,
      point = demand * (r.leadDays + s.safetyDays),
      target = demand * (r.leadDays + s.safetyDays + s.coverageDays),
      order =
        demand > 0 && position <= point
          ? Math.ceil(Math.max(0, target - position) / r.pack) * r.pack
          : 0;
    return {
      id: r.id,
      Product: r.name,
      "Daily demand": round(demand),
      "Inventory position": position,
      "Reorder point": Math.ceil(point),
      "Suggested units": order,
      "Purchase cost": money(order * r.unitCost),
      "Stock cover (days)": demand
        ? round(r.stock / demand)
        : "No observed demand",
    };
  });
  return {
    metrics: [
      metric(
        "Products to reorder",
        rows.filter((r) => r["Suggested units"] > 0).length,
      ),
      metric(
        "Suggested purchase cost",
        money(sum(rows.map((r) => Number(r["Purchase cost"])))),
        s.currency,
      ),
      metric("No-demand products", records.filter((r) => r.sold === 0).length),
    ],
    notices: records
      .filter((r) => r.sold === 0 && r.stock > 0)
      .map((r) =>
        notice(
          r.id,
          `${r.name}: no sales in the observation period; review before buying more.`,
          "warning",
        ),
      ),
    columns: [
      "Product",
      "Daily demand",
      "Inventory position",
      "Reorder point",
      "Suggested units",
      "Purchase cost",
      "Stock cover (days)",
    ],
    rows,
  };
}
