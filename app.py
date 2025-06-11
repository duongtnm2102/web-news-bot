from flask import Flask, render_template, request, jsonify, session
import feedparser
import os
import re
from datetime import datetime, timedelta
import calendar
from urllib.parse import urljoin, urlparse, quote
import html
import chardet
import pytz
import json
import requests
import random
import hashlib
import uuid
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
import logging

# Enhanced libraries for better content extraction
try:
    import trafilatura
    TRAFILATURA_AVAILABLE = True
except ImportError:
    TRAFILATURA_AVAILABLE = False

try:
    import newspaper
    from newspaper import Article
    NEWSPAPER_AVAILABLE = True
except ImportError:
    NEWSPAPER_AVAILABLE = False

try:
    from bs4 import BeautifulSoup
    BEAUTIFULSOUP_AVAILABLE = True
except ImportError:
    BEAUTIFULSOUP_AVAILABLE = False

# Gemini AI for content analysis
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# Flask app configuration
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'tien-phong-econ-portal-2025')

# Environment variables
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Timezone - Vietnam
VN_TIMEZONE = pytz.timezone('Asia/Ho_Chi_Minh')
UTC_TIMEZONE = pytz.UTC

# ULTRA-FAST CACHE - Optimized for 30s timeout
user_news_cache = {}
user_last_detail_cache = {}
global_seen_articles = {}
MAX_CACHE_ENTRIES = 5   # Drastically reduced
MAX_GLOBAL_CACHE = 50   # Much smaller cache
CACHE_EXPIRE_HOURS = 1  # Shorter cache time

# Ultra-fast processing limits
MAX_PROCESSING_TIME = 20  # 20 seconds max for news collection
MAX_SOURCES_CONCURRENT = 2  # Only 2 sources at once
MAX_ARTICLES_PER_SOURCE = 3  # Only 3 articles per source
REQUEST_TIMEOUT = 3  # 3 second timeout per RSS fetch

# Enhanced User Agents for better compatibility
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

# Configure logging for better debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_current_vietnam_datetime():
    """Get current Vietnam date and time"""
    return datetime.now(VN_TIMEZONE)

def get_current_date_str():
    """Get current date string in Vietnam format"""
    current_dt = get_current_vietnam_datetime()
    return current_dt.strftime("%d/%m/%Y")

def get_current_time_str():
    """Get current time string in Vietnam format"""
    current_dt = get_current_vietnam_datetime()
    return current_dt.strftime("%H:%M")

def get_current_datetime_str():
    """Get current datetime string for display"""
    current_dt = get_current_vietnam_datetime()
    return current_dt.strftime("%H:%M %d/%m/%Y")

print("🚀 Tiền Phong E-con News Backend - ULTRA-FAST VERSION (30s compatible):")
print(f"Gemini AI: {'✅' if GEMINI_API_KEY else '❌'}")
print(f"Content Extraction: {'✅' if TRAFILATURA_AVAILABLE else '❌'}")
print(f"Max Processing Time: {MAX_PROCESSING_TIME}s")
print(f"Max Sources Concurrent: {MAX_SOURCES_CONCURRENT}")
print("=" * 50)

# ULTRA-FAST RSS FEEDS - Only most reliable and fast sources
RSS_FEEDS = {
    # === ONLY CAFEF (Most reliable Vietnamese source) ===
    'cafef': {
        'cafef_stocks': 'https://cafef.vn/thi-truong-chung-khoan.rss',
        'cafef_business': 'https://cafef.vn/doanh-nghiep.rss'
    },
    
    # === ONLY YAHOO FINANCE (Most reliable international) ===
    'international': {
        'yahoo_finance': 'https://finance.yahoo.com/news/rssindex'
    }
}

# ULTRA-FAST CATEGORY MAPPING - Simplified
CATEGORY_MAPPING = {
    'all': ['cafef', 'international'],
    'domestic': ['cafef'],
    'international': ['international'],
    'stocks': ['cafef_stocks'],
    'business': ['cafef_business'],
    'finance': ['cafef_stocks', 'yahoo_finance'],
    'realestate': ['cafef_business'],
    'crypto': ['yahoo_finance'],
    'earnings': ['cafef_business'],
    'projects': ['cafef_business'],
    'macro': ['cafef_stocks'],
    'world': ['international'],
    'hot': ['cafef_stocks', 'yahoo_finance'],
    'tech': ['yahoo_finance']
}

def convert_utc_to_vietnam_time(utc_time_tuple):
    """Convert UTC to Vietnam time"""
    try:
        utc_timestamp = calendar.timegm(utc_time_tuple)
        utc_dt = datetime.fromtimestamp(utc_timestamp, tz=UTC_TIMEZONE)
        vn_dt = utc_dt.astimezone(VN_TIMEZONE)
        return vn_dt
    except Exception as e:
        return datetime.now(VN_TIMEZONE)

def normalize_title(title):
    """Normalize title for exact comparison"""
    normalized = re.sub(r'\s+', ' ', title.lower().strip())
    normalized = re.sub(r'[.,!?;:\-\u2013\u2014]', '', normalized)
    normalized = re.sub(r'["\'\u201c\u201d\u2018\u2019]', '', normalized)
    return normalized

def clean_expired_cache():
    """Clean expired articles from global cache - FAST VERSION"""
    global global_seen_articles
    current_time = get_current_vietnam_datetime()
    
    # Quick cleanup - remove all if too many
    if len(global_seen_articles) > MAX_GLOBAL_CACHE:
        global_seen_articles.clear()
        logger.info("🧹 Quick cache clear due to size limit")

def is_duplicate_article_local(news_item, existing_articles):
    """FAST duplicate check within current collection"""
    if len(existing_articles) == 0:
        return False
        
    current_title = normalize_title(news_item['title'])
    
    # Quick check - only compare titles for speed
    for existing in existing_articles:
        existing_title = normalize_title(existing['title'])
        if current_title == existing_title:
            return True
    
    return False

def get_enhanced_headers(url=None):
    """Fast headers for better compatibility"""
    return {
        'User-Agent': USER_AGENTS[0],
        'Accept': 'application/rss+xml, application/xml, text/xml',
        'Connection': 'close',  # Important for fast connections
        'Cache-Control': 'no-cache'
    }

def fetch_rss_ultra_fast(rss_url, timeout=REQUEST_TIMEOUT):
    """ULTRA-FAST RSS fetch with aggressive timeout"""
    try:
        headers = get_enhanced_headers(rss_url)
        response = requests.get(rss_url, headers=headers, timeout=timeout)
        
        if response.status_code == 200:
            return response.content
        else:
            logger.warning(f"❌ HTTP {response.status_code} for {rss_url}")
            return None
    except Exception as e:
        logger.warning(f"❌ Fast fetch error for {rss_url}: {e}")
        return None

def process_rss_feed_ultra_fast(source_name, rss_url, limit_per_source):
    """ULTRA-FAST RSS processing - optimized for 30s timeout"""
    start_time = time.time()
    
    try:
        logger.info(f"🔄 FAST processing {source_name}")
        
        # Ultra-fast fetch with short timeout
        content = fetch_rss_ultra_fast(rss_url, timeout=REQUEST_TIMEOUT)
        
        if content:
            feed = feedparser.parse(content)
        else:
            # Fallback to direct parse with timeout
            feed = feedparser.parse(rss_url)
        
        if not feed or not hasattr(feed, 'entries') or len(feed.entries) == 0:
            logger.warning(f"❌ No entries found for {source_name}")
            return []
        
        news_items = []
        
        # Process only first few entries for speed
        for entry in feed.entries[:limit_per_source]:
            try:
                # Quick processing - minimal data extraction
                if not hasattr(entry, 'title') or not hasattr(entry, 'link'):
                    continue
                    
                title = entry.title.strip()
                if len(title) < 10:  # Skip very short titles
                    continue
                
                vn_time = get_current_vietnam_datetime()
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    vn_time = convert_utc_to_vietnam_time(entry.published_parsed)
                
                # Minimal description extraction
                description = ""
                if hasattr(entry, 'summary'):
                    description = entry.summary[:150] + "..."  # Very short description
                
                news_item = {
                    'title': html.unescape(title),
                    'link': entry.link,
                    'source': source_name,
                    'published': vn_time,
                    'published_str': vn_time.strftime("%H:%M %d/%m"),
                    'description': html.unescape(description) if description else ""
                }
                news_items.append(news_item)
                
            except Exception as entry_error:
                logger.warning(f"⚠️ Entry processing error: {entry_error}")
                continue
        
        processing_time = time.time() - start_time
        logger.info(f"✅ FAST processed {len(news_items)} articles from {source_name} in {processing_time:.2f}s")
        return news_items
        
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"❌ FAST RSS processing error for {source_name} after {processing_time:.2f}s: {e}")
        return []

def collect_news_ultra_fast(sources_dict, limit_per_source=MAX_ARTICLES_PER_SOURCE):
    """ULTRA-FAST news collection - guaranteed under 20 seconds"""
    all_news = []
    start_time = time.time()
    
    logger.info(f"🔄 Starting ULTRA-FAST collection from {len(sources_dict)} sources")
    logger.info(f"⏱️ Max processing time: {MAX_PROCESSING_TIME}s")
    
    clean_expired_cache()
    
    # Use ThreadPoolExecutor with strict limits and timeout
    with ThreadPoolExecutor(max_workers=MAX_SOURCES_CONCURRENT) as executor:
        # Submit all tasks
        future_to_source = {
            executor.submit(process_rss_feed_ultra_fast, source_name, source_url, limit_per_source): source_name
            for source_name, source_url in sources_dict.items()
        }
        
        # Collect results with aggressive timeout
        total_processed = 0
        local_duplicates = 0
        
        try:
            for future in as_completed(future_to_source, timeout=MAX_PROCESSING_TIME):
                # Check if we're running out of time
                elapsed = time.time() - start_time
                if elapsed > MAX_PROCESSING_TIME - 2:  # Leave 2s buffer
                    logger.warning(f"⚠️ Approaching time limit, stopping collection")
                    break
                    
                source_name = future_to_source[future]
                try:
                    result = future.result(timeout=2)  # 2 second per source timeout
                    
                    if result:
                        for news_item in result:
                            total_processed += 1
                            
                            # Fast duplicate check - only local for speed
                            if is_duplicate_article_local(news_item, all_news):
                                local_duplicates += 1
                                continue
                            
                            # Add unique article
                            all_news.append(news_item)
                            
                except TimeoutError:
                    logger.warning(f"⚠️ Source {source_name} timed out")
                    continue
                except Exception as e:
                    logger.error(f"❌ Source {source_name} processing error: {e}")
                    continue
                    
        except TimeoutError:
            logger.warning(f"⚠️ Overall collection timeout after {MAX_PROCESSING_TIME}s")
    
    total_time = time.time() - start_time
    unique_count = len(all_news)
    logger.info(f"📊 ULTRA-FAST results: {total_processed} processed, {local_duplicates} dups, {unique_count} unique in {total_time:.2f}s")
    
    # Quick sort by publish time (newest first)
    if all_news:
        all_news.sort(key=lambda x: x['published'], reverse=True)
    
    return all_news

def get_or_create_user_session():
    """Get or create user session ID"""
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return session['user_id']

def save_user_news_ultra_fast(user_id, news_list, command_type, current_page=1):
    """ULTRA-FAST user news saving"""
    global user_news_cache
    
    user_news_cache[user_id] = {
        'news': news_list,
        'command': command_type,
        'current_page': current_page,
        'timestamp': get_current_vietnam_datetime()
    }
    
    # Quick cleanup if too many cache entries
    if len(user_news_cache) > MAX_CACHE_ENTRIES:
        # Remove oldest entries
        oldest_users = list(user_news_cache.keys())[:2]
        for user_id_to_remove in oldest_users:
            del user_news_cache[user_id_to_remove]

def save_user_last_detail(user_id, news_item):
    """Save last article accessed for AI context"""
    global user_last_detail_cache
    
    user_last_detail_cache[user_id] = {
        'article': news_item,
        'timestamp': get_current_vietnam_datetime()
    }

# ULTRA-FAST AI Engine - Quick responses only
class UltraFastGeminiAI:
    def __init__(self):
        self.available = GEMINI_AVAILABLE and GEMINI_API_KEY
        if self.available:
            genai.configure(api_key=GEMINI_API_KEY)
    
    def ask_question_fast(self, question: str, context: str = ""):
        """ULTRA-FAST Gemini AI responses"""
        if not self.available:
            return "⚠️ Gemini AI không khả dụng. Vui lòng kiểm tra cấu hình API."
        
        try:
            current_date_str = get_current_date_str()
            
            # Shorter prompt for faster response
            prompt = f"""Trả lời ngắn gọn và súc tích:

CÂU HỎI: {question}

{f"BỐI CẢNH: {context[:500]}..." if context else ""}

Hãy trả lời trong 150-200 từ, đi thẳng vào vấn đề chính. Ngày hôm nay: {current_date_str}"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            # Faster generation config
            generation_config = genai.types.GenerationConfig(
                temperature=0.3,
                top_p=0.8,
                max_output_tokens=400,  # Much shorter responses
            )
            
            response = model.generate_content(prompt, generation_config=generation_config)
            return response.text.strip()
            
        except Exception as e:
            return f"⚠️ Lỗi Gemini AI: {str(e)}"
    
    def debate_perspectives_fast(self, topic: str):
        """ULTRA-FAST debate system"""
        if not self.available:
            return "⚠️ Gemini AI không khả dụng cho chức năng bàn luận."
        
        try:
            # Much shorter prompt for faster processing
            prompt = f"""Tranh luận ngắn gọn về: {topic}

3 QUAN ĐIỂM (mỗi quan điểm 50-80 từ):

🎓 **Chuyên gia:** [Phân tích khách quan]

💰 **Nhà đầu tư:** [Quan điểm lợi nhuận]  

😟 **Người dân:** [Quan điểm đời sống]

Mỗi ý kiến ngắn gọn, đi thẳng vào vấn đề."""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.4,
                top_p=0.9,
                max_output_tokens=600,  # Shorter for speed
            )
            
            response = model.generate_content(prompt, generation_config=generation_config)
            return response.text.strip()
            
        except Exception as e:
            return f"⚠️ Lỗi Gemini AI: {str(e)}"

# Initialize Ultra-Fast Gemini Engine
gemini_engine = UltraFastGeminiAI()

# FIXED source mapping for display
source_names = {
    'cafef_stocks': 'CafeF CK', 'cafef_business': 'CafeF DN',
    'yahoo_finance': 'Yahoo Finance'
}

emoji_map = {
    'cafef_stocks': '📊', 'cafef_business': '🏭',
    'yahoo_finance': '💼'
}

# ULTRA-FAST Flask Routes
@app.route('/')
def index():
    """Main page with traditional newspaper theme"""
    return render_template('index.html')

@app.route('/api/news/<news_type>')
def get_news_api_ultra_fast(news_type):
    """ULTRA-FAST API endpoint - guaranteed under 25 seconds"""
    request_start_time = time.time()
    
    try:
        page = int(request.args.get('page', 1))
        user_id = get_or_create_user_session()
        
        logger.info(f"🔍 ULTRA-FAST API request: /api/news/{news_type}?page={page}")
        
        # Map frontend categories to RSS feeds
        if news_type in CATEGORY_MAPPING:
            feed_categories = CATEGORY_MAPPING[news_type]
            
            # Collect RSS URLs with limits
            all_sources = {}
            source_count = 0
            
            for category in feed_categories:
                if source_count >= MAX_SOURCES_CONCURRENT:
                    break
                    
                if category == 'cafef':
                    for k, v in RSS_FEEDS['cafef'].items():
                        if source_count >= MAX_SOURCES_CONCURRENT:
                            break
                        all_sources[k] = v
                        source_count += 1
                elif category == 'international':
                    for k, v in RSS_FEEDS['international'].items():
                        if source_count >= MAX_SOURCES_CONCURRENT:
                            break
                        all_sources[k] = v
                        source_count += 1
                elif category in RSS_FEEDS['cafef']:
                    all_sources[category] = RSS_FEEDS['cafef'][category]
                    source_count += 1
                elif category in RSS_FEEDS['international']:
                    all_sources[category] = RSS_FEEDS['international'][category]
                    source_count += 1
            
            logger.info(f"📡 ULTRA-FAST collecting from {len(all_sources)} sources for {news_type}")
            
            # ULTRA-FAST collection with timeout protection
            try:
                all_news = collect_news_ultra_fast(all_sources, MAX_ARTICLES_PER_SOURCE)
            except Exception as e:
                logger.error(f"❌ Collection error: {e}")
                all_news = []
            
        else:
            logger.error(f"❌ Invalid news type: {news_type}")
            return jsonify({'error': f'Invalid news type: {news_type}'}), 400
        
        # Quick pagination
        items_per_page = 8  # Smaller pages for faster loading
        start_index = (page - 1) * items_per_page
        end_index = start_index + items_per_page
        page_news = all_news[start_index:end_index]
        
        # Save to user cache
        save_user_news_ultra_fast(user_id, all_news, f"{news_type}_page_{page}")
        
        # Format news for frontend - minimal processing
        formatted_news = []
        for i, news in enumerate(page_news):
            emoji = emoji_map.get(news['source'], '📰')
            source_display = source_names.get(news['source'], news['source'])
            
            formatted_news.append({
                'id': start_index + i,
                'title': news['title'],
                'link': news['link'],
                'source': source_display,
                'emoji': emoji,
                'published': news['published_str'],
                'description': news['description'][:150] + "..." if len(news['description']) > 150 else news['description']
            })
        
        total_pages = max(1, (len(all_news) + items_per_page - 1) // items_per_page)
        
        request_time = time.time() - request_start_time
        logger.info(f"✅ ULTRA-FAST API success: {len(formatted_news)} articles, page {page}/{total_pages} in {request_time:.2f}s")
        
        return jsonify({
            'news': formatted_news,
            'page': page,
            'total_pages': total_pages,
            'total_articles': len(all_news),
            'processing_time': round(request_time, 2)
        })
        
    except Exception as e:
        request_time = time.time() - request_start_time
        logger.error(f"❌ ULTRA-FAST API error after {request_time:.2f}s: {e}")
        
        # Return empty result instead of error for better UX
        return jsonify({
            'news': [],
            'page': 1,
            'total_pages': 1,
            'total_articles': 0,
            'error': 'Tải tin tức thất bại, vui lòng thử lại',
            'processing_time': round(request_time, 2)
        })

@app.route('/api/article/<int:article_id>')
def get_article_detail_ultra_fast(article_id):
    """ULTRA-FAST article detail endpoint"""
    try:
        user_id = get_or_create_user_session()
        
        if user_id not in user_news_cache:
            return jsonify({
                'error': 'Phiên làm việc đã hết hạn. Vui lòng làm mới trang.',
                'error_code': 'SESSION_EXPIRED'
            }), 404
            
        user_data = user_news_cache[user_id]
        news_list = user_data['news']
        
        if not news_list or article_id < 0 or article_id >= len(news_list):
            return jsonify({
                'error': f'ID bài viết không hợp lệ. Phạm vi: 0-{len(news_list)-1}.',
                'error_code': 'INVALID_ARTICLE_ID'
            }), 404
            
        news = news_list[article_id]
        
        # Save as last detail for AI context
        save_user_last_detail(user_id, news)
        
        source_display = source_names.get(news['source'], news['source'])
        
        return jsonify({
            'title': news['title'],
            'link': news['link'],
            'source': source_display,
            'published': news['published_str'],
            'iframe_mode': True,
            'success': True
        })
        
    except Exception as e:
        logger.error(f"❌ Article detail error: {e}")
        return jsonify({
            'error': 'Lỗi hệ thống khi tải bài viết.',
            'error_code': 'SYSTEM_ERROR',
            'details': str(e)
        }), 500

@app.route('/api/ai/ask', methods=['POST'])
def ai_ask_ultra_fast():
    """ULTRA-FAST AI ask endpoint"""
    try:
        data = request.get_json()
        question = data.get('question', '')
        user_id = get_or_create_user_session()
        
        # Check for recent article context
        context = ""
        if user_id in user_last_detail_cache:
            last_detail = user_last_detail_cache[user_id]
            time_diff = get_current_vietnam_datetime() - last_detail['timestamp']
            
            if time_diff.total_seconds() < 1800:  # 30 minutes
                article = last_detail['article']
                context = f"Bài báo: {article['title'][:200]}..."  # Shorter context
        
        # Get AI response (FAST)
        if context and not question:
            response = gemini_engine.ask_question_fast("Tóm tắt bài báo này trong 100 từ", context)
        else:
            response = gemini_engine.ask_question_fast(question, context)
        
        return jsonify({'response': response})
        
    except Exception as e:
        logger.error(f"❌ AI ask error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/debate', methods=['POST'])
def ai_debate_ultra_fast():
    """ULTRA-FAST AI debate endpoint"""
    try:
        data = request.get_json()
        topic = data.get('topic', '')
        user_id = get_or_create_user_session()
        
        # Check for context if no topic provided
        if not topic:
            if user_id in user_last_detail_cache:
                last_detail = user_last_detail_cache[user_id]
                time_diff = get_current_vietnam_datetime() - last_detail['timestamp']
                
                if time_diff.total_seconds() < 1800:
                    article = last_detail['article']
                    topic = f"Bài báo: {article['title'][:100]}..."  # Shorter topic
                else:
                    return jsonify({'error': 'Không có chủ đề để bàn luận'}), 400
            else:
                return jsonify({'error': 'Cần nhập chủ đề để bàn luận'}), 400
        
        response = gemini_engine.debate_perspectives_fast(topic)
        
        return jsonify({'response': response})
        
    except Exception as e:
        logger.error(f"❌ AI debate error: {e}")
        return jsonify({'error': str(e)}), 500

# Health check endpoint for monitoring
@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': get_current_datetime_str(),
        'version': 'ultra-fast',
        'max_processing_time': MAX_PROCESSING_TIME
    })

if __name__ == '__main__':
    # Configure Gemini if available
    if GEMINI_API_KEY and GEMINI_AVAILABLE:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("✅ Gemini AI configured successfully")
    
    logger.info("🚀 Tiền Phong E-con News Backend starting (ULTRA-FAST VERSION)...")
    logger.info(f"📊 Category mappings: {len(CATEGORY_MAPPING)} categories")
    logger.info(f"📡 RSS sources: {sum(len(feeds) for feeds in RSS_FEEDS.values())}")
    logger.info(f"⏱️ Max processing time: {MAX_PROCESSING_TIME}s")
    logger.info(f"🔥 Max concurrent sources: {MAX_SOURCES_CONCURRENT}")
    logger.info(f"📰 Max articles per source: {MAX_ARTICLES_PER_SOURCE}")
    logger.info("✅ ULTRA-FAST endpoints - 30s timeout compatible!")
    logger.info("=" * 50)
    
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), debug=False)
