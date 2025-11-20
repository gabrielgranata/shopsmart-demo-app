// Storefront Configuration - Unified API Gateway Integration
const STOREFRONT_CONFIG = {
    // API Configuration
    API: {
        BASE_URL: '', // Use relative paths for CloudFront routing
        TIMEOUT: 10000, // 10 seconds
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000, // 1 second base delay

        // Unified API Gateway endpoints
        ENDPOINTS: {
            // Health check
            HEALTH: '/health',

            // Product endpoints
            PRODUCTS: '/api/products',
            PRODUCT_DETAIL: '/api/products/{id}',
            PRODUCT_CATEGORIES: '/api/products/categories',
            PRODUCT_MATERIALS: '/api/products/materials',
            PRODUCT_STYLES: '/api/products/styles',
            PRODUCT_SEARCH: '/api/products/search',

            // Authentication endpoints
            AUTH_LOGIN: '/api/auth/login',
            AUTH_REGISTER: '/api/auth/register',
            AUTH_LOGOUT: '/api/auth/logout',
            AUTH_VALIDATE: '/api/auth/validate/{sessionId}',
            AUTH_PROFILE: '/api/auth/profile',

            // Cart endpoints
            CART_GET: '/api/auth/cart/{userId}',
            CART_ADD_ITEM: '/api/auth/cart/{userId}/items',
            CART_UPDATE_ITEM: '/api/auth/cart/{userId}/items/{itemId}',
            CART_REMOVE_ITEM: '/api/auth/cart/{userId}/items/{itemId}',
            CART_CLEAR: '/api/auth/cart/{userId}',

            // Order endpoints
            ORDERS_CREATE: '/api/orders',
            ORDERS_GET: '/api/orders/{orderId}',
            ORDERS_USER: '/api/orders/user/{userId}',
            ORDERS_STATUS: '/api/orders/{orderId}/status'
        }
    },

    // Application settings
    APP: {
        NAME: 'ShopSmart Artisan Desk Storefront',
        VERSION: '2.0.0',

        // Pagination
        PAGINATION: {
            DEFAULT_PAGE_SIZE: 12,
            MAX_PAGE_SIZE: 50
        },

        // Caching
        CACHE: {
            PRODUCTS_TTL: 5 * 60 * 1000, // 5 minutes
            CATEGORIES_TTL: 15 * 60 * 1000, // 15 minutes
            USER_SESSION_TTL: 24 * 60 * 60 * 1000 // 24 hours
        },

        // UI settings
        UI: {
            SEARCH_DEBOUNCE_MS: 300,
            LOADING_TIMEOUT_MS: 10000,
            NOTIFICATION_DURATION_MS: 3000,
            SESSION_WARNING_MS: 5 * 60 * 1000 // 5 minutes before expiration
        },

        // Storage keys
        STORAGE: {
            USER_SESSION: 'shopsmart_session',
            CART_BACKUP: 'shopsmart_cart_backup',
            PREFERENCES: 'shopsmart_preferences'
        }
    },

    // Error handling
    ERRORS: {
        NETWORK_ERROR: 'Network error. Please check your connection and try again.',
        AUTH_REQUIRED: 'Please log in to continue.',
        SESSION_EXPIRED: 'Your session has expired. Please log in again.',
        CART_EMPTY: 'Your cart is empty.',
        PRODUCT_NOT_FOUND: 'Product not found.',
        ORDER_FAILED: 'Failed to place order. Please try again.',
        GENERIC_ERROR: 'Something went wrong. Please try again.'
    },

    // Feature flags
    FEATURES: {
        ENABLE_ANALYTICS: true,
        ENABLE_DYNATRACE: true,
        ENABLE_CIRCUIT_BREAKER: true,
        ENABLE_RETRY_LOGIC: true,
        ENABLE_OFFLINE_MODE: false,
        ENABLE_PWA: false
    }
};

// Environment detection
const STOREFRONT_ENVIRONMENT = {
    isDevelopment: () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isProduction: () => !STOREFRONT_ENVIRONMENT.isDevelopment(),
    getBaseUrl: () => {
        // Use relative paths for CloudFront routing to API Gateway
        return '';
    }
};

// Utility functions for API URL building
function buildStorefrontApiUrl(endpoint, params = {}) {
    // Use relative paths - CloudFront will route /api/* to API Gateway
    let url = STOREFRONT_CONFIG.API.ENDPOINTS[endpoint];

    // Replace path parameters
    Object.keys(params).forEach(key => {
        url = url.replace(`{${key}}`, encodeURIComponent(params[key]));
    });

    return url;
}

// Enhanced API request utility with error handling and retry logic
async function makeStorefrontApiRequest(endpoint, options = {}, params = {}) {
    const url = buildStorefrontApiUrl(endpoint, params);
    const config = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        },
        ...options
    };

    // Add authentication if available
    const session = getStoredSession();
    if (session && session.sessionId) {
        config.headers.Authorization = `Bearer ${session.sessionId}`;
    }

    let lastError;
    const maxRetries = STOREFRONT_CONFIG.API.RETRY_ATTEMPTS;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), STOREFRONT_CONFIG.API.TIMEOUT);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new APIError(
                    errorData.message || `HTTP ${response.status}`,
                    response.status,
                    errorData.code,
                    errorData.details
                );
            }

            const data = await response.json();

            // Log successful request for analytics
            if (STOREFRONT_CONFIG.FEATURES.ENABLE_ANALYTICS && window.gtag) {
                window.gtag('event', 'api_request_success', {
                    endpoint: endpoint,
                    method: config.method,
                    attempt: attempt + 1
                });
            }

            return data;

        } catch (error) {
            lastError = error;

            // Don't retry on authentication errors or client errors
            if (error.status && (error.status === 401 || error.status === 403 || error.status < 500)) {
                break;
            }

            // Don't retry on the last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Calculate retry delay with exponential backoff
            const delay = STOREFRONT_CONFIG.API.RETRY_DELAY * Math.pow(2, attempt);
            const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd

            console.log(`API request failed, retrying in ${delay + jitter}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay + jitter));
        }
    }

    // Log failed request for analytics
    if (STOREFRONT_CONFIG.FEATURES.ENABLE_ANALYTICS && window.gtag) {
        window.gtag('event', 'api_request_failed', {
            endpoint: endpoint,
            method: config.method,
            error: lastError.message
        });
    }

    throw lastError;
}

// Session management utilities
function getStoredSession() {
    try {
        const sessionData = localStorage.getItem(STOREFRONT_CONFIG.APP.STORAGE.USER_SESSION);
        if (sessionData) {
            const session = JSON.parse(sessionData);

            // Check if session has expired
            if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
                localStorage.removeItem(STOREFRONT_CONFIG.APP.STORAGE.USER_SESSION);
                return null;
            }

            return session;
        }
    } catch (error) {
        console.error('Failed to parse stored session:', error);
        localStorage.removeItem(STOREFRONT_CONFIG.APP.STORAGE.USER_SESSION);
    }

    return null;
}

function storeSession(user, sessionId, expiresAt) {
    const session = {
        user,
        sessionId,
        expiresAt: expiresAt || new Date(Date.now() + STOREFRONT_CONFIG.APP.CACHE.USER_SESSION_TTL).toISOString()
    };

    localStorage.setItem(STOREFRONT_CONFIG.APP.STORAGE.USER_SESSION, JSON.stringify(session));
}

function clearStoredSession() {
    localStorage.removeItem(STOREFRONT_CONFIG.APP.STORAGE.USER_SESSION);
    localStorage.removeItem(STOREFRONT_CONFIG.APP.STORAGE.CART_BACKUP);
}

// Error handling utilities
class APIError extends Error {
    constructor(message, status, code, details) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
        this.details = details;
    }

    isAuthenticationError() {
        return this.status === 401 || this.status === 403;
    }

    isNetworkError() {
        return this.name === 'TypeError' || this.name === 'AbortError';
    }

    isServerError() {
        return this.status >= 500;
    }

    getUserFriendlyMessage() {
        if (this.isAuthenticationError()) {
            return STOREFRONT_CONFIG.ERRORS.AUTH_REQUIRED;
        } else if (this.isNetworkError()) {
            return STOREFRONT_CONFIG.ERRORS.NETWORK_ERROR;
        } else if (this.status === 404) {
            return STOREFRONT_CONFIG.ERRORS.PRODUCT_NOT_FOUND;
        } else if (this.isServerError()) {
            return STOREFRONT_CONFIG.ERRORS.GENERIC_ERROR;
        } else {
            return this.message || STOREFRONT_CONFIG.ERRORS.GENERIC_ERROR;
        }
    }
}

// Health check utility
async function checkSystemHealth() {
    try {
        const response = await makeStorefrontApiRequest('HEALTH');
        return {
            status: 'healthy',
            details: response
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            details: error.details
        };
    }
}

// Utility functions and constants
const Utils = {
    // Storage utilities
    storage: {
        get: (key) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (error) {
                console.error('Error reading from localStorage:', error);
                return null;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('Error writing to localStorage:', error);
            }
        },
        remove: (key) => {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('Error removing from localStorage:', error);
            }
        }
    },

    // Validation utilities
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    validatePassword: (password) => {
        return password && password.length >= 6;
    },

    // HTML utilities
    sanitizeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },

    // Currency formatting
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    },

    // Debounce utility
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle utility
    throttle: (func, limit) => {
        let inThrottle;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Scroll utility
    scrollToElement: (elementId, offset = 0) => {
        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.offsetTop - offset;
            window.scrollTo({
                top: elementPosition,
                behavior: 'smooth'
            });
        }
    }
};

// App configuration constants
const APP_CONFIG = {
    USER_STORAGE_KEY: 'shopsmart_user',
    CART_STORAGE_KEY: 'shopsmart_cart',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    NOTIFICATION_DELAY: 3000,
    SEARCH_DEBOUNCE: 300,
    PRODUCTS_PER_PAGE: 12,

    UI: {
        SEARCH_DEBOUNCE_MS: 300,
        LOADING_TIMEOUT_MS: 10000,
        NOTIFICATION_DURATION_MS: 3000
    }
};

// Success messages
const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Successfully logged in!',
    LOGOUT_SUCCESS: 'Successfully logged out!',
    REGISTER_SUCCESS: 'Account created successfully!',
    CART_ADD_SUCCESS: 'Item added to cart!',
    CART_REMOVE_SUCCESS: 'Item removed from cart!',
    CART_UPDATE_SUCCESS: 'Cart updated!',
    ORDER_SUCCESS: 'Order placed successfully!'
};

// Product configuration
const PRODUCT_CONFIG = {
    MATERIALS: [
        'Crystallized Obsidian',
        'Ancient Redwood',
        'Floating Glass',
        'Meteorite Stone',
        'Living Moss',
        'Holographic Crystal',
        'Dragon Bone',
        'Liquid Mercury',
        'Quantum Foam',
        'Bioluminescent Coral'
    ],
    STYLES: [
        { value: 'levitating', label: 'Levitating' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'crystallized', label: 'Crystallized' },
        { value: 'floating', label: 'Floating' },
        { value: 'temporal', label: 'Temporal' },
        { value: 'ethereal', label: 'Ethereal' },
        { value: 'quantum', label: 'Quantum' },
        { value: 'cosmic', label: 'Cosmic' }
    ]
};

// Simple EventBus implementation
const EventBus = {
    events: {},

    on: (event, callback) => {
        if (!EventBus.events[event]) {
            EventBus.events[event] = [];
        }
        EventBus.events[event].push(callback);
    },

    emit: (event, data) => {
        if (EventBus.events[event]) {
            EventBus.events[event].forEach(callback => callback(data));
        }
    },

    off: (event, callback) => {
        if (EventBus.events[event]) {
            EventBus.events[event] = EventBus.events[event].filter(cb => cb !== callback);
        }
    }
};

// Export configuration and utilities
window.STOREFRONT_CONFIG = STOREFRONT_CONFIG;
window.STOREFRONT_ENVIRONMENT = STOREFRONT_ENVIRONMENT;
window.buildStorefrontApiUrl = buildStorefrontApiUrl;
window.makeStorefrontApiRequest = makeStorefrontApiRequest;
window.getStoredSession = getStoredSession;
window.storeSession = storeSession;
window.clearStoredSession = clearStoredSession;
window.APIError = APIError;
window.checkSystemHealth = checkSystemHealth;
window.Utils = Utils;
window.APP_CONFIG = APP_CONFIG;
window.SUCCESS_MESSAGES = SUCCESS_MESSAGES;
window.PRODUCT_CONFIG = PRODUCT_CONFIG;
window.EventBus = EventBus;

// Initialize configuration
document.addEventListener('DOMContentLoaded', () => {
    console.log(`${STOREFRONT_CONFIG.APP.NAME} v${STOREFRONT_CONFIG.APP.VERSION} initialized`);

    // Perform initial health check
    if (STOREFRONT_CONFIG.FEATURES.ENABLE_ANALYTICS) {
        checkSystemHealth().then(health => {
            console.log('System health check:', health);

            if (window.gtag) {
                window.gtag('event', 'system_health_check', {
                    status: health.status
                });
            }
        });
    }
});