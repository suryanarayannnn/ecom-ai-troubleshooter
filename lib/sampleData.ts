// Fictional demo seller — every number below is synthetic.
export const SAMPLE_DATA = `Seller: Demo Ethnic Co. (fictional) | Seller ID: DEMO-1042 | Channel: Facebook | Category: women's sarees & kurtis

=== SELLER PnL (weekly) ===
Week,Start,Marketing Spend (INR),GMV (INR),RTO%,Spend/GMV%,COGS%,Cancel%,Net Profit%
W31 2026,2026-07-27,98000,510000,30.1,19.2,31.0,4.1,6.8
W32 2026,2026-08-03,104000,540000,29.4,19.3,30.8,4.0,7.2
W33 2026,2026-08-10,110000,562000,30.6,19.6,31.2,4.3,6.1
W34 2026,2026-08-17,112000,570000,31.0,19.6,31.0,4.2,5.9
W35 2026,2026-08-24,115000,580000,30.2,19.8,30.9,4.1,6.4
W36 2026,2026-08-31,118000,595000,31.5,19.8,31.1,4.4,5.6
W37 2026,2026-09-07,121000,602000,33.8,20.1,31.0,4.6,3.4
W38 2026,2026-09-14,119000,588000,38.9,20.2,31.3,4.9,-0.8
W39 2026,2026-09-21,122000,570000,44.6,21.4,31.2,5.1,-4.9
W40 2026,2026-09-28,124000,561000,48.2,22.1,31.4,5.3,-7.6

=== CHANGELOG (W37–W40) ===
2026-09-08, Kurti-K12, selling price 899 -> 949
2026-09-08, Kurti-K15, selling price 799 -> 849
2026-09-08, Kurti-K19, selling price 999 -> 1049
(no cost price changes, no visibility changes, no OOS changes)

=== CAMPAIGN PnL — weekly avg W34–W36 vs W40 ===
Campaign,PP Spend,PP Orders,PP RTO%,PP S/GMV%,W40 Spend,W40 Orders,W40 RTO%,W40 S/GMV%,Bid Strategy,Launched
WH_Saree_Female_25-44_ExclHighRTO,52000,410,24.0,16.5,8000,58,25.1,18.0,MINIMUM_ROAS,2026-05
WH_Kurti_Female_Broad,38000,290,29.0,17.8,12000,86,31.0,19.5,MINIMUM_ROAS,2026-06
ASC_Catalogue_Retarget,25000,170,36.0,21.0,22000,142,38.5,22.4,LOWEST_COST,2026-04
NEW_Women_Only_Festive_Cold,0,0,-,-,58000,330,71.0,27.8,LOWEST_COST,2026-09-15
NEW_Saree_Broad_LowestCost,0,0,-,-,24000,150,62.0,25.1,LOWEST_COST,2026-09-15

=== GENDER (spend share / orders share / S/GMV) ===
Period,Gender,Spend Share%,Order Share%,S/GMV%
PP,Female,94,95,18.9
PP,Male,6,5,31.5
W40,Female,61,63,19.4
W40,Male,39,37,29.8
Note: NEW_Women_Only_Festive_Cold delivered 64% of its orders to male audiences in W40.

=== AGE (spend share / S/GMV) ===
Period,Age,Spend Share%,S/GMV%
PP,18-24,9,24.0
PP,25-34,46,18.2
PP,35-44,33,18.9
PP,45+,12,23.1
W40,18-24,11,25.5
W40,25-34,43,21.0
W40,35-44,32,21.6
W40,45+,14,25.9

=== PLATFORM ===
Period,Platform,Spend Share%,S/GMV%,CPM (INR)
PP,Instagram,58,19.1,112
PP,Facebook,42,20.6,98
W40,Instagram,57,21.6,151
W40,Facebook,43,22.8,133

=== STATE BREAKDOWN ===
State,PP Order Share%,PP RTO%,W40 Order Share%,W40 RTO%
Maharashtra,18,24,17,41
Karnataka,12,18,11,39
Tamil Nadu,10,22,10,40
Gujarat,9,25,9,43
Delhi,8,27,8,45
Telangana,7,23,7,42
Uttar Pradesh,9,41,10,62
Bihar,5,46,6,68
West Bengal,7,38,7,60
Rajasthan,6,36,6,58
Others,9,33,9,52

=== FULFILMENT ===
Metric,PP,W40
O2S (days),1.2,1.3
S2A (days),3.8,3.9
FAD%,61,59
Online order share%,22,20
Seller-side cancel%,0.6,0.7
NDR count,412,455

=== PRODUCT (top 5 by orders) ===
Product,PP Orders/wk,PP RTO%,W40 Orders,W40 RTO%
Saree-S04,210,23,180,46
Saree-S11,150,26,140,49
Kurti-K12,120,28,110,52
Saree-S20,95,30,100,50
Kurti-K15,80,31,85,54
Top-5 share of orders: PP 73%, W40 70%`;
