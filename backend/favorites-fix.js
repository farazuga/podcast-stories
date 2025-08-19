/**
 * FAVORITES FUNCTIONALITY FIXES
 * 
 * This file contains the improved favorites functionality to fix common errors:
 * 1. Better error handling and logging
 * 2. Improved DOM selectors
 * 3. Null reference protection
 * 4. Better user feedback
 */

// Enhanced toggleFavorite function with better error handling
async function toggleFavorite(storyId) {
    console.log(`🔄 Toggle favorite for story ${storyId}`);
    
    try {
        // Validate inputs
        if (!storyId || storyId <= 0) {
            throw new Error('Invalid story ID');
        }
        
        // Check if API_URL is defined
        if (typeof window.API_URL === 'undefined') {
            throw new Error('API_URL not defined - config.js may not be loaded');
        }
        
        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please log in to add favorites', 'error');
            return;
        }
        
        // Check if userFavorites is initialized
        if (typeof userFavorites === 'undefined') {
            console.error('userFavorites not initialized, creating new Set');
            userFavorites = new Set();
        }
        
        const isFavorited = userFavorites.has(storyId);
        const method = isFavorited ? 'DELETE' : 'POST';
        const url = `${window.API_URL}/favorites/${storyId}`;
        
        console.log(`📡 ${method} ${url}`);
        
        // Find favorite button - try multiple selector strategies
        let favoriteBtn = document.querySelector(`[data-story-id="${storyId}"] .favorite-btn`);
        if (!favoriteBtn) {
            favoriteBtn = document.querySelector(`[onclick="toggleFavorite(${storyId})"]`);
        }
        if (!favoriteBtn) {
            favoriteBtn = document.querySelector(`button[onclick*="toggleFavorite(${storyId})"]`);
        }
        
        // Show loading state
        if (favoriteBtn) {
            favoriteBtn.disabled = true;
            favoriteBtn.classList.add('loading');
            console.log('✅ Found favorite button, showing loading state');
        } else {
            console.warn('⚠️  Could not find favorite button for story', storyId);
        }
        
        const response = await makeAuthenticatedRequest(url, { method });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ API response:', result);
            
            // Update local state
            if (isFavorited) {
                userFavorites.delete(storyId);
                console.log(`➖ Removed story ${storyId} from favorites`);
            } else {
                userFavorites.add(storyId);
                console.log(`➕ Added story ${storyId} to favorites`);
            }
            
            // Update UI
            updateFavoriteUI(storyId, !isFavorited, result.total_favorites);
            
            // Show success message
            showNotification(result.message || `Story ${isFavorited ? 'removed from' : 'added to'} favorites`, 'success');
            
        } else {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('❌ API error:', response.status, error);
            showNotification(error.error || 'Failed to update favorite', 'error');
        }
        
    } catch (error) {
        console.error('❌ toggleFavorite error:', error);
        
        // Provide specific error messages
        if (error.message.includes('API_URL')) {
            showNotification('Configuration error. Please refresh the page.', 'error');
        } else if (error.message.includes('authentication')) {
            showNotification('Please log in to use favorites.', 'error');
        } else if (error.message.includes('Network')) {
            showNotification('Network error. Please check your connection.', 'error');
        } else {
            showNotification('Error updating favorite. Please try again.', 'error');
        }
    } finally {
        // Remove loading state - use same selector strategy
        let favoriteBtn = document.querySelector(`[data-story-id="${storyId}"] .favorite-btn`);
        if (!favoriteBtn) {
            favoriteBtn = document.querySelector(`[onclick="toggleFavorite(${storyId})"]`);
        }
        if (!favoriteBtn) {
            favoriteBtn = document.querySelector(`button[onclick*="toggleFavorite(${storyId})"]`);
        }
        
        if (favoriteBtn) {
            favoriteBtn.disabled = false;
            favoriteBtn.classList.remove('loading');
            console.log('✅ Removed loading state from favorite button');
        }
    }
}

// Enhanced updateFavoriteUI function with better DOM handling
function updateFavoriteUI(storyId, isFavorited, totalFavorites) {
    console.log(`🎨 Updating favorite UI for story ${storyId}: ${isFavorited ? 'favorited' : 'not favorited'}, count: ${totalFavorites}`);
    
    // Try multiple selector strategies to find favorite buttons
    const selectors = [
        `[data-story-id="${storyId}"] .favorite-btn`,
        `[onclick="toggleFavorite(${storyId})"]`,
        `button[onclick*="toggleFavorite(${storyId})"]`
    ];
    
    let favoriteButtons = [];
    for (const selector of selectors) {
        const buttons = document.querySelectorAll(selector);
        if (buttons.length > 0) {
            favoriteButtons = Array.from(buttons);
            console.log(`✅ Found ${buttons.length} favorite buttons using selector: ${selector}`);
            break;
        }
    }
    
    if (favoriteButtons.length === 0) {
        console.warn(`⚠️  No favorite buttons found for story ${storyId}`);
        return;
    }
    
    favoriteButtons.forEach(btn => {
        try {
            const heartIcon = btn.querySelector('.heart-icon');
            const favoriteCount = btn.querySelector('.favorite-count');
            
            // Update heart icon
            if (heartIcon) {
                heartIcon.textContent = isFavorited ? '♥' : '♡';
                heartIcon.style.color = isFavorited ? '#ff6b35' : '#ccc';
                console.log(`✅ Updated heart icon: ${heartIcon.textContent}`);
            } else {
                console.warn('⚠️  Heart icon not found in button');
            }
            
            // Update favorite count
            if (favoriteCount && totalFavorites !== undefined) {
                favoriteCount.textContent = totalFavorites;
                console.log(`✅ Updated favorite count: ${totalFavorites}`);
            } else if (!favoriteCount) {
                console.warn('⚠️  Favorite count element not found in button');
            }
            
            // Update button class and title
            btn.classList.toggle('favorited', isFavorited);
            btn.title = isFavorited ? 'Remove from favorites' : 'Add to favorites';
            
            // Add animation
            btn.classList.add('favorite-pulse');
            setTimeout(() => btn.classList.remove('favorite-pulse'), 300);
            
        } catch (btnError) {
            console.error('❌ Error updating favorite button:', btnError);
        }
    });
}

// Enhanced initialization check
function initializeFavorites() {
    console.log('🔧 Initializing favorites functionality...');
    
    // Check prerequisites
    const checks = {
        apiUrlDefined: typeof window.API_URL !== 'undefined',
        apiUrlValue: window.API_URL,
        userFavoritesDefined: typeof userFavorites !== 'undefined',
        userFavoritesType: typeof userFavorites,
        makeAuthenticatedRequestExists: typeof makeAuthenticatedRequest === 'function',
        tokenExists: !!localStorage.getItem('token')
    };
    
    console.log('🔍 Favorites prerequisites check:');
    Object.entries(checks).forEach(([key, value]) => {
        const status = value ? '✅' : '❌';
        console.log(`   ${key}: ${status} ${value}`);
    });
    
    // Initialize userFavorites if not defined
    if (typeof userFavorites === 'undefined') {
        console.log('🔧 Creating userFavorites Set');
        window.userFavorites = new Set();
    }
    
    return checks;
}

// Export functions for global use
if (typeof window !== 'undefined') {
    window.toggleFavoriteEnhanced = toggleFavorite;
    window.updateFavoriteUIEnhanced = updateFavoriteUI;
    window.initializeFavorites = initializeFavorites;
}