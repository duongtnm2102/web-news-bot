/**
 * WebSocket Terminal Support v2.024
 * Real-time terminal interface with brutalist aesthetics
 * Memory-optimized for 512MB environments
 */

'use strict';

class WebSocketTerminal {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = 30000; // 30 seconds
        this.heartbeatTimer = null;
        
        // Message queuing for offline support
        this.messageQueue = [];
        this.maxQueueSize = 20; // Memory optimization
        
        // Connection state
        this.isConnected = false;
        this.connectionId = null;
        this.lastActivity = Date.now();
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Terminal integration
        this.terminalBuffer = [];
        this.maxBufferSize = 100;
        
        // Performance tracking
        this.metrics = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnections: 0,
            latency: 0,
            errors: 0
        };
        
        // Initialize if WebSocket is available
        if (typeof WebSocket !== 'undefined') {
            this.initialize();
        } else {
            console.warn('WebSocket not supported - falling back to HTTP');
        }
    }
    
    initialize() {
        // Check if WebSocket terminal is enabled
        const wsEnabled = this.getConfig('ENABLE_WEBSOCKETS', false);
        
        if (!wsEnabled) {
            console.log('📡 WebSocket terminal disabled - using HTTP mode');
            return;
        }
        
        // Setup terminal integration
        this.setupTerminalIntegration();
        
        // Connect to WebSocket server
        this.connect();
        
        // Setup periodic cleanup
        this.setupCleanup();
        
        console.log('📡 WebSocket Terminal initialized');
    }
    
    getConfig(key, defaultValue) {
        // Get configuration from environment or defaults
        if (typeof window.APP_CONFIG !== 'undefined' && window.APP_CONFIG[key]) {
            return window.APP_CONFIG[key];
        }
        return defaultValue;
    }
    
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        
        try {
            // Determine WebSocket URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/ws/terminal`;
            
            console.log(`📡 Connecting to WebSocket: ${wsUrl}`);
            
            this.ws = new WebSocket(wsUrl);
            this.setupWebSocketHandlers();
            
        } catch (error) {
            console.error('📡 WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }
    
    setupWebSocketHandlers() {
        this.ws.onopen = (event) => {
            console.log('📡 WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.connectionId = this.generateConnectionId();
            
            // Send connection initialization
            this.send({\n                type: 'init',\n                connectionId: this.connectionId,\n                userAgent: navigator.userAgent,\n                timestamp: Date.now()\n            });\n            \n            // Process queued messages\n            this.processMessageQueue();\n            \n            // Start heartbeat\n            this.startHeartbeat();\n            \n            // Trigger connected event\n            this.emit('connected', { connectionId: this.connectionId });\n            \n            // Update terminal status\n            this.updateTerminalStatus('WEBSOCKET_CONNECTED');\n        };\n        \n        this.ws.onmessage = (event) => {\n            this.handleMessage(event);\n        };\n        \n        this.ws.onclose = (event) => {\n            console.log('📡 WebSocket disconnected:', event.code, event.reason);\n            this.isConnected = false;\n            this.stopHeartbeat();\n            \n            // Trigger disconnected event\n            this.emit('disconnected', { code: event.code, reason: event.reason });\n            \n            // Update terminal status\n            this.updateTerminalStatus('WEBSOCKET_DISCONNECTED');\n            \n            // Schedule reconnection if not intentional close\n            if (event.code !== 1000) {\n                this.scheduleReconnect();\n            }\n        };\n        \n        this.ws.onerror = (error) => {\n            console.error('📡 WebSocket error:', error);\n            this.metrics.errors++;\n            this.emit('error', { error });\n        };\n    }\n    \n    handleMessage(event) {\n        try {\n            const data = JSON.parse(event.data);\n            this.metrics.messagesReceived++;\n            this.lastActivity = Date.now();\n            \n            // Calculate latency for ping messages\n            if (data.type === 'pong' && data.timestamp) {\n                this.metrics.latency = Date.now() - data.timestamp;\n            }\n            \n            // Route message based on type\n            switch (data.type) {\n                case 'terminal_output':\n                    this.handleTerminalOutput(data);\n                    break;\n                case 'system_notification':\n                    this.handleSystemNotification(data);\n                    break;\n                case 'performance_update':\n                    this.handlePerformanceUpdate(data);\n                    break;\n                case 'news_update':\n                    this.handleNewsUpdate(data);\n                    break;\n                case 'ai_response':\n                    this.handleAIResponse(data);\n                    break;\n                case 'pong':\n                    // Heartbeat response - already handled above\n                    break;\n                default:\n                    console.warn('📡 Unknown message type:', data.type);\n            }\n            \n            // Emit generic message event\n            this.emit('message', data);\n            \n        } catch (error) {\n            console.error('📡 Error parsing WebSocket message:', error);\n            this.metrics.errors++;\n        }\n    }\n    \n    handleTerminalOutput(data) {\n        // Add to terminal buffer\n        this.addToTerminalBuffer(data);\n        \n        // Display in terminal if available\n        if (window.retroNewsPortal) {\n            this.displayTerminalMessage(data.message, data.color || 'green');\n        }\n        \n        this.emit('terminal_output', data);\n    }\n    \n    handleSystemNotification(data) {\n        // Show system notification\n        this.showSystemNotification(data.message, data.level || 'info');\n        this.emit('system_notification', data);\n    }\n    \n    handlePerformanceUpdate(data) {\n        // Update performance monitoring\n        if (window.terminalPerformance) {\n            window.terminalPerformance.updateFromWebSocket(data);\n        }\n        this.emit('performance_update', data);\n    }\n    \n    handleNewsUpdate(data) {\n        // Handle real-time news updates\n        if (window.retroNewsPortal) {\n            window.retroNewsPortal.handleRealtimeNewsUpdate(data);\n        }\n        this.emit('news_update', data);\n    }\n    \n    handleAIResponse(data) {\n        // Handle real-time AI responses\n        if (window.retroNewsPortal) {\n            window.retroNewsPortal.handleRealtimeAIResponse(data);\n        }\n        this.emit('ai_response', data);\n    }\n    \n    send(data) {\n        if (this.ws && this.ws.readyState === WebSocket.OPEN) {\n            try {\n                this.ws.send(JSON.stringify(data));\n                this.metrics.messagesSent++;\n                return true;\n            } catch (error) {\n                console.error('📡 Error sending WebSocket message:', error);\n                this.queueMessage(data);\n                return false;\n            }\n        } else {\n            this.queueMessage(data);\n            return false;\n        }\n    }\n    \n    queueMessage(data) {\n        // Queue message for later sending\n        if (this.messageQueue.length >= this.maxQueueSize) {\n            this.messageQueue.shift(); // Remove oldest message\n        }\n        this.messageQueue.push({\n            data,\n            timestamp: Date.now()\n        });\n    }\n    \n    processMessageQueue() {\n        // Send all queued messages\n        while (this.messageQueue.length > 0) {\n            const { data } = this.messageQueue.shift();\n            this.send(data);\n        }\n    }\n    \n    scheduleReconnect() {\n        if (this.reconnectAttempts >= this.maxReconnectAttempts) {\n            console.error('📡 Max reconnection attempts reached');\n            this.emit('max_reconnects_reached');\n            return;\n        }\n        \n        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // Exponential backoff\n        this.reconnectAttempts++;\n        this.metrics.reconnections++;\n        \n        console.log(`📡 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);\n        \n        setTimeout(() => {\n            this.connect();\n        }, delay);\n    }\n    \n    startHeartbeat() {\n        this.stopHeartbeat();\n        \n        this.heartbeatTimer = setInterval(() => {\n            if (this.isConnected) {\n                this.send({\n                    type: 'ping',\n                    timestamp: Date.now()\n                });\n            }\n        }, this.heartbeatInterval);\n    }\n    \n    stopHeartbeat() {\n        if (this.heartbeatTimer) {\n            clearInterval(this.heartbeatTimer);\n            this.heartbeatTimer = null;\n        }\n    }\n    \n    setupTerminalIntegration() {\n        // Integrate with existing terminal system\n        if (window.enhancedTerminal) {\n            this.integrateWithEnhancedTerminal();\n        } else if (window.retroNewsPortal && window.retroNewsPortal.terminalProcessor) {\n            this.integrateWithBasicTerminal();\n        }\n    }\n    \n    integrateWithEnhancedTerminal() {\n        // Override terminal command execution to use WebSocket\n        const originalExecute = window.enhancedTerminal.executeCommand;\n        \n        window.enhancedTerminal.executeCommand = async (commandStr) => {\n            // Send command via WebSocket if connected\n            if (this.isConnected) {\n                this.send({\n                    type: 'terminal_command',\n                    command: commandStr,\n                    timestamp: Date.now()\n                });\n                \n                // Return pending response\n                return {\n                    status: 'pending',\n                    message: 'Command sent via WebSocket...',\n                    websocket: true\n                };\n            }\n            \n            // Fallback to local execution\n            return await originalExecute.call(window.enhancedTerminal, commandStr);\n        };\n    }\n    \n    integrateWithBasicTerminal() {\n        // Basic integration with retroNewsPortal terminal\n        const originalExecute = window.retroNewsPortal.terminalProcessor.execute;\n        \n        window.retroNewsPortal.terminalProcessor.execute = function(commandStr) {\n            // Send via WebSocket if available\n            if (window.wsTerminal && window.wsTerminal.isConnected) {\n                window.wsTerminal.send({\n                    type: 'terminal_command',\n                    command: commandStr,\n                    timestamp: Date.now()\n                });\n                \n                return {\n                    status: 'success',\n                    message: 'Command sent via WebSocket...'\n                };\n            }\n            \n            // Fallback to original\n            return originalExecute.call(this, commandStr);\n        };\n    }\n    \n    addToTerminalBuffer(data) {\n        this.terminalBuffer.push({\n            ...data,\n            timestamp: Date.now()\n        });\n        \n        // Maintain buffer size\n        if (this.terminalBuffer.length > this.maxBufferSize) {\n            this.terminalBuffer = this.terminalBuffer.slice(-this.maxBufferSize);\n        }\n    }\n    \n    displayTerminalMessage(message, color = 'green') {\n        // Create terminal message display\n        const timestamp = new Date().toLocaleTimeString();\n        const formattedMessage = `[${timestamp}] ${message}`;\n        \n        // Show in toast or terminal output area\n        if (window.retroNewsPortal && window.retroNewsPortal.showToast) {\n            window.retroNewsPortal.showToast(formattedMessage, 'info');\n        }\n        \n        // Log to console with styling\n        console.log(`%c📡 ${formattedMessage}`, `color: ${color}; font-family: monospace;`);\n    }\n    \n    showSystemNotification(message, level) {\n        // Show system notification with terminal styling\n        if (window.retroNewsPortal && window.retroNewsPortal.showToast) {\n            window.retroNewsPortal.showToast(`SYSTEM: ${message}`, level);\n        }\n        \n        // Browser notification if permission granted\n        if ('Notification' in window && Notification.permission === 'granted') {\n            new Notification('E-con Terminal', {\n                body: message,\n                icon: '/static/icon-192.png'\n            });\n        }\n    }\n    \n    updateTerminalStatus(status) {\n        // Update terminal status indicator\n        const statusElements = document.querySelectorAll('.websocket-status');\n        statusElements.forEach(el => {\n            el.textContent = status;\n            el.className = `websocket-status ${status.toLowerCase().replace('_', '-')}`;\n        });\n        \n        // Update connection indicator in bottom bar\n        const connectionInfo = document.querySelector('.system-info');\n        if (connectionInfo) {\n            const wsIndicator = connectionInfo.querySelector('.ws-status') || \n                              document.createElement('span');\n            wsIndicator.className = 'ws-status';\n            wsIndicator.textContent = this.isConnected ? 'WS: ONLINE' : 'WS: OFFLINE';\n            wsIndicator.style.color = this.isConnected ? 'var(--terminal-green)' : 'var(--terminal-red)';\n            \n            if (!connectionInfo.querySelector('.ws-status')) {\n                connectionInfo.appendChild(document.createTextNode(' | '));\n                connectionInfo.appendChild(wsIndicator);\n            }\n        }\n    }\n    \n    setupCleanup() {\n        // Periodic cleanup to prevent memory leaks\n        setInterval(() => {\n            // Clean old terminal buffer entries\n            const cutoff = Date.now() - (10 * 60 * 1000); // 10 minutes\n            this.terminalBuffer = this.terminalBuffer.filter(entry => \n                entry.timestamp > cutoff\n            );\n            \n            // Clean old queued messages\n            const queueCutoff = Date.now() - (5 * 60 * 1000); // 5 minutes\n            this.messageQueue = this.messageQueue.filter(msg => \n                msg.timestamp > queueCutoff\n            );\n            \n        }, 60000); // Every minute\n    }\n    \n    generateConnectionId() {\n        return 'ws_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();\n    }\n    \n    // Event system\n    on(event, handler) {\n        if (!this.eventHandlers.has(event)) {\n            this.eventHandlers.set(event, []);\n        }\n        this.eventHandlers.get(event).push(handler);\n    }\n    \n    off(event, handler) {\n        if (this.eventHandlers.has(event)) {\n            const handlers = this.eventHandlers.get(event);\n            const index = handlers.indexOf(handler);\n            if (index > -1) {\n                handlers.splice(index, 1);\n            }\n        }\n    }\n    \n    emit(event, data) {\n        if (this.eventHandlers.has(event)) {\n            this.eventHandlers.get(event).forEach(handler => {\n                try {\n                    handler(data);\n                } catch (error) {\n                    console.error(`Error in event handler for ${event}:`, error);\n                }\n            });\n        }\n    }\n    \n    // Public API methods\n    getStatus() {\n        return {\n            connected: this.isConnected,\n            connectionId: this.connectionId,\n            reconnectAttempts: this.reconnectAttempts,\n            metrics: { ...this.metrics },\n            queueSize: this.messageQueue.length,\n            bufferSize: this.terminalBuffer.length,\n            lastActivity: this.lastActivity\n        };\n    }\n    \n    getMetrics() {\n        return {\n            ...this.metrics,\n            uptime: Date.now() - (this.connectionStart || Date.now()),\n            queueSize: this.messageQueue.length,\n            bufferSize: this.terminalBuffer.length\n        };\n    }\n    \n    sendTerminalCommand(command) {\n        return this.send({\n            type: 'terminal_command',\n            command,\n            timestamp: Date.now()\n        });\n    }\n    \n    requestPerformanceUpdate() {\n        return this.send({\n            type: 'request_performance',\n            timestamp: Date.now()\n        });\n    }\n    \n    disconnect() {\n        if (this.ws) {\n            this.ws.close(1000, 'User disconnected');\n        }\n    }\n    \n    reconnect() {\n        this.disconnect();\n        this.reconnectAttempts = 0;\n        setTimeout(() => this.connect(), 1000);\n    }\n}\n\n// Initialize WebSocket terminal\nconst wsTerminal = new WebSocketTerminal();\n\n// Add terminal command for WebSocket status\nif (window.enhancedTerminal) {\n    window.enhancedTerminal.commands.set('ws', {\n        description: 'WebSocket connection management',\n        usage: 'ws [status|connect|disconnect|metrics]',\n        examples: ['ws status', 'ws connect', 'ws metrics'],\n        category: 'system',\n        execute: async (context) => {\n            const { args } = context;\n            const action = args[0] || 'status';\n            \n            switch (action) {\n                case 'status':\n                    const status = wsTerminal.getStatus();\n                    return {\n                        status: 'success',\n                        message: `WEBSOCKET STATUS:\n├─ Connected: ${status.connected ? 'YES' : 'NO'}\n├─ Connection ID: ${status.connectionId || 'None'}\n├─ Reconnect Attempts: ${status.reconnectAttempts}\n├─ Queue Size: ${status.queueSize}\n├─ Buffer Size: ${status.bufferSize}\n├─ Latency: ${status.metrics.latency}ms\n└─ Messages: ${status.metrics.messagesReceived} received, ${status.metrics.messagesSent} sent`\n                    };\n                    \n                case 'connect':\n                    wsTerminal.connect();\n                    return { status: 'success', message: 'WebSocket connection initiated' };\n                    \n                case 'disconnect':\n                    wsTerminal.disconnect();\n                    return { status: 'success', message: 'WebSocket disconnected' };\n                    \n                case 'reconnect':\n                    wsTerminal.reconnect();\n                    return { status: 'success', message: 'WebSocket reconnection initiated' };\n                    \n                case 'metrics':\n                    const metrics = wsTerminal.getMetrics();\n                    return {\n                        status: 'success',\n                        message: `WEBSOCKET METRICS:\n├─ Messages Received: ${metrics.messagesReceived}\n├─ Messages Sent: ${metrics.messagesSent}\n├─ Reconnections: ${metrics.reconnections}\n├─ Errors: ${metrics.errors}\n├─ Average Latency: ${metrics.latency}ms\n└─ Queue Size: ${metrics.queueSize}`\n                    };\n                    \n                default:\n                    return { status: 'error', message: 'Usage: ws [status|connect|disconnect|metrics]' };\n            }\n        }\n    });\n}\n\n// Export for global access\nwindow.wsTerminal = wsTerminal;\n\nconsole.log('📡 WebSocket Terminal support loaded');"
        },
        {
            "description": "WebSocket connection management",
            "usage": "ws [status|connect|disconnect|metrics]",
            "examples": ["ws status", "ws connect", "ws metrics"],
            "category": "system",
            "execute": async (context) => {
                const { args } = context;
                const action = args[0] || 'status';
                
                switch (action) {
                    case 'status':
                        const status = wsTerminal.getStatus();
                        return {
                            status: 'success',
                            message: `WEBSOCKET STATUS:\n├─ Connected: ${status.connected ? 'YES' : 'NO'}\n├─ Connection ID: ${status.connectionId || 'None'}\n├─ Reconnect Attempts: ${status.reconnectAttempts}\n├─ Queue Size: ${status.queueSize}\n├─ Buffer Size: ${status.bufferSize}\n├─ Latency: ${status.metrics.latency}ms\n└─ Messages: ${status.metrics.messagesReceived} received, ${status.metrics.messagesSent} sent`
                        };
                        
                    case 'connect':
                        wsTerminal.connect();
                        return { status: 'success', message: 'WebSocket connection initiated' };
                        
                    case 'disconnect':
                        wsTerminal.disconnect();
                        return { status: 'success', message: 'WebSocket disconnected' };
                        
                    case 'reconnect':
                        wsTerminal.reconnect();
                        return { status: 'success', message: 'WebSocket reconnection initiated' };
                        
                    case 'metrics':
                        const metrics = wsTerminal.getMetrics();
                        return {
                            status: 'success',
                            message: `WEBSOCKET METRICS:\n├─ Messages Received: ${metrics.messagesReceived}\n├─ Messages Sent: ${metrics.messagesSent}\n├─ Reconnections: ${metrics.reconnections}\n├─ Errors: ${metrics.errors}\n├─ Average Latency: ${metrics.latency}ms\n└─ Queue Size: ${metrics.queueSize}`
                        };
                        
                    default:
                        return { status: 'error', message: 'Usage: ws [status|connect|disconnect|metrics]' };
                }
            }
        });
}

// Export for global access
window.wsTerminal = wsTerminal;

console.log('📡 WebSocket Terminal support loaded');
