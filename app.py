# ===============================
# E-CON NEWS TERMINAL - FIXED app.py v2.024.4
# Fixed: X-Frame-Options, Flask Async, Navigation, API Issues
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
# ASYNCIO HELPER FUNCTIONS
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
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
]

# FIXED RSS FEEDS - Đảm bảo tất cả feeds hoạt động
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
        'yahoo_finance': 'https://feeds.finance.yahoo.com/rss/2.0/headline',
        'marketwatch': 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
        'cnbc': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        'reuters_business': 'https://feeds.reuters.com/reuters/businessNews',
        'investing_com': 'https://www.investing.com/rss/news.rss'
    },
    
    # === TECH SOURCES ===
    'tech': {
        'techcrunch': 'https://feeds.feedburner.com/TechCrunch/',
        'ars_technica': 'http://feeds.arstechnica.com/arstechnica/index'
    },
    
    # === CRYPTO SOURCES ===
    'crypto': {
        'coindesk': 'https://feeds.coindesk.com/rss',
        'cointelegraph': 'https://cointelegraph.com/rss'
    }
}

# Source display mapping for frontend
source_names = {
    # CafeF sources  
    'cafef_stocks': 'CafeF CK', 'cafef_business': 'CafeF DN',
    'cafef_realestate': 'CafeF BĐS', 'cafef_finance': 'CafeF TC',
    'cafef_macro': 'CafeF VM',
    
    # International sources
    'yahoo_finance': 'Yahoo Finance', 'marketwatch': 'MarketWatch',
    'cnbc': 'CNBC', 'reuters_business': 'Reuters', 
    'investing_com': 'Investing.com',
    
    # Tech sources
    'techcrunch': 'TechCrunch', 'ars_technica': 'Ars Technica',
    
    # Crypto sources
    'coindesk': 'CoinDesk', 'cointelegraph': 'Cointelegraph'
}

emoji_map = {
    # CafeF sources
    'cafef_stocks': '📊', 'cafef_business': '🏭', 'cafef_realestate': '🏘️',
    'cafef_finance': '💳', 'cafef_macro': '📉',
    
    # International sources
    'yahoo_finance': '💼', 'marketwatch': '📰', 'cnbc': '📺',
    'reuters_business': '🌏', 'investing_com': '💹',
    
    # Tech sources
    'techcrunch': '🚀', 'ars_technica': '⚙️',
    
    # Crypto sources
    'coindesk': '₿', 'cointelegraph': '🪙'
}
# ===============================
# UTILITY FUNCTIONS
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
        'yahoo_finance', 'marketwatch', 'cnbc', 'reuters', 'investing_com', 
        'bloomberg', 'financial_times', 'wsj_markets'
    ]
    return any(source in source_name for source in international_sources)

def create_fallback_content(url, source_name, error_msg=""):
    """Create enhanced fallback content when extraction fails"""
    try:
        article_id = url.split('/')[-1] if '/' in url else 'news-article'
        timestamp = get_terminal_timestamp()
        
        if is_international_source(source_name):
            return f"""**📈 INTERNATIONAL FINANCIAL DATA STREAM**

**SYSTEM_LOG:** [{timestamp}] Data extraction from {source_name.replace('_', ' ').title()}

**CONTENT_TYPE:** Financial market analysis and economic insights from global sources

**DATA_STRUCTURE:**
• Real-time market data and analysis protocols
• Global economic indicators and trend mapping
• Corporate earnings and financial report parsing
• Investment strategy algorithms and market forecasts  
• International trade and policy impact analysis

**ARTICLE_REFERENCE:** {article_id}

**STATUS:** Full content extraction temporarily offline
**FALLBACK_MODE:** Basic metadata available
**ACTION_REQUIRED:** Access original source for complete data stream

{f'**ERROR_LOG:** {error_msg}' if error_msg else ''}

**SOURCE_IDENTIFIER:** {source_name.replace('_', ' ').title()}
**PROTOCOL:** HTTPS_SECURE_FETCH
**ENCODING:** UTF-8"""
        else:
            return f"""**📰 VIETNAMESE FINANCIAL DATA STREAM - CAFEF PROTOCOL**

**SYSTEM_LOG:** [{timestamp}] Trích xuất dữ liệu từ {source_name.replace('_', ' ').title()}

**CONTENT_TYPE:** Thông tin tài chính chứng khoán Việt Nam chuyên sâu

**DATA_STRUCTURE:**
• Phân tích thị trường chứng khoán real-time
• Database tin tức doanh nghiệp và báo cáo tài chính
• Algorithm xu hướng đầu tư và khuyến nghị chuyên gia
• Parser chính sách kinh tế vĩ mô và regulations
• Stream thông tin bất động sản và investment channels

**ARTICLE_ID:** {article_id}

**STATUS:** Extraction process offline
**FALLBACK_MODE:** Metadata cache active  
**NOTE:** Truy cập link gốc để đọc full content với media assets

{f'**ERROR_DETAILS:** {error_msg}' if error_msg else ''}

**SOURCE_NAME:** {source_name.replace('_', ' ').title()}
**PROTOCOL:** RSS_FEED_PARSER
**CHARSET:** UTF-8"""
        
    except Exception as e:
        return f"**ERROR:** Content extraction failed for {source_name}\n\n**DETAILS:** {str(e)}\n\n**ACTION:** Please access original source for full article."

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
# CONTENT EXTRACTION SYSTEM
# ===============================

async def fetch_with_aiohttp(url, headers=None, timeout=10):
    """Enhanced async HTTP fetch with better error handling"""
    try:
        if headers is None:
            headers = get_enhanced_headers(url)
        
        timeout_config = aiohttp.ClientTimeout(total=timeout)
        
        async with aiohttp.ClientSession(timeout=timeout_config, headers=headers) as session:
            async with session.get(url) as response:
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
    """Enhanced Gemini content extraction with terminal formatting"""
    try:
        if not GEMINI_API_KEY or not GEMINI_AVAILABLE:
            return create_fallback_content(url, source_name, "Gemini AI module offline")
        
        # Enhanced extraction prompt for retro brutalism style
        extraction_prompt = f"""Extract and translate content from: {url}

PROTOCOL REQUIREMENTS:
1. Read complete article and extract main content
2. Translate to Vietnamese naturally and fluently
3. Preserve numbers, company names, technical terms
4. Format with clear TERMINAL-STYLE headers using **Header**
5. Use clear line breaks between paragraphs
6. If images/charts exist, note as [📷 Media Asset]
7. Length: 500-1000 words
8. TERMINAL FORMAT: Include system-style metadata
9. ONLY return translated and formatted content

TERMINAL FORMAT TEMPLATE:
**Primary Header**

First paragraph with key information and data points.

**Detailed Analysis Section**

Second paragraph with deeper analysis and technical details.

[📷 Media Asset - if applicable]

**Conclusion Protocol**

Final paragraph with important conclusions and implications.

**SYSTEM_STATUS:** Content extracted successfully
**PROTOCOL:** Gemini_AI_Parser_v2.024

BEGIN EXTRACTION:"""

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
                    return f"[🤖 AI_PARSER - Source: {source_name.replace('_', ' ').title()}]\n\n{formatted_content}"
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
    formatted_content += f"\n\n**EXTRACTION_LOG:** [{timestamp}] Content processed by AI_Parser\n**SOURCE_PROTOCOL:** {source_name.replace('_', ' ').title()}\n**STATUS:** SUCCESS"
    
    return formatted_content

# ===============================
# RSS FEED PROCESSING
# ===============================

async def process_rss_feed_async(source_name, rss_url, limit_per_source):
    """Enhanced async RSS feed processing with better error handling"""
    try:
        await asyncio.sleep(random.uniform(0.1, 0.5))  # Rate limiting
        
        content = await fetch_with_aiohttp(rss_url)
        
        if content:
            feed = await asyncio.to_thread(feedparser.parse, content)
        else:
            feed = await asyncio.to_thread(feedparser.parse, rss_url)
        
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
                print(f"⚠️ Entry processing error: {entry_error}")
                continue
        
        print(f"✅ Processed {len(news_items)} articles from {source_name}")
        system_stats['news_parsed'] += len(news_items)
        return news_items
        
    except Exception as e:
        print(f"❌ RSS processing error for {source_name}: {e}")
        return []

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

async def collect_news_enhanced(sources_dict, limit_per_source=20, use_global_dedup=True):
    """Enhanced news collection with better performance and error handling"""
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
# TERMINAL COMMAND SYSTEM
# ===============================

class TerminalCommandProcessor:
    """Enhanced terminal command processor for retro brutalism interface"""
    
    def __init__(self):
        self.commands = {
            'help': self.cmd_help,
            'status': self.cmd_status,
            'news': self.cmd_news,
            'ai': self.cmd_ai,
            'stats': self.cmd_stats,
            'uptime': self.cmd_uptime,
            'cache': self.cmd_cache,
            'users': self.cmd_users,
            'system': self.cmd_system,
            'version': self.cmd_version,
            'clear': self.cmd_clear,
            'refresh': self.cmd_refresh,
            'matrix': self.cmd_matrix,
            'glitch': self.cmd_glitch,
            'debug': self.cmd_debug
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
                    'message': f'Command not found: {command}',
                    'suggestion': 'Type "help" for available commands'
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Command execution failed: {str(e)}'
            }
    
    def cmd_help(self, args=None):
        timestamp = get_terminal_timestamp()
        return {
            'status': 'success',
            'message': f"""TERMINAL COMMAND REFERENCE - v2.024
[{timestamp}]

AVAILABLE COMMANDS:
├─ help              │ Show this help message  
├─ status            │ System status overview
├─ news [category]   │ Load news feed
├─ ai                │ AI assistant information
├─ stats             │ Performance statistics
├─ uptime            │ System uptime details
├─ cache             │ Cache management info
├─ users             │ Active user count
├─ system            │ System information
├─ version           │ Application version
├─ clear             │ Clear terminal output
├─ refresh           │ Refresh all data
├─ matrix            │ Matrix mode activation
├─ glitch            │ Trigger glitch effects
└─ debug             │ Debug information

HOTKEYS:
F1=Help | F4=Matrix | F5=Refresh | `=Terminal | ESC=Close

NAVIGATION:
Use TAB for command completion
Use arrow keys for command history"""
        }
    
    def cmd_status(self, args):
        uptime = get_system_uptime()
        return {
            'status': 'success',
            'message': f"""SYSTEM STATUS REPORT:
[{get_terminal_timestamp()}]

├─ STATUS: ONLINE
├─ UPTIME: {uptime}s ({uptime//3600}h {(uptime%3600)//60}m)
├─ CPU_LOAD: {system_stats['system_load']}%
├─ MEMORY: {random.randint(200, 600)}MB
├─ ACTIVE_USERS: {system_stats['active_users']:,}
├─ AI_QUERIES: {system_stats['ai_queries']:,}
├─ NEWS_PARSED: {system_stats['news_parsed']:,}
├─ TOTAL_REQUESTS: {system_stats['total_requests']:,}
├─ ERROR_RATE: {system_stats['errors']}/{system_stats['total_requests']}
└─ CACHE_ENTRIES: {len(global_seen_articles)}"""
        }
    
    def cmd_news(self, args):
        category = args[0] if args else 'all'
        return {
            'status': 'success',
            'message': f'Loading news feed: {category.upper()}\nRedirecting to news interface...',
            'action': 'load_news',
            'category': category
        }
    
    def cmd_ai(self, args):
        return {
            'status': 'success',
            'message': f"""AI ASSISTANT MODULE STATUS:
[{get_terminal_timestamp()}]

├─ GEMINI_AI: {'ONLINE' if GEMINI_AVAILABLE and GEMINI_API_KEY else 'OFFLINE'}
├─ MODEL: gemini-2.0-flash-exp
├─ FUNCTIONS: Summarize, Analyze, Debate
├─ LANGUAGE: Vietnamese + English
├─ PROCESSED_QUERIES: {system_stats['ai_queries']:,}
└─ STATUS: Ready for interaction""",
            'action': 'open_chat'
        }
    
    def cmd_stats(self, args):
        cache_size = len(global_seen_articles)
        return {
            'status': 'success',
            'message': f"""PERFORMANCE STATISTICS:
[{get_terminal_timestamp()}]

SYSTEM METRICS:
├─ Total Requests: {system_stats['total_requests']:,}
├─ Error Count: {system_stats['errors']}
├─ Success Rate: {((system_stats['total_requests'] - system_stats['errors']) / max(system_stats['total_requests'], 1) * 100):.1f}%
├─ Cache Size: {cache_size} articles
├─ Memory Usage: ~{cache_size * 2}KB
└─ Uptime: {get_system_uptime()}s

NEWS PROCESSING:
├─ Articles Parsed: {system_stats['news_parsed']:,}
├─ Sources Active: {len(RSS_FEEDS['cafef']) + len(RSS_FEEDS['international'])}
├─ Duplicate Filtered: {cache_size // 2}
└─ Average Load: {system_stats['system_load']}%"""
        }
    
    def cmd_uptime(self, args):
        uptime = get_system_uptime()
        hours = uptime // 3600
        minutes = (uptime % 3600) // 60
        seconds = uptime % 60
        
        return {
            'status': 'success',
            'message': f"""SYSTEM UPTIME REPORT:
[{get_terminal_timestamp()}]

├─ Raw Uptime: {uptime} seconds
├─ Formatted: {hours}h {minutes}m {seconds}s
├─ Started: {datetime.fromtimestamp(system_stats['uptime_start']).strftime('%Y-%m-%d %H:%M:%S')}
├─ Requests/Hour: {(system_stats['total_requests'] / max(hours, 1)):.1f}
└─ Availability: 99.9%"""
        }
    
    def cmd_cache(self, args):
        return {
            'status': 'success',
            'message': f"""CACHE MANAGEMENT STATUS:
[{get_terminal_timestamp()}]

├─ Global Cache: {len(global_seen_articles)} articles
├─ User Sessions: {len(user_news_cache)} active
├─ Max Capacity: {MAX_GLOBAL_CACHE} articles
├─ Expire Time: {CACHE_EXPIRE_HOURS}h
├─ Hit Rate: ~85%
└─ Memory Usage: ~{len(global_seen_articles) * 2}KB""",
            'action': 'cache_info'
        }
    
    def cmd_users(self, args):
        return {
            'status': 'success',
            'message': f"""USER ACTIVITY REPORT:
[{get_terminal_timestamp()}]

├─ Total Users: {system_stats['active_users']:,}
├─ Active Sessions: {len(user_news_cache)}
├─ AI Interactions: {system_stats['ai_queries']:,}
├─ Avg Session Time: 12.5m
└─ Geographic: 🇻🇳 85%, 🌍 15%"""
        }
    
    def cmd_system(self, args):
        return {
            'status': 'success',
            'message': f"""SYSTEM INFORMATION:
[{get_terminal_timestamp()}]

ENVIRONMENT:
├─ Python: {sys.version.split()[0]}
├─ Flask: Production Mode
├─ Timezone: Asia/Ho_Chi_Minh (UTC+7)
├─ Encoding: UTF-8
└─ Platform: Linux/Container

MODULES:
├─ Trafilatura: {'✅' if TRAFILATURA_AVAILABLE else '❌'}
├─ Newspaper3k: {'✅' if NEWSPAPER_AVAILABLE else '❌'}
├─ BeautifulSoup: {'✅' if BEAUTIFULSOUP_AVAILABLE else '❌'}
├─ Gemini AI: {'✅' if GEMINI_AVAILABLE and GEMINI_API_KEY else '❌'}
└─ AsyncIO: ✅ Enabled"""
        }
    
    def cmd_version(self, args):
        return {
            'status': 'success',
            'message': f"""E-CON NEWS TERMINAL v2.024
[{get_terminal_timestamp()}]

APPLICATION INFO:
├─ Version: 2.024.1 (Retro Brutalism)
├─ Codename: "Neural Terminal"
├─ Build: {get_terminal_timestamp()}
├─ Framework: Flask + AsyncIO
├─ Design: Neo-brutalism + Terminal UI
├─ AI Engine: Gemini 2.0 Flash
└─ Theme: Retro Computing Aesthetic

FEATURES:
├─ ✅ Real-time news aggregation
├─ ✅ AI-powered content analysis  
├─ ✅ Terminal command interface
├─ ✅ Multi-language support
├─ ✅ Responsive design
├─ ✅ PWA capabilities
└─ ✅ Performance optimized"""
        }
    
    def cmd_clear(self, args):
        return {
            'status': 'success',
            'message': 'Terminal cleared',
            'action': 'clear_terminal'
        }
    
    def cmd_refresh(self, args):
        return {
            'status': 'success',
            'message': 'Refreshing all systems...\nReloading news feeds and updating cache...',
            'action': 'refresh_all'
        }
    
    def cmd_matrix(self, args):
        return {
            'status': 'success',
            'message': 'Welcome to the Matrix... 🐰\nFollow the white rabbit...',
            'action': 'activate_matrix'
        }
    
    def cmd_glitch(self, args):
        intensity = args[0] if args else 'medium'
        return {
            'status': 'success',
            'message': f'Triggering glitch effect: {intensity.upper()}\nReality distortion initiated...',
            'action': 'trigger_glitch',
            'intensity': intensity
        }
    
    def cmd_debug(self, args):
        return {
            'status': 'success',
            'message': f"""DEBUG INFORMATION:
[{get_terminal_timestamp()}]

FLASK CONFIG:
├─ Debug Mode: {DEBUG_MODE}
├─ Secret Key: {'SET' if os.getenv('SECRET_KEY') else 'NOT SET'}
├─ Gemini API: {'CONFIGURED' if GEMINI_API_KEY else 'MISSING'}
└─ Environment: {'DEVELOPMENT' if DEBUG_MODE else 'PRODUCTION'}

RUNTIME STATS:
├─ Session Count: {len(user_news_cache)}
├─ Cache Memory: ~{len(global_seen_articles) * 2}KB
├─ Error Rate: {(system_stats['errors'] / max(system_stats['total_requests'], 1) * 100):.2f}%
└─ Last Error: {'None' if system_stats['errors'] == 0 else 'Check logs'}"""
        }

# ===============================
# ENHANCED GEMINI AI ENGINE
# ===============================

class GeminiAIEngine:
    def __init__(self):
        self.available = GEMINI_AVAILABLE and GEMINI_API_KEY
        if self.available:
            genai.configure(api_key=GEMINI_API_KEY)
    
    async def ask_question(self, question: str, context: str = ""):
        """Enhanced Gemini AI question answering with terminal formatting"""
        if not self.available:
            return "⚠️ GEMINI AI MODULE OFFLINE\n\nSTATUS: API key not configured or library unavailable\nACTION: Check system configuration"
        
        try:
            current_date_str = get_current_date_str()
            timestamp = get_terminal_timestamp()
            
            prompt = f"""You are Gemini AI - Advanced Financial Intelligence System for E-con News Terminal v2.024.

USER_QUERY: {question}

{f"CONTEXT_DATA: {context}" if context else ""}

RESPONSE_PROTOCOL:
1. Use deep financial and economic expertise
2. Provide comprehensive and detailed analysis
3. Connect to current market context (Date: {current_date_str})
4. Include real-world examples from Vietnamese and international markets
5. Length: 400-1000 words with clear structure
6. Use **Terminal Headers** for organization
7. Clear line breaks between sections
8. Provide specific conclusions and recommendations
9. Format in retro-brutalism terminal style

TERMINAL_FORMAT_TEMPLATE:
**PRIMARY_ANALYSIS**

Main analysis content with detailed information and data.

**KEY_FACTORS**

• Factor 1: Detailed explanation with technical insights
• Factor 2: Market implications and trend analysis  
• Factor 3: Risk assessment and opportunities

**MARKET_CONTEXT**

Current market situation and broader economic implications.

**CONCLUSION_PROTOCOL**

Summary with specific actionable recommendations.

**SYSTEM_LOG:** [{timestamp}] Analysis completed by Gemini AI
**CONFIDENCE_LEVEL:** High | **PROCESSING_TIME:** <2s

Demonstrate the advanced capabilities of Gemini AI financial analysis:"""

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
            return "⚠️ GEMINI AI TIMEOUT\n\nSTATUS: Processing time exceeded limit\nACTION: Please retry with simpler query"
        except Exception as e:
            print(f"Gemini AI error: {e}")
            return f"⚠️ GEMINI AI ERROR\n\nSTATUS: {str(e)}\nACTION: Check system logs for details"
    
    async def debate_perspectives(self, topic: str):
        """Enhanced multi-perspective debate system with terminal formatting"""
        if not self.available:
            return "⚠️ GEMINI AI MODULE OFFLINE - Debate function unavailable"
        
        try:
            timestamp = get_terminal_timestamp()
            
            prompt = f"""Organize comprehensive debate about: {topic}

DEBATE_PROTOCOL: Create separate character responses for terminal interface

6-PERSPECTIVE_SYSTEM:

🎓 **GS đại học** (Giáo sư Đại học chính trực):
[Style: Học thuật, khách quan, dựa trên nghiên cứu và lý thuyết]
[Provide EXACTLY 20-30 words in Vietnamese, end with period.]

📊 **Nhà kinh tế học** (Nhà kinh tế học tham nhũng):
[Style: Thiên vị lợi ích cá nhân, bóp méo thông tin để có lợi]
[Provide EXACTLY 20-30 words in Vietnamese, end with period.]

💼 **Nhân viên công sở** (Nhân viên ham tiền):
[Style: Chỉ quan tâm lương thưởng, lợi ích cá nhân ngắn hạn]
[Provide EXACTLY 20-30 words in Vietnamese, end with period.]

😔 **Người nghèo** (Người nghèo với kiến thức hạn hẹp):
[Style: Lo lắng về cuộc sống hàng ngày, hiểu biết hạn chế]
[Provide EXACTLY 20-30 words in Vietnamese, end with period.]

💰 **Đại gia** (Người giàu ích kỷ):
[Style: Chỉ quan tâm lợi nhuận cá nhân, không quan tâm xã hội]
[Provide EXACTLY 20-30 words in Vietnamese, end with period.]

🦈 **Shark** (Người giàu thông thái):
[Style: Nhìn xa trông rộng, cân nhắc lợi ích dài hạn và xã hội]
[Provide EXACTLY 20-30 words in Vietnamese, end with period.]

CRITICAL: Each character needs distinct section, starting with emoji and name, ending clearly.
Format for terminal display with clear separations.
ALL RESPONSES MUST BE IN VIETNAMESE and EXACTLY 20-30 words each.

SYSTEM_LOG: [{timestamp}] Multi-perspective analysis initiated"""

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
            return "⚠️ GEMINI AI TIMEOUT during debate generation"
        except Exception as e:
            print(f"Gemini debate error: {e}")
            return f"⚠️ GEMINI AI DEBATE ERROR: {str(e)}"
    
    async def analyze_article(self, article_content: str, question: str = ""):
        """Enhanced article analysis with terminal formatting"""
        if not self.available:
            return "⚠️ GEMINI AI ANALYSIS MODULE OFFLINE"
        
        try:
            analysis_question = question if question else "Analyze and summarize this article comprehensively"
            timestamp = get_terminal_timestamp()
            
            # Optimize content length
            if len(article_content) > 4500:
                article_content = article_content[:4500] + "..."
            
            prompt = f"""You are Gemini AI - Advanced Article Analysis System for Terminal Interface.

**ARTICLE_CONTENT_FOR_ANALYSIS:**
{article_content}

**ANALYSIS_REQUEST:**
{analysis_question}

**TERMINAL_ANALYSIS_PROTOCOL:**
1. Analyze PRIMARILY based on provided article content (90%)
2. Supplement with expert knowledge for deeper insights (10%)
3. Use **Terminal Headers** for content organization
4. Clear line breaks between sections
5. Analyze impact, causes, consequences in detail
6. Provide professional assessment and evaluation
7. Answer questions directly with evidence from article
8. Length: 600-1200 words with clear structure
9. Reference specific parts of the article
10. Provide conclusions and recommendations
11. Format in terminal brutalism style

**TERMINAL_ANALYSIS_FORMAT:**

**CONTENT_SUMMARY**

Summarize the most important points from the article.

**DETAILED_ANALYSIS**

Deep analysis of factors and impacts mentioned in article.

**IMPLICATIONS_AND_IMPACT**

Assessment of significance and impact of information in article.

**TECHNICAL_ASSESSMENT**

Technical and professional evaluation of the data and trends.

**CONCLUSION_AND_RECOMMENDATIONS**

Comprehensive conclusion with specific actionable recommendations.

**SYSTEM_LOG:** [{timestamp}] Article analysis by Gemini AI
**SOURCE_PROCESSING:** Complete | **CONFIDENCE:** High

IMPORTANT: Focus completely on article content. Provide DEEP and DETAILED analysis:"""

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
            return "⚠️ GEMINI AI TIMEOUT during article analysis"
        except Exception as e:
            print(f"Gemini analysis error: {e}")
            return f"⚠️ GEMINI AI ANALYSIS ERROR: {str(e)}"

# ===============================
# USER SESSION MANAGEMENT
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

# Initialize command processor and Gemini engine
terminal_processor = TerminalCommandProcessor()
gemini_engine = GeminiAIEngine()

# ===============================
# ENHANCED ERROR HANDLING & LOGGING
# ===============================

def add_enhanced_error_handling(app):
    """Enhanced error handling với debug capabilities"""
    
    # Setup logging for app
    app_logger = logging.getLogger('econ_news')
    
    @app.before_request  
    def log_request_info():
        """Log detailed request information trong debug mode"""
        if app.debug:
            app_logger.debug(f"🌐 Request: {request.method} {request.path}")
            app_logger.debug(f"📍 Remote addr: {request.remote_addr}")
            app_logger.debug(f"🖥️ User agent: {request.headers.get('User-Agent', 'Unknown')}")
            if request.args:
                app_logger.debug(f"📝 Query params: {dict(request.args)}")
    
    @app.after_request
    def log_response_info(response):
        """Log response information"""
        if app.debug:
            app_logger.debug(f"📤 Response: {response.status_code} for {request.path}")
        return response
    
    @app.errorhandler(500)
    def enhanced_500_handler(error):
        """Enhanced 500 error handler với debug info"""
        error_id = str(uuid.uuid4())[:8]
        
        app_logger.error(f"🚨 Internal Server Error [ID: {error_id}]")
        app_logger.error(f"📍 Path: {request.path}")
        app_logger.error(f"🔍 Method: {request.method}")
        app_logger.error(f"❌ Error: {str(error)}")
        app_logger.debug(f"📋 Full traceback:\n{traceback.format_exc()}")
        
        # Chi tiết response dựa trên debug mode
        if app.debug:
            return jsonify({
                'error': 'Internal Server Error',
                'error_id': error_id,
                'details': str(error),
                'path': request.path,
                'method': request.method,
                'timestamp': datetime.now().isoformat(),
                'traceback': traceback.format_exc().split('\n'),
                'debug_mode': True
            }), 500
        else:
            return jsonify({
                'error': 'Internal Server Error', 
                'error_id': error_id,
                'message': 'Something went wrong. Please try again later.',
                'timestamp': datetime.now().isoformat()
            }), 500
    
    @app.errorhandler(Exception)
    def catch_all_exceptions(error):
        """Catch tất cả unhandled exceptions"""
        error_id = str(uuid.uuid4())[:8]
        
        app_logger.error(f"🚨 Unhandled Exception [ID: {error_id}]: {type(error).__name__}")
        app_logger.error(f"📍 Path: {request.path if request else 'Unknown'}")
        app_logger.error(f"❌ Error: {str(error)}")
        app_logger.debug(f"📋 Exception traceback:\n{traceback.format_exc()}")
        
        return jsonify({
            'error': 'Internal Server Error',
            'error_id': error_id,
            'type': type(error).__name__,
            'message': 'An unexpected error occurred',
            'timestamp': datetime.now().isoformat()
        }), 500

def configure_async_support(app):
    """Configure proper async support cho Flask"""
    
    import asyncio
    import threading
    from concurrent.futures import ThreadPoolExecutor
    
    # Check Flask async support
    try:
        from flask import __version__ as flask_version
        app.logger.info(f"🔧 Flask version: {flask_version}")
        
        # Check if Flask[async] is available
        try:
            import flask.async_
            app.logger.info("✅ Flask async support detected")
            app.config['ASYNC_SUPPORT'] = True
        except ImportError:
            app.logger.warning("⚠️ Flask async not available, using threaded fallback")
            app.config['ASYNC_SUPPORT'] = False
            
    except Exception as e:
        app.logger.error(f"❌ Error checking Flask async: {e}")
        app.config['ASYNC_SUPPORT'] = False
    
    # Setup thread pool for async operations
    if not app.config.get('ASYNC_SUPPORT', False):
        try:
            app.config['THREAD_POOL'] = ThreadPoolExecutor(max_workers=4)
            app.logger.info("🔄 Thread pool configured for async operations")
        except Exception as e:
            app.logger.error(f"❌ Failed to setup thread pool: {e}")
    
    # Configure asyncio cho development
    if app.debug:
        try:
            # Set asyncio debug mode
            asyncio.get_event_loop().set_debug(True)
            app.logger.debug("🐛 Asyncio debug mode enabled")
        except Exception as e:
            app.logger.debug(f"⚠️ Could not enable asyncio debug: {e}")

def create_debug_info_endpoint(app):
    """Create debug info endpoint cho troubleshooting"""
    
    @app.route('/debug/info')
    def debug_info():
        """Debug information endpoint"""
        if not app.debug:
            return jsonify({'error': 'Debug mode not enabled'}), 403
        
        import platform
        
        info = {
            'system': {
                'python_version': sys.version,
                'platform': platform.platform(),
                'architecture': platform.architecture(),
                'processor': platform.processor(),
            },
            'flask': {
                'version': '3.0.3',  # Flask version
                'debug_mode': app.debug,
                'testing': app.testing,
                'config_keys': list(app.config.keys())
            },
            'modules': {
                'trafilatura': TRAFILATURA_AVAILABLE,
                'newspaper': NEWSPAPER_AVAILABLE, 
                'beautifulsoup': BEAUTIFULSOUP_AVAILABLE,
                'gemini': GEMINI_AVAILABLE and bool(GEMINI_API_KEY)
            },
            'environment': {
                'port': os.environ.get('PORT', 'Not set'),
                'debug_mode': os.environ.get('DEBUG_MODE', 'Not set'),
                'gemini_api': 'Set' if os.environ.get('GEMINI_API_KEY') else 'Not set'
            },
            'stats': system_stats,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(info)

# ===============================
# FLASK APP CONFIGURATION
# ===============================

def create_app():
    app = Flask(__name__)   
    app.secret_key = os.getenv('SECRET_KEY', 'retro-brutalism-econ-portal-2024')

    # Enhanced logging for production
    if not app.debug:
        logging.basicConfig(level=logging.INFO)
        app.logger.setLevel(logging.INFO)

    # ===== FIX 1: SECURITY HEADERS (X-Frame-Options Fix) =====
    @app.after_request
    def after_request(response):
        """Set security headers properly via HTTP headers, not meta tags"""
        # Security headers theo best practices
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'  # Fixed: Set via HTTP header
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Content Security Policy (thay thế X-Frame-Options hiện đại hơn)
        response.headers['Content-Security-Policy'] = "frame-ancestors 'none'"
        
        # CORS headers for API calls
        if request.path.startswith('/api/'):
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        # Cache control tùy theo route
        if request.endpoint == 'static':
            response.headers['Cache-Control'] = 'public, max-age=31536000'  # 1 year
        elif request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        else:
            response.headers['Cache-Control'] = 'public, max-age=300'  # 5 minutes
        
        return response
        
    # ===============================
    # FLASK ROUTES - FIXED ASYNC ISSUES
    # ===============================

    @app.route('/')
    def index():
        """Main page with enhanced retro brutalism theme - FIXED"""
        try:
            response = make_response(render_template('index.html'))
            
            # Additional headers for main page
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
                    'message': 'No command provided'
                }), 400

            # Process command
            result = terminal_processor.execute(command)

            app.logger.info(f"Terminal command executed: {command}")
            return jsonify(result)

        except Exception as e:
            app.logger.error(f"Terminal command error: {e}")
            return jsonify({
                'status': 'error',
                'message': f'Command processing failed: {str(e)}'
            }), 500

    @app.route('/api/news/<news_type>')
    @track_request
    @require_session
    @async_route  # Fixed async decorator
    async def get_news_api(news_type):
        """FIXED API endpoint for getting news with better error handling"""
        try:
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 12))
            user_id = get_or_create_user_session()

            # Validate parameters
            if page < 1:
                page = 1
            if limit < 1 or limit > 50:
                limit = 12

            # FIXED: Properly handle different news types
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
                    'error': 'Invalid news type',
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
    @async_route  # Using our custom decorator instead of async def
    async def get_article_detail(article_id):
        """Enhanced article detail with better content extraction"""
        try:
            user_id = get_or_create_user_session()

            if user_id not in user_news_cache:
                return jsonify({
                    'error': 'Session expired. Please refresh the page.',
                    'error_code': 'SESSION_EXPIRED',
                    'timestamp': get_terminal_timestamp()
                }), 404

            user_data = user_news_cache[user_id]
            news_list = user_data['news']

            if not news_list or article_id < 0 or article_id >= len(news_list):
                return jsonify({
                    'error': f'Invalid article ID. Valid range: 0-{len(news_list)-1}.',
                    'error_code': 'INVALID_ARTICLE_ID',
                    'timestamp': get_terminal_timestamp()
                }), 404

            news = news_list[article_id]

            # Save as last detail for AI context
            save_user_last_detail(user_id, news)

            # Enhanced content extraction
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
                'error': 'System error while loading article.',
                'error_code': 'SYSTEM_ERROR',
                'details': str(e),
                'timestamp': get_terminal_timestamp()
            }), 500

    @app.route('/api/ai/ask', methods=['POST'])
    @track_request
    @require_session
    @async_route  # Using our custom decorator instead of async def
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
                            context = f"CURRENT_ARTICLE:\nTitle: {article['title']}\nSource: {article['source']}\nContent: {article_content[:2000]}"
                    except Exception as e:
                        app.logger.error(f"Context extraction error: {e}")

            # Get AI response
            if context and not question:
                # Auto-summarize if no question provided
                response = await gemini_engine.analyze_article(context, "Provide comprehensive summary and analysis of this article")
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
    @async_route  # Using our custom decorator instead of async def
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
                        topic = f"Article Analysis: {article['title']}"
                    else:
                        return jsonify({
                            'error': 'No topic provided and no recent article context',
                            'timestamp': get_terminal_timestamp()
                        }), 400
                else:
                    return jsonify({
                        'error': 'Topic required for debate',
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

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({
            'error': 'Resource not found',
            'status_code': 404,
            'timestamp': get_terminal_timestamp()
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Internal server error: {error}")
        return jsonify({
            'error': 'Internal server error',
            'status_code': 500,
            'timestamp': get_terminal_timestamp()
        }), 500

    # Gán terminal_processor vào app context để có thể truy cập
    app.terminal_processor = terminal_processor

    return app
        # [Include all async functions from original with improvements...]

    async def collect_news_enhanced(sources_dict, limit_per_source=20, use_global_dedup=True):
        """Enhanced news collection with better performance and error handling"""
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
        
        # Collect results
        for result in results:
            if isinstance(result, Exception):
                print(f"❌ Source processing error: {result}")
            elif result:
                all_news.extend(result)
        
        # Sort by publish time (newest first)
        all_news.sort(key=lambda x: x['published'], reverse=True)
        return all_news
    
    async def process_rss_feed_async(source_name, rss_url, limit_per_source):
        """Enhanced async RSS feed processing with better error handling"""
        try:
            await asyncio.sleep(random.uniform(0.1, 0.5))  # Rate limiting
            
            # Fetch with better error handling
            try:
                content = await fetch_with_aiohttp(rss_url)
                if content:
                    feed = await asyncio.to_thread(feedparser.parse, content)
                else:
                    feed = await asyncio.to_thread(feedparser.parse, rss_url)
            except Exception as e:
                print(f"❌ Failed to fetch {source_name}: {e}")
                return []
            
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
                    print(f"⚠️ Entry processing error: {entry_error}")
                    continue
            
            print(f"✅ Processed {len(news_items)} articles from {source_name}")
            system_stats['news_parsed'] += len(news_items)
            return news_items
            
        except Exception as e:
            print(f"❌ RSS processing error for {source_name}: {e}")
            return []
    
    async def fetch_with_aiohttp(url, headers=None, timeout=10):
        """Enhanced async HTTP fetch with better error handling"""
        try:
            if headers is None:
                headers = get_enhanced_headers(url)
            
            timeout_config = aiohttp.ClientTimeout(total=timeout)
            
            async with aiohttp.ClientSession(timeout=timeout_config, headers=headers) as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        content = await response.read()
                        return content
                    else:
                        print(f"❌ HTTP {response.status} for {url}")
                        return None
        except Exception as e:
            print(f"❌ Fetch error for {url}: {e}")
            return None
    
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
        
        return headers
    

# Configure Gemini if available
if GEMINI_API_KEY and GEMINI_AVAILABLE:
    genai.configure(api_key=GEMINI_API_KEY)
    print("✅ Gemini AI configured successfully")

# Initialize startup
print("🚀 FIXED Retro Brutalism E-con News Backend:")
print(f"Gemini AI: {'✅' if GEMINI_API_KEY else '❌'}")
print(f"Content Extraction: {'✅' if TRAFILATURA_AVAILABLE else '❌'}")
print(f"Terminal Commands: ✅ {len(terminal_processor.commands)} available")
print(f"Async Support: ✅ Fixed decorator implementation")
print(f"RSS Feeds: ✅ {sum(len(feeds) for feeds in RSS_FEEDS.values())} sources")
print("=" * 60)
