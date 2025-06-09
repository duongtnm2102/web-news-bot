// Modern JavaScript for News Portal - 2025
class NewsPortal {
    constructor() {
        this.currentPage = 1;
        this.currentNewsType = 'all';
        this.isLoading = false;
        this.currentArticle = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadNews('all', 1);
        this.setupIntersectionObserver();
    }

    bindEvents() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newsType = e.currentTarget.dataset.type;
                this.switchNewsType(newsType);
            });
        });

        // Pagination
        document.getElementById('prevPageBtn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.loadNews(this.currentNewsType, this.currentPage - 1);
            }
        });

        document.getElementById('nextPageBtn').addEventListener('click', () => {
            const totalPages = parseInt(document.querySelector('.total-pages').textContent);
            if (this.currentPage < totalPages) {
                this.loadNews(this.currentNewsType, this.currentPage + 1);
            }
        });

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('articleModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });

        // AI interaction buttons with error handling
        const autoSummaryBtn = document.getElementById('autoSummaryBtn');
        const autoDebateBtn = document.getElementById('autoDebateBtn');
        const askBtn = document.getElementById('askBtn');
        const debateBtn = document.getElementById('debateBtn');

        if (autoSummaryBtn) {
            autoSummaryBtn.addEventListener('click', () => {
                console.log('Auto summary button clicked');
                this.askAI('', true); // Auto summary
            });
        }

        if (autoDebateBtn) {
            autoDebateBtn.addEventListener('click', () => {
                console.log('Auto debate button clicked');  
                this.debateAI('', true); // Auto debate
            });
        }

        if (askBtn) {
            askBtn.addEventListener('click', () => {
                const question = document.getElementById('aiInput').value.trim();
                this.askAI(question);
            });
        }

        if (debateBtn) {
            debateBtn.addEventListener('click', () => {
                const topic = document.getElementById('aiInput').value.trim();
                this.debateAI(topic);
            });
        }

        // Enter key for AI input
        const aiInput = document.getElementById('aiInput');
        if (aiInput) {
            aiInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    const input = e.target.value.trim();
                    this.askAI(input);
                }
            });
        }

        // Floating action buttons
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshNews();
        });

        document.getElementById('scrollTopBtn').addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    setupIntersectionObserver() {
        // Animate cards on scroll
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

        // Observer will be applied to new cards when they're created
        this.cardObserver = observer;
    }

    async switchNewsType(newsType) {
        if (this.isLoading || newsType === this.currentNewsType) return;

        // Update active button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${newsType}"]`).classList.add('active');

        // Load news
        this.currentNewsType = newsType;
        await this.loadNews(newsType, 1);
    }

    async loadNews(newsType, page) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.currentPage = page;

        // Show loading
        this.showLoading();

        try {
            const response = await fetch(`/api/news/${newsType}?page=${page}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            this.renderNews(data.news);
            this.updatePagination(data.page, data.total_pages);
            this.showToast(`Đã tải ${data.news.length} tin tức`, 'success');

        } catch (error) {
            console.error('Error loading news:', error);
            this.showToast('Lỗi khi tải tin tức', 'error');
            this.renderError();
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }

    renderNews(newsItems) {
        const newsGrid = document.getElementById('newsGrid');
        newsGrid.innerHTML = '';

        if (newsItems.length === 0) {
            newsGrid.innerHTML = `
                <div class="no-news">
                    <p>📰 Không có tin tức nào được tìm thấy</p>
                </div>
            `;
            return;
        }

        newsItems.forEach((news, index) => {
            const newsCard = this.createNewsCard(news, index);
            newsGrid.appendChild(newsCard);
            
            // Animate card entrance
            requestAnimationFrame(() => {
                newsCard.style.opacity = '0';
                newsCard.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    newsCard.style.transition = 'all 0.5s ease';
                    newsCard.style.opacity = '1';
                    newsCard.style.transform = 'translateY(0)';
                }, index * 50);
            });

            // Apply intersection observer
            if (this.cardObserver) {
                this.cardObserver.observe(newsCard);
            }
        });

        newsGrid.style.display = 'grid';
    }

    createNewsCard(news, index) {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.dataset.articleId = news.id;
        
        card.innerHTML = `
            <div class="news-header">
                <span class="news-emoji">${news.emoji}</span>
                <span class="news-source">${news.source}</span>
                <span class="news-time">${news.published}</span>
            </div>
            <h3 class="news-title">${this.escapeHtml(news.title)}</h3>
            <p class="news-description">${this.escapeHtml(news.description)}</p>
        `;

        card.addEventListener('click', () => {
            this.showArticleDetail(news.id);
        });

        // Add hover effect
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });

        return card;
    }

    async showArticleDetail(articleId) {
        try {
            this.showToast('Đang tải chi tiết bài viết...', 'info');

            const response = await fetch(`/api/article/${articleId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const article = await response.json();
            this.currentArticle = article;

            // Update modal content
            document.getElementById('articleTitle').textContent = article.title;
            document.getElementById('articleSource').textContent = article.source;
            document.getElementById('articleTime').textContent = article.published;
            document.getElementById('articleLink').href = article.link;
            document.getElementById('articleContent').textContent = article.content;

            // Clear AI response
            const aiResponse = document.getElementById('aiResponse');
            aiResponse.style.display = 'none';
            aiResponse.innerHTML = '';

            // Clear AI input
            document.getElementById('aiInput').value = '';

            // Show modal
            this.openModal();

        } catch (error) {
            console.error('Error loading article:', error);
            this.showToast('Lỗi khi tải chi tiết bài viết', 'error');
        }
    }

    async askAI(question, autoSummary = false) {
        const aiResponse = document.getElementById('aiResponse');
        const askBtn = document.getElementById('askBtn');
        const autoSummaryBtn = document.getElementById('autoSummaryBtn');

        if (!aiResponse) {
            console.error('AI Response element not found');
            return;
        }

        try {
            // Show loading state
            const activeBtn = autoSummary ? autoSummaryBtn : askBtn;
            if (activeBtn) {
                const originalText = activeBtn.textContent;
                activeBtn.textContent = '⏳ Đang xử lý...';
                activeBtn.disabled = true;
            }

            aiResponse.style.display = 'block';
            aiResponse.innerHTML = `
                <div class="ai-loading">
                    <div class="loading-spinner">
                        <div class="spinner-ring"></div>
                    </div>
                    <p>🤖 Gemini AI đang phân tích...</p>
                </div>
            `;

            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    question: autoSummary ? '' : question 
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Show response with typing effect
            this.typewriterEffect(aiResponse, data.response);

            // Clear input if not auto summary
            if (!autoSummary) {
                const aiInput = document.getElementById('aiInput');
                if (aiInput) {
                    aiInput.value = '';
                }
            }

        } catch (error) {
            console.error('Error asking AI:', error);
            aiResponse.innerHTML = `
                <div class="ai-error" style="color: #ef4444; padding: 1rem; background: #fef2f2; border-radius: 0.5rem; border: 1px solid #fecaca;">
                    ❌ Lỗi khi kết nối với AI: ${error.message}
                </div>
            `;
        } finally {
            // Restore button state
            if (autoSummary && autoSummaryBtn) {
                autoSummaryBtn.textContent = '📋 Tóm tắt';
                autoSummaryBtn.disabled = false;
            } else if (askBtn) {
                askBtn.textContent = '💭 Hỏi';
                askBtn.disabled = false;
            }
        }
    }

    async debateAI(topic, autoDebate = false) {
        const aiResponse = document.getElementById('aiResponse');
        const debateBtn = document.getElementById('debateBtn');
        const autoDebateBtn = document.getElementById('autoDebateBtn');

        if (!aiResponse) {
            console.error('AI Response element not found');
            return;
        }

        try {
            // Show loading state
            const activeBtn = autoDebate ? autoDebateBtn : debateBtn;
            if (activeBtn) {
                const originalText = activeBtn.textContent;
                activeBtn.textContent = '⏳ Đang xử lý...';
                activeBtn.disabled = true;
            }

            aiResponse.style.display = 'block';
            aiResponse.innerHTML = `
                <div class="ai-loading">
                    <div class="loading-spinner">
                        <div class="spinner-ring"></div>
                    </div>
                    <p>🎭 Gemini AI đang tổ chức cuộc tranh luận...</p>
                </div>
            `;

            const response = await fetch('/api/ai/debate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    topic: autoDebate ? '' : topic 
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Show response with typing effect
            this.typewriterEffect(aiResponse, data.response);

            // Clear input if not auto debate
            if (!autoDebate) {
                const aiInput = document.getElementById('aiInput');
                if (aiInput) {
                    aiInput.value = '';
                }
            }

        } catch (error) {
            console.error('Error debating AI:', error);
            aiResponse.innerHTML = `
                <div class="ai-error" style="color: #ef4444; padding: 1rem; background: #fef2f2; border-radius: 0.5rem; border: 1px solid #fecaca;">
                    ❌ Lỗi khi kết nối với AI: ${error.message}
                </div>
            `;
        } finally {
            // Restore button state
            if (autoDebate && autoDebateBtn) {
                autoDebateBtn.textContent = '🎭 Bàn luận';
                autoDebateBtn.disabled = false;
            } else if (debateBtn) {
                debateBtn.textContent = '🗣️ Bàn luận';
                debateBtn.disabled = false;
            }
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
        const modal = document.getElementById('articleModal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus trap
        const modalContainer = modal.querySelector('.modal-container');
        modalContainer.scrollTop = 0;
    }

    closeModal() {
        const modal = document.getElementById('articleModal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        this.currentArticle = null;
    }

    updatePagination(currentPage, totalPages) {
        const paginationContainer = document.getElementById('paginationContainer');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const currentPageSpan = document.querySelector('.current-page');
        const totalPagesSpan = document.querySelector('.total-pages');

        currentPageSpan.textContent = currentPage;
        totalPagesSpan.textContent = totalPages;

        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;

        paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
    }

    showLoading() {
        document.getElementById('loadingContainer').style.display = 'flex';
        document.getElementById('newsGrid').style.display = 'none';
        document.getElementById('paginationContainer').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loadingContainer').style.display = 'none';
    }

    renderError() {
        const newsGrid = document.getElementById('newsGrid');
        newsGrid.innerHTML = `
            <div class="error-container">
                <div class="error-icon">❌</div>
                <h3>Lỗi khi tải tin tức</h3>
                <p>Vui lòng thử lại sau</p>
                <button class="retry-btn" onclick="newsPortal.refreshNews()">
                    🔄 Thử lại
                </button>
            </div>
        `;
        newsGrid.style.display = 'flex';
    }

    async refreshNews() {
        this.showToast('Đang làm mới tin tức...', 'info');
        await this.loadNews(this.currentNewsType, this.currentPage);
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Enhanced Features
class NewsPortalEnhanced extends NewsPortal {
    constructor() {
        super();
        this.setupAdvancedFeatures();
    }

    setupAdvancedFeatures() {
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Theme system
        this.setupThemeSystem();
        
        // Search functionality
        this.setupSearch();
        
        // Performance monitoring
        this.setupPerformanceMonitoring();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input
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
                    const totalPages = parseInt(document.querySelector('.total-pages').textContent);
                    if (this.currentPage < totalPages) {
                        this.loadNews(this.currentNewsType, this.currentPage + 1);
                    }
                    break;
            }
        });
    }

    setupThemeSystem() {
        // Auto dark mode based on time
        const hour = new Date().getHours();
        if (hour < 6 || hour > 18) {
            document.body.classList.add('dark-mode');
        }
    }

    setupSearch() {
        // Add search functionality
        this.searchCache = new Map();
    }

    setupPerformanceMonitoring() {
        // Monitor performance
        this.performanceMetrics = {
            loadTimes: [],
            errors: []
        };
    }
}

// Initialize the application
let newsPortal;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing NewsPortal...');
    
    newsPortal = new NewsPortalEnhanced();
    
    // Add some visual feedback for loading
    document.body.classList.add('loaded');
    
    console.log('📰 News Portal initialized successfully!');
    
    // Debug: Check if AI buttons exist
    const autoSummaryBtn = document.getElementById('autoSummaryBtn');
    const autoDebateBtn = document.getElementById('autoDebateBtn');
    
    console.log('AI buttons found:', {
        autoSummary: !!autoSummaryBtn,
        autoDebate: !!autoDebateBtn
    });
});

// Error boundary
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    
    if (newsPortal) {
        newsPortal.showToast('Đã xảy ra lỗi không mong muốn', 'error');
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (newsPortal) {
        newsPortal.showToast('Kết nối internet đã được khôi phục', 'success');
    }
});

window.addEventListener('offline', () => {
    if (newsPortal) {
        newsPortal.showToast('Mất kết nối internet', 'error');
    }
});

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);
