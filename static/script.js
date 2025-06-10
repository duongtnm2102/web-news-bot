// E-con News Portal - JavaScript (Render.com Optimized) 2025
class EconNewsPortal {
    constructor() {
        this.currentPage = 1;
        this.currentNewsType = 'all';
        this.isLoading = false;
        this.currentArticle = null;
        this.aiRequestInProgress = false;
        this.chatMessages = [];
        this.performanceMetrics = {
            loadTimes: [],
            errors: [],
            aiRequests: 0
        };
        
        // Render.com optimizations
        this.memoryUsage = { 
            newsCache: new Map(),
            maxCacheSize: 30 // Reduced for memory optimization
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing E-con News Portal...');
        
        try {
            this.bindEvents();
            this.setupIntersectionObserver();
            this.setupErrorHandling();
            this.setupMemoryManagement();
            this.setupRenderOptimizations();
            
            // Load initial news
            await this.loadNews('all', 1);
            
            console.log('✅ E-con News Portal initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize E-con News Portal:', error);
            this.showToast('Lỗi khởi tạo ứng dụng: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Navigation buttons
        document.querySelectorAll('.econ-nav-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newsType = e.currentTarget.dataset.type;
                this.switchNewsType(newsType);
            });
        });

        // Pagination
        const prevBtn = document.getElementById('econPrevPageBtn');
        const nextBtn = document.getElementById('econNextPageBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.loadNews(this.currentNewsType, this.currentPage - 1);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = parseInt(document.querySelector('.econ-pagination-total')?.textContent || '1');
                if (this.currentPage < totalPages) {
                    this.loadNews(this.currentNewsType, this.currentPage + 1);
                }
            });
        }

        // Article modal close button
        const closeBtn = document.getElementById('econCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeArticleModal());
        }

        // Floating Chat Widget functionality
        this.setupFloatingChat();

        // Floating action buttons
        const refreshBtn = document.getElementById('econRefreshBtn');
        const scrollTopBtn = document.getElementById('econScrollTopBtn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshNews());
        }
        
        if (scrollTopBtn) {
            scrollTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    setupFloatingChat() {
        const chatBubble = document.getElementById('econChatBubble');
        const chatWindow = document.getElementById('econChatWindow');
        const chatMinimize = document.getElementById('econChatMinimize');
        const chatClose = document.getElementById('econChatClose');
        const chatBubbleClose = document.getElementById('econChatBubbleClose');

        // Show chat bubble initially
        if (chatBubble) {
            setTimeout(() => {
                chatBubble.style.opacity = '1';
                chatBubble.style.transform = 'translateY(0)';
            }, 2000); // Show after 2 seconds
        }

        // Open chat window when clicking bubble
        if (chatBubble) {
            chatBubble.addEventListener('click', (e) => {
                if (e.target.closest('.econ-chat-bubble-close')) return;
                this.openChatWindow();
            });
        }

        // Minimize chat window
        if (chatMinimize) {
            chatMinimize.addEventListener('click', () => {
                this.minimizeChatWindow();
            });
        }

        // Close chat completely
        if (chatClose) {
            chatClose.addEventListener('click', () => {
                this.closeChatCompletely();
            });
        }

        // Close chat bubble
        if (chatBubbleClose) {
            chatBubbleClose.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeChatCompletely();
            });
        }

        // Setup chat functionality
        this.setupChatEvents();

        console.log('✅ Floating chat setup completed');
    }

    openChatWindow() {
        const chatBubble = document.getElementById('econChatBubble');
        const chatWindow = document.getElementById('econChatWindow');
        
        if (chatBubble && chatWindow) {
            chatBubble.style.display = 'none';
            chatWindow.style.display = 'flex';
            
            // Reset chat if needed
            this.resetChat();
            
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

    closeChatCompletely() {
        const floatingChat = document.getElementById('econFloatingChat');
        
        if (floatingChat) {
            floatingChat.style.opacity = '0';
            floatingChat.style.transform = 'translateY(20px) scale(0.8)';
            
            setTimeout(() => {
                floatingChat.style.display = 'none';
            }, 300);
        }
        
        // Clear chat data
        this.chatMessages = [];
    }

    setupChatEvents() {
        const summaryBtn = document.getElementById('econSummaryBtn');
        const debateBtn = document.getElementById('econDebateBtn');
        const sendBtn = document.getElementById('econSendBtn');
        const chatInput = document.getElementById('econChatInput');

        if (summaryBtn) {
            summaryBtn.addEventListener('click', async () => {
                await this.handleAIAction(() => this.askAI('', true), 'tóm tắt');
            });
        }

        if (debateBtn) {
            debateBtn.addEventListener('click', async () => {
                await this.handleAIAction(() => this.debateAI('', true), 'bàn luận');
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', async () => {
                const message = chatInput.value.trim();
                if (message && !this.aiRequestInProgress) {
                    await this.sendChatMessage(message);
                }
            });
        }

        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const message = e.target.value.trim();
                    if (message && !this.aiRequestInProgress) {
                        this.sendChatMessage(message);
                    }
                }
            });

            // Auto-resize textarea
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
            });
        }

        console.log('✅ Chat events setup completed');
    }

    async handleAIAction(actionFunction, actionName) {
        if (this.aiRequestInProgress) {
            this.showToast('AI đang xử lý yêu cầu khác, vui lòng đợi...', 'info');
            return;
        }

        try {
            this.aiRequestInProgress = true;
            this.performanceMetrics.aiRequests++;
            console.log(`🔄 Starting AI action: ${actionName}`);
            
            const startTime = performance.now();
            await actionFunction();
            const endTime = performance.now();
            
            this.performanceMetrics.loadTimes.push(endTime - startTime);
            console.log(`✅ AI action completed: ${actionName} (${Math.round(endTime - startTime)}ms)`);
        } catch (error) {
            console.error(`❌ AI action failed: ${actionName}`, error);
            this.performanceMetrics.errors.push({ action: actionName, error: error.message, timestamp: Date.now() });
            this.showToast(`Lỗi AI khi ${actionName}: ${error.message}`, 'error');
        } finally {
            this.aiRequestInProgress = false;
        }
    }

    setupIntersectionObserver() {
        // Optimized for Render.com low CPU
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '50px'
        });

        this.cardObserver = observer;
    }

    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('🚨 Global E-con Error:', e.error);
            this.performanceMetrics.errors.push({
                type: 'global',
                message: e.message,
                timestamp: Date.now()
            });
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('🚨 E-con Promise Rejection:', e.reason);
            this.performanceMetrics.errors.push({
                type: 'promise',
                reason: e.reason,
                timestamp: Date.now()
            });
        });
    }

    setupMemoryManagement() {
        // Render.com optimization: Clear cache when memory gets low
        setInterval(() => {
            if (this.memoryUsage.newsCache.size > this.memoryUsage.maxCacheSize) {
                const entries = Array.from(this.memoryUsage.newsCache.entries());
                // Keep only the newest half
                const keepEntries = entries.slice(-Math.floor(this.memoryUsage.maxCacheSize / 2));
                this.memoryUsage.newsCache.clear();
                keepEntries.forEach(([key, value]) => {
                    this.memoryUsage.newsCache.set(key, value);
                });
                console.log('🧹 E-con memory cache cleaned');
            }
        }, 120000); // Every 2 minutes
    }

    setupRenderOptimizations() {
        // Warm-up ping to prevent Render.com sleep
        this.warmUpInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                fetch('/api/news/all?page=1&limit=1')
                    .then(response => {
                        if (response.ok) {
                            console.log('🔥 E-con warm-up successful');
                        }
                    })
                    .catch(() => {
                        console.log('🧊 E-con warm-up failed');
                    });
            }
        }, 10 * 60 * 1000); // Every 10 minutes

        // Clear interval when page is hidden to save resources
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                if (this.warmUpInterval) {
                    clearInterval(this.warmUpInterval);
                }
            } else {
                this.setupRenderOptimizations(); // Restart when visible
            }
        });
    }

    async switchNewsType(newsType) {
        if (this.isLoading || newsType === this.currentNewsType) return;

        // Update active button
        document.querySelectorAll('.econ-nav-pill').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        
        const activeBtn = document.querySelector(`[data-type="${newsType}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.setAttribute('aria-pressed', 'true');
        }

        this.currentNewsType = newsType;
        await this.loadNews(newsType, 1);
    }

    async loadNews(newsType, page) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.currentPage = page;

        // Check cache first (Render.com optimization)
        const cacheKey = `${newsType}-${page}`;
        if (this.memoryUsage.newsCache.has(cacheKey)) {
            const cachedData = this.memoryUsage.newsCache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < 3 * 60 * 1000) { // 3 minutes
                this.renderNews(cachedData.news);
                this.updatePagination(cachedData.page, cachedData.total_pages);
                this.isLoading = false;
                return;
            }
        }

        this.showLoading();

        try {
            const startTime = performance.now();
            const response = await fetch(`/api/news/${newsType}?page=${page}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const endTime = performance.now();
            
            // Cache the result
            this.memoryUsage.newsCache.set(cacheKey, {
                ...data,
                timestamp: Date.now()
            });
            
            this.performanceMetrics.loadTimes.push(endTime - startTime);
            
            this.renderNews(data.news);
            this.updatePagination(data.page, data.total_pages);
            this.showToast(`📊 E-con đã tải ${data.news.length} tin tức`, 'success');

        } catch (error) {
            console.error('❌ E-con news loading error:', error);
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
                <div class="econ-no-news">
                    <p style="text-align: center; color: var(--econ-text-secondary); font-size: var(--econ-font-size-lg);">
                        📊 Không có tin tức nào được tìm thấy
                    </p>
                </div>
            `;
            return;
        }

        newsItems.forEach((news, index) => {
            const newsCard = this.createNewsCard(news, index);
            newsGrid.appendChild(newsCard);
            
            // Optimized animation for Render.com - faster timing
            requestAnimationFrame(() => {
                newsCard.style.opacity = '0';
                newsCard.style.transform = 'translateY(15px)';
                
                setTimeout(() => {
                    newsCard.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                    newsCard.style.opacity = '1';
                    newsCard.style.transform = 'translateY(0)';
                }, index * 30); // Reduced from 50ms to 30ms
            });

            if (this.cardObserver) {
                this.cardObserver.observe(newsCard);
            }
        });

        newsGrid.style.display = 'grid';
    }

    createNewsCard(news, index) {
        const card = document.createElement('div');
        card.className = 'econ-card';
        card.dataset.articleId = news.id;
        card.setAttribute('role', 'gridcell');
        card.setAttribute('tabindex', '0');
        
        card.innerHTML = `
            <div class="econ-card-header">
                <span class="econ-card-emoji" role="img" aria-hidden="true">${news.emoji}</span>
                <span class="econ-card-source">${this.escapeHtml(news.source)}</span>
                <span class="econ-card-time">${this.escapeHtml(news.published)}</span>
            </div>
            <h3 class="econ-card-title">${this.escapeHtml(news.title)}</h3>
            <p class="econ-card-description">${this.escapeHtml(news.description)}</p>
        `;

        // Event listeners
        const clickHandler = () => this.showArticleDetail(news.id);
        card.addEventListener('click', clickHandler);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clickHandler();
            }
        });

        // Hover effects (optimized for mobile)
        if (window.matchMedia('(hover: hover)').matches) {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px) scale(1.02)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        }

        return card;
    }

    async showArticleDetail(articleId) {
        try {
            this.showToast('📊 E-con đang tải chi tiết bài viết...', 'info');

            const response = await fetch(`/api/article/${articleId}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    this.showToast('Không tìm thấy bài viết. Vui lòng thử lại.', 'error');
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
            if (contentEl) contentEl.textContent = article.content;

            // Show article modal
            this.showArticleModal();

            // Reset chat and show chat bubble with context
            this.resetChat();
            this.showChatBubbleWithContext();

        } catch (error) {
            console.error('❌ E-con article loading error:', error);
            this.showToast('Lỗi khi tải chi tiết bài viết: ' + error.message, 'error');
        }
    }

    showArticleModal() {
        const modal = document.getElementById('econArticleModal');
        const mainContent = document.querySelector('.econ-main');
        
        if (modal && mainContent) {
            mainContent.style.display = 'none';
            modal.style.display = 'flex';
            
            // Animate modal
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
        const mainContent = document.querySelector('.econ-main');
        
        if (modal && mainContent) {
            modal.style.display = 'none';
            mainContent.style.display = 'block';
            this.currentArticle = null;
        }
    }

    showChatBubbleWithContext() {
        const floatingChat = document.getElementById('econFloatingChat');
        const chatBubble = document.getElementById('econChatBubble');
        const bubbleTitle = chatBubble?.querySelector('.econ-chat-bubble-title');
        const bubbleSubtitle = chatBubble?.querySelector('.econ-chat-bubble-subtitle');
        
        if (floatingChat && chatBubble) {
            // Update bubble text for context
            if (bubbleTitle) bubbleTitle.textContent = 'AI Assistant';
            if (bubbleSubtitle) bubbleSubtitle.textContent = 'Sẵn sàng phân tích bài báo!';
            
            // Show floating chat
            floatingChat.style.display = 'block';
            setTimeout(() => {
                floatingChat.style.opacity = '1';
                floatingChat.style.transform = 'translateY(0) scale(1)';
            }, 100);
            
            // Add attention animation
            chatBubble.style.animation = 'econBounce 0.6s ease-in-out 3';
        }
    }

    resetChat() {
        const chatMessages = document.getElementById('econChatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="econ-welcome-message">
                    <div class="econ-message econ-message-ai">
                        <div class="econ-message-bubble">
                            Xin chào! Tôi là AI Assistant. Hãy hỏi tôi về bài báo này hoặc nhấn các nút bên dưới! 🤖✨
                        </div>
                        <div class="econ-message-time">Bây giờ</div>
                    </div>
                </div>
            `;
        }
        
        // Clear input
        const chatInput = document.getElementById('econChatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }
        
        this.chatMessages = [];
    }

    async sendChatMessage(message) {
        if (!message.trim() || this.aiRequestInProgress) return;

        // Add user message to chat
        this.addChatMessage(message, 'user');
        
        // Clear input
        const chatInput = document.getElementById('econChatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }

        // Send to AI
        await this.askAI(message, false);
    }

    addChatMessage(content, sender = 'ai', animate = true) {
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

        if (animate) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(20px) scale(0.9)';
        }

        chatMessages.appendChild(messageDiv);

        if (animate) {
            requestAnimationFrame(() => {
                messageDiv.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0) scale(1)';
            });
        }

        // Scroll to bottom
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);

        // Store message
        this.chatMessages.push({ content, sender, timestamp: now });
    }

    async askAI(question, autoSummary = false) {
        if (this.aiRequestInProgress) return;

        try {
            this.aiRequestInProgress = true;

            // Show typing indicator
            const typingDiv = document.createElement('div');
            typingDiv.className = 'econ-message econ-message-ai';
            typingDiv.id = 'econ-typing-indicator';
            typingDiv.innerHTML = `
                <div class="econ-message-bubble">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <div style="width: 6px; height: 6px; background: currentColor; border-radius: 50%; animation: econTyping 1s infinite;"></div>
                        <div style="width: 6px; height: 6px; background: currentColor; border-radius: 50%; animation: econTyping 1s infinite 0.2s;"></div>
                        <div style="width: 6px; height: 6px; background: currentColor; border-radius: 50%; animation: econTyping 1s infinite 0.4s;"></div>
                    </div>
                </div>
            `;

            const chatMessages = document.getElementById('econChatMessages');
            if (chatMessages) {
                chatMessages.appendChild(typingDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            console.log('🚀 Sending AI request:', { question, autoSummary });

            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    question: autoSummary ? '' : question 
                })
            });

            // Remove typing indicator
            const typingIndicator = document.getElementById('econ-typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Add AI response to chat
            this.addChatMessage(data.response, 'ai');
            this.showToast('🤖 AI đã trả lời thành công', 'success');

        } catch (error) {
            console.error('❌ Error in AI askAI:', error);
            
            // Remove typing indicator if exists
            const typingIndicator = document.getElementById('econ-typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            this.addChatMessage(`❌ Lỗi: ${error.message}`, 'ai');
            this.showToast('Lỗi AI: ' + error.message, 'error');
        } finally {
            this.aiRequestInProgress = false;
        }
    }

    async debateAI(topic, autoDebate = false) {
        if (this.aiRequestInProgress) return;

        try {
            this.aiRequestInProgress = true;

            // Show typing indicator
            const typingDiv = document.createElement('div');
            typingDiv.className = 'econ-message econ-message-ai';
            typingDiv.id = 'econ-typing-indicator';
            typingDiv.innerHTML = `
                <div class="econ-message-bubble">
                    🎭 Đang tổ chức cuộc tranh luận...
                </div>
            `;

            const chatMessages = document.getElementById('econChatMessages');
            if (chatMessages) {
                chatMessages.appendChild(typingDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            const response = await fetch('/api/ai/debate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    topic: autoDebate ? '' : topic 
                })
            });

            // Remove typing indicator
            const typingIndicator = document.getElementById('econ-typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Add debate response to chat
            this.addChatMessage(data.response, 'ai');
            this.showToast('🎭 AI đã tổ chức cuộc tranh luận thành công', 'success');

        } catch (error) {
            console.error('❌ Error in AI debateAI:', error);
            
            // Remove typing indicator if exists
            const typingIndicator = document.getElementById('econ-typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            this.addChatMessage(`❌ Lỗi tranh luận: ${error.message}`, 'ai');
            this.showToast('Lỗi AI Debate: ' + error.message, 'error');
        } finally {
            this.aiRequestInProgress = false;
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

        if (loadingContainer) loadingContainer.style.display = 'flex';
        if (newsGrid) newsGrid.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'none';
    }

    hideLoading() {
        const loadingContainer = document.getElementById('econLoadingContainer');
        if (loadingContainer) loadingContainer.style.display = 'none';
    }

    renderError() {
        const newsGrid = document.getElementById('econNewsGrid');
        if (!newsGrid) return;

        newsGrid.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; text-align: center; gap: var(--econ-space-lg); background: var(--econ-gradient-card); border: 1px solid var(--econ-border-primary); border-radius: var(--econ-radius-xl); padding: var(--econ-space-2xl);">
                <div style="font-size: 48px;">❌</div>
                <h3 style="color: var(--econ-text-primary); font-size: var(--econ-font-size-xl);">Lỗi khi tải tin tức</h3>
                <p style="color: var(--econ-text-secondary);">Vui lòng thử lại sau</p>
                <button onclick="econPortal.refreshNews()" style="padding: var(--econ-space-md) var(--econ-space-lg); background: var(--econ-gradient-button); color: white; border: none; border-radius: var(--econ-radius-lg); cursor: pointer; font-weight: 600; transition: all var(--econ-transition-fast);">
                    🔄 Thử lại
                </button>
            </div>
        `;
        newsGrid.style.display = 'flex';
    }

    async refreshNews() {
        this.showToast('🔄 E-con đang làm mới tin tức...', 'info');
        
        // Clear cache for current type
        const cacheKey = `${this.currentNewsType}-${this.currentPage}`;
        this.memoryUsage.newsCache.delete(cacheKey);
        
        await this.loadNews(this.currentNewsType, this.currentPage);
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('econToastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `econ-toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000); // Reduced from 4000ms to 3000ms
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
        const avgLoadTime = this.performanceMetrics.loadTimes.length > 0 
            ? Math.round(this.performanceMetrics.loadTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.loadTimes.length)
            : 0;

        return {
            averageLoadTime: avgLoadTime,
            totalAIRequests: this.performanceMetrics.aiRequests,
            totalErrors: this.performanceMetrics.errors.length,
            cacheSize: this.memoryUsage.newsCache.size,
            chatMessages: this.chatMessages.length
        };
    }
}

// Enhanced Features for Render.com optimization
class EconNewsPortalEnhanced extends EconNewsPortal {
    constructor() {
        super();
        this.setupAdvancedFeatures();
    }

    setupAdvancedFeatures() {
        this.setupKeyboardShortcuts();
        this.setupVirtualKeyboardHandling();
        this.setupOfflineSupport();
        this.setupPerformanceOptimizations();
        this.setupChatAnimations();
    }

    setupChatAnimations() {
        // Add typing animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes econTyping {
                0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
                30% { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case '1':
                    this.switchNewsType('all');
                    break;
                case '2':
                    this.switchNewsType('domestic');
                    break;
                case '3':
                    this.switchNewsType('international');
                    break;
                case 'r':
                case 'R':
                    this.refreshNews();
                    break;
                case 'ArrowLeft':
                    if (this.currentPage > 1) {
                        this.loadNews(this.currentNewsType, this.currentPage - 1);
                    }
                    break;
                case 'ArrowRight':
                    const totalPages = parseInt(document.querySelector('.econ-pagination-total')?.textContent || '1');
                    if (this.currentPage < totalPages) {
                        this.loadNews(this.currentNewsType, this.currentPage + 1);
                    }
                    break;
            }
        });
    }

    setupVirtualKeyboardHandling() {
        let initialViewportHeight = window.innerHeight;

        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;

            // If height decreased significantly, likely virtual keyboard is open
            if (heightDifference > 150) {
                document.body.classList.add('keyboard-open');
                this.adjustForVirtualKeyboard();
            } else {
                document.body.classList.remove('keyboard-open');
            }
        });
    }

    adjustForVirtualKeyboard() {
        const chatInput = document.getElementById('econChatInput');
        
        if (chatInput) {
            // Scroll to input when virtual keyboard opens
            setTimeout(() => {
                chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }

    setupOfflineSupport() {
        window.addEventListener('online', () => {
            this.showToast('🌐 Kết nối internet đã được khôi phục', 'success');
            this.refreshNews();
        });

        window.addEventListener('offline', () => {
            this.showToast('📱 Chế độ offline - Hiển thị nội dung đã lưu', 'info');
        });
    }

    setupPerformanceOptimizations() {
        // Debounce resize events for better performance
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 150); // Reduced from 250ms
        });

        // Monitor memory usage on mobile
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                if (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize > 0.8) {
                    console.warn('🚨 High memory usage detected, cleaning up...');
                    this.memoryUsage.newsCache.clear();
                    
                    // Clear old chat messages
                    if (this.chatMessages.length > 50) {
                        this.chatMessages = this.chatMessages.slice(-30);
                    }
                }
            }, 45000); // Reduced from 30000ms
        }
    }

    handleResize() {
        const chatWindow = document.getElementById('econChatWindow');
        const modal = document.getElementById('econArticleModal');
        
        if (chatWindow && chatWindow.style.display !== 'none') {
            this.adjustChatForScreen();
        }
        
        if (modal && modal.style.display !== 'none') {
            this.adjustModalForScreen();
        }
    }

    adjustChatForScreen() {
        const chatWindow = document.getElementById('econChatWindow');
        
        if (window.innerWidth <= 768 && chatWindow) {
            chatWindow.style.width = 'calc(100vw - 20px)';
            chatWindow.style.height = 'calc(100vh - 100px)';
        } else if (chatWindow) {
            chatWindow.style.width = '350px';
            chatWindow.style.height = '500px';
        }
    }

    adjustModalForScreen() {
        const modal = document.getElementById('econArticleModal');
        
        if (window.innerWidth <= 768 && modal) {
            modal.style.padding = '10px';
        } else if (modal) {
            modal.style.padding = 'var(--econ-space-lg)';
        }
    }
}

// Initialize the application
let econPortal;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing E-con News Portal...');
    
    try {
        econPortal = new EconNewsPortalEnhanced();
        
        // Add visual feedback for loading
        document.body.classList.add('loaded');
        
        console.log('✅ E-con News Portal initialized successfully!');
        console.log('🎨 Theme: Colorful Rainbow with Glassmorphism');
        console.log('📱 Optimized for Render.com free tier');
        
        // Performance report after 30 seconds
        setTimeout(() => {
            console.log('📊 E-con Performance Report:', econPortal.getPerformanceReport());
        }, 30000);

    } catch (error) {
        console.error('❌ Failed to initialize E-con News Portal:', error);
        
        // Fallback error display
        const loadingContainer = document.getElementById('econLoadingContainer');
        if (loadingContainer) {
            loadingContainer.innerHTML = `
                <div style="text-align: center; color: var(--econ-accent-danger);">
                    <h3>❌ Lỗi khởi tạo E-con</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--econ-gradient-button); color: white; border: none; border-radius: var(--econ-radius-lg); cursor: pointer;">
                        🔄 Tải lại
                    </button>
                </div>
            `;
        }
    }
});

// Enhanced error boundary
window.addEventListener('error', (e) => {
    console.error('🚨 Global E-con error:', e.error);
    
    if (econPortal) {
        econPortal.showToast('Đã xảy ra lỗi không mong muốn: ' + e.message, 'error');
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (econPortal) {
        econPortal.showToast('🌐 Kết nối internet đã được khôi phục', 'success');
    }
});

window.addEventListener('offline', () => {
    if (econPortal) {
        econPortal.showToast('📱 Mất kết nối internet', 'error');
    }
});

// Make econPortal globally accessible for debugging
window.econPortal = econPortal;
