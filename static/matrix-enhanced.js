/**
 * Enhanced Matrix Effects v2.024
 * Memory-optimized digital rain with performance monitoring
 * Advanced terminal aesthetics with GPU acceleration
 */

'use strict';

class EnhancedMatrixEffect {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.isActive = false;
        
        // Performance settings
        this.settings = {
            fontSize: 14,
            columns: 0,
            drops: [],
            speed: 33, // ms between frames (~30 FPS)
            density: 0.95, // Probability of new drops
            fadeSpeed: 0.05,
            glitchProbability: 0.02,
            colorShift: false,
            3dEffect: false,
            particles: false,
            enableGPU: true
        };
        
        // Character sets for different effects
        this.charSets = {
            matrix: 'アカサタナハマヤラワガザダバパイキシチニヒミリヰギジヂビピウクスツヌフムユルグズヅブプエケセテネヘメレエゲゼデベペオコソトノホモヨロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            binary: '01',
            terminal: '0123456789ABCDEF!@#$%^&*()_+-=[]{}|;:,.<>?',
            crypto: '₿ΞETHBTCLTCXRPADABNBDOTLINKMATICAVAXATOMALGOSOLUSDC',
            vietnamese: 'AĂÂBCDĐEÊFGHIJKLMNOÔƠPQRSTUƯVWXYZ0123456789',
            symbols: '█▓▒░│┤┐└┴┬├─┼╬═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬',
            tech: '{}[]()<>+-*/=!@#$%^&*_|\\:;",.<>?~`'
        };
        
        // Current character set
        this.currentCharSet = this.charSets.matrix;
        
        // Performance tracking
        this.performance = {
            frameCount: 0,
            startTime: 0,
            fps: 0,
            memoryUsage: 0,
            droppedFrames: 0,
            lastFrameTime: 0
        };
        
        // WebGL support detection
        this.webGLSupported = this.detectWebGLSupport();
        
        // Effect variations
        this.effects = {
            classic: this.classicMatrix.bind(this),
            glitch: this.glitchMatrix.bind(this),
            pulse: this.pulseMatrix.bind(this),
            wave: this.waveMatrix.bind(this),
            spiral: this.spiralMatrix.bind(this),
            neon: this.neonMatrix.bind(this),
            digital: this.digitalMatrix.bind(this),
            cyber: this.cyberMatrix.bind(this)
        };
        
        this.currentEffect = 'classic';
        
        console.log('🌊 Enhanced Matrix Effects initialized');
    }
    
    detectWebGLSupported() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }
    
    start(options = {}) {
        // Merge options with defaults
        this.settings = { ...this.settings, ...options };
        
        // Check for reduced motion preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            console.log('🌊 Matrix effects disabled - reduced motion preference');
            return;
        }
        
        if (this.isActive) {
            this.stop();
        }
        
        this.createCanvas();
        this.setupMatrix();
        this.isActive = true;
        this.performance.startTime = performance.now();
        this.animate();
        
        // Add to page
        document.body.appendChild(this.canvas);
        
        // Setup resize handler
        this.resizeHandler = this.handleResize.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        
        console.log(`🌊 Matrix effect started: ${this.currentEffect} mode`);
    }
    
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        // Log performance stats
        const duration = (performance.now() - this.performance.startTime) / 1000;
        console.log(`🌊 Matrix effect stopped - Duration: ${duration.toFixed(1)}s, Average FPS: ${this.performance.fps.toFixed(1)}`);
    }
    
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'matrix-enhanced';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 999;
            mix-blend-mode: screen;
            opacity: 0.8;
        `;
        
        // Set canvas size
        this.updateCanvasSize();
        
        // Get context with performance optimizations
        this.ctx = this.canvas.getContext('2d', {
            alpha: true,
            desynchronized: true,
            powerPreference: 'high-performance'
        });
        
        // Enable GPU acceleration hints
        if (this.settings.enableGPU) {
            this.canvas.style.willChange = 'transform';
            this.canvas.style.transform = 'translateZ(0)';
        }
    }
    
    updateCanvasSize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = document.documentElement.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        if (this.ctx) {
            this.ctx.scale(dpr, dpr);
        }
    }
    
    handleResize() {
        this.updateCanvasSize();
        this.setupMatrix();
    }
    
    setupMatrix() {
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        this.settings.columns = Math.floor(canvasWidth / this.settings.fontSize);
        
        // Initialize drops array
        this.settings.drops = [];
        for (let i = 0; i < this.settings.columns; i++) {
            this.settings.drops[i] = Math.random() * -100; // Start with random delays
        }
    }
    
    animate() {
        if (!this.isActive) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.performance.lastFrameTime;
        
        // Frame rate limiting
        if (deltaTime < this.settings.speed) {
            this.animationId = requestAnimationFrame(this.animate.bind(this));
            return;
        }
        
        // Performance monitoring
        this.updatePerformanceMetrics(currentTime, deltaTime);
        
        // Check memory pressure and adjust quality
        this.adjustQualityForPerformance();
        
        // Render current effect
        this.effects[this.currentEffect]();
        
        this.performance.lastFrameTime = currentTime;
        this.animationId = requestAnimationFrame(this.animate.bind(this));
    }
    
    updatePerformanceMetrics(currentTime, deltaTime) {
        this.performance.frameCount++;
        
        // Calculate FPS
        if (this.performance.frameCount % 30 === 0) {
            const elapsed = (currentTime - this.performance.startTime) / 1000;
            this.performance.fps = this.performance.frameCount / elapsed;
            
            // Check for dropped frames
            if (deltaTime > this.settings.speed * 2) {
                this.performance.droppedFrames++;
            }
        }
        
        // Memory usage estimation
        if (this.performance.frameCount % 60 === 0) {
            if (performance.memory) {
                this.performance.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
            }
        }
    }
    
    adjustQualityForPerformance() {
        // Dynamic quality adjustment based on performance
        if (this.performance.fps < 20 && this.performance.frameCount > 60) {
            // Reduce quality
            this.settings.speed = Math.min(this.settings.speed + 5, 50);
            this.settings.density = Math.max(this.settings.density - 0.1, 0.7);
            
            // Disable expensive effects
            this.settings.glitchProbability = Math.max(this.settings.glitchProbability - 0.01, 0);
            this.settings.colorShift = false;
            this.settings.particles = false;
        } else if (this.performance.fps > 50 && this.performance.frameCount > 120) {
            // Increase quality
            this.settings.speed = Math.max(this.settings.speed - 1, 16);
            this.settings.density = Math.min(this.settings.density + 0.02, 0.98);
        }
    }
    
    // ===== EFFECT IMPLEMENTATIONS =====
    
    classicMatrix() {
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Semi-transparent black background for trail effect
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.fadeSpeed})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Matrix green text
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = `${this.settings.fontSize}px 'JetBrains Mono', monospace`;
        this.ctx.textBaseline = 'top';
        
        for (let i = 0; i < this.settings.drops.length; i++) {
            // Random character from set
            const char = this.currentCharSet[Math.floor(Math.random() * this.currentCharSet.length)];
            
            // Draw character
            this.ctx.fillText(char, i * this.settings.fontSize, this.settings.drops[i] * this.settings.fontSize);
            
            // Move drop down
            if (this.settings.drops[i] * this.settings.fontSize > canvasHeight && Math.random() > this.settings.density) {
                this.settings.drops[i] = 0;
            }
            this.settings.drops[i]++;
        }
    }
    
    glitchMatrix() {
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Glitch effect background
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.fadeSpeed * 0.8})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = `${this.settings.fontSize}px 'JetBrains Mono', monospace`;
        this.ctx.textBaseline = 'top';
        
        for (let i = 0; i < this.settings.drops.length; i++) {
            // Glitch color variations
            if (Math.random() < this.settings.glitchProbability) {
                const colors = ['#ff0000', '#00ffff', '#ff00ff', '#ffff00'];
                this.ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            } else {
                this.ctx.fillStyle = '#00ff00';
            }
            
            const char = this.currentCharSet[Math.floor(Math.random() * this.currentCharSet.length)];
            
            // Glitch offset
            const glitchX = Math.random() < this.settings.glitchProbability ? 
                (Math.random() - 0.5) * 10 : 0;
            
            this.ctx.fillText(char, 
                i * this.settings.fontSize + glitchX, 
                this.settings.drops[i] * this.settings.fontSize);
            
            if (this.settings.drops[i] * this.settings.fontSize > canvasHeight && Math.random() > this.settings.density) {
                this.settings.drops[i] = 0;
            }
            this.settings.drops[i]++;
        }
    }
    
    pulseMatrix() {
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        const time = performance.now() * 0.001;
        
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.fadeSpeed})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = `${this.settings.fontSize}px 'JetBrains Mono', monospace`;
        this.ctx.textBaseline = 'top';
        
        for (let i = 0; i < this.settings.drops.length; i++) {
            // Pulsing opacity
            const pulse = (Math.sin(time * 3 + i * 0.1) + 1) * 0.5;
            const alpha = 0.5 + pulse * 0.5;
            
            this.ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
            
            const char = this.currentCharSet[Math.floor(Math.random() * this.currentCharSet.length)];
            this.ctx.fillText(char, i * this.settings.fontSize, this.settings.drops[i] * this.settings.fontSize);
            
            if (this.settings.drops[i] * this.settings.fontSize > canvasHeight && Math.random() > this.settings.density) {
                this.settings.drops[i] = 0;
            }
            this.settings.drops[i]++;
        }
    }
    
    waveMatrix() {
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        const time = performance.now() * 0.002;
        
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.fadeSpeed})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = `${this.settings.fontSize}px 'JetBrains Mono', monospace`;
        this.ctx.textBaseline = 'top';
        
        for (let i = 0; i < this.settings.drops.length; i++) {
            // Wave displacement
            const wave = Math.sin(time + i * 0.1) * 20;
            
            this.ctx.fillStyle = '#00ff00';
            
            const char = this.currentCharSet[Math.floor(Math.random() * this.currentCharSet.length)];
            this.ctx.fillText(char, 
                i * this.settings.fontSize + wave, 
                this.settings.drops[i] * this.settings.fontSize);
            
            if (this.settings.drops[i] * this.settings.fontSize > canvasHeight && Math.random() > this.settings.density) {
                this.settings.drops[i] = 0;
            }
            this.settings.drops[i]++;
        }
    }
    
    spiralMatrix() {
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        const time = performance.now() * 0.001;
        
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.fadeSpeed})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = `${this.settings.fontSize}px 'JetBrains Mono', monospace`;
        this.ctx.textBaseline = 'top';
        
        for (let i = 0; i < this.settings.drops.length; i++) {
            // Spiral motion
            const angle = time + i * 0.05;
            const radius = i * 0.5;
            const spiralX = Math.cos(angle) * radius;
            
            this.ctx.fillStyle = '#00ff00';
            
            const char = this.currentCharSet[Math.floor(Math.random() * this.currentCharSet.length)];
            this.ctx.fillText(char, 
                i * this.settings.fontSize + spiralX, 
                this.settings.drops[i] * this.settings.fontSize);
            
            if (this.settings.drops[i] * this.settings.fontSize > canvasHeight && Math.random() > this.settings.density) {
                this.settings.drops[i] = 0;
            }
            this.settings.drops[i]++;
        }
    }
    
    neonMatrix() {
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.fadeSpeed})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = `${this.settings.fontSize}px 'JetBrains Mono', monospace`;
        this.ctx.textBaseline = 'top';
        
        for (let i = 0; i < this.settings.drops.length; i++) {
            // Neon glow effect
            this.ctx.shadowColor = '#00ff00';
            this.ctx.shadowBlur = 10;
            this.ctx.fillStyle = '#00ff00';
            
            const char = this.currentCharSet[Math.floor(Math.random() * this.currentCharSet.length)];
            this.ctx.fillText(char, i * this.settings.fontSize, this.settings.drops[i] * this.settings.fontSize);
            
            // Reset shadow for performance
            this.ctx.shadowBlur = 0;
            
            if (this.settings.drops[i] * this.settings.fontSize > canvasHeight && Math.random() > this.settings.density) {
                this.settings.drops[i] = 0;
            }
            this.settings.drops[i]++;
        }
    }
    
    digitalMatrix() {
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.fadeSpeed})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = `${this.settings.fontSize}px 'JetBrains Mono', monospace`;
        this.ctx.textBaseline = 'top';
        
        // Use binary character set
        const binarySet = this.charSets.binary;
        
        for (let i = 0; i < this.settings.drops.length; i++) {
            // Digital color scheme
            const colors = ['#00ff00', '#00cc00', '#009900'];
            this.ctx.fillStyle = colors[Math.floor(this.settings.drops[i]) % colors.length];
            
            const char = binarySet[Math.floor(Math.random() * binarySet.length)];
            this.ctx.fillText(char, i * this.settings.fontSize, this.settings.drops[i] * this.settings.fontSize);
            
            if (this.settings.drops[i] * this.settings.fontSize > canvasHeight && Math.random() > this.settings.density) {
                this.settings.drops[i] = 0;
            }
            this.settings.drops[i]++;
        }
    }
    
    cyberMatrix() {
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        const time = performance.now() * 0.001;
        
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.fadeSpeed})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = `${this.settings.fontSize}px 'JetBrains Mono', monospace`;
        this.ctx.textBaseline = 'top';
        
        // Use crypto character set
        const cryptoSet = this.charSets.crypto;
        
        for (let i = 0; i < this.settings.drops.length; i++) {
            // Cyber color palette
            const hue = (time * 50 + i * 10) % 360;
            this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            
            const char = cryptoSet[Math.floor(Math.random() * cryptoSet.length)];
            this.ctx.fillText(char, i * this.settings.fontSize, this.settings.drops[i] * this.settings.fontSize);
            
            if (this.settings.drops[i] * this.settings.fontSize > canvasHeight && Math.random() > this.settings.density) {
                this.settings.drops[i] = 0;
            }
            this.settings.drops[i]++;
        }
    }
    
    // ===== PUBLIC API =====
    
    setEffect(effectName) {
        if (this.effects[effectName]) {
            this.currentEffect = effectName;
            console.log(`🌊 Matrix effect changed to: ${effectName}`);
        }
    }
    
    setCharacterSet(setName) {
        if (this.charSets[setName]) {
            this.currentCharSet = this.charSets[setName];
            console.log(`🌊 Character set changed to: ${setName}`);
        }
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('🌊 Matrix settings updated');
    }
    
    getPerformanceStats() {
        return {
            ...this.performance,
            isActive: this.isActive,
            effect: this.currentEffect,
            columns: this.settings.columns,
            webGLSupported: this.webGLSupported
        };
    }
    
    getAvailableEffects() {
        return Object.keys(this.effects);
    }
    
    getAvailableCharSets() {
        return Object.keys(this.charSets);
    }
}

// Global matrix effect instance
let matrixEffect = null;

// Enhanced Matrix Manager
class MatrixManager {
    constructor() {
        this.effect = null;
        this.presets = {
            classic: { effect: 'classic', charSet: 'matrix', speed: 33 },
            cyber: { effect: 'cyber', charSet: 'crypto', speed: 25 },
            terminal: { effect: 'digital', charSet: 'binary', speed: 40 },
            glitch: { effect: 'glitch', charSet: 'symbols', speed: 20 },
            neon: { effect: 'neon', charSet: 'tech', speed: 30 }
        };
    }
    
    start(preset = 'classic', duration = 5000) {
        this.stop(); // Stop any existing effect
        
        this.effect = new EnhancedMatrixEffect();
        
        const config = this.presets[preset] || this.presets.classic;
        
        this.effect.setEffect(config.effect);
        this.effect.setCharacterSet(config.charSet);
        this.effect.updateSettings({ speed: config.speed });
        
        this.effect.start();
        
        // Auto-stop after duration
        if (duration > 0) {
            setTimeout(() => {
                this.stop();
            }, duration);
        }
        
        return this.effect;
    }
    
    stop() {
        if (this.effect) {
            this.effect.stop();
            this.effect = null;
        }
    }
    
    isActive() {
        return this.effect && this.effect.isActive;
    }
    
    getStats() {
        return this.effect ? this.effect.getPerformanceStats() : null;
    }
}

// Create global manager
const matrixManager = new MatrixManager();

// Integration with existing terminal system
if (window.retroNewsPortal && window.retroNewsPortal.effectsManager) {
    // Override the original matrix method
    window.retroNewsPortal.effectsManager.activateMatrixMode = function(duration = 5000) {
        matrixManager.start('classic', duration);
    };
    
    // Add new matrix effects
    window.retroNewsPortal.effectsManager.activateMatrixEffect = function(preset = 'classic', duration = 5000) {
        matrixManager.start(preset, duration);
    };
}

// Terminal command integration
if (window.enhancedTerminal) {
    window.enhancedTerminal.commands.set('matrix', {
        description: 'Advanced Matrix digital rain effects',
        usage: 'matrix [preset] [duration]',
        examples: ['matrix', 'matrix cyber 10', 'matrix glitch'],
        category: 'interface',
        execute: async (context) => {
            const { args } = context;
            const preset = args[0] || 'classic';
            const duration = parseInt(args[1]) * 1000 || 5000;
            
            if (preset === 'stop') {
                matrixManager.stop();
                return { status: 'success', message: 'Matrix effect stopped' };
            }
            
            if (preset === 'stats') {
                const stats = matrixManager.getStats();
                if (!stats) {
                    return { status: 'error', message: 'No active matrix effect' };
                }
                
                return {
                    status: 'success',
                    message: `MATRIX STATS:\n├─ Effect: ${stats.effect}\n├─ FPS: ${stats.fps.toFixed(1)}\n├─ Columns: ${stats.columns}\n├─ Memory: ${stats.memoryUsage.toFixed(1)}MB\n├─ Dropped Frames: ${stats.droppedFrames}\n└─ WebGL: ${stats.webGLSupported ? 'YES' : 'NO'}`
                };
            }
            
            const effect = matrixManager.start(preset, duration);
            
            return {
                status: 'success',
                message: `Matrix effect activated: ${preset.toUpperCase()} (${duration/1000}s)`,
                action: 'activate_matrix',
                preset,
                duration
            };
        }
    });
}

// Export for global access
window.EnhancedMatrixEffect = EnhancedMatrixEffect;
window.matrixManager = matrixManager;

console.log('🌊 Enhanced Matrix Effects loaded - Available presets:', Object.keys(matrixManager.presets));
