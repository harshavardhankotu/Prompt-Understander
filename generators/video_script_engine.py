import os
import json
import tempfile
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
        try:
            import google.generativeai as genai_old
            genai_old.configure(api_key=api_key)
            client = "legacy"
        except ImportError:
            pass

def generate_video_scripts(product):
    title = product.get('title', 'Product')
    price = product.get('price', 'N/A')
    why = product.get('value_explanation', {}).get('why_this_product', '')
    
    mock_script = {
        "hook": "Wait! Don't buy that phone until you see this.",
        "body": f"The {title} is currently only ₹{price}. {why}",
        "cta": "Link in bio to grab this deal!",
        "visual_cues": "0s: Close up of product. 5s: Zoom into price tag. 15s: Thumbs up."
    }
    
    # Import reliability services
    from bots.resilience import call_with_retry, timeout_call
    from bots.circuit_breakers import get_breaker, CircuitBreakerOpenException
    from bots.quota_manager import check_quota, consume_quota, QuotaExceededException

    if not client:
        return mock_script

    # 1. Quota Check
    if check_quota("gemini") == "BLOCKED":
        print("[VIDEO_SCRIPT] Daily quota blocked for 'gemini'. Returning mock script.")
        return mock_script

    # 2. Circuit Breaker Check
    breaker = get_breaker("gemini", failure_threshold=5, cooldown_sec=60)
    try:
        breaker.check()
    except CircuitBreakerOpenException as e:
        print(f"[VIDEO_SCRIPT] Circuit Breaker open for 'gemini'. Returning mock script. Details: {e}")
        return mock_script

    prompt = f"""
    Write a 30-second high-conversion viral video script (Reels/Shorts/TikTok) for this product.
    
    Product: {title}
    Price: ₹{price}
    Key Selling Point: {why}
    
    Format:
    - Hook: A 3-second attention-grabbing opener.
    - Body: 20 seconds of punchy benefits.
    - CTA: 7-second clear call to action.
    - Visual Cues: Brief descriptions of what should happen on screen.
    
    Output strictly as a JSON object with keys: "hook", "body", "cta", "visual_cues".
    Do not wrap in markdown code blocks.
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
        print(f"[VIDEO_SCRIPT] Gemini API execution failed: {retry_res['error']}. Returning mock script.")
        return mock_script

    # Record success to circuit breaker
    breaker.record_success()
    text = retry_res["result"]

    try:
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        return json.loads(text)
    except Exception as e:
        print(f"Error parsing video script JSON: {e}")
        return mock_script

def render_video_clip(product, script):
    """
    Renders a 15-second 9:16 vertical MP4 video for the product and script.
    Saves it to static/campaigns/video_{campaign_id}.mp4.
    """
    campaign_id = product.get('id', 'unknown')
    print(f"    [VIDEO-RENDER] Starting video render for campaign {campaign_id}...")
    
    # 1. Output file path
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    output_dir = os.path.join(base_dir, 'static', 'campaigns')
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"video_{campaign_id}.mp4")
    
    # 2. Get voiceover text from script
    hook = script.get("hook", "Check out this deal!")
    body = script.get("body", "")
    cta = script.get("cta", "Link in bio to buy!")
    voiceover_text = f"{hook}. {body}. {cta}"
    
    temp_mp3 = None
    video = None
    
    try:
        from gtts import gTTS
        from moviepy.video.io.ImageSequenceClip import ImageSequenceClip
        from moviepy.audio.io.AudioFileClip import AudioFileClip
        from PIL import Image, ImageDraw, ImageFont
        import numpy as np
        
        # 3. Generate Audio via gTTS
        print("      [VIDEO-RENDER] Generating voiceover TTS MP3...")
        tts = gTTS(text=voiceover_text, lang='en', slow=False)
        temp_dir = tempfile.gettempdir()
        temp_mp3 = os.path.join(temp_dir, f"voiceover_{campaign_id}.mp3")
        tts.save(temp_mp3)
        
        # Determine duration from audio file or default to 15 seconds
        audio_clip = AudioFileClip(temp_mp3)
        audio_duration = audio_clip.duration
        duration = int(max(10, min(15, audio_duration))) # clamp between 10 and 15 seconds
        print(f"      [VIDEO-RENDER] Voiceover duration: {audio_duration:.2f}s (clamped to {duration}s)")
        
        # 4. Resolve Creative Graphic Image Path
        graphic_path = product.get('graphic_path')
        if not graphic_path or not os.path.exists(graphic_path):
            # Fallback to a placeholder if missing
            print(f"      [VIDEO-RENDER] Warning: graphic_path {graphic_path} not found. Creating placeholder.")
            base_img = Image.new("RGB", (1080, 1080), (71, 85, 105))
            draw = ImageDraw.Draw(base_img)
            draw.text((100, 500), product.get('title', 'Product'), fill=(255, 255, 255))
        else:
            base_img = Image.open(graphic_path)
            
        # 5. PIL Ken Burns Zooming & Frame Generator (10 fps)
        fps = 10
        total_frames = fps * duration
        frames = []
        
        print(f"      [VIDEO-RENDER] Compiling {total_frames} frames via Pillow...")
        
        # Select font
        font_hook = None
        font_cta = None
        for font_name in ["Inter-Bold.ttf", "arialbd.ttf", "arial.ttf"]:
            try:
                font_hook = ImageFont.truetype(font_name, 56)
                font_cta = ImageFont.truetype(font_name, 48)
                break
            except Exception:
                pass
        if not font_hook:
            font_hook = ImageFont.load_default()
            font_cta = ImageFont.load_default()
            
        for i in range(total_frames):
            # Canvas 1080x1920 (9:16 vertical video)
            canvas = Image.new("RGB", (1080, 1920), (18, 18, 22)) 
            
            # Draw subtle top/bottom neon accent lines
            draw = ImageDraw.Draw(canvas)
            draw.rectangle([0, 0, 1080, 15], fill=(71, 85, 105)) # Slate top accent
            draw.rectangle([0, 1905, 1080, 1920], fill=(34, 197, 94)) # Green bottom accent
            
            # Ken Burns effect: Zoom from 0.90 to 1.02 over time
            t = i / total_frames
            scale = 0.90 + 0.12 * t
            
            new_w = int(base_img.width * scale)
            new_h = int(base_img.height * scale)
            scaled_img = base_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # Center the image
            x = (1080 - new_w) // 2
            y = (1920 - new_h) // 2
            canvas.paste(scaled_img, (x, y))
            
            # Overlay Hook text with panel
            draw.rectangle([50, 100, 1030, 280], fill=(26, 26, 31, 200))
            hook_text = hook
            if len(hook_text) > 40:
                hook_text = hook_text[:37] + "..."
            draw.text((90, 160), hook_text, font=font_hook, fill=(241, 241, 244))
            
            # Overlay CTA text with panel
            draw.rectangle([50, 1650, 1030, 1800], fill=(34, 197, 94, 230))
            cta_text = cta
            if len(cta_text) > 40:
                cta_text = cta_text[:37] + "..."
            draw.text((120, 1700), cta_text, font=font_cta, fill=(255, 255, 255))
            
            # Dynamic amber progress bar
            progress_w = int((i / total_frames) * 1080)
            draw.rectangle([0, 1900, progress_w, 1905], fill=(245, 158, 11))
            
            frames.append(np.array(canvas))
            
        # 6. Build MoviePy Clip
        print("      [VIDEO-RENDER] Compiling video clip from frames sequence...")
        video = ImageSequenceClip(frames, fps=fps)
        
        # Sync audio and write file (compatible with moviepy v1 and v2)
        print("      [VIDEO-RENDER] Attaching voiceover audio clip...")
        if hasattr(video, 'with_audio'):
            video = video.with_audio(audio_clip.with_duration(duration))
        else:
            video = video.set_audio(audio_clip.set_duration(duration))
        
        print(f"      [VIDEO-RENDER] Exporting high-definition MP4 to: {output_file}...")
        video.write_videofile(
            output_file,
            codec="libx264",
            audio_codec="aac",
            fps=fps,
            logger=None
        )
        
        print(f"    [VIDEO-RENDER] Success! Compiled: video_{campaign_id}.mp4 ({duration}s)")
        
    except Exception as e:
        print(f"    [VIDEO-RENDER] ERROR: Video compilation failed: {e}")
        # Continue pipeline safely so the image/text campaigns still go out
    finally:
        try:
            if video:
                video.close()
            if temp_mp3 and os.path.exists(temp_mp3):
                os.remove(temp_mp3)
        except Exception:
            pass

def run_script_generation():
    print("Generating short-form video scripts and rendering mp4 reels...")
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    input_path = os.path.join(base_dir, 'data', 'output', 'post_data.json')
    output_path = os.path.join(base_dir, 'data', 'output', 'video_scripts.json')
    
    if not os.path.exists(input_path):
        print(f"Input file {input_path} not found.")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        products = json.load(f)

    scripts = []
    for product in products:
        pid = product.get('id', 'unknown')
        print(f"  Creating script and video for {product.get('title', pid)[:30]}...")
        script = generate_video_scripts(product)
        scripts.append({
            "product_id": pid,
            "title": product.get('title'),
            "script": script
        })
        # Render the dynamic vertical video reel
        render_video_clip(product, script)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(scripts, f, indent=4, ensure_ascii=False)
    print(f"Saved {len(scripts)} scripts and reels to {output_path}")

if __name__ == "__main__":
    run_script_generation()
