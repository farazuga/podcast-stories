/**
 * VidPOD Rundown Auto-Save System
 * Phase 3: Advanced auto-save functionality with debouncing, visual feedback,
 * conflict resolution, and network recovery
 */

class RundownAutoSave {
    constructor(rundownEditor) {
        this.editor = rundownEditor;
        this.rundownId = rundownEditor.rundownId;
        this.isEnabled = true;
        this.isDirty = false;
        this.isSaving = false;
        this.lastSaveTime = null;
        this.saveQueue = new Map();
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Debouncing configuration
        this.debounceDelay = 2500; // 2.5 seconds
        this.debounceTimer = null;
        
        // Save indicators
        this.saveIndicator = null;
        this.lastSaveIndicator = null;
        
        // Network state monitoring
        this.isOnline = navigator.onLine;
        this.pendingSaves = [];
        
        console.log('🚀 RundownAutoSave initialized for rundown:', this.rundownId);
        
        this.init();
    }
    
    init() {
        this.createSaveIndicators();
        this.setupNetworkMonitoring();
        this.setupEventListeners();
        this.startPeriodicSave();
        
        console.log('✅ Auto-save system initialized');
    }
    
    createSaveIndicators() {
        // Create save status indicator
        this.saveIndicator = document.createElement('div');
        this.saveIndicator.className = 'auto-save-indicator';
        this.saveIndicator.innerHTML = `
            <div class="save-status">
                <span class="save-icon">💾</span>
                <span class="save-text">Saved</span>
                <span class="save-spinner" style="display: none;">
                    <div class="spinner-small"></div>
                </span>
            </div>
        `;
        
        // Create last saved indicator
        this.lastSaveIndicator = document.createElement('div');
        this.lastSaveIndicator.className = 'last-save-indicator';
        this.lastSaveIndicator.innerHTML = `
            <span class="last-save-text">Last saved: Never</span>
        `;
        
        // Add to editor header
        const editorActions = document.querySelector('.editor-actions');
        if (editorActions) {
            editorActions.insertBefore(this.saveIndicator, editorActions.firstChild);
            editorActions.insertBefore(this.lastSaveIndicator, editorActions.firstChild);
        }
        
        console.log('💾 Save indicators created');
    }
    
    setupNetworkMonitoring() {
        // Monitor network connectivity
        window.addEventListener('online', () => {
            console.log('🌐 Network reconnected - processing pending saves');
            this.isOnline = true;
            this.processPendingSaves();
        });
        
        window.addEventListener('offline', () => {
            console.log('📡 Network disconnected - queuing saves');
            this.isOnline = false;
            this.showSaveState('offline');
        });
        
        // Browser visibility API for save on focus loss
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.isDirty) {
                console.log('👁️ Tab hidden - triggering immediate save');
                this.saveImmediately();
            }
        });
        
        // Save before page unload
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                console.log('🚪 Page unloading - attempting final save');
                this.saveImmediately();
                // Note: Modern browsers ignore custom messages
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }
    
    setupEventListeners() {
        // Listen for editor changes
        if (this.editor) {
            // Override the editor's isDirty setter to trigger auto-save
            const originalSetDirty = this.editor.setDirty?.bind(this.editor);
            this.editor.setDirty = (dirty) => {
                if (originalSetDirty) originalSetDirty(dirty);
                this.markDirty();
            };
        }
    }
    
    startPeriodicSave() {
        // Periodic save every 30 seconds as backup
        setInterval(() => {
            if (this.isDirty && !this.isSaving && this.isOnline) {
                console.log('⏰ Periodic auto-save triggered');
                this.saveImmediately();
            }
        }, 30000);
    }
    
    // ========================================
    // CORE AUTO-SAVE FUNCTIONALITY
    // ========================================
    
    markDirty() {
        if (!this.isEnabled) return;
        
        this.isDirty = true;
        this.showSaveState('unsaved');
        
        // Clear existing debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Start new debounced save
        this.debounceTimer = setTimeout(() => {
            this.saveWithRetry();
        }, this.debounceDelay);
        
        console.log('✏️ Changes detected - auto-save scheduled in', this.debounceDelay, 'ms');
    }
    
    async saveWithRetry() {
        if (!this.isDirty || this.isSaving || !this.isOnline) {
            return;
        }
        
        try {
            await this.performSave();
            this.retryCount = 0;
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
            this.handleSaveError(error);
        }
    }
    
    async saveImmediately() {
        if (!this.isDirty || this.isSaving) {
            return;
        }
        
        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        
        if (!this.isOnline) {
            this.queuePendingSave();
            return;
        }
        
        try {
            await this.performSave();
        } catch (error) {
            console.error('❌ Immediate save failed:', error);
            this.handleSaveError(error);
        }
    }
    
    async performSave() {
        if (this.isSaving) {
            console.log('⏳ Save already in progress, skipping...');
            return;
        }
        
        this.isSaving = true;
        this.showSaveState('saving');
        
        const saveStartTime = Date.now();
        console.log('💾 Starting auto-save...');
        
        try {
            // Collect all dirty data from the editor
            const saveData = this.collectSaveData();
            
            // Perform the actual save
            await this.saveToDB(saveData);
            
            // Update state
            this.isDirty = false;
            this.lastSaveTime = new Date();
            this.isSaving = false;
            
            // Update UI
            this.showSaveState('saved');
            this.updateLastSaveTime();
            
            const saveDuration = Date.now() - saveStartTime;
            console.log('✅ Auto-save completed in', saveDuration, 'ms');
            
            // Emit save success event
            this.emitSaveEvent('success', { duration: saveDuration });
            
        } catch (error) {
            this.isSaving = false;
            throw error;
        }
    }
    
    collectSaveData() {
        if (!this.editor.rundownData) {
            throw new Error('No rundown data to save');
        }
        
        // Collect all changes from the rundown editor
        const data = {
            rundown_id: this.rundownId,
            title: this.editor.rundownData.title,
            description: this.editor.rundownData.description,
            status: this.editor.rundownData.status,
            segments: this.editor.rundownData.segments?.map(segment => ({
                id: segment.id,
                title: segment.title,
                type: segment.type,
                duration: segment.duration,
                order_index: segment.order_index,
                content: segment.content,
                notes: segment.notes,
                is_pinned: segment.is_pinned
            })),
            talent: this.editor.rundownData.talent,
            stories: this.editor.rundownData.stories
        };
        
        // Validate essential data
        if (!data.title?.trim()) {
            throw new Error('Rundown title is required');
        }
        
        return data;
    }
    
    async saveToDB(data) {
        const updates = [];
        
        // Update rundown metadata
        updates.push(
            RundownUtils.apiRequest(`/rundowns/${this.rundownId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: data.title,
                    description: data.description,
                    status: data.status
                })
            })
        );
        
        // Update segments if changed
        if (data.segments) {
            for (const segment of data.segments) {
                if (!segment.is_pinned || segment.id.toString().startsWith('s')) {
                    // Only update non-pinned segments or custom segments
                    updates.push(
                        RundownUtils.apiRequest(`/rundown-segments/${segment.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                                title: segment.title,
                                duration: segment.duration,
                                content: segment.content,
                                notes: segment.notes
                            })
                        })
                    );
                }
            }
        }
        
        // Execute all updates
        await Promise.all(updates);
    }
    
    // ========================================
    // ERROR HANDLING AND RECOVERY
    // ========================================
    
    handleSaveError(error) {
        this.retryCount++;
        
        if (this.retryCount <= this.maxRetries) {
            console.log(`🔄 Retrying save (${this.retryCount}/${this.maxRetries})...`);
            this.showSaveState('retrying');
            
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
            setTimeout(() => {
                this.saveWithRetry();
            }, delay);
        } else {
            console.error('❌ Max retries exceeded, queuing for later');
            this.showSaveState('error');
            this.queuePendingSave();
            this.retryCount = 0;
        }
        
        this.emitSaveEvent('error', { error: error.message, retryCount: this.retryCount });
    }
    
    queuePendingSave() {
        try {
            const saveData = this.collectSaveData();
            this.pendingSaves.push({
                timestamp: Date.now(),
                data: saveData
            });
            
            console.log('📋 Save queued for when network returns');
            this.showSaveState('queued');
        } catch (error) {
            console.error('❌ Failed to queue save:', error);
        }
    }
    
    async processPendingSaves() {
        if (this.pendingSaves.length === 0) return;
        
        console.log('🔄 Processing', this.pendingSaves.length, 'pending saves...');
        
        // Sort by timestamp and take the most recent
        this.pendingSaves.sort((a, b) => b.timestamp - a.timestamp);
        const latestSave = this.pendingSaves[0];
        
        try {
            await this.saveToDB(latestSave.data);
            this.pendingSaves = [];
            this.isDirty = false;
            this.showSaveState('saved');
            this.updateLastSaveTime();
            
            console.log('✅ Pending saves processed successfully');
        } catch (error) {
            console.error('❌ Failed to process pending saves:', error);
            this.showSaveState('error');
        }
    }
    
    // ========================================
    // VISUAL FEEDBACK SYSTEM
    // ========================================
    
    showSaveState(state) {
        if (!this.saveIndicator) return;
        
        const icon = this.saveIndicator.querySelector('.save-icon');
        const text = this.saveIndicator.querySelector('.save-text');
        const spinner = this.saveIndicator.querySelector('.save-spinner');
        
        // Reset classes
        this.saveIndicator.className = 'auto-save-indicator';
        spinner.style.display = 'none';
        
        switch (state) {
            case 'saving':
                this.saveIndicator.classList.add('saving');
                icon.textContent = '💾';
                text.textContent = 'Saving...';
                spinner.style.display = 'inline-block';
                break;
                
            case 'saved':
                this.saveIndicator.classList.add('saved');
                icon.textContent = '✅';
                text.textContent = 'Saved';
                setTimeout(() => {
                    if (this.saveIndicator.classList.contains('saved')) {
                        icon.textContent = '💾';
                        text.textContent = 'Saved';
                        this.saveIndicator.classList.remove('saved');
                    }
                }, 2000);
                break;
                
            case 'unsaved':
                this.saveIndicator.classList.add('unsaved');
                icon.textContent = '✏️';
                text.textContent = 'Unsaved';
                break;
                
            case 'error':
                this.saveIndicator.classList.add('error');
                icon.textContent = '⚠️';
                text.textContent = 'Save failed';
                break;
                
            case 'retrying':
                this.saveIndicator.classList.add('retrying');
                icon.textContent = '🔄';
                text.textContent = 'Retrying...';
                spinner.style.display = 'inline-block';
                break;
                
            case 'offline':
                this.saveIndicator.classList.add('offline');
                icon.textContent = '📡';
                text.textContent = 'Offline';
                break;
                
            case 'queued':
                this.saveIndicator.classList.add('queued');
                icon.textContent = '📋';
                text.textContent = 'Queued';
                break;
        }
    }
    
    updateLastSaveTime() {
        if (!this.lastSaveIndicator || !this.lastSaveTime) return;
        
        const timeText = this.lastSaveIndicator.querySelector('.last-save-text');
        const timeString = this.formatLastSaveTime(this.lastSaveTime);
        timeText.textContent = `Last saved: ${timeString}`;
    }
    
    formatLastSaveTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    }
    
    emitSaveEvent(type, data = {}) {
        const event = new CustomEvent('rundownAutoSave', {
            detail: {
                type,
                rundownId: this.rundownId,
                timestamp: Date.now(),
                ...data
            }
        });
        document.dispatchEvent(event);
    }
    
    // ========================================
    // CONFLICT RESOLUTION
    // ========================================
    
    async checkForConflicts() {
        try {
            const response = await RundownUtils.apiRequest(`/rundowns/${this.rundownId}/last-modified`);
            const serverLastModified = new Date(response.updated_at);
            
            if (this.lastSaveTime && serverLastModified > this.lastSaveTime) {
                console.log('⚠️ Conflict detected - server version is newer');
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn('⚠️ Could not check for conflicts:', error);
            return false;
        }
    }
    
    async resolveConflict() {
        const userChoice = confirm(
            'This rundown has been modified by another user. ' +
            'Would you like to reload their changes? ' +
            '(Click Cancel to keep your changes)'
        );
        
        if (userChoice) {
            // Reload from server
            await this.editor.loadRundownData();
            this.isDirty = false;
            this.showSaveState('saved');
            console.log('🔄 Conflict resolved by reloading server data');
        } else {
            // Force save our version
            this.isDirty = true;
            await this.saveImmediately();
            console.log('💪 Conflict resolved by overwriting server data');
        }
    }
    
    // ========================================
    // PUBLIC API
    // ========================================
    
    enable() {
        this.isEnabled = true;
        console.log('✅ Auto-save enabled');
    }
    
    disable() {
        this.isEnabled = false;
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        console.log('⏸️ Auto-save disabled');
    }
    
    forceSave() {
        return this.saveImmediately();
    }
    
    getStatus() {
        return {
            enabled: this.isEnabled,
            isDirty: this.isDirty,
            isSaving: this.isSaving,
            isOnline: this.isOnline,
            lastSaveTime: this.lastSaveTime,
            pendingSaves: this.pendingSaves.length,
            retryCount: this.retryCount
        };
    }
    
    destroy() {
        this.disable();
        
        // Clean up DOM elements
        if (this.saveIndicator?.parentNode) {
            this.saveIndicator.parentNode.removeChild(this.saveIndicator);
        }
        if (this.lastSaveIndicator?.parentNode) {
            this.lastSaveIndicator.parentNode.removeChild(this.lastSaveIndicator);
        }
        
        console.log('🗑️ Auto-save system destroyed');
    }
}

// Export for global use
window.RundownAutoSave = RundownAutoSave;