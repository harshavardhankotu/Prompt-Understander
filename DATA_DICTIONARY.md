# 📖 OmniBid India: Data Dictionary (Analytics Transformation Layer)

This document provides the complete structural schema, datatypes, descriptions, and mathematical derivations for the three pre-aggregated SQL Views engineered for Power BI dashboard integration.

These analytical views are designed to be **completely dynamic**. Because they aggregate metrics by joining our master `categories` table with transactional tables, **they require zero modifications or migrations when new verticals, categories, or sectors are introduced**. The views will automatically incorporate new sectors and display them on the BI dashboard immediately.

---

## 📈 1. `vw_platform_financials`

This view aggregates financial performance metrics over monthly reporting intervals, providing a chronological timeline of platform growth, Gross Transaction Volume (GTV), fees, and taxation.

### Schema Definition Table

| Column Name | PostgreSQL Data Type | Description / Mathematical Derivation |
| :--- | :--- | :--- |
| `reporting_month` | `date` | The calendar month start date, derived from truncating the requirement's creation date (`DATE_TRUNC('month', created_at)::date`). |
| `total_payments` | `bigint` | Cumulative count of payment records captured within the given month. |
| `gross_transaction_volume_gtv` | `numeric` | Gross Transaction Volume (GTV) representing the total value of all escrow transactions initiated (`SUM(total_amount)`). |
| `total_platform_fees_collected` | `numeric` | Cumulative platform success fees collected at the standard rate of 2% (`SUM(platform_fee_amount)`). |
| `total_tds_withheld` | `numeric` | Cumulative Indian Tax Deducted at Source (TDS) withheld at the standard rate of 2% for transactions strictly greater than ₹30,000 (`SUM(tds_amount)`). |
| `total_net_provider_payouts` | `numeric` | Cumulative net capital disbursed/disbursable to providers after deducting platform fees and TDS (`SUM(net_to_provider)`). |

### Financial Balance Equation Enforced
$$\text{gross\_transaction\_volume\_gtv} = \text{total\_platform\_fees\_collected} + \text{total\_tds\_withheld} + \text{total\_net\_provider\_payouts}$$

---

## 📊 2. `vw_sector_analytics`

This view provides micro-analytics on specific business verticals (e.g., IT, Construction, Logistics, Legal). It tracks contract volume, average pricing floors, average contract winning amounts, and competitive bid density.

### Schema Definition Table

| Column Name | PostgreSQL Data Type | Description / Mathematical Derivation |
| :--- | :--- | :--- |
| `sector_name` | `text` | The display name of the sector/category (e.g., `'Civil & Construction Works'`). |
| `sector_slug` | `text` | The unique URL-friendly unique identifier slug of the category (e.g., `'civil-construction'`). |
| `total_requirements` | `bigint` | Total count of individual project requirements listed under the sector. |
| `avg_min_bid_floor` | `numeric` | The average minimum bid floor threshold enforced on providers for that sector (`AVG(c.min_bid_floor)`). |
| `avg_winning_bid_amount` | `numeric` | The average value of all successfully accepted/winning bids in that sector (`AVG(winning_bid.bid_amount)`). |
| `bid_density` | `numeric` | **Bid Density:** The average number of competitive bids submitted per requirement. Formulated dynamically as: $$\text{Bid Density} = \frac{\text{Total Bids in Sector}}{\text{Total Requirements in Sector}}$$ |

---

## 🛡️ 3. `vw_trust_and_disputes`

This view monitors operational health, escrow dispute frequency, sector dispute rates, and the total volume of capital currently frozen in the trust vault due to milestone arbitration.

### Schema Definition Table

| Column Name | PostgreSQL Data Type | Description / Mathematical Derivation |
| :--- | :--- | :--- |
| `sector_name` | `text` | The display name of the sector/category. |
| `sector_slug` | `text` | The unique URL-friendly slug of the category. |
| `total_payments` | `bigint` | Cumulative count of payment records captured in that sector. |
| `total_disputes` | `bigint` | Cumulative count of formally raised disputes recorded in the disputes table for that sector. |
| `dispute_rate` | `numeric` | **Dispute Rate:** The ratio of disputes raised against the total transaction payments: $$\text{Dispute Rate} = \frac{\text{Total Disputes in Sector}}{\text{Total Escrow Payments in Sector}}$$ |
| `total_frozen_capital` | `numeric` | **Frozen Escrow Capital:** Sum total of all funds currently locked in a `'disputed'` state, halting disbursements to contractors (`SUM(total_amount) WHERE escrow_status = 'disputed'`). |
