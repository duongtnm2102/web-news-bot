// E-con News Portal - Tiền Phong Classic + iOS Modern JavaScript 2025 - script.js
class TienPhongNewsPortal {
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
        console.log('🚀 Initializing Tiền Phong News Portal...');
        
        try {
            this.bindEvents();
            this.setupErrorHandling();
            
            // Load initial news
            await this.loadNews('all', 1);
            
            console.log('✅ Tiền Phong News Portal initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            this.showToast('Lỗi khởi tạo ứng dụng: ' + error.message, 'error');
        }
    }

    bindEvents() {
        // Category links
        document.querySelectorAll('.tp-category-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.currentTarget.dataset.category;
                this.switchCategory(category);
            });
        });

        // Navigation items
        document.querySelectorAll('.tp-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.currentTarget.dataset.category;
                this.switchCategory(category);
            });
        });

        // Filter tabs
        document.querySelectorAll('.tp-filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const type = e.currentTarget.dataset.type;
                this.switchCategory(type);
            });
        });

        // Pagination
        const prevBtn = document.getElementById('tpPrevPageBtn');
        const nextBtn = document.getElementById('tpNextPageBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.loadNews(this.currentCategory, this.currentPage - 1);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = parseInt(document.querySelector('.tp-pagination-total')?.textContent || '1');
                if (this.currentPage < totalPages) {
                    this.loadNews(this.currentCategory, this.currentPage + 1);
                }
            });
        }

        // Article modal close
        const closeBtn = document.getElementById('tpCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeArticleModal());
        }

        // Modal close on background click
        const modal = document.getElementById('tpArticleModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeArticleModal();
                }
            });
        }

        // Chat functionality
        this.setupChatEvents();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Search functionality
        this.setupSearch();
    }

    setupSearch() {
        const searchBtn = document.querySelector('.tp-search-btn');
        const searchInput = document.querySelector('.tp-search-input');

        if (searchBtn && searchInput) {
            const performSearch = () => {
                const query = searchInput.value.trim();
                if (query) {
                    this.showToast(`🔍 Tìm kiếm: "${query}"`, 'info');
                    // TODO: Implement search functionality
                }
            };

            searchBtn.addEventListener('click', performSearch);
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        }
    }

    setupChatEvents() {
        const chatBubble = document.getElementById('tpChatBubble');
        const chatWindow = document.getElementById('tpChatWindow');
        const chatMinimize = document.getElementById('tpChatMinimize');
        const chatClose = document.getElementById('tpChatClose');

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

        // Chat input and buttons
        this.setupChatInputEvents();
    }

    setupChatInputEvents() {
        const summaryBtn = document.getElementById('tpSummaryBtn');
        const debateBtn = document.getElementById('tpDebateBtn');
        const sendBtn = document.getElementById('tpSendBtn');
        const chatInput = document.getElementById('tpChatInput');

        // Summary button
        if (summaryBtn) {
            summaryBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (this.aiRequestInProgress) {
                    this.showToast('AI đang xử lý yêu cầu khác...', 'info');
                    return;
                }
                
                await this.handleSummaryRequest();
            });
        }

        // Debate button - Enhanced for separate character responses
        if (debateBtn) {
            debateBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
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
            this.showToast('Vui lòng mở một bài báo trước khi yêu cầu tóm tắt', 'error');
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

            // Format and display summary with proper line breaks
            this.addFormattedAIMessage(data.response, '📋 Tóm tắt');
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
            this.showToast('Vui lòng mở một bài báo trước khi yêu cầu bàn luận', 'error');
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

            // Parse and display debate as separate character messages
            this.displayDebateAsCharacters(data.response);
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

    displayDebateAsCharacters(debateText) {
        // Parse debate response and split by characters
        const characters = [
            { name: 'Nhà Đầu Tư Ngân Hàng', emoji: '🏦', color: '#374151' },
            { name: 'Trader Chuyên Nghiệp', emoji: '📈', color: '#059669' },
            { name: 'Giáo Sư Kinh Tế', emoji: '🎓', color: '#3b82f6' },
            { name: 'CEO Doanh Nghiệp', emoji: '💼', color: '#7c3aed' },
            { name: 'Nhà Phân Tích Quốc Tế', emoji: '🌍', color: '#f59e0b' },
            { name: 'AI Gemini', emoji: '🤖', color: '#dc2626' }
        ];

        // Split debate text by character sections
        let currentText = debateText;
        
        characters.forEach((character, index) => {
            // Find character section using various patterns
            const patterns = [
                new RegExp(`\\*\\*${character.name}.*?\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`, 'i'),
                new RegExp(`${character.emoji}\\s*\\*\\*${character.name}[^\\*]*\\*\\*([\\s\\S]*?)(?=${characters[index + 1]?.emoji}|🤖|$)`, 'i'),
                new RegExp(`${character.name}.*?:([\\s\\S]*?)(?=\\n\\n\\*\\*|\\n\\n${characters[index + 1]?.name}|$)`, 'i')
            ];

            for (const pattern of patterns) {
                const match = currentText.match(pattern);
                if (match && match[1]) {
                    const characterMessage = match[1].trim();
                    if (characterMessage.length > 20) {
                        // Add character message with delay for realistic effect
                        setTimeout(() => {
                            this.addCharacterMessage(character, characterMessage);
                        }, index * 1500); // 1.5 second delay between characters
                        
                        // Remove processed text
                        currentText = currentText.replace(match[0], '');
                        break;
                    }
                }
            }
        });

        // If no character sections found, display as regular AI message
        if (currentText.trim().length > 100) {
            this.addFormattedAIMessage(debateText, '🎭 Bàn luận');
        }
    }

    addCharacterMessage(character, message) {
        const chatMessages = document.getElementById('tpChatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'tp-message tp-message-character';
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Clean and format the message
        const cleanMessage = this.formatAIResponse(message);

        messageDiv.innerHTML = `
            <div class="tp-character-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 20px;">${character.emoji}</span>
                <strong style="color: ${character.color}; font-size: 14px;">${character.name}</strong>
            </div>
            <div class="tp-message-bubble tp-character-bubble" style="border-left: 3px solid ${character.color};">
                ${cleanMessage}
            </div>
            <div class="tp-message-time">${timeStr}</div>
        `;

        // Add custom styling for character messages
        messageDiv.style.maxWidth = '90%';
        messageDiv.style.alignSelf = 'flex-start';
        messageDiv.style.animation = 'fadeInUp 0.5s ease-out';

        chatMessages.appendChild(messageDiv);

        // Scroll to bottom with smooth animation
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);

        // Store message
        this.chatMessages.push({ 
            content: `${character.emoji} ${character.name}: ${message}`, 
            sender: 'character', 
            timestamp: now,
            character: character
        });
    }

    addFormattedAIMessage(content, prefix = '') {
        const formattedContent = this.formatAIResponse(content);
        const fullMessage = prefix ? `${prefix}\n\n${formattedContent}` : formattedContent;
        this.addChatMessage(fullMessage, 'ai');
    }

    formatAIResponse(content) {
        if (!content) return content;

        // Split into paragraphs and format
        let formatted = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                // Convert **text** to <strong>text</strong>
                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                
                // Convert bullet points
                line = line.replace(/^[-•]\s*/, '• ');
                
                // Convert numbered lists
                line = line.replace(/^(\d+)[\.\)]\s*/, '$1. ');
                
                return line;
            })
            .join('<br><br>');

        // Clean up multiple line breaks
        formatted = formatted.replace(/(<br>){3,}/g, '<br><br>');
        
        return formatted;
    }

    async sendChatMessage(message) {
        if (!message.trim() || this.aiRequestInProgress) return;

        // Add user message
        this.addChatMessage(message, 'user');
        
        // Clear input
        const chatInput = document.getElementById('tpChatInput');
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

            this.addFormattedAIMessage(data.response);

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
        typingDiv.className = 'tp-message tp-message-ai';
        typingDiv.id = 'tp-typing-indicator';
        typingDiv.innerHTML = `
            <div class="tp-message-bubble">
                <div style="display: flex; gap: 4px; align-items: center;">
                    <div style="width: 8px; height: 8px; background: currentColor; border-radius: 50%; animation: bounce 1.4s infinite 0s;"></div>
                    <div style="width: 8px; height: 8px; background: currentColor; border-radius: 50%; animation: bounce 1.4s infinite 0.2s;"></div>
                    <div style="width: 8px; height: 8px; background: currentColor; border-radius: 50%; animation: bounce 1.4s infinite 0.4s;"></div>
                </div>
            </div>
        `;

        const chatMessages = document.getElementById('tpChatMessages');
        if (chatMessages) {
            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Add bounce animation if not exists
        if (!document.getElementById('bounce-animation')) {
            const style = document.createElement('style');
            style.id = 'bounce-animation';
            style.textContent = `
                @keyframes bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('tp-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    addChatMessage(content, sender = 'ai') {
        const chatMessages = document.getElementById('tpChatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `tp-message tp-message-${sender}`;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Format content based on sender
        let displayContent = content;
        if (sender === 'ai') {
            displayContent = this.formatAIResponse(content);
        } else {
            displayContent = this.escapeHtml(content);
        }

        messageDiv.innerHTML = `
            <div class="tp-message-bubble">${displayContent}</div>
            <div class="tp-message-time">${timeStr}</div>
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
        const chatBubble = document.getElementById('tpChatBubble');
        const chatWindow = document.getElementById('tpChatWindow');
        
        if (chatBubble && chatWindow) {
            chatBubble.style.display = 'none';
            chatWindow.style.display = 'flex';
            
            // Focus on input
            setTimeout(() => {
                const chatInput = document.getElementById('tpChatInput');
                if (chatInput) {
                    chatInput.focus();
                }
            }, 300);
        }
    }

    minimizeChatWindow() {
        const chatBubble = document.getElementById('tpChatBubble');
        const chatWindow = document.getElementById('tpChatWindow');
        
        if (chatBubble && chatWindow) {
            chatWindow.style.display = 'none';
            chatBubble.style.display = 'flex';
        }
    }

    closeChatWindow() {
        const floatingChat = document.getElementById('tpFloatingChat');
        
        if (floatingChat) {
            floatingChat.style.opacity = '0';
            floatingChat.style.transform = 'translateY(20px) scale(0.8)';
            
            setTimeout(() => {
                floatingChat.style.display = 'none';
            }, 500);
        }
    }

    async switchCategory(category) {
        if (this.isLoading || category === this.currentCategory) return;

        // Update active states
        document.querySelectorAll('.tp-category-link, .tp-filter-tab, .tp-nav-item').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeElements = document.querySelectorAll(
            `[data-category="${category}"], [data-type="${category}"]`
        );
        activeElements.forEach(el => el.classList.add('active'));

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
        const newsGrid = document.getElementById('tpNewsGrid');
        if (!newsGrid) return;

        newsGrid.innerHTML = '';

        if (newsItems.length === 0) {
            newsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--tp-text-secondary); font-family: var(--tp-font-sans);">
                    📰 Không có tin tức nào được tìm thấy
                </div>
            `;
            return;
        }

        newsItems.forEach((news, index) => {
            const newsCard = this.createNewsCard(news, index);
            newsGrid.appendChild(newsCard);
            
            // Staggered animation
            requestAnimationFrame(() => {
                newsCard.style.opacity = '0';
                newsCard.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    newsCard.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                    newsCard.style.opacity = '1';
                    newsCard.style.transform = 'translateY(0)';
                }, index * 100); // Stagger animation
            });
        });
    }

    createNewsCard(news, index) {
        const card = document.createElement('div');
        card.className = 'tp-news-card';
        card.dataset.articleId = news.id;
        
        card.innerHTML = `
            <div class="tp-news-card-header">
                <div class="tp-news-source">
                    <div class="tp-source-icon">${news.emoji || '📰'}</div>
                    <span class="tp-source-name">${this.escapeHtml(news.source)}</span>
                </div>
                <span class="tp-news-time">${this.escapeHtml(news.published)}</span>
            </div>
            <div class="tp-news-card-body">
                <h3 class="tp-news-title">${this.escapeHtml(news.title)}</h3>
                <p class="tp-news-description">${this.escapeHtml(news.description)}</p>
            </div>
        `;

        // Event listeners
        card.addEventListener('click', () => this.showArticleDetail(news.id));

        // Hover effects for desktop
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
            const titleEl = document.getElementById('tpArticleTitle');
            const sourceEl = document.getElementById('tpArticleSource');
            const timeEl = document.getElementById('tpArticleTime');
            const linkEl = document.getElementById('tpArticleLink');
            const contentEl = document.getElementById('tpArticleContent');

            if (titleEl) titleEl.textContent = article.title;
            if (sourceEl) sourceEl.textContent = article.source;
            if (timeEl) timeEl.textContent = article.published;
            if (linkEl) linkEl.href = article.link;
            if (contentEl) {
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
                // Remove markdown bold markers for headlines
                paragraph = paragraph.replace(/^\*\*(.*)\*\*$/, '$1');
                
                // Check if it's a headline
                if (paragraph.length < 100 && 
                    (paragraph === paragraph.toUpperCase() || 
                     paragraph.match(/^[A-ZÀ-Ý][^.]*:/) ||
                     paragraph.match(/^\d+\./) ||
                     paragraph.includes('📷') ||
                     paragraph.includes('Ảnh'))) {
                    return `<h3 style="font-family: var(--tp-font-serif); color: var(--tp-primary); font-weight: 700; margin: 1.5rem 0 1rem 0; font-size: 1.2rem;">${paragraph}</h3>`;
                }
                
                // Check for image references
                if (paragraph.includes('📷') || paragraph.includes('[Ảnh') || paragraph.includes('minh họa')) {
                    return `<div style="background: linear-gradient(135deg, var(--tp-bg-secondary) 0%, var(--tp-border) 100%); border-radius: 12px; padding: 2rem; text-align: center; margin: 1.5rem 0; color: var(--tp-text-secondary); border: 1px solid var(--tp-border);"><span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">📷</span>${paragraph}</div>`;
                }
                
                // Regular paragraph
                return `<p style="margin-bottom: 1rem; text-align: justify; line-height: 1.8;">${paragraph}</p>`;
            })
            .join('');
            
        return formatted;
    }

    showArticleModal() {
        const modal = document.getElementById('tpArticleModal');
        
        if (modal) {
            modal.style.display = 'flex';
            
            // Smooth animation
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
        const modal = document.getElementById('tpArticleModal');
        
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
        const floatingChat = document.getElementById('tpFloatingChat');
        const chatBubbleTitle = document.querySelector('.tp-chat-bubble-title');
        const chatBubbleSubtitle = document.querySelector('.tp-chat-bubble-subtitle');
        
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
        const paginationContainer = document.getElementById('tpPaginationContainer');
        const prevBtn = document.getElementById('tpPrevPageBtn');
        const nextBtn = document.getElementById('tpNextPageBtn');
        const currentPageSpan = document.querySelector('.tp-pagination-current');
        const totalPagesSpan = document.querySelector('.tp-pagination-total');

        if (currentPageSpan) currentPageSpan.textContent = currentPage;
        if (totalPagesSpan) totalPagesSpan.textContent = totalPages;

        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

        if (paginationContainer) {
            paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }

    showLoading() {
        const loadingContainer = document.getElementById('tpLoadingContainer');
        const newsGrid = document.getElementById('tpNewsGrid');
        const paginationContainer = document.getElementById('tpPaginationContainer');

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
        const loadingContainer = document.getElementById('tpLoadingContainer');
        const newsGrid = document.getElementById('tpNewsGrid');
        
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
        const newsGrid = document.getElementById('tpNewsGrid');
        if (!newsGrid) return;

        newsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; text-align: center; gap: 1.5rem;">
                <div style="font-size: 4rem;">❌</div>
                <h3 style="color: var(--tp-primary); margin: 0; font-family: var(--tp-font-serif); font-size: 1.5rem;">Lỗi khi tải tin tức</h3>
                <p style="color: var(--tp-text-secondary); margin: 0; font-family: var(--tp-font-sans);">Vui lòng thử lại sau</p>
                <button onclick="tienPhongPortal.loadNews(tienPhongPortal.currentCategory, tienPhongPortal.currentPage)" 
                        style="padding: 1rem 2rem; background: var(--tp-primary); color: white; border: none; border-radius: 12px; cursor: pointer; transition: all 0.3s ease; font-family: var(--tp-font-sans); font-weight: 600;">
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
                    const totalPages = parseInt(document.querySelector('.tp-pagination-total')?.textContent || '1');
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
        const toastContainer = document.getElementById('tpToastContainer');
        if (!toastContainer) {
            // Create toast container if it doesn't exist
            const container = document.createElement('div');
            container.id = 'tpToastContainer';
            container.className = 'tp-toast-container';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = `tp-toast ${type}`;
        toast.textContent = message;

        document.getElementById('tpToastContainer').appendChild(toast);

        // Show with animation
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Hide after 4 seconds
        setTimeout(() => {
            toast.style.transition = 'all 0.5s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 500);
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
let tienPhongPortal;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Tiền Phong News Portal...');
    
    try {
        tienPhongPortal = new TienPhongNewsPortal();
        
        console.log('✅ Tiền Phong News Portal initialized successfully!');
        console.log('🎨 Theme: Classic Tiền Phong + Modern iOS/iPadOS Elements');
        console.log('📱 Enhanced chat with character-based debate system');
        
        // Performance report after 10 seconds
        setTimeout(() => {
            console.log('📊 Performance Report:', tienPhongPortal.getPerformanceReport());
        }, 10000);

    } catch (error) {
        console.error('❌ Failed to initialize Tiền Phong News Portal:', error);
        
        // Show error message
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 2rem; font-family: var(--tp-font-sans);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
                <h1 style="color: var(--tp-primary); margin-bottom: 1rem; font-family: var(--tp-font-serif);">Lỗi khởi tạo Tiền Phong Portal</h1>
                <p style="color: var(--tp-text-secondary); margin-bottom: 2rem;">${error.message}</p>
                <button onclick="location.reload()" 
                        style="padding: 1rem 2rem; background: var(--tp-primary); color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 1rem; font-family: var(--tp-font-sans);">
                    🔄 Tải lại trang
                </button>
            </div>
        `;
    }
});

// Global error handling
window.addEventListener('error', (e) => {
    console.error('🚨 Global Tiền Phong error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 Tiền Phong promise rejection:', e.reason);
});

// Make portal globally accessible for debugging
window.tienPhongPortal = tienPhongPortal;
