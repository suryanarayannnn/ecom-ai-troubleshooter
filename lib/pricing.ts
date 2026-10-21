// Single source of truth for the token economy. Demo mode: no real payments.
export const PRICING = {
  startTokens: 50,
  topupTokens: 50,
  topupCooldownMs: 24 * 60 * 60 * 1000,
  freeThemePerDay: 3,
  cost: {
    troubleshoot: 20,
    themeStandard: 2, // after the daily free quota
    themePro: 5,
  },
  packs: [
    { name: "Starter", tokens: 100, price: "₹99", blurb: "≈ 5 troubleshoots or 50 sections" },
    { name: "Growth", tokens: 500, price: "₹399", blurb: "For a store team running weekly checks", popular: true },
    { name: "Agency", tokens: 2000, price: "₹1,299", blurb: "Many stores, many themes" },
  ],
} as const;

export type PublicWallet = {
  balance: number;
  freeThemeLeft: number;
  canTopUp: boolean;
  nextTopUpAt: number | null;
};
