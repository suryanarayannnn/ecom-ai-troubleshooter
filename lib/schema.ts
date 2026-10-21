import { z } from "zod";

const num = z.number().nullable();

export const LayerStatus = z.enum(["ruled_out", "signal", "flagged", "not_available"]);

export const AnalysisSchema = z.object({
  report_markdown: z.string(),
  dashboard: z.object({
    header: z.object({
      seller: z.string(),
      loss_week: z.string(),
      benchmark: z.string(),
      primary_lens: z.enum(["RTO", "S/GMV", "COGS", "Cancel", "Unclear"]),
      benchmark_quality: z.string(),
    }),
    loss_week_gmv: num,
    loss_week_net_profit_pct: num,
    metrics: z.array(
      z.object({
        metric: z.enum(["RTO%", "Spend/GMV%", "COGS%", "Cancel%"]),
        benchmark: num,
        loss_week: num,
        delta_pp: num,
        flagged: z.boolean(),
        impact_inr: num,
      }),
    ),
    states: z.array(
      z.object({
        state: z.string(),
        benchmark_rto_pct: num,
        loss_rto_pct: num,
        loss_order_share_pct: num,
      }),
    ),
    campaigns: z.array(
      z.object({
        campaign: z.string(),
        pp_spend: num,
        loss_spend: num,
        pp_sgmv_pct: num,
        loss_sgmv_pct: num,
      }),
    ),
    layers: z.array(
      z.object({
        layer: z.string(),
        status: LayerStatus,
        finding: z.string(),
      }),
    ),
    root_cause: z.string(),
    actions: z.array(
      z.object({
        priority: z.number(),
        action: z.string(),
        detail: z.string(),
      }),
    ),
    recovery_target: z.string(),
    data_gaps: z.array(z.string()),
  }),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
export type Dashboard = Analysis["dashboard"];
