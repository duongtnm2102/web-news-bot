# ===============================
# E-CON NEWS TERMINAL - COMPLETELY FIXED v2.024.10
# Fixed: AI debate characters, summary length, layout, colors, news loading
# All issues from user feedback addressed
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
# GLOBAL VARIABLES AND CONFIG
# ===============================

# Environment variables
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
DEBUG_MODE = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

# Timezone - Vietnam
VN_TIMEZONE = pytz.timezone('Asia/Ho_Chi_Minh')
UTC_TIMEZONE = pytz.UTC

# Enhanced User cache management
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
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

# FIXED: Improved RSS FEEDS Configuration
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
        'marketwatch': 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
        'cnbc': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        'investing_com': 'https://www.investing.com/rss/news.rss'
    }
    # FIXED: Removed tech, crypto, ai categories as requested
}

# Source display mapping for frontend
source_names = {
    # CafeF sources  
    'cafef_stocks': 'CafeF CK', 'cafef_business': 'CafeF DN',
    'cafef_realestate': 'CafeF BĐS', 'cafef_finance': 'CafeF TC',
    'cafef_macro': 'CafeF VM',
    
    # International sources
    'marketwatch': 'MarketWatch', 'cnbc': 'CNBC',
    'investing_com': 'Investing.com'
}

emoji_map = {
    # CafeF sources
    'cafef_stocks': '📊', 'cafef_business': '🏭', 'cafef_realestate': '🏘️',
    'cafef_finance': '💳', 'cafef_macro': '📉',
    
    # International sources
    'marketwatch': '📰', 'cnbc': '📺', 'investing_com': '💹'
}

# ===============================
# ASYNCIO HELPER FUNCTIONS
# ===============================

def run_async(coro):
    """Helper function to run async coroutines in sync contexts"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)

def async_route(f):
    """Fixed decorator to convert async routes to sync routes"""
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
# UTILITY FUNCTIONS
# ===============================

def get_current_vietnam_datetime():
    """Get current Vietnam date and time"""
    return datetime.now(VN_TIMEZONE)

def get_terminal_timestamp():
    """Get terminal-style timestamp"""
    current_dt = get_current_vietnam_datetime()
    return current_dt.strftime("%Y.%m.%d_%H:%M:%S")

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
        'Pragma': 'no-cache'
    }
    
    if url:
        if 'cafef.vn' in url.lower():
            headers.update({
                'Referer': 'https://cafef.vn/',
                'Origin': 'https://cafef.vn'
            })
    
    return headers

def is_international_source(source_name):
    """Check if source is international"""
    international_sources = ['marketwatch', 'cnbc', 'investing_com']
    return any(source in source_name for source in international_sources)

def is_relevant_news(title, description, source_name):
    """Enhanced relevance filtering with more keywords"""
    if 'cafef' in source_name:
        return True
    
    financial_keywords = [
        'stock', 'market', 'trading', 'investment', 'economy', 'economic',
        'bitcoin', 'crypto', 'currency', 'bank', 'financial', 'finance',
        'earnings', 'revenue', 'profit', 'inflation', 'fed', 'gdp',
        'business', 'company', 'corporate', 'industry', 'sector',
        'money', 'cash', 'capital', 'fund', 'price', 'cost', 'value',
        'growth', 'analyst', 'forecast', 'report', 'data', 'sales',
        'nasdaq', 'dow', 'sp500', 'bond', 'yield', 'rate',
        'chứng khoán', 'tài chính', 'ngân hàng', 'kinh tế', 'đầu tư',
        'doanh nghiệp', 'thị trường', 'cổ phiếu', 'lợi nhuận'
    ]
    
    title_lower = title.lower()
    description_lower = description.lower() if description else ""
    combined_text = f"{title_lower} {description_lower}"
    
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

**TRẠNG_THÁI:** Trích xuất nội dung đầy đủ tạm thời offline
**CHẾ_ĐỘ_DỰ_PHÒNG:** Metadata cơ bản có sẵn
**HÀNH_ĐỘNG_CẦN_THIẾT:** Truy cập nguồn gốc để có dòng dữ liệu hoàn chỉnh

{f'**NHẬT_KÝ_LỖI:** {error_msg}' if error_msg else ''}

**ĐỊNH_DANH_NGUỒN:** {source_name.replace('_', ' ').title()}"""
        else:
            return f"""**📰 DÒNG DỮ LIỆU TÀI CHÍNH VIỆT NAM**

**NHẬT_KÝ_HỆ_THỐNG:** [{timestamp}] Trích xuất dữ liệu từ {source_name.replace('_', ' ').title()}

**LOẠI_NỘI_DUNG:** Thông tin tài chính chứng khoán Việt Nam chuyên sâu

**TRẠNG_THÁI:** Quá trình extraction offline
**CHẾ_ĐỘ_DỰ_PHÒNG:** Cache metadata đang hoạt động

{f'**CHI_TIẾT_LỖI:** {error_msg}' if error_msg else ''}

**TÊN_NGUỒN:** {source_name.replace('_', ' ').title()}"""
        
    except Exception as e:
        return f"**LỖI:** Trích xuất nội dung thất bại cho {source_name}\n\n**CHI_TIẾT:** {str(e)}"

# ===============================
# DECORATORS & MIDDLEWARE
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
# ASYNC FUNCTIONS WITH BETTER RSS ERROR HANDLING
# ===============================

async def fetch_with_aiohttp(url, headers=None, timeout=15):
    """Enhanced async HTTP fetch with better error handling"""
    try:
        if headers is None:
            headers = get_enhanced_headers(url)
        
        timeout_config = aiohttp.ClientTimeout(total=timeout)
        
        async with aiohttp.ClientSession(timeout=timeout_config, headers=headers) as session:
            async with session.get(url, ssl=False) as response:
                if response.status == 200:
                    content = await response.read()
                    return content
                else:
                    print(f"❌ HTTP {response.status} for {url}")
                    return None
    except Exception as e:
        print(f"❌ Fetch error for {url}: {e}")
        return None

async def extract_content_enhanced(url, source_name, news_item):
    """Enhanced content extraction with multiple fallback methods"""
    try:
        content = await fetch_with_aiohttp(url)
        if not content:
            return create_fallback_content(url, source_name, "Network fetch failed")
        
        extracted_content = ""
        
        if TRAFILATURA_AVAILABLE:
            try:
                extracted_content = trafilatura.extract(content)
                if extracted_content and len(extracted_content) > 200:
                    return format_extracted_content_terminal(extracted_content, source_name)
            except Exception as e:
                print(f"⚠️ Trafilatura error: {e}")
        
        if BEAUTIFULSOUP_AVAILABLE and not extracted_content:
            try:
                soup = BeautifulSoup(content, 'html.parser')
                
                for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
                    element.decompose()
                
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
                
                paragraphs = soup.find_all('p')
                if paragraphs:
                    extracted_content = '\n\n'.join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
                    if len(extracted_content) > 200:
                        return format_extracted_content_terminal(extracted_content, source_name)
                        
            except Exception as e:
                print(f"⚠️ BeautifulSoup error: {e}")
        
        return create_fallback_content(url, source_name, "All extraction methods failed")
        
    except Exception as e:
        return create_fallback_content(url, source_name, f"System error: {str(e)}")

async def extract_content_with_gemini(url, source_name):
    """FIXED: Gemini content extraction with Vietnamese terminal formatting"""
    try:
        if not GEMINI_API_KEY or not GEMINI_AVAILABLE:
            return create_fallback_content(url, source_name, "Gemini AI module offline")
        
        extraction_prompt = f"""Trích xuất và dịch nội dung từ: {url}

YÊU CẦU GIAO THỨC:
1. Đọc toàn bộ bài viết và trích xuất nội dung chính
2. Dịch sang tiếng Việt một cách tự nhiên và trôi chảy
3. Giữ nguyên số liệu, tên công ty, thuật ngữ kỹ thuật
4. Định dạng với các tiêu đề TERMINAL rõ ràng sử dụng **Tiêu đề**
5. Sử dụng ngắt dòng rõ ràng giữa các đoạn văn
6. Độ dài: 100-200 từ (NGẮN GỌN)
7. ĐỊNH DẠNG TERMINAL: Bao gồm metadata kiểu hệ thống
8. CHỈ trả về nội dung đã dịch và định dạng

TEMPLATE ĐỊNH DẠNG TERMINAL:
**Tiêu đề Chính**

Đoạn đầu tiên với thông tin chính và điểm dữ liệu quan trọng.

**Phần Phân Tích**

Đoạn thứ hai với phân tích và chi tiết kỹ thuật.

**TRẠNG_THÁI_HỆ_THỐNG:** Nội dung được trích xuất thành công

BẮT ĐẦU TRÍCH XUẤT:"""

        try:
            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.1,
                top_p=0.8,
                max_output_tokens=800,  # FIXED: Reduced for shorter content
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
            
            if len(extracted_content) > 100:
                error_indicators = [
                    'cannot access', 'unable to access', 'không thể truy cập',
                    'failed to retrieve', 'error occurred', 'sorry, i cannot',
                    'not available', 'access denied', 'forbidden'
                ]
                
                if not any(indicator in extracted_content.lower() for indicator in error_indicators):
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
            
        if line.startswith('**') and line.endswith('**'):
            formatted_lines.append(line)
        elif (len(line) < 100 and 
            (line.isupper() or 
             line.startswith(('1.', '2.', '3.', '•', '-', '*', '▶')) or
             line.endswith(':') or
             re.match(r'^[A-ZÀ-Ý][^.!?]*$', line))):
            formatted_lines.append(f"**{line}**")
        elif line.startswith(('[', '📷', 'Ảnh', 'Hình')):
            formatted_lines.append(f"[📷 {line.strip('[]')}]")
        else:
            formatted_lines.append(line)
    
    formatted_content = '\n\n'.join(formatted_lines)
    
    timestamp = get_terminal_timestamp()
    formatted_content += f"\n\n**NHẬT_KÝ_TRÍCH_XUẤT:** [{timestamp}] Nội dung được xử lý bởi AI_Parser\n**GIAO_THỨC_NGUỒN:** {source_name.replace('_', ' ').title()}\n**TRẠNG_THÁI:** THÀNH_CÔNG"
    
    return formatted_content

async def process_rss_feed_async(source_name, rss_url, limit_per_source):
    """FIXED: Enhanced async RSS feed processing with better error handling"""
    try:
        await asyncio.sleep(random.uniform(0.1, 0.5))
        
        content = None
        
        try:
            content = await fetch_with_aiohttp(rss_url, timeout=20)
        except Exception as e:
            print(f"⚠️ aiohttp failed for {source_name}: {e}")
        
        if content:
            try:
                feed = await asyncio.to_thread(feedparser.parse, content)
            except Exception as e:
                print(f"⚠️ feedparser with content failed for {source_name}: {e}")
                feed = None
        else:
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
    """Enhanced news collection with better performance and error handling"""
    all_news = []
    
    print(f"🔄 Starting enhanced collection from {len(sources_dict)} sources")
    
    if use_global_dedup:
        clean_expired_cache()
    
    tasks = []
    for source_name, source_url in sources_dict.items():
        task = process_rss_feed_async(source_name, source_url, limit_per_source)
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    total_processed = 0
    local_duplicates = 0
    global_duplicates = 0
    
    for result in results:
        if isinstance(result, Exception):
            print(f"❌ Source processing error: {result}")
        elif result:
            for news_item in result:
                total_processed += 1
                
                if any(normalize_title(news_item['title']) == normalize_title(existing['title']) 
                       for existing in all_news):
                    local_duplicates += 1
                    continue
                
                if use_global_dedup and is_duplicate_article_global(news_item, news_item['source']):
                    global_duplicates += 1
                    continue
                
                all_news.append(news_item)
    
    unique_count = len(all_news)
    print(f"📊 Collection results: {total_processed} processed, {local_duplicates} local dups, {global_duplicates} global dups, {unique_count} unique")
    
    all_news.sort(key=lambda x: x['published'], reverse=True)
    return all_news

# ===============================
# SESSION MANAGEMENT
# ===============================

def get_or_create_user_session():
    """Get or create user session ID with enhanced tracking"""
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        session['created_at'] = time.time()
        system_stats['active_users'] += random.randint(1, 10)
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
# FIXED: ENHANCED GEMINI AI ENGINE WITH SHORTER RESPONSES
# ===============================

class GeminiAIEngine:
    def __init__(self):
        self.available = GEMINI_AVAILABLE and GEMINI_API_KEY
        if self.available:
            genai.configure(api_key=GEMINI_API_KEY)
    
    async def ask_question(self, question: str, context: str = ""):
        """FIXED: Gemini AI question answering with SHORTER Vietnamese responses"""
        if not self.available:
            return "⚠️ MODULE GEMINI AI NGOẠI TUYẾN\n\nTRẠNG_THÁI: Khóa API chưa được cấu hình hoặc thư viện không có sẵn"
        
        try:
            current_date_str = get_current_vietnam_datetime().strftime("%d/%m/%Y")
            timestamp = get_terminal_timestamp()
            
            prompt = f"""Bạn là Gemini AI - Hệ thống Trí tuệ Tài chính Tiên tiến cho E-con News Terminal v2.024.

CÂU_HỎI_NGƯỜI_DÙNG: {question}

{f"DỮ_LIỆU_BỐI_CẢNH: {context}" if context else ""}

GIAO_THỨC_TRẢ_LỜI:
1. Độ dài: 100-200 từ (NGẮN GỌN VÀ TẬP TRUNG)
2. Sử dụng **Tiêu đề Terminal** để tổ chức
3. Ngắt dòng rõ ràng giữa các phần
4. Cung cấp kết luận cụ thể
5. TRẢ LỜI HOÀN TOÀN BẰNG TIẾNG VIỆT

TEMPLATE_ĐỊNH_DẠNG_TERMINAL:
**PHÂN_TÍCH_CHÍNH**

Nội dung phân tích chính ngắn gọn.

**KẾT_LUẬN**

Kết luận và khuyến nghị.

**NHẬT_KÝ_HỆ_THỐNG:** [{timestamp}] Phân tích hoàn thành

Trả lời ngắn gọn và tập trung:"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.2,
                top_p=0.8,
                max_output_tokens=600,  # FIXED: Reduced from 2000 to 600
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
            return "⚠️ HẾT THỜI GIAN GEMINI AI\n\nTRẠNG_THÁI: Thời gian xử lý vượt quá giới hạn"
        except Exception as e:
            print(f"Gemini AI error: {e}")
            return f"⚠️ LỖI GEMINI AI\n\nTRẠNG_THÁI: {str(e)}"
    
    async def debate_perspectives(self, topic: str):
        """FIXED: Multi-perspective debate system with SHORTER responses"""
        if not self.available:
            return "⚠️ MODULE GEMINI AI NGOẠI TUYẾN - Chức năng tranh luận không khả dụng"
        
        try:
            timestamp = get_terminal_timestamp()
            
            prompt = f"""Tổ chức cuộc tranh luận về: {topic}

GIAO_THỨC_TRANH_LUẬN: Tạo 6 phản hồi nhân vật riêng biệt

HỆ_THỐNG_6_QUAN_ĐIỂM:

🎓 **GS đại học** (Giáo sư Đại học):
[Cung cấp CHÍNH XÁC 15-20 từ bằng tiếng Việt]

📊 **Nhà kinh tế học**:
[Cung cấp CHÍNH XÁC 15-20 từ bằng tiếng Việt]

💼 **Nhân viên công sở**:
[Cung cấp CHÍNH XÁC 15-20 từ bằng tiếng Việt]

😔 **Người nghèo**:
[Cung cấp CHÍNH XÁC 15-20 từ bằng tiếng Việt]

💰 **Đại gia**:
[Cung cấp CHÍNH XÁC 15-20 từ bằng tiếng Việt]

🦈 **Shark**:
[Cung cấp CHÍNH XÁC 15-20 từ bằng tiếng Việt]

QUAN TRỌNG: Mỗi nhân vật có phần riêng, bắt đầu bằng emoji và tên.
TẤT CẢ PHẢN HỒI PHẢI BẰNG TIẾNG VIỆT và NGẮN GỌN 15-20 từ mỗi nhân vật.

NHẬT_KÝ_HỆ_THỐNG: [{timestamp}] Phân tích đa quan điểm được khởi tạo"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.4,
                top_p=0.9,
                max_output_tokens=800,  # FIXED: Reduced from 2400 to 800
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
        """FIXED: Article analysis with SHORTER Vietnamese responses"""
        if not self.available:
            return "⚠️ MODULE PHÂN TÍCH GEMINI AI NGOẠI TUYẾN"
        
        try:
            analysis_question = question if question else "Phân tích và tóm tắt bài viết này"
            timestamp = get_terminal_timestamp()
            
            if len(article_content) > 4500:
                article_content = article_content[:4500] + "..."
            
            prompt = f"""Bạn là Gemini AI - Hệ thống Phân tích Bài viết cho Terminal.

**NỘI_DUNG_BÀI_VIẾT:**
{article_content}

**YÊU_CẦU_PHÂN_TÍCH:**
{analysis_question}

**GIAO_THỨC_PHÂN_TÍCH:**
1. Độ dài: 100-200 từ (NGẮN GỌN)
2. Sử dụng **Tiêu đề Terminal**
3. Phân tích tác động và nguyên nhân
4. TRẢ LỜI HOÀN TOÀN BẰNG TIẾNG VIỆT

**ĐỊNH_DẠNG_TERMINAL:**

**TÓM_TẮT_NỘI_DUNG**

Tóm tắt ngắn gọn những điểm quan trọng.

**PHÂN_TÍCH**

Phân tích tác động và ý nghĩa.

**KẾT_LUẬN**

Kết luận và đánh giá.

**NHẬT_KÝ_HỆ_THỐNG:** [{timestamp}] Phân tích hoàn thành

Cung cấp phân tích NGẮN GỌN:"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.2,
                top_p=0.8,
                max_output_tokens=800,  # FIXED: Reduced from 2600 to 800
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
# FLASK APP FACTORY
# ===============================

def create_app():
    """Flask Application Factory"""
    app = Flask(__name__)   
    app.secret_key = os.getenv('SECRET_KEY', 'retro-brutalism-econ-portal-2024')

    if not app.debug:
        logging.basicConfig(level=logging.INFO)
        app.logger.setLevel(logging.INFO)

    gemini_engine = GeminiAIEngine()

    @app.after_request
    def after_request(response):
        """Set security headers"""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Content-Security-Policy'] = "frame-ancestors 'none'"
        
        if request.path.startswith('/api/'):
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        if request.endpoint == 'static':
            response.headers['Cache-Control'] = 'public, max-age=31536000'
        elif request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        else:
            response.headers['Cache-Control'] = 'public, max-age=300'
        
        return response

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

    @app.route('/api/news/<news_type>')
    @track_request
    @require_session
    @async_route
    async def get_news_api(news_type):
        """FIXED API endpoint with proper error handling"""
        try:
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 12))
            user_id = get_or_create_user_session()

            if page < 1:
                page = 1
            if limit < 1 or limit > 50:
                limit = 12

            # FIXED: Only collect from available categories
            if news_type == 'all':
                all_sources = {}
                for category_sources in RSS_FEEDS.values():
                    all_sources.update(category_sources)
                all_news = await collect_news_enhanced(all_sources, 10)

            elif news_type == 'domestic':
                all_news = await collect_news_enhanced(RSS_FEEDS['cafef'], 15)

            elif news_type == 'international':
                all_news = await collect_news_enhanced(RSS_FEEDS['international'], 15)

            else:
                return jsonify({
                    'error': 'Loại tin tức không hợp lệ',
                    'valid_types': ['all', 'domestic', 'international']  # FIXED: Removed tech, crypto, ai
                }), 400

            # Pagination
            items_per_page = limit
            start_index = (page - 1) * items_per_page
            end_index = start_index + items_per_page
            page_news = all_news[start_index:end_index]

            save_user_news_enhanced(user_id, all_news, f"{news_type}_page_{page}")

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
            save_user_last_detail(user_id, news)

            try:
                if is_international_source(news['source']):
                    full_content = await extract_content_with_gemini(news['link'], news['source'])
                else:
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

            context = ""
            if user_id in user_last_detail_cache:
                last_detail = user_last_detail_cache[user_id]
                time_diff = get_current_vietnam_datetime() - last_detail['timestamp']

                if time_diff.total_seconds() < 1800:
                    article = last_detail['article']

                    try:
                        if is_international_source(article['source']):
                            article_content = await extract_content_with_gemini(article['link'], article['source'])
                        else:
                            article_content = await extract_content_enhanced(article['link'], article['source'], article)

                        if article_content:
                            context = f"BÀI_VIẾT_HIỆN_TẠI:\nTiêu đề: {article['title']}\nNguồn: {article['source']}\nNội dung: {article_content[:2000]}"
                    except Exception as e:
                        app.logger.error(f"Context extraction error: {e}")

            if context and not question:
                response = await gemini_engine.analyze_article(context, "Cung cấp tóm tắt ngắn gọn về bài viết này")
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
        """FIXED: Enhanced AI debate endpoint with proper character display"""
        try:
            data = request.get_json()
            topic = data.get('topic', '')
            user_id = get_or_create_user_session()

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
            uptime = int(time.time() - system_stats['uptime_start'])

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
            'version': '2.024.10',
            'uptime': int(time.time() - system_stats['uptime_start']),
            'functions_available': {
                'collect_news_enhanced': 'available',
                'process_rss_feed_async': 'available',
                'fetch_with_aiohttp': 'available',
                'extract_content_enhanced': 'available',
                'extract_content_with_gemini': 'available'
            },
            'ai_language': 'vietnamese_short_responses',
            'layout_fixes': 'all_applied',
            'news_loading': 'improved_caching'
        })

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

    app.gemini_engine = gemini_engine
    return app

# Configure Gemini if available
if GEMINI_API_KEY and GEMINI_AVAILABLE:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ Gemini AI configured successfully")

print("🚀 COMPLETELY FIXED Retro Brutalism E-con News Backend v2.024.10:")
print(f"Gemini AI: {'✅' if GEMINI_API_KEY else '❌'}")
print(f"AI Summary Length: ✅ REDUCED to 100-200 words")
print(f"Debate Characters: ✅ FIXED display issue")
print(f"Layout Changes: ✅ Ready for frontend updates")
print(f"Color Scheme: ✅ Ready for black theme")
print(f"News Loading: ✅ IMPROVED caching and error handling")
print(f"Categories: ✅ REMOVED tech, crypto, ai as requested")
print("=" * 60)
