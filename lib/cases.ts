// Four fictional sellers, each built to exercise a different L3 pattern.
// Every number is synthetic.
import { SAMPLE_DATA } from "./sampleData";

export type Lens = "RTO" | "S/GMV" | "COGS" | "Cancel" | "Not sure";

export type Answers = {
  seller: string;
  category: string;
  lossWeek: string;
  suspect: Lens;
  changes: string[];
  notes: string;
};

export type DemoCase = {
  id: string;
  title: string;
  lens: Lens;
  hook: string;
  pattern: string;
  accent: string;
  answers: Answers;
  data: string;
};

const SATURATION = `Seller: Demo Jewel House (fictional) | Seller ID: DEMO-2177 | Channel: Facebook | Category: imitation jewellery

=== SELLER PnL (weekly) ===
Week,Start,Marketing Spend (INR),GMV (INR),RTO%,Spend/GMV%,COGS%,Cancel%,Net Profit%
W33 2026,2026-08-10,128000,820000,27.0,15.6,28.0,3.2,9.1
W34 2026,2026-08-17,136000,860000,27.5,15.8,28.1,3.3,8.7
W35 2026,2026-08-24,140000,880000,26.8,15.9,27.9,3.1,8.9
W36 2026,2026-08-31,145000,870000,27.2,16.7,28.0,3.4,7.4
W37 2026,2026-09-07,152000,820000,27.9,18.5,28.2,3.5,4.6
W38 2026,2026-09-14,158000,760000,28.1,20.8,28.0,3.6,1.2
W39 2026,2026-09-21,155000,700000,28.4,22.1,28.3,3.7,-1.9
W40 2026,2026-09-28,150000,650000,28.0,23.1,28.1,3.6,-3.4

=== CHANGELOG (W36–W40) ===
2026-09-09, Earring-E31, new SKU added (low volume)
2026-09-09, Earring-E32, new SKU added (low volume)
(no price, cost, visibility or OOS changes on top SKUs)

=== CAMPAIGN PnL — weekly avg W34–W36 vs W40 ===
Campaign,PP Spend,PP S/GMV%,W40 Spend,W40 S/GMV%,W40 Product Focus,Bid Strategy,Notes
WH_Bangle_Retarget_Warm,70000,13.2,32000,18.9,Bangle-B20,MINIMUM_ROAS,CTR 2.1%->2.0%, C2PR 3.9%->2.1%
WH_Catalogue_ASC,50000,17.1,18000,18.0,Mixed,LOWEST_COST,
Bangle-B20_Prospecting,20000,19.5,0,-,Bangle-B20,LOWEST_COST,paused W38
NEW_B20_Cold_Broad_1,0,-,40000,31.2,Bangle-B20,LOWEST_COST,launched 2026-09-12
NEW_B20_Cold_Broad_2,0,-,35000,33.5,Bangle-B20,LOWEST_COST,launched 2026-09-12
NEW_B20_LAL_3pct,0,-,25000,29.8,Bangle-B20,LOWEST_COST,launched 2026-09-15

=== PRODUCT ===
Product,PP Spend/wk,PP Orders/wk,PP CPO,W40 Spend,W40 Orders,W40 CPO
Bangle-B20,21000,150,140,108000,401,269
Necklace-N07,38000,310,123,14000,108,130
Earring-E12,29000,262,111,11000,95,116
Others,52000,420,124,17000,128,133

=== META WEEKLY TREND (account) ===
Week,CPM,CTR%,C2PR%,Cost per Purchase
W35,118,1.92,3.4,124
W37,139,1.90,2.8,149
W39,168,1.86,2.0,201
W40,176,1.85,1.8,224

=== GENDER ===
Period,Female Spend%,Male Spend%
PP,97,3
W40,96,4

=== STATE (top 5 order share) ===
PP: Maharashtra 19, Karnataka 13, Tamil Nadu 11, Gujarat 9, Delhi 8
W40: Maharashtra 18, Karnataka 13, Tamil Nadu 11, Gujarat 10, Delhi 8
RTO by state broadly unchanged (±2pp)

=== FULFILMENT ===
Metric,PP,W40
O2S (days),1.1,1.1
S2A (days),3.7,3.8
FAD%,63,62`;

const COGS = `Seller: Demo Glow Skincare (fictional) | Seller ID: DEMO-3305 | Channel: Facebook | Category: beauty & skincare

=== SELLER PnL (weekly) ===
Week,Start,Marketing Spend (INR),GMV (INR),RTO%,Spend/GMV%,COGS%,Cancel%,Net Profit%
W33 2026,2026-08-10,86000,431000,22.6,20.0,33.9,3.0,6.4
W34 2026,2026-08-17,90000,450000,22.0,20.0,33.8,2.9,6.2
W35 2026,2026-08-24,92000,460000,21.5,20.0,34.0,3.0,6.0
W36 2026,2026-08-31,95000,470000,22.4,20.2,34.1,2.8,5.8
W37 2026,2026-09-07,94000,468000,22.0,20.1,34.2,3.0,5.7
W38 2026,2026-09-14,96000,470000,22.3,20.4,39.6,3.1,0.4
W39 2026,2026-09-21,97000,474000,21.9,20.5,41.8,3.0,-1.6
W40 2026,2026-09-28,98000,476000,22.1,20.6,42.3,3.1,-2.1

=== CHANGELOG (W37–W40) ===
2026-09-14, Serum-V10, cost price 210 -> 310 (selling price unchanged 699)
2026-09-14, Cream-C04, cost price 180 -> 245 (selling price unchanged 599)
2026-09-20, Sunscreen-S02, selling price 499 -> 479

=== PRODUCT (order share / COGS%) ===
Product,PP Order Share%,PP COGS%,W40 Order Share%,W40 COGS%
Serum-V10,34,30.0,35,44.3
Cream-C04,22,30.1,21,40.9
Sunscreen-S02,18,38.5,18,40.1
FaceWash-F01,14,36.0,14,36.0
Others,12,40.0,12,40.2

=== CAMPAIGN PnL — weekly avg W34–W37 vs W40 ===
Campaign,PP Spend,PP S/GMV%,W40 Spend,W40 S/GMV%
WH_Serum_Female_22-40,41000,18.9,44000,19.3
WH_ASC_Catalogue,30000,21.0,31000,21.2
Retarget_ATC_7d,21750,20.6,23000,20.9

=== GENDER / AGE / PLATFORM ===
Shares and S/GMV within ±1.5pp between periods.

=== FULFILMENT ===
Metric,PP,W40
O2S (days),1.0,1.1
S2A (days),3.5,3.6
FAD%,66,65`;

const CARRIER = `Seller: Demo Little Threads (fictional) | Seller ID: DEMO-4410 | Channel: Facebook | Category: kidswear

=== SELLER PnL (weekly) ===
Week,Start,Marketing Spend (INR),GMV (INR),RTO%,Spend/GMV%,COGS%,Cancel%,Net Profit%
W33 2026,2026-08-10,76000,384000,24.0,19.8,30.1,3.4,6.6
W34 2026,2026-08-17,80000,400000,23.5,20.0,30.0,3.5,6.5
W35 2026,2026-08-24,82000,410000,24.1,20.0,30.2,3.4,6.1
W36 2026,2026-08-31,84000,418000,23.8,20.1,30.1,3.6,6.3
W37 2026,2026-09-07,85000,405000,31.9,21.0,30.0,3.7,1.8
W38 2026,2026-09-14,86000,392000,37.4,21.9,30.2,3.8,-1.4
W39 2026,2026-09-21,85000,388000,40.6,21.9,30.1,3.7,-2.9
W40 2026,2026-09-28,86000,386000,41.2,22.3,30.2,3.8,-3.6

=== CHANGELOG ===
No catalogue changes between 2026-08-31 and 2026-10-04.

=== FULFILMENT / CARRIER ===
Metric,PP (W34–W36),W40
Dominant carrier,Xpressbees Surface (88% of AWBs),Bluedart Surface (81% of AWBs; switched 2026-09-08)
O2S (days),1.2,1.2
S2A (days),3.6,5.8
FAD%,64.2,33.1
NDR logged,980,6
Carrier RTO%,Xpressbees 22.9,Bluedart 47.5

=== STATE ===
State,PP Order Share%,PP RTO%,W40 Order Share%,W40 RTO%
Maharashtra,20,18,20,58
Karnataka,13,12,13,71
Tamil Nadu,11,15,11,64
Telangana,9,17,9,55
Gujarat,8,19,8,52
Uttar Pradesh,9,36,9,44
Bihar,4,41,4,49
Others,26,27,26,39

=== CAMPAIGNS ===
Same 3 campaigns in both periods; spend split within ±4pp; targeting unchanged (parents 25–44, female 78% / male 22% both periods).

=== GENDER / AGE / PLATFORM ===
No material change (shares within ±2pp).`;

export const CASES: DemoCase[] = [
  {
    id: "gender",
    title: "The 'Women Only' campaign that wasn't",
    lens: "RTO",
    hook: "RTO 31% → 48% in four weeks on an ethnic-wear account.",
    pattern: "Campaign × Gender",
    accent: "#ff6b4a",
    answers: {
      seller: "Demo Ethnic Co.",
      category: "Fashion & ethnic wear",
      lossWeek: "W40 2026",
      suspect: "RTO",
      changes: ["New campaigns launched", "Price changed"],
      notes: "We launched a festive women-only campaign mid-September.",
    },
    data: SAMPLE_DATA,
  },
  {
    id: "saturation",
    title: "One bangle, five campaigns",
    lens: "S/GMV",
    hook: "Spend 5× on a single hero SKU, CPO doubled.",
    pattern: "Campaign × Product (saturation)",
    accent: "#8b6cff",
    answers: {
      seller: "Demo Jewel House",
      category: "Jewellery",
      lossWeek: "W40 2026",
      suspect: "S/GMV",
      changes: ["New campaigns launched", "Budget scaled up"],
      notes: "Bangle-B20 was our bestseller so we scaled it hard.",
    },
    data: SATURATION,
  },
  {
    id: "cogs",
    title: "The quiet supplier invoice",
    lens: "COGS",
    hook: "Same spend, same RTO — and margin still vanished.",
    pattern: "Cost price change",
    accent: "#fbbf24",
    answers: {
      seller: "Demo Glow Skincare",
      category: "Beauty & personal care",
      lossWeek: "W40 2026",
      suspect: "Not sure",
      changes: ["Cost price changed"],
      notes: "Campaigns look healthy. Can't see why profit dropped.",
    },
    data: COGS,
  },
  {
    id: "carrier",
    title: "Silent RTO",
    lens: "RTO",
    hook: "Clean states suddenly at 60–70% RTO, with almost no NDRs.",
    pattern: "Carrier failure",
    accent: "#3dd6c6",
    answers: {
      seller: "Demo Little Threads",
      category: "Kids & baby",
      lossWeek: "W40 2026",
      suspect: "RTO",
      changes: ["Carrier switched"],
      notes: "Ops moved most volume to a new courier for better rates.",
    },
    data: CARRIER,
  },
];

export const CATEGORIES = [
  "Fashion & ethnic wear", "Jewellery", "Beauty & personal care", "Kids & baby", "Home & kitchen", "Other",
];

export const CHANGE_OPTIONS = [
  "New campaigns launched", "Budget scaled up", "Price changed", "Cost price changed",
  "Products hidden / OOS", "Carrier switched", "Targeting changed", "Nothing I know of",
];

export const LENSES: Lens[] = ["RTO", "S/GMV", "COGS", "Cancel", "Not sure"];

// Lightweight keyword sniffing so the UI can show which data blocks were pasted.
export const DATA_SIGNALS: { label: string; re: RegExp }[] = [
  { label: "Weekly PnL", re: /net profit|pnl/i },
  { label: "Changelog", re: /changelog|cost price|selling price/i },
  { label: "Campaigns", re: /campaign/i },
  { label: "Gender", re: /gender|female|male/i },
  { label: "Age", re: /\bage\b|18-24|25-34/i },
  { label: "Platform", re: /instagram|platform|placement/i },
  { label: "States", re: /state|maharashtra|karnataka|uttar pradesh/i },
  { label: "Products", re: /product|sku/i },
  { label: "Fulfilment", re: /\bfad\b|o2s|s2a|ndr|carrier/i },
  { label: "Meta trend", re: /cpm|ctr|c2pr/i },
];

export function buildPayload(a: Answers, data: string): string {
  const ctx = [
    "=== CONTEXT FROM USER (intake questions) ===",
    a.seller && `Seller / brand: ${a.seller}`,
    a.category && `Category: ${a.category}`,
    a.lossWeek && `Loss week to diagnose: ${a.lossWeek}`,
    `What the user suspects: ${a.suspect} (treat as a hypothesis to verify, not a conclusion)`,
    a.changes.length > 0 && `Recent changes the user knows of: ${a.changes.join(", ")}`,
    a.notes && `User notes: ${a.notes}`,
  ].filter(Boolean).join("\n");
  return `${ctx}\n\n${data.trim()}`;
}
