// Loading utility functions for VidPOD

class LoadingManager {
    constructor() {
        this.activeLoaders = new Set();
    }

    // Show full page loading overlay
    showPageLoader(message = 'Loading...') {
        this.hidePageLoader(); // Remove any existing loader
        
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'pageLoadingOverlay';
        
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        `;
        
        document.body.appendChild(overlay);
        this.activeLoaders.add('page');
    }

    // Hide full page loading overlay
    hidePageLoader() {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) {
            overlay.remove();
        }
        this.activeLoaders.delete('page');
    }

    // Show content loading in a specific container
    showContentLoader(containerId, message = 'Loading content...') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="content-loading">
                <div class="spinner"></div>
                <span>${message}</span>
            </div>
        `;
        this.activeLoaders.add(containerId);
    }

    // Show table loading state
    showTableLoader(tableBodyId, message = 'Loading data...', columnCount = 4) {
        const tbody = document.getElementById(tableBodyId);
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="${columnCount}" class="table-loading">
                    <div class="spinner"></div>
                    <div>${message}</div>
                </td>
            </tr>
        `;
        this.activeLoaders.add(tableBodyId);
    }

    // Show button loading state
    showButtonLoader(buttonElement, originalText = null) {
        if (!buttonElement) return;

        if (originalText) {
            buttonElement.dataset.originalText = originalText;
        } else {
            buttonElement.dataset.originalText = buttonElement.textContent;
        }
        
        buttonElement.classList.add('btn-loading');
        buttonElement.disabled = true;
        this.activeLoaders.add(buttonElement.id || 'button');
    }

    // Hide button loading state
    hideButtonLoader(buttonElement) {
        if (!buttonElement) return;

        buttonElement.classList.remove('btn-loading');
        buttonElement.disabled = false;
        
        if (buttonElement.dataset.originalText) {
            buttonElement.textContent = buttonElement.dataset.originalText;
            delete buttonElement.dataset.originalText;
        }
        this.activeLoaders.delete(buttonElement.id || 'button');
    }

    // Clear loading state from container
    clearContentLoader(containerId) {
        this.activeLoaders.delete(containerId);
    }

    // Clear all loaders
    clearAllLoaders() {
        this.hidePageLoader();
        
        // Clear button loaders
        document.querySelectorAll('.btn-loading').forEach(btn => {
            this.hideButtonLoader(btn);
        });
        
        this.activeLoaders.clear();
    }

    // Check if any loaders are active
    hasActiveLoaders() {
        return this.activeLoaders.size > 0;
    }

    // Get list of active loaders
    getActiveLoaders() {
        return Array.from(this.activeLoaders);
    }
}

// Create global instance
window.loadingManager = new LoadingManager();

// Convenience functions for easy use
window.showPageLoader = (message) => window.loadingManager.showPageLoader(message);
window.hidePageLoader = () => window.loadingManager.hidePageLoader();
window.showContentLoader = (containerId, message) => window.loadingManager.showContentLoader(containerId, message);
window.showTableLoader = (tableBodyId, message, columnCount) => window.loadingManager.showTableLoader(tableBodyId, message, columnCount);
window.showButtonLoader = (buttonElement, originalText) => window.loadingManager.showButtonLoader(buttonElement, originalText);
window.hideButtonLoader = (buttonElement) => window.loadingManager.hideButtonLoader(buttonElement);

// Utility function for API calls with loading states
window.withLoader = async function(loaderConfig, asyncFunction) {
    try {
        // Show appropriate loader
        if (loaderConfig.type === 'page') {
            window.showPageLoader(loaderConfig.message);
        } else if (loaderConfig.type === 'content') {
            window.showContentLoader(loaderConfig.containerId, loaderConfig.message);
        } else if (loaderConfig.type === 'table') {
            window.showTableLoader(loaderConfig.tableBodyId, loaderConfig.message, loaderConfig.columnCount);
        } else if (loaderConfig.type === 'button') {
            window.showButtonLoader(loaderConfig.buttonElement, loaderConfig.originalText);
        }

        // Execute the async function
        const result = await asyncFunction();
        return result;

    } catch (error) {
        console.error('Error in withLoader:', error);
        throw error;
    } finally {
        // Hide appropriate loader
        if (loaderConfig.type === 'page') {
            window.hidePageLoader();
        } else if (loaderConfig.type === 'button') {
            window.hideButtonLoader(loaderConfig.buttonElement);
        }
        // Content and table loaders are typically cleared by the calling function
    }
};

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
    window.loadingManager.clearAllLoaders();
});

console.log('✅ Loading utilities initialized');