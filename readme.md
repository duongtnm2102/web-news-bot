# 🖥️ E-con News Terminal - Retro Brutalism News Portal v2.024

Modern AI-powered financial news aggregation with **retro brutalism design** and **terminal interface**. Experience the future through the lens of the past.

```ascii
╔═════════════════════════════════════════════════════════════════════════════════════╗
║  ███████╗       ██████╗ ██████╗ ███╗   ██╗    ███╗   ██╗███████╗██╗    ██╗███████╗  ║
║  ██╔════╝      ██╔════╝██╔═══██╗████╗  ██║    ████╗  ██║██╔════╝██║    ██║██╔════╝  ║
║  █████╗  █████╗██║     ██║   ██║██╔██╗ ██║    ██╔██╗ ██║█████╗  ██║ █╗ ██║███████╗  ║
║  ██╔══╝  ╚════╝██║     ██║   ██║██║╚██╗██║    ██║╚██╗██║██╔══╝  ██║███╗██║╚════██║  ║
║  ███████╗      ╚██████╗╚██████╔╝██║ ╚████║    ██║ ╚████║███████╗╚███╔███╔╝███████║  ║
║  ╚══════╝       ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝    ╚═╝  ╚═══╝╚══════╝ ╚══╝╚══╝ ╚══════╝  ║
║                           [ TERMINAL INTERFACE v2.024 ]                             ║
║                         [ AI-POWERED FINANCIAL PROTOCOL ]                           ║
╚═════════════════════════════════════════════════════════════════════════════════════╝
```

## ✨ Features - Neo-Brutalism Meets AI

### 📊 **Advanced News Aggregation**
- 🇻🇳 **Vietnamese Sources:** CafeF comprehensive coverage (5 specialized feeds)
- 🌍 **International Markets:** Yahoo Finance, Reuters, Bloomberg, WSJ, CNBC và 8+ sources
- 🔄 **Real-time Processing:** Async collection with intelligent deduplication
- 🚫 **No Paywall Limitations:** Only free, accessible sources

### 🤖 **AI-Powered Intelligence System**
- **Gemini 2.0 Flash Integration:** Advanced content analysis và summarization
- **Context-Aware Processing:** AI remembers current article context (30min)
- **Multi-Perspective Debate:** 6-character debate system with different viewpoints
- **Vietnamese + English Support:** Bilingual AI responses with cultural context
- **Terminal-Style Formatting:** AI responses formatted for brutalist aesthetic

### 🎨 **Retro Brutalism Design (2024 Trends)**
- **Neo-Brutalism Aesthetic:** Raw, unpolished UI with purposeful "ugly" design
- **Terminal Interface:** Command-line inspired navigation and interactions
- **Monospace Typography:** JetBrains Mono for authentic coding feel
- **High Contrast Colors:** Matrix green (#00ff00) on pure black (#000000)
- **Scanline Effects:** CRT monitor simulation with glitch animations
- **Grid-Based Layout:** Brutalist composition with harsh edges

### 🖥️ **Interactive Terminal System**
- **Command Line Interface:** 15+ terminal commands for power users
- **Real-time System Stats:** Live monitoring of users, queries, system load
- **Matrix Mode:** Easter egg with digital rain effect
- **Glitch Effects:** Periodic reality distortions for authentic retro feel
- **Performance Monitoring:** Built-in diagnostics and cache management

## 🚀 Triển khai (Deployment)

Ứng dụng này được tối ưu để triển khai dễ dàng trên nền tảng **Render.com** (gói miễn phí).

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/duongtnm2102/web-news-bot)

Để xem hướng dẫn triển khai chi tiết từng bước, cấu hình biến môi trường và các tối ưu cho production, vui lòng tham khảo tài liệu tại:

**[➡️ Hướng dẫn Triển khai Chi tiết](./docs/deployment-guild.md)**

### Biến Môi trường Chính

-   `GEMINI_API_KEY`: API Key cho Google Gemini.
-   `SECRET_KEY`: Khóa bí mật cho Flask session.
-   `FLASK_ENV`: `production` khi triển khai.
  
```
## 📁 Architecture - Retro Brutalism Stack

e-con-news-terminal/
├── 🎨 Frontend (Retro Brutalism)
│   ├── templates/index.html          # Terminal-inspired HTML
│   ├── static/style.css              # Neo-brutalism CSS
│   ├── static/script.js              # Terminal effects + AI
│   ├── static/manifest.json          # PWA with brutalist icons
│   └── static/sw.js                  # Service worker
├── 🤖 Backend (Enhanced Flask)
│   ├── app.py                        # Main Flask app with terminal commands
│   ├── requirements.txt              # Python dependencies
│   └── runtime.txt                   # Python version
├── 📋 Configuration
│   ├── .env.example                  # Environment template
│   ├── .gitignore                    # Git exclusions
│   └── README.md                     # This documentation
└── 🚀 Deployment
    ├── render.yaml                   # Render configuration
    └── Procfile                      # Process management
```

## 🎮 Terminal Commands Reference

Access the terminal by clicking the command bar or pressing **`** (backtick):

```bash
# News & Content
news [category]     # Load news feed (all/domestic/international)
refresh            # Refresh all data streams
search [term]      # Search news articles

# AI & Analysis  
ai                 # Open AI assistant interface
summarize          # Auto-summarize current article
debate             # Start multi-perspective debate

# System & Monitoring
status             # System status overview
stats              # Performance statistics  
uptime             # System uptime details
cache              # Cache management info
users              # Active user statistics

# Interface & Effects
matrix             # Activate Matrix mode (5s)
glitch [intensity] # Trigger glitch effects
clear              # Clear terminal output
theme [mode]       # Change interface theme

# Information
help               # Show all commands
version            # Application version info
debug              # System debug information
```

### **Keyboard Shortcuts**

| Key | Action |
|-----|--------|
| **F1** | Help documentation |
| **F4** | Matrix mode |
| **F5** | Refresh data |
| **`** | Focus terminal |
| **ESC** | Close modals |
| **Tab** | Command completion |

## 🎯 API Endpoints

### **News API**
```http
GET /api/news/all?page=1&limit=12
GET /api/news/domestic
GET /api/news/international  
GET /api/article/{id}
```

### **AI API**
```http
POST /api/ai/ask
Content-Type: application/json
{
  "question": "Analyze market trends"
}

POST /api/ai/debate  
Content-Type: application/json
{
  "topic": "Current article or custom topic"
}
```

### **Terminal API**
```http
POST /api/terminal/command
Content-Type: application/json
{
  "command": "status"
}
```

### **System API**
```http
GET /api/system/stats
```

## 🛠️ Technology Stack

### **Frontend - Retro Brutalism**
- **Vanilla JavaScript ES6+** - No frameworks, pure performance
- **CSS Grid + Flexbox** - Brutalist layout system
- **CSS Custom Properties** - Dynamic theming
- **Intersection Observer** - Performance optimized animations
- **Service Worker** - PWA capabilities with offline support

### **Backend - Enhanced Flask**
- **Flask 3.0.3** - Modern Python web framework
- **AsyncIO** - Concurrent RSS processing  
- **aiohttp** - Async HTTP client
- **Google Generative AI** - Gemini 2.0 Flash integration
- **Multiple Content Extractors** - Trafilatura, Newspaper3k, BeautifulSoup

### **Data Processing**
- **feedparser** - RSS/Atom feed parsing
- **pytz** - Timezone handling (Vietnam UTC+7)
- **Advanced Caching** - In-memory with TTL and deduplication
- **Rate Limiting** - Respectful scraping practices

### **Design Philosophy - Neo-Brutalism 2024**
- **Anti-Design Approach** - Intentionally "ugly" but functional
- **Raw Aesthetics** - Exposed functionality, minimal decoration  
- **Terminal Metaphors** - Command-line inspired interactions
- **High Contrast** - Accessibility-focused color schemes
- **Monospace Everything** - Consistent grid-based typography

## 📊 Performance Features

### **Frontend Optimization**
- **Lazy Loading** - News articles load on-demand
- **Virtual Scrolling Ready** - Handle large datasets
- **Intersection Observers** - GPU-accelerated animations
- **Service Worker Caching** - Offline-first architecture
- **Resource Hints** - Preload critical assets

### **Backend Efficiency**  
- **Async Processing** - Concurrent RSS feed collection
- **Intelligent Caching** - Multi-layer cache strategy
- **Duplicate Detection** - Global and local deduplication
- **Memory Management** - Automatic cleanup and limits
- **Error Recovery** - Graceful fallbacks for failed requests

### **Monitoring & Analytics**
- **Real-time Stats** - System load, users, AI queries
- **Performance Tracking** - Load times, cache hit rates
- **Error Logging** - Comprehensive error reporting
- **Usage Analytics** - Terminal command usage patterns

## 🎨 Design Principles - Retro Brutalism

### **Visual Aesthetics**
1. **Embrace Ugliness** - Intentionally challenging visual design
2. **Raw Functionality** - No unnecessary decorative elements
3. **Terminal Heritage** - Monospace fonts, command interfaces  
4. **High Contrast** - Accessibility through stark color differences
5. **Grid-Based** - Rigid, mathematical layout systems

### **Interaction Design**
1. **Power User Focus** - Keyboard shortcuts and terminal commands
2. **Immediate Feedback** - Terminal-style responses and confirmations
3. **Progressive Disclosure** - Advanced features behind commands
4. **Error Transparency** - Honest error messages in terminal style
5. **Performance First** - No unnecessary animations or effects

### **Content Strategy**
1. **Information Density** - Pack maximum content in minimal space
2. **Scannable Headers** - Bold, uppercase, monospace typography
3. **Terminal Formatting** - Code-style content presentation
4. **Status Indicators** - System-style status messages
5. **Technical Language** - Embrace technical terminology

## 🔐 Security & Privacy

### **Data Protection**
- **No User Tracking** - Anonymous session management
- **Secure Headers** - XSS, CSRF, clickjacking protection
- **Environment Variables** - Sensitive keys stored securely
- **Input Validation** - All user inputs sanitized
- **Content Security Policy** - Restrict resource loading

### **API Security**
- **Rate Limiting** - Prevent abuse and spam
- **CORS Protection** - Controlled cross-origin requests
- **Input Sanitization** - HTML/SQL injection prevention
- **Session Management** - Secure session handling
- **Error Handling** - No information leakage in errors

## 📱 Mobile & PWA Support

### **Progressive Web App**
- **App-like Experience** - Full-screen mode available
- **Offline Functionality** - Core features work offline
- **Install Prompt** - Add to home screen capability
- **Background Sync** - Update content when online
- **Push Notifications** - Breaking news alerts (optional)

### **Responsive Brutalism**
- **Mobile Terminal** - Touch-friendly command interface
- **Adaptive Typography** - Scalable monospace fonts
- **Touch Gestures** - Swipe navigation between categories  
- **Viewport Optimization** - Perfect scaling on all devices
- **Performance First** - Optimized for mobile networks

## 🎯 Content Sources & Reliability

### **Vietnamese Sources (CafeF Network)**
```
├── CafeF Chứng Khoán     # Stock market analysis
├── CafeF Doanh Nghiệp    # Corporate news  
├── CafeF Bất Động Sản    # Real estate market
├── CafeF Tài Chính       # Banking & finance
└── CafeF Vĩ Mô           # Macroeconomic trends
```

### **International Sources**
```
├── Yahoo Finance         # Market data & analysis
├── Reuters Business      # Global business news
├── Bloomberg            # Financial markets
├── MarketWatch          # Investment insights  
├── CNBC                 # Breaking financial news
├── Wall Street Journal  # Market coverage
├── Financial Times      # International finance
└── Investing.com        # Multi-market analysis
```

### **Content Processing Pipeline**
1. **RSS Collection** - Async gathering from all sources
2. **Content Extraction** - Multiple fallback methods
3. **Deduplication** - Title and URL matching algorithms  
4. **AI Enhancement** - Gemini-powered content analysis
5. **Terminal Formatting** - Brutalist content presentation

## 🎭 AI Character Debate System

### **Multi-Perspective Analysis**
The AI debate feature creates 6 unique perspectives on any news topic:

```
🏦 Conservative Banker    # Risk-averse, traditional finance view
📈 Aggressive Trader     # High-risk, opportunity-focused analysis  
🎓 Academic Economist    # Research-based, theoretical perspective
💼 Corporate Executive   # Business-practical, profit-focused view
🌍 Global Analyst       # International comparative analysis
🤖 Gemini AI Synthesis  # Balanced meta-analysis and conclusion
```

Each character provides 100-150 word responses with distinct personalities and viewpoints, culminating in an AI synthesis that balances all perspectives.

## 🔧 Local Development

### **Setup Environment**
```bash
# Clone repository
git clone https://github.com/yourusername/e-con-news-terminal.git
cd e-con-news-terminal

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp env.example .env
# Edit .env with your API keys

# Run development server
python app.py
```

### **Development Server**
```bash
# Production mode (default)
python app.py

# Development mode with debug
FLASK_DEBUG=True python app.py

# Custom port
PORT=8080 python app.py
```

Visit `http://localhost:8080` to see the terminal interface.

### **Development Features**
- **Hot Reload** - Automatic server restart on file changes
- **Debug Mode** - Detailed error pages and logging
- **Performance Profiling** - Built-in performance monitoring
- **Command Testing** - Terminal command testing interface
- **AI Debugging** - Gemini API response logging

## 🚨 Troubleshooting

### **Common Issues**

**Build Failed on Render:**
```bash
# Check Python version
cat runtime.txt  # Should be python-3.11.0

# Verify requirements format
head -5 requirements.txt

# Check for missing dependencies
pip install -r requirements.txt --dry-run
```

**Environment Variables:**
```bash
# Verify Gemini API key
echo $GEMINI_API_KEY

# Generate strong secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Test API connectivity
curl -H "Authorization: Bearer $GEMINI_API_KEY" https://generativelanguage.googleapis.com/v1/models
```

**Terminal Commands Not Working:**
```bash
# Check browser console for errors
# Verify WebSocket connection
# Test with simple commands first: help, status

# Backend debugging
tail -f logs/app.log
```

**AI Features Not Responding:**
```bash
# Verify Gemini API key validity
# Check API quota limits
# Test with simple questions first
# Review error logs for timeout issues
```

### **Performance Optimization**

**Frontend:**
- Enable browser caching for static assets
- Use service worker for offline functionality
- Optimize image loading with lazy loading
- Minimize JavaScript bundle size

**Backend:**
- Configure Redis for production caching
- Enable gzip compression
- Use CDN for static assets
- Monitor memory usage and optimize

## 🎖️ Deployment Best Practices

### **Render.com Optimization**
```yaml
# render.yaml
services:
  - type: web
    name: e-con-news-terminal
    env: python
    region: singapore  # Closest to Vietnam
    plan: starter      # Free tier
    buildCommand: |
      pip install --upgrade pip
      pip install -r requirements.txt
    startCommand: |
      gunicorn app:app \
        --host 0.0.0.0 \
        --port $PORT \
        --workers 1 \
        --timeout 120 \
        --preload
    envVars:
      - key: GEMINI_API_KEY
        sync: false
      - key: SECRET_KEY  
        generateValue: true
      - key: FLASK_ENV
        value: production
```

### **Production Environment**
```bash
# Environment variables
GEMINI_API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here  
FLASK_ENV=production
FLASK_DEBUG=False
PORT=8080

# Optional optimization
WORKERS=2
TIMEOUT=120
MAX_REQUESTS=1000
PRELOAD=true
```

### **Monitoring & Alerts**
- **Uptime Monitoring:** UptimeRobot, Pingdom
- **Error Tracking:** Built-in logging + external services
- **Performance:** Custom metrics in terminal interface
- **Analytics:** Privacy-focused usage analytics

## 🤝 Contributing

### **Development Guidelines**
1. **Retro Brutalism First** - Maintain the aesthetic philosophy
2. **Terminal Compatibility** - All features should work via commands
3. **Performance Focus** - No feature should slow the interface
4. **Accessibility** - High contrast design aids accessibility
5. **Documentation** - Update README for any new features

### **Code Style**
- **Frontend:** Vanilla JS, no frameworks
- **Backend:** Flask best practices, async where beneficial
- **CSS:** BEM methodology with brutalist naming
- **Terminal:** Command-line inspired interactions
- **AI:** Context-aware, formatted responses

### **Submission Process**
```bash
# Fork repository
# Create feature branch
git checkout -b feature/retro-terminal-enhancement

# Make changes following style guide
# Test thoroughly with multiple browsers
# Update documentation

# Submit pull request with:
# - Clear description of changes
# - Screenshots of UI changes  
# - Performance impact assessment
# - Terminal command testing
```

## 📄 License & Credits

### **Open Source License**
This project is released under the MIT License - feel free to modify and distribute.

### **Design Inspiration**
- **Brutalist Architecture** - 1950s architectural movement
- **Terminal Computing** - Early computer interfaces
- **Matrix Aesthetic** - Digital rain and green phosphor
- **Neo-Brutalism 2024** - Modern web design trend
- **Hacker Culture** - Command-line power user interfaces

### **Technology Credits**
- **Gemini AI** - Google's advanced language model
- **Flask** - Python web framework
- **JetBrains Mono** - Open source monospace font
- **Render.com** - Deployment and hosting platform

**🚀 Ready to deploy? Just push to GitHub and connect with Render!**

```bash
git add .
git commit -m "Deploy retro brutalism news terminal v2.024"
git push origin main
```

Visit your deployed app and type `help` in the terminal to begin your journey into the future of news consumption. 🖥️✨
