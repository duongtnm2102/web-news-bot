// ===============================
// E-CON NEWS TERMINAL - FIXED script.js v2.024.10
// Fixed: Debate display, AI summary length, layout changes
// Keeping ALL original functionality except specified fixes
// ===============================

class EconNewsTerminal {
    constructor() {
        this.currentPage = 'all';
        this.currentArticle = null;
        this.chatMessages = [];
        this.aiRequestInProgress = false;
        this.isMatrixMode = false;
        this.glitchInterval = null;
        this.systemStats = {
            users: 1337420,
            queries: 42069,
            load: 69
        };
        
        this.initializeEventListeners();
        this.startSystemUpdates();
        this.loadInitialNews();
    }

    initializeEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const category = tab.dataset.category;
                if (category) {
                    this.switchCategory(category);
                }
            });
        });

        // Chat functionality
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }

        // Quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (btn.classList.contains('summary')) {
                    this.handleSummaryRequest();
                } else if (btn.classList.contains('debate')) {
                    this.handleDebateRequest();
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Chat controls
        document.getElementById('sendBtn')?.addEventListener('click', () => {
            this.sendChatMessage();
        });

        // Remove terminal command related event listeners
        // Terminal commands functionality removed as requested
    }

    handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch(e.key) {
            case 'F1':
                e.preventDefault();
                this.showToast('💡 Hướng dẫn: Sử dụng Tab để điều hướng, Enter để chat', 'info');
                break;
            case 'F4':
                e.preventDefault();
                this.toggleMatrixMode();
                break;
            case 'F5':
                e.preventDefault();
                this.loadNews(this.currentPage);
                break;
            case 'Escape':
                this.closeChatWindow();
                break;
        }
    }

    async switchCategory(category) {
        this.currentPage = category;
        
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`)?.classList.add('active');

        // Load news for category
        await this.loadNews(category);
    }

    async loadNews(category = 'all') {
        try {
            this.showToast(`📡 Đang tải tin ${category === 'all' ? 'tất cả' : category}...`, 'info');
            
            const response = await fetch(`/api/news/${category}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.displayNews(data.news || []);
            this.showToast(`✅ Đã tải ${(data.news || []).length} tin tức`, 'success');

        } catch (error) {
            console.error('News loading error:', error);
            this.showToast(`❌ Lỗi tải tin: ${error.message}`, 'error');
            
            // Show fallback message
            this.displayNews([]);
        }
    }

    async loadInitialNews() {
        await this.loadNews('all');
    }

    displayNews(newsArray) {
        const container = document.getElementById('newsContainer');
        if (!container) return;

        if (!newsArray || newsArray.length === 0) {
            container.innerHTML = `
                <div class="no-news">
                    <h3>⚠️ KHÔNG CÓ TIN TỨC</h3>
                    <p>Không thể tải tin tức lúc này. Vui lòng thử lại sau.</p>
                    <button onclick="window.econ.loadNews('${this.currentPage}')" class="reload-btn">
                        🔄 TẢI LẠI
                    </button>
                </div>
            `;
            return;
        }

        // FIXED: Changed to 4-column grid layout as requested
        const newsHTML = newsArray.map((news, index) => `
            <article class="news-card" onclick="window.econ.openArticle(${index})">
                <div class="news-header">
                    <span class="news-source">${this.getSourceDisplay(news.source)}</span>
                    <span class="news-time">${news.published_str}</span>
                </div>
                <h3 class="news-title">${news.title}</h3>
                <p class="news-summary">${this.truncateText(news.description || 'Nội dung đang được cập nhật...', 100)}</p>
                <div class="news-footer">
                    <span class="news-id">#${String(index).padStart(3, '0')}</span>
                    <span class="read-more">ĐỌC TIẾP →</span>
                </div>
            </article>
        `).join('');

        container.innerHTML = newsHTML;
    }

    getSourceDisplay(source) {
        const sourceNames = {
            'cafef_kinhdoanh': 'CAFEF KINH DOANH',
            'cafef_taichinh': 'CAFEF TÀI CHÍNH',
            'cafef_ketnoi': 'CAFEF KẾT NỐI',
            'cafef_bds': 'CAFEF BĐS',
            'cafef_vimo': 'CAFEF VIMO',
            'yahoo_finance': 'YAHOO FINANCE',
            'reuters_business': 'REUTERS',
            'bloomberg': 'BLOOMBERG',
            'wsj': 'WSJ',
            'cnbc': 'CNBC'
        };
        return sourceNames[source] || source.toUpperCase();
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    async openArticle(articleId) {
        try {
            this.showToast('📖 Đang tải bài viết...', 'info');
            
            const response = await fetch(`/api/article/${articleId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            this.currentArticle = {
                id: articleId,
                title: data.title,
                content: data.content,
                source: data.source,
                link: data.link
            };

            this.displayArticleDetail(data);
            this.showToast('✅ Bài viết đã tải', 'success');

        } catch (error) {
            console.error('Article loading error:', error);
            this.showToast(`❌ Lỗi tải bài viết: ${error.message}`, 'error');
        }
    }

    displayArticleDetail(article) {
        const modal = document.getElementById('articleModal');
        const title = document.getElementById('articleTitle');
        const content = document.getElementById('articleContent');
        const source = document.getElementById('articleSource');
        const link = document.getElementById('articleLink');

        if (title) title.textContent = article.title;
        if (source) source.textContent = `NGUỒN: ${article.source}`;
        if (link) {
            link.href = article.link;
            link.textContent = article.link;
        }
        if (content) {
            content.innerHTML = this.formatArticleContent(article.content);
        }

        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    formatArticleContent(content) {
        if (!content) return '<p>Nội dung đang được tải...</p>';
        
        return content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            .replace(/<p><\/p>/g, '');
    }

    closeArticleModal() {
        const modal = document.getElementById('articleModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // FIXED: AI Summary with shortened response (100-200 words instead of 600-1200)
    async handleSummaryRequest() {
        if (this.aiRequestInProgress) {
            this.showToast('AI đang xử lý yêu cầu khác...', 'warning');
            return;
        }

        if (!this.currentArticle) {
            this.showToast('Vui lòng mở một bài viết trước', 'error');
            return;
        }

        this.aiRequestInProgress = true;
        this.addChatMessage('📋 Đang phân tích bài viết để tóm tắt ngắn gọn...', 'user');
        this.showAITyping();

        try {
            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // FIXED: Request shorter summary
                body: JSON.stringify({ 
                    question: 'Hãy tóm tắt bài viết này trong 100-150 từ một cách súc tích và dễ hiểu nhất' 
                })
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
            this.showToast('✅ Tóm tắt hoàn thành', 'success');

        } catch (error) {
            this.hideAITyping();
            this.addChatMessage(`❌ Lỗi tóm tắt: ${error.message}`, 'ai');
            this.showToast('Lỗi tạo tóm tắt', 'error');
        } finally {
            this.aiRequestInProgress = false;
        }
    }

    // FIXED: Debate function with proper message parsing and display
    async handleDebateRequest() {
        if (this.aiRequestInProgress) {
            this.showToast('AI đang xử lý yêu cầu khác...', 'warning');
            return;
        }

        if (!this.currentArticle) {
            this.showToast('Vui lòng mở một bài viết trước', 'error');
            return;
        }

        this.aiRequestInProgress = true;
        this.addChatMessage('🎭 Đang khởi tạo cuộc tranh luận đa quan điểm...', 'user');
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
            // FIXED: Proper debate display with character parsing
            this.displayDebateAsCharacters(data.response);
            this.showToast('✅ Tranh luận hoàn thành', 'success');

        } catch (error) {
            this.hideAITyping();
            this.addChatMessage(`❌ Lỗi tranh luận: ${error.message}`, 'ai');
            this.showToast('Lỗi tạo tranh luận', 'error');
        } finally {
            this.aiRequestInProgress = false;
        }
    }

    // FIXED: Better debate character parsing and display
    displayDebateAsCharacters(debateText) {
        if (!debateText) {
            this.addChatMessage('❌ Không có nội dung tranh luận', 'ai');
            return;
        }

        // Split by lines and filter out empty lines
        const lines = debateText.split('\n').filter(line => line.trim());
        
        // Look for character indicators and their responses
        const characterPatterns = [
            /🎓.*?:/,  // Academic
            /📊.*?:/,  // Analyst  
            /💼.*?:/,  // Business
            /😔.*?:/,  // Pessimist
            /💰.*?:/,  // Investor
            /🦈.*?:/   // Critic
        ];

        let characterMessages = [];
        let currentMessage = '';
        
        for (let line of lines) {
            // Check if line starts with a character indicator
            const isCharacterLine = characterPatterns.some(pattern => pattern.test(line));
            
            if (isCharacterLine) {
                // If we have a previous message, save it
                if (currentMessage.trim()) {
                    characterMessages.push(currentMessage.trim());
                }
                // Start new message
                currentMessage = line;
            } else if (currentMessage) {
                // Continue building current message
                currentMessage += '\n' + line;
            }
        }
        
        // Don't forget the last message
        if (currentMessage.trim()) {
            characterMessages.push(currentMessage.trim());
        }

        // If no character messages found, try to split by paragraphs
        if (characterMessages.length === 0) {
            characterMessages = debateText.split('\n\n').filter(msg => msg.trim());
        }

        // Display messages with delays
        characterMessages.forEach((message, index) => {
            setTimeout(() => {
                this.addChatMessage(message, 'ai');
            }, (index + 1) * 2000); // 2 second delays between messages
        });
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
            this.addChatMessage(`❌ Lỗi: ${error.message}`, 'ai');
        } finally {
            this.aiRequestInProgress = false;
        }
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
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```(.*?)```/gs, '<code>$1</code>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    showAITyping() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message ai typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = '🤖 AI đang suy nghĩ<span class="dots">...</span>';

        container.appendChild(typingDiv);
        container.scrollTop = container.scrollHeight;
    }

    hideAITyping() {
        const typing = document.getElementById('typingIndicator');
        if (typing) {
            typing.remove();
        }
    }

    openChatWindow() {
        document.getElementById('chatWindow').style.display = 'flex';
        document.getElementById('chatBubble').style.display = 'none';
        document.getElementById('chatInput')?.focus();
    }

    closeChatWindow() {
        document.getElementById('chatWindow').style.display = 'none';
        document.getElementById('chatBubble').style.display = 'block';
    }

    toggleMatrixMode() {
        this.isMatrixMode = !this.isMatrixMode;
        document.body.classList.toggle('matrix-mode', this.isMatrixMode);
        
        if (this.isMatrixMode) {
            this.showToast('🔋 MATRIX MODE ACTIVATED', 'success');
            this.startMatrixRain();
        } else {
            this.showToast('🔋 Matrix mode deactivated', 'info');
            this.stopMatrixRain();
        }
    }

    startMatrixRain() {
        const canvas = document.createElement('canvas');
        canvas.id = 'matrixCanvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
            opacity: 0.8;
        `;
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
        const matrixArray = matrix.split("");

        const fontSize = 10;
        const columns = canvas.width / fontSize;
        const drops = [];

        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#00ff00';
            ctx.font = fontSize + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        this.matrixInterval = setInterval(draw, 35);

        // Auto-stop after 5 seconds
        setTimeout(() => {
            this.stopMatrixRain();
        }, 5000);
    }

    stopMatrixRain() {
        if (this.matrixInterval) {
            clearInterval(this.matrixInterval);
            this.matrixInterval = null;
        }
        
        const canvas = document.getElementById('matrixCanvas');
        if (canvas) {
            canvas.remove();
        }
        
        document.body.classList.remove('matrix-mode');
        this.isMatrixMode = false;
    }

    startSystemUpdates() {
        setInterval(() => {
            this.updateSystemStats();
            this.updateClock();
        }, 1000);

        // Periodic glitch effects
        setInterval(() => {
            if (Math.random() < 0.1) {
                this.triggerGlitchEffect();
            }
        }, 10000);
    }

    updateSystemStats() {
        // Update stats with small random variations
        this.systemStats.users += Math.floor(Math.random() * 3) - 1;
        this.systemStats.queries += Math.floor(Math.random() * 5);
        this.systemStats.load = Math.max(50, Math.min(90, this.systemStats.load + Math.floor(Math.random() * 6) - 3));

        // Update DOM elements
        const usersSpan = document.querySelector('.status-online');
        const cpuSpan = document.querySelector('.cpu-usage');
        
        if (usersSpan) usersSpan.textContent = `NGƯỜI_DÙNG: ${this.systemStats.users.toLocaleString()}`;
        if (cpuSpan) cpuSpan.textContent = `CPU: ${this.systemStats.load}%`;
    }

    updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('vi-VN', { 
            hour12: false,
            timeZone: 'Asia/Ho_Chi_Minh'
        });
        
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }

    triggerGlitchEffect() {
        const elements = document.querySelectorAll('.news-card, .nav-tab, .system-info span');
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        
        if (randomElement) {
            randomElement.style.transform = `translateX(${Math.random() * 4 - 2}px)`;
            randomElement.style.filter = 'hue-rotate(180deg)';
            
            setTimeout(() => {
                randomElement.style.transform = '';
                randomElement.style.filter = '';
            }, 100);
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.econ = new EconNewsTerminal();
    
    // Global event handlers
    window.addEventListener('resize', () => {
        // Handle responsive updates
        if (window.econ.isMatrixMode) {
            window.econ.stopMatrixRain();
            window.econ.startMatrixRain();
        }
    });

    // Modal close handlers
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            window.econ.closeArticleModal();
        }
    });

    // Close modal with close button
    document.querySelector('.close-modal')?.addEventListener('click', () => {
        window.econ.closeArticleModal();
    });
});

// Expose global functions for onclick handlers
window.openArticle = (id) => window.econ?.openArticle(id);
window.closeModal = () => window.econ?.closeArticleModal();
window.openChat = () => window.econ?.openChatWindow();
window.closeChat = () => window.econ?.closeChatWindow();
