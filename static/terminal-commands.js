/**
 * Enhanced Terminal Commands System v2.024
 * Advanced command-line interface for retro brutalism news portal
 * Optimized for memory efficiency and terminal aesthetics
 */

'use strict';

class EnhancedTerminalCommands {
    constructor() {
        this.commandHistory = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50; // Limit for memory optimization
        
        this.aliases = new Map();
        this.commandQueue = [];
        this.isExecuting = false;
        
        // Command categories for help system
        this.commandCategories = {
            'news': ['news', 'refresh', 'search', 'sources'],
            'ai': ['ai', 'summarize', 'debate', 'analyze'],
            'system': ['status', 'stats', 'uptime', 'memory', 'perf'],
            'interface': ['matrix', 'glitch', 'theme', 'clear'],
            'utility': ['help', 'history', 'alias', 'export']
        };
        
        // Enhanced command registry with metadata
        this.commands = new Map([
            // News Commands
            ['news', {
                description: 'Load news feed by category',
                usage: 'news [all|domestic|international|tech|crypto|ai]',
                examples: ['news', 'news domestic', 'news tech'],
                category: 'news',
                execute: this.executeNewsCommand.bind(this)
            }],
            ['refresh', {
                description: 'Refresh all news feeds and clear cache',
                usage: 'refresh [force]',
                examples: ['refresh', 'refresh force'],
                category: 'news',
                execute: this.executeRefreshCommand.bind(this)
            }],
            ['search', {
                description: 'Search news articles by keyword',
                usage: 'search <keyword>',
                examples: ['search bitcoin', 'search "artificial intelligence"'],
                category: 'news',
                execute: this.executeSearchCommand.bind(this)
            }],
            ['sources', {
                description: 'List all news sources and their status',
                usage: 'sources [status]',
                examples: ['sources', 'sources status'],
                category: 'news',
                execute: this.executeSourcesCommand.bind(this)
            }],
            
            // AI Commands
            ['ai', {
                description: 'Open AI assistant interface',
                usage: 'ai [quick <question>]',
                examples: ['ai', 'ai quick "What is Bitcoin?"'],
                category: 'ai',
                execute: this.executeAICommand.bind(this)
            }],
            ['summarize', {
                description: 'Summarize current article with AI',
                usage: 'summarize [detailed|brief]',
                examples: ['summarize', 'summarize detailed'],
                category: 'ai',
                execute: this.executeSummarizeCommand.bind(this)
            }],
            ['debate', {
                description: 'Generate multi-perspective debate on current topic',
                usage: 'debate [topic]',
                examples: ['debate', 'debate "crypto regulation"'],
                category: 'ai',
                execute: this.executeDebateCommand.bind(this)
            }],
            ['analyze', {
                description: 'AI analysis of current article or topic',
                usage: 'analyze [topic]',
                examples: ['analyze', 'analyze "market trends"'],
                category: 'ai',
                execute: this.executeAnalyzeCommand.bind(this)
            }],
            
            // System Commands
            ['status', {
                description: 'Display system status and statistics',
                usage: 'status [verbose]',
                examples: ['status', 'status verbose'],
                category: 'system',
                execute: this.executeStatusCommand.bind(this)
            }],
            ['stats', {
                description: 'Show performance statistics',
                usage: 'stats [memory|network|cache|errors]',
                examples: ['stats', 'stats memory'],
                category: 'system',
                execute: this.executeStatsCommand.bind(this)
            }],
            ['uptime', {
                description: 'Show system uptime and reliability metrics',
                usage: 'uptime [detailed]',
                examples: ['uptime', 'uptime detailed'],
                category: 'system',
                execute: this.executeUptimeCommand.bind(this)
            }],
            ['memory', {
                description: 'Memory management and optimization',
                usage: 'memory [status|optimize|gc|clear]',
                examples: ['memory', 'memory optimize', 'memory gc'],
                category: 'system',
                execute: this.executeMemoryCommand.bind(this)
            }],
            ['perf', {
                description: 'Performance monitoring and analysis',
                usage: 'perf [status|start|stop|report]',
                examples: ['perf status', 'perf start'],
                category: 'system',
                execute: this.executePerformanceCommand.bind(this)
            }],
            
            // Interface Commands
            ['matrix', {
                description: 'Activate Matrix digital rain effect',
                usage: 'matrix [duration]',
                examples: ['matrix', 'matrix 10'],
                category: 'interface',
                execute: this.executeMatrixCommand.bind(this)
            }],
            ['glitch', {
                description: 'Trigger retro glitch effects',
                usage: 'glitch [low|medium|high|extreme]',
                examples: ['glitch', 'glitch high'],
                category: 'interface',
                execute: this.executeGlitchCommand.bind(this)
            }],
            ['theme', {
                description: 'Change interface theme and colors',
                usage: 'theme [retro|cyber|classic|custom]',
                examples: ['theme retro', 'theme cyber'],
                category: 'interface',
                execute: this.executeThemeCommand.bind(this)
            }],
            ['clear', {
                description: 'Clear terminal output and reset display',
                usage: 'clear [all|history|cache]',
                examples: ['clear', 'clear all'],
                category: 'interface',
                execute: this.executeClearCommand.bind(this)
            }],
            
            // Utility Commands
            ['help', {
                description: 'Show help information and command list',
                usage: 'help [command|category]',
                examples: ['help', 'help news', 'help ai'],
                category: 'utility',
                execute: this.executeHelpCommand.bind(this)
            }],
            ['history', {
                description: 'Show command history and manage it',
                usage: 'history [clear|export|search <term>]',
                examples: ['history', 'history clear', 'history search news'],
                category: 'utility',
                execute: this.executeHistoryCommand.bind(this)
            }],
            ['alias', {
                description: 'Create command aliases for shortcuts',
                usage: 'alias [list|create <alias> <command>|remove <alias>]',
                examples: ['alias list', 'alias create n news', 'alias remove n'],
                category: 'utility',
                execute: this.executeAliasCommand.bind(this)
            }],
            ['export', {
                description: 'Export terminal session or data',
                usage: 'export [history|stats|session] [format]',
                examples: ['export history', 'export stats json'],
                category: 'utility',
                execute: this.executeExportCommand.bind(this)
            }],
            ['version', {
                description: 'Show application version and build info',
                usage: 'version [detailed]',
                examples: ['version', 'version detailed'],
                category: 'utility',
                execute: this.executeVersionCommand.bind(this)
            }],
            ['echo', {
                description: 'Display text with terminal formatting',
                usage: 'echo <text> [color]',
                examples: ['echo "Hello World"', 'echo "Warning!" red'],
                category: 'utility',
                execute: this.executeEchoCommand.bind(this)
            }],
            ['date', {
                description: 'Show current date and time',
                usage: 'date [format|utc|vietnam]',
                examples: ['date', 'date utc', 'date vietnam'],
                category: 'utility',
                execute: this.executeDateCommand.bind(this)
            }],
            ['whoami', {
                description: 'Display current user session information',
                usage: 'whoami [detailed]',
                examples: ['whoami', 'whoami detailed'],
                category: 'utility',
                execute: this.executeWhoAmICommand.bind(this)
            }]\n        ]);\n        \n        // Setup default aliases\n        this.setupDefaultAliases();\n        \n        // Load saved history from localStorage (if available)\n        this.loadCommandHistory();\n        \n        // Initialize terminal enhancements\n        this.initializeTerminalFeatures();\n        \n        console.log('🖥️ Enhanced Terminal Commands loaded - Type \"help\" for command list');\n    }\n    \n    setupDefaultAliases() {\n        const defaultAliases = {\n            'n': 'news',\n            'r': 'refresh',\n            's': 'status',\n            'h': 'help',\n            'c': 'clear',\n            'm': 'matrix',\n            'g': 'glitch',\n            'ai': 'ai',\n            'sum': 'summarize',\n            'deb': 'debate',\n            'mem': 'memory',\n            'perf': 'perf',\n            'hist': 'history',\n            'ls': 'sources',\n            'cls': 'clear',\n            'exit': 'clear',\n            'quit': 'clear'\n        };\n        \n        Object.entries(defaultAliases).forEach(([alias, command]) => {\n            this.aliases.set(alias, command);\n        });\n    }\n    \n    loadCommandHistory() {\n        try {\n            const saved = localStorage.getItem('terminal_command_history');\n            if (saved) {\n                this.commandHistory = JSON.parse(saved).slice(-this.maxHistorySize);\n            }\n        } catch (error) {\n            console.warn('Could not load command history:', error);\n        }\n    }\n    \n    saveCommandHistory() {\n        try {\n            localStorage.setItem('terminal_command_history', \n                JSON.stringify(this.commandHistory.slice(-this.maxHistorySize)));\n        } catch (error) {\n            console.warn('Could not save command history:', error);\n        }\n    }\n    \n    initializeTerminalFeatures() {\n        // Auto-completion setup\n        this.setupAutoCompletion();\n        \n        // Command suggestions\n        this.setupCommandSuggestions();\n        \n        // Keyboard shortcuts\n        this.setupKeyboardShortcuts();\n        \n        // Command validation\n        this.setupCommandValidation();\n    }\n    \n    setupAutoCompletion() {\n        // Tab completion for commands\n        const commandInput = document.getElementById('commandInput');\n        if (commandInput) {\n            commandInput.addEventListener('keydown', (e) => {\n                if (e.key === 'Tab') {\n                    e.preventDefault();\n                    this.handleAutoCompletion(commandInput);\n                }\n            });\n        }\n    }\n    \n    handleAutoCompletion(input) {\n        const text = input.value;\n        const [commandPart] = text.split(' ');\n        \n        // Find matching commands\n        const matches = [];\n        \n        // Check direct commands\n        for (const [cmd] of this.commands) {\n            if (cmd.startsWith(commandPart.toLowerCase())) {\n                matches.push(cmd);\n            }\n        }\n        \n        // Check aliases\n        for (const [alias] of this.aliases) {\n            if (alias.startsWith(commandPart.toLowerCase())) {\n                matches.push(alias);\n            }\n        }\n        \n        if (matches.length === 1) {\n            // Single match - complete it\n            const completed = text.replace(commandPart, matches[0]);\n            input.value = completed;\n        } else if (matches.length > 1) {\n            // Multiple matches - show suggestions\n            this.showCommandSuggestions(matches);\n        }\n    }\n    \n    setupCommandSuggestions() {\n        const commandInput = document.getElementById('commandInput');\n        if (commandInput) {\n            let suggestionTimeout;\n            \n            commandInput.addEventListener('input', (e) => {\n                clearTimeout(suggestionTimeout);\n                suggestionTimeout = setTimeout(() => {\n                    this.showLiveCommandSuggestions(e.target.value);\n                }, 300);\n            });\n        }\n    }\n    \n    showLiveCommandSuggestions(input) {\n        if (input.length < 2) return;\n        \n        const [commandPart] = input.split(' ');\n        const matches = this.findCommandMatches(commandPart);\n        \n        if (matches.length > 0 && matches.length <= 5) {\n            this.displaySuggestions(matches);\n        }\n    }\n    \n    findCommandMatches(partial) {\n        const matches = [];\n        \n        // Exact command matches\n        for (const [cmd, info] of this.commands) {\n            if (cmd.includes(partial.toLowerCase())) {\n                matches.push({ type: 'command', name: cmd, description: info.description });\n            }\n        }\n        \n        // Alias matches\n        for (const [alias, cmd] of this.aliases) {\n            if (alias.includes(partial.toLowerCase())) {\n                matches.push({ type: 'alias', name: alias, description: `Alias for '${cmd}'` });\n            }\n        }\n        \n        return matches.slice(0, 5); // Limit suggestions\n    }\n    \n    displaySuggestions(suggestions) {\n        // Remove existing suggestions\n        const existing = document.querySelector('.command-suggestions');\n        if (existing) existing.remove();\n        \n        if (suggestions.length === 0) return;\n        \n        const suggestionBox = document.createElement('div');\n        suggestionBox.className = 'command-suggestions';\n        suggestionBox.style.cssText = `\n            position: absolute;\n            background: var(--bg-black);\n            border: 1px solid var(--terminal-green);\n            color: var(--terminal-green);\n            font-family: var(--font-mono);\n            font-size: 12px;\n            padding: 8px;\n            z-index: 1000;\n            max-width: 400px;\n            box-shadow: 0 4px 12px rgba(0, 255, 0, 0.3);\n        `;\n        \n        suggestions.forEach(suggestion => {\n            const item = document.createElement('div');\n            item.style.cssText = `\n                padding: 4px 8px;\n                border-left: 2px solid var(--terminal-cyan);\n                margin-bottom: 4px;\n                cursor: pointer;\n            `;\n            item.innerHTML = `\n                <strong>${suggestion.name}</strong> \n                <span style=\"color: var(--terminal-amber)\">[${suggestion.type}]</span><br>\n                <span style=\"color: #aaa; font-size: 10px\">${suggestion.description}</span>\n            `;\n            \n            item.addEventListener('click', () => {\n                const commandInput = document.getElementById('commandInput');\n                if (commandInput) {\n                    commandInput.value = suggestion.name + ' ';\n                    commandInput.focus();\n                }\n                suggestionBox.remove();\n            });\n            \n            suggestionBox.appendChild(item);\n        });\n        \n        // Position suggestions\n        const commandBar = document.querySelector('.command-bar');\n        if (commandBar) {\n            commandBar.style.position = 'relative';\n            commandBar.appendChild(suggestionBox);\n            \n            // Auto-remove after delay\n            setTimeout(() => {\n                if (suggestionBox.parentNode) {\n                    suggestionBox.remove();\n                }\n            }, 5000);\n        }\n    }\n    \n    setupKeyboardShortcuts() {\n        document.addEventListener('keydown', (e) => {\n            const commandInput = document.getElementById('commandInput');\n            if (!commandInput) return;\n            \n            // History navigation\n            if (document.activeElement === commandInput) {\n                if (e.key === 'ArrowUp') {\n                    e.preventDefault();\n                    this.navigateHistory('up');\n                } else if (e.key === 'ArrowDown') {\n                    e.preventDefault();\n                    this.navigateHistory('down');\n                }\n            }\n            \n            // Global shortcuts (when not typing)\n            if (document.activeElement !== commandInput) {\n                switch (e.key) {\n                    case 'Enter':\n                    case '/':\n                        e.preventDefault();\n                        commandInput.focus();\n                        break;\n                    case 'r':\n                        if (e.ctrlKey) {\n                            e.preventDefault();\n                            this.executeCommand('refresh');\n                        }\n                        break;\n                    case 'h':\n                        if (e.ctrlKey) {\n                            e.preventDefault();\n                            this.executeCommand('help');\n                        }\n                        break;\n                }\n            }\n        });\n    }\n    \n    navigateHistory(direction) {\n        if (this.commandHistory.length === 0) return;\n        \n        if (direction === 'up') {\n            this.historyIndex = Math.min(this.historyIndex + 1, this.commandHistory.length - 1);\n        } else {\n            this.historyIndex = Math.max(this.historyIndex - 1, -1);\n        }\n        \n        const commandInput = document.getElementById('commandInput');\n        if (commandInput) {\n            if (this.historyIndex >= 0) {\n                commandInput.value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];\n            } else {\n                commandInput.value = '';\n            }\n        }\n    }\n    \n    setupCommandValidation() {\n        // Real-time command validation\n        const commandInput = document.getElementById('commandInput');\n        if (commandInput) {\n            commandInput.addEventListener('input', (e) => {\n                this.validateCommand(e.target.value);\n            });\n        }\n    }\n    \n    validateCommand(input) {\n        const [command] = input.trim().split(' ');\n        if (!command) return;\n        \n        const commandInput = document.getElementById('commandInput');\n        if (!commandInput) return;\n        \n        // Check if command exists\n        const exists = this.commands.has(command.toLowerCase()) || \n                      this.aliases.has(command.toLowerCase());\n        \n        // Visual feedback\n        if (exists) {\n            commandInput.style.borderColor = 'var(--terminal-green)';\n        } else if (command.length > 2) {\n            commandInput.style.borderColor = 'var(--terminal-red)';\n        } else {\n            commandInput.style.borderColor = 'var(--terminal-green)';\n        }\n    }\n    \n    addToHistory(command) {\n        if (!command.trim()) return;\n        \n        // Avoid duplicate consecutive commands\n        if (this.commandHistory[this.commandHistory.length - 1] !== command) {\n            this.commandHistory.push(command);\n            \n            // Maintain history size limit\n            if (this.commandHistory.length > this.maxHistorySize) {\n                this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);\n            }\n            \n            this.saveCommandHistory();\n        }\n        \n        this.historyIndex = -1; // Reset history navigation\n    }\n    \n    async executeCommand(commandStr) {\n        const fullCommand = commandStr.trim();\n        if (!fullCommand) return;\n        \n        // Add to history\n        this.addToHistory(fullCommand);\n        \n        // Parse command and arguments\n        const parts = this.parseCommand(fullCommand);\n        const { command, args, flags } = parts;\n        \n        // Resolve aliases\n        const resolvedCommand = this.aliases.get(command.toLowerCase()) || command.toLowerCase();\n        \n        // Find command handler\n        const commandInfo = this.commands.get(resolvedCommand);\n        \n        if (!commandInfo) {\n            return this.createErrorResponse(`Unknown command: ${command}`, {\n                suggestion: this.suggestSimilarCommand(command),\n                availableCommands: Array.from(this.commands.keys()).slice(0, 5)\n            });\n        }\n        \n        try {\n            // Execute command with enhanced context\n            const context = {\n                command: resolvedCommand,\n                originalCommand: command,\n                args,\n                flags,\n                fullCommand,\n                timestamp: new Date().toISOString()\n            };\n            \n            return await commandInfo.execute(context);\n            \n        } catch (error) {\n            console.error(`Command execution error [${command}]:`, error);\n            return this.createErrorResponse(`Command failed: ${error.message}`, {\n                command,\n                error: error.toString()\n            });\n        }\n    }\n    \n    parseCommand(commandStr) {\n        const parts = commandStr.split(' ');\n        const command = parts[0];\n        const args = [];\n        const flags = new Set();\n        \n        for (let i = 1; i < parts.length; i++) {\n            const part = parts[i];\n            if (part.startsWith('--')) {\n                flags.add(part.slice(2));\n            } else if (part.startsWith('-')) {\n                flags.add(part.slice(1));\n            } else {\n                args.push(part);\n            }\n        }\n        \n        return { command, args, flags };\n    }\n    \n    suggestSimilarCommand(input) {\n        const commands = Array.from(this.commands.keys());\n        const aliases = Array.from(this.aliases.keys());\n        const allCommands = [...commands, ...aliases];\n        \n        // Simple similarity check\n        for (const cmd of allCommands) {\n            if (this.calculateSimilarity(input.toLowerCase(), cmd) > 0.6) {\n                return cmd;\n            }\n        }\n        \n        return null;\n    }\n    \n    calculateSimilarity(a, b) {\n        const longer = a.length > b.length ? a : b;\n        const shorter = a.length > b.length ? b : a;\n        \n        if (longer.length === 0) return 1.0;\n        \n        const distance = this.levenshteinDistance(longer, shorter);\n        return (longer.length - distance) / longer.length;\n    }\n    \n    levenshteinDistance(a, b) {\n        const matrix = [];\n        \n        for (let i = 0; i <= b.length; i++) {\n            matrix[i] = [i];\n        }\n        \n        for (let j = 0; j <= a.length; j++) {\n            matrix[0][j] = j;\n        }\n        \n        for (let i = 1; i <= b.length; i++) {\n            for (let j = 1; j <= a.length; j++) {\n                if (b.charAt(i - 1) === a.charAt(j - 1)) {\n                    matrix[i][j] = matrix[i - 1][j - 1];\n                } else {\n                    matrix[i][j] = Math.min(\n                        matrix[i - 1][j - 1] + 1,\n                        matrix[i][j - 1] + 1,\n                        matrix[i - 1][j] + 1\n                    );\n                }\n            }\n        }\n        \n        return matrix[b.length][a.length];\n    }\n    \n    createSuccessResponse(message, data = {}) {\n        return {\n            status: 'success',\n            message,\n            timestamp: this.getCurrentTimestamp(),\n            ...data\n        };\n    }\n    \n    createErrorResponse(message, data = {}) {\n        return {\n            status: 'error',\n            message,\n            timestamp: this.getCurrentTimestamp(),\n            ...data\n        };\n    }\n    \n    getCurrentTimestamp() {\n        return new Date().toLocaleString('vi-VN', {\n            timeZone: 'Asia/Ho_Chi_Minh',\n            hour12: false\n        });\n    }\n    \n    // Command implementations will continue in next part due to length...\n    // This includes all the execute* methods for each command\n}\n\n// Initialize enhanced terminal commands\nconst enhancedTerminal = new EnhancedTerminalCommands();\n\n// Export for global access\nwindow.enhancedTerminal = enhancedTerminal;\n\nconsole.log('🚀 Enhanced Terminal Commands System loaded successfully!');"
        }]
    }],
    
    // More categories will continue...
]);

// Initialize enhanced terminal commands
const enhancedTerminal = new EnhancedTerminalCommands();

// Export for global access  
window.enhancedTerminal = enhancedTerminal;

console.log('🚀 Enhanced Terminal Commands System loaded successfully!');
