/**
 * E-con News Portal - Retro Brutalism JavaScript v2.024
 * Optimized for performance and modern browser features
 * Terminal interface + AI integration + Neo-brutalism UX
 */

'use strict';

// ===============================
// PERFORMANCE & UTILITY HELPERS
// ===============================

class PerformanceManager {
    constructor() {
        this.observers = new Map();
        this.cache = new Map();
        this.maxCacheSize = 50;
        this.debounceTimers = new Map();
    }

    // Optimized debounce
    debounce(func, delay, key) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    // Intersection Observer for lazy loading
    createIntersectionObserver(callback, options = {}) {
        const defaultOptions = {
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        };
        
        return new IntersectionObserver(callback, defaultOptions);
    }

    // Cache management
    setCache(key, value) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, { value, timestamp: Date.now() });
    }

    getCache(key, maxAge = 300000) { // 5 minutes default
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < maxAge) {
            return cached.value;
        }
        this.cache.delete(key);
        return null;
    }
}

// ===============================
// TERMINAL EFFECTS MANAGER
// ===============================

class TerminalEffectsManager {
    constructor() {
        this.glitchActive = false;
        this.scanlineEnabled = true;
        this.noiseLevel = 0.03;
        this.effectsQueue = [];
        
        this.initializeEffects();
    }

    initializeEffects() {
        this.createScanline();
        this.initializeAudioContext();
    }

    createScanline() {
        if (!this.scanlineEnabled) return;

        const scanline = document.createElement('div');
        scanline.className = 'scanline';
        document.body.appendChild(scanline);

        // Remove and recreate periodically for performance
        setInterval(() => {
            if (scanline.parentNode) {
                scanline.remove();
                this.createScanline();
            }
        }, 30000);
    }

    triggerGlitch(intensity = 'medium') {
        if (this.glitchActive) return;
        
        this.glitchActive = true;
        const elements = document.querySelectorAll('.article-title, .ascii-art, .terminal-title');
        const targetCount = intensity === 'high' ? elements.length : Math.min(3, elements.length);
        
        for (let i = 0; i < targetCount; i++) {
            const element = elements[Math.floor(Math.random() * elements.length)];
            if (element) {
                this.applyGlitchEffect(element);
            }
        }

        setTimeout(() => {
            this.glitchActive = false;
        }, 500);
    }

    applyGlitchEffect(element) {
        const originalText = element.textContent;
        const glitchChars = '█▓▒░!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';
        
        // Glitch text effect
        const glitchSteps = 5;
        let step = 0;
        
        const glitchInterval = setInterval(() => {
            if (step >= glitchSteps) {
                element.textContent = originalText;
                element.classList.remove('glitch');
                clearInterval(glitchInterval);
                return;
            }
            
            element.classList.add('glitch');
            
            if (step < 3) {
                // Scramble text
                element.textContent = originalText
                    .split('')
                    .map(char => Math.random() < 0.3 ? 
                        glitchChars[Math.floor(Math.random() * glitchChars.length)] : char)
                    .join('');
            }
            
            step++;
        }, 60);
    }

    activateMatrixMode(duration = 5000) {
        document.body.style.filter = 'hue-rotate(120deg) contrast(1.2) brightness(1.1)';
        
        // Add matrix rain effect
        this.createMatrixRain();
        
        setTimeout(() => {
            document.body.style.filter = '';
            this.removeMatrixRain();
        }, duration);
    }

    createMatrixRain() {
        const canvas = document.createElement('canvas');
        canvas.id = 'matrix-rain';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999;
            opacity: 0.3;
        `;
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const columns = Math.floor(canvas.width / 20);
        const drops = Array(columns).fill(1);
        
        const matrixChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        
        function drawMatrix() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00ff00';
            ctx.font = '15px monospace';
            
            for (let i = 0; i < drops.length; i++) {
                const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                ctx.fillText(text, i * 20, drops[i] * 20);
                
                if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }
        
        const matrixInterval = setInterval(drawMatrix, 35);
        canvas.matrixInterval = matrixInterval;
        
        document.body.appendChild(canvas);
    }

    removeMatrixRain() {
        const canvas = document.getElementById('matrix-rain');
        if (canvas) {
            clearInterval(canvas.matrixInterval);
            canvas.remove();
        }
    }

    initializeAudioContext() {
        // Terminal sound effects (if audio is enabled)
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio context not available');
        }
    }

    playTerminalSound(type = 'beep') {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        switch (type) {
            case 'beep':
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                break;
            case 'error':
                oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                break;
            case 'success':
                oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
                break;
        }
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
}

// ===============================
// MAIN RETRO NEWS PORTAL CLASS
// ===============================

class RetroNewsPortal {
    constructor() {
        // Core properties
        this.currentPage = 1;
        this.currentCategory = 'all';
        this.isLoading = false;
        this.currentArticle = null;
        this.aiRequestInProgress = false;
        this.chatMessages = [];
        
        // Managers
        this.performanceManager = new PerformanceManager();
        this.effectsManager = new TerminalEffectsManager();
        
        // System stats
        this.systemStats = {
            activeUsers: 1337420,
            aiQueries: 42069,
            newsParsed: 9999,
            systemLoad: 69,
            uptime: Date.now()
        };
        
        // Terminal commands
        this.commands = new Map([
            ['news', this.executeNewsCommand.bind(this)],
            ['ai', this.executeAICommand.bind(this)],
            ['status', this.executeStatusCommand.bind(this)],
            ['help', this.executeHelpCommand.bind(this)],
            ['matrix', this.executeMatrixCommand.bind(this)],
            ['glitch', this.executeGlitchCommand.bind(this)],
            ['clear', this.executeClearCommand.bind(this)],
            ['refresh', this.executeRefreshCommand.bind(this)],
            ['exit', this.executeExitCommand.bind(this)],
            ['theme', this.executeThemeCommand.bind(this)],
            ['stats', this.executeStatsCommand.bind(this)]
        ]);
        
        this.init();
    }

    async init() {
        console.log('🚀 INITIALIZING RETRO BRUTALISM NEWS PORTAL v2.024...');
        
        try {
            this.bindEvents();
            this.startSystemUpdates();
            this.initializeIntersectionObservers();
            this.setupKeyboardShortcuts();
            this.simulateSystemBoot();
            
            // Load initial news
            await this.loadNews('all', 1);
            
            console.log('✅ TERMINAL INTERFACE READY - ALL SYSTEMS OPERATIONAL');
            this.showToast('System initialization complete', 'success');
            
        } catch (error) {
            console.error('❌ INITIALIZATION FAILED:', error);
            this.showToast('System initialization failed: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Navigation tabs with delegation
        const navTabs = document.querySelector('.nav-tabs');
        if (navTabs) {
            navTabs.addEventListener('click', this.handleNavigation.bind(this));
        }

        // Article clicks with delegation
        document.addEventListener('click', this.handleArticleClick.bind(this));

        // Command input
        const commandInput = document.getElementById('commandInput');
        if (commandInput) {
            commandInput.addEventListener('keydown', this.handleCommandInput.bind(this));
            commandInput.addEventListener('input', this.handleCommandSuggestions.bind(this));
        }

        // Chat events
        this.bindChatEvents();

        // Modal events
        this.bindModalEvents();

        // Window events
        window.addEventListener('resize', this.performanceManager.debounce.bind(
            this.performanceManager,
            this.handleResize.bind(this),
            300,
            'resize'
        ));

        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

        // Hotkey events
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));

        // Context menu for terminal feel
        document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    }

    bindChatEvents() {
        const chatBubble = document.getElementById('chatBubble');
        const minimizeChat = document.getElementById('minimizeChat');
        const closeChat = document.getElementById('closeChat');
        const summaryBtn = document.getElementById('summaryBtn');
        const debateBtn = document.getElementById('debateBtn');
        const sendBtn = document.getElementById('sendBtn');
        const chatInput = document.getElementById('chatInput');

        chatBubble?.addEventListener('click', () => this.openChatWindow());
        minimizeChat?.addEventListener('click', () => this.minimizeChatWindow());
        closeChat?.addEventListener('click', () => this.closeChatWindow());
        summaryBtn?.addEventListener('click', () => this.handleSummaryRequest());
        debateBtn?.addEventListener('click', () => this.handleDebateRequest());
        sendBtn?.addEventListener('click', () => this.sendChatMessage());

        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }
    }

    bindModalEvents() {
        const closeModal = document.getElementById('closeModal');
        const articleModal = document.getElementById('articleModal');

        closeModal?.addEventListener('click', () => this.closeArticleModal());
        articleModal?.addEventListener('click', (e) => {
            if (e.target.id === 'articleModal') {
                this.closeArticleModal();
            }
        });
    }

    handleNavigation(e) {
        const tab = e.target.closest('.nav-tab');
        if (!tab) return;

        e.preventDefault();
        const category = tab.dataset.category;
        if (category) {
            this.switchCategory(category);
        }
    }

    handleArticleClick(e) {
        const article = e.target.closest('.news-article');
        if (!article) return;

        const articleId = article.dataset.id;
        if (articleId) {
            this.showArticleModal(articleId);
        }
    }

    handleCommandInput(e) {
        if (e.key === 'Enter') {
            const command = e.target.value.trim();
            if (command) {
                this.executeCommand(command);
                e.target.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.autoCompleteCommand(e.target);
        }
    }

    handleCommandSuggestions(e) {
        const input = e.target.value.toLowerCase();
        if (input.length > 0) {
            const suggestions = Array.from(this.commands.keys())
                .filter(cmd => cmd.startsWith(input))
                .slice(0, 3);
            
            // Show suggestions (implement UI for this)
            this.showCommandSuggestions(suggestions);
        }
    }

    handleResize() {
        // Update canvas dimensions for matrix effect
        const canvas = document.getElementById('matrix-rain');
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }

    handleBeforeUnload(e) {
        if (this.aiRequestInProgress) {
            e.preventDefault();
            e.returnValue = 'AI request in progress. Are you sure you want to leave?';
        }
    }

    handleGlobalKeydown(e) {
        // Skip if typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key) {
            case 'Escape':
                this.closeArticleModal();
                this.closeChatWindow();
                break;
            case 'F5':
                e.preventDefault();
                this.executeRefreshCommand();
                break;
            case 'F1':
                e.preventDefault();
                this.executeHelpCommand();
                break;
            case 'F4':
                e.preventDefault();
                this.executeMatrixCommand();
                break;
            case '`':
                e.preventDefault();
                this.focusCommandInput();
                break;
            case '/':
                if (!e.ctrlKey) {
                    e.preventDefault();
                    this.focusCommandInput();
                }
                break;
        }
    }

    handleContextMenu(e) {
        e.preventDefault();
        this.effectsManager.playTerminalSound('beep');
        return false;
    }

    focusCommandInput() {
        const commandInput = document.getElementById('commandInput');
        if (commandInput) {
            commandInput.focus();
            commandInput.select();
        }
    }

    // ===============================
    // TERMINAL COMMAND SYSTEM
    // ===============================

    executeCommand(commandStr) {
        const [command, ...args] = commandStr.toLowerCase().split(' ');
        
        console.log(`🖥️ Executing command: ${command}`, args);
        this.effectsManager.playTerminalSound('beep');
        
        if (this.commands.has(command)) {
            this.commands.get(command)(args);
        } else {
            this.showTerminalResponse(`Command not found: ${command}. Type 'help' for available commands.`, 'error');
        }
    }

    executeNewsCommand(args) {
        const category = args[0] || 'all';
        this.showTerminalResponse(`Loading news feed: ${category.toUpperCase()}`);
        this.switchCategory(category);
    }

    executeAICommand(args) {
        this.showTerminalResponse('Activating AI assistant...');
        this.openChatWindow();
    }

    executeStatusCommand(args) {
        const uptime = Math.floor((Date.now() - this.systemStats.uptime) / 1000);
        const response = `
SYSTEM STATUS REPORT:
├─ STATUS: ONLINE
├─ UPTIME: ${uptime}s
├─ CPU: ${this.systemStats.systemLoad}%
├─ MEMORY: ${Math.floor(Math.random() * 200 + 200)}MB
├─ ACTIVE_USERS: ${this.systemStats.activeUsers.toLocaleString()}
├─ AI_QUERIES: ${this.systemStats.aiQueries.toLocaleString()}
└─ NEWS_PARSED: ${this.systemStats.newsParsed.toLocaleString()}`;
        
        this.showTerminalResponse(response, 'success');
    }

    executeHelpCommand(args) {
        const response = `
AVAILABLE COMMANDS:
├─ news [category]  │ Load news feed
├─ ai              │ Open AI assistant
├─ status          │ System status
├─ matrix          │ Activate matrix mode
├─ glitch          │ Trigger glitch effect
├─ clear           │ Clear terminal
├─ refresh         │ Refresh data
├─ theme [mode]    │ Change theme
├─ stats           │ Performance stats
└─ exit            │ Goodbye message

HOTKEYS: F1=Help, F4=Matrix, F5=Refresh, \`=Terminal, ESC=Close`;
        
        this.showTerminalResponse(response, 'info');
    }

    executeMatrixCommand(args) {
        this.showTerminalResponse('Entering the Matrix... 🐰');
        this.effectsManager.activateMatrixMode(5000);
    }

    executeGlitchCommand(args) {
        const intensity = args[0] || 'medium';
        this.showTerminalResponse(`Triggering glitch effect: ${intensity.toUpperCase()}`);
        this.effectsManager.triggerGlitch(intensity);
    }

    executeClearCommand(args) {
        // Clear any temporary displays
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(toast => toast.remove());
        this.showTerminalResponse('Terminal cleared');
    }

    executeRefreshCommand(args) {
        this.showTerminalResponse('Refreshing all systems...');
        this.refreshNews();
        this.updateStats();
    }

    executeExitCommand(args) {
        this.showTerminalResponse('Goodbye, user. Remember: There is no spoon. 🥄', 'info');
        setTimeout(() => {
            this.effectsManager.triggerGlitch('high');
        }, 1000);
    }

    executeThemeCommand(args) {
        const mode = args[0] || 'retro';
        this.showTerminalResponse(`Theme switching to: ${mode.toUpperCase()}`);
        // Implement theme switching logic here
    }

    executeStatsCommand(args) {
        const performance = this.getPerformanceStats();
        const response = `
PERFORMANCE STATISTICS:
├─ Cache Size: ${this.performanceManager.cache.size}
├─ Chat Messages: ${this.chatMessages.length}
├─ Current Category: ${this.currentCategory.toUpperCase()}
├─ Page Load Time: ${performance.loadTime}ms
├─ Memory Usage: ${performance.memoryUsage}MB
└─ Active Observers: ${this.performanceManager.observers.size}`;
        
        this.showTerminalResponse(response, 'info');
    }

    autoCompleteCommand(input) {
        const value = input.value.toLowerCase();
        const commands = Array.from(this.commands.keys());
        const match = commands.find(cmd => cmd.startsWith(value));
        
        if (match) {
            input.value = match;
        }
    }

    showCommandSuggestions(suggestions) {
        // Implementation for command suggestions UI
        console.log('Command suggestions:', suggestions);
    }

    // ===============================
    // NEWS MANAGEMENT
    // ===============================

    async switchCategory(category) {
        if (this.isLoading || category === this.currentCategory) return;

        // Update active states
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-category="${category}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        this.currentCategory = category;
        await this.loadNews(category, 1);
    }

    async loadNews(category, page) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.currentPage = page;

        // Check cache first
        const cacheKey = `news-${category}-${page}`;
        const cachedNews = this.performanceManager.getCache(cacheKey);
        
        if (cachedNews) {
            this.renderNews(cachedNews);
            this.isLoading = false;
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/news/${category}?page=${page}`, {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache the result
            this.performanceManager.setCache(cacheKey, data);
            
            this.renderNews(data.news || []);
            this.updatePagination(data.page || 1, data.total_pages || 1);
            
            this.showToast(`✅ Loaded ${data.news?.length || 0} articles`, 'success');

        } catch (error) {
            console.error('❌ News loading error:', error);
            this.showToast(`Error loading news: ${error.message}`, 'error');
            this.renderError();
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }

    renderNews(newsItems) {
        const newsContainer = document.getElementById('newsContainer');
        if (!newsContainer) return;

        // Clear existing content
        newsContainer.innerHTML = '';

        if (!newsItems || newsItems.length === 0) {
            newsContainer.innerHTML = this.createEmptyState();
            return;
        }

        // Create articles with staggered animation
        newsItems.forEach((news, index) => {
            const articleElement = this.createNewsCard(news, index);
            newsContainer.appendChild(articleElement);
            
            // Staggered animation
            requestAnimationFrame(() => {
                setTimeout(() => {
                    articleElement.style.opacity = '1';
                    articleElement.style.transform = 'translateY(0)';
                }, index * 100);
            });
        });

        newsContainer.style.display = 'block';
    }

    createNewsCard(news, index) {
        const article = document.createElement('article');
        article.className = 'news-article prevent-layout-shift';
        article.dataset.id = news.id;
        article.style.cssText = 'opacity: 0; transform: translateY(20px); transition: all 0.5s ease-out;';
        
        // Generate random stats for demo
        const stats = {
            upvotes: Math.floor(Math.random() * 100000) + 1000,
            comments: Math.floor(Math.random() * 5000) + 100,
            views: Math.floor(Math.random() * 500000) + 10000,
            progress: Math.floor(Math.random() * 100) + 1
        };

        article.innerHTML = `
            <div class="article-header">
                <div class="article-meta">
                    <span class="priority-tag priority-${this.getRandomPriority()}">[${this.getRandomPriority().toUpperCase()}]</span>
                    <span class="category-tag">[${(news.source || 'UNKNOWN').toUpperCase()}]</span>
                    <span class="file-type">FILE_TYPE: ${this.getRandomFileType()}</span>
                </div>
                <div class="timestamp">${this.formatTimestamp(news.published)}</div>
            </div>
            <div class="article-content">
                <div class="article-icon">${news.emoji || '📰'}</div>
                <h2 class="article-title">${this.escapeHtml(news.title)}</h2>
                <p class="article-preview">${this.escapeHtml(news.description || 'No description available.')}</p>
                <div class="article-tags">
                    ${this.generateRandomTags().map(tag => 
                        `<span class="tag">#${tag}</span>`
                    ).join('')}
                </div>
                <div class="article-stats">
                    <div class="stats-left">
                        <div class="stat-item upvotes">▲ ${stats.upvotes.toLocaleString()}</div>
                        <div class="stat-item comments">💬 ${stats.comments.toLocaleString()}</div>
                        <div class="stat-item views">👁 ${stats.views.toLocaleString()}</div>
                    </div>
                    <div class="action-buttons">
                        <button class="btn btn-exec">[EXEC]</button>
                        <button class="btn btn-share">[SHARE]</button>
                        <button class="btn btn-save">[SAVE]</button>
                    </div>
                </div>
            </div>
            <div class="progress-bar">
                <span class="progress-label">LOADING:</span>
                <div class="progress-fill">
                    <div class="progress-bar-fill" style="width: ${stats.progress}%;"></div>
                </div>
                <span class="progress-status">[OK]</span>
            </div>
        `;

        return article;
    }

    createEmptyState() {
        return `
            <div style="text-align: center; padding: 4rem; color: var(--terminal-amber);">
                <div style="font-size: 4rem; margin-bottom: 2rem;">🤖</div>
                <h3 style="color: var(--terminal-green); margin-bottom: 1rem; font-family: var(--font-mono);">
                    NO DATA STREAMS DETECTED
                </h3>
                <p style="color: var(--text-gray); font-family: var(--font-mono);">
                    Neural networks are currently offline. Please try again later.
                </p>
            </div>
        `;
    }

    renderError() {
        const newsContainer = document.getElementById('newsContainer');
        if (!newsContainer) return;

        newsContainer.innerHTML = `
            <div style="text-align: center; padding: 4rem;">
                <div style="font-size: 4rem; margin-bottom: 2rem; color: var(--terminal-red);">❌</div>
                <h3 style="color: var(--terminal-red); margin-bottom: 1rem; font-family: var(--font-mono);">
                    SYSTEM ERROR: DATA_FETCH_FAILED
                </h3>
                <p style="color: var(--text-gray); margin-bottom: 2rem; font-family: var(--font-mono);">
                    Unable to establish connection with news servers.<br>
                    Please check your network connection and try again.
                </p>
                <button onclick="retroNewsPortal.executeRefreshCommand()" 
                        style="background: var(--terminal-green); color: var(--bg-black); border: none; padding: 1rem 2rem; 
                               font-family: var(--font-mono); font-weight: bold; cursor: pointer; text-transform: uppercase;">
                    🔄 RETRY CONNECTION
                </button>
            </div>
        `;
        newsContainer.style.display = 'block';
    }

    // ===============================
    // ARTICLE MODAL
    // ===============================

    async showArticleModal(articleId) {
        const modal = document.getElementById('articleModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalTitle || !modalBody) return;

        // Show modal with loading state
        modalTitle.textContent = `LOADING ARTICLE_${articleId.padStart(4, '0')}.DAT`;
        modalBody.innerHTML = this.createLoadingState('EXTRACTING ARTICLE DATA...');
        modal.style.display = 'flex';

        try {
            const response = await fetch(`/api/article/${articleId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const article = await response.json();
            this.currentArticle = article;

            // Update modal content
            modalTitle.textContent = `ARTICLE_${articleId.padStart(4, '0')}.DAT`;
            modalBody.innerHTML = this.formatArticleContent(article);

            this.showToast('📰 Article loaded successfully', 'success');

        } catch (error) {
            console.error('❌ Article loading error:', error);
            modalTitle.textContent = 'ERROR_LOADING_ARTICLE';
            modalBody.innerHTML = this.createErrorState(error.message);
            this.showToast(`Error loading article: ${error.message}`, 'error');
        }
    }

    formatArticleContent(article) {
        return `
            <div style="color: var(--terminal-green); font-family: var(--font-mono); line-height: 1.8;">
                <div style="margin-bottom: 2rem; padding: 1rem; background: var(--bg-dark); border: 1px solid var(--terminal-cyan);">
                    <h3 style="color: var(--terminal-cyan); margin-bottom: 1rem; font-size: 1.2rem;">
                        ${this.escapeHtml(article.title)}
                    </h3>
                    <div style="display: flex; gap: 2rem; margin-bottom: 1rem; font-size: 0.9rem;">
                        <span style="color: var(--terminal-amber);">SOURCE: ${this.escapeHtml(article.source)}</span>
                        <span style="color: var(--terminal-purple);">TIME: ${this.escapeHtml(article.published)}</span>
                    </div>
                    <a href="${article.link}" target="_blank" rel="noopener noreferrer" 
                       style="color: var(--terminal-green); text-decoration: none;">
                        🔗 [ORIGINAL_LINK]
                    </a>
                </div>
                
                <div style="white-space: pre-wrap; line-height: 1.8;">
                    ${this.formatArticleText(article.content)}
                </div>
                
                <div style="margin-top: 2rem; padding: 1rem; background: var(--bg-dark); border: 1px solid var(--terminal-green);">
                    <strong style="color: var(--terminal-amber);">SYSTEM_STATUS:</strong> Article loaded successfully<br>
                    <strong style="color: var(--terminal-cyan);">AI_ANALYSIS:</strong> Available via chat interface<br>
                    <strong style="color: var(--terminal-purple);">WORD_COUNT:</strong> ${this.countWords(article.content)} words
                </div>
            </div>
        `;
    }

    formatArticleText(content) {
        if (!content) return 'Content not available.';
        
        return content
            .split('\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => {
                // Format headers
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    const headerText = paragraph.slice(2, -2);
                    return `<h4 style="color: var(--terminal-cyan); margin: 1.5rem 0 1rem 0; font-size: 1.1rem;">${headerText}</h4>`;
                }
                
                // Format bullet points
                if (paragraph.startsWith('•') || paragraph.startsWith('-')) {
                    return `<div style="margin-left: 2rem; margin-bottom: 0.5rem; color: var(--terminal-green);">▶ ${paragraph.slice(1).trim()}</div>`;
                }
                
                // Regular paragraphs
                return `<p style="margin-bottom: 1.5rem; text-align: justify;">${paragraph}</p>`;
            })
            .join('');
    }

    closeArticleModal() {
        const modal = document.getElementById('articleModal');
        if (modal) {
            modal.style.display = 'none';
            this.currentArticle = null;
        }
    }

    // ===============================
    // CHAT SYSTEM
    // ===============================

    openChatWindow() {
        document.getElementById('chatBubble').style.display = 'none';
        document.getElementById('chatWindow').style.display = 'flex';
    }

    minimizeChatWindow() {
        document.getElementById('chatWindow').style.display = 'none';
        document.getElementById('chatBubble').style.display = 'block';
    }

    closeChatWindow() {
        document.getElementById('chatWindow').style.display = 'none';
        document.getElementById('chatBubble').style.display = 'block';
    }

    async handleSummaryRequest() {
        if (this.aiRequestInProgress) {
            this.showToast('AI is processing another request...', 'warning');
            return;
        }

        if (!this.currentArticle) {
            this.showToast('Please open an article first', 'error');
            return;
        }

        this.aiRequestInProgress = true;
        this.addChatMessage('📋 Analyzing article for summary...', 'user');
        this.showAITyping();

        try {
            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: '' }) // Empty for auto-summary
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.hideAITyping();
            this.addChatMessage(this.formatAIResponse(data.response), 'ai');
            this.showToast('✅ Summary completed', 'success');

        } catch (error) {
            this.hideAITyping();
            this.addChatMessage(`❌ Summary error: ${error.message}`, 'ai');
            this.showToast('Error generating summary', 'error');
        } finally {
            this.aiRequestInProgress = false;
        }
    }

    async handleDebateRequest() {
        if (this.aiRequestInProgress) {
            this.showToast('AI is processing another request...', 'warning');
            return;
        }

        if (!this.currentArticle) {
            this.showToast('Please open an article first', 'error');
            return;
        }

        this.aiRequestInProgress = true;
        this.addChatMessage('🎭 Initializing multi-perspective debate...', 'user');
        this.showAITyping();

        try {
            const response = await fetch('/api/ai/debate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: '' }) // Empty for auto-debate
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.hideAITyping();
            this.displayDebateAsCharacters(data.response);
            this.showToast('✅ Debate completed', 'success');

        } catch (error) {
            this.hideAITyping();
            this.addChatMessage(`❌ Debate error: ${error.message}`, 'ai');
            this.showToast('Error generating debate', 'error');
        } finally {
            this.aiRequestInProgress = false;
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (!message || this.aiRequestInProgress) return;

        this.addChatMessage(message, 'user');
        input.value = '';

        this.aiRequestInProgress = true;
        this.showAITyping();

        try {
            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: message })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.hideAITyping();
            this.addChatMessage(this.formatAIResponse(data.response), 'ai');

        } catch (error) {
            this.hideAITyping();
            this.addChatMessage(`❌ Error: ${error.message}`, 'ai');
        } finally {
            this.aiRequestInProgress = false;
        }
    }

    displayDebateAsCharacters(debateText) {
        const characters = [
            { name: 'ECONOMIST_BOT', emoji: '🏦', color: 'var(--terminal-cyan)' },
            { name: 'CRYPTO_MAXIMALIST', emoji: '₿', color: 'var(--terminal-amber)' },
            { name: 'ACADEMIC_AI', emoji: '🎓', color: 'var(--terminal-blue)' },
            { name: 'CORPORATE_DRONE', emoji: '💼', color: 'var(--terminal-purple)' },
            { name: 'META_AI', emoji: '🤖', color: 'var(--terminal-green)' }
        ];

        // Simulate character responses with delays
        characters.forEach((character, index) => {
            setTimeout(() => {
                const message = this.generateCharacterResponse(character, debateText);
                this.addCharacterMessage(character, message);
            }, (index + 1) * 1500);
        });
    }

    generateCharacterResponse(character, context) {
        // Simple character-based responses (in production, this would be parsed from AI response)
        const responses = {
            'ECONOMIST_BOT': 'Market fundamentals suggest a correction phase. Historical data supports recovery patterns.',
            'CRYPTO_MAXIMALIST': 'This is why we need decentralized systems. Bitcoin fixes everything!',
            'ACADEMIC_AI': 'Multiple variables indicate complex socioeconomic factors at play.',
            'CORPORATE_DRONE': 'Quarterly projections remain optimized. Stakeholder value is our priority.',
            'META_AI': 'All perspectives synthesized. Truth emerges from collaborative analysis.'
        };
        
        return responses[character.name] || 'Processing perspective...';
    }

    addCharacterMessage(character, message) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message ai';
        messageDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span style="font-size: 1.2rem;">${character.emoji}</span>
                <strong style="color: ${character.color}; font-size: 0.9rem;">${character.name}</strong>
            </div>
            <div>${message}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    addChatMessage(content, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.innerHTML = content.replace(/\n/g, '<br>');

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Store message
        this.chatMessages.push({ content, sender, timestamp: Date.now() });
        
        // Limit message history
        if (this.chatMessages.length > 50) {
            this.chatMessages = this.chatMessages.slice(-30);
        }
    }

    formatAIResponse(content) {
        if (!content) return content;

        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--terminal-amber);">$1</strong>')
            .replace(/^[-•]\s*/gm, '▶ ')
            .replace(/^\d+[\.\)]\s*/gm, match => `<span style="color: var(--terminal-cyan);">${match}</span>`)
            .replace(/\n\n/g, '<br><br>');
    }

    showAITyping() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'chat-message ai';
        typingDiv.innerHTML = 'AI_CORE> Processing<span class="cursor">█</span>';
        
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    hideAITyping() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // ===============================
    // SYSTEM UPDATES & UTILITIES
    // ===============================

    startSystemUpdates() {
        // Update time display
        setInterval(() => {
            const now = new Date();
            const timeElement = document.getElementById('currentTime');
            if (timeElement) {
                timeElement.textContent = now.toTimeString().split(' ')[0];
            }
        }, 1000);

        // Update system stats
        setInterval(() => {
            this.updateStats();
        }, 5000);

        // Periodic glitch effects
        setInterval(() => {
            if (Math.random() < 0.3) { // 30% chance
                this.effectsManager.triggerGlitch('medium');
            }
        }, 15000);

        // Clean up old cache entries
        setInterval(() => {
            this.performanceManager.cache.clear();
        }, 300000); // 5 minutes
    }

    updateStats() {
        const variance = () => Math.floor(Math.random() * 1000);
        
        this.systemStats.activeUsers += variance();
        this.systemStats.aiQueries += Math.floor(variance() / 10);
        this.systemStats.newsParsed += Math.floor(variance() / 20);
        this.systemStats.systemLoad = Math.max(30, Math.min(95, this.systemStats.systemLoad + (Math.random() - 0.5) * 10));

        // Update DOM
        const elements = {
            'activeUsers': this.systemStats.activeUsers.toLocaleString(),
            'aiQueries': this.systemStats.aiQueries.toLocaleString(),
            'newsParsed': this.systemStats.newsParsed.toLocaleString(),
            'systemLoad': Math.floor(this.systemStats.systemLoad) + '%'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    simulateSystemBoot() {
        const loadingContainer = document.getElementById('loadingContainer');
        const newsContainer = document.getElementById('newsContainer');
        
        if (loadingContainer && newsContainer) {
            // Show loading for 2 seconds
            setTimeout(() => {
                loadingContainer.style.display = 'none';
                newsContainer.style.display = 'block';
            }, 2000);
        }
    }

    refreshNews() {
        this.loadNews(this.currentCategory, this.currentPage);
    }

    showLoading() {
        const loadingContainer = document.getElementById('loadingContainer');
        const newsContainer = document.getElementById('newsContainer');
        
        if (loadingContainer) loadingContainer.style.display = 'block';
        if (newsContainer) newsContainer.style.display = 'none';
    }

    hideLoading() {
        const loadingContainer = document.getElementById('loadingContainer');
        const newsContainer = document.getElementById('newsContainer');
        
        if (loadingContainer) loadingContainer.style.display = 'none';
        if (newsContainer) newsContainer.style.display = 'block';
    }

    updatePagination(currentPage, totalPages) {
        // Implementation for pagination if needed
        console.log(`Pagination: ${currentPage}/${totalPages}`);
    }

    initializeIntersectionObservers() {
        // Lazy loading for news articles
        const newsObserver = this.performanceManager.createIntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('gpu-accelerated');
                }
            });
        });

        // Observe news articles when they're added
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('news-article')) {
                        newsObserver.observe(node);
                    }
                });
            });
        });

        const newsContainer = document.getElementById('newsContainer');
        if (newsContainer) {
            observer.observe(newsContainer, { childList: true });
        }
    }

    setupKeyboardShortcuts() {
        // Additional keyboard shortcuts can be added here
        console.log('🎹 Keyboard shortcuts initialized');
    }

    // ===============================
    // UTILITY FUNCTIONS
    // ===============================

    showTerminalResponse(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-black);
            border: 2px solid var(--terminal-green);
            padding: 1rem;
            color: var(--terminal-green);
            font-family: var(--font-mono);
            font-size: 12px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: var(--shadow-glow);
            white-space: pre-line;
        `;
        
        // Color based on type
        const colors = {
            'success': 'var(--terminal-green)',
            'error': 'var(--terminal-red)',
            'warning': 'var(--terminal-amber)',
            'info': 'var(--terminal-cyan)'
        };
        
        toast.style.borderColor = colors[type] || colors.info;
        toast.style.color = colors[type] || colors.info;
        toast.textContent = message;
        
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'all 0.5s ease-out';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 500);
        }, 4000);

        this.effectsManager.playTerminalSound(type === 'error' ? 'error' : 'beep');
    }

    showToast(message, type = 'info') {
        this.showTerminalResponse(message, type);
    }

    createLoadingState(message = 'Loading...') {
        return `
            <div class="loading">
                <div class="spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;
    }

    createErrorState(message) {
        return `
            <div style="text-align: center; padding: 2rem; color: var(--terminal-red);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h3 style="margin-bottom: 1rem;">SYSTEM ERROR</h3>
                <p style="font-family: var(--font-mono); font-size: 0.9rem;">${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    getPerformanceStats() {
        const performance = window.performance;
        return {
            loadTime: Math.round(performance.now()),
            memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 'N/A'
        };
    }

    // Helper functions
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    formatTimestamp(published) {
        if (!published) return 'UNKNOWN_TIME';
        return published.replace(/[:\s]/g, '_').toUpperCase();
    }

    getRandomPriority() {
        const priorities = ['critical', 'urgent', 'high', 'medium'];
        return priorities[Math.floor(Math.random() * priorities.length)];
    }

    getRandomFileType() {
        const types = ['JSON', 'XML', 'BINARY', 'TEXT', 'CRYPTO', 'NEURAL'];
        return types[Math.floor(Math.random() * types.length)];
    }

    generateRandomTags() {
        const tags = ['TECH', 'AI', 'CRYPTO', 'NEWS', 'FINANCE', 'BREAKING', 'URGENT', 'ANALYSIS'];
        const count = Math.floor(Math.random() * 4) + 2;
        return tags.sort(() => 0.5 - Math.random()).slice(0, count);
    }

    countWords(text) {
        return text ? text.split(/\s+/).length : 0;
    }
}

// ===============================
// INITIALIZATION & GLOBAL SETUP
// ===============================

// Global error handling
window.addEventListener('error', (e) => {
    console.error('🚨 Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 Promise rejection:', e.reason);
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];
        console.log('📊 Performance Report:', {
            loadTime: Math.round(performance.now()),
            domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
            resources: performance.getEntriesByType('resource').length
        });
    });
}

// Initialize when DOM is ready
let retroNewsPortal;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Retro Brutalism News Portal...');
    
    try {
        retroNewsPortal = new RetroNewsPortal();
        window.retroNewsPortal = retroNewsPortal; // Global access for debugging
        
        console.log('✅ Retro Brutalism News Portal initialized successfully!');
        console.log('🎨 Theme: Neo-brutalism + Terminal aesthetic');
        console.log('⚡ Features: AI chat, glitch effects, matrix mode, terminal commands');
        
    } catch (error) {
        console.error('❌ Failed to initialize:', error);
        
        // Fallback error display
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; 
                        min-height: 100vh; text-align: center; padding: 2rem; background: var(--bg-black); 
                        color: var(--terminal-red); font-family: var(--font-mono);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">💀</div>
                <h1 style="margin-bottom: 1rem;">SYSTEM FAILURE</h1>
                <p style="margin-bottom: 2rem; color: var(--text-gray);">${error.message}</p>
                <button onclick="location.reload()" 
                        style="background: var(--terminal-green); color: var(--bg-black); border: none; 
                               padding: 1rem 2rem; font-family: var(--font-mono); font-weight: bold; 
                               cursor: pointer; text-transform: uppercase;">
                    🔄 RESTART SYSTEM
                </button>
            </div>
        `;
    }
});

// Console branding
console.log(`
╔══════════════════════════════════════════════════════════════╗
║              RETRO BRUTALISM NEWS PORTAL v2.024              ║
║                        SYSTEM LOADED                         ║
║                                                              ║
║  🤖 AI-Powered Financial News Portal                        ║
║  🎮 Neo-brutalist Design + Terminal Interface               ║
║  ⚡ Modern Performance + Retro Aesthetics                   ║
║  🔥 Matrix Mode + Glitch Effects                            ║
║                                                              ║
║  Type 'help' in terminal for available commands             ║
║  Press F4 for Matrix mode, F5 to refresh                    ║
╚══════════════════════════════════════════════════════════════╝
`);

// Service Worker registration (if available)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then(registration => {
                console.log('✅ SW registered:', registration.scope);
            })
            .catch(error => {
                console.log('❌ SW registration failed:', error);
            });
    });
}
