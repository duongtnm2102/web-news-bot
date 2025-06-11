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
import random
import hashlib
import uuid

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
MAX_CACHE_ENTRIES = 25
MAX_GLOBAL_CACHE = 600
CACHE_EXPIRE_HOURS = 8

# Enhanced User Agents for better compatibility
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

print("🚀 Tiền Phong E-con News Backend:")
print(f"Gemini AI: {'✅' if GEMINI_API_KEY else '❌'}")
print(f"Content Extraction: {'✅' if TRAFILATURA_AVAILABLE else '❌'}")
print("=" * 50)

# UPDATED RSS FEEDS - NO VIETSTOCK, ONLY CAFEF + INTERNATIONAL
RSS_FEEDS = {
    # === CAFEF RSS FEEDS (Primary Vietnamese Source) ===
    'cafef': {
        'cafef_stocks': 'https://cafef.vn/thi-truong-chung-khoan.rss',
        'cafef_realestate': 'https://cafef.vn/bat-dong-san.rss',
        'cafef_business': 'https://cafef.vn/doanh-nghiep.rss',
        'cafef_finance': 'https://cafef.vn/tai-chinh-ngan-hang.rss',
        'cafef_macro': 'https://cafef.vn/vi-mo-dau-tu.rss'
    },
    
    # === INTERNATIONAL RSS FEEDS (Global Financial News) ===
    'international': {
        'yahoo_finance': 'https://finance.yahoo.com/news/rssindex',
        'marketwatch': 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
        'cnbc': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        'reuters_business': 'https://feeds.reuters.com/reuters/businessNews',
        'investing_com': 'https://www.investing.com/rss/news.rss',
        'bloomberg': 'https://feeds.bloomberg.com/markets/news.rss',
        'financial_times': 'https://www.ft.com/rss/home',
        'wsj_markets': 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml'
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
            for old_key, _ in sorted_items[:100]:
                del global_seen_articles[old_key]
        
        return False
        
    except Exception as e:
        print(f"⚠️ Global duplicate check error: {e}")
        return False

# Enhanced HTTP client
async def fetch_with_aiohttp(url, headers=None, timeout=8):
    """Enhanced async HTTP fetch"""
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
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'DNT': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
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
        
        if is_international_source(source_name):
            return f"""**📈 International Financial News**

**Market Insights:** This article provides comprehensive financial market analysis and economic insights from leading international sources.

**Coverage Areas:**
• Real-time market data and analysis
• Global economic indicators and trends  
• Corporate earnings and financial reports
• Investment strategies and market forecasts
• International trade and policy impacts

**Article Reference:** {article_id}

**Note:** Full content extraction temporarily unavailable. Please visit the original source for complete article details.

{f'**Technical Details:** {error_msg}' if error_msg else ''}

**Source:** {source_name.replace('_', ' ').title()}"""
        else:
            return f"""**📰 Tin tức tài chính CafeF**

**Thông tin chi tiết:** Bài viết cung cấp thông tin chuyên sâu về thị trường tài chính, chứng khoán Việt Nam.

**Nội dung bao gồm:**
• Phân tích thị trường chứng khoán chi tiết
• Tin tức doanh nghiệp và báo cáo tài chính
• Xu hướng đầu tư và khuyến nghị chuyên gia
• Cập nhật chính sách kinh tế vĩ mô
• Thông tin bất động sản và các kênh đầu tư

**Mã bài viết:** {article_id}

**Lưu ý:** Để đọc đầy đủ nội dung và xem hình ảnh minh họa, vui lòng truy cập link bài viết gốc.

{f'**Chi tiết kỹ thuật:** {error_msg}' if error_msg else ''}

**Nguồn:** {source_name.replace('_', ' ').title()}"""
        
    except Exception as e:
        return f"**Nội dung từ {source_name}**\n\nVui lòng truy cập link gốc để đọc đầy đủ bài viết.\n\nMã lỗi: {str(e)}"

async def extract_content_with_gemini(url, source_name):
    """Enhanced Gemini content extraction with proper formatting"""
    try:
        if not GEMINI_API_KEY or not GEMINI_AVAILABLE:
            return create_fallback_content(url, source_name, "Gemini AI không khả dụng")
        
        # Enhanced extraction prompt for better formatting
        extraction_prompt = f"""Trích xuất và dịch nội dung từ: {url}

YÊU CẦU CHI TIẾT:
1. Đọc toàn bộ bài báo và trích xuất nội dung chính
2. Dịch sang tiếng Việt tự nhiên, lưu loát  
3. Giữ nguyên số liệu, tên công ty, thuật ngữ kỹ thuật
4. Format với các headline rõ ràng sử dụng **Tiêu đề**
5. Tách dòng rõ ràng giữa các đoạn văn
6. Nếu có ảnh/biểu đồ, ghi chú [📷 Ảnh minh họa]
7. Độ dài: 500-1000 từ
8. CHỈ trả về nội dung đã dịch và format

FORMAT MẪU:
**Tiêu đề chính**

Đoạn văn đầu tiên với thông tin quan trọng.

**Phân tích chi tiết**

Đoạn văn thứ hai với phân tích sâu hơn.

[📷 Ảnh minh họa - nếu có]

**Kết luận**

Đoạn kết luận với những điểm quan trọng.

BẮTTĐẦU TRÍCH XUẤT:"""

        try:
            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.1,
                top_p=0.8,
                max_output_tokens=2500,
            )
            
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    extraction_prompt,
                    generation_config=generation_config
                ),
                timeout=30
            )
            
            extracted_content = response.text.strip()
            
            if len(extracted_content) > 300:
                error_indicators = [
                    'cannot access', 'unable to access', 'không thể truy cập',
                    'failed to retrieve', 'error occurred', 'sorry, i cannot',
                    'not available', 'access denied'
                ]
                
                if not any(indicator in extracted_content.lower() for indicator in error_indicators):
                    # Enhanced formatting
                    formatted_content = format_extracted_content(extracted_content, source_name)
                    return f"[🤖 AI - Phân tích từ {source_name.replace('_', ' ').title()}]\n\n{formatted_content}"
                else:
                    return create_fallback_content(url, source_name, "Gemini không thể truy cập nội dung")
            else:
                return create_fallback_content(url, source_name, "Nội dung trích xuất quá ngắn")
            
        except asyncio.TimeoutError:
            return create_fallback_content(url, source_name, "Gemini timeout")
        except Exception as e:
            return create_fallback_content(url, source_name, f"Lỗi Gemini: {str(e)}")
            
    except Exception as e:
        return create_fallback_content(url, source_name, str(e))

def format_extracted_content(content, source_name):
    """Enhanced content formatting with proper headlines and line breaks"""
    if not content:
        return content
    
    # Split into lines and process
    lines = content.split('\n')
    formatted_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if it's already formatted with **
        if line.startswith('**') and line.endswith('**'):
            formatted_lines.append(line)
        # Check if it's a headline (short, capitalized, or starts with numbers)
        elif (len(line) < 80 and 
            (line.isupper() or 
             line.startswith(('1.', '2.', '3.', '•', '-', '*')) or
             line.endswith(':') or
             re.match(r'^[A-Z][^.]*$', line))):
            formatted_lines.append(f"**{line}**")
        else:
            # Regular paragraph
            formatted_lines.append(line)
    
    # Join with double line breaks for proper spacing
    formatted_content = '\n\n'.join(formatted_lines)
    
    # Add image placeholder if content mentions visuals
    image_keywords = ['ảnh', 'hình', 'biểu đồ', 'chart', 'graph', 'image', 'photo']
    if any(keyword in formatted_content.lower() for keyword in image_keywords):
        image_placeholder = "\n\n[📷 Ảnh minh họa - Xem trong bài viết gốc]\n\n"
        # Insert after first paragraph
        paragraphs = formatted_content.split('\n\n')
        if len(paragraphs) > 1:
            paragraphs.insert(1, image_placeholder.strip())
            formatted_content = '\n\n'.join(paragraphs)
    
    return formatted_content

async def async_sleep_delay():
    """Async delay to prevent blocking"""
    delay = random.uniform(0.1, 0.5)
    await asyncio.sleep(delay)

def clean_content_enhanced(content):
    """Enhanced content cleaning"""
    if not content:
        return content
    
    unwanted_patterns = [
        r'Theo.*?(CafeF).*?',
        r'Nguồn.*?:.*?',
        r'Tags:.*?$',
        r'Từ khóa:.*?$',
        r'Đăng ký.*?nhận tin.*?',
        r'Like.*?Fanpage.*?',
        r'Follow.*?us.*?',
        r'Xem thêm:.*?',
        r'Đọc thêm:.*?'
    ]
    
    for pattern in unwanted_patterns:
        content = re.sub(pattern, '', content, flags=re.IGNORECASE | re.DOTALL)
    
    # Clean up extra whitespace but preserve line breaks
    content = re.sub(r'[ \t]+', ' ', content)  # Only clean horizontal whitespace
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)  # Max 2 consecutive newlines
    
    return content.strip()

async def extract_content_enhanced(url, source_name, news_item=None):
    """Enhanced content extraction with proper formatting"""
    
    # For international sources, use Gemini
    if is_international_source(source_name):
        print(f"🤖 Using Gemini for international source: {source_name}")
        return await extract_content_with_gemini(url, source_name)
    
    # For CafeF sources, use enhanced traditional methods
    try:
        print(f"🔧 Using enhanced traditional methods for: {source_name}")
        await async_sleep_delay()
        
        content = await fetch_with_aiohttp(url)
        
        if content:
            # Method 1: Enhanced Trafilatura
            if TRAFILATURA_AVAILABLE:
                try:
                    result = await asyncio.to_thread(
                        trafilatura.bare_extraction,
                        content,
                        include_comments=False,
                        include_tables=True,
                        include_links=False,
                        include_images=True,
                        favor_precision=False,
                        favor_recall=True,
                        with_metadata=True
                    )
                    
                    if result and result.get('text') and len(result['text']) > 300:
                        full_text = result['text']
                        
                        # Extract image information
                        images_info = ""
                        if 'images' in result and result['images']:
                            images_info = f"\n\n[📷 Bài viết có {len(result['images'])} hình ảnh minh họa]\n\n"
                        
                        # Enhanced formatting with proper line breaks
                        formatted_content = format_vietnamese_content(full_text)
                        return clean_content_enhanced(images_info + formatted_content)
                        
                except Exception as e:
                    print(f"⚠️ Trafilatura failed: {e}")
            
            # Method 2: Enhanced BeautifulSoup with image detection
            if BEAUTIFULSOUP_AVAILABLE:
                try:
                    soup = await asyncio.to_thread(BeautifulSoup, content, 'html.parser')
                    
                    # Extract main content
                    content_selectors = [
                        'div.detail-content', 'div.fck_detail', 'div.content-detail',
                        'div.article-content', 'div.entry-content', 'div.post-content',
                        'article', 'main', '.article-body', '.content-body'
                    ]
                    
                    extracted_text = ""
                    for selector in content_selectors:
                        elements = soup.select(selector)
                        if elements:
                            for element in elements:
                                text = element.get_text(strip=True)
                                if len(text) > len(extracted_text):
                                    extracted_text = text
                    
                    # Extract images
                    images = soup.find_all('img')
                    image_info = ""
                    if images:
                        valid_images = [img for img in images if img.get('src') and 
                                      not any(x in img.get('src', '') for x in ['logo', 'icon', 'avatar', 'ads'])]
                        if valid_images:
                            image_info = f"\n\n[📷 Bài viết có {len(valid_images)} hình ảnh minh họa]\n\n"
                    
                    # Strategy 2: Combine all paragraphs if main content is insufficient
                    if len(extracted_text) < 500:
                        all_paragraphs = soup.find_all('p')
                        paragraph_texts = []
                        for p in all_paragraphs:
                            p_text = p.get_text(strip=True)
                            if len(p_text) > 50:
                                paragraph_texts.append(p_text)
                        
                        combined_text = '\n\n'.join(paragraph_texts)
                        if len(combined_text) > len(extracted_text):
                            extracted_text = combined_text
                    
                    if extracted_text and len(extracted_text) > 300:
                        formatted_content = format_vietnamese_content(extracted_text)
                        final_content = image_info + formatted_content
                        return clean_content_enhanced(final_content)
                        
                except Exception as e:
                    print(f"⚠️ BeautifulSoup failed: {e}")
        
        # Method 3: Newspaper3k fallback
        if NEWSPAPER_AVAILABLE:
            try:
                article = Article(url)
                await asyncio.to_thread(article.download)
                await asyncio.to_thread(article.parse)
                
                if article.text and len(article.text) > 300:
                    image_info = ""
                    if article.top_image:
                        image_info = "\n\n[📷 Ảnh đại diện bài viết]\n\n"
                    
                    formatted_content = format_vietnamese_content(article.text)
                    return clean_content_enhanced(image_info + formatted_content)
                    
            except Exception as e:
                print(f"⚠️ Newspaper3k failed: {e}")
        
        print(f"⚠️ All traditional methods failed for {source_name}")
        return create_fallback_content(url, source_name, "All extraction methods failed")
        
    except Exception as e:
        print(f"❌ Extract content error for {source_name}: {e}")
        return create_fallback_content(url, source_name, str(e))

def format_vietnamese_content(content):
    """Format Vietnamese content with proper headlines and paragraphs with line breaks"""
    if not content:
        return content
    
    # Split into paragraphs
    paragraphs = [p.strip() for p in content.split('\n') if p.strip()]
    formatted_paragraphs = []
    
    for i, paragraph in enumerate(paragraphs):
        # First paragraph as headline if it's short and descriptive
        if i == 0 and len(paragraph) < 120:
            formatted_paragraphs.append(f"**{paragraph}**")
        # Check for other headlines (all caps, short, or special formats)
        elif (len(paragraph) < 100 and 
              (paragraph.isupper() or 
               paragraph.startswith(('Theo', 'Tại', 'Trong khi', 'Bên cạnh')) or
               paragraph.endswith(':') or
               re.match(r'^[A-ZÀ-Ý][^.]*$', paragraph))):
            formatted_paragraphs.append(f"**{paragraph}**")
        else:
            # Regular paragraph
            formatted_paragraphs.append(paragraph)
    
    # Join with double newlines for proper spacing
    return '\n\n'.join(formatted_paragraphs)

async def process_rss_feed_async(source_name, rss_url, limit_per_source):
    """Enhanced async RSS feed processing"""
    try:
        await async_sleep_delay()
        
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
                    description = entry.summary[:400] + "..." if len(entry.summary) > 400 else entry.summary
                elif hasattr(entry, 'description'):
                    description = entry.description[:400] + "..." if len(entry.description) > 400 else entry.description
                
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
                print(f"⚠️ Entry processing error: {entry_error}")
                continue
        
        print(f"✅ Processed {len(news_items)} articles from {source_name}")
        return news_items
        
    except Exception as e:
        print(f"❌ RSS processing error for {source_name}: {e}")
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

async def process_single_source(source_name, source_url, limit_per_source):
    """Process a single RSS source asynchronously"""
    try:
        print(f"🔄 Processing {source_name}: {source_url}")
        
        if source_url.endswith('.rss') or 'rss' in source_url.lower() or 'feeds.' in source_url:
            return await process_rss_feed_async(source_name, source_url, limit_per_source)
        else:
            print(f"⚠️ Unsupported URL format for {source_name}")
            return []
            
    except Exception as e:
        print(f"❌ Error processing {source_name}: {e}")
        return []

async def collect_news_enhanced(sources_dict, limit_per_source=15, use_global_dedup=True):
    """Enhanced news collection with better performance"""
    all_news = []
    
    print(f"🔄 Starting enhanced collection from {len(sources_dict)} sources")
    print(f"🎯 Global deduplication: {use_global_dedup}")
    
    if use_global_dedup:
        clean_expired_cache()
    
    # Create tasks for concurrent processing
    tasks = []
    for source_name, source_url in sources_dict.items():
        task = process_single_source(source_name, source_url, limit_per_source)
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
                if is_duplicate_article_local(news_item, all_news):
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
        oldest_users = sorted(user_news_cache.items(), key=lambda x: x[1]['timestamp'])[:10]
        for user_id_to_remove, _ in oldest_users:
            del user_news_cache[user_id_to_remove]

def save_user_last_detail(user_id, news_item):
    """Save last article accessed for AI context"""
    global user_last_detail_cache
    
    user_last_detail_cache[user_id] = {
        'article': news_item,
        'timestamp': get_current_vietnam_datetime()
    }

# Enhanced Gemini AI Engine with improved response formatting
class GeminiAIEngine:
    def __init__(self):
        self.available = GEMINI_AVAILABLE and GEMINI_API_KEY
        if self.available:
            genai.configure(api_key=GEMINI_API_KEY)
    
    async def ask_question(self, question: str, context: str = ""):
        """Enhanced Gemini AI question answering with proper formatting"""
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
5. Độ dài: 400-800 từ với cấu trúc rõ ràng
6. Sử dụng **Tiêu đề** để tổ chức nội dung
7. Tách dòng rõ ràng giữa các đoạn văn
8. Đưa ra kết luận và khuyến nghị cụ thể

FORMAT TRẢ LỜI:
**Phân tích chính**

Nội dung phân tích chính với thông tin chi tiết.

**Các yếu tố quan trọng**

• Điểm 1: Giải thích chi tiết
• Điểm 2: Giải thích chi tiết  
• Điểm 3: Giải thích chi tiết

**Kết luận và khuyến nghị**

Tóm tắt và đưa ra khuyến nghị cụ thể.

Hãy thể hiện chuyên môn và kiến thức sâu rộng của Gemini AI:"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.2,
                top_p=0.8,
                max_output_tokens=1800,
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
            return "⚠️ Gemini AI timeout. Vui lòng thử lại."
        except Exception as e:
            return f"⚠️ Lỗi Gemini AI: {str(e)}"
    
    async def debate_perspectives(self, topic: str):
        """Enhanced multi-perspective debate system with separate character responses"""
        if not self.available:
            return "⚠️ Gemini AI không khả dụng cho chức năng bàn luận."
        
        try:
            prompt = f"""Tổ chức cuộc tranh luận chuyên sâu về: {topic}

YÊU CẦU ĐẶC BIỆT: Mỗi nhân vật phải có phần riêng biệt, dễ tách thành các tin nhắn riêng lẻ.

HỆ THỐNG 6 QUAN ĐIỂM:

🏦 **Nhà Đầu Tư Ngân Hàng (Thận trọng):**
[Phong cách: Bảo thủ, tập trung vào rủi ro, ưa tiên an toàn]
[Trình bày quan điểm 100-150 từ, kết thúc với dấu chấm câu.]

📈 **Trader Chuyên Nghiệp (Tích cực):**
[Phong cách: Năng động, tìm kiếm cơ hội, chấp nhận rủi ro cao]
[Trình bày quan điểm 100-150 từ, kết thúc với dấu chấm câu.]

🎓 **Giáo Sư Kinh Tế (Học thuật):**
[Phong cách: Lý thuyết, dữ liệu, phân tích dài hạn]
[Trình bày quan điểm 100-150 từ, kết thúc với dấu chấm câu.]

💼 **CEO Doanh Nghiệp (Thực tế):**
[Phong cách: Kinh doanh, lợi nhuận, tác động thực tiễn]
[Trình bày quan điểm 100-150 từ, kết thúc với dấu chấm câu.]

🌍 **Nhà Phân Tích Quốc Tế (Toàn cầu):**
[Phong cách: So sánh quốc tế, xu hướng toàn cầu]
[Trình bày quan điểm 100-150 từ, kết thúc với dấu chấm câu.]

🤖 **AI Gemini - Tổng Kết:**
[Phong cách: Khách quan, cân bằng, đưa ra kết luận tổng hợp]
[Tổng kết 150-200 từ với kết luận cân bằng.]

QUAN TRỌNG: Mỗi nhân vật phải có phần riêng biệt, bắt đầu với emoji và tên, kết thúc rõ ràng."""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.4,
                top_p=0.9,
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
            
            return response.text.strip()
            
        except asyncio.TimeoutError:
            return "⚠️ Gemini AI timeout khi tổ chức bàn luận."
        except Exception as e:
            return f"⚠️ Lỗi Gemini AI: {str(e)}"
    
    async def analyze_article(self, article_content: str, question: str = ""):
        """Enhanced article analysis with Vietnamese response and proper formatting"""
        if not self.available:
            return "⚠️ Gemini AI không khả dụng cho phân tích bài báo."
        
        try:
            analysis_question = question if question else "Hãy phân tích và tóm tắt bài báo này"
            
            # Optimize content length
            if len(article_content) > 4000:
                article_content = article_content[:4000] + "..."
            
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
8. Độ dài: 500-1000 từ với cấu trúc rõ ràng
9. Tham chiếu các phần cụ thể trong bài báo
10. Đưa ra kết luận và khuyến nghị

**FORMAT PHÂN TÍCH:**

**Tóm tắt nội dung chính**

Tóm tắt những điểm quan trọng nhất từ bài báo.

**Phân tích chi tiết**

Phân tích sâu các yếu tố và tác động được đề cập trong bài.

**Ý nghĩa và tác động**

Đánh giá ý nghĩa và tác động của thông tin trong bài báo.

**Kết luận và khuyến nghị**

Đưa ra kết luận tổng hợp và các khuyến nghị cụ thể.

**QUAN TRỌNG:** Tập trung hoàn toàn vào nội dung bài báo. Đưa ra phân tích CHUYÊN SÂU và CHI TIẾT:"""

            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            generation_config = genai.types.GenerationConfig(
                temperature=0.2,
                top_p=0.8,
                max_output_tokens=2200,
            )
            
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=generation_config
                ),
                timeout=30
            )
            
            return response.text.strip()
            
        except asyncio.TimeoutError:
            return "⚠️ Gemini AI timeout khi phân tích bài báo."
        except Exception as e:
            return f"⚠️ Lỗi Gemini AI: {str(e)}"

# Initialize Gemini Engine
gemini_engine = GeminiAIEngine()

# UPDATED source mapping for display - NO VIETSTOCK
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

# Flask Routes
@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/api/news/<news_type>')
async def get_news_api(news_type):
    """Enhanced API endpoint for getting news"""
    try:
        page = int(request.args.get('page', 1))
        user_id = get_or_create_user_session()
        
        if news_type == 'all':
            # Collect from all sources
            all_sources = {**RSS_FEEDS['cafef'], **RSS_FEEDS['international']}
            all_news = await collect_news_enhanced(all_sources, 12)
            
        elif news_type == 'domestic':
            # Vietnamese sources only (CafeF)
            all_news = await collect_news_enhanced(RSS_FEEDS['cafef'], 15)
            
        elif news_type == 'international':
            # International sources only
            all_news = await collect_news_enhanced(RSS_FEEDS['international'], 20)
            
        elif news_type in RSS_FEEDS:
            # Specific category
            all_news = await collect_news_enhanced(RSS_FEEDS[news_type], 20)
            
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
        print(f"❌ API error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/article/<int:article_id>')
async def get_article_detail(article_id):
    """Enhanced article detail with better error handling"""
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
        
        # Enhanced content extraction
        try:
            full_content = await extract_content_enhanced(news['link'], news['source'], news)
        except Exception as content_error:
            print(f"⚠️ Content extraction error: {content_error}")
            full_content = create_fallback_content(news['link'], news['source'], str(content_error))
        
        source_display = source_names.get(news['source'], news['source'])
        
        return jsonify({
            'title': news['title'],
            'content': full_content,
            'source': source_display,
            'published': news['published_str'],
            'link': news['link'],
            'success': True
        })
        
    except Exception as e:
        print(f"❌ Article detail error: {e}")
        return jsonify({
            'error': 'Lỗi hệ thống khi tải bài viết.',
            'error_code': 'SYSTEM_ERROR',
            'details': str(e)
        }), 500

@app.route('/api/ai/ask', methods=['POST'])
async def ai_ask():
    """Enhanced AI ask endpoint"""
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
                article_content = await extract_content_enhanced(article['link'], article['source'], article)
                
                if article_content:
                    context = f"BÀI BÁO HIỆN TẠI:\nTiêu đề: {article['title']}\nNguồn: {article['source']}\nNội dung: {article_content[:1500]}"
        
        # Get AI response
        if context and not question:
            # Auto-summarize if no question provided
            response = await gemini_engine.analyze_article(context, "Hãy tóm tắt và phân tích các điểm chính của bài báo này")
        elif context:
            response = await gemini_engine.analyze_article(context, question)
        else:
            response = await gemini_engine.ask_question(question, context)
        
        return jsonify({'response': response})
        
    except Exception as e:
        print(f"❌ AI ask error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/debate', methods=['POST'])
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
                    topic = f"Bài báo: {article['title']}"
                else:
                    return jsonify({'error': 'Không có chủ đề để bàn luận'}), 400
            else:
                return jsonify({'error': 'Cần nhập chủ đề để bàn luận'}), 400
        
        response = await gemini_engine.debate_perspectives(topic)
        
        return jsonify({'response': response})
        
    except Exception as e:
        print(f"❌ AI debate error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Configure Gemini if available
    if GEMINI_API_KEY and GEMINI_AVAILABLE:
        genai.configure(api_key=GEMINI_API_KEY)
        print("✅ Gemini AI configured successfully")
    
    print("🚀 Tiền Phong E-con News Backend starting...")
    print(f"📊 Total RSS sources: {sum(len(feeds) for feeds in RSS_FEEDS.values())}")
    print("🚫 VietStock sources removed - Only CafeF + International")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), debug=False)
