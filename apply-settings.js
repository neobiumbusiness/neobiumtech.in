// apply-settings.js
// This script runs synchronously in the <head> to prevent FOUC (Flash of Unstyled Content)
(function() {
    const savedTheme = localStorage.getItem('neobium-theme') || 'dark';
    const savedFontSize = localStorage.getItem('neobium-font-size') || '16px';
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Apply font size
    document.documentElement.style.setProperty('--base-font-size', savedFontSize);
})();
