// NeoAI News Portal - JavaScript (Render.com Optimized) 2025
class NeoAINewsPortal {
    constructor() {
        this.currentPage = 1;
        this.currentNewsType = 'all';
        this.isLoading = false;
        this.currentArticle = null;
        this.aiRequestInProgress = false;
        this.performanceMetrics = {
            loadTimes: [],
            errors: [],
            aiRequests: 0
        };
        
        // Render.com optimizations
        this.memoryUsage = { 
            newsCache: new Map(),
            maxCacheSize: 50 // Limited for low memory
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing NeoAI News Portal...');
        
        try {
            this.bindEvents();
            this.setupIntersectionObserver();
            this.setupErrorHandling();
            this.setupMemoryManagement();
            this.setupRenderOptimizations();
            
            // Load initial news
            await this.loadNews('all', 1);
            
            console.log('✅ NeoAI News Portal initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize NeoAI News Portal:', error);
            this.showToast('Lỗi khởi tạo ứng dụng: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Navigation buttons
        document.querySelectorAll('.neo-nav-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newsType = e.currentTarget.dataset.type;
                this.switchNewsType(newsType);
            });
        });

        // Pagination
        const prevBtn = document.getElementById('neoPrevPageBtn');
        const nextBtn = document.getElementById('neoNextPageBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.loadNews(this.currentNewsType, this.currentPage - 1);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = parseInt(document.querySelector('.neo-pagination-total')?.textContent || '1');
                if (this.currentPage < totalPages) {
                    this.loadNews(this.currentNewsType, this.currentPage + 1);
                }
            });
        }

        // Modal events
        const modalClose = document.getElementById('neoModalClose');
        const modal = document.getElementById('neoArticleModal');
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeModal();
                }
            });
        }

        // AI interaction buttons
        this.setupAIButtons();

        // Floating action buttons
        const refreshBtn = document.getElementById('neoRefreshBtn');
        const scrollTopBtn = document.getElementById('neoScrollTopBtn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshNews());
        }
        
        if (scrollTopBtn) {
            scrollTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // AI input keyboard shortcuts
        const aiInput = document.getElementById('neoAiInput');
        if (aiInput) {
            aiInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    const input = e.target.value.trim();
                    if (input && !this.aiRequestInProgress) {
                        this.askAI(input);
                    }
                }
            });
        }
    }

    setupAIButtons() {
        const autoSummaryBtn = document.getElementById('neoAutoSummaryBtn');
        const autoDebateBtn = document.getElementById('neoAutoDebateBtn');
        const askBtn = document.getElementById('neoAskBtn');
        const debateBtn = document.getElementById('neoDebateBtn');

        if (autoSummaryBtn) {
            autoSummaryBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🤖 NeoAI Auto summary clicked');
                await this.handleAIAction(() => this.askAI('', true), 'tóm tắt');
            });
        } else {
            console.warn('❌ neoAutoSummaryBtn not found!');
        }

        if (autoDebateBtn) {
            autoDebateBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🎭 NeoAI Auto debate clicked');
                await this.handleAIAction(() => this.debateAI('', true), 'bàn luận');
            });
        } else {
            console.warn('❌ neoAutoDebateBtn not found!');
        }

        if (askBtn) {
            askBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const question = document.getElementById('neoAiInput').value.trim();
                if (question) {
                    await this.handleAIAction(() => this.askAI(question), 'hỏi đáp');
                } else {
                    this.showToast('Vui lòng nhập câu hỏi', 'error');
                }
            });
        }

        if (debateBtn) {
            debateBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const topic = document.getElementById('neoAiInput').value.trim();
                if (topic) {
                    await this.handleAIAction(() => this.debateAI(topic), 'bàn luận');
                } else {
                    this.showToast('Vui lòng nhập chủ đề', 'error');
                }
            });
        }

        console.log('✅ NeoAI buttons setup completed:', {
            autoSummary: !!autoSummaryBtn,
            autoDebate: !!autoDebateBtn,
            ask: !!askBtn,
            debate: !!debateBtn
        });
    }

    async handleAIAction(actionFunction, actionName) {
        if (this.aiRequestInProgress) {
            this.showToast('NeoAI đang xử lý yêu cầu khác, vui lòng đợi...', 'info');
            return;
        }

        try {
            this.aiRequestInProgress = true;
            this.performanceMetrics.aiRequests++;
            console.log(`🔄 Starting NeoAI action: ${actionName}`);
            
            const startTime = performance.now();
            await actionFunction();
            const endTime = performance.now();
            
            this.performanceMetrics.loadTimes.push(endTime - startTime);
            console.log(`✅ NeoAI action completed: ${actionName} (${Math.round(endTime - startTime)}ms)`);
        } catch (error) {
            console.error(`❌ NeoAI action failed: ${actionName}`, error);
            this.performanceMetrics.errors.push({ action: actionName, error: error.message, timestamp: Date.now() });
            this.showToast(`Lỗi NeoAI khi ${actionName}: ${error.message}`, 'error');
            
            // Clear AI response on error
            const aiResponse = document.getElementById('neoAiResponse');
            if (aiResponse) {
                aiResponse.style.display = 'none';
            }
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
            console.error('🚨 Global NeoAI Error:', e.error);
            this.performanceMetrics.errors.push({
                type: 'global',
                message: e.message,
                timestamp: Date.now()
            });
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('🚨 NeoAI Promise Rejection:', e.reason);
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
                console.log('🧹 NeoAI memory cache cleaned');
            }
        }, 60000); // Every minute
    }

    setupRenderOptimizations() {
        // Warm-up ping to prevent Render.com sleep
        this.warmUpInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                fetch('/api/news/all?page=1&limit=1')
                    .then(response => {
                        if (response.ok) {
                            console.log('🔥 NeoAI warm-up successful');
                        }
                    })
                    .catch(() => {
                        console.log('🧊 NeoAI warm-up failed');
                    });
            }
        }, 12 * 60 * 1000); // Every 12 minutes

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

        // Update active button with NeoAI styling
        document.querySelectorAll('.neo-nav-pill').forEach(btn => {
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
            if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 minutes
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
            this.showToast(`🤖 NeoAI đã tải ${data.news.length} tin tức`, 'success');

        } catch (error) {
            console.error('❌ NeoAI news loading error:', error);
            this.showToast('Lỗi khi tải tin tức: ' + error.message, 'error');
            this.renderError();
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }

    renderNews(newsItems) {
        const newsGrid = document.getElementById('neoNewsGrid');
        if (!newsGrid) return;

        newsGrid.innerHTML = '';

        if (newsItems.length === 0) {
            newsGrid.innerHTML = `
                <div class="neo-no-news">
                    <p style="text-align: center; color: var(--neo-text-secondary); font-size: var(--neo-font-size-lg);">
                        📰 Không có tin tức nào được tìm thấy
                    </p>
                </div>
            `;
            return;
        }

        newsItems.forEach((news, index) => {
            const newsCard = this.createNewsCard(news, index);
            newsGrid.appendChild(newsCard);
            
            // Optimized animation for Render.com
            requestAnimationFrame(() => {
                newsCard.style.opacity = '0';
                newsCard.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    newsCard.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                    newsCard.style.opacity = '1';
                    newsCard.style.transform = 'translateY(0)';
                }, index * 50);
            });

            if (this.cardObserver) {
                this.cardObserver.observe(newsCard);
            }
        });

        newsGrid.style.display = 'grid';
    }

    createNewsCard(news, index) {
        const card = document.createElement('div');
        card.className = 'neo-card';
        card.dataset.articleId = news.id;
        card.setAttribute('role', 'gridcell');
        card.setAttribute('tabindex', '0');
        
        card.innerHTML = `
            <div class="neo-card-header">
                <span class="neo-card-emoji" role="img" aria-hidden="true">${news.emoji}</span>
                <span class="neo-card-source">${this.escapeHtml(news.source)}</span>
                <span class="neo-card-time">${this.escapeHtml(news.published)}</span>
            </div>
            <h3 class="neo-card-title">${this.escapeHtml(news.title)}</h3>
            <p class="neo-card-description">${this.escapeHtml(news.description)}</p>
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
            this.showToast('🤖 NeoAI đang tải chi tiết bài viết...', 'info');

            const response = await fetch(`/api/article/${articleId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const article = await response.json();
            this.currentArticle = article;

            // Update modal content
            const titleEl = document.getElementById('neoModalTitle');
            const sourceEl = document.getElementById('neoArticleSource');
            const timeEl = document.getElementById('neoArticleTime');
            const linkEl = document.getElementById('neoArticleLink');
            const contentEl = document.getElementById('neoArticleContent');

            if (titleEl) titleEl.textContent = article.title;
            if (sourceEl) sourceEl.textContent = article.source;
            if (timeEl) timeEl.textContent = article.published;
            if (linkEl) linkEl.href = article.link;
            if (contentEl) contentEl.textContent = article.content;

            // Clear AI response
            const aiResponse = document.getElementById('neoAiResponse');
            if (aiResponse) {
                aiResponse.style.display = 'none';
                aiResponse.innerHTML = '';
            }

            // Clear AI input
            const aiInput = document.getElementById('neoAiInput');
            if (aiInput) {
                aiInput.value = '';
            }

            this.openModal();

        } catch (error) {
            console.error('❌ NeoAI article loading error:', error);
            this.showToast('Lỗi khi tải chi tiết bài viết: ' + error.message, 'error');
        }
    }

    async askAI(question, autoSummary = false) {
        const aiResponse = document.getElementById('neoAiResponse');
        const askBtn = document.getElementById('neoAskBtn');
        const autoSummaryBtn = document.getElementById('neoAutoSummaryBtn');

        if (!aiResponse) {
            console.error('❌ NeoAI Response element not found');
            this.showToast('Lỗi: Không tìm thấy element AI response', 'error');
            return;
        }

        const activeBtn = autoSummary ? autoSummaryBtn : askBtn;
        let originalBtnText = '';

        try {
            // Show loading state
            if (activeBtn) {
                originalBtnText = activeBtn.textContent;
                activeBtn.textContent = '⏳ NeoAI đang xử lý...';
                activeBtn.disabled = true;
            }

            aiResponse.style.display = 'block';
            aiResponse.innerHTML = `
                <div class="neo-ai-loading">
                    <div class="neo-spinner">
                        <div class="neo-spinner-ring"></div>
                        <div class="neo-spinner-ring"></div>
                        <div class="neo-spinner-ring"></div>
                    </div>
                    <p style="text-align: center; color: var(--neo-text-secondary); margin-top: var(--neo-space-md);">
                        🤖 NeoAI đang phân tích...
                    </p>
                </div>
            `;

            console.log('🚀 Sending NeoAI request:', { question, autoSummary });

            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    question: autoSummary ? '' : question 
                })
            });

            console.log('📡 NeoAI Response received:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ NeoAI Data parsed successfully');

            if (data.error) {
                throw new Error(data.error);
            }

            // Show response with typing effect
            this.typewriterEffect(aiResponse, data.response);

            // Clear input if not auto summary
            if (!autoSummary) {
                const aiInput = document.getElementById('neoAiInput');
                if (aiInput) {
                    aiInput.value = '';
                }
            }

            this.showToast('🤖 NeoAI đã trả lời thành công', 'success');

        } catch (error) {
            console.error('❌ Error in NeoAI askAI:', error);
            aiResponse.innerHTML = `
                <div style="color: var(--neo-accent-danger); padding: var(--neo-space-lg); background: rgba(239, 68, 68, 0.1); border-radius: var(--neo-radius-lg); border: 1px solid rgba(239, 68, 68, 0.2); text-align: center;">
                    <h4 style="margin-bottom: var(--neo-space-sm); font-size: var(--neo-font-size-lg);">❌ Lỗi kết nối NeoAI</h4>
                    <p style="margin-bottom: var(--neo-space-sm); font-size: var(--neo-font-size-sm);"><strong>Chi tiết:</strong> ${error.message}</p>
                    <p style="margin-bottom: var(--neo-space-sm); font-size: var(--neo-font-size-sm);"><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                    <button onclick="neoAIPortal.closeAIResponse()" style="margin-top: var(--neo-space-md); padding: var(--neo-space-sm) var(--neo-space-md); background: var(--neo-accent-danger); color: white; border: none; border-radius: var(--neo-radius-md); cursor: pointer; transition: all var(--neo-transition-fast);">
                        Đóng
                    </button>
                </div>
            `;
            this.showToast('Lỗi NeoAI: ' + error.message, 'error');
        } finally {
            // Restore button state
            if (activeBtn && originalBtnText) {
                activeBtn.textContent = originalBtnText;
                activeBtn.disabled = false;
            }
        }
    }

    async debateAI(topic, autoDebate = false) {
        const aiResponse = document.getElementById('neoAiResponse');
        const debateBtn = document.getElementById('neoDebateBtn');
        const autoDebateBtn = document.getElementById('neoAutoDebateBtn');

        if (!aiResponse) {
            console.error('❌ NeoAI Response element not found');
            this.showToast('Lỗi: Không tìm thấy element AI response', 'error');
            return;
        }

        const activeBtn = autoDebate ? autoDebateBtn : debateBtn;
        let originalBtnText = '';

        try {
            // Show loading state
            if (activeBtn) {
                originalBtnText = activeBtn.textContent;
                activeBtn.textContent = '⏳ NeoAI đang xử lý...';
                activeBtn.disabled = true;
            }

            aiResponse.style.display = 'block';
            aiResponse.innerHTML = `
                <div class="neo-ai-loading">
                    <div class="neo-spinner">
                        <div class="neo-spinner-ring"></div>
                        <div class="neo-spinner-ring"></div>
                        <div class="neo-spinner-ring"></div>
                    </div>
                    <p style="text-align: center; color: var(--neo-text-secondary); margin-top: var(--neo-space-md);">
                        🎭 NeoAI đang tổ chức cuộc tranh luận...
                    </p>
                </div>
            `;

            console.log('🚀 Sending NeoAI debate request:', { topic, autoDebate });

            const response = await fetch('/api/ai/debate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    topic: autoDebate ? '' : topic 
                })
            });

            console.log('📡 NeoAI Debate Response received:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ NeoAI Debate Data parsed successfully');

            if (data.error) {
                throw new Error(data.error);
            }

            // Show response with typing effect
            this.typewriterEffect(aiResponse, data.response);

            // Clear input if not auto debate
            if (!autoDebate) {
                const aiInput = document.getElementById('neoAiInput');
                if (aiInput) {
                    aiInput.value = '';
                }
            }

            this.showToast('🎭 NeoAI đã tổ chức cuộc tranh luận thành công', 'success');

        } catch (error) {
            console.error('❌ Error in NeoAI debateAI:', error);
            aiResponse.innerHTML = `
                <div style="color: var(--neo-accent-danger); padding: var(--neo-space-lg); background: rgba(239, 68, 68, 0.1); border-radius: var(--neo-radius-lg); border: 1px solid rgba(239, 68, 68, 0.2); text-align: center;">
                    <h4 style="margin-bottom: var(--neo-space-sm); font-size: var(--neo-font-size-lg);">❌ Lỗi khi tổ chức tranh luận</h4>
                    <p style="margin-bottom: var(--neo-space-sm); font-size: var(--neo-font-size-sm);"><strong>Chi tiết:</strong> ${error.message}</p>
                    <p style="margin-bottom: var(--neo-space-sm); font-size: var(--neo-font-size-sm);"><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
                    <button onclick="neoAIPortal.closeAIResponse()" style="margin-top: var(--neo-space-md); padding: var(--neo-space-sm) var(--neo-space-md); background: var(--neo-accent-danger); color: white; border: none; border-radius: var(--neo-radius-md); cursor: pointer; transition: all var(--neo-transition-fast);">
                        Đóng
                    </button>
                </div>
            `;
            this.showToast('Lỗi NeoAI Debate: ' + error.message, 'error');
        } finally {
            // Restore button state
            if (activeBtn && originalBtnText) {
                activeBtn.textContent = originalBtnText;
                activeBtn.disabled = false;
            }
        }
    }

    closeAIResponse() {
        const aiResponse = document.getElementById('neoAiResponse');
        if (aiResponse) {
            aiResponse.style.display = 'none';
            aiResponse.innerHTML = '';
        }
    }

    typewriterEffect(element, text) {
        element.innerHTML = '';
        let index = 0;
        const speed = 20; // milliseconds per character

        function type() {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
                setTimeout(type, speed);
                
                // Auto-scroll to bottom during typing
                element.scrollTop = element.scrollHeight;
            }
        }

        type();
    }

    openModal() {
        const modal = document.getElementById('neoArticleModal');
        if (!modal) return;

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        // Mobile optimizations
        if (window.innerWidth <= 768) {
            modal.style.paddingTop = '10px';
        }
        
        const modalContainer = modal.querySelector('.neo-modal-container');
        if (modalContainer) {
            modalContainer.scrollTop = 0;
        }
        
        // Focus management for accessibility
        const firstFocusable = modal.querySelector('button, input, textarea');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
    }

    closeModal() {
        const modal = document.getElementById('neoArticleModal');
        if (!modal) return;

        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';
        this.currentArticle = null;
        
        // Clear AI response when closing modal
        this.closeAIResponse();
    }

    updatePagination(currentPage, totalPages) {
        const paginationContainer = document.getElementById('neoPaginationContainer');
        const prevBtn = document.getElementById('neoPrevPageBtn');
        const nextBtn = document.getElementById('neoNextPageBtn');
        const currentPageSpan = document.querySelector('.neo-pagination-current');
        const totalPagesSpan = document.querySelector('.neo-pagination-total');

        if (currentPageSpan) currentPageSpan.textContent = currentPage;
        if (totalPagesSpan) totalPagesSpan.textContent = totalPages;

        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

        if (paginationContainer) {
            paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }

    showLoading() {
        const loadingContainer = document.getElementById('neoLoadingContainer');
        const newsGrid = document.getElementById('neoNewsGrid');
        const paginationContainer = document.getElementById('neoPaginationContainer');

        if (loadingContainer) loadingContainer.style.display = 'flex';
        if (newsGrid) newsGrid.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'none';
    }

    hideLoading() {
        const loadingContainer = document.getElementById('neoLoadingContainer');
        if (loadingContainer) loadingContainer.style.display = 'none';
    }

    renderError() {
        const newsGrid = document.getElementById('neoNewsGrid');
        if (!newsGrid) return;

        newsGrid.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; text-align: center; gap: var(--neo-space-lg); background: var(--neo-gradient-card); border: 1px solid var(--neo-border-primary); border-radius: var(--neo-radius-xl); padding: var(--neo-space-2xl);">
                <div style="font-size: 48px;">❌</div>
                <h3 style="color: var(--neo-text-primary); font-size: var(--neo-font-size-xl);">Lỗi khi tải tin tức</h3>
                <p style="color: var(--neo-text-secondary);">Vui lòng thử lại sau</p>
                <button onclick="neoAIPortal.refreshNews()" style="padding: var(--neo-space-md) var(--neo-space-lg); background: var(--neo-gradient-button); color: white; border: none; border-radius: var(--neo-radius-lg); cursor: pointer; font-weight: 600; transition: all var(--neo-transition-fast);">
                    🔄 Thử lại
                </button>
            </div>
        `;
        newsGrid.style.display = 'flex';
    }

    async refreshNews() {
        this.showToast('🔄 NeoAI đang làm mới tin tức...', 'info');
        
        // Clear cache for current type
        const cacheKey = `${this.currentNewsType}-${this.currentPage}`;
        this.memoryUsage.newsCache.delete(cacheKey);
        
        await this.loadNews(this.currentNewsType, this.currentPage);
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('neoToastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `neo-toast ${type}`;
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
        }, 4000);
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
            memoryUsage: this.memoryUsage
        };
    }
}

// Enhanced Features for Render.com optimization
class NeoAINewsPortalEnhanced extends NeoAINewsPortal {
    constructor() {
        super();
        this.setupAdvancedFeatures();
    }

    setupAdvancedFeatures() {
        this.setupKeyboardShortcuts();
        this.setupVirtualKeyboardHandling();
        this.setupOfflineSupport();
        this.setupPerformanceOptimizations();
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
                    const totalPages = parseInt(document.querySelector('.neo-pagination-total')?.textContent || '1');
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
        const modal = document.getElementById('neoArticleModal');
        const aiInput = document.getElementById('neoAiInput');
        
        if (modal && modal.classList.contains('active') && aiInput) {
            // Scroll to input when virtual keyboard opens
            setTimeout(() => {
                aiInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            }, 250);
        });

        // Monitor memory usage on mobile
        if ('memory' in performance) {
            setInterval(() => {
                const memInfo = performance.memory;
                if (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize > 0.8) {
                    console.warn('🚨 High memory usage detected, cleaning up...');
                    this.memoryUsage.newsCache.clear();
                }
            }, 30000);
        }
    }

    handleResize() {
        const modal = document.getElementById('neoArticleModal');
        if (modal && modal.classList.contains('active')) {
            this.adjustModalForScreen();
        }
    }

    adjustModalForScreen() {
        const modal = document.getElementById('neoArticleModal');
        const modalContainer = modal?.querySelector('.neo-modal-container');
        
        if (window.innerWidth <= 768 && modalContainer) {
            modalContainer.style.height = 'calc(100vh - 20px)';
            modalContainer.style.margin = '10px';
        } else if (modalContainer) {
            modalContainer.style.height = '';
            modalContainer.style.margin = '';
        }
    }
}

// Initialize the application
let neoAIPortal;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing NeoAI News Portal...');
    
    try {
        neoAIPortal = new NeoAINewsPortalEnhanced();
        
        // Add visual feedback for loading
        document.body.classList.add('loaded');
        
        console.log('✅ NeoAI News Portal initialized successfully!');
        console.log('🎨 Theme: Purple Gradient with Glassmorphism');
        console.log('📱 Optimized for Render.com free tier');
        
        // Enhanced debugging info
        const autoSummaryBtn = document.getElementById('neoAutoSummaryBtn');
        const autoDebateBtn = document.getElementById('neoAutoDebateBtn');
        
        console.log('🔧 NeoAI buttons status:', {
            autoSummary: {
                found: !!autoSummaryBtn,
                text: autoSummaryBtn?.textContent,
                disabled: autoSummaryBtn?.disabled
            },
            autoDebate: {
                found: !!autoDebateBtn,
                text: autoDebateBtn?.textContent,
                disabled: autoDebateBtn?.disabled
            }
        });

        // Performance report after 30 seconds
        setTimeout(() => {
            console.log('📊 NeoAI Performance Report:', neoAIPortal.getPerformanceReport());
        }, 30000);

    } catch (error) {
        console.error('❌ Failed to initialize NeoAI News Portal:', error);
        
        // Fallback error display
        const loadingContainer = document.getElementById('neoLoadingContainer');
        if (loadingContainer) {
            loadingContainer.innerHTML = `
                <div style="text-align: center; color: var(--neo-accent-danger);">
                    <h3>❌ Lỗi khởi tạo NeoAI</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--neo-gradient-button); color: white; border: none; border-radius: var(--neo-radius-lg); cursor: pointer;">
                        🔄 Tải lại
                    </button>
                </div>
            `;
        }
    }
});

// Enhanced error boundary
window.addEventListener('error', (e) => {
    console.error('🚨 Global NeoAI error:', e.error);
    
    if (neoAIPortal) {
        neoAIPortal.showToast('Đã xảy ra lỗi không mong muốn: ' + e.message, 'error');
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (neoAIPortal) {
        neoAIPortal.showToast('🌐 Kết nối internet đã được khôi phục', 'success');
    }
});

window.addEventListener('offline', () => {
    if (neoAIPortal) {
        neoAIPortal.showToast('📱 Mất kết nối internet', 'error');
    }
});

// Make neoAIPortal globally accessible for debugging
window.neoAIPortal = neoAIPortal;
