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
from concurrent.futures import ThreadPoolExecutor, as_completed
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

# User cache with enhanced management
user_news_cache = {}
user_last_detail_cache = {}
global_seen_articles = {}
MAX_CACHE_ENTRIES = 15  # Reduced for memory optimization
MAX_GLOBAL_CACHE = 300  # Reduced significantly
CACHE_EXPIRE_HOURS = 4  # Reduced cache time

# Enhanced User Agents for better compatibility
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

print("🚀 Tiền Phong E-con News Backend - FIXED SYNC VERSION:")
print(f"Gemini AI: {'✅' if GEMINI_API_KEY else '❌'}")
print(f"Content Extraction: {'✅' if TRAFILATURA_AVAILABLE else '❌'}")
print("=" * 50)

# OPTIMIZED RSS FEEDS - Reduced for better performance
RSS_FEEDS = {
    # === CAFEF RSS FEEDS (Primary Vietnamese Source) ===
    'cafef': {
        'cafef_stocks': 'https://cafef.vn/thi-truong-chung-khoan.rss',
        'cafef_business': 'https://cafef.vn/doanh-nghiep.rss',
        'cafef_finance': 'https://cafef.vn/tai-chinh-ngan-hang.rss'
    },
    
    # === INTERNATIONAL RSS FEEDS (Limited for performance) ===
    'international': {
        'yahoo_finance': 'https://finance.yahoo.com/news/rssindex',
        'marketwatch': 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
        'cnbc': 'https://www.cnbc.com/id/100003114/device/rss/rss.html'
    }
}

# OPTIMIZED CATEGORY MAPPING
CATEGORY_MAPPING = {
    'all': ['cafef', 'international'],
    'domestic': ['cafef'],
    'international': ['international'],
    'stocks': ['cafef_stocks'],
    'business': ['cafef_business'],
    'finance': ['cafef_finance', 'yahoo_finance'],
    'realestate': ['cafef_business'],
    'crypto': ['yahoo_finance'],
    'earnings': ['cafef_business'],
    'projects': ['cafef_business'],
    'macro': ['cafef_finance'],
    'world': ['international'],
    'hot': ['cafef_stocks', 'yahoo_finance'],
    'tech': ['cnbc']
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
    """Clean expired articles from global cache"""
    global global_seen_articles
    current_time = get_current_vietnam_datetime()
    expired_hashes = []
    
    for article_hash, article_data in global_seen_articles.items():
        time_diff = current_time - article_data['timestamp']
        if time_diff.total_seconds() > (CACHE_EXPIRE_HOURS * 3600):
            expired_hashes.append(article_hash)
    
    for expired_hash in expired_hashes:
        del global_seen_articles[expired_hash]
    
    if expired_hashes:
        logger.info(f"🧹 Cleaned {len(expired_hashes)} expired articles from cache")

def is_duplicate_article_local(news_item, existing_articles):
    """Check duplicate within current collection"""
    current_title = normalize_title(news_item['title'])
    current_link = news_item['link'].lower().strip()
    
    for existing in existing_articles:
        existing_title = normalize_title(existing['title'])
        existing_link = existing['link'].lower().strip()
        
        if current_title == existing_title or current_link == existing_link:
            return True
    
    return False

def is_duplicate_article_global(news_item, source_name):
    """Check duplicate against global cache"""
    global global_seen_articles
    
    try:
        clean_expired_cache()
        
        current_title = normalize_title(news_item['title'])
        current_link = news_item['link'].lower().strip()
        
        for existing_data in global_seen_articles.values():
            existing_title = normalize_title(existing_data['title'])
            existing_link = existing_data['link'].lower().strip()
            
            if current_title == existing_title or current_link == existing_link:
                return True
        
        cache_key = f"{current_title}|{current_link}"
        
        global_seen_articles[cache_key] = {
            'title': news_item['title'],
            'link': news_item['link'],
            'source': source_name,
            'timestamp': get_current_vietnam_datetime()
        }
        
        if len(global_seen_articles) > MAX_GLOBAL_CACHE:
            sorted_items = sorted(global_seen_articles.items(), key=lambda x: x[1]['timestamp'])
            for old_key, _ in sorted_items[:50]:
                del global_seen_articles[old_key]
        
        return False
        
    except Exception as e:
        logger.warning(f"⚠️ Global duplicate check error: {e}")
        return False

def get_enhanced_headers(url=None):
    """Enhanced headers for better compatibility"""
    user_agent = random.choice(USER_AGENTS)
    
    headers = {
        'User-Agent': user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'DNT': '1'
    }
    
    if url:
        if 'cafef.vn' in url.lower():
            headers.update({
                'Referer': 'https://cafef.vn/',
                'Origin': 'https://cafef.vn'
            })
        elif 'yahoo' in url.lower():
            headers.update({
                'Referer': 'https://finance.yahoo.com/',
                'Origin': 'https://finance.yahoo.com'
            })
    
    return headers

def is_international_source(source_name):
    """Check if source is international"""
    international_sources = [
        'yahoo_finance', 'marketwatch', 'cnbc', 'reuters', 'investing_com', 
        'bloomberg', 'financial_times', 'wsj_markets'
    ]
    return any(source in source_name for source in international_sources)

def fetch_rss_with_requests(rss_url, timeout=10):
    """Fetch RSS using requests with timeout"""
    try:
        headers = get_enhanced_headers(rss_url)
        response = requests.get(rss_url, headers=headers, timeout=timeout)
        
        if response.status_code == 200:
            return response.content
        else:
            logger.warning(f"❌ HTTP {response.status_code} for {rss_url}")
            return None
    except Exception as e:
        logger.warning(f"❌ Fetch error for {rss_url}: {e}")
        return None

def process_rss_feed_sync(source_name, rss_url, limit_per_source):
    """SYNC RSS feed processing - NO MORE ASYNC"""
    try:
        logger.info(f"🔄 Processing {source_name}: {rss_url}")
        
        # Fetch RSS content with timeout
        content = fetch_rss_with_requests(rss_url, timeout=8)
        
        if content:
            feed = feedparser.parse(content)
        else:
            feed = feedparser.parse(rss_url)
        
        if not feed or not hasattr(feed, 'entries') or len(feed.entries) == 0:
            logger.warning(f"❌ No entries found for {source_name}")
            return []
        
        news_items = []
        for entry in feed.entries[:limit_per_source]:
            try:
                vn_time = get_current_vietnam_datetime()
                
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    vn_time = convert_utc_to_vietnam_time(entry.published_parsed)
                elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                    vn_time = convert_utc_to_vietnam_time(entry.updated_parsed)
                
                description = ""
                if hasattr(entry, 'summary'):
                    description = entry.summary[:250] + "..." if len(entry.summary) > 250 else entry.summary
                elif hasattr(entry, 'description'):
                    description = entry.description[:250] + "..." if len(entry.description) > 250 else entry.description
                
                if hasattr(entry, 'title') and hasattr(entry, 'link'):
                    title = entry.title.strip()
                    
                    # Enhanced relevance filtering
                    if is_relevant_news(title, description, source_name):
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
        
        logger.info(f"✅ Processed {len(news_items)} articles from {source_name}")
        return news_items
        
    except Exception as e:
        logger.error(f"❌ RSS processing error for {source_name}: {e}")
        return []

def is_relevant_news(title, description, source_name):
    """Enhanced relevance filtering"""
    # CafeF sources are always relevant
    if 'cafef' in source_name:
        return True
    
    # For international sources, use enhanced keyword filtering
    financial_keywords = [
        # English keywords
        'stock', 'market', 'trading', 'investment', 'economy', 'economic',
        'bitcoin', 'crypto', 'currency', 'bank', 'financial', 'finance',
        'earnings', 'revenue', 'profit', 'inflation', 'fed', 'gdp',
        'business', 'company', 'corporate', 'industry', 'sector',
        'money', 'cash', 'capital', 'fund', 'price', 'cost', 'value',
        'growth', 'analyst', 'forecast', 'report', 'data', 'sales',
        # Vietnamese keywords
        'chứng khoán', 'tài chính', 'ngân hàng', 'kinh tế', 'đầu tư',
        'doanh nghiệp', 'thị trường', 'cổ phiếu', 'lợi nhuận'
    ]
    
    title_lower = title.lower()
    description_lower = description.lower() if description else ""
    combined_text = f"{title_lower} {description_lower}"
    
    # Check for keywords
    keyword_count = sum(1 for keyword in financial_keywords if keyword in combined_text)
    
    # More relaxed filtering - accept if at least one keyword or if it's business-related
    return keyword_count > 0 or any(word in combined_text for word in ['business', 'company', 'market', 'economic'])

def process_single_source_sync(source_name, source_url, limit_per_source):
    """Process a single RSS source synchronously"""
    try:
        if source_url.endswith('.rss') or 'rss' in source_url.lower() or 'feeds.' in source_url:
            return process_rss_feed_sync(source_name, source_url, limit_per_source)
        else:
            logger.warning(f"⚠️ Unsupported URL format for {source_name}")
            return []
            
    except Exception as e:
        logger.error(f"❌ Error processing {source_name}: {e}")
        return []

def collect_news_enhanced_sync(sources_dict, limit_per_source=8, use_global_dedup=True):
    """SYNC news collection with threading for better performance"""
    all_news = []
    
    logger.info(f"🔄 Starting SYNC collection from {len(sources_dict)} sources")
    
    if use_global_dedup:
        clean_expired_cache()
    
    # Use ThreadPoolExecutor for concurrent processing without async
    with ThreadPoolExecutor(max_workers=3) as executor:  # Limited workers for Render.com
        # Submit all tasks
        future_to_source = {
            executor.submit(process_single_source_sync, source_name, source_url, limit_per_source): source_name
            for source_name, source_url in sources_dict.items()
        }
        
        # Collect results with timeout
        total_processed = 0
        local_duplicates = 0
        global_duplicates = 0
        
        for future in as_completed(future_to_source, timeout=15):  # 15 second timeout
            source_name = future_to_source[future]
            try:
                result = future.result(timeout=5)  # 5 second per source timeout
                
                if result:
                    for news_item in result:
                        total_processed += 1
                        
                        # Local duplicate check
                        if is_duplicate_article_local(news_item, all_news):
                            local_duplicates += 1
                            continue
                        
                        # Global duplicate check
                        if use_global_dedup and is_duplicate_article_global(news_item, news_item['source']):
                            global_duplicates += 1
                            continue
                        
                        # Add unique article
                        all_news.append(news_item)
                        
            except Exception as e:
                logger.error(f"❌ Source {source_name} processing error: {e}")
                continue
    
    unique_count = len(all_news)
    logger.info(f"📊 Collection results: {total_processed} processed, {local_duplicates} local dups, {global_duplicates} global dups, {unique_count} unique")
    
    # Sort by publish time (newest first)
    all_news.sort(key=lambda x: x['published'], reverse=True)
    return all_news

def get_or_create_user_session():
    """Get or create user session ID"""
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return session['user_id']

def save_user_news_enhanced(user_id, news_list, command_type, current_page=1):
    """Enhanced user news saving with pagination info"""
    global user_news_cache
    
    user_news_cache[user_id] = {
        'news': news_list,
        'command': command_type,
        'current_page': current_page,
        'timestamp': get_current_vietnam_datetime()
    }
    
    # Clean up old cache entries
    if len(user_news_cache) > MAX_CACHE_ENTRIES:
        oldest_users = sorted(user_news_cache.items(), key=lambda x: x[1]['timestamp'])[:5]
        for user_id_to_remove, _ in oldest_users:
            del user_news_cache[user_id_to_remove]

def save_user_last_detail(user_id, news_item):
    """Save last article accessed for AI context"""
    global user_last_detail_cache
    
    user_last_detail_cache[user_id] = {
        'article': news_item,
        'timestamp': get_current_vietnam_datetime()
    }

# SYNC AI Engine - No more async
class GeminiAIEngine:
    def __init__(self):
        self.available = GEMINI_AVAILABLE and GEMINI_API_KEY
        if self.available:
            genai.configure(api_key=GEMINI_API_KEY)
    
    def ask_question(self, question: str, context: str = ""):
        """SYNC Gemini AI question answering"""
        if not self.available:
            return "⚠️ Gemini AI không khả dụng. Vui lòng kiểm tra cấu hình API."
        
        try:
            current_date_str = get_current_date_str()
            
            prompt = f"""Bạn là Gemini AI - chuyên gia tài chính chứng khoán thông minh. Hãy trả lời câu hỏi với kiến thức chuyên sâu.

CÂU HỎI: {question}

{f"BỐI CẢNH: {context}" if context else ""}

HƯỚNG DẪN TRẢ LỜI:
1. Sử dụng kiến thức tài chính chuyên môn sâu rộng
2. Đưa ra phân tích chi tiết và toàn diện
3. Kết nối với bối cảnh thị trường hiện tại (ngày {current_date_str})
4. Đưa ra ví dụ thực tế từ thị trường Việt Nam và quốc tế
5. Độ dài: 300-500 từ với cấu trúc rõ ràng
6. Sử dụng **Tiêu đề** để tổ chức nội dung
7. Tách dòng rõ ràng giữa các đoạn văn
8. Đưa ra kết luận và khuyến nghị cụ thể

Hãy thể hiện chuyên môn và kiến thức sâu rộng của Gemini AI:"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.2,
                top_p=0.8,
                max_output_tokens=1200,
            )
            
            response = model.generate_content(prompt, generation_config=generation_config)
            return response.text.strip()
            
        except Exception as e:
            return f"⚠️ Lỗi Gemini AI: {str(e)}"
    
    def debate_perspectives(self, topic: str):
        """SYNC multi-perspective debate system"""
        if not self.available:
            return "⚠️ Gemini AI không khả dụng cho chức năng bàn luận."
        
        try:
            prompt = f"""Tổ chức cuộc tranh luận chuyên sâu về: {topic}

YÊU CẦU ĐẶC BIỆT: Mỗi nhân vật phải có phần riêng biệt, dễ tách thành các tin nhắn riêng lẻ.

HỆ THỐNG 6 QUAN ĐIỂM (NHÂN VẬT GỐC):

🎓 **GS Đại học (Học thuật chính trực):**
[Phong cách: Học thuật nghiêm túc, dựa trên nghiên cứu và lý thuyết kinh tế]
[Trình bày quan điểm 80-120 từ, kết thúc với dấu chấm câu.]

💰 **Nhà kinh tế học (Tham nhũng tinh vi):**
[Phong cách: Phân tích sâu nhưng có xu hướng ủng hộ lợi ích nhóm]
[Trình bày quan điểm 80-120 từ, kết thúc với dấu chấm câu.]

🏢 **Nhân viên công sở (Ham tiền thực tế):**
[Phong cách: Thực tế, tập trung vào lợi ích cá nhân và thu nhập]
[Trình bày quan điểm 80-120 từ, kết thúc với dấu chấm câu.]

😟 **Người nghèo (Kiến thức hạn hẹp):**
[Phong cách: Đơn giản, lo lắng về cuộc sống hàng ngày]
[Trình bày quan điểm 80-120 từ, kết thúc với dấu chấm câu.]

💎 **Đại gia (Người giàu ích kỷ):**
[Phong cách: Tự tin, chỉ quan tâm đến lợi nhuận và thế lực]
[Trình bày quan điểm 80-120 từ, kết thúc với dấu chấm câu.]

🦈 **Shark (Người giàu thông thái):**
[Phong cách: Kinh nghiệm thực tế, tầm nhìn dài hạn, cân bằng]
[Trình bày quan điểm 80-120 từ, kết thúc với dấu chấm câu.]

QUAN TRỌNG: Mỗi nhân vật phải có phần riêng biệt, bắt đầu với emoji và tên, kết thúc rõ ràng."""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.4,
                top_p=0.9,
                max_output_tokens=1500,
            )
            
            response = model.generate_content(prompt, generation_config=generation_config)
            return response.text.strip()
            
        except Exception as e:
            return f"⚠️ Lỗi Gemini AI: {str(e)}"
    
    def analyze_article(self, article_content: str, question: str = ""):
        """SYNC article analysis"""
        if not self.available:
            return "⚠️ Gemini AI không khả dụng cho phân tích bài báo."
        
        try:
            analysis_question = question if question else "Hãy phân tích và tóm tắt bài báo này"
            
            # Optimize content length
            if len(article_content) > 3000:
                article_content = article_content[:3000] + "..."
            
            prompt = f"""Bạn là Gemini AI - chuyên gia phân tích tài chính hàng đầu. Hãy phân tích bài báo dựa trên NỘI DUNG ĐƯỢC CUNG CẤP.

**NỘI DUNG BÀI BÁO:**
{article_content}

**YÊU CẦU PHÂN TÍCH:**
{analysis_question}

**HƯỚNG DẪN PHÂN TÍCH CHUYÊN SÂU:**
1. Phân tích CHỦ YẾU dựa trên nội dung bài báo (90%)
2. Bổ sung kiến thức chuyên môn để giải thích sâu hơn (10%)
3. Sử dụng **Tiêu đề** để tổ chức nội dung
4. Tách dòng rõ ràng giữa các đoạn văn
5. Phân tích tác động, nguyên nhân, hậu quả chi tiết
6. Đưa ra nhận định và đánh giá chuyên môn
7. Trả lời câu hỏi trực tiếp với bằng chứng từ bài báo
8. Độ dài: 400-700 từ với cấu trúc rõ ràng
9. Tham chiếu các phần cụ thể trong bài báo
10. Đưa ra kết luận và khuyến nghị

**QUAN TRỌNG:** Tập trung hoàn toàn vào nội dung bài báo. Đưa ra phân tích CHUYÊN SÂU và CHI TIẾT:"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.2,
                top_p=0.8,
                max_output_tokens=1800,
            )
            
            response = model.generate_content(prompt, generation_config=generation_config)
            return response.text.strip()
            
        except Exception as e:
            return f"⚠️ Lỗi Gemini AI: {str(e)}"

# Initialize Gemini Engine
gemini_engine = GeminiAIEngine()

# FIXED source mapping for display
source_names = {
    # CafeF sources  
    'cafef_stocks': 'CafeF CK', 'cafef_business': 'CafeF DN',
    'cafef_realestate': 'CafeF BĐS', 'cafef_finance': 'CafeF TC',
    'cafef_macro': 'CafeF VM',
    
    # International sources
    'yahoo_finance': 'Yahoo Finance', 'marketwatch': 'MarketWatch',
    'cnbc': 'CNBC', 'reuters_business': 'Reuters', 
    'investing_com': 'Investing.com', 'bloomberg': 'Bloomberg',
    'financial_times': 'Financial Times', 'wsj_markets': 'WSJ Markets'
}

emoji_map = {
    # CafeF sources
    'cafef_stocks': '📊', 'cafef_business': '🏭', 'cafef_realestate': '🏘️',
    'cafef_finance': '💳', 'cafef_macro': '📉',
    
    # International sources
    'yahoo_finance': '💼', 'marketwatch': '📰', 'cnbc': '📺',
    'reuters_business': '🌏', 'investing_com': '💹', 'bloomberg': '📊',
    'financial_times': '📈', 'wsj_markets': '💹'
}

# Flask Routes - ALL SYNC NOW
@app.route('/')
def index():
    """Main page with traditional newspaper theme"""
    return render_template('index.html')

@app.route('/api/news/<news_type>')
def get_news_api(news_type):
    """SYNC API endpoint for getting news"""
    try:
        page = int(request.args.get('page', 1))
        user_id = get_or_create_user_session()
        
        logger.info(f"🔍 API request: /api/news/{news_type}?page={page}")
        
        # Map frontend categories to RSS feeds
        if news_type in CATEGORY_MAPPING:
            # Get RSS feed categories for this news type
            feed_categories = CATEGORY_MAPPING[news_type]
            
            # Collect RSS URLs
            all_sources = {}
            for category in feed_categories:
                if category == 'cafef':
                    all_sources.update(RSS_FEEDS['cafef'])
                elif category == 'international':
                    all_sources.update(RSS_FEEDS['international'])
                elif category in RSS_FEEDS['cafef']:
                    all_sources[category] = RSS_FEEDS['cafef'][category]
                elif category in RSS_FEEDS['international']:
                    all_sources[category] = RSS_FEEDS['international'][category]
            
            logger.info(f"📡 Collecting from {len(all_sources)} sources for {news_type}")
            all_news = collect_news_enhanced_sync(all_sources, 8)  # Reduced limit
            
        else:
            logger.error(f"❌ Invalid news type: {news_type}")
            return jsonify({'error': f'Invalid news type: {news_type}'}), 400
        
        items_per_page = 12
        start_index = (page - 1) * items_per_page
        end_index = start_index + items_per_page
        page_news = all_news[start_index:end_index]
        
        # Save to user cache
        save_user_news_enhanced(user_id, all_news, f"{news_type}_page_{page}")
        
        # Format news for frontend
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
                'description': news['description'][:200] + "..." if len(news['description']) > 200 else news['description']
            })
        
        total_pages = (len(all_news) + items_per_page - 1) // items_per_page
        
        logger.info(f"✅ API success: {len(formatted_news)} articles, page {page}/{total_pages}")
        
        return jsonify({
            'news': formatted_news,
            'page': page,
            'total_pages': total_pages,
            'total_articles': len(all_news)
        })
        
    except Exception as e:
        logger.error(f"❌ API error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/article/<int:article_id>')
def get_article_detail(article_id):
    """SYNC article detail endpoint"""
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
        
        # IFRAME MODE: Return article link for iframe display
        return jsonify({
            'title': news['title'],
            'link': news['link'],  # Frontend will use this for iframe
            'source': source_display,
            'published': news['published_str'],
            'iframe_mode': True,  # Flag to indicate iframe mode
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
def ai_ask():
    """SYNC AI ask endpoint"""
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
                context = f"BÀI BÁO HIỆN TẠI:\nTiêu đề: {article['title']}\nNguồn: {article['source']}\nMô tả: {article['description']}"
        
        # Get AI response (SYNC)
        if context and not question:
            # Auto-summarize if no question provided
            response = gemini_engine.ask_question("Hãy tóm tắt và phân tích bài báo hiện tại", context)
        else:
            response = gemini_engine.ask_question(question, context)
        
        return jsonify({'response': response})
        
    except Exception as e:
        logger.error(f"❌ AI ask error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/debate', methods=['POST'])
def ai_debate():
    """SYNC AI debate endpoint"""
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
                    topic = f"Bài báo: {article['title']}"
                else:
                    return jsonify({'error': 'Không có chủ đề để bàn luận'}), 400
            else:
                return jsonify({'error': 'Cần nhập chủ đề để bàn luận'}), 400
        
        response = gemini_engine.debate_perspectives(topic)
        
        return jsonify({'response': response})
        
    except Exception as e:
        logger.error(f"❌ AI debate error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Configure Gemini if available
    if GEMINI_API_KEY and GEMINI_AVAILABLE:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("✅ Gemini AI configured successfully")
    
    logger.info("🚀 Tiền Phong E-con News Backend starting (FIXED SYNC VERSION)...")
    logger.info(f"📊 Category mappings: {len(CATEGORY_MAPPING)} categories")
    logger.info(f"📡 RSS sources: {sum(len(feeds) for feeds in RSS_FEEDS.values())}")
    logger.info("✅ Fixed SYNC endpoints - NO MORE ASYNC ISSUES!")
    logger.info("=" * 50)
    
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), debug=False)
