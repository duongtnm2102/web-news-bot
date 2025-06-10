from flask import Flask, render_template, request, jsonify, session
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
from enum import Enum
from typing import List, Dict, Tuple, Optional
import random
import hashlib
import uuid

# 🚀 OPTIMIZED LIBRARIES - Enhanced for async operations
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

# 🆕 GEMINI ONLY - Enhanced AI System with Direct Content Access
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# Flask app configuration
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

# 🔒 ENVIRONMENT VARIABLES
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# 🔧 TIMEZONE - Vietnam
VN_TIMEZONE = pytz.timezone('Asia/Ho_Chi_Minh')
UTC_TIMEZONE = pytz.UTC

# User cache with deduplication
user_news_cache = {}
user_last_detail_cache = {}
global_seen_articles = {}  # Global deduplication cache
MAX_CACHE_ENTRIES = 25
MAX_GLOBAL_CACHE = 1000
CACHE_EXPIRE_HOURS = 24

# 🔧 Enhanced User Agents for better compatibility
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

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

print("🚀 Flask News App:")
print(f"Gemini: {'✅' if GEMINI_API_KEY else '❌'}")
print("=" * 20)

# 🔧 FREE RSS FEEDS ONLY - Removed ALL Paywall Sources 2025
RSS_FEEDS = {
    # === KINH TẾ TRONG NƯỚC - CHỈ CAFEF ===
    'domestic': {
        'cafef_chungkhoan': 'https://cafef.vn/thi-truong-chung-khoan.rss',
        'cafef_batdongsan': 'https://cafef.vn/bat-dong-san.rss',
        'cafef_taichinh': 'https://cafef.vn/tai-chinh-ngan-hang.rss',
        'cafef_vimo': 'https://cafef.vn/vi-mo-dau-tu.rss',
        'cafef_doanhnghiep': 'https://cafef.vn/doanh-nghiep.rss'
    },
    
    # === QUỐC TẾ - ONLY FREE RSS SOURCES (NO PAYWALL) ===
    'international': {
        # ✅ YAHOO FINANCE RSS (100% Free)
        'yahoo_finance_main': 'https://finance.yahoo.com/news/rssindex',
        'yahoo_finance_headlines': 'https://feeds.finance.yahoo.com/rss/2.0/headline',
        'yahoo_finance_rss': 'https://www.yahoo.com/news/rss/finance',
        
        # ✅ FREE NEWS RSS FEEDS (NO PAYWALL - Verified 2025)
        'cnn_money': 'http://rss.cnn.com/rss/money_topstories.rss',
        'marketwatch_latest': 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
        'business_insider': 'http://feeds2.feedburner.com/businessinsider',
        'cnbc': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        'investing_com': 'https://www.investing.com/rss/news.rss',
        'reuters_business': 'https://feeds.reuters.com/reuters/businessNews',
        'bbc_business': 'http://feeds.bbci.co.uk/news/business/rss.xml',
        'guardian_business': 'https://www.theguardian.com/business/economics/rss',
        'coindesk': 'https://feeds.feedburner.com/CoinDesk',
        'nasdaq_news': 'http://articlefeeds.nasdaq.com/nasdaq/categories?category=Investing+Ideas',
        
        # ✅ FREE ALTERNATIVE SOURCES (Working 2025)
        'seeking_alpha': 'https://seekingalpha.com/feed.xml',
        'benzinga': 'https://www.benzinga.com/feed',
        'motley_fool': 'https://www.fool.com/feeds/index.aspx?format=rsslink&culture=en-us',
    }
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
    import re
    # Convert to lowercase and remove extra spaces
    normalized = re.sub(r'\s+', ' ', title.lower().strip())
    # Remove common punctuation that might vary
    normalized = re.sub(r'[.,!?;:\-\u2013\u2014]', '', normalized)
    # Remove quotes that might vary
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

def is_duplicate_article_local(news_item, existing_articles):
    """Check duplicate within current collection - EXACT TITLE MATCH ONLY"""
    current_title = normalize_title(news_item['title'])
    current_link = news_item['link'].lower().strip()
    
    for existing in existing_articles:
        existing_title = normalize_title(existing['title'])
        existing_link = existing['link'].lower().strip()
        
        # Check exact title match OR exact link match
        if current_title == existing_title or current_link == existing_link:
            return True
    
    return False

def is_duplicate_article_global(news_item, source_name):
    """Check duplicate against global cache - EXACT TITLE MATCH ONLY"""
    global global_seen_articles
    
    try:
        # Clean expired cache first
        clean_expired_cache()
        
        current_title = normalize_title(news_item['title'])
        current_link = news_item['link'].lower().strip()
        
        # Check against global cache - EXACT matches only
        for existing_data in global_seen_articles.values():
            existing_title = normalize_title(existing_data['title'])
            existing_link = existing_data['link'].lower().strip()
            
            if current_title == existing_title or current_link == existing_link:
                return True
        
        # Add to global cache using simple key
        cache_key = f"{current_title}|{current_link}"
        
        global_seen_articles[cache_key] = {
            'title': news_item['title'],
            'link': news_item['link'],
            'source': source_name,
            'timestamp': get_current_vietnam_datetime()
        }
        
        # Limit cache size
        if len(global_seen_articles) > MAX_GLOBAL_CACHE:
            sorted_items = sorted(global_seen_articles.items(), key=lambda x: x[1]['timestamp'])
            for old_key, _ in sorted_items[:100]:
                del global_seen_articles[old_key]
        
        return False
        
    except Exception as e:
        print(f"⚠️ Global duplicate check error: {e}")
        return False

# 🚀 ASYNC HTTP CLIENT - NO MORE BLOCKING REQUESTS
async def fetch_with_aiohttp(url, headers=None, timeout=8):
    """FIXED: Use aiohttp instead of requests to prevent blocking"""
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
                    return None
    except Exception as e:
        print(f"❌ aiohttp fetch error for {url}: {e}")
        return None

def get_enhanced_headers(url=None):
    """Enhanced headers for better compatibility - NO BROTLI"""
    user_agent = random.choice(USER_AGENTS)
    
    headers = {
        'User-Agent': user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
        'Accept-Encoding': 'gzip, deflate',  # Removed 'br' to avoid brotli errors
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'DNT': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    }
    
    if url and 'yahoo' in url.lower():
        headers.update({
            'Referer': 'https://finance.yahoo.com/',
            'Origin': 'https://finance.yahoo.com',
        })
    elif url and 'cafef.vn' in url.lower():
        headers.update({
            'Referer': 'https://cafef.vn/',
            'Origin': 'https://cafef.vn'
        })
    
    return headers

def is_international_source(source_name):
    """Check if source is international - UPDATED for new sources"""
    international_sources = [
        'yahoo_finance', 'cnn_money', 'marketwatch_latest', 'business_insider',
        'cnbc', 'investing_com', 'reuters_business', 'bbc_business',
        'guardian_business', 'coindesk', 'nasdaq_news', 'seeking_alpha', 'benzinga', 'motley_fool'
    ]
    return any(source in source_name for source in international_sources)

def create_fallback_content(url, source_name, error_msg=""):
    """Create fallback content when extraction fails"""
    try:
        article_id = url.split('/')[-1] if '/' in url else 'news-article'
        
        if is_international_source(source_name):
            source_display = "Financial News"
            if 'marketwatch' in source_name:
                source_display = "MarketWatch"
            elif 'reuters' in source_name:
                source_display = "Reuters"
            elif 'cnn' in source_name:
                source_display = "CNN Money"
            elif 'cnbc' in source_name:
                source_display = "CNBC"
            elif 'bbc' in source_name:
                source_display = "BBC Business"
            elif 'motley_fool' in source_name:
                source_display = "Motley Fool"
            
            return f"""**{source_display} Financial News:**

📈 **Market Analysis:** This article provides financial market insights and economic analysis.

📊 **Coverage Areas:**
• Real-time market data and analysis
• Economic indicators and trends
• Corporate earnings and reports
• Investment strategies and forecasts

**Article ID:** {article_id}
**Note:** Content extraction failed. Please visit the original link for complete article.

{f'**Technical Error:** {error_msg}' if error_msg else ''}"""
        else:
            # Enhanced fallback for CafeF with more details
            return f"""**Tin tức kinh tế CafeF:**

📰 **Thông tin kinh tế:** Bài viết cung cấp thông tin kinh tế, tài chính từ CafeF.

📊 **Nội dung chuyên sâu:**
• Phân tích thị trường chứng khoán Việt Nam  
• Tin tức kinh tế vĩ mô và chính sách
• Báo cáo doanh nghiệp và tài chính
• Bất động sản và đầu tư

**🔍 Chi tiết bài viết:**
Đây là bài viết từ {source_name.replace('cafef_', 'CafeF ')} với nhiều thông tin hữu ích về thị trường tài chính Việt Nam. 

**💡 Nội dung bao gồm:**
- Phân tích chuyên sâu từ các chuyên gia
- Số liệu và biểu đồ cập nhật
- Dự báo xu hướng thị trường
- Khuyến nghị đầu tư

**📱 Lưu ý:** Để đọc đầy đủ bài viết với hình ảnh và biểu đồ, vui lòng truy cập link gốc bên dưới.

**Mã bài viết:** {article_id}

{f'**Thông tin kỹ thuật:** {error_msg}' if error_msg else ''}"""
        
    except Exception as e:
        return f"Nội dung từ {source_name}. Vui lòng truy cập link gốc để đọc đầy đủ."y đủ, vui lòng truy cập link gốc.

{f'**Lỗi:** {error_msg}' if error_msg else ''}"""
        
    except Exception as e:
        return f"Nội dung từ {source_name}. Vui lòng truy cập link gốc để đọc đầy đủ."

async def extract_content_with_gemini(url, source_name):
    """Use Gemini to extract and translate content from international news"""
    try:
        if not GEMINI_API_KEY or not GEMINI_AVAILABLE:
            return create_fallback_content(url, source_name, "Gemini không khả dụng")
        
        extraction_prompt = f"""Truy cập và trích xuất TOÀN BỘ nội dung bài báo từ: {url}

YÊU CẦU:
1. Đọc và hiểu HOÀN TOÀN bài báo
2. Trích xuất TẤT CẢ nội dung chính (loại bỏ quảng cáo, sidebar)
3. Dịch từ tiếng Anh sang tiếng Việt TỰ NHIÊN
4. Giữ nguyên số liệu, tên công ty, thuật ngữ tài chính
5. Độ dài: 500-1500 từ (toàn bộ bài viết)
6. CHỈ trả về nội dung bài báo đã dịch

**NỘI DUNG HOÀN CHỈNH:**"""

        try:
            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.1,
                top_p=0.8,
                max_output_tokens=3000,  # Tăng từ 2000 để lấy toàn bộ nội dung
            )
            
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    extraction_prompt,
                    generation_config=generation_config
                ),
                timeout=30  # Tăng timeout từ 20s
            )
            
            extracted_content = response.text.strip()
            
            if len(extracted_content) > 300:
                error_indicators = [
                    'cannot access', 'unable to access', 'không thể truy cập',
                    'failed to retrieve', 'error occurred', 'sorry, i cannot'
                ]
                
                if not any(indicator in extracted_content.lower() for indicator in error_indicators):
                    return f"[🤖 Gemini AI - Toàn bộ nội dung từ {source_name}]\n\n{extracted_content}"
                else:
                    return create_fallback_content(url, source_name, "Gemini không thể trích xuất")
            else:
                return create_fallback_content(url, source_name, "Nội dung quá ngắn")
            
        except asyncio.TimeoutError:
            return create_fallback_content(url, source_name, "Gemini timeout")
        except Exception as e:
            return create_fallback_content(url, source_name, f"Lỗi Gemini: {str(e)}")
            
    except Exception as e:
        return create_fallback_content(url, source_name, str(e))

# 🚀 ASYNC-FIRST APPROACHES - NO MORE BLOCKING
async def async_sleep_delay():
    """FIXED: Use asyncio.sleep instead of time.sleep to prevent heartbeat blocking"""
    delay = random.uniform(0.1, 0.5)  # Much shorter delay
    await asyncio.sleep(delay)

def clean_content_enhanced(content):
    """Enhanced content cleaning for CafeF"""
    if not content:
        return content
    
    unwanted_patterns = [
        r'Theo.*?CafeF.*?',
        r'Nguồn.*?:.*?',
        r'Tags:.*?$',
        r'Từ khóa:.*?$',
        r'Đăng ký.*?nhận tin.*?',
        r'Like.*?Fanpage.*?',
        r'Follow.*?us.*?'
    ]
    
    for pattern in unwanted_patterns:
        content = re.sub(pattern, '', content, flags=re.IGNORECASE | re.DOTALL)
    
    content = re.sub(r'\s+', ' ', content)
    content = re.sub(r'\n\s*\n', '\n', content)
    
    return content.strip()

# 🚀 ASYNC CONTENT EXTRACTION - Non-blocking
async def extract_content_enhanced(url, source_name, news_item=None):
    """Enhanced content extraction - Gemini for international, traditional for domestic"""
    
    # For international sources, use Gemini
    if is_international_source(source_name):
        print(f"🤖 Using Gemini for international source: {source_name}")
        return await extract_content_with_gemini(url, source_name)
    
    # For domestic (CafeF) sources, use traditional async methods
    try:
        print(f"🔧 Using async traditional methods for domestic source: {source_name}")
        await async_sleep_delay()
        
        content = await fetch_with_aiohttp(url)
        
        if content:
            # Method 1: Trafilatura with enhanced config for full content
            if TRAFILATURA_AVAILABLE:
                try:
                    result = await asyncio.to_thread(
                        trafilatura.bare_extraction,
                        content,
                        include_comments=False,
                        include_tables=True,
                        include_links=False,
                        include_images=False,
                        favor_precision=False,  # Changed to False for more content
                        favor_recall=True,      # Added for maximum content
                        with_metadata=True,
                        prune_xpath=[],         # Don't prune anything
                        only_with_metadata=False
                    )
                    
                    if result and result.get('text') and len(result['text']) > 200:
                        full_text = result['text']
                        
                        # Try to get more content with different settings
                        if len(full_text) < 1000:
                            result2 = await asyncio.to_thread(
                                trafilatura.extract,
                                content,
                                include_comments=True,
                                include_tables=True,
                                include_links=True,
                                favor_precision=False,
                                favor_recall=True
                            )
                            if result2 and len(result2) > len(full_text):
                                full_text = result2
                        
                        return full_text.strip()
                except Exception as e:
                    print(f"⚠️ Trafilatura failed: {e}")
            
            # Method 2: Enhanced BeautifulSoup with multiple strategies
            if BEAUTIFULSOUP_AVAILABLE:
                try:
                    soup = await asyncio.to_thread(BeautifulSoup, content, 'html.parser')
                    
                    # Strategy 1: CafeF specific selectors
                    content_selectors = [
                        'div.detail-content',
                        'div.fck_detail', 
                        'div.content-detail',
                        'div.article-content',
                        'div.entry-content',
                        'div.post-content',
                        'article',
                        'main',
                        '.article-body',
                        '.content-body',
                        '.post-body'
                    ]
                    
                    extracted_text = ""
                    for selector in content_selectors:
                        elements = soup.select(selector)
                        if elements:
                            for element in elements:
                                text = element.get_text(strip=True)
                                if len(text) > len(extracted_text):
                                    extracted_text = text
                    
                    # Strategy 2: Find all paragraphs and combine
                    if len(extracted_text) < 500:
                        all_paragraphs = soup.find_all('p')
                        paragraph_texts = []
                        for p in all_paragraphs:
                            p_text = p.get_text(strip=True)
                            if len(p_text) > 50:  # Only substantial paragraphs
                                paragraph_texts.append(p_text)
                        
                        combined_text = '\n\n'.join(paragraph_texts)
                        if len(combined_text) > len(extracted_text):
                            extracted_text = combined_text
                    
                    if extracted_text and len(extracted_text) > 300:
                        cleaned_content = clean_content_enhanced(extracted_text)
                        return cleaned_content.strip()
                        
                except Exception as e:
                    print(f"⚠️ BeautifulSoup failed: {e}")
            
            # Method 3: Newspaper3k fallback
            if NEWSPAPER_AVAILABLE:
                try:
                    from newspaper import Article
                    article = Article(url)
                    article.set_config({
                        'headers': get_enhanced_headers(url),
                        'timeout': 12
                    })
                    
                    article.download()
                    article.parse()
                    
                    if article.text and len(article.text) > 300:
                        return article.text.strip()
                
                except Exception as e:
                    print(f"⚠️ Newspaper3k failed: {e}")
        
        print(f"⚠️ All traditional methods failed for {source_name}")
        return create_fallback_content(url, source_name, "Traditional extraction methods failed")
        
    except Exception as e:
        print(f"❌ Extract content error for {source_name}: {e}")
        return create_fallback_content(url, source_name, str(e))

async def process_rss_feed_async(source_name, rss_url, limit_per_source):
    """FIXED: Async RSS feed processing to prevent blocking"""
    try:
        await async_sleep_delay()
        
        # Use aiohttp instead of requests
        content = await fetch_with_aiohttp(rss_url)
        
        if content:
            # Parse feedparser in thread to avoid blocking
            feed = await asyncio.to_thread(feedparser.parse, content)
        else:
            # Fallback to direct feedparser
            feed = await asyncio.to_thread(feedparser.parse, rss_url)
        
        if not feed or not hasattr(feed, 'entries') or len(feed.entries) == 0:
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
                    description = entry.summary[:400] + "..." if len(entry.summary) > 400 else entry.summary
                elif hasattr(entry, 'description'):
                    description = entry.description[:400] + "..." if len(entry.description) > 400 else entry.description
                
                if hasattr(entry, 'title') and hasattr(entry, 'link'):
                    title = entry.title.strip()
                    
                    # Filter for relevant economic/financial content
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
                continue
        
        print(f"✅ Processed {len(news_items)} articles from {source_name}")
        return news_items
        
    except Exception as e:
        print(f"❌ RSS processing error for {source_name}: {e}")
        return []

def is_relevant_news(title, description, source_name):
    """Filter for relevant economic/financial news - MORE RELAXED"""
    # For CafeF sources, all content is relevant
    if 'cafef' in source_name:
        return True
    
    # For international sources, use very relaxed filter
    financial_keywords = [
        'stock', 'market', 'trading', 'investment', 'economy', 'economic',
        'bitcoin', 'crypto', 'currency', 'bank', 'financial', 'finance',
        'earnings', 'revenue', 'profit', 'inflation', 'fed', 'gdp',
        'business', 'company', 'corporate', 'industry', 'sector',
        'money', 'cash', 'capital', 'fund', 'price', 'cost', 'value',
        'growth', 'analyst', 'forecast', 'report', 'data', 'sales'
    ]
    
    title_lower = title.lower()
    description_lower = description.lower() if description else ""
    
    # Check in both title and description
    for keyword in financial_keywords:
        if keyword in title_lower or keyword in description_lower:
            return True
    
    # If no keywords found, still include (very relaxed)
    return True  # Changed from False to True - accept all articles

async def process_single_source(source_name, source_url, limit_per_source):
    """Process a single RSS source asynchronously"""
    try:
        print(f"🔄 Processing {source_name}: {source_url}")
        
        if source_url.endswith('.rss') or 'rss' in source_url.lower() or 'feeds.' in source_url:
            # RSS Feed processing
            return await process_rss_feed_async(source_name, source_url, limit_per_source)
        else:
            # For future expansion - direct scraping
            return []
            
    except Exception as e:
        print(f"❌ Error for {source_name}: {e}")
        return []

# 🚀 ASYNC NEWS COLLECTION - Fully non-blocking
async def collect_news_enhanced(sources_dict, limit_per_source=15, use_global_dedup=False):
    """Session-based collection with EXACT TITLE duplicate detection"""
    all_news = []
    
    print(f"🔄 Starting collection from {len(sources_dict)} sources (Global dedup: {use_global_dedup})")
    print(f"🎯 Duplicate logic: EXACT title match only")
    
    # Clean expired cache before starting
    if use_global_dedup:
        clean_expired_cache()
    
    # Create tasks for concurrent processing
    tasks = []
    for source_name, source_url in sources_dict.items():
        task = process_single_source(source_name, source_url, limit_per_source)
        tasks.append(task)
    
    # Process all sources concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Collect results with exact title duplicate detection
    total_processed = 0
    local_duplicates = 0
    global_duplicates = 0
    
    for result in results:
        if isinstance(result, Exception):
            print(f"❌ Source processing error: {result}")
        elif result:
            for news_item in result:
                total_processed += 1
                
                # Local duplicate check (exact title/link match within current collection)
                if is_duplicate_article_local(news_item, all_news):
                    local_duplicates += 1
                    print(f"🔄 Local duplicate: {news_item['title'][:50]}...")
                    continue
                
                # Global duplicate check (exact title/link match cross-session) - only if enabled
                if use_global_dedup and is_duplicate_article_global(news_item, news_item['source']):
                    global_duplicates += 1
                    print(f"🌍 Global duplicate: {news_item['title'][:50]}...")
                    continue
                
                # Add unique article
                all_news.append(news_item)
    
    unique_count = len(all_news)
    print(f"📊 Processed: {total_processed}, Local dups: {local_duplicates}, Global dups: {global_duplicates}, Unique: {unique_count}")
    
    # Sort by publish time
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
        'news': news_list,  # Full news list
        'command': command_type,
        'current_page': current_page,
        'timestamp': get_current_vietnam_datetime()
    }
    
    if len(user_news_cache) > MAX_CACHE_ENTRIES:
        oldest_users = sorted(user_news_cache.items(), key=lambda x: x[1]['timestamp'])[:10]
        for user_id_to_remove, _ in oldest_users:
            del user_news_cache[user_id_to_remove]

def save_user_last_detail(user_id, news_item):
    """Save last article accessed via !chitiet"""
    global user_last_detail_cache
    
    user_last_detail_cache[user_id] = {
        'article': news_item,
        'timestamp': get_current_vietnam_datetime()
    }

# 🆕 GEMINI AI SYSTEM
class GeminiAIEngine:
    def __init__(self):
        self.available = GEMINI_AVAILABLE and GEMINI_API_KEY
        if self.available:
            genai.configure(api_key=GEMINI_API_KEY)
    
    async def ask_question(self, question: str, context: str = ""):
        """Gemini AI question answering with context"""
        if not self.available:
            return "⚠️ Gemini AI không khả dụng. Vui lòng kiểm tra GEMINI_API_KEY."
        
        try:
            current_date_str = get_current_date_str()
            
            prompt = f"""Bạn là Gemini AI - chuyên gia kinh tế tài chính thông minh. Hãy trả lời câu hỏi dựa trên kiến thức chuyên môn của bạn.

CÂU HỎI: {question}

{f"BỐI CẢNH THÊM: {context}" if context else ""}

HƯỚNG DẪN TRẢ LỜI:
1. Sử dụng kiến thức chuyên môn sâu rộng của bạn
2. Đưa ra phân tích chuyên sâu và toàn diện
3. Kết nối với bối cảnh kinh tế hiện tại (ngày {current_date_str})
4. Đưa ra ví dụ thực tế và minh họa cụ thể
5. Độ dài: 400-800 từ với cấu trúc rõ ràng
6. Sử dụng đầu mục số để tổ chức nội dung

Hãy thể hiện trí thông minh và kiến thức chuyên sâu của Gemini AI:"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.2,
                top_p=0.8,
                max_output_tokens=1500,
            )
            
            print(f"🤖 Calling Gemini API for question: {question[:50]}...")
            
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=generation_config
                ),
                timeout=15
            )
            
            print("✅ Gemini API response received")
            return response.text.strip()
            
        except asyncio.TimeoutError:
            print("⏰ Gemini API timeout")
            return "⚠️ Gemini AI timeout. Vui lòng thử lại."
        except Exception as e:
            print(f"❌ Gemini API error: {str(e)}")
            return f"⚠️ Lỗi Gemini AI: {str(e)}"
    
    async def debate_perspectives(self, topic: str):
        """Multi-perspective debate system"""
        if not self.available:
            return "⚠️ Gemini AI không khả dụng. Vui lòng kiểm tra GEMINI_API_KEY."
        
        try:
            # Use safe string formatting to avoid emoji syntax errors
            emoji_corrupt = "\U0001F4B8"  # 💸
            emoji_teacher = "\U0001F468\u200D\U0001F3EB"  # 👨‍🏫  
            emoji_worker = "\U0001F4BC"  # 💼
            emoji_angry = "\U0001F620"  # 😠
            emoji_rich_selfish = "\U0001F911"  # 🤑
            emoji_rich_wise = "\U0001F9E0"  # 🧠
            emoji_robot = "\U0001F916"  # 🤖
            
            prompt = f"""Tổ chức cuộc tranh luận về: {topic}

6 quan điểm khác nhau:
{emoji_corrupt} **Nhà KT Tham Nhũng:** [ích kỷ, bóp méo số liệu]
{emoji_teacher} **GS Chính Trực:** [học thuật, đạo đức cao]  
{emoji_worker} **Nhân Viên Ham Tiền:** [chỉ quan tâm lương]
{emoji_angry} **Người Nghèo:** [đổ lỗi, thiếu hiểu biết]
{emoji_rich_selfish} **Người Giàu Ích Kỷ:** [chỉ tìm lợi nhuận]
{emoji_rich_wise} **Người Giàu Thông Thái:** [tầm nhìn xa]
{emoji_robot} **Tổng Kết:** [phân tích khách quan]

Mỗi góc nhìn 80-120 từ, thể hiện rõ tính cách:"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.4,
                top_p=0.9,
                max_output_tokens=1500,
            )
            
            print(f"🎭 Calling Gemini API for debate: {topic[:50]}...")
            
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=generation_config
                ),
                timeout=20
            )
            
            print("✅ Gemini API debate response received")
            return response.text.strip()
            
        except asyncio.TimeoutError:
            print("⏰ Gemini API debate timeout")
            return "⚠️ Gemini AI timeout."
        except Exception as e:
            print(f"❌ Gemini API debate error: {str(e)}")
            return f"⚠️ Lỗi Gemini AI: {str(e)}"
    
    async def analyze_article(self, article_content: str, question: str = ""):
        """Analyze specific article with Gemini - Vietnamese response"""
        if not self.available:
            return "Gemini AI không khả dụng cho phân tích bài báo."
        
        try:
            analysis_question = question if question else "Hãy phân tích và tóm tắt bài báo này"
            
            prompt = f"""Bạn là Gemini AI - chuyên gia kinh tế tài chính thông minh. Hãy phân tích bài báo dựa trên nội dung hoàn chỉnh được cung cấp.

NỘI DUNG BÀI BÁO HOÀN CHỈNH:
{article_content}

YÊU CẦU PHÂN TÍCH:
{analysis_question}

HƯỚNG DẪN PHÂN TÍCH:
1. Phân tích chủ yếu dựa trên nội dung bài báo (85-90%)
2. Kết hợp kiến thức chuyên môn để giải thích sâu hơn (10-15%)
3. Phân tích tác động, nguyên nhân, hậu quả
4. Đưa ra nhận định và đánh giá chuyên sâu
5. Trả lời câu hỏi trực tiếp với bằng chứng từ bài báo
6. Độ dài: 600-1000 từ với cấu trúc rõ ràng
7. Tham chiếu các phần cụ thể trong bài báo
8. CHỈ phân tích bài báo được cung cấp

Tập trung hoàn toàn vào nội dung từ bài báo đã cung cấp. Đưa ra phân tích thông minh và chi tiết bằng tiếng Việt:"""

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
                timeout=20
            )
            
            return response.text.strip()
            
        except asyncio.TimeoutError:
            return "Gemini AI timeout khi phân tích bài báo."
        except Exception as e:
            return f"Lỗi Gemini AI: {str(e)}"

# Initialize Gemini Engine
gemini_engine = GeminiAIEngine()

# Source names mapping for display
source_names = {
    # CafeF sources
    'cafef_chungkhoan': 'CafeF CK', 'cafef_batdongsan': 'CafeF BĐS',
    'cafef_taichinh': 'CafeF TC', 'cafef_vimo': 'CafeF VM', 'cafef_doanhnghiep': 'CafeF DN',
    
    # FREE international sources - UPDATED
    'yahoo_finance_main': 'Yahoo RSS', 'yahoo_finance_headlines': 'Yahoo Headlines',
    'yahoo_finance_rss': 'Yahoo Finance', 'cnn_money': 'CNN Money', 
    'marketwatch_latest': 'MarketWatch', 'business_insider': 'Business Insider',
    'cnbc': 'CNBC', 'investing_com': 'Investing.com', 
    'reuters_business': 'Reuters Business', 'bbc_business': 'BBC Business', 
    'guardian_business': 'The Guardian', 'coindesk': 'CoinDesk', 
    'nasdaq_news': 'Nasdaq', 'seeking_alpha': 'Seeking Alpha', 'benzinga': 'Benzinga',
    'motley_fool': 'Motley Fool'
}

emoji_map = {
    # CafeF sources
    'cafef_chungkhoan': '📈', 'cafef_batdongsan': '🏢', 'cafef_taichinh': '💰', 
    'cafef_vimo': '📊', 'cafef_doanhnghiep': '🏭',
    
    # FREE international sources - UPDATED
    'yahoo_finance_main': '💼', 'yahoo_finance_headlines': '📰', 'yahoo_finance_rss': '💼',
    'cnn_money': '📺', 'marketwatch_latest': '📊', 'business_insider': '💼', 
    'cnbc': '📺', 'investing_com': '💹', 'reuters_business': '🌍',
    'bbc_business': '🇬🇧', 'guardian_business': '🛡️', 'coindesk': '₿',
    'nasdaq_news': '📈', 'seeking_alpha': '🔍', 'benzinga': '🚀', 'motley_fool': '🤡'
}

# Flask Routes
@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/api/news/<news_type>')
async def get_news_api(news_type):
    """API endpoint for getting news"""
    try:
        page = int(request.args.get('page', 1))
        user_id = get_or_create_user_session()
        
        if news_type == 'all':
            # Concurrent collection
            domestic_task = collect_news_enhanced(RSS_FEEDS['domestic'], 15)
            international_task = collect_news_enhanced(RSS_FEEDS['international'], 20)
            
            domestic_news, international_news = await asyncio.gather(domestic_task, international_task)
            all_news = domestic_news + international_news
            
        elif news_type == 'domestic':
            all_news = await collect_news_enhanced(RSS_FEEDS['domestic'], 15)
            
        elif news_type == 'international':
            all_news = await collect_news_enhanced(RSS_FEEDS['international'], 20)
            
        else:
            return jsonify({'error': 'Invalid news type'}), 400
        
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
        
        return jsonify({
            'news': formatted_news,
            'page': page,
            'total_pages': total_pages,
            'total_articles': len(all_news)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/article/<int:article_id>')
async def get_article_detail(article_id):
    """Get article detail"""
    try:
        user_id = get_or_create_user_session()
        
        if user_id not in user_news_cache:
            return jsonify({'error': 'No cached news found'}), 404
            
        user_data = user_news_cache[user_id]
        news_list = user_data['news']
        
        if article_id < 0 or article_id >= len(news_list):
            return jsonify({'error': 'Invalid article ID'}), 404
            
        news = news_list[article_id]
        
        # Save as last detail for AI context
        save_user_last_detail(user_id, news)
        
        # Extract content
        full_content = await extract_content_enhanced(news['link'], news['source'], news)
        
        source_display = source_names.get(news['source'], news['source'])
        
        return jsonify({
            'title': news['title'],
            'content': full_content,
            'source': source_display,
            'published': news['published_str'],
            'link': news['link']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/ask', methods=['POST'])
async def ai_ask():
    """AI ask endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        question = data.get('question', '')
        user_id = get_or_create_user_session()
        
        print(f"🤖 AI Ask - User: {user_id}, Question: '{question}'")
        
        # Check for recent article context
        context = ""
        if user_id in user_last_detail_cache:
            last_detail = user_last_detail_cache[user_id]
            time_diff = get_current_vietnam_datetime() - last_detail['timestamp']
            
            if time_diff.total_seconds() < 1800:  # 30 minutes
                article = last_detail['article']
                
                # Extract content for context
                article_content = await extract_content_enhanced(article['link'], article['source'], article)
                
                if article_content:
                    context = f"BÀI BÁO LIÊN QUAN:\nTiêu đề: {article['title']}\nNguồn: {article['source']}\nNội dung: {article_content[:1500]}"
                    print(f"📄 Found article context: {article['title'][:50]}...")
        
        # Get AI response
        if context and not question:
            # Auto-summarize if no question provided
            print("🔄 Auto-summarizing article")
            response = await gemini_engine.analyze_article(context, "Hãy tóm tắt các ý chính của bài báo này")
        elif context:
            print("❓ Answering question with context")
            response = await gemini_engine.analyze_article(context, question)
        else:
            print("💭 General question without context")
            response = await gemini_engine.ask_question(question, context)
        
        return jsonify({'response': response})
        
    except Exception as e:
        print(f"❌ AI Ask Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/debate', methods=['POST'])
async def ai_debate():
    """AI debate endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        topic = data.get('topic', '')
        user_id = get_or_create_user_session()
        
        print(f"🎭 AI Debate - User: {user_id}, Topic: '{topic}'")
        
        # Check for context if no topic provided
        if not topic:
            if user_id in user_last_detail_cache:
                last_detail = user_last_detail_cache[user_id]
                time_diff = get_current_vietnam_datetime() - last_detail['timestamp']
                
                if time_diff.total_seconds() < 1800:
                    article = last_detail['article']
                    topic = f"Bài báo: {article['title']}"
                    print(f"📄 Using article as debate topic: {topic[:50]}...")
                else:
                    print("⏰ No recent article context")
                    return jsonify({'error': 'Không có chủ đề để bàn luận và không có bài báo gần đây'}), 400
            else:
                print("❌ No topic and no article context")
                return jsonify({'error': 'Cần nhập chủ đề để bàn luận hoặc xem bài báo trước'}), 400
        
        print(f"🚀 Starting debate with topic: {topic}")
        response = await gemini_engine.debate_perspectives(topic)
        
        return jsonify({'response': response})
        
    except Exception as e:
        print(f"❌ AI Debate Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/test')
def test_route():
    """Simple test route"""
    return "Flask app is working!"

@app.route('/api/status')
def api_status():
    """Simple API status check"""
    return jsonify({
        'status': 'OK',
        'message': 'API is working',
        'gemini_available': gemini_engine.available if 'gemini_engine' in globals() else False,
        'timestamp': get_current_datetime_str()
    })

@app.route('/api/debug')
def debug_status():
    """Debug endpoint to check system status"""
    try:
        return jsonify({
            'gemini_available': gemini_engine.available,
            'gemini_api_key_set': bool(GEMINI_API_KEY),
            'gemini_api_key_preview': GEMINI_API_KEY[:10] + "..." if GEMINI_API_KEY else None,
            'current_time': get_current_datetime_str(),
            'total_sources': len(RSS_FEEDS['domestic']) + len(RSS_FEEDS['international']),
            'cache_size': len(global_seen_articles)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), debug=False)
