// Unified Configuration - Combines API and Storefront configurations
// API Configuration - Updated for unified API Gateway
const API_CONFIG = {
    // Unified API Gateway Base URL
    API_GATEWAY: {
        BASE_URL: '/api', // Use relative URL for CloudFront routing
        ENDPOINTS: {
            // Product Catalog Service endpoints
            PRODUCTS: '/products',
            PRODUCT_DETAIL: '/products/{id}',
            PRODUCT_CATEGORIES: '/products/categories',
            PRODUCT_MATERIALS: '/products/materials',
            PRODUCT_STYLES: '/products/styles',
            PRODUCT_AVAILABILITY: '/products/{id}/availability',
            PRODUCT_RESERVE: '/products/{id}/reserve',
            
            // Authentication Service endpoints
            AUTH_LOGIN: '/auth/login',
            AUTH_REGISTER: '/auth/register',
            AUTH_LOGOUT: '/auth/logout',
            AUTH_REFRESH: '/auth/refresh',
            AUTH_VALIDATE: '/auth/validate/{sessionId}',
            AUTH_PROFILE: '/auth/profile',
            AUTH_CART: '/auth/cart/{userId}',
            AUTH_CART_ITEMS: '/auth/cart/{userId}/items',
            AUTH_CART_ITEM: '/auth/cart/{userId}/items/{itemId}',
            AUTH_CLEAR_CART: '/auth/cart/{userId}',
            
            // Order Processing Service endpoints
            ORDERS: '/orders',
            ORDER_DETAIL: '/orders/{orderId}',
            USER_ORDERS: '/orders/user/{userId}',
            ORDER_STATUS: '/orders/{orderId}/status',
            
            // Health check endpoint (uses root path, not /api)
            HEALTH: '/health'
        }
    }
};

// Storefront Configuration - Enhanced for full e-commerce experience
const STOREFRONT_CONFIG = {
    // API Configuration
    API: {
        BASE_URL: '', // Use relative URLs for CloudFront routing
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

// Application Configuration (for compatibility)
const APP_CONFIG = {
    USER_STORAGE_KEY: 'shopsmart_user',
    CART_STORAGE_KEY: 'shopsmart_cart',
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    PRODUCTS_PER_PAGE: 12,
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 12,
        MAX_PAGE_SIZE: 50
    },
    CACHE: {
        PRODUCTS_TTL: 5 * 60 * 1000, // 5 minutes
        CATEGORIES_TTL: 15 * 60 * 1000 // 15 minutes
    },
    UI: {
        SEARCH_DEBOUNCE_MS: 300,
        LOADING_TIMEOUT_MS: 10000
    },
    LOGGING: {
        LEVEL: 'INFO',
        DYNATRACE_ENABLED: true
    }
};

// Dynatrace Configuration - Loaded at runtime
let DYNATRACE_CONFIG = {
    endpoint: '',
    apiToken: '',
    serviceName: 'shopsmart-frontend-participant1234',
    serviceVersion: '1.0.0',
    environment: 'production'
};

// Environment Detection
const ENVIRONMENT = {
    isDevelopment: () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isProduction: () => !ENVIRONMENT.isDevelopment()
};

// Health check endpoint configuration
const HEALTH_CONFIG = {
    BASE_URL: '', // Use root path for health endpoint
    ENDPOINT: '/health'
};

// Utility functions
const Utils = {
    storage: {
        get: (key) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                return null;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.warn('Storage set failed:', e);
            }
        },
        remove: (key) => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn('Storage remove failed:', e);
            }
        }
    },
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    validatePassword: (password) => {
        return password && password.length >= 6;
    },
    sanitizeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    },
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    },
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
    throttle: (func, delay) => {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }
};

// Event Bus for component communication
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

// API Error class
class APIError extends Error {
    constructor(message, status, code, details) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

// URL building functions
function buildUnifiedApiUrl(endpoint, params = {}) {
    // Special handling for health endpoint
    if (endpoint === 'HEALTH') {
        return HEALTH_CONFIG.BASE_URL + HEALTH_CONFIG.ENDPOINT;
    }
    
    let url = API_CONFIG.API_GATEWAY.BASE_URL + API_CONFIG.API_GATEWAY.ENDPOINTS[endpoint];
    
    // Replace path parameters
    Object.keys(params).forEach(key => {
        url = url.replace(`{${key}}`, params[key]);
    });
    
    return url;
}

function buildStorefrontApiUrl(endpoint, params = {}) {
    let url = STOREFRONT_CONFIG.API.BASE_URL + STOREFRONT_CONFIG.API.ENDPOINTS[endpoint];
    
    // Replace path parameters
    Object.keys(params).forEach(key => {
        url = url.replace(`{${key}}`, params[key]);
    });
    
    return url;
}

// Load configuration from runtime endpoint
async function loadDynatraceConfig() {
    try {
        const response = await fetch('/api/config/opentelemetry');
        if (response.ok) {
            const config = await response.json();
            DYNATRACE_CONFIG = {
                ...DYNATRACE_CONFIG,
                endpoint: config.endpoint || DYNATRACE_CONFIG.endpoint,
                apiToken: config.apiToken || DYNATRACE_CONFIG.apiToken,
                environment: config.environment || DYNATRACE_CONFIG.environment
            };
            console.log('OpenTelemetry configuration loaded from runtime');
        } else {
            console.warn('Failed to load OpenTelemetry configuration, using defaults');
        }
    } catch (error) {
        console.warn('Error loading OpenTelemetry configuration:', error.message);
    }
}

// Initialize configuration on page load
if (typeof window !== 'undefined') {
    loadDynatraceConfig();
}

// OpenTelemetry Logger using Web SDK
class OpenTelemetryLogger {
    constructor() {
        this.enabled = APP_CONFIG.LOGGING.DYNATRACE_ENABLED;
        this.tracer = null;
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized || !this.enabled) return;
        
        try {
            // Wait for config to load
            await loadDynatraceConfig();
            
            if (!DYNATRACE_CONFIG.endpoint || !DYNATRACE_CONFIG.apiToken) {
                console.warn('OpenTelemetry config missing, logging disabled');
                return;
            }
            
            // Initialize OpenTelemetry Web SDK
            if (window.otelInitializer) {
                this.tracer = await window.otelInitializer.initialize({
                    endpoint: DYNATRACE_CONFIG.endpoint,
                    apiToken: DYNATRACE_CONFIG.apiToken,
                    serviceName: DYNATRACE_CONFIG.serviceName,
                    serviceVersion: DYNATRACE_CONFIG.serviceVersion,
                    environment: DYNATRACE_CONFIG.environment
                });
            }
            
            this.initialized = true;
            console.log('OpenTelemetry initialized successfully');
        } catch (error) {
            console.error('Failed to initialize OpenTelemetry:', error);
        }
    }
    
    log(level, message, data = {}) {
        console[level.toLowerCase()](message, data);
        
        if (this.initialized && DYNATRACE_CONFIG.endpoint) {
            this.sendLog(level, message, data);
        }
    }
    
    sendLog(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            attributes: {
                'service.name': DYNATRACE_CONFIG.serviceName,
                'service.version': DYNATRACE_CONFIG.serviceVersion,
                'deployment.environment': DYNATRACE_CONFIG.environment,
                ...data
            }
        };
        
        fetch(`${DYNATRACE_CONFIG.endpoint}/api/v2/logs/ingest`, {
            method: 'POST',
            headers: {
                'Authorization': `Api-Token ${DYNATRACE_CONFIG.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([logEntry])
        })
        .then(res => {
            if (res.ok) {
                console.log(`✓ Telemetry sent: ${level} - ${message}`);
            } else {
                console.error(`✗ Telemetry failed (${res.status}): ${level} - ${message}`);
            }
        })
        .catch(err => console.error('✗ Telemetry error:', err));
    }
    
    info(message, data = {}) {
        this.log('INFO', message, data);
    }
    
    warn(message, data = {}) {
        this.log('WARN', message, data);
    }
    
    error(error, data = {}) {
        const message = error instanceof Error ? error.message : String(error);
        this.log('ERROR', message, { error: error.stack || error, ...data });
    }
}

// Initialize logger
const logger = new OpenTelemetryLogger();
logger.initialize();

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

// API request function for storefront
async function makeStorefrontApiRequest(endpoint, options = {}, params = {}) {
    const url = buildStorefrontApiUrl(endpoint, params);
    
    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    if (options.body) {
        config.body = options.body;
    }
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
            errorData.message || `HTTP ${response.status}`,
            response.status,
            errorData.code,
            errorData.details
        );
    }
    
    return await response.json();
}

// Success messages
const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Successfully logged in!',
    LOGOUT_SUCCESS: 'Successfully logged out',
    CART_ADD_SUCCESS: 'Added to cart!',
    CART_REMOVE_SUCCESS: 'Removed from cart',
    CART_UPDATE_SUCCESS: 'Cart updated!',
    ORDER_SUCCESS: 'Order placed successfully!'
};

// Export all objects globally
window.API_CONFIG = API_CONFIG;
window.STOREFRONT_CONFIG = STOREFRONT_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.ENVIRONMENT = ENVIRONMENT;
window.DYNATRACE_CONFIG = DYNATRACE_CONFIG;
window.PRODUCT_CONFIG = PRODUCT_CONFIG;
window.SUCCESS_MESSAGES = SUCCESS_MESSAGES;
window.Utils = Utils;
window.EventBus = EventBus;
window.APIError = APIError;
window.logger = logger;
window.buildUnifiedApiUrl = buildUnifiedApiUrl;
window.buildStorefrontApiUrl = buildStorefrontApiUrl;
window.makeStorefrontApiRequest = makeStorefrontApiRequest;
