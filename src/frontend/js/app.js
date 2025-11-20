// Main Application Module - Coordinates all other modules
class ShopSmartApp {
    constructor() {
        this.isInitialized = false;
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing ShopSmart Application...');
            
            // Wait for DOM to be fully loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                this.initializeApp();
            }
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showGlobalError('Failed to initialize application. Please refresh the page.');
        }
    }
    
    initializeApp() {
        console.log('DOM loaded, initializing app components...');
        
        // Initialize navigation
        this.initializeNavigation();
        
        // Initialize global error handling
        this.initializeErrorHandling();
        
        // Initialize service worker (if available)
        this.initializeServiceWorker();
        
        this.isInitialized = true;
        console.log('ShopSmart Application initialized successfully');
    }
    
    initializeNavigation() {
        // Home link
        const homeLink = document.getElementById('home-link');
        if (homeLink) {
            homeLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToHome();
            });
        }
        
        // Cart link
        const cartLink = document.getElementById('cart-link');
        if (cartLink) {
            cartLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToCart();
            });
        }
        
        // Auth buttons are now handled by AuthManager
        // No need to add event listeners here as AuthManager handles them
    }
    
    initializeErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showGlobalError('An unexpected error occurred. Please refresh the page.');
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showGlobalError('An unexpected error occurred. Please refresh the page.');
        });
    }
    
    initializeServiceWorker() {
        // Service worker registration (for future PWA features)
        if ('serviceWorker' in navigator) {
            console.log('Service Worker support detected (not implemented yet)');
            // Will be implemented in future iterations
        }
    }
    
    navigateToHome() {
        // Scroll to top and refresh products if needed
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        if (window.productsManager) {
            // Clear search and filters
            const searchInput = document.getElementById('search-input');
            const categoryFilter = document.getElementById('category-filter');
            
            if (searchInput) searchInput.value = '';
            if (categoryFilter) categoryFilter.value = '';
            
            // Reload products
            window.productsManager.currentSearch = '';
            window.productsManager.currentCategory = '';
            window.productsManager.currentPage = 1;
            window.productsManager.loadProducts();
        }
    }
    
    navigateToCart() {
        console.log('Cart page navigation will be implemented in subtask 5.3');
        // For now, just show a placeholder message
        this.showInfoMessage('Cart page will be implemented in subtask 5.3');
    }
    
    showGlobalError(message) {
        this.showMessage(message, 'error');
    }
    
    showInfoMessage(message) {
        this.showMessage(message, 'info');
    }
    
    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }
    
    showMessage(message, type = 'info') {
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `global-message global-message-${type}`;
        
        // Style based on type
        const styles = {
            error: {
                backgroundColor: '#f8d7da',
                color: '#721c24',
                borderColor: '#f5c6cb'
            },
            success: {
                backgroundColor: '#d4edda',
                color: '#155724',
                borderColor: '#c3e6cb'
            },
            info: {
                backgroundColor: '#d1ecf1',
                color: '#0c5460',
                borderColor: '#bee5eb'
            }
        };
        
        const style = styles[type] || styles.info;
        
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            border: 1px solid ${style.borderColor};
            background-color: ${style.backgroundColor};
            color: ${style.color};
            z-index: 1002;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            font-weight: 500;
        `;
        
        messageDiv.textContent = message;
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            float: right;
            margin-left: 10px;
            color: inherit;
        `;
        
        closeBtn.addEventListener('click', () => {
            if (document.body.contains(messageDiv)) {
                document.body.removeChild(messageDiv);
            }
        });
        
        messageDiv.appendChild(closeBtn);
        document.body.appendChild(messageDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(messageDiv)) {
                document.body.removeChild(messageDiv);
            }
        }, 5000);
    }
    
    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
    
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the application
window.shopSmartApp = new ShopSmartApp();