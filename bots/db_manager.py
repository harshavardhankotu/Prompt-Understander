import sqlite3
import json
import os
from config import DB_PATH

# Monkeypatch sqlite3.connect to enforce foreign keys on every single connection
_orig_connect = sqlite3.connect
def _custom_connect(*args, **kwargs):
    conn = _orig_connect(*args, **kwargs)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
    except Exception:
        pass
    return conn
sqlite3.connect = _custom_connect

def setup_database():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    try:
        # Enable Write-Ahead Logging (WAL) mode for concurrent read/write and deadlock prevention
        conn.execute("PRAGMA journal_mode=WAL;")
        cursor = conn.cursor()
        
        # 1. Campaigns & Distribution
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS campaigns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT,
            title TEXT,
            price TEXT,
            platform TEXT,
            sector TEXT,
            affiliate_link TEXT,
            caption TEXT,
            graphic_path TEXT,
            total_views INTEGER DEFAULT 0,
            total_clicks INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS distribution_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id INTEGER,
            platform TEXT,
            status TEXT,
            link TEXT,
            views INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            message_id TEXT,
            FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
        )''')

        # 2. Affiliate Tracking
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS affiliate_clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT,
            product_title TEXT,
            sector TEXT,
            channel TEXT,
            affiliate_link TEXT,
            user_agent TEXT,
            referrer TEXT,
            session_id TEXT,
            revenue_score REAL,
            est_commission_pct REAL,
            clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_bot INTEGER DEFAULT 0
        )''')

        # Safe migration for affiliate_clicks 'is_bot' column if it doesn't exist
        cursor.execute("PRAGMA table_info(affiliate_clicks)")
        columns = [row[1] for row in cursor.fetchall()]
        if 'is_bot' not in columns:
            cursor.execute("ALTER TABLE affiliate_clicks ADD COLUMN is_bot INTEGER DEFAULT 0")

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS affiliate_conversions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            click_id INTEGER,
            product_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending_conversion',
            sale_amount REAL DEFAULT 0,
            commission_amount REAL DEFAULT 0,
            converted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (click_id) REFERENCES affiliate_clicks (id)
        )''')

        # 3. Scheduler Engine
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS scheduler_jobs (
            job_id        TEXT PRIMARY KEY,
            job_label     TEXT,
            job_type      TEXT,
            schedule_expr TEXT,
            enabled       INTEGER DEFAULT 1,
            next_run_at   TIMESTAMP,
            last_run_at   TIMESTAMP,
            last_status   TEXT,
            last_error    TEXT,
            run_count     INTEGER DEFAULT 0
        )''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS scheduler_runs (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id         TEXT NOT NULL,
            started_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            finished_at    TIMESTAMP,
            status         TEXT,
            result_summary TEXT,
            error_message  TEXT,
            duration_secs  REAL,
            FOREIGN KEY (job_id) REFERENCES scheduler_jobs (job_id)
        )''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS scheduler_locks (
            job_id     TEXT PRIMARY KEY,
            locked_at  TIMESTAMP,
            locked_by  TEXT
        )''')

        # 4. Retargeting Logs
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS retargeting_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            click_id INTEGER NOT NULL,
            product_id TEXT NOT NULL,
            session_id TEXT,
            strategy TEXT,
            retargeted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (click_id) REFERENCES affiliate_clicks (id)
        )''')

        # 5. Reliability Schema Tables
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_quota_usage (
            provider TEXT,
            usage_date DATE,
            request_count INTEGER DEFAULT 0,
            PRIMARY KEY (provider, usage_date)
        )''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS circuit_breaker_state (
            provider TEXT PRIMARY KEY,
            state TEXT DEFAULT 'CLOSED',
            failure_count INTEGER DEFAULT 0,
            success_count INTEGER DEFAULT 0,
            last_failure_at TIMESTAMP,
            tripped_at TIMESTAMP
        )''')

        # Seed circuit breaker states for immediate visibility on SRE dashboard
        for provider in ['gemini', 'telegram', 'playwright', 'twitter', 'instagram', 'whatsapp']:
            cursor.execute("""
            INSERT OR IGNORE INTO circuit_breaker_state (provider, state, failure_count, success_count)
            VALUES (?, 'CLOSED', 0, 0)
            """, (provider,))

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS processed_events (
            event_id TEXT PRIMARY KEY,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS job_queue (
            job_id TEXT PRIMARY KEY,
            task_name TEXT NOT NULL,
            payload TEXT,
            state TEXT DEFAULT 'pending',
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            last_error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS dead_letter_jobs (
            job_id TEXT PRIMARY KEY,
            task_name TEXT NOT NULL,
            payload TEXT,
            failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            final_error TEXT
        )''')

        # 6. Session-Backed Users
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        # 7. Retargeting Suppression Table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS retargeting_suppression (
            session_id TEXT,
            product_id TEXT,
            converted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (session_id, product_id)
        )''')

        # 8. Conversion Postback Log
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversion_postback_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT UNIQUE,
            product_id TEXT,
            commission_value REAL,
            network_name TEXT,
            received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            raw_payload TEXT
        )''')

        # 9. Operator Settings Table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS operator_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )''')
        
        # Seed default commission rates
        cursor.execute("SELECT 1 FROM operator_settings WHERE key = 'commission_rates'")
        if not cursor.fetchone():
            default_rates = {
                "amazon":  {"default": 4, "smartphones": 2, "laptops": 3, "beauty": 6,
                            "kitchen": 8, "home": 7, "sports": 5, "automotive": 4,
                            "accessories": 9, "fashion": 8},
                "flipkart": {"default": 6, "smartphones": 3, "laptops": 4, "beauty": 10,
                             "kitchen": 10, "home": 9, "sports": 7, "automotive": 5,
                             "accessories": 12, "fashion": 10},
                "myntra":  {"default": 8, "fashion": 12, "beauty": 10, "accessories": 15},
            }
            cursor.execute("INSERT INTO operator_settings (key, value) VALUES ('commission_rates', ?)", (json.dumps(default_rates),))
            
        # Seed postback secret
        cursor.execute("SELECT 1 FROM operator_settings WHERE key = 'postback_secret'")
        if not cursor.fetchone():
            cursor.execute("INSERT INTO operator_settings (key, value) VALUES ('postback_secret', 'default_secret_key_123')", ())

        # 10. Dynamic Agency system_settings Table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )''')

        # Seed default agency settings
        defaults = {
            "amazon_tag": "marketingai-21",
            "flipkart_tag": "marketingai",
            "auto_publish_timeout": "30",
            "active_sectors": json.dumps({
                "smartphones": True,
                "laptops": True,
                "fashion_men": True,
                "fashion_women": True,
                "beauty": True,
                "home": True,
                "kitchen": True,
                "sports": True,
                "accessories": True,
                "automotive": True,
                "live_links": True
            })
        }
        for k, v in defaults.items():
            cursor.execute("SELECT 1 FROM system_settings WHERE key = ?", (k,))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO system_settings (key, value) VALUES (?, ?)", (k, v))

        # Safe dynamic migration: add status and publish_at to campaigns if not exist
        cursor.execute("PRAGMA table_info(campaigns)")
        campaign_cols = [row[1] for row in cursor.fetchall()]
        if 'status' not in campaign_cols:
            cursor.execute("ALTER TABLE campaigns ADD COLUMN status TEXT DEFAULT 'published'")
        if 'publish_at' not in campaign_cols:
            cursor.execute("ALTER TABLE campaigns ADD COLUMN publish_at TIMESTAMP")
        
        # Safe dynamic migration: add variant to affiliate_clicks if not exist
        cursor.execute("PRAGMA table_info(affiliate_clicks)")
        click_cols = [row[1] for row in cursor.fetchall()]
        if 'variant' not in click_cols:
            cursor.execute("ALTER TABLE affiliate_clicks ADD COLUMN variant TEXT")

        # Safe dynamic migration: add message_id to distribution_logs if not exist
        cursor.execute("PRAGMA table_info(distribution_logs)")
        dist_cols = [row[1] for row in cursor.fetchall()]
        if 'message_id' not in dist_cols:
            cursor.execute("ALTER TABLE distribution_logs ADD COLUMN message_id TEXT")
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"ERROR: Database setup failed: {e}")
        raise e
    finally:
        conn.close()


def save_campaign(campaign_data, sector="tech"):
    setup_database()
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    try:
        # Acquire write lock immediately to prevent concurrent write deadlocks
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.cursor()
        
        metrics = campaign_data.get('total_metrics', {})
        
        # Fetch auto-publish timeout from settings (default to 30 mins)
        cursor.execute("SELECT value FROM system_settings WHERE key = 'auto_publish_timeout'")
        row = cursor.fetchone()
        timeout_mins = int(row[0]) if row else 30
        
        from datetime import datetime, timedelta
        publish_at_dt = datetime.utcnow() + timedelta(minutes=timeout_mins)
        publish_at_str = publish_at_dt.strftime('%Y-%m-%d %H:%M:%S')

        # Insert main campaign in 'pending_approval' state
        cursor.execute('''
        INSERT INTO campaigns (product_id, title, price, platform, sector, affiliate_link, caption, graphic_path, total_views, total_clicks, status, publish_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?)
        ''', (
            campaign_data.get('id', 'N/A'),
            campaign_data.get('title', ''),
            campaign_data.get('price', ''),
            campaign_data.get('platform', ''),
            sector,
            campaign_data.get('affiliate_link', ''),
            campaign_data.get('caption', ''),
            campaign_data.get('graphic_path', ''),
            metrics.get('total_views', 0),
            metrics.get('total_clicks', 0),
            publish_at_str
        ))
        
        campaign_id = cursor.lastrowid
        
        # Insert distribution logs
        for dist in campaign_data.get('distribution', []):
            d_metrics = dist.get('metrics', {})
            cursor.execute('''
            INSERT INTO distribution_logs (campaign_id, platform, status, link, views, clicks)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                campaign_id,
                dist.get('platform', ''),
                dist.get('status', ''),
                dist.get('link', ''),
                d_metrics.get('views', 0),
                d_metrics.get('clicks', 0)
            ))
            
        conn.commit()
        print(f"Successfully saved campaign '{campaign_data.get('title')}' to SQL database.")
        return campaign_id
    except Exception as e:
        conn.rollback()
        print(f"ERROR: Failed to save campaign to DB: {e}")
        raise e
    finally:
        conn.close()

def get_system_setting(key, default=""):
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5.0)
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM system_settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return row[0]
    except Exception:
        pass
    return default

if __name__ == "__main__":
    setup_database()
    print("Database setup complete.")

