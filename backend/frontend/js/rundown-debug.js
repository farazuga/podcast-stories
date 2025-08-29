/**
 * VidPOD Rundown Editor Debugging Infrastructure
 * Comprehensive logging and error handling system
 */

class RundownDebugger {
    constructor() {
        this.isProduction = window.location.hostname.includes('railway.app') || window.location.hostname.includes('vidpod.com');
        this.logLevel = this.isProduction ? 'ERROR' : 'DEBUG';
        this.logs = [];
        this.maxLogs = 1000;
        this.performanceMarks = new Map();
        
        this.init();
    }
    
    init() {
        // Setup global error handling
        this.setupGlobalErrorHandling();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Add debug panel in development
        if (!this.isProduction) {
            this.createDebugPanel();
        }
        
        this.log('🔧', 'RundownDebugger initialized', {
            isProduction: this.isProduction,
            logLevel: this.logLevel,
            url: window.location.href
        });
    }
    
    setupGlobalErrorHandling() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.error('💥 Uncaught Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error?.stack
            });
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.error('🚫 Unhandled Promise Rejection', {
                reason: event.reason,
                promise: event.promise
            });
        });
        
        // Override console methods to capture logs
        this.interceptConsole();
    }
    
    setupPerformanceMonitoring() {
        // Monitor API requests
        this.monitorFetch();
        
        // Monitor DOM mutations for performance
        if (typeof MutationObserver !== 'undefined') {
            this.monitorDOMMutations();
        }
    }
    
    interceptConsole() {
        const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            debug: console.debug
        };
        
        console.log = (...args) => {
            this.captureLog('LOG', args);
            originalConsole.log(...args);
        };
        
        console.warn = (...args) => {
            this.captureLog('WARN', args);
            originalConsole.warn(...args);
        };
        
        console.error = (...args) => {
            this.captureLog('ERROR', args);
            originalConsole.error(...args);
        };
        
        console.debug = (...args) => {
            this.captureLog('DEBUG', args);
            originalConsole.debug(...args);
        };
    }
    
    monitorFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = args[0];
            const options = args[1] || {};
            
            this.log('📡', 'API Request Starting', {
                url,
                method: options.method || 'GET',
                timestamp: new Date().toISOString()
            });
            
            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                
                this.log('✅', 'API Request Complete', {
                    url,
                    method: options.method || 'GET',
                    status: response.status,
                    duration: `${(endTime - startTime).toFixed(2)}ms`,
                    ok: response.ok
                });
                
                // Log errors for failed requests
                if (!response.ok) {
                    this.warn('⚠️', 'API Request Failed', {
                        url,
                        status: response.status,
                        statusText: response.statusText
                    });
                }
                
                return response;
            } catch (error) {
                const endTime = performance.now();
                
                this.error('❌', 'API Request Error', {
                    url,
                    method: options.method || 'GET',
                    duration: `${(endTime - startTime).toFixed(2)}ms`,
                    error: error.message,
                    stack: error.stack
                });
                
                throw error;
            }
        };
    }
    
    monitorDOMMutations() {
        let mutationCount = 0;
        const observer = new MutationObserver((mutations) => {
            mutationCount += mutations.length;
            
            // Log excessive DOM mutations (performance concern)
            if (mutationCount > 100) {
                this.warn('🔄', 'High DOM Mutation Rate', {
                    count: mutationCount,
                    timestamp: new Date().toISOString()
                });
                mutationCount = 0;
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }
    
    captureLog(level, args) {
        const logEntry = {
            level,
            timestamp: new Date().toISOString(),
            args: args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.parse(JSON.stringify(arg));
                    } catch {
                        return '[Circular Object]';
                    }
                }
                return arg;
            })
        };
        
        this.logs.push(logEntry);
        
        // Trim logs to prevent memory issues
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs / 2);
        }
    }
    
    // Public logging methods
    log(icon, message, data = {}) {
        if (this.shouldLog('DEBUG')) {
            console.log(`${icon} [RUNDOWN] ${message}`, data);
        }
    }
    
    warn(icon, message, data = {}) {
        if (this.shouldLog('WARN')) {
            console.warn(`${icon} [RUNDOWN] ${message}`, data);
        }
    }
    
    error(icon, message, data = {}) {
        if (this.shouldLog('ERROR')) {
            console.error(`${icon} [RUNDOWN] ${message}`, data);
        }
    }
    
    // Performance monitoring
    startPerformanceMark(name) {
        const startTime = performance.now();
        this.performanceMarks.set(name, startTime);
        
        if (!this.isProduction) {
            performance.mark(`rundown-${name}-start`);
        }
        
        this.log('⏱️', `Performance mark started: ${name}`);
    }
    
    endPerformanceMark(name) {
        const startTime = this.performanceMarks.get(name);
        if (!startTime) {
            this.warn('⚠️', `Performance mark not found: ${name}`);
            return;
        }
        
        const duration = performance.now() - startTime;
        this.performanceMarks.delete(name);
        
        if (!this.isProduction) {
            performance.mark(`rundown-${name}-end`);
            performance.measure(`rundown-${name}`, `rundown-${name}-start`, `rundown-${name}-end`);
        }
        
        this.log('⏱️', `Performance mark ended: ${name}`, {
            duration: `${duration.toFixed(2)}ms`,
            warning: duration > 100 ? 'Slow operation detected' : null
        });
        
        return duration;
    }
    
    // Debug panel for development
    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'rundown-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 500px;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            border-radius: 8px;
            z-index: 10000;
            overflow: hidden;
            display: none;
        `;
        
        panel.innerHTML = `
            <div style="padding: 10px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                <strong>🔧 Rundown Debug</strong>
                <button id="clear-debug-logs" style="background: #ff4444; color: white; border: none; padding: 2px 8px; border-radius: 4px; font-size: 10px;">Clear</button>
            </div>
            <div id="debug-logs" style="height: 400px; overflow-y: auto; padding: 10px;"></div>
        `;
        
        document.body.appendChild(panel);
        
        // Add toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-debug-panel';
        toggleBtn.textContent = '🔧';
        toggleBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff00;
            border: none;
            padding: 10px;
            border-radius: 50%;
            z-index: 10001;
            cursor: pointer;
            font-size: 16px;
        `;
        
        toggleBtn.addEventListener('click', () => {
            const isVisible = panel.style.display === 'block';
            panel.style.display = isVisible ? 'none' : 'block';
            toggleBtn.style.right = isVisible ? '10px' : '420px';
        });
        
        document.body.appendChild(toggleBtn);
        
        // Clear logs button
        document.getElementById('clear-debug-logs').addEventListener('click', () => {
            this.logs = [];
            document.getElementById('debug-logs').innerHTML = '<div style="color: #666;">Logs cleared</div>';
        });
        
        // Update debug panel periodically
        setInterval(() => {
            this.updateDebugPanel();
        }, 1000);
    }
    
    updateDebugPanel() {
        const debugLogs = document.getElementById('debug-logs');
        if (!debugLogs) return;
        
        const recentLogs = this.logs.slice(-50);
        debugLogs.innerHTML = recentLogs.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const argsStr = log.args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            
            const color = {
                'ERROR': '#ff4444',
                'WARN': '#ffaa00',
                'LOG': '#00ff00',
                'DEBUG': '#00aaff'
            }[log.level] || '#ffffff';
            
            return `<div style="color: ${color}; margin-bottom: 5px; padding: 2px 0; border-bottom: 1px solid #333;">
                <span style="color: #666;">${time}</span> 
                <span style="color: ${color}; font-weight: bold;">[${log.level}]</span> 
                <span style="color: #ffffff;">${argsStr}</span>
            </div>`;
        }).join('');
        
        debugLogs.scrollTop = debugLogs.scrollHeight;
    }
    
    shouldLog(level) {
        const levels = { DEBUG: 0, LOG: 1, WARN: 2, ERROR: 3 };
        return levels[level] >= levels[this.logLevel];
    }
    
    // Export logs for debugging
    exportLogs() {
        const exportData = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            logs: this.logs,
            performance: this.getPerformanceData()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `rundown-debug-${new Date().toISOString().slice(0, 19)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        this.log('💾', 'Debug logs exported');
    }
    
    getPerformanceData() {
        try {
            const entries = performance.getEntriesByType('measure').filter(entry => 
                entry.name.startsWith('rundown-')
            );
            
            return entries.map(entry => ({
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime
            }));
        } catch {
            return [];
        }
    }
    
    // Test methods for validation
    runDiagnostics() {
        this.log('🔍', 'Running diagnostics...');
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            environment: this.isProduction ? 'production' : 'development',
            url: window.location.href,
            userAgent: navigator.userAgent,
            localStorage: {
                token: !!localStorage.getItem('token'),
                user: !!localStorage.getItem('user')
            },
            apiEndpoints: this.testAPIEndpoints(),
            domElements: this.testDOMElements(),
            performance: this.getPerformanceData()
        };
        
        this.log('📋', 'Diagnostics complete', diagnostics);
        return diagnostics;
    }
    
    testAPIEndpoints() {
        const endpoints = RundownDatabaseMapping.getAPIEndpoints();
        const baseUrl = window.API_URL || window.AppConfig?.API_URL || '/api';
        
        return Object.entries(endpoints).map(([name, path]) => ({
            name,
            url: baseUrl + path.replace('/api', ''),
            reachable: 'pending' // Would need actual testing
        }));
    }
    
    testDOMElements() {
        const requiredElements = [
            'rundownEditorModal',
            'editorRundownTitle',
            'segmentsList',
            'talentList',
            'timingDisplay'
        ];
        
        return requiredElements.map(id => ({
            id,
            exists: !!document.getElementById(id),
            visible: document.getElementById(id)?.offsetParent !== null
        }));
    }
}

// Create global debugger instance
if (typeof window.rundownDebugger === 'undefined') {
    window.rundownDebugger = new RundownDebugger();
}

// Export for use in other modules
window.RundownDebugger = RundownDebugger;
