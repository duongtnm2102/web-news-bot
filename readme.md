# 📰 News Portal - AI-Powered Financial News

Modern web application với AI-powered financial news aggregation, được chuyển đổi từ Discord News Bot.

## ✨ Features

### 📊 **News Aggregation**
- 🇻🇳 **Domestic Sources:** CafeF (5 chuyên mục)
- 🌍 **International Sources:** Yahoo Finance, CNN Money, MarketWatch, CNBC, BBC Business và nhiều hơn nữa
- 🔄 **Real-time Updates:** Thu thập tin tức liên tục
- 🚫 **No Paywall:** Chỉ sử dụng nguồn free

### 🤖 **AI-Powered Analysis**
- **Gemini AI Integration:** Phân tích và tóm tắt bài báo
- **Context-Aware:** AI hiểu bối cảnh bài báo vừa đọc
- **Multi-Perspective Debate:** Tranh luận đa góc nhìn
- **Vietnamese Support:** AI trả lời bằng tiếng Việt

### 🎨 **Modern UI/UX (2025 Trends)**
- **Minimalist Design:** Clean, focused interface
- **3D Elements:** Subtle depth và shadows
- **Glassmorphism:** Frosted glass effects
- **Bento UI:** Modular grid layout
- **Micro Animations:** Smooth interactions
- **Responsive:** Mobile-first design

## 🚀 Deploy lên Render

### 1. **Chuẩn bị Repository**

```bash
# Clone hoặc tạo repository mới
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. **Setup Environment Variables**

Tạo file `.env` từ `.env.example`:

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_random_secret_key_here

# Auto-set by Render
PORT=8080
```

**Lấy Gemini API Key:**
1. Đi tới [Google AI Studio](https://aistudio.google.com/)
2. Tạo API key mới
3. Copy vào `GEMINI_API_KEY`

### 3. **Deploy lên Render**

1. **Tạo Web Service:**
   - Đi tới [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Web Service"
   - Connect GitHub repository

2. **Cấu hình Deploy:**
   ```
   Name: news-portal
   Region: Singapore (gần Việt Nam nhất)
   Branch: main
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn app:app --host 0.0.0.0 --port $PORT
   ```

3. **Environment Variables:**
   - Thêm `GEMINI_API_KEY`
   - Thêm `SECRET_KEY`
   - Render tự động set `PORT`

4. **Deploy:**
   - Click "Create Web Service"
   - Chờ build & deploy (3-5 phút)

### 4. **Tự động Deploy**

Mỗi lần push code lên GitHub, Render sẽ tự động rebuild và deploy.

## 📁 Cấu trúc Files

```
├── app.py                 # Flask backend chính
├── requirements.txt       # Python dependencies
├── runtime.txt           # Python version
├── .env.example          # Environment variables template
├── templates/
│   └── index.html        # HTML template chính
├── static/
│   ├── style.css         # Modern CSS với 2025 trends
│   └── script.js         # JavaScript frontend logic
└── README.md            # Documentation
```

## 🔧 Local Development

```bash
# 1. Clone repository
git clone <your-repo-url>
cd news-portal

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup environment variables
cp .env.example .env
# Edit .env với API keys

# 5. Run locally
python app.py
```

Mở http://localhost:8080

## 🎯 API Endpoints

- `GET /` - Main page
- `GET /api/news/<type>?page=<num>` - Get news (all/domestic/international)
- `GET /api/article/<id>` - Get article details
- `POST /api/ai/ask` - Ask AI questions
- `POST /api/ai/debate` - AI debate system

## 🛠️ Tech Stack

**Backend:**
- Flask 3.0.3
- Python 3.11+
- Gemini AI API
- Async/await support

**Frontend:**
- Modern Vanilla JavaScript
- CSS Grid & Flexbox
- CSS Variables
- Intersection Observer
- Service Worker ready

**Data Sources:**
- RSS feeds (feedparser)
- Content extraction (trafilatura, BeautifulSoup, newspaper3k)
- aiohttp for async requests

## 📊 Features Details

### **News Collection System**
- **Duplicate Detection:** EXACT title matching
- **Async Processing:** Concurrent RSS parsing
- **Vietnam Timezone:** Tự động convert time
- **Source Mapping:** Emoji & display names
- **Error Handling:** Fallback content

### **AI System**
- **Context Awareness:** 30-phút article context
- **Analysis Types:** Summary, Q&A, Debate
- **Vietnamese Output:** AI trả lời tiếng Việt
- **Error Recovery:** Graceful fallbacks

### **Caching System**
- **User Sessions:** Consistent pagination
- **Global Cache:** Cross-session deduplication
- **Memory Management:** Auto cleanup
- **Performance:** Fast subsequent loads

## 🔐 Security

- Environment variables cho sensitive data
- Input validation & sanitization
- CORS protection
- XSS prevention
- Rate limiting ready

## 🌟 Modern Design Features

- **2025 Design Trends:** Minimalism + 3D
- **Glassmorphism:** Backdrop blur effects
- **Micro Animations:** Purposeful motion
- **Bento UI:** Grid-based layouts
- **Dark Mode Ready:** Time-based switching
- **Mobile Optimized:** Touch-friendly

## 📱 Mobile Support

- Responsive breakpoints
- Touch gestures
- PWA ready
- Offline capability
- App-like experience

## 🎮 Keyboard Shortcuts

- `1` - All news
- `2` - Domestic news  
- `3` - International news
- `R` - Refresh
- `←/→` - Pagination
- `Esc` - Close modal
- `Ctrl+Enter` - Ask AI (in textarea)

## 🔄 Uptime Monitoring

Deploy xong có thể setup uptime monitoring:
- [UptimeRobot](https://uptimerobot.com/) (free)
- [Pingdom](https://www.pingdom.com/)
- [StatusCake](https://www.statuscake.com/)

## 📈 Performance

- **Fast Loading:** < 2s initial load
- **Efficient Rendering:** Virtual scrolling ready
- **Memory Management:** Auto cleanup
- **CDN Ready:** Static asset optimization
- **SEO Friendly:** Meta tags & structure

## 🆘 Troubleshooting

**Build Failed:**
- Check `requirements.txt` format
- Verify Python version in `runtime.txt`

**Environment Variables:**
- Ensure `GEMINI_API_KEY` is valid
- Generate strong `SECRET_KEY`

**API Errors:**
- Check Gemini API quota
- Verify network connectivity
- Review error logs in Render

## 📄 License

Open source project. Feel free to modify and distribute.

## 🤝 Support

Nếu gặp vấn đề gì trong quá trình deploy, hãy check:
1. Environment variables
2. Build logs trên Render  
3. API key validity
4. Network connectivity

---

**🚀 Ready to deploy! Chỉ cần push lên GitHub và connect với Render!**