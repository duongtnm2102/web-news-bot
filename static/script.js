// Tiền Phong News Portal - Enhanced JavaScript with iOS Effects and Fixed Characters
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
        this.maxCacheSize = 15;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Tiền Phong News Portal...');
        
        try {
            this.bindEvents();
            this.setupErrorHandling();
            this.updateDateTime();
            
            // Load initial news with fast loading
            await this.loadNews('all', 1);
            
            // iOS-style glassmorphism chat widget
            this.initializeChatWidget();
            
            console.log('✅ Tiền Phong News Portal initialized successfully!');
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            this.showToast('Lỗi khởi tạo ứng dụng: ' + error.message, 'error');
        }
    }

    updateDateTime() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const dateEl = document.getElementById('currentDate');
        if (dateEl) dateEl.textContent = dateStr;
        
        // Update every hour
        setTimeout(() => this.updateDateTime(), 3600000);
    }

    bindEvents() {
        // Category links with fast transitions
        document.querySelectorAll('.nav-item, .sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = e.currentTarget.dataset.category;
                this.switchCategory(category);
            });
        });

        // Pagination with iOS-style animations
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.loadNews(this.currentCategory, this.currentPage - 1);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = parseInt(document.getElementById('totalPages')?.textContent || '1');
                if (this.currentPage < totalPages) {
                    this.loadNews(this.currentCategory, this.currentPage + 1);
                }
            });
        }

        // Modal events with iOS-style transitions
        const closeBtn = document.getElementById('closeBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeArticleModal());
        }

        const modal = document.getElementById('articleModal');
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
    }

    initializeChatWidget() {
        // Create iOS-style floating chat widget
        const chatWidget = document.createElement('div');
        chatWidget.className = 'ios-chat-widget';
        chatWidget.innerHTML = `
            <div class="chat-bubble" id="chatBubble">
                <div class="bubble-content">
                    <div class="chat-avatar">🤖</div>
                    <div class="chat-text">
                        <div class="chat-title">AI Assistant</div>
                        <div class="chat-subtitle">Sẵn sàng phân tích!</div>
                    </div>
                </div>
                <div class="bubble-pulse"></div>
            </div>
            
            <div class="chat-window" id="chatWindow" style="display: none;">
                <div class="chat-header">
                    <div class="header-content">
                        <div class="chat-avatar">🤖</div>
                        <div class="chat-info">
                            <div class="chat-title">AI Assistant</div>
                            <div class="chat-status">Online</div>
                        </div>
                        <div class="chat-actions">
                            <button class="chat-btn" id="chatMinimize">−</button>
                            <button class="chat-btn" id="chatClose">×</button>
                        </div>
                    </div>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    <div class="message ai-message">
                        <div class="message-bubble">
                            Xin chào! Tôi là AI Assistant. Hãy hỏi tôi về tin tức tài chính! 🤖
                        </div>
                        <div class="message-time">Bây giờ</div>
                    </div>
                </div>
                
                <div class="chat-input-area">
                    <div class="quick-actions">
                        <button class="quick-btn summary-btn" id="summaryBtn">📋 Tóm tắt</button>
                        <button class="quick-btn debate-btn" id="debateBtn">🎭 Bàn luận</button>
                    </div>
                    <div class="input-row">
                        <div class="input-container">
                            <textarea class="chat-input" id="chatInput" placeholder="Tin nhắn..." rows="1"></textarea>
                        </div>
                        <button class="send-btn" id="sendBtn">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add CSS for iOS-style chat widget
        const chatCSS = document.createElement('style');
        chatCSS.textContent = `
            .ios-chat-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 2000;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }

            .chat-bubble {
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(20px);
                border-radius: 25px;
                padding: 16px 20px;
                cursor: pointer;
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                border: 1px solid rgba(255,255,255,0.2);
                position: relative;
                overflow: hidden;
                max-width: 280px;
            }

            .chat-bubble:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            }

            .bubble-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .chat-avatar {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                position: relative;
            }

            .bubble-pulse {
                position: absolute;
                top: 12px;
                right: 16px;
                width: 8px;
                height: 8px;
                background: #22c55e;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.3); }
                100% { opacity: 1; transform: scale(1); }
            }

            .chat-text {
                flex: 1;
            }

            .chat-title {
                font-weight: 600;
                color: #1a1a1a;
                font-size: 15px;
                margin-bottom: 2px;
            }

            .chat-subtitle {
                font-size: 13px;
                color: #666;
            }

            .chat-window {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 20px;
                width: 360px;
                height: 500px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.3);
                animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }

            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .chat-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px;
                border-radius: 20px 20px 0 0;
            }

            .header-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .chat-info {
                flex: 1;
            }

            .chat-status {
                font-size: 12px;
                opacity: 0.9;
            }

            .chat-actions {
                display: flex;
                gap: 8px;
            }

            .chat-btn {
                width: 28px;
                height: 28px;
                border: none;
                background: rgba(255,255,255,0.2);
                color: white;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
                font-size: 14px;
                font-weight: bold;
            }

            .chat-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: scale(1.1);
            }

            .chat-messages {
                flex: 1;
                padding: 16px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 16px;
                background: rgba(250,250,250,0.5);
            }

            .message {
                display: flex;
                flex-direction: column;
                max-width: 85%;
                animation: fadeInUp 0.2s ease-out;
            }

            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .ai-message {
                align-self: flex-start;
            }

            .user-message {
                align-self: flex-end;
            }

            .character-message {
                align-self: flex-start;
                margin: 8px 0;
            }

            .message-bubble {
                padding: 12px 16px;
                border-radius: 18px;
                font-size: 14px;
                line-height: 1.4;
                word-wrap: break-word;
                white-space: pre-wrap;
            }

            .ai-message .message-bubble {
                background: rgba(255,255,255,0.9);
                color: #1a1a1a;
                border-bottom-left-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .user-message .message-bubble {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-bottom-right-radius: 6px;
            }

            .character-message .message-bubble {
                background: rgba(255,255,255,0.95);
                color: #1a1a1a;
                border-left: 3px solid #667eea;
                border-bottom-left-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }

            .character-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                font-weight: 600;
                font-size: 13px;
                color: #667eea;
            }

            .message-time {
                font-size: 11px;
                color: #999;
                margin-top: 4px;
                text-align: center;
            }

            .chat-input-area {
                padding: 16px;
                background: rgba(255,255,255,0.9);
                border-radius: 0 0 20px 20px;
            }

            .quick-actions {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
            }

            .quick-btn {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s ease;
                backdrop-filter: blur(10px);
            }

            .summary-btn {
                background: rgba(102, 126, 234, 0.15);
                color: #667eea;
                border: 1px solid rgba(102, 126, 234, 0.3);
            }

            .debate-btn {
                background: rgba(118, 75, 162, 0.15);
                color: #764ba2;
                border: 1px solid rgba(118, 75, 162, 0.3);
            }

            .quick-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .input-row {
                display: flex;
                gap: 8px;
                align-items: end;
            }

            .input-container {
                flex: 1;
                background: rgba(255,255,255,0.9);
                border: 1px solid rgba(0,0,0,0.1);
                border-radius: 20px;
                padding: 12px 16px;
                backdrop-filter: blur(10px);
            }

            .chat-input {
                width: 100%;
                border: none;
                outline: none;
                resize: none;
                font-family: inherit;
                font-size: 14px;
                line-height: 1.4;
                max-height: 80px;
                background: transparent;
                color: #1a1a1a;
            }

            .send-btn {
                width: 36px;
                height: 36px;
                border: none;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s ease;
                flex-shrink: 0;
            }

            .send-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .send-btn svg {
                width: 16px;
                height: 16px;
            }

            @media (max-width: 768px) {
                .ios-chat-widget {
                    bottom: 10px;
                    right: 10px;
                }
                
                .chat-window {
                    width: calc(100vw - 20px);
                    height: calc(100vh - 100px);
                    border-radius: 16px;
                }
                
                .chat-bubble {
                    max-width: 220px;
                }
            }
        `;

        document.head.appendChild(chatCSS);
        document.body.appendChild(chatWidget);

        // Bind chat events
        this.setupChatEvents();
    }

    setupChatEvents() {
        const chatBubble = document.getElementById('chatBubble');
        const chatWindow = document.getElementById('chatWindow');
        const chatMinimize = document.getElementById('chatMinimize');
        const chatClose = document.getElementById('chatClose');

        // Show chat window with iOS animation
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
        const summaryBtn = document.getElementById('summaryBtn');
        const debateBtn = document.getElementById('debateBtn');
        const sendBtn = document.getElementById('sendBtn');
        const chatInput = document.getElementById('chatInput');

        // Summary button with fast response
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

        // Debate button with original characters
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

        // Send button with fast processing
        if (sendBtn) {
            sendBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const message = chatInput.value.trim();
                if (message && !this.aiRequestInProgress) {
                    await this.sendChatMessage(message);
                }
            });
        }

        // Chat input with auto-resize
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

            // iOS-style auto-resize
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 80) + 'px';
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
        console.log('🔄 Processing debate request with original characters...');
        
        if (!this.currentArticle) {
            this.showToast('Vui lòng mở một bài báo trước khi yêu cầu bàn luận', 'error');
            return;
        }

        try {
            this.aiRequestInProgress = true;
            this.addChatMessage('🎭 Đang tổ chức cuộc bàn luận với 6 nhân vật...', 'user');
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

            // Display debate with original characters
            this.displayDebateAsOriginalCharacters(data.response);
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

    displayDebateAsOriginalCharacters(debateText) {
        // Original characters as requested
        const characters = [
            { name: 'GS Đại học', emoji: '🎓', color: '#2563eb' },
            { name: 'Nhà kinh tế học', emoji: '💰', color: '#dc2626' },
            { name: 'Nhân viên công sở', emoji: '🏢', color: '#059669' },
            { name: 'Người nghèo', emoji: '😟', color: '#7c3aed' },
            { name: 'Đại gia', emoji: '💎', color: '#f59e0b' },
            { name: 'Shark', emoji: '🦈', color: '#0891b2' }
        ];

        // Split debate text by character sections
        let currentText = debateText;
        
        characters.forEach((character, index) => {
            // Find character section using various patterns
            const patterns = [
                new RegExp(`\\*\\*${character.name}.*?\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`, 'i'),
                new RegExp(`${character.emoji}\\s*\\*\\*${character.name}[^\\*]*\\*\\*([\\s\\S]*?)(?=${characters[index + 1]?.emoji}|$)`, 'i'),
                new RegExp(`${character.name}.*?:([\\s\\S]*?)(?=\\n\\n\\*\\*|\\n\\n${characters[index + 1]?.name}|$)`, 'i')
            ];

            for (const pattern of patterns) {
                const match = currentText.match(pattern);
                if (match && match[1]) {
                    const characterMessage = match[1].trim();
                    if (characterMessage.length > 15) {
                        // Add character message with staggered delay for iOS effect
                        setTimeout(() => {
                            this.addCharacterMessage(character, characterMessage);
                        }, index * 800); // Reduced delay for faster display
                        
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
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message character-message';
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Clean and format the message
        const cleanMessage = this.formatAIResponse(message);

        messageDiv.innerHTML = `
            <div class="character-header">
                <span style="font-size: 16px;">${character.emoji}</span>
                <strong style="color: ${character.color};">${character.name}</strong>
            </div>
            <div class="message-bubble">
                ${cleanMessage}
            </div>
            <div class="message-time">${timeStr}</div>
        `;

        chatMessages.appendChild(messageDiv);

        // iOS-style smooth scroll
        setTimeout(() => {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }, 50);

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

        // Split into paragraphs and format with reduced spacing
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
            .join('<br>'); // Reduced spacing - single <br> instead of double

        return formatted;
    }

    async sendChatMessage(message) {
        if (!message.trim() || this.aiRequestInProgress) return;

        // Add user message with iOS animation
        this.addChatMessage(message, 'user');
        
        // Clear input with smooth animation
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.style.transition = 'all 0.15s ease';
            chatInput.value = '';
            chatInput.style.height = 'auto';
        }

        // Send to AI with fast processing
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
        typingDiv.className = 'message ai-message';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-bubble">
                <div style="display: flex; gap: 4px; align-items: center;">
                    <div style="width: 6px; height: 6px; background: currentColor; border-radius: 50%; animation: bounce 1.2s infinite 0s;"></div>
                    <div style="width: 6px; height: 6px; background: currentColor; border-radius: 50%; animation: bounce 1.2s infinite 0.2s;"></div>
                    <div style="width: 6px; height: 6px; background: currentColor; border-radius: 50%; animation: bounce 1.2s infinite 0.4s;"></div>
                </div>
            </div>
        `;

        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }

        // Add bounce animation
        if (!document.getElementById('bounce-animation')) {
            const style = document.createElement('style');
            style.id = 'bounce-animation';
            style.textContent = `
                @keyframes bounce {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.7; }
                    30% { transform: translateY(-8px); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.style.transition = 'all 0.15s ease';
            typingIndicator.style.opacity = '0';
            typingIndicator.style.transform = 'translateY(-10px)';
            setTimeout(() => typingIndicator.remove(), 150);
        }
    }

    addChatMessage(content, sender = 'ai') {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
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
            <div class="message-bubble">${displayContent}</div>
            <div class="message-time">${timeStr}</div>
        `;

        chatMessages.appendChild(messageDiv);

        // iOS-style smooth scroll
        setTimeout(() => {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }, 50);

        // Store message
        this.chatMessages.push({ content, sender, timestamp: now });
        
        // Limit message history for performance
        if (this.chatMessages.length > 30) {
            this.chatMessages = this.chatMessages.slice(-20);
        }
    }

    openChatWindow() {
        const chatBubble = document.getElementById('chatBubble');
        const chatWindow = document.getElementById('chatWindow');
        
        if (chatBubble && chatWindow) {
            chatBubble.style.transition = 'all 0.15s ease';
            chatBubble.style.opacity = '0';
            chatBubble.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                chatBubble.style.display = 'none';
                chatWindow.style.display = 'flex';
                
                // Focus on input with delay
                setTimeout(() => {
                    const chatInput = document.getElementById('chatInput');
                    if (chatInput) chatInput.focus();
                }, 250);
            }, 150);
        }
    }

    minimizeChatWindow() {
        const chatBubble = document.getElementById('chatBubble');
        const chatWindow = document.getElementById('chatWindow');
        
        if (chatBubble && chatWindow) {
            chatWindow.style.transition = 'all 0.15s ease';
            chatWindow.style.opacity = '0';
            chatWindow.style.transform = 'translateY(20px) scale(0.95)';
            
            setTimeout(() => {
                chatWindow.style.display = 'none';
                chatBubble.style.display = 'block';
                chatBubble.style.opacity = '1';
                chatBubble.style.transform = 'scale(1)';
            }, 150);
        }
    }

    closeChatWindow() {
        const chatWidget = document.querySelector('.ios-chat-widget');
        
        if (chatWidget) {
            chatWidget.style.transition = 'all 0.2s ease';
            chatWidget.style.opacity = '0';
            chatWidget.style.transform = 'translateY(20px) scale(0.8)';
            
            setTimeout(() => {
                chatWidget.style.display = 'none';
            }, 200);
        }
    }

    async switchCategory(category) {
        if (this.isLoading || category === this.currentCategory) return;

        // Update active states with fast transitions
        document.querySelectorAll('.nav-item, .sidebar-link').forEach(link => {
            link.classList.remove('active');
            link.style.transition = 'all 0.15s ease';
        });
        
        const activeElements = document.querySelectorAll(
            `[data-category="${category}"]`
        );
        activeElements.forEach(el => {
            el.classList.add('active');
            el.style.transition = 'all 0.15s ease';
        });

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
            if (Date.now() - cachedData.timestamp < 3 * 60 * 1000) { // 3 minutes
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
        const newsGrid = document.getElementById('newsGrid');
        if (!newsGrid) return;

        newsGrid.innerHTML = '';

        if (newsItems.length === 0) {
            newsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                    📰 Không có tin tức nào được tìm thấy
                </div>
            `;
            return;
        }

        newsItems.forEach((news, index) => {
            const newsCard = this.createNewsCard(news, index);
            newsGrid.appendChild(newsCard);
            
            // Fast staggered animation
            requestAnimationFrame(() => {
                newsCard.style.opacity = '0';
                newsCard.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    newsCard.style.transition = 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
                    newsCard.style.opacity = '1';
                    newsCard.style.transform = 'translateY(0)';
                }, index * 50); // Faster stagger
            });
        });
    }

    createNewsCard(news, index) {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.dataset.articleId = news.id;
        card.dataset.articleLink = news.link;
        
        card.innerHTML = `
            <div class="news-card-header">
                <span class="news-source">${this.escapeHtml(news.source)}</span>
                <span class="news-time">${this.escapeHtml(news.published)}</span>
            </div>
            <div class="news-card-body">
                <h3 class="news-title">${this.escapeHtml(news.title)}</h3>
                <p class="news-description">${this.escapeHtml(news.description)}</p>
            </div>
        `;

        // Event listeners with fast transitions
        card.addEventListener('click', () => this.showArticleDetail(news));

        // iOS-style hover effects for desktop
        if (window.matchMedia('(hover: hover)').matches) {
            card.addEventListener('mouseenter', () => {
                card.style.transition = 'all 0.15s ease';
                card.style.transform = 'translateY(-4px)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transition = 'all 0.15s ease';
                card.style.transform = 'translateY(0)';
            });
        }

        return card;
    }

    async showArticleDetail(news) {
        try {
            this.showToast('📰 Đang tải chi tiết bài viết...', 'info');

            // Set current article for AI context
            this.currentArticle = news;

            // Update article modal content
            const titleEl = document.getElementById('articleTitle');
            const sourceEl = document.getElementById('articleSource');
            const timeEl = document.getElementById('articleTime');
            const linkEl = document.getElementById('articleLink');
            const iframe = document.getElementById('articleIframe');

            if (titleEl) titleEl.textContent = news.title;
            if (sourceEl) sourceEl.textContent = news.source;
            if (timeEl) timeEl.textContent = news.published;
            if (linkEl) linkEl.href = news.link;
            
            // IFRAME MODE: Load original webpage
            if (iframe) {
                iframe.src = news.link;
            }

            // Show article modal with iOS animation
            this.showArticleModal();

            // Show chat widget with context
            this.showChatWithContext();

        } catch (error) {
            console.error('❌ Article loading error:', error);
            this.showToast('Lỗi khi tải bài viết: ' + error.message, 'error');
        }
    }

    showArticleModal() {
        const modal = document.getElementById('articleModal');
        
        if (modal) {
            modal.style.display = 'block';
            
            // iOS-style smooth animation
            modal.style.opacity = '0';
            
            requestAnimationFrame(() => {
                modal.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                modal.style.opacity = '1';
            });
        }
    }

    closeArticleModal() {
        const modal = document.getElementById('articleModal');
        const iframe = document.getElementById('articleIframe');
        
        if (modal) {
            modal.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            modal.style.opacity = '0';
            
            setTimeout(() => {
                modal.style.display = 'none';
                if (iframe) iframe.src = '';
                this.currentArticle = null;
            }, 200);
        }
    }

    showChatWithContext() {
        const chatWidget = document.querySelector('.ios-chat-widget');
        const chatBubbleSubtitle = document.querySelector('.chat-subtitle');
        
        if (chatWidget) {
            // Update subtitle text
            if (chatBubbleSubtitle) {
                chatBubbleSubtitle.textContent = 'Sẵn sàng phân tích bài báo!';
            }
            
            // Show with iOS animation
            chatWidget.style.display = 'block';
            chatWidget.style.opacity = '0';
            chatWidget.style.transform = 'translateY(20px) scale(0.8)';
            
            setTimeout(() => {
                chatWidget.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                chatWidget.style.opacity = '1';
                chatWidget.style.transform = 'translateY(0) scale(1)';
            }, 50);
        }
    }

    updatePagination(currentPage, totalPages) {
        const currentPageEl = document.getElementById('currentPage');
        const totalPagesEl = document.getElementById('totalPages');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pagination = document.getElementById('paginationContainer');

        if (currentPageEl) currentPageEl.textContent = currentPage;
        if (totalPagesEl) totalPagesEl.textContent = totalPages;
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
        if (pagination) pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }

    showLoading() {
        const loadingContainer = document.getElementById('loadingContainer');
        const newsGrid = document.getElementById('newsGrid');
        const paginationContainer = document.getElementById('paginationContainer');

        if (loadingContainer) {
            loadingContainer.style.display = 'block';
            loadingContainer.style.transition = 'opacity 0.15s ease';
            loadingContainer.style.opacity = '1';
        }
        if (newsGrid) newsGrid.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'none';
    }

    hideLoading() {
        const loadingContainer = document.getElementById('loadingContainer');
        const newsGrid = document.getElementById('newsGrid');
        
        if (loadingContainer) {
            loadingContainer.style.transition = 'opacity 0.15s ease';
            loadingContainer.style.opacity = '0';
            setTimeout(() => {
                loadingContainer.style.display = 'none';
            }, 150);
        }
        if (newsGrid) newsGrid.style.display = 'grid';
    }

    renderError() {
        const newsGrid = document.getElementById('newsGrid');
        if (!newsGrid) return;

        newsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; text-align: center; gap: 1rem;">
                <div style="font-size: 3rem;">❌</div>
                <h3 style="color: #dc2626; margin: 0; font-size: 1.5rem;">Lỗi khi tải tin tức</h3>
                <p style="color: #666; margin: 0;">Vui lòng thử lại sau</p>
                <button onclick="portal.loadNews(portal.currentCategory, portal.currentPage)" 
                        style="padding: 0.75rem 1.5rem; background: #1a1a1a; color: white; border: none; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
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
                    const totalPages = parseInt(document.getElementById('totalPages')?.textContent || '1');
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
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1100;
                display: flex;
                flex-direction: column;
                gap: 8px;
            `;
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            color: #1a1a1a;
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
            border: 1px solid rgba(255,255,255,0.2);
            max-width: 300px;
            font-size: 14px;
            font-weight: 500;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        `;

        // Type-specific styling
        if (type === 'success') {
            toast.style.borderLeft = '3px solid #22c55e';
        } else if (type === 'error') {
            toast.style.borderLeft = '3px solid #ef4444';
        } else if (type === 'info') {
            toast.style.borderLeft = '3px solid #3b82f6';
        }

        toastContainer.appendChild(toast);

        // Show with iOS animation
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Hide after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 150);
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
            aiRequestInProgress: this.aiRequestInProgress,
            loadTime: performance.now()
        };
    }
}

// Initialize when DOM is loaded
let portal;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Enhanced Tiền Phong News Portal...');
    
    try {
        portal = new TienPhongNewsPortal();
        
        console.log('✅ Enhanced Tiền Phong News Portal initialized successfully!');
        console.log('🎨 Theme: Traditional Newspaper + iOS Glassmorphism Effects');
        console.log('📱 Original AI Characters: GS Đại học, Nhà kinh tế học, Nhân viên công sở, Người nghèo, Đại gia, Shark');
        console.log('⚡ Fast transitions: 0.15s - 0.25s');
        
        // Performance report after 5 seconds
        setTimeout(() => {
            console.log('📊 Performance Report:', portal.getPerformanceReport());
        }, 5000);

    } catch (error) {
        console.error('❌ Failed to initialize Enhanced Portal:', error);
        
        // Show error message
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 2rem; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
                <h1 style="color: #dc2626; margin-bottom: 1rem;">Lỗi khởi tạo Enhanced Portal</h1>
                <p style="color: #666; margin-bottom: 2rem;">${error.message}</p>
                <button onclick="location.reload()" 
                        style="padding: 1rem 2rem; background: #1a1a1a; color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 1rem;">
                    🔄 Tải lại trang
                </button>
            </div>
        `;
    }
});

// Global error handling
window.addEventListener('error', (e) => {
    console.error('🚨 Global Enhanced Portal error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 Enhanced Portal promise rejection:', e.reason);
});

// Make portal globally accessible for debugging
window.portal = portal;
