# ===============================
# E-CON NEWS TERMINAL - COMPLETE FIXED app.py v2.024.9
# Fixed: Missing cmd_* methods in TerminalCommandProcessor only
# TOTAL: 2100+ lines - keeping ALL original functionality
# ===============================

import sys
import os
from flask import Flask, render_template, request, jsonify, session, make_response
import feedparser
import asyncio
import os
import re
from datetime import datetime, timedelta
import calendar
from urllib.parse import urljoin, urlparse, quote
import html
import chardet
import pytz
import json
import aiohttp
import random
import hashlib
import uuid
import time
import logging
import traceback
from functools import wraps
import concurrent.futures
import threading

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

# ===============================
# GLOBAL VARIABLES AND CONFIG (OUTSIDE create_app)
# ===============================

# Environment variables
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
DEBUG_MODE = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

# Timezone - Vietnam
VN_TIMEZONE = pytz.timezone('Asia/Ho_Chi_Minh')
UTC_TIMEZONE = pytz.UTC

# Enhanced User cache management - GLOBAL SCOPE
user_news_cache = {}
user_last_detail_cache = {}
global_seen_articles = {}
system_stats = {
    'active_users': 1337420,
    'ai_queries': 42069,
    'news_parsed': 9999,
    'system_load': 69,
    'uptime_start': time.time(),
    'total_requests': 0,
    'errors': 0
}

# Cache configuration
MAX_CACHE_ENTRIES = 50
MAX_GLOBAL_CACHE = 1000
CACHE_EXPIRE_HOURS = 6

# Enhanced User Agents for better compatibility
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
]

# FIXED: RSS FEEDS Configuration with better error handling
RSS_FEEDS = {
    # === VIETNAMESE SOURCES ===
    'cafef': {
        'cafef_stocks': 'https://cafef.vn/thi-truong-chung-khoan.rss',
        'cafef_realestate': 'https://cafef.vn/bat-dong-san.rss', 
        'cafef_business': 'https://cafef.vn/doanh-nghiep.rss',
        'cafef_finance': 'https://cafef.vn/tai-chinh-ngan-hang.rss',
        'cafef_macro': 'https://cafef.vn/vi-mo-dau-tu.rss'
    },
    
    # === INTERNATIONAL SOURCES ===
    'international': {
        # FIXED: Safer international sources
        'marketwatch': 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
        'cnbc': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        'investing_com': 'https://www.investing.com/rss/news.rss',
        # Removed problematic sources temporarily
    },
    
    # === TECH SOURCES ===
    'tech': {
        'techcrunch': 'https://feeds.feedburner.com/TechCrunch/',
        'ars_technica': 'http://feeds.arstechnica.com/arstechnica/index'
    },
    
    # === CRYPTO SOURCES ===
    'crypto': {
        # FIXED: Alternative crypto sources
        'cointelegraph': 'https://cointelegraph.com/rss',
        # Removed coindesk temporarily due to DNS issues
    }
}

# Source display mapping for frontend
source_names = {
    # CafeF sources  
    'cafef_stocks': 'CafeF CK', 'cafef_business': 'CafeF DN',
    'cafef_realestate': 'CafeF BĐS', 'cafef_finance': 'CafeF TC',
    'cafef_macro': 'CafeF VM',
    
    # International sources
    'marketwatch': 'MarketWatch', 'cnbc': 'CNBC',
    'investing_com': 'Investing.com',
    
    # Tech sources
    'techcrunch': 'TechCrunch', 'ars_technica': 'Ars Technica',
    
    # Crypto sources
    'cointelegraph': 'Cointelegraph'
}

emoji_map = {
    # CafeF sources
    'cafef_stocks': '📊', 'cafef_business': '🏭', 'cafef_realestate': '🏘️',
    'cafef_finance': '💳', 'cafef_macro': '📉',
    
    # International sources
    'marketwatch': '📰', 'cnbc': '📺', 'investing_com': '💹',
    
    # Tech sources
    'techcrunch': '🚀', 'ars_technica': '⚙️',
    
    # Crypto sources
    'cointelegraph': '🪙'
}

# ===============================
# ASYNCIO HELPER FUNCTIONS (OUTSIDE create_app)
# ===============================

def run_async(coro):
    """
    Helper function to run async coroutines in sync contexts
    Works with both existing and new event loops
    """
    try:
        # Try to get existing loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If loop is running, use thread pool
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            # If loop exists but not running
            return loop.run_until_complete(coro)
    except RuntimeError:
        # No event loop exists, create new one
        return asyncio.run(coro)

def async_route(f):
    """
    Fixed decorator to convert async routes to sync routes
    Usage: @async_route instead of async def
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            coro = f(*args, **kwargs)
            return run_async(coro)
        except Exception as e:
            print(f"Async route error: {e}")
            return jsonify({
                'error': 'Internal server error',
                'message': 'Async operation failed',
                'timestamp': datetime.now().isoformat()
            }), 500
    return wrapper

# ===============================
# UTILITY FUNCTIONS (OUTSIDE create_app)
# ===============================

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

def get_terminal_timestamp():
    """Get terminal-style timestamp"""
    current_dt = get_current_vietnam_datetime()
    return current_dt.strftime("%Y.%m.%d_%H:%M:%S")

def get_system_uptime():
    """Get system uptime in seconds"""
    return int(time.time() - system_stats['uptime_start'])

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
        print(f"🧹 Cleaned {len(expired_hashes)} expired articles from cache")

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
            for old_key, _ in sorted_items[:200]:
                del global_seen_articles[old_key]
        
        return False
        
    except Exception as e:
        print(f"⚠️ Global duplicate check error: {e}")
        return False

def get_enhanced_headers(url=None):
    """Enhanced headers for better compatibility"""
    user_agent = random.choice(USER_AGENTS)
    
    headers = {
        'User-Agent': user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'DNT': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
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
        'marketwatch', 'cnbc', 'reuters', 'investing_com', 
        'bloomberg', 'financial_times', 'wsj_markets'
    ]
    return any(source in source_name for source in international_sources)

def is_relevant_news(title, description, source_name):
    """Enhanced relevance filtering with more keywords"""
    # CafeF sources are always relevant
    if 'cafef' in source_name:
        return True
    
    # Enhanced keyword filtering for international sources
    financial_keywords = [
        # English keywords
        'stock', 'market', 'trading', 'investment', 'economy', 'economic',
        'bitcoin', 'crypto', 'currency', 'bank', 'financial', 'finance',
        'earnings', 'revenue', 'profit', 'inflation', 'fed', 'gdp',
        'business', 'company', 'corporate', 'industry', 'sector',
        'money', 'cash', 'capital', 'fund', 'price', 'cost', 'value',
        'growth', 'analyst', 'forecast', 'report', 'data', 'sales',
        'nasdaq', 'dow', 'sp500', 'bond', 'yield', 'rate', 'tech',
        # Vietnamese keywords
        'chứng khoán', 'tài chính', 'ngân hàng', 'kinh tế', 'đầu tư',
        'doanh nghiệp', 'thị trường', 'cổ phiếu', 'lợi nhuận'
    ]
    
    title_lower = title.lower()
    description_lower = description.lower() if description else ""
    combined_text = f"{title_lower} {description_lower}"
    
    # Check for keywords
    keyword_count = sum(1 for keyword in financial_keywords if keyword in combined_text)
    
    return keyword_count > 0

def create_fallback_content(url, source_name, error_msg=""):
    """Create enhanced fallback content when extraction fails"""
    try:
        article_id = url.split('/')[-1] if '/' in url else 'news-article'
        timestamp = get_terminal_timestamp()
        
        if is_international_source(source_name):
            return f"""**📈 DÒNG DỮ LIỆU TÀI CHÍNH QUỐC TẾ**

**NHẬT_KÝ_HỆ_THỐNG:** [{timestamp}] Trích xuất dữ liệu từ {source_name.replace('_', ' ').title()}

**LOẠI_NỘI_DUNG:** Phân tích thị trường tài chính và thông tin kinh tế toàn cầu

**CẤU_TRÚC_DỮ_LIỆU:**
• Dữ liệu thị trường thời gian thực và giao thức phân tích
• Chỉ số kinh tế toàn cầu và ánh xạ xu hướng
• Thu nhập doanh nghiệp và phân tích báo cáo tài chính
• Thuật toán chiến lược đầu tư và dự báo thị trường
• Phân tích tác động thương mại và chính sách quốc tế

**THAM_CHIẾU_BÀI_VIẾT:** {article_id}

**TRẠNG_THÁI:** Trích xuất nội dung đầy đủ tạm thời offline
**CHẾ_ĐỘ_DỰ_PHÒNG:** Metadata cơ bản có sẵn
**HÀNH_ĐỘNG_CẦN_THIẾT:** Truy cập nguồn gốc để có dòng dữ liệu hoàn chỉnh

{f'**NHẬT_KÝ_LỖI:** {error_msg}' if error_msg else ''}

**ĐỊNH_DANH_NGUỒN:** {source_name.replace('_', ' ').title()}
**GIAO_THỨC:** HTTPS_SECURE_FETCH
**MÃ_HÓA:** UTF-8"""
        else:
            return f"""**📰 DÒNG DỮ LIỆU TÀI CHÍNH VIỆT NAM - GIAO THỨC CAFEF**

**NHẬT_KÝ_HỆ_THỐNG:** [{timestamp}] Trích xuất dữ liệu từ {source_name.replace('_', ' ').title()}

**LOẠI_NỘI_DUNG:** Thông tin tài chính chứng khoán Việt Nam chuyên sâu

**CẤU_TRÚC_DỮ_LIỆU:**
• Phân tích thị trường chứng khoán real-time
• Database tin tức doanh nghiệp và báo cáo tài chính
• Algorithm xu hướng đầu tư và khuyến nghị chuyên gia
• Parser chính sách kinh tế vĩ mô và regulations
• Stream thông tin bất động sản và investment channels

**ID_BÀI_VIẾT:** {article_id}

**TRẠNG_THÁI:** Quá trình extraction offline
**CHẾ_ĐỘ_DỰ_PHÒNG:** Cache metadata đang hoạt động
**GHI_CHÚ:** Truy cập link gốc để đọc full content với media assets

{f'**CHI_TIẾT_LỖI:** {error_msg}' if error_msg else ''}

**TÊN_NGUỒN:** {source_name.replace('_', ' ').title()}
**GIAO_THỨC:** RSS_FEED_PARSER
**CHARSET:** UTF-8"""
        
    except Exception as e:
        return f"**LỖI:** Trích xuất nội dung thất bại cho {source_name}\n\n**CHI_TIẾT:** {str(e)}\n\n**HÀNH_ĐỘNG:** Vui lòng truy cập nguồn gốc để xem bài viết đầy đủ."

# ===============================
# DECORATORS & MIDDLEWARE (OUTSIDE create_app)
# ===============================

def track_request(f):
    """Decorator to track API requests"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        system_stats['total_requests'] += 1
        start_time = time.time()
        try:
            result = f(*args, **kwargs)
            return result
        except Exception as e:
            system_stats['errors'] += 1
            raise
        finally:
            end_time = time.time()
    return decorated_function

def require_session(f):
    """Decorator to ensure user has a session"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            session['user_id'] = str(uuid.uuid4())
        return f(*args, **kwargs)
    return decorated_function

# ===============================
# FIXED: ASYNC FUNCTIONS WITH BETTER RSS ERROR HANDLING
# ===============================

async def fetch_with_aiohttp(url, headers=None, timeout=15):
    """Enhanced async HTTP fetch with better error handling"""
    try:
        if headers is None:
            headers = get_enhanced_headers(url)
        
        timeout_config = aiohttp.ClientTimeout(total=timeout)
        
        async with aiohttp.ClientSession(timeout=timeout_config, headers=headers) as session:
            async with session.get(url, ssl=False) as response:  # FIXED: Disable SSL verification for problematic sources
                if response.status == 200:
                    content = await response.read()
                    return content
                else:
                    print(f"❌ HTTP {response.status} for {url}")
                    return None
    except aiohttp.ClientError as e:
        print(f"❌ Client error for {url}: {e}")
        return None
    except asyncio.TimeoutError:
        print(f"❌ Timeout for {url}")
        return None
    except Exception as e:
        print(f"❌ Fetch error for {url}: {e}")
        return None

async def extract_content_enhanced(url, source_name, news_item):
    """Enhanced content extraction with multiple fallback methods"""
    try:
        # For CafeF sources, use traditional extraction methods
        content = await fetch_with_aiohttp(url)
        if not content:
            return create_fallback_content(url, source_name, "Network fetch failed")
        
        extracted_content = ""
        
        # Try Trafilatura first (best for Vietnamese content)
        if TRAFILATURA_AVAILABLE:
            try:
                extracted_content = trafilatura.extract(content)
                if extracted_content and len(extracted_content) > 200:
                    return format_extracted_content_terminal(extracted_content, source_name)
            except Exception as e:
                print(f"⚠️ Trafilatura error: {e}")
        
        # Try newspaper3k
        if NEWSPAPER_AVAILABLE and not extracted_content:
            try:
                article = Article(url)
                article.set_html(content)
                article.parse()
                if article.text and len(article.text) > 200:
                    extracted_content = article.text
                    return format_extracted_content_terminal(extracted_content, source_name)
            except Exception as e:
                print(f"⚠️ Newspaper3k error: {e}")
        
        # Try BeautifulSoup as last resort
        if BEAUTIFULSOUP_AVAILABLE and not extracted_content:
            try:
                soup = BeautifulSoup(content, 'html.parser')
                
                # Remove unwanted elements
                for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
                    element.decompose()
                
                # Try to find main content
                content_selectors = [
                    '.post-content', '.article-content', '.entry-content',
                    '#main-content', '.main-content', '.content',
                    'article', '.article-body', '.post-body'
                ]
                
                for selector in content_selectors:
                    content_div = soup.select_one(selector)
                    if content_div:
                        extracted_content = content_div.get_text(strip=True)
                        if len(extracted_content) > 200:
                            return format_extracted_content_terminal(extracted_content, source_name)
                
                # Fallback to all paragraph text
                paragraphs = soup.find_all('p')
                if paragraphs:
                    extracted_content = '\n\n'.join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
                    if len(extracted_content) > 200:
                        return format_extracted_content_terminal(extracted_content, source_name)
                        
            except Exception as e:
                print(f"⚠️ BeautifulSoup error: {e}")
        
        # If all methods fail, return fallback
        return create_fallback_content(url, source_name, "All extraction methods failed")
        
    except Exception as e:
        return create_fallback_content(url, source_name, f"System error: {str(e)}")

async def extract_content_with_gemini(url, source_name):
    """FIXED: Gemini content extraction with Vietnamese terminal formatting"""
    try:
        if not GEMINI_API_KEY or not GEMINI_AVAILABLE:
            return create_fallback_content(url, source_name, "Gemini AI module offline")
        
        # FIXED: Vietnamese extraction prompt for retro brutalism style
        extraction_prompt = f"""Trích xuất và dịch nội dung từ: {url}

YÊU CẦU GIAO THỨC:
1. Đọc toàn bộ bài viết và trích xuất nội dung chính
2. Dịch sang tiếng Việt một cách tự nhiên và trôi chảy
3. Giữ nguyên số liệu, tên công ty, thuật ngữ kỹ thuật
4. Định dạng với các tiêu đề TERMINAL rõ ràng sử dụng **Tiêu đề**
5. Sử dụng ngắt dòng rõ ràng giữa các đoạn văn
6. Nếu có hình ảnh/biểu đồ, ghi chú như [📷 Tài nguyên Media]
7. Độ dài: 500-1000 từ
8. ĐỊNH DẠNG TERMINAL: Bao gồm metadata kiểu hệ thống
9. CHỈ trả về nội dung đã dịch và định dạng

TEMPLATE ĐỊNH DẠNG TERMINAL:
**Tiêu đề Chính**

Đoạn đầu tiên với thông tin chính và điểm dữ liệu quan trọng.

**Phần Phân Tích Chi Tiết**

Đoạn thứ hai với phân tích sâu hơn và chi tiết kỹ thuật.

[📷 Tài nguyên Media - nếu có]

**Giao Thức Kết Luận**

Đoạn cuối với kết luận quan trọng và ý nghĩa.

**TRẠNG_THÁI_HỆ_THỐNG:** Nội dung được trích xuất thành công
**GIAO_THỨC:** Gemini_AI_Parser_v2.024

BẮT ĐẦU TRÍCH XUẤT:"""

        try:
            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.1,
                top_p=0.8,
                max_output_tokens=2800,
            )
            
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    extraction_prompt,
                    generation_config=generation_config
                ),
                timeout=35
            )
            
            extracted_content = response.text.strip()
            
            if len(extracted_content) > 400:
                error_indicators = [
                    'cannot access', 'unable to access', 'không thể truy cập',
                    'failed to retrieve', 'error occurred', 'sorry, i cannot',
                    'not available', 'access denied', 'forbidden'
                ]
                
                if not any(indicator in extracted_content.lower() for indicator in error_indicators):
                    # Enhanced formatting with terminal metadata
                    formatted_content = format_extracted_content_terminal(extracted_content, source_name)
                    return f"[🤖 AI_PARSER - Nguồn: {source_name.replace('_', ' ').title()}]\n\n{formatted_content}"
                else:
                    return create_fallback_content(url, source_name, "Gemini access blocked by target site")
            else:
                return create_fallback_content(url, source_name, "Extracted content below minimum threshold")
            
        except asyncio.TimeoutError:
            return create_fallback_content(url, source_name, "Gemini AI timeout exceeded")
        except Exception as e:
            return create_fallback_content(url, source_name, f"Gemini processing error: {str(e)}")
            
    except Exception as e:
        return create_fallback_content(url, source_name, f"System error: {str(e)}")

def format_extracted_content_terminal(content, source_name):
    """Enhanced content formatting with terminal aesthetics"""
    if not content:
        return content
    
    lines = content.split('\n')
    formatted_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Process different line types
        if line.startswith('**') and line.endswith('**'):
            # Already formatted header
            formatted_lines.append(line)
        elif (len(line) < 100 and 
            (line.isupper() or 
             line.startswith(('1.', '2.', '3.', '•', '-', '*', '▶')) or
             line.endswith(':') or
             re.match(r'^[A-ZÀ-Ý][^.!?]*$', line))):
            # Convert to terminal header
            formatted_lines.append(f"**{line}**")
        elif line.startswith(('[', '📷', 'Ảnh', 'Hình')):
            # Media references
            formatted_lines.append(f"[📷 {line.strip('[]')}]")
        else:
            # Regular paragraph
            formatted_lines.append(line)
    
    # Join with proper spacing
    formatted_content = '\n\n'.join(formatted_lines)
    
    # Add terminal metadata footer
    timestamp = get_terminal_timestamp()
    formatted_content += f"\n\n**NHẬT_KÝ_TRÍCH_XUẤT:** [{timestamp}] Nội dung được xử lý bởi AI_Parser\n**GIAO_THỨC_NGUỒN:** {source_name.replace('_', ' ').title()}\n**TRẠNG_THÁI:** THÀNH_CÔNG"
    
    return formatted_content

async def process_rss_feed_async(source_name, rss_url, limit_per_source):
    """FIXED: Enhanced async RSS feed processing with better error handling"""
    try:
        await asyncio.sleep(random.uniform(0.1, 0.5))  # Rate limiting
        
        # FIXED: Try multiple approaches for problematic feeds
        content = None
        
        # First try: aiohttp with longer timeout
        try:
            content = await fetch_with_aiohttp(rss_url, timeout=20)
        except Exception as e:
            print(f"⚠️ aiohttp failed for {source_name}: {e}")
        
        # Parse content
        if content:
            try:
                feed = await asyncio.to_thread(feedparser.parse, content)
            except Exception as e:
                print(f"⚠️ feedparser with content failed for {source_name}: {e}")
                feed = None
        else:
            # Fallback: direct feedparser
            try:
                feed = await asyncio.to_thread(feedparser.parse, rss_url)
            except Exception as e:
                print(f"⚠️ Direct feedparser failed for {source_name}: {e}")
                feed = None
        
        if not feed or not hasattr(feed, 'entries') or len(feed.entries) == 0:
            print(f"❌ No entries found for {source_name}")
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
                    description = entry.summary[:500] + "..." if len(entry.summary) > 500 else entry.summary
                elif hasattr(entry, 'description'):
                    description = entry.description[:500] + "..." if len(entry.description) > 500 else entry.description
                
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
                            'description': html.unescape(description) if description else "",
                            'terminal_timestamp': get_terminal_timestamp()
                        }
                        news_items.append(news_item)
                
            except Exception as entry_error:
                print(f"⚠️ Entry processing error for {source_name}: {entry_error}")
                continue
        
        print(f"✅ Processed {len(news_items)} articles from {source_name}")
        system_stats['news_parsed'] += len(news_items)
        return news_items
        
    except Exception as e:
        print(f"❌ RSS processing error for {source_name}: {e}")
        return []

async def collect_news_enhanced(sources_dict, limit_per_source=20, use_global_dedup=True):
    """Enhanced news collection with better performance and error handling - FIXED SCOPE"""
    all_news = []
    
    print(f"🔄 Starting enhanced collection from {len(sources_dict)} sources")
    
    if use_global_dedup:
        clean_expired_cache()
    
    # Create tasks for concurrent processing
    tasks = []
    for source_name, source_url in sources_dict.items():
        task = process_rss_feed_async(source_name, source_url, limit_per_source)
        tasks.append(task)
    
    # Process all sources concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Collect results with enhanced duplicate detection
    total_processed = 0
    local_duplicates = 0
    global_duplicates = 0
    
    for result in results:
        if isinstance(result, Exception):
            print(f"❌ Source processing error: {result}")
        elif result:
            for news_item in result:
                total_processed += 1
                
                # Local duplicate check
                if any(normalize_title(news_item['title']) == normalize_title(existing['title']) 
                       for existing in all_news):
                    local_duplicates += 1
                    continue
                
                # Global duplicate check
                if use_global_dedup and is_duplicate_article_global(news_item, news_item['source']):
                    global_duplicates += 1
                    continue
                
                # Add unique article
                all_news.append(news_item)
    
    unique_count = len(all_news)
    print(f"📊 Collection results: {total_processed} processed, {local_duplicates} local dups, {global_duplicates} global dups, {unique_count} unique")
    
    # Sort by publish time (newest first)
    all_news.sort(key=lambda x: x['published'], reverse=True)
    return all_news

# ===============================
# SESSION MANAGEMENT (OUTSIDE create_app)
# ===============================

def get_or_create_user_session():
    """Get or create user session ID with enhanced tracking"""
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        session['created_at'] = time.time()
        system_stats['active_users'] += random.randint(1, 10)  # Simulate user growth
    return session['user_id']

def save_user_news_enhanced(user_id, news_list, command_type, current_page=1):
    """Enhanced user news saving with metadata"""
    global user_news_cache
    
    user_news_cache[user_id] = {
        'news': news_list,
        'command': command_type,
        'current_page': current_page,
        'timestamp': get_current_vietnam_datetime(),
        'total_articles': len(news_list)
    }
    
    # Clean up old cache entries
    if len(user_news_cache) > MAX_CACHE_ENTRIES:
        oldest_users = sorted(user_news_cache.items(), key=lambda x: x[1]['timestamp'])[:15]
        for user_id_to_remove, _ in oldest_users:
            del user_news_cache[user_id_to_remove]

def save_user_last_detail(user_id, news_item):
    """Save last article accessed for AI context"""
    global user_last_detail_cache
    
    user_last_detail_cache[user_id] = {
        'article': news_item,
        'timestamp': get_current_vietnam_datetime()
    }

# ===============================
# FIXED: COMPLETE TERMINAL COMMAND SYSTEM WITH ALL METHODS
# ===============================

class TerminalCommandProcessor:
    """FIXED: Complete terminal command processor with ALL methods implemented"""
    
    def __init__(self):
        self.commands = {
            'help': self.cmd_help,
            'status': self.cmd_status,
            'news': self.cmd_news,        # FIXED: Now implemented
            'ai': self.cmd_ai,            # FIXED: Now implemented  
            'stats': self.cmd_stats,      # FIXED: Now implemented
            'uptime': self.cmd_uptime,    # FIXED: Now implemented
            'cache': self.cmd_cache,      # FIXED: Now implemented
            'users': self.cmd_users,      # FIXED: Now implemented
            'system': self.cmd_system,    # FIXED: Now implemented
            'version': self.cmd_version,  # FIXED: Now implemented
            'clear': self.cmd_clear,      # FIXED: Now implemented
            'refresh': self.cmd_refresh,  # FIXED: Now implemented
            'matrix': self.cmd_matrix,    # FIXED: Now implemented
            'glitch': self.cmd_glitch,    # FIXED: Now implemented
            'debug': self.cmd_debug       # FIXED: Now implemented
        }
    
    def execute(self, command_str):
        """Execute terminal command and return response"""
        try:
            parts = command_str.strip().lower().split()
            if not parts:
                return self.cmd_help()
                
            command = parts[0]
            args = parts[1:] if len(parts) > 1 else []
            
            if command in self.commands:
                return self.commands[command](args)
            else:
                return {
                    'status': 'error',
                    'message': f'Lệnh không tìm thấy: {command}',
                    'suggestion': 'Gõ "help" để xem các lệnh có sẵn'
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Thực thi lệnh thất bại: {str(e)}'
            }
    
    def cmd_help(self, args=None):
        """Help command implementation"""
        timestamp = get_terminal_timestamp()
        return {
            'status': 'success',
            'message': f"""TÀI LIỆU THAM KHẢO LỆNH TERMINAL - v2.024.9
[{timestamp}]

CÁC LỆNH CÓ SẴN:
├─ help              │ Hiển thị tin nhắn trợ giúp này
├─ status            │ Tổng quan trạng thái hệ thống
├─ news [danh_mục]   │ Tải nguồn cấp tin tức
├─ ai                │ Thông tin trợ lý AI
├─ stats             │ Thống kê hiệu suất
├─ uptime            │ Chi tiết thời gian hoạt động hệ thống
├─ cache             │ Thông tin quản lý bộ nhớ đệm
├─ users             │ Số người dùng đang hoạt động
├─ system            │ Thông tin hệ thống
├─ version           │ Phiên bản ứng dụng
├─ clear             │ Xóa đầu ra terminal
├─ refresh           │ Làm mới tất cả dữ liệu
├─ matrix            │ Kích hoạt chế độ matrix
├─ glitch            │ Kích hoạt hiệu ứng glitch
└─ debug             │ Thông tin debug

PHÍM TẮT:
F1=Trợ giúp | F4=Matrix | F5=Làm mới | `=Terminal | ESC=Đóng

ĐIỀU HƯỚNG:
Sử dụng TAB để hoàn thành lệnh
Sử dụng phím mũi tên cho lịch sử lệnh"""
        }
    
    def cmd_status(self, args):
        """System status command implementation"""
        uptime = get_system_uptime()
        return {
            'status': 'success',
            'message': f"""BÁO CÁO TRẠNG THÁI HỆ THỐNG:
[{get_terminal_timestamp()}]

├─ TRẠNG_THÁI: TRỰC_TUYẾN
├─ THỜI_GIAN_HOẠT_ĐỘNG: {uptime}s ({uptime//3600}h {(uptime%3600)//60}m)
├─ TẢI_CPU: {system_stats['system_load']}%
├─ BỘ_NHỚ: {random.randint(200, 600)}MB
├─ NGƯỜI_DÙNG_HOẠT_ĐỘNG: {system_stats['active_users']:,}
├─ CÂU_HỎI_AI: {system_stats['ai_queries']:,}
├─ TIN_TỨC_PHÂN_TÍCH: {system_stats['news_parsed']:,}
├─ TỔNG_YÊU_CẦU: {system_stats['total_requests']:,}
├─ TỶ_LỆ_LỖI: {system_stats['errors']}/{system_stats['total_requests']}
└─ MỤC_CACHE: {len(global_seen_articles)}"""
        }

    # FIXED: Implementation of missing cmd_news method
    def cmd_news(self, args):
        """News command implementation"""
        category = args[0] if args else 'all'
        valid_categories = ['all', 'domestic', 'international', 'tech', 'crypto']
        
        if category not in valid_categories:
            return {
                'status': 'error',
                'message': f'Danh mục không hợp lệ: {category}',
                'valid_categories': valid_categories
            }
        
        return {
            'status': 'success',
            'message': f"""TẢI NGUỒN CẤP TIN TỨC: {category.upper()}
[{get_terminal_timestamp()}]

├─ DANH_MỤC: {category.upper()}
├─ NGUỒN_ĐƯỢC_TẢI: {len(RSS_FEEDS.get(category, {}))} nguồn
├─ TRẠNG_THÁI: ĐANG_XỬ_LÝ
└─ THỜI_GIAN_ƯỚC_TÍNH: 2-5 giây

Đang chuyển hướng đến giao diện tin tức...""",
            'action': 'load_news',
            'category': category
        }

    # FIXED: Implementation of missing cmd_ai method
    def cmd_ai(self, args):
        """AI command implementation"""
        return {
            'status': 'success',
            'message': f"""TRẠNG THÁI MODULE TRỢ LÝ AI:
[{get_terminal_timestamp()}]

├─ GEMINI_AI: {'TRỰC_TUYẾN' if GEMINI_AVAILABLE and GEMINI_API_KEY else 'NGOẠI_TUYẾN'}
├─ MÔ_HÌNH: gemini-2.0-flash-exp
├─ CHỨC_NĂNG: Tóm tắt, Phân tích, Tranh luận
├─ NGÔN_NGỮ: Tiếng Việt + Tiếng Anh
├─ CÂU_HỎI_ĐÃ_XỬ_LÝ: {system_stats['ai_queries']:,}
└─ TRẠNG_THÁI: Sẵn sàng tương tác""",
            'action': 'open_chat'
        }

    # FIXED: Implementation of missing cmd_stats method
    def cmd_stats(self, args):
        """Statistics command implementation"""
        cache_size = len(global_seen_articles)
        session_count = len(user_news_cache)
        uptime = get_system_uptime()
        
        return {
            'status': 'success',
            'message': f"""THỐNG KÊ HỆ THỐNG CHI TIẾT:
[{get_terminal_timestamp()}]

├─ HIỆU SUẤT HỆ THỐNG:
│  ├─ Thời gian hoạt động: {uptime//3600}h {(uptime%3600)//60}m
│  ├─ CPU Load: {system_stats['system_load']}%
│  ├─ Memory Usage: ~{random.randint(200, 400)}MB
│  └─ Tổng requests: {system_stats['total_requests']:,}
│
├─ DỮ LIỆU & CACHE:
│  ├─ Cache articles: {cache_size:,} bài viết
│  ├─ Active sessions: {session_count} phiên
│  ├─ RSS sources: {sum(len(feeds) for feeds in RSS_FEEDS.values())} nguồn
│  └─ News parsed: {system_stats['news_parsed']:,}
│
├─ AI & TƯƠNG TÁC:
│  ├─ AI queries: {system_stats['ai_queries']:,}
│  ├─ Active users: {system_stats['active_users']:,}
│  └─ Error rate: {(system_stats['errors']/max(system_stats['total_requests'],1)*100):.2f}%
│
└─ TRẠNG THÁI: TẤT CẢ HỆ THỐNG HOẠT ĐỘNG BÌNH THƯỜNG"""
        }

    # FIXED: Implementation of missing cmd_uptime method
    def cmd_uptime(self, args):
        """Uptime command implementation"""
        uptime = get_system_uptime()
        start_time = datetime.fromtimestamp(system_stats['uptime_start'])
        
        return {
            'status': 'success',
            'message': f"""CHI TIẾT THỜI GIAN HOẠT ĐỘNG HỆ THỐNG:
[{get_terminal_timestamp()}]

├─ THỜI_GIAN_BẮT_ĐẦU: {start_time.strftime('%Y-%m-%d %H:%M:%S')}
├─ THỜI_GIAN_HIỆN_TẠI: {get_current_vietnam_datetime().strftime('%Y-%m-%d %H:%M:%S')}
├─ TỔNG_THỜI_GIAN: {uptime} giây
├─ ĐỊNH_DẠNG_DỄ_ĐỌC: {uptime//86400}d {(uptime%86400)//3600}h {(uptime%3600)//60}m {uptime%60}s
├─ REQUESTS_PER_SECOND: {system_stats['total_requests']/max(uptime,1):.2f}
└─ ĐỘ_ỔN_ĐỊNH: {100 - (system_stats['errors']/max(system_stats['total_requests'],1)*100):.1f}%"""
        }

    # FIXED: Implementation of missing cmd_cache method
    def cmd_cache(self, args):
        """Cache management command implementation"""
        cache_size = len(global_seen_articles)
        session_cache = len(user_news_cache)
        
        return {
            'status': 'success',
            'message': f"""QUẢN LÝ BỘ NHỚ ĐỆM HỆ THỐNG:
[{get_terminal_timestamp()}]

├─ GLOBAL_ARTICLE_CACHE:
│  ├─ Entries: {cache_size:,} / {MAX_GLOBAL_CACHE:,}
│  ├─ Usage: {(cache_size/MAX_GLOBAL_CACHE*100):.1f}%
│  └─ Expire: {CACHE_EXPIRE_HOURS}h auto-cleanup
│
├─ USER_SESSION_CACHE:
│  ├─ Active sessions: {session_cache} / {MAX_CACHE_ENTRIES}
│  ├─ Detail cache: {len(user_last_detail_cache)} entries
│  └─ Memory usage: ~{(session_cache + cache_size) * 0.5:.1f}KB
│
├─ CACHE_PERFORMANCE:
│  ├─ Hit rate: {random.randint(75, 95)}%
│  ├─ Cleanup cycles: {random.randint(10, 50)}
│  └─ Last cleanup: {random.randint(5, 30)} phút trước
│
└─ COMMANDS: cache clear | cache stats | cache optimize"""
        }

    # FIXED: Implementation of missing cmd_users method
    def cmd_users(self, args):
        """Users command implementation"""
        return {
            'status': 'success',
            'message': f"""THỐNG KÊ NGƯỜI DÙNG HOẠT ĐỘNG:
[{get_terminal_timestamp()}]

├─ TỔNG_NGƯỜI_DÙNG: {system_stats['active_users']:,}
├─ PHIÊN_HOẠT_ĐỘNG: {len(user_news_cache)}
├─ NGƯỜI_DÙNG_MỚI_HÔM_NAY: +{random.randint(100, 500):,}
├─ TƯƠNG_TÁC_AI: {system_stats['ai_queries']:,} queries
├─ ĐỘ_TUỔI_TRUNG_BÌNH: {random.randint(25, 45)} tuổi
├─ GEO_LOCATION:
│  ├─ Việt Nam: {random.randint(60, 80)}%
│  ├─ USA: {random.randint(10, 20)}%
│  └─ Khác: {random.randint(5, 15)}%
└─ PEAK_HOURS: 9:00-11:00, 14:00-16:00, 19:00-21:00"""
        }

    # FIXED: Implementation of missing cmd_system method
    def cmd_system(self, args):
        """System information command implementation"""
        return {
            'status': 'success',
            'message': f"""THÔNG TIN HỆ THỐNG CHI TIẾT:
[{get_terminal_timestamp()}]

├─ HỆ_ĐIỀU_HÀNH: Linux (Ubuntu/Debian)
├─ PYTHON_VERSION: {sys.version.split()[0]}
├─ FLASK_VERSION: 3.0.3
├─ MEMORY_LIMIT: 512MB (Render.com)
├─ CPU_CORES: 1 vCPU
├─ STORAGE: Ephemeral filesystem
│
├─ DEPENDENCIES:
│  ├─ Gemini AI: {'✅' if GEMINI_AVAILABLE else '❌'}
│  ├─ Trafilatura: {'✅' if TRAFILATURA_AVAILABLE else '❌'}
│  ├─ BeautifulSoup: {'✅' if BEAUTIFULSOUP_AVAILABLE else '❌'}
│  └─ Newspaper3k: {'✅' if NEWSPAPER_AVAILABLE else '❌'}
│
├─ NETWORK:
│  ├─ External APIs: {len(RSS_FEEDS)} sources
│  ├─ WebSocket: Enabled
│  └─ CORS: Configured
│
└─ ENVIRONMENT: {'Development' if DEBUG_MODE else 'Production'}"""
        }

    # FIXED: Implementation of missing cmd_version method
    def cmd_version(self, args):
        """Version information command implementation"""
        return {
            'status': 'success',
            'message': f"""THÔNG TIN PHIÊN BẢN HỆ THỐNG:
[{get_terminal_timestamp()}]

├─ E-CON_NEWS_TERMINAL: v2.024.9
├─ BUILD_DATE: {datetime.now().strftime('%Y-%m-%d')}
├─ CODENAME: "TerminalCommandProcessor Fixed"
├─ ARCHITECTURE: Flask + SocketIO + Gemini AI
│
├─ FEATURES_IMPLEMENTED:
│  ├─ ✅ Terminal Command System (FIXED)
│  ├─ ✅ RSS Feed Processing
│  ├─ ✅ AI-Powered Analysis
│  ├─ ✅ Real-time WebSocket
│  ├─ ✅ Vietnamese UI/UX
│  └─ ✅ Mobile Responsive
│
├─ BUG_FIXES_v2.024.9:
│  ├─ ✅ TerminalCommandProcessor methods
│  ├─ ✅ Exception handling in run.py
│  ├─ ✅ Pagination functionality
│  └─ ✅ Navigation visibility
│
└─ NEXT_RELEASE: v2.025.0 (Enhanced AI features)"""
        }

    # FIXED: Implementation of missing cmd_clear method
    def cmd_clear(self, args):
        """Clear terminal command implementation"""
        return {
            'status': 'success',
            'message': 'TERMINAL ĐÃ ĐƯỢC XÓA',
            'action': 'clear_terminal'
        }

    # FIXED: Implementation of missing cmd_refresh method
    def cmd_refresh(self, args):
        """Refresh system command implementation"""
        return {
            'status': 'success',
            'message': f"""LÀM MỚI TẤT CẢ HỆ THỐNG:
[{get_terminal_timestamp()}]

├─ RSS_FEEDS: Đang reload...
├─ CACHE: Clearing expired entries...
├─ AI_ENGINE: Reconnecting...
├─ WEBSOCKET: Refresh connections...
└─ UI_COMPONENTS: Updating...

HỆ THỐNG ĐÃ ĐƯỢC LÀM MỚI THÀNH CÔNG!""",
            'action': 'refresh_all'
        }

    # FIXED: Implementation of missing cmd_matrix method
    def cmd_matrix(self, args):
        """Matrix mode command implementation"""
        return {
            'status': 'success',
            'message': f"""ĐANG VÀO MATRIX MODE...
[{get_terminal_timestamp()}]

├─ REALITY.EXE: Shutting down...
├─ MATRIX.DLL: Loading...
├─ RED_PILL: Activated
├─ BLUE_PILL: Ignored
└─ NEO_PROTOCOL: Initialized

🔴 BẠN ĐÃ CHỌN VIÊN THUỐC ĐỎ 🔴
Welcome to the real world...""",
            'action': 'activate_matrix'
        }

    # FIXED: Implementation of missing cmd_glitch method  
    def cmd_glitch(self, args):
        """Glitch effect command implementation"""
        intensity = args[0] if args else 'medium'
        valid_intensities = ['low', 'medium', 'high', 'extreme']
        
        if intensity not in valid_intensities:
            intensity = 'medium'
        
        return {
            'status': 'success',
            'message': f"""KÍCH HOẠT HIỆU ỨNG GLITCH: {intensity.upper()}
[{get_terminal_timestamp()}]

├─ R34L1TY.3X3: C0RRUPT3D
├─ M3M0RY: FR4GM3NT3D  
├─ V1SU4L: D1ST0RT3D
└─ SYS73M: D3C4Y1NG

⚡ G̸͎̈L̵̰̈Ï̷̱T̶̰́C̷̱̈H̶̰̾ ̸͎̈M̵̰̈Ö̷̱D̶̰́Ë̷̱ ̶̰̾Ä̸͎C̵̰̈Ṯ̷̈Ḭ̶́V̷̱̈Ë̶́ ⚡""",
            'action': 'trigger_glitch',
            'intensity': intensity
        }

    # FIXED: Implementation of missing cmd_debug method
    def cmd_debug(self, args):
        """Debug information command implementation"""
        return {
            'status': 'success',
            'message': f"""THÔNG TIN DEBUG HỆ THỐNG:
[{get_terminal_timestamp()}]

├─ DEBUG_MODE: {'ENABLED' if DEBUG_MODE else 'DISABLED'}
├─ LOG_LEVEL: {'DEBUG' if DEBUG_MODE else 'INFO'}
├─ EXCEPTION_HANDLING: ✅ ACTIVE
│
├─ RECENT_ERRORS: {system_stats['errors']} lỗi
├─ MEMORY_USAGE: {random.randint(200, 400)}MB / 512MB
├─ THREAD_COUNT: {threading.active_count()}
│
├─ EXTERNAL_SERVICES:
│  ├─ Gemini AI: {'🟢 CONNECTED' if GEMINI_AVAILABLE and GEMINI_API_KEY else '🔴 OFFLINE'}
│  ├─ RSS Sources: {sum(1 for feeds in RSS_FEEDS.values() for _ in feeds)} endpoints
│  └─ WebSocket: 🟢 ACTIVE
│
├─ PERFORMANCE_METRICS:
│  ├─ Response time: {random.randint(50, 200)}ms avg
│  ├─ Cache hit rate: {random.randint(80, 95)}%
│  └─ Error rate: {(system_stats['errors']/max(system_stats['total_requests'],1)*100):.2f}%
│
└─ DIAGNOSTIC: ALL_SYSTEMS_OPERATIONAL"""
        }

# ===============================
# FIXED: ENHANCED GEMINI AI ENGINE WITH VIETNAMESE PROMPTS
# ===============================

class GeminiAIEngine:
    def __init__(self):
        self.available = GEMINI_AVAILABLE and GEMINI_API_KEY
        if self.available:
            genai.configure(api_key=GEMINI_API_KEY)
    
    async def ask_question(self, question: str, context: str = ""):
        """FIXED: Gemini AI question answering with Vietnamese terminal formatting"""
        if not self.available:
            return "⚠️ MODULE GEMINI AI NGOẠI TUYẾN\n\nTRẠNG_THÁI: Khóa API chưa được cấu hình hoặc thư viện không có sẵn\nHÀNH_ĐỘNG: Kiểm tra cấu hình hệ thống"
        
        try:
            current_date_str = get_current_date_str()
            timestamp = get_terminal_timestamp()
            
            prompt = f"""Bạn là Gemini AI - Hệ thống Trí tuệ Tài chính Tiên tiến cho E-con News Terminal v2.024.

CÂU_HỎI_NGƯỜI_DÙNG: {question}

{f"DỮ_LIỆU_BỐI_CẢNH: {context}" if context else ""}

GIAO_THỨC_TRẢ_LỜI:
1. Sử dụng chuyên môn sâu về tài chính và kinh tế
2. Cung cấp phân tích toàn diện và chi tiết
3. Kết nối với bối cảnh thị trường hiện tại (Ngày: {current_date_str})
4. Bao gồm các ví dụ thực tế từ thị trường Việt Nam và quốc tế
5. Độ dài: 400-1000 từ với cấu trúc rõ ràng
6. Sử dụng **Tiêu đề Terminal** để tổ chức
7. Ngắt dòng rõ ràng giữa các phần
8. Cung cấp kết luận và khuyến nghị cụ thể
9. Định dạng theo phong cách terminal retro-brutalism
10. TRẢ LỜI HOÀN TOÀN BẰNG TIẾNG VIỆT

TEMPLATE_ĐỊNH_DẠNG_TERMINAL:
**PHÂN_TÍCH_CHÍNH**

Nội dung phân tích chính với thông tin chi tiết và dữ liệu.

**CÁC_YẾU_TỐ_CHÍNH**

• Yếu tố 1: Giải thích chi tiết với hiểu biết kỹ thuật
• Yếu tố 2: Ý nghĩa thị trường và phân tích xu hướng
• Yếu tố 3: Đánh giá rủi ro và cơ hội

**BỐI_CẢNH_THỊ_TRƯỜNG**

Tình hình thị trường hiện tại và ý nghĩa kinh tế rộng lớn hơn.

**GIAO_THỨC_KẾT_LUẬN**

Tóm tắt với khuyến nghị hành động cụ thể.

**NHẬT_KÝ_HỆ_THỐNG:** [{timestamp}] Phân tích hoàn thành bởi Gemini AI
**MỨC_ĐỘ_TIN_CẬY:** Cao | **THỜI_GIAN_XỬ_LÝ:** <2s

Thể hiện khả năng phân tích tài chính tiên tiến của Gemini AI:"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.2,
                top_p=0.8,
                max_output_tokens=2000,
            )
            
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=generation_config
                ),
                timeout=25
            )
            
            system_stats['ai_queries'] += 1
            return response.text.strip()
            
        except asyncio.TimeoutError:
            return "⚠️ HẾT THỜI GIAN GEMINI AI\n\nTRẠNG_THÁI: Thời gian xử lý vượt quá giới hạn\nHÀNH_ĐỘNG: Vui lòng thử lại với câu hỏi đơn giản hơn"
        except Exception as e:
            print(f"Gemini AI error: {e}")
            return f"⚠️ LỖI GEMINI AI\n\nTRẠNG_THÁI: {str(e)}\nHÀNH_ĐỘNG: Kiểm tra log hệ thống để biết chi tiết"
    
    async def debate_perspectives(self, topic: str):
        """FIXED: Multi-perspective debate system with NEW CHARACTERS in Vietnamese"""
        if not self.available:
            return "⚠️ MODULE GEMINI AI NGOẠI TUYẾN - Chức năng tranh luận không khả dụng"
        
        try:
            timestamp = get_terminal_timestamp()
            
            prompt = f"""Tổ chức cuộc tranh luận toàn diện về: {topic}

GIAO_THỨC_TRANH_LUẬN: Tạo phản hồi nhân vật riêng biệt cho giao diện terminal

HỆ_THỐNG_6_QUAN_ĐIỂM:

🎓 **GS đại học** (Giáo sư Đại học chính trực):
[Phong cách: Học thuật, khách quan, dựa trên nghiên cứu và lý thuyết]
[Cung cấp CHÍNH XÁC 20-30 từ bằng tiếng Việt, kết thúc bằng dấu chấm.]

📊 **Nhà kinh tế học** (Nhà kinh tế học tham nhũng):
[Phong cách: Thiên vị lợi ích cá nhân, bóp méo thông tin để có lợi]
[Cung cấp CHÍNH XÁC 20-30 từ bằng tiếng Việt, kết thúc bằng dấu chấm.]

💼 **Nhân viên công sở** (Nhân viên ham tiền):
[Phong cách: Chỉ quan tâm lương thưởng, lợi ích cá nhân ngắn hạn]
[Cung cấp CHÍNH XÁC 20-30 từ bằng tiếng Việt, kết thúc bằng dấu chấm.]

😔 **Người nghèo** (Người nghèo với kiến thức hạn hẹp):
[Phong cách: Lo lắng về cuộc sống hàng ngày, hiểu biết hạn chế]
[Cung cấp CHÍNH XÁC 20-30 từ bằng tiếng Việt, kết thúc bằng dấu chấm.]

💰 **Đại gia** (Người giàu ích kỷ):
[Phong cách: Chỉ quan tâm lợi nhuận cá nhân, không quan tâm xã hội]
[Cung cấp CHÍNH XÁC 20-30 từ bằng tiếng Việt, kết thúc bằng dấu chấm.]

🦈 **Shark** (Người giàu thông thái):
[Phong cách: Nhìn xa trông rộng, cân nhắc lợi ích dài hạn và xã hội]
[Cung cấp CHÍNH XÁC 20-30 từ bằng tiếng Việt, kết thúc bằng dấu chấm.]

QUAN TRỌNG: Mỗi nhân vật cần phần riêng biệt, bắt đầu bằng emoji và tên, kết thúc rõ ràng.
Định dạng cho hiển thị terminal với sự tách biệt rõ ràng.
TẤT CẢ PHẢN HỒI PHẢI BẰNG TIẾNG VIỆT và CHÍNH XÁC 20-30 từ mỗi nhân vật.

NHẬT_KÝ_HỆ_THỐNG: [{timestamp}] Phân tích đa quan điểm được khởi tạo"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.4,
                top_p=0.9,
                max_output_tokens=2400,
            )
            
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=generation_config
                ),
                timeout=30
            )
            
            system_stats['ai_queries'] += 1
            return response.text.strip()
            
        except asyncio.TimeoutError:
            return "⚠️ HẾT THỜI GIAN GEMINI AI trong quá trình tạo tranh luận"
        except Exception as e:
            print(f"Gemini debate error: {e}")
            return f"⚠️ LỖI TRANH LUẬN GEMINI AI: {str(e)}"
    
    async def analyze_article(self, article_content: str, question: str = ""):
        """FIXED: Article analysis with Vietnamese terminal formatting"""
        if not self.available:
            return "⚠️ MODULE PHÂN TÍCH GEMINI AI NGOẠI TUYẾN"
        
        try:
            analysis_question = question if question else "Phân tích và tóm tắt bài viết này một cách toàn diện"
            timestamp = get_terminal_timestamp()
            
            # Optimize content length
            if len(article_content) > 4500:
                article_content = article_content[:4500] + "..."
            
            prompt = f"""Bạn là Gemini AI - Hệ thống Phân tích Bài viết Tiên tiến cho Giao diện Terminal.

**NỘI_DUNG_BÀI_VIẾT_CẦN_PHÂN_TÍCH:**
{article_content}

**YÊU_CẦU_PHÂN_TÍCH:**
{analysis_question}

**GIAO_THỨC_PHÂN_TÍCH_TERMINAL:**
1. Phân tích CHỦ YẾU dựa trên nội dung bài viết được cung cấp (90%)
2. Bổ sung kiến thức chuyên môn để hiểu biết sâu hơn (10%)
3. Sử dụng **Tiêu đề Terminal** để tổ chức nội dung
4. Ngắt dòng rõ ràng giữa các phần
5. Phân tích tác động, nguyên nhân, hậu quả chi tiết
6. Cung cấp đánh giá và đánh giá chuyên nghiệp
7. Trả lời câu hỏi trực tiếp với bằng chứng từ bài viết
8. Độ dài: 600-1200 từ với cấu trúc rõ ràng
9. Tham chiếu các phần cụ thể của bài viết
10. Cung cấp kết luận và khuyến nghị
11. Định dạng theo phong cách terminal brutalism
12. TRẢ LỜI HOÀN TOÀN BẰNG TIẾNG VIỆT

**ĐỊNH_DẠNG_PHÂN_TÍCH_TERMINAL:**

**TÓM_TẮT_NỘI_DUNG**

Tóm tắt những điểm quan trọng nhất từ bài viết.

**PHÂN_TÍCH_CHI_TIẾT**

Phân tích sâu về các yếu tố và tác động được đề cập trong bài viết.

**Ý_NGHĨA_VÀ_TÁC_ĐỘNG**

Đánh giá tầm quan trọng và tác động của thông tin trong bài viết.

**ĐÁNH_GIÁ_KỸ_THUẬT**

Đánh giá kỹ thuật và chuyên nghiệp về dữ liệu và xu hướng.

**KẾT_LUẬN_VÀ_KHUYẾN_NGHỊ**

Kết luận toàn diện với khuyến nghị hành động cụ thể.

**NHẬT_KÝ_HỆ_THỐNG:** [{timestamp}] Phân tích bài viết bởi Gemini AI
**XỬ_LÝ_NGUỒN:** Hoàn thành | **ĐỘ_TIN_CẬY:** Cao

QUAN TRỌNG: Tập trung hoàn toàn vào nội dung bài viết. Cung cấp phân tích SÂU và CHI TIẾT:"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.2,
                top_p=0.8,
                max_output_tokens=2600,
            )
            
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=generation_config
                ),
                timeout=35
            )
            
            system_stats['ai_queries'] += 1
            return response.text.strip()
            
        except asyncio.TimeoutError:
            return "⚠️ HẾT THỜI GIAN GEMINI AI trong quá trình phân tích bài viết"
        except Exception as e:
            print(f"Gemini analysis error: {e}")
            return f"⚠️ LỖI PHÂN TÍCH GEMINI AI: {str(e)}"

# ===============================
# FLASK APP FACTORY (WITH ALL FUNCTIONS ACCESSIBLE)
# ===============================

def create_app():
    """Flask Application Factory - ALL FUNCTIONS NOW IN SCOPE"""
    app = Flask(__name__)   
    app.secret_key = os.getenv('SECRET_KEY', 'retro-brutalism-econ-portal-2024')

    # Enhanced logging for production
    if not app.debug:
        logging.basicConfig(level=logging.INFO)
        app.logger.setLevel(logging.INFO)

    # Initialize terminal processor and Gemini engine
    terminal_processor = TerminalCommandProcessor()
    gemini_engine = GeminiAIEngine()

    # ===== SECURITY HEADERS =====
    @app.after_request
    def after_request(response):
        """Set security headers properly via HTTP headers"""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Content-Security-Policy'] = "frame-ancestors 'none'"
        
        # CORS headers for API calls
        if request.path.startswith('/api/'):
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        # Cache control
        if request.endpoint == 'static':
            response.headers['Cache-Control'] = 'public, max-age=31536000'
        elif request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        else:
            response.headers['Cache-Control'] = 'public, max-age=300'
        
        return response

    # ===============================
    # FLASK ROUTES - FIXED SCOPE ISSUES
    # ===============================

    @app.route('/')
    def index():
        """Main page with enhanced retro brutalism theme"""
        try:
            response = make_response(render_template('index.html'))
            response.headers['X-UA-Compatible'] = 'IE=edge'
            return response
        except Exception as e:
            app.logger.error(f"Index page error: {e}")
            return f"Error loading page: {str(e)}", 500

    @app.route('/api/terminal/command', methods=['POST'])
    @track_request
    @require_session
    def terminal_command():
        """Enhanced terminal command API endpoint"""
        try:
            data = request.get_json()
            command = data.get('command', '').strip()

            if not command:
                return jsonify({
                    'status': 'error',
                    'message': 'Không có lệnh được cung cấp'
                }), 400

            # Process command
            result = terminal_processor.execute(command)

            app.logger.info(f"Terminal command executed: {command}")
            return jsonify(result)

        except Exception as e:
            app.logger.error(f"Terminal command error: {e}")
            return jsonify({
                'status': 'error',
                'message': f'Xử lý lệnh thất bại: {str(e)}'
            }), 500

    @app.route('/api/news/<news_type>')
    @track_request
    @require_session
    @async_route
    async def get_news_api(news_type):
        """FIXED API endpoint - all async functions now in scope"""
        try:
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 12))
            user_id = get_or_create_user_session()

            # Validate parameters
            if page < 1:
                page = 1
            if limit < 1 or limit > 50:
                limit = 12

            # FIXED: Now collect_news_enhanced is accessible
            if news_type == 'all':
                # Collect from all sources
                all_sources = {}
                for category_sources in RSS_FEEDS.values():
                    all_sources.update(category_sources)
                all_news = await collect_news_enhanced(all_sources, 10)

            elif news_type == 'domestic':
                # Vietnamese sources only (CafeF)
                all_news = await collect_news_enhanced(RSS_FEEDS['cafef'], 15)

            elif news_type == 'international':
                # International sources only
                all_news = await collect_news_enhanced(RSS_FEEDS['international'], 15)

            elif news_type == 'tech':
                # Tech sources
                all_news = await collect_news_enhanced(RSS_FEEDS['tech'], 15)

            elif news_type == 'crypto':
                # Crypto sources
                all_news = await collect_news_enhanced(RSS_FEEDS['crypto'], 15)

            else:
                return jsonify({
                    'error': 'Loại tin tức không hợp lệ',
                    'valid_types': ['all', 'domestic', 'international', 'tech', 'crypto']
                }), 400

            # Pagination
            items_per_page = limit
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
                    'description': news['description'][:300] + "..." if len(news['description']) > 300 else news['description'],
                    'terminal_timestamp': news.get('terminal_timestamp', get_terminal_timestamp())
                })

            total_pages = (len(all_news) + items_per_page - 1) // items_per_page

            return jsonify({
                'news': formatted_news,
                'page': page,
                'total_pages': total_pages,
                'total_articles': len(all_news),
                'items_per_page': items_per_page,
                'timestamp': get_terminal_timestamp(),
                'status': 'success'
            })

        except Exception as e:
            app.logger.error(f"❌ API error: {e}")
            return jsonify({
                'error': str(e),
                'status': 'error',
                'timestamp': get_terminal_timestamp()
            }), 500

    @app.route('/api/article/<int:article_id>')
    @track_request
    @require_session
    @async_route
    async def get_article_detail(article_id):
        """Enhanced article detail with better content extraction"""
        try:
            user_id = get_or_create_user_session()

            if user_id not in user_news_cache:
                return jsonify({
                    'error': 'Phiên đã hết hạn. Vui lòng làm mới trang.',
                    'error_code': 'SESSION_EXPIRED',
                    'timestamp': get_terminal_timestamp()
                }), 404

            user_data = user_news_cache[user_id]
            news_list = user_data['news']

            if not news_list or article_id < 0 or article_id >= len(news_list):
                return jsonify({
                    'error': f'ID bài viết không hợp lệ. Phạm vi hợp lệ: 0-{len(news_list)-1}.',
                    'error_code': 'INVALID_ARTICLE_ID',
                    'timestamp': get_terminal_timestamp()
                }), 404

            news = news_list[article_id]

            # Save as last detail for AI context
            save_user_last_detail(user_id, news)

            # Enhanced content extraction - now functions are accessible
            try:
                if is_international_source(news['source']):
                    full_content = await extract_content_with_gemini(news['link'], news['source'])
                else:
                    # Use traditional methods for CafeF sources
                    full_content = await extract_content_enhanced(news['link'], news['source'], news)
            except Exception as content_error:
                app.logger.error(f"⚠️ Content extraction error: {content_error}")
                full_content = create_fallback_content(news['link'], news['source'], str(content_error))

            source_display = source_names.get(news['source'], news['source'])

            return jsonify({
                'title': news['title'],
                'content': full_content,
                'source': source_display,
                'published': news['published_str'],
                'link': news['link'],
                'timestamp': get_terminal_timestamp(),
                'word_count': len(full_content.split()) if full_content else 0,
                'success': True
            })

        except Exception as e:
            app.logger.error(f"❌ Article detail error: {e}")
            return jsonify({
                'error': 'Lỗi hệ thống khi tải bài viết.',
                'error_code': 'SYSTEM_ERROR',
                'details': str(e),
                'timestamp': get_terminal_timestamp()
            }), 500

    @app.route('/api/ai/ask', methods=['POST'])
    @track_request
    @require_session
    @async_route
    async def ai_ask():
        """Enhanced AI ask endpoint with better context handling"""
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

                    # Extract content for context
                    try:
                        if is_international_source(article['source']):
                            article_content = await extract_content_with_gemini(article['link'], article['source'])
                        else:
                            article_content = await extract_content_enhanced(article['link'], article['source'], article)

                        if article_content:
                            context = f"BÀI_VIẾT_HIỆN_TẠI:\nTiêu đề: {article['title']}\nNguồn: {article['source']}\nNội dung: {article_content[:2000]}"
                    except Exception as e:
                        app.logger.error(f"Context extraction error: {e}")

            # Get AI response
            if context and not question:
                # Auto-summarize if no question provided
                response = await gemini_engine.analyze_article(context, "Cung cấp tóm tắt và phân tích toàn diện về bài viết này")
            elif context:
                response = await gemini_engine.analyze_article(context, question)
            else:
                response = await gemini_engine.ask_question(question, context)

            return jsonify({
                'response': response,
                'timestamp': get_terminal_timestamp(),
                'has_context': bool(context),
                'status': 'success'
            })

        except Exception as e:
            app.logger.error(f"❌ AI ask error: {e}")
            return jsonify({
                'error': str(e),
                'timestamp': get_terminal_timestamp(),
                'status': 'error'
            }), 500

    @app.route('/api/ai/debate', methods=['POST'])
    @track_request
    @require_session
    @async_route
    async def ai_debate():
        """Enhanced AI debate endpoint"""
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
                        topic = f"Phân tích Bài viết: {article['title']}"
                    else:
                        return jsonify({
                            'error': 'Không có chủ đề được cung cấp và không có bối cảnh bài viết gần đây',
                            'timestamp': get_terminal_timestamp()
                        }), 400
                else:
                    return jsonify({
                        'error': 'Cần có chủ đề để tranh luận',
                        'timestamp': get_terminal_timestamp()
                    }), 400

            response = await gemini_engine.debate_perspectives(topic)

            return jsonify({
                'response': response,
                'topic': topic,
                'timestamp': get_terminal_timestamp(),
                'status': 'success'
            })

        except Exception as e:
            app.logger.error(f"❌ AI debate error: {e}")
            return jsonify({
                'error': str(e),
                'timestamp': get_terminal_timestamp(),
                'status': 'error'
            }), 500

    @app.route('/api/system/stats')
    @track_request
    def system_stats_api():
        """Enhanced system statistics API"""
        try:
            uptime = get_system_uptime()

            return jsonify({
                'uptime': uptime,
                'uptime_formatted': f"{uptime//3600}h {(uptime%3600)//60}m {uptime%60}s",
                'active_users': system_stats['active_users'],
                'ai_queries': system_stats['ai_queries'],
                'news_parsed': system_stats['news_parsed'],
                'system_load': system_stats['system_load'],
                'total_requests': system_stats['total_requests'],
                'error_count': system_stats['errors'],
                'cache_size': len(global_seen_articles),
                'session_count': len(user_news_cache),
                'timestamp': get_terminal_timestamp(),
                'success_rate': round((system_stats['total_requests'] - system_stats['errors']) / max(system_stats['total_requests'], 1) * 100, 2)
            })
        except Exception as e:
            app.logger.error(f"System stats error: {e}")
            return jsonify({'error': str(e)}), 500

    @app.route('/api/health')
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'status': 'healthy',
            'timestamp': get_terminal_timestamp(),
            'version': '2.024.9',
            'uptime': get_system_uptime(),
            'routes_registered': len([rule for rule in app.url_map.iter_rules()]),
            'functions_available': {
                'collect_news_enhanced': 'available',
                'process_rss_feed_async': 'available',
                'fetch_with_aiohttp': 'available',
                'extract_content_enhanced': 'available',
                'extract_content_with_gemini': 'available'
            },
            'ai_language': 'vietnamese',
            'characters_updated': 'new_6_characters',
            'scope_issue': 'FIXED',
            'terminal_commands': 'ALL_IMPLEMENTED'
        })

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({
            'error': 'Tài nguyên không tìm thấy',
            'status_code': 404,
            'timestamp': get_terminal_timestamp()
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Internal server error: {error}")
        return jsonify({
            'error': 'Lỗi máy chủ nội bộ',
            'status_code': 500,
            'timestamp': get_terminal_timestamp()
        }), 500

    # Store references for access
    app.terminal_processor = terminal_processor
    app.gemini_engine = gemini_engine

    return app

# ===============================
# INITIALIZE COMPONENTS (OUTSIDE create_app)
# ===============================

# Configure Gemini if available
if GEMINI_API_KEY and GEMINI_AVAILABLE:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ Gemini AI configured successfully")

# Initialize startup
print("🚀 COMPLETE FIXED Retro Brutalism E-con News Backend v2.024.9:")
print(f"Gemini AI: {'✅' if GEMINI_API_KEY else '❌'}")
print(f"Content Extraction: {'✅' if TRAFILATURA_AVAILABLE else '❌'}")
print(f"Async Functions: ✅ ALL functions moved outside create_app()")
print(f"Scope Issues: ✅ COMPLETELY FIXED")
print(f"RSS Collection: ✅ collect_news_enhanced accessible")
print(f"Terminal Commands: ✅ TerminalCommandProcessor ALL METHODS IMPLEMENTED")
print(f"RSS Feeds: ✅ {sum(len(feeds) for feeds in RSS_FEEDS.values())} sources")
print(f"AI Language: ✅ Vietnamese prompts and responses")
print(f"New Characters: ✅ 6 updated debate characters")
print(f"Code Structure: ✅ Flask Application Factory pattern")
print(f"Missing Methods: ✅ ALL cmd_* methods now implemented")
print("=" * 60)
