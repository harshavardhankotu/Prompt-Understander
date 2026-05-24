import requests
import json
import os
import sys
import hashlib
from datetime import datetime

# ─────────────────────────────────────────────────────────────────────
# 10 Sectors, each mapped to one or more DummyJSON categories.
# We pull from multiple sub-categories to guarantee 10+ products per sector.
# ─────────────────────────────────────────────────────────────────────
SECTOR_CONFIG = {
    "smartphones": {
        "display": "Smartphones & Mobiles",
        "categories": ["smartphones", "mobile-accessories"],
        "link_template": "amazon",
        "platform": "Tech Store"
    },
    "laptops": {
        "display": "Laptops & Tablets",
        "categories": ["laptops", "tablets"],
        "link_template": "amazon",
        "platform": "Tech Store"
    },
    "fashion_men": {
        "display": "Men's Fashion",
        "categories": ["mens-shirts", "mens-shoes", "mens-watches"],
        "link_template": "myntra",
        "platform": "Fashion Hub"
    },
    "fashion_women": {
        "display": "Women's Fashion",
        "categories": ["womens-dresses", "womens-shoes", "womens-bags", "womens-jewellery", "womens-watches"],
        "link_template": "myntra",
        "platform": "Fashion Hub"
    },
    "beauty": {
        "display": "Beauty & Skincare",
        "categories": ["beauty", "skin-care", "fragrances"],
        "link_template": "flipkart",
        "platform": "Beauty Store"
    },
    "home": {
        "display": "Home & Furniture",
        "categories": ["furniture", "home-decoration"],
        "link_template": "flipkart",
        "platform": "Home & Living"
    },
    "kitchen": {
        "display": "Kitchen & Dining",
        "categories": ["kitchen-accessories", "groceries"],
        "link_template": "flipkart",
        "platform": "Kitchen World"
    },
    "sports": {
        "display": "Sports & Fitness",
        "categories": ["sports-accessories"],
        "link_template": "amazon",
        "platform": "Sports Arena"
    },
    "accessories": {
        "display": "Sunglasses & Accessories",
        "categories": ["sunglasses", "tops"],
        "link_template": "myntra",
        "platform": "Accessory Hub"
    },
    "automotive": {
        "display": "Automotive & Vehicles",
        "categories": ["motorcycle", "vehicle"],
        "link_template": "amazon",
        "platform": "Auto World"
    },
    "live_links": {
        "display": "🔗 Real Live Links (input_links.txt)",
        "categories": [],
        "link_template": "live",
        "platform": "Direct Store"
    }
}

PRODUCTS_PER_SECTOR = 10


def build_product_link(title, link_template):
    """Generate a tracking-style link based on the destination platform."""
    encoded = title.replace(' ', '+')
    if link_template == "amazon":
        return f"https://www.amazon.in/s?k={encoded}"
    elif link_template == "myntra":
        return f"https://www.myntra.com/{encoded.replace('+', '-')}"
    else:
        return f"https://www.flipkart.com/search?q={encoded}"


def scrape_trending_deals():
    """Scrapes a live public RSS feed of trending deals, extracts top 5 links, and writes them to input_links.txt."""
    import xml.etree.ElementTree as ET
    rss_url = "https://slickdeals.net/newsearch.php?mode=popdeals&searcharea=deals&order=asc&sort=relevance&rss=1"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    print(f"  [RSS SCRAPER] Fetching popular deals RSS feed from: {rss_url}")
    try:
        resp = requests.get(rss_url, headers=headers, timeout=15)
        if resp.status_code != 200:
            print(f"  [RSS SCRAPER] Error: RSS feed returned status {resp.status_code}")
            return
            
        links = []
        try:
            # Parse XML
            root = ET.fromstring(resp.content)
            items = root.findall('.//item')
            for item in items:
                link_el = item.find('link')
                if link_el is not None and link_el.text:
                    links.append(link_el.text.strip())
                    if len(links) >= 5:
                        break
        except Exception as xml_err:
            print(f"  [RSS SCRAPER] XML parsing error: {xml_err}. Falling back to regex extraction.")
            
        # Fallback string-based parsing if ET parsing fails or returns no links
        if not links:
            import re
            item_contents = re.findall(r'<item>(.*?)</item>', resp.text, re.DOTALL)
            for item in item_contents:
                link_match = re.search(r'<link>(.*?)</link>', item, re.DOTALL)
                if link_match:
                    url = link_match.group(1).replace('<![CDATA[', '').replace(']]>', '').strip()
                    links.append(url)
                    if len(links) >= 5:
                        break
                        
        if not links:
            print("  [RSS SCRAPER] No links extracted from RSS feed.")
            return
            
        # Write to input_links.txt
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        input_file = os.path.join(base_dir, 'data', 'input_links.txt')
        os.makedirs(os.path.dirname(input_file), exist_ok=True)
        
        with open(input_file, 'w', encoding='utf-8') as f:
            for link in links:
                f.write(link + "\n")
                
        print(f"  [RSS SCRAPER] Successfully scraped and wrote {len(links)} links to {input_file}")
        
    except Exception as e:
        print(f"  [RSS SCRAPER] Failed to scrape trending deals: {e}")


def fetch_trending_products(sector="smartphones"):
    """
    Fetches trending products for a sector by pulling from one or more
    DummyJSON categories and merging them into a unified top-10 list.
    """
    config = SECTOR_CONFIG.get(sector.lower())
    if not config:
        print(f"Unknown sector: {sector}. Falling back to smartphones.")
        config = SECTOR_CONFIG["smartphones"]

    # ── Handle Real Live Links Sector ──
    if sector.lower() == "live_links":
        print("  Running Live Sourcing RSS Deal Scraper first...")
        try:
            scrape_trending_deals()
        except Exception as se:
            print(f"  Error running RSS Deal Scraper: {se}")
        print("  Running Real-Time Playwright Link Extractor to fetch fresh product data...")
        import subprocess
        
        # Determine paths
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        extractor_script = os.path.join(base_dir, 'scrapers', 'link_extractor.py')
        extracted_path = os.path.join(base_dir, 'data', 'extracted_products.json')
        
        try:
            # Try to run link_extractor.py as a subprocess to keep Playwright isolated
            print(f"  Executing: {sys.executable} {extractor_script}")
            subprocess.run([sys.executable, extractor_script], check=True, cwd=base_dir)
        except Exception as e:
            print(f"  Error running link_extractor.py: {e}")
            
        if os.path.exists(extracted_path):
            try:
                with open(extracted_path, 'r', encoding='utf-8') as f:
                    products = json.load(f)
                # Ensure products have sector set to live_links
                for p in products:
                    p["sector"] = "live_links"
                print(f"  Successfully loaded {len(products)} live extracted products!")
                return products
            except Exception as e:
                print(f"  Error loading extracted products: {e}")
        else:
            print(f"  Warning: Extracted products file not found at {extracted_path}")
        return []

    all_products = []

    for cat in config["categories"]:
        url = f"https://dummyjson.com/products/category/{cat}?limit=30"
        print(f"  Fetching from [{cat}]: {url}")
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("products", []):
                    title = item.get("title", "Unknown Title")
                    brand = item.get("brand", "Generic")
                    if title == "Unknown Title":
                        continue

                    # Generate a stable ID
                    pid = hashlib.md5(f"{title}-{brand}".encode()).hexdigest()[:12]

                    all_products.append({
                        "id": pid,
                        "title": title,
                        "description": item.get("description", ""),
                        "price": str(int(item.get("price", 0) * 83)),
                        "original_price_usd": item.get("price", 0),
                        "discount": item.get("discountPercentage", 0),
                        "platform": config["platform"],
                        "image_url": item.get("thumbnail", ""),
                        "link": build_product_link(title, config["link_template"]),
                        "rating": str(item.get("rating", "N/A")),
                        "stock": item.get("stock", 0),
                        "brand": brand,
                        "category": item.get("category", cat),
                        "sector": sector,
                        "fetched_at": datetime.utcnow().isoformat()
                    })
            else:
                print(f"  Warning: API returned {resp.status_code} for {cat}")
        except Exception as e:
            print(f"  Error fetching {cat}: {e}")

    # ── Sort by rating (desc) then discount (desc) to surface the best deals ──
    all_products.sort(
        key=lambda p: (float(p["rating"]) if p["rating"] != "N/A" else 0, p["discount"]),
        reverse=True
    )

    # Take top N
    top = all_products[:PRODUCTS_PER_SECTOR]
    print(f"  Selected {len(top)} products for [{config['display']}]")
    return top


def get_all_sectors():
    """Returns the ordered list of sector keys."""
    return list(SECTOR_CONFIG.keys())


def get_sector_display_name(sector):
    cfg = SECTOR_CONFIG.get(sector)
    return cfg["display"] if cfg else sector


if __name__ == "__main__":
    sector = sys.argv[1] if len(sys.argv) > 1 else "smartphones"
    print(f"Starting Product Extractor — Sector: {sector}")
    print("=" * 60)

    scraped_data = fetch_trending_products(sector)

    if not scraped_data:
        print("Error: No products were fetched. Check network connection.")
    else:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_dir = os.path.join(base_dir, 'data')
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, 'trending_products.json')

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(scraped_data, f, indent=4, ensure_ascii=False)

        print(f"\nFetched {len(scraped_data)} products. Saved to: {output_path}")
