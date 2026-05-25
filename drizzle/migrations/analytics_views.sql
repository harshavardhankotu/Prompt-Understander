-- =========================================================================
-- Analytics Transformation Layer (SQL Views) for Power BI Integration
-- Database: OmniBid India PostgreSQL (Supabase)
-- =========================================================================

-- 1. vw_platform_financials
-- Summarizes platform transactional performance (GTV, fees, TDS, net payouts) over time.
CREATE OR REPLACE VIEW vw_platform_financials AS
SELECT 
    DATE_TRUNC('month', r.created_at)::date AS reporting_month,
    COUNT(p.id) AS total_payments,
    COALESCE(SUM(p.total_amount), 0) AS gross_transaction_volume_gtv,
    COALESCE(SUM(p.platform_fee_amount), 0) AS total_platform_fees_collected,
    COALESCE(SUM(p.tds_amount), 0) AS total_tds_withheld,
    COALESCE(SUM(p.net_to_provider), 0) AS total_net_provider_payouts
FROM payments p
INNER JOIN requirements r ON p.requirement_id = r.id
INNER JOIN bids b ON p.bid_id = b.id
GROUP BY DATE_TRUNC('month', r.created_at)::date
ORDER BY reporting_month DESC;

-- 2. vw_sector_analytics
-- Provides deep sector-level KPIs including listing volume, price floors, winning values, and Bid Density.
CREATE OR REPLACE VIEW vw_sector_analytics AS
SELECT 
    c.name AS sector_name,
    c.slug AS sector_slug,
    COUNT(DISTINCT r.id) AS total_requirements,
    COALESCE(AVG(c.min_bid_floor), 0) AS avg_min_bid_floor,
    COALESCE(AVG(b_win.bid_amount), 0) AS avg_winning_bid_amount,
    COALESCE(COUNT(b.id)::numeric / NULLIF(COUNT(DISTINCT r.id), 0), 0) AS bid_density
FROM categories c
LEFT JOIN requirements r ON r.category_id = c.id
LEFT JOIN bids b ON b.requirement_id = r.id
LEFT JOIN bids b_win ON r.winning_bid_id = b_win.id
GROUP BY c.id, c.name, c.slug
ORDER BY total_requirements DESC;

-- 3. vw_trust_and_disputes
-- Summarizes dispute frequency, dispute rate, and locked/frozen capital in escrow per sector.
CREATE OR REPLACE VIEW vw_trust_and_disputes AS
SELECT 
    c.name AS sector_name,
    c.slug AS sector_slug,
    COUNT(DISTINCT p.id) AS total_payments,
    COUNT(DISTINCT d.id) AS total_disputes,
    COALESCE(COUNT(DISTINCT d.id)::numeric / NULLIF(COUNT(DISTINCT p.id), 0), 0) AS dispute_rate,
    COALESCE(SUM(CASE WHEN p.escrow_status = 'disputed' THEN p.total_amount ELSE 0 END), 0) AS total_frozen_capital
FROM categories c
LEFT JOIN requirements r ON r.category_id = c.id
LEFT JOIN payments p ON p.requirement_id = r.id
LEFT JOIN disputes d ON d.requirement_id = r.id
GROUP BY c.id, c.name, c.slug
ORDER BY dispute_rate DESC;
