/**
 * HOTFIX: Force hide mobile navigation elements on desktop
 * This script runs immediately to fix the mobile menu display issue
 */

(function() {
    'use strict';
    
    console.log('🔧 NAVIGATION HOTFIX: Starting mobile menu fix...');
    
    function hideMobileElementsOnDesktop() {
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileToggle = document.getElementById('mobileToggle');
        const isDesktop = window.innerWidth > 768;
        
        if (isDesktop) {
            if (mobileMenu) {
                mobileMenu.style.display = 'none';
                mobileMenu.style.visibility = 'hidden';
                mobileMenu.classList.remove('active');
                console.log('🔧 HOTFIX: Mobile menu hidden on desktop');
            }
            
            if (mobileToggle) {
                mobileToggle.style.display = 'none';
                mobileToggle.style.visibility = 'hidden';
                console.log('🔧 HOTFIX: Mobile toggle hidden on desktop');
            }
        } else {
            // On mobile, ensure elements can be visible
            if (mobileMenu) {
                mobileMenu.style.visibility = 'visible';
                // Keep display controlled by CSS classes
            }
            
            if (mobileToggle) {
                mobileToggle.style.display = 'flex';
                mobileToggle.style.visibility = 'visible';
            }
        }
    }
    
    // Apply fix immediately when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideMobileElementsOnDesktop);
    } else {
        hideMobileElementsOnDesktop();
    }
    
    // Also apply on window resize
    window.addEventListener('resize', hideMobileElementsOnDesktop);
    
    // Apply fix after a short delay to catch any late-loading elements
    setTimeout(hideMobileElementsOnDesktop, 100);
    setTimeout(hideMobileElementsOnDesktop, 500);
    setTimeout(hideMobileElementsOnDesktop, 1000);
    
    console.log('🔧 NAVIGATION HOTFIX: Mobile menu fix applied');
})();