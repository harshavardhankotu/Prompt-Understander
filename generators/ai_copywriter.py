import os
import json
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini using the new google-genai SDK
api_key = os.getenv("GEMINI_API_KEY")
client = None

if api_key:
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
    except ImportError:
        # Fallback to deprecated SDK if new one isn't available
        try:
            import google.generativeai as genai_old
            genai_old.configure(api_key=api_key)
            client = "legacy"
        except ImportError:
            print("Warning: No Gemini SDK found. Using mock captions.")

SECTOR_TEMPLATES = {
    "smartphones": {
        "en": "📱 Upgrade your mobile game! Check out {title} at just ₹{price} on {platform}. Best choice for {labels}. {why}",
        "hi": "📱 अपना मोबाइल अपग्रेड करें! {title} सिर्फ ₹{price} में {platform} पर पाएं। {labels} के लिए बेस्ट। {why}",
        "ta": "📱 உங்கள் மொபைலை அப்கிரேட் செய்யுங்கள்! {title} வெறும் ₹{price} மட்டுமே {platform} இல். {labels} ஆக சிறந்த தேர்வு. {why}"
    },
    "laptops": {
        "en": "💻 Supercharge your productivity with the {title}! Now available for ₹{price} on {platform}. {why}",
        "hi": "💻 अपनी प्रोडक्टिविटी बढ़ाएं {title} के साथ! अब {platform} पर सिर्फ ₹{price} में उपलब्ध। {why}",
        "ta": "💻 உங்கள் செயல்திறனை அதிகரிக்க {title}! இப்போது {platform} இல் வெறும் ₹{price} மட்டுமே. {why}"
    },
    "fashion_men": {
        "en": "👔 Style upgrade! Elevate your look with {title} on {platform} for just ₹{price}. {why}",
        "hi": "👔 स्टाइल अपग्रेड! {platform} पर सिर्फ ₹{price} में {title} के साथ अपना लुक निखारें। {why}",
        "ta": "👔 ஸ்டைல் அப்கிரேட்! {platform} இல் வெறும் ₹{price} மட்டுமே {title} உடன் உங்கள் தோற்றத்தை மேம்படுத்துங்கள். {why}"
    },
    "fashion_women": {
        "en": "👗 Fashion alert! Get the gorgeous {title} on {platform} today for ₹{price}. {why}",
        "hi": "👗 फैशन अलर्ट! {platform} पर आज ही ₹{price} में खूबसूरत {title} पाएं। {why}",
        "ta": "👗 பேஷன் அலர்ட்! {platform} இல் இன்று வெறும் ₹{price} மட்டுமே அழகான {title} பெறுங்கள். {why}"
    },
    "beauty": {
        "en": "✨ Glow up time! Try {title} on {platform} for ₹{price}. Recommended for {labels}. {why}",
        "hi": "✨ निखार पाने का समय! {platform} पर {title} सिर्फ ₹{price} में आज़माएं। {why}",
        "ta": "✨ ஜொலிக்கும் நேரம்! {platform} இல் {title} வெறும் ₹{price} மட்டுமே. {why}"
    },
    "home": {
        "en": "🏡 Cozy up your space! Get the lovely {title} on {platform} for ₹{price}. {why}",
        "hi": "🏡 अपने घर को सजाएं! {platform} पर ₹{price} में प्यारा {title} पाएं। {why}",
        "ta": "🏡 உங்கள் வீட்டை அழகுபடுத்துங்கள்! {platform} இல் வெறும் ₹{price} மட்டுமே {title}. {why}"
    },
    "kitchen": {
        "en": "🍳 Kitchen upgrades! Cook in style with the {title} on {platform} for ₹{price}. {why}",
        "hi": "🍳 किचन अपग्रेड! {platform} पर ₹{price} में {title} के साथ स्टाइल से खाना पकाएं। {why}",
        "ta": "🍳 சமையலறை மேம்படுத்தல்கள்! {platform} இல் வெறும் ₹{price} மட்டுமே {title} உடன் சமைத்து மகிழுங்கள். {why}"
    },
    "sports": {
        "en": "💪 Fitness goals! Grab your {title} on {platform} for ₹{price} and stay active. {why}",
        "hi": "💪 फिटनेस गोल्स! {platform} पर ₹{price} में {title} पाएं और एक्टिव रहें। {why}",
        "ta": "💪 உடற்பயிற்சி இலக்குகள்! {platform} இல் வெறும் ₹{price} மட்டுமே {title} பெற்று சுறுசுறுப்பாக இருங்கள். {why}"
    },
    "accessories": {
        "en": "🕶️ Accessory check! Complete your outfit with {title} on {platform} for ₹{price}. {why}",
        "hi": "🕶️ एक्सेसरी चेक! {platform} पर ₹{price} में {title} के साथ अपना ऑउटफिट पूरा करें। {why}",
        "ta": "🕶️ அக்சஸரி செக்! {platform} இல் வெறும் ₹{price} மட்டுமே {title} உடன் உங்கள் ஆடையை முழுமையாக்குங்கள். {why}"
    },
    "automotive": {
        "en": "🚗 Gear up! Check out the top-rated {title} on {platform} for just ₹{price}. {why}",
        "hi": "🚗 गियर अप! {platform} पर सिर्फ ₹{price} में टॉप-रेटेड {title} देखें। {why}",
        "ta": "🚗 கியர் அப்! {platform} இல் வெறும் ₹{price} மட்டுமே டாப்-ரேட்டட் {title} பாருங்கள். {why}"
    },
    "live_links": {
        "en": "🔗 Real-time deal! Get {title} now on {platform} for ₹{price}. Don't miss this! {why}",
        "hi": "🔗 रियल-टाइम डील! {platform} पर ₹{price} में {title} अभी पाएं। इसे मिस न करें! {why}",
        "ta": "🔗 ரியல்-டைம் டீல்! {platform} இல் வெறும் ₹{price} மட்டுமே {title} இப்போது பெறுங்கள். இதைத் தவறவிடாதீர்கள்! {why}"
    }
}

def generate_multilingual_copy(product):
    platform = product.get('platform', 'Store')
    title = product.get('title', 'Product')
    price = product.get('price', 'N/A')
    
    bf = product.get('buyer_fit', {})
    labels = ", ".join(bf.get('label_display', [])) if bf.get('label_display') else "Solid Pick"
    
    vex = product.get('value_explanation', {})
    why = vex.get('why_this_product', '')
    tradeoffs = vex.get('tradeoffs', '')
    
    sector = product.get('sector', 'smartphones').lower()
    if sector not in SECTOR_TEMPLATES:
        sector = "smartphones"
        
    tmpl_en = SECTOR_TEMPLATES[sector]["en"].format(title=title, price=price, platform=platform, labels=labels, why=why)
    tmpl_hi = SECTOR_TEMPLATES[sector]["hi"].format(title=title, price=price, platform=platform, labels=labels, why=why)
    tmpl_ta = SECTOR_TEMPLATES[sector]["ta"].format(title=title, price=price, platform=platform, labels=labels, why=why)
    
    mock_en = (
        f"🚨 {tmpl_en}\n\n"
        f"🔗 Link in Bio/Comments!\n\n"
        f"*Disclosure: As an affiliate, I earn a commission from qualifying purchases. #Ad\n\n"
        f"#trending #{sector} #{platform.replace(' ', '')} #deals"
    )
    mock_hi = (
        f"🚨 {tmpl_hi}\n\n"
        f"🔗 लिंक बायो/कमेंट्स में है!\n\n"
        f"*डिस्क्लोज़र: एक एफिलिएट के रूप में, मैं योग्य खरीद से कमीशन कमाता हूँ। #Ad\n\n"
        f"#trending #{sector} #{platform.replace(' ', '')} #deals"
    )
    mock_ta = (
        f"🚨 {tmpl_ta}\n\n"
        f"🔗 லிங்க் பயோ/கமெண்ட்ஸில்!\n\n"
        f"*வெளிப்படுத்தல்: ஒரு அஃபிலியேட்டாக, தகுதியான கொள்முதல் மூலம் நான் கமிஷன் பெறுகிறேன். #Ad\n\n"
        f"#trending #{sector} #{platform.replace(' ', '')} #deals"
    )
    
    # Import reliability services
    from bots.resilience import call_with_retry, timeout_call
    from bots.circuit_breakers import get_breaker, CircuitBreakerOpenException
    from bots.quota_manager import check_quota, consume_quota, QuotaExceededException

    if not client:
        return {'en': mock_en, 'hi': mock_hi, 'ta': mock_ta}

    # 1. Quota Check
    if check_quota("gemini") == "BLOCKED":
        print("[AI_COPYWRITER] Daily quota blocked for 'gemini'. Returning mock fallbacks.")
        return {'en': mock_en, 'hi': mock_hi, 'ta': mock_ta}

    # 2. Circuit Breaker Check
    breaker = get_breaker("gemini", failure_threshold=5, cooldown_sec=60)
    try:
        breaker.check()
    except CircuitBreakerOpenException as e:
        print(f"[AI_COPYWRITER] Circuit Breaker open for 'gemini'. Returning mock fallbacks. Details: {e}")
        return {'en': mock_en, 'hi': mock_hi, 'ta': mock_ta}

    prompt = f"""
    You are an expert social media copywriter for the Indian market.
    Write highly engaging, concise affiliate marketing captions for the following product in 3 languages: English, Hindi, and Tamil.
    
    Product details:
    - Name: {title}
    - Price: ₹{price}
    - Platform: {platform}
    - Buyer Fit Labels: {labels}
    - Value Proposition: {why}
    - Tradeoffs to mention honestly: {tradeoffs}
    
    Rules for ALL languages:
    - Keep it short, punchy, and natural.
    - DO NOT do awkward literal translations. Use colloquial, persuasive language (e.g., Hinglish/Tanglish terms are okay if natural).
    - Keep numbers, prices, and brand names as they are.
    - Include a clear call to action to click the link.
    - Include 3-4 relevant hashtags.
    - You MUST append an explicit plain-language affiliate disclosure to the end of the text in the target language:
      - For English: "*Disclosure: As an affiliate, I earn a commission from qualifying purchases. #Ad"
      - For Hindi: "*डिस्क्लोज़र: एक एफिलिएट के रूप में, मैं योग्य खरीद से कमीशन कमाता हूँ। #Ad"
      - For Tamil: "*வெளிப்படுத்தல்: ஒரு அஃபிலியேட்டாக, தகுதியான கொள்முதல் மூலம் நான் கமிஷன் பெறுகிறேன். #Ad"
    
    Output strictly as a JSON object with keys: "en", "hi", "ta". 
    Do not wrap in markdown code blocks. Just return valid JSON.
    """
    
    def make_api_call():
        consume_quota("gemini")
        if client == "legacy":
            import google.generativeai as genai_old
            model = genai_old.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(prompt)
            return response.text.strip()
        else:
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt
            )
            return response.text.strip()

    def make_api_call_with_timeout():
        return timeout_call(10, make_api_call)

    # 3. Call with Retry & Timeout
    retry_res = call_with_retry(
        make_api_call_with_timeout,
        max_retries=3,
        base_delay=1.0,
        max_delay=5.0,
        provider="gemini"
    )

    if not retry_res["success"]:
        # Record failure to circuit breaker
        breaker.record_failure()
        print(f"[AI_COPYWRITER] Gemini API execution failed: {retry_res['error']}. Returning mock fallbacks.")
        return {'en': mock_en, 'hi': mock_hi, 'ta': mock_ta}

    # Record success to circuit breaker
    breaker.record_success()
    text = retry_res["result"]

    disclosures = {
        'en': "*Disclosure: As an affiliate, I earn a commission from qualifying purchases. #Ad",
        'hi': "*डिस्क्लोज़र: एक एफिलिएट के रूप में, मैं योग्य खरीद से कमीशन कमाता हूँ। #Ad",
        'ta': "*வெளிப்படுத்தல்: ஒரு அஃபிலியேட்டாக, தகுதியான கொள்முதல் மூலம் நான் கமிஷன் பெறுகிறேன். #Ad"
    }

    try:
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        parsed = json.loads(text)
        if "en" in parsed and "hi" in parsed and "ta" in parsed:
            for lang in ['en', 'hi', 'ta']:
                val = parsed[lang]
                if "#Ad" not in val and "disclosure" not in val.lower() and "affiliate" not in val.lower():
                    parsed[lang] = val.strip() + "\n\n" + disclosures[lang]
            return parsed
        else:
            parsed = {'en': text, 'hi': mock_hi, 'ta': mock_ta}
            for lang in ['en', 'hi', 'ta']:
                val = parsed[lang]
                if "#Ad" not in val and "disclosure" not in val.lower() and "affiliate" not in val.lower():
                    parsed[lang] = val.strip() + "\n\n" + disclosures[lang]
            return parsed
    except Exception as e:
        print(f"Error parsing multilingual caption JSON: {e}")
        return {'en': mock_en, 'hi': mock_hi, 'ta': mock_ta}

def enrich_with_multilingual_copy(products):
    """Entry point for pipeline_service to generate copy in-process."""
    for idx, product in enumerate(products):
        print(f"  Generating copy ({idx+1}/{len(products)}): {product.get('title', '')[:30]}...")
        copies = generate_multilingual_copy(product)
        product['copy'] = copies
        # Preserve backward compatibility for UI
        product['caption'] = copies.get('en', '')
    return products

if __name__ == "__main__":
    print("Starting AI Copywriter...")
    
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../bots')))
    from config import OUTPUT_DIR

    products_path = os.path.join(OUTPUT_DIR, 'explained_products.json')
    if not os.path.exists(products_path):
        products_path = os.path.join(OUTPUT_DIR, 'ranked_products.json')
        
    if os.path.exists(products_path):
        with open(products_path, 'r', encoding='utf-8') as f:
            products = json.load(f)
            
        if products:
            output_path = os.path.join(OUTPUT_DIR, 'post_data.json')
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            post_data = []
            for idx, product in enumerate(products):
                print(f"Generating copy for product {idx+1}/{len(products)}: {product.get('title', 'Product')}...")
                copies = generate_multilingual_copy(product)
                print(f"  Copy generated successfully.")
                
                product['copy'] = copies
                product['caption'] = copies.get('en', '')
                product['graphic_path'] = f'/image/graphic_{idx}.jpg'
                if 'id' not in product:
                    product['id'] = f'prod_{idx}'
                post_data.append(product)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(post_data, f, indent=4, ensure_ascii=False)
            print(f"Saved {len(post_data)} posts to {output_path}")
        else:
            print("No products found.")
    else:
        print(f"Data file not found at {products_path}")
