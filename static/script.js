// E-con News Portal - VietStock Style JavaScript 2025
class VietStockNewsPortal {
    constructor() {
        this.currentPage = 1;
        this.currentCategory = 'all';
        this.isLoading = false;
        this.currentArticle = null;
        this.aiRequestInProgress = false;
        this.chatMessages = [];
        
        // Performance optimization
        this.cache = new Map();
        this.maxCacheSize = 20;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing VietStock News Portal...');
        
        try {
            this.createParticles();
            this.bindEvents();
            this.setupMarketData();
            this.setupErrorHandling();
            
            // Load initial news
            await this.loadNews('all', 1);
            
            console.log('✅ VietStock News Portal initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            this.showToast('Lỗi khởi tạo ứng dụng: ' + error.message, 'error');
        }
    }

    createParticles() {
        const container = document.querySelector('.particles-container');
        if (!container) {
            // Create particles container
            const particlesDiv = document.createElement('div');
            particlesDiv.className = 'particles-container';
            document.body.appendChild(particlesDiv);
            
            // Create particles
            for (let i = 0; i < 15; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 6 + 's';
                particle.style.animationDuration = (6 + Math.random() * 4) + 's';
                particlesDiv.appendChild(particle);
            }
        }
    }

    bindEvents() {
        // Category links
        document.querySelectorAll('.econ-category-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.currentTarget.dataset.category;
                this.switchCategory(category);
            });
        });

        // Filter tabs
        document.querySelectorAll('.econ-filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const type = e.currentTarget.dataset.type;
                this.switchCategory(type);
            });
        });

        // Pagination
        const prevBtn = document.getElementById('econPrevPageBtn');
        const nextBtn = document.getElementById('econNextPageBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.loadNews(this.currentCategory, this.currentPage - 1);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = parseInt(document.querySelector('.econ-pagination-total')?.textContent || '1');
                if (this.currentPage < totalPages) {
                    this.loadNews(this.currentCategory, this.currentPage + 1);
                }
            });
        }

        // Article modal close
        const closeBtn = document.getElementById('econCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeArticleModal());
        }

        // Chat functionality
        this.setupChatEvents();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupChatEvents() {
        const chatBubble = document.getElementById('econChatBubble');
        const chatWindow = document.getElementById('econChatWindow');
        const chatMinimize = document.getElementById('econChatMinimize');
        const chatClose = document.getElementById('econChatClose');

        // Show chat window
        if (chatBubble) {
            chatBubble.addEventListener('click', () => this.openChatWindow());
        }

        // Minimize chat
        if (chatMinimize) {
            chatMinimize.addEventListener('click', () => this.minimizeChatWindow());
        }

        // Close chat
        if (chatClose) {
            chatClose.addEventListener('click', () => this.closeChatWindow());
        }

        // FIXED: Chat input and buttons
        this.setupChatInputEvents();
    }

    setupChatInputEvents() {
        const summaryBtn = document.getElementById('econSummaryBtn');
        const debateBtn = document.getElementById('econDebateBtn');
        const sendBtn = document.getElementById('econSendBtn');
        const chatInput = document.getElementById('econChatInput');

        // FIXED: Summary button click handler
        if (summaryBtn) {
            summaryBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📋 Summary button clicked');
                
                if (this.aiRequestInProgress) {
                    this.showToast('AI đang xử lý yêu cầu khác...', 'info');
                    return;
                }
                
                await this.handleSummaryRequest();
            });
        }

        // FIXED: Debate button click handler  
        if (debateBtn) {
            debateBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎭 Debate button clicked');
                
                if (this.aiRequestInProgress) {
                    this.showToast('AI đang xử lý yêu cầu khác...', 'info');
                    return;
                }
                
                await this.handleDebateRequest();
            });
        }

        // Send button
        if (sendBtn) {
            sendBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const message = chatInput.value.trim();
                if (message && !this.aiRequestInProgress) {
                    await this.sendChatMessage(message);
                }
            });
        }

        // Chat input
        if (chatInput) {
            chatInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const message = e.target.value.trim();
                    if (message && !this.aiRequestInProgress) {
                        await this.sendChatMessage(message);
                    }
                }
            });

            // Auto-resize
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
            });
        }
    }

    async handleSummaryRequest() {
        console.log('🔄 Processing summary request...');
        
        if (!this.currentArticle) {
            this.showToast('Vui lòng mở một bài báo trước khi yêu cầu tóm tắt', 'warning');
            return;
        }

        try {
            this.aiRequestInProgress = true;
            this.addChatMessage('📋 Đang tóm tắt bài báo...', 'user');
            this.showTypingIndicator();

            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    question: '' // Empty for auto-summary
                })
            });

            this.hideTypingIndicator();

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.addChatMessage(data.response, 'ai');
            this.showToast('✅ Tóm tắt hoàn thành', 'success');

        } catch (error) {
            console.error('❌ Summary error:', error);
            this.hideTypingIndicator();
            this.addChatMessage(`❌ Lỗi tóm tắt: ${error.message}`, 'ai');
            this.showToast('Lỗi khi tóm tắt bài báo', 'error');
        } finally {
            this.aiRequestInProgress = false;
        }
    }

    async handleDebateRequest() {
        console.log('🔄 Processing debate request...');
        
        if (!this.currentArticle) {
            this.showToast('Vui lòng mở một bài báo trước khi yêu cầu bàn luận', 'warning');
            return;
        }

        try {
            this.aiRequestInProgress = true;
            this.addChatMessage('🎭 Đang tổ chức cuộc bàn luận...', 'user');
            this.showTypingIndicator();

            const response = await fetch('/api/ai/debate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    topic: '' // Empty for auto-debate about current article
                })
            });

            this.hideTypingIndicator();

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.addChatMessage(data.response, 'ai');
            this.showToast('✅ Cuộc bàn luận hoàn thành', 'success');

        } catch (error) {
            console.error('❌ Debate error:', error);
            this.hideTypingIndicator();
            this.addChatMessage(`❌ Lỗi bàn luận: ${error.message}`, 'ai');
            this.showToast('Lỗi khi tổ chức bàn luận', 'error');
        } finally {
            this.aiRequestInProgress = false;
        }
    }

    async sendChatMessage(message) {
        if (!message.trim() || this.aiRequestInProgress) return;

        // Add user message
        this.addChatMessage(message, 'user');
        
        // Clear input
        const chatInput = document.getElementById('econChatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }

        // Send to AI
        try {
            this.aiRequestInProgress = true;
            this.showTypingIndicator();

            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    question: message
                })
            });

            this.hideTypingIndicator();

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.addChatMessage(data.response, 'ai');

        } catch (error) {
            console.error('❌ Chat error:', error);
            this.hideTypingIndicator();
            this.addChatMessage(`❌ Lỗi: ${error.message}`, 'ai');
        } finally {
            this.aiRequestInProgress = false;
        }
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'econ-message econ-message-ai';
        typingDiv.id = 'econ-typing-indicator';
        typingDiv.innerHTML = `
            <div class="econ-message-bubble">
                <div style="display: flex; gap: 4px; align-items: center;">
                    <div style="width: 6px; height: 6px; background: currentColor; border-radius: 50%; animation: bounce 1s infinite;"></div>
                    <div style="width: 6px; height: 6px; background: currentColor; border-radius: 50%; animation: bounce 1s infinite 0.2s;"></div>
                    <div style="width: 6px; height: 6px; background: currentColor; border-radius: 50%; animation: bounce 1s infinite 0.4s;"></div>
                </div>
            </div>
        `;

        const chatMessages = document.getElementById('econChatMessages');
        if (chatMessages) {
            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('econ-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    addChatMessage(content, sender = 'ai') {
        const chatMessages = document.getElementById('econChatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `econ-message econ-message-${sender}`;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <div class="econ-message-bubble">${this.escapeHtml(content)}</div>
            <div class="econ-message-time">${timeStr}</div>
        `;

        chatMessages.appendChild(messageDiv);

        // Scroll to bottom with smooth animation
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);

        // Store message
        this.chatMessages.push({ content, sender, timestamp: now });
        
        // Limit message history
        if (this.chatMessages.length > 50) {
            this.chatMessages = this.chatMessages.slice(-30);
        }
    }

    openChatWindow() {
        const chatBubble = document.getElementById('econChatBubble');
        const chatWindow = document.getElementById('econChatWindow');
        
        if (chatBubble && chatWindow) {
            chatBubble.style.display = 'none';
            chatWindow.style.display = 'flex';
            
            // Focus on input
            setTimeout(() => {
                const chatInput = document.getElementById('econChatInput');
                if (chatInput) {
                    chatInput.focus();
                }
            }, 300);
        }
    }

    minimizeChatWindow() {
        const chatBubble = document.getElementById('econChatBubble');
        const chatWindow = document.getElementById('econChatWindow');
        
        if (chatBubble && chatWindow) {
            chatWindow.style.display = 'none';
            chatBubble.style.display = 'flex';
        }
    }

    closeChatWindow() {
        const floatingChat = document.getElementById('econFloatingChat');
        
        if (floatingChat) {
            floatingChat.style.opacity = '0';
            floatingChat.style.transform = 'translateY(20px) scale(0.8)';
            
            setTimeout(() => {
                floatingChat.style.display = 'none';
            }, 500);
        }
    }

    setupMarketData() {
        // Simulate real-time market data updates
        this.updateMarketData();
        setInterval(() => this.updateMarketData(), 30000); // Update every 30 seconds
    }

    updateMarketData() {
        const marketItems = document.querySelectorAll('.econ-market-item');
        marketItems.forEach(item => {
            const valueEl = item.querySelector('.econ-market-value');
            const changeEl = item.querySelector('.econ-market-change');
            
            if (valueEl && changeEl) {
                // Simulate small random changes
                const currentValue = parseFloat(valueEl.textContent) || 1000;
                const change = (Math.random() - 0.5) * 10;
                const newValue = currentValue + change;
                const changePercent = ((change / currentValue) * 100).toFixed(2);
                
                valueEl.textContent = newValue.toFixed(2);
                changeEl.textContent = `${change >= 0 ? '+' : ''}${changePercent}%`;
                changeEl.className = `econ-market-change ${change >= 0 ? 'positive' : 'negative'}`;
            }
        });
    }

    async switchCategory(category) {
        if (this.isLoading || category === this.currentCategory) return;

        // Update active states
        document.querySelectorAll('.econ-category-link, .econ-filter-tab').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-category="${category}"], [data-type="${category}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentCategory = category;
        await this.loadNews(category, 1);
    }

    async loadNews(category, page) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.currentPage = page;

        // Check cache first
        const cacheKey = `${category}-${page}`;
        if (this.cache.has(cacheKey)) {
            const cachedData = this.cache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 minutes
                this.renderNews(cachedData.news);
                this.updatePagination(cachedData.page, cachedData.total_pages);
                this.isLoading = false;
                return;
            }
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/news/${category}?page=${page}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, {
                ...data,
                timestamp: Date.now()
            });
            
            // Limit cache size
            if (this.cache.size > this.maxCacheSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            
            this.renderNews(data.news);
            this.updatePagination(data.page, data.total_pages);
            this.showToast(`✅ Đã tải ${data.news.length} tin tức`, 'success');

        } catch (error) {
            console.error('❌ News loading error:', error);
            this.showToast('Lỗi khi tải tin tức: ' + error.message, 'error');
            this.renderError();
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }

    renderNews(newsItems) {
        const newsGrid = document.getElementById('econNewsGrid');
        if (!newsGrid) return;

        newsGrid.innerHTML = '';

        if (newsItems.length === 0) {
            newsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--vs-text-secondary);">
                    📰 Không có tin tức nào được tìm thấy
                </div>
            `;
            return;
        }

        newsItems.forEach((news, index) => {
            const newsCard = this.createNewsCard(news, index);
            newsGrid.appendChild(newsCard);
            
            // FAST 0.5s animation
            requestAnimationFrame(() => {
                newsCard.style.opacity = '0';
                newsCard.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    newsCard.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                    newsCard.style.opacity = '1';
                    newsCard.style.transform = 'translateY(0)';
                }, index * 50); // Stagger animation
            });
        });
    }

    createNewsCard(news, index) {
        const card = document.createElement('div');
        card.className = 'econ-news-card';
        card.dataset.articleId = news.id;
        
        card.innerHTML = `
            <div class="econ-news-card-header">
                <div class="econ-news-source">
                    <div class="econ-source-icon">${news.emoji || '📰'}</div>
                    <span class="econ-source-name">${this.escapeHtml(news.source)}</span>
                </div>
                <span class="econ-news-time">${this.escapeHtml(news.published)}</span>
            </div>
            <div class="econ-news-card-body">
                <h3 class="econ-news-title">${this.escapeHtml(news.title)}</h3>
                <p class="econ-news-description">${this.escapeHtml(news.description)}</p>
            </div>
        `;

        // Event listeners
        const clickHandler = () => this.showArticleDetail(news.id);
        card.addEventListener('click', clickHandler);

        // Hover effects
        if (window.matchMedia('(hover: hover)').matches) {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        }

        return card;
    }

    async showArticleDetail(articleId) {
        try {
            this.showToast('📰 Đang tải chi tiết bài viết...', 'info');

            const response = await fetch(`/api/article/${articleId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    this.showToast('Không tìm thấy bài viết', 'error');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const article = await response.json();
            this.currentArticle = article;

            // Update article modal content
            const titleEl = document.getElementById('econArticleTitle');
            const sourceEl = document.getElementById('econArticleSource');
            const timeEl = document.getElementById('econArticleTime');
            const linkEl = document.getElementById('econArticleLink');
            const contentEl = document.getElementById('econArticleContent');

            if (titleEl) titleEl.textContent = article.title;
            if (sourceEl) sourceEl.textContent = article.source;
            if (timeEl) timeEl.textContent = article.published;
            if (linkEl) linkEl.href = article.link;
            if (contentEl) {
                // Enhanced content formatting
                contentEl.innerHTML = this.formatArticleContent(article.content);
            }

            // Show article modal
            this.showArticleModal();

            // Show chat widget with context
            this.showChatWithContext();

        } catch (error) {
            console.error('❌ Article loading error:', error);
            this.showToast('Lỗi khi tải bài viết: ' + error.message, 'error');
        }
    }

    formatArticleContent(content) {
        if (!content) return '';
        
        // Split into paragraphs and format
        let formatted = content
            .split('\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => {
                // Check if it's a headline (all caps, short, or starts with specific patterns)
                if (paragraph.length < 100 && 
                    (paragraph === paragraph.toUpperCase() || 
                     paragraph.match(/^[A-Z][^.]*:/) ||
                     paragraph.match(/^\*\*.*\*\*$/))) {
                    return `<h3>${paragraph.replace(/\*\*/g, '')}</h3>`;
                }
                
                // Regular paragraph
                return `<p>${paragraph}</p>`;
            })
            .join('');
            
        // Add image placeholder if content mentions images
        if (content.includes('ảnh') || content.includes('hình') || content.includes('image')) {
            formatted = `<div class="article-image-placeholder" style="width: 100%; height: 200px; background: linear-gradient(135deg, var(--vs-bg-secondary) 0%, var(--vs-border) 100%); border-radius: var(--vs-radius-md); display: flex; align-items: center; justify-content: center; margin: var(--vs-space-lg) 0; color: var(--vs-text-secondary);"><span>📷 Ảnh minh họa</span></div>` + formatted;
        }
        
        return formatted;
    }

    showArticleModal() {
        const modal = document.getElementById('econArticleModal');
        const mainContent = document.querySelector('.econ-main-content');
        
        if (modal && mainContent) {
            modal.style.display = 'flex';
            
            // FAST 0.5s animation
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.95)';
            
            requestAnimationFrame(() => {
                modal.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                modal.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });
        }
    }

    closeArticleModal() {
        const modal = document.getElementById('econArticleModal');
        
        if (modal) {
            modal.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                modal.style.display = 'none';
                this.currentArticle = null;
            }, 500);
        }
    }

    showChatWithContext() {
        const floatingChat = document.getElementById('econFloatingChat');
        const chatBubbleTitle = document.querySelector('.econ-chat-bubble-title');
        const chatBubbleSubtitle = document.querySelector('.econ-chat-bubble-subtitle');
        
        if (floatingChat) {
            // Update bubble text
            if (chatBubbleTitle) chatBubbleTitle.textContent = 'AI Assistant';
            if (chatBubbleSubtitle) chatBubbleSubtitle.textContent = 'Sẵn sàng phân tích bài báo!';
            
            // Show with smooth animation
            floatingChat.style.display = 'block';
            floatingChat.style.opacity = '0';
            floatingChat.style.transform = 'translateY(20px) scale(0.8)';
            
            setTimeout(() => {
                floatingChat.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                floatingChat.style.opacity = '1';
                floatingChat.style.transform = 'translateY(0) scale(1)';
            }, 100);
        }
    }

    updatePagination(currentPage, totalPages) {
        const paginationContainer = document.getElementById('econPaginationContainer');
        const prevBtn = document.getElementById('econPrevPageBtn');
        const nextBtn = document.getElementById('econNextPageBtn');
        const currentPageSpan = document.querySelector('.econ-pagination-current');
        const totalPagesSpan = document.querySelector('.econ-pagination-total');

        if (currentPageSpan) currentPageSpan.textContent = currentPage;
        if (totalPagesSpan) totalPagesSpan.textContent = totalPages;

        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

        if (paginationContainer) {
            paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }

    showLoading() {
        const loadingContainer = document.getElementById('econLoadingContainer');
        const newsGrid = document.getElementById('econNewsGrid');
        const paginationContainer = document.getElementById('econPaginationContainer');

        if (loadingContainer) {
            loadingContainer.style.display = 'flex';
            loadingContainer.style.opacity = '0';
            setTimeout(() => {
                loadingContainer.style.transition = 'opacity 0.3s ease';
                loadingContainer.style.opacity = '1';
            }, 10);
        }
        if (newsGrid) newsGrid.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'none';
    }

    hideLoading() {
        const loadingContainer = document.getElementById('econLoadingContainer');
        const newsGrid = document.getElementById('econNewsGrid');
        
        if (loadingContainer) {
            loadingContainer.style.transition = 'opacity 0.3s ease';
            loadingContainer.style.opacity = '0';
            setTimeout(() => {
                loadingContainer.style.display = 'none';
            }, 300);
        }
        if (newsGrid) newsGrid.style.display = 'grid';
    }

    renderError() {
        const newsGrid = document.getElementById('econNewsGrid');
        if (!newsGrid) return;

        newsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; text-align: center; gap: 1rem;">
                <div style="font-size: 3rem;">❌</div>
                <h3 style="color: var(--vs-text-primary); margin: 0;">Lỗi khi tải tin tức</h3>
                <p style="color: var(--vs-text-secondary); margin: 0;">Vui lòng thử lại sau</p>
                <button onclick="vietStockPortal.loadNews(vietStockPortal.currentCategory, vietStockPortal.currentPage)" 
                        style="padding: 0.5rem 1rem; background: var(--vs-primary); color: white; border: none; border-radius: var(--vs-radius-md); cursor: pointer; transition: all 0.3s ease;">
                    🔄 Thử lại
                </button>
            </div>
        `;
        newsGrid.style.display = 'grid';
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'Escape':
                    this.closeArticleModal();
                    break;
                case 'ArrowLeft':
                    if (this.currentPage > 1) {
                        this.loadNews(this.currentCategory, this.currentPage - 1);
                    }
                    break;
                case 'ArrowRight':
                    const totalPages = parseInt(document.querySelector('.econ-pagination-total')?.textContent || '1');
                    if (this.currentPage < totalPages) {
                        this.loadNews(this.currentCategory, this.currentPage + 1);
                    }
                    break;
            }
        });
    }

    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('🚨 Global error:', e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('🚨 Promise rejection:', e.reason);
        });
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('econToastContainer');
        if (!toastContainer) {
            // Create toast container if it doesn't exist
            const container = document.createElement('div');
            container.id = 'econToastContainer';
            container.className = 'econ-toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `econ-toast ${type}`;
        toast.textContent = message;

        document.getElementById('econToastContainer').appendChild(toast);

        // Show with animation
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Hide after 3 seconds
        setTimeout(() => {
            toast.style.transition = 'all 0.5s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 500);
        }, 3000);
    }

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

    // Performance monitoring
    getPerformanceReport() {
        return {
            cacheSize: this.cache.size,
            chatMessages: this.chatMessages.length,
            currentCategory: this.currentCategory,
            currentPage: this.currentPage,
            aiRequestInProgress: this.aiRequestInProgress
        };
    }
}

// Initialize when DOM is loaded
let vietStockPortal;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing VietStock News Portal...');
    
    try {
        vietStockPortal = new VietStockNewsPortal();
        
        // Add CSS animation for bounce effect
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-5px); }
                60% { transform: translateY(-3px); }
            }
        `;
        document.head.appendChild(style);
        
        console.log('✅ VietStock News Portal initialized successfully!');
        console.log('🎨 Theme: VietStock Professional with 3D Particles');
        
        // Performance report after 10 seconds
        setTimeout(() => {
            console.log('📊 Performance Report:', vietStockPortal.getPerformanceReport());
        }, 10000);

    } catch (error) {
        console.error('❌ Failed to initialize VietStock News Portal:', error);
        
        // Show error message
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
                <h1 style="color: var(--vs-danger); margin-bottom: 1rem;">Lỗi khởi tạo VietStock Portal</h1>
                <p style="color: var(--vs-text-secondary); margin-bottom: 2rem;">${error.message}</p>
                <button onclick="location.reload()" 
                        style="padding: 1rem 2rem; background: var(--vs-primary); color: white; border: none; border-radius: var(--vs-radius-md); cursor: pointer; font-size: 1rem;">
                    🔄 Tải lại trang
                </button>
            </div>
        `;
    }
});

// Global error handling
window.addEventListener('error', (e) => {
    console.error('🚨 Global VietStock error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 VietStock promise rejection:', e.reason);
});

// Make portal globally accessible for debugging
window.vietStockPortal = vietStockPortal;
