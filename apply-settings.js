// apply-settings.js
// This script runs synchronously in the <head> to prevent FOUC (Flash of Unstyled Content)
(function() {
    // Fetch and apply page visibility rules to hide nav links
    fetch('/api/page-visibility')
        .then(res => res.json())
        .then(visibility => {
            const hiddenPages = Object.keys(visibility).filter(page => visibility[page] === false);
            if (hiddenPages.length > 0) {
                const style = document.createElement('style');
                let css = '';
                hiddenPages.forEach(page => {
                    css += `a[href="${page}"], a[href="/${page}"] { display: none !important; }\n`;
                });
                style.innerHTML = css;
                document.head.appendChild(style);
            }
        })
        .catch(err => console.error('Failed to load page visibility', err));

    const savedTheme = localStorage.getItem('neobium-theme') || 'light';
    const savedColor = localStorage.getItem('neobium-color') || 'red';
    const savedFont = localStorage.getItem('neobium-font') || 'Outfit';
    const savedFontSize = localStorage.getItem('neobium-font-size') || '16px';
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Apply color scheme
    document.documentElement.setAttribute('data-color', savedColor);
    
    const savedFontType = localStorage.getItem('neobium-font-type') || 'google';
    const savedFontUrl = localStorage.getItem('neobium-font-url') || '';
    
    // Dynamically inject Font Styles
    if (savedFontType === 'custom' && savedFontUrl) {
        const style = document.createElement('style');
        style.innerHTML = `
            @font-face {
                font-family: '${savedFont}';
                src: url('${savedFontUrl}');
                font-weight: normal;
                font-style: normal;
                font-display: swap;
            }
            body { font-family: '${savedFont}', sans-serif !important; }
            :root { --font-main: '${savedFont}', sans-serif !important; }
        `;
        document.head.appendChild(style);
    } else {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${savedFont.replace(/ /g, '+')}:wght@300;400;500;700;900&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        
        const style = document.createElement('style');
        style.innerHTML = `
            body { font-family: '${savedFont}', sans-serif !important; }
            :root { --font-main: '${savedFont}', sans-serif !important; }
        `;
        document.head.appendChild(style);
    }
    
    document.documentElement.setAttribute('data-font', savedFont);
    
    // Apply font size
    document.documentElement.style.setProperty('--base-font-size', savedFontSize);

    // Update logos when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const logoSrc = savedTheme === 'light' ? '/uploads/logos/logo-light.png' : '/uploads/logos/logo-dark.png';
        document.querySelectorAll('img[alt="Neobium Logo"]').forEach(img => {
            img.setAttribute('src', logoSrc);
            img.onerror = function() {
                this.onerror = null;
                this.src = '/uploads/logos/logo.png';
            };
        });

        // Add modern pill theme switch
        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'theme-switch-wrapper';
        toggleWrapper.title = 'Toggle Theme';
        
        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.id = 'theme-switch-checkbox';
        toggleInput.className = 'theme-switch-checkbox';
        toggleInput.checked = savedTheme === 'dark';
        
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'theme-switch-label';
        toggleLabel.setAttribute('for', 'theme-switch-checkbox');
        
        toggleLabel.innerHTML = `
            <span class="theme-icon sun">&#x2600;&#xFE0F;</span>
            <span class="theme-icon moon">&#x1F319;</span>
            <span class="theme-switch-slider"></span>
        `;
        
        toggleWrapper.appendChild(toggleInput);
        toggleWrapper.appendChild(toggleLabel);

        toggleInput.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            
            // Apply & Save
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('neobium-theme', newTheme);
            
            // Update Logos
            const newLogoSrc = newTheme === 'light' ? '/uploads/logos/logo-light.png' : '/uploads/logos/logo-dark.png';
            document.querySelectorAll('img[alt="Neobium Logo"]').forEach(img => {
                img.setAttribute('src', newLogoSrc);
                img.onerror = function() {
                    this.onerror = null;
                    this.src = '/uploads/logos/logo.png';
                };
            });
            
            // Dispatch event for other scripts
            window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
        });
        
        const navList = document.querySelector('.nav-list');
        if (navList) {
            const li = document.createElement('li');
            li.appendChild(toggleWrapper);
            navList.appendChild(li); // Appends right beside Contact Us
        } else {
            toggleWrapper.style.position = 'fixed';
            toggleWrapper.style.bottom = '20px';
            toggleWrapper.style.left = '20px';
            toggleWrapper.style.zIndex = '9999';
            document.body.appendChild(toggleWrapper);
        }
    });
})();
