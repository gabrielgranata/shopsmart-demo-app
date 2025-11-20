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
    },
    
    // Legacy service configurations (for backward compatibility during migration)
    PRODUCT_SERVICE: {
        BASE_URL: 'http://localhost:5000',
        ENDPOINTS: {
            PRODUCTS: '/products',
            PRODUCT_DETAIL: '/products/{id}',
            CATEGORIES: '/products/categories',
            AVAILABILITY: '/products/{id}/availability'
        }
    },
    
    AUTH_SERVICE: {
        BASE_URL: 'https://your-api-gateway-url.execute-api.region.amazonaws.com/prod',
        ENDPOINTS: {
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            VALIDATE: '/auth/validate/{sessionId}',
            CART: '/auth/cart/{userId}',
            CART_ITEMS: '/auth/cart/{userId}/items',
            CART_ITEM: '/auth/cart/{userId}/items/{itemId}',
            CLEAR_CART: '/auth/cart/{userId}'
        }
    },
    
    ORDER_SERVICE: {
        BASE_URL: 'http://localhost:8000',
        ENDPOINTS: {
            ORDERS: '/orders',
            ORDER_DETAIL: '/orders/{orderId}',
            USER_ORDERS: '/orders/{userId}',
            ORDER_STATUS: '/orders/{orderId}/status'
        }
    }
};

// Dynatrace Configuration - Loaded at runtime
let DYNATRACE_CONFIG = {
    endpoint: '',
    apiToken: '',
    serviceName: 'shopsmart-frontend',
    serviceVersion: '1.0.0',
    environment: 'production'
};

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

// Application Configuration
const APP_CONFIG = {
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
    },
    USER_STORAGE_KEY: 'shopsmart_user',
    CART_STORAGE_KEY: 'shopsmart_cart'
};

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
            const { WebTracerProvider } = await import('https://unpkg.com/@opentelemetry/sdk-trace-web@1.17.0/build/esm/index.js');
            const { Resource } = await import('https://unpkg.com/@opentelemetry/resources@1.17.0/build/esm/index.js');
            const { SemanticResourceAttributes } = await import('https://unpkg.com/@opentelemetry/semantic-conventions@1.17.0/build/esm/index.js');
            const { OTLPTraceExporter } = await import('https://unpkg.com/@opentelemetry/exporter-trace-otlp-http@0.44.0/build/esm/index.js');
            const { BatchSpanProcessor } = await import('https://unpkg.com/@opentelemetry/sdk-trace-base@1.17.0/build/esm/index.js');
            
            const provider = new WebTracerProvider({
                resource: new Resource({
                    [SemanticResourceAttributes.SERVICE_NAME]: DYNATRACE_CONFIG.serviceName,
                    [SemanticResourceAttributes.SERVICE_VERSION]: DYNATRACE_CONFIG.serviceVersion,
                    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: DYNATRACE_CONFIG.environment,
                }),
            });
            
            const exporter = new OTLPTraceExporter({
                url: `${DYNATRACE_CONFIG.endpoint}/api/v2/otlp/v1/traces`,
                headers: {
                    'Authorization': `Api-Token ${DYNATRACE_CONFIG.apiToken}`,
                },
            });
            
            provider.addSpanProcessor(new BatchSpanProcessor(exporter));
            provider.register();
            
            this.tracer = provider.getTracer(DYNATRACE_CONFIG.serviceName, DYNATRACE_CONFIG.serviceVersion);
            this.initialized = true;
            
            console.log('OpenTelemetry initialized successfully');
        } catch (error) {
            console.error('Failed to initialize OpenTelemetry:', error);
        }
    }
    
    log(level, message, data = {}) {
        if (!this.enabled || !this.tracer) {
            console[level.toLowerCase()](message, data);
            return;
        }
        
        const span = this.tracer.startSpan(`frontend.${level.toLowerCase()}`);
        
        span.setAttributes({
            'log.level': level,
            'log.message': message,
            'service.name': DYNATRACE_CONFIG.serviceName,
            'service.version': DYNATRACE_CONFIG.serviceVersion,
            'deployment.environment': DYNATRACE_CONFIG.environment,
            ...Object.fromEntries(
                Object.entries(data).map(([k, v]) => [`log.${k}`, String(v)])
            )
        });
        
        span.end();
        
        // Also log to console for debugging
        console[level.toLowerCase()](message, data);
    }
    
    info(message, data) { this.log('INFO', message, data); }
    warn(message, data) { this.log('WARN', message, data); }
    error(message, data) { this.log('ERROR', message, data); }
    debug(message, data) { this.log('DEBUG', message, data); }
}

// Initialize logger
const logger = new OpenTelemetryLogger();

// Initialize OpenTelemetry immediately
if (typeof window !== 'undefined') {
    logger.initialize();
}

// Environment Detection
const ENVIRONMENT = {
    isDevelopment: () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isProduction: () => !ENVIRONMENT.isDevelopment()
};

// Update API URLs based on environment
if (ENVIRONMENT.isDevelopment()) {
    // Development URLs - use relative URLs to current domain (CloudFront will route to API Gateway)
    API_CONFIG.API_GATEWAY.BASE_URL = '';
    
    // Legacy service URLs for backward compatibility
    API_CONFIG.PRODUCT_SERVICE.BASE_URL = 'http://localhost:5000';
    API_CONFIG.ORDER_SERVICE.BASE_URL = 'http://localhost:8000';
} else {
    // Production URLs - use relative URLs (CloudFront routes /api/* to API Gateway Router)
    API_CONFIG.API_GATEWAY.BASE_URL = '';
    
    // Legacy service URLs (should not be used in production)
    API_CONFIG.PRODUCT_SERVICE.BASE_URL = 'https://your-product-service-alb.region.elb.amazonaws.com';
    API_CONFIG.ORDER_SERVICE.BASE_URL = 'https://your-order-service-alb.region.elb.amazonaws.com';
}

// Utility function to build API URLs
function buildApiUrl(service, endpoint, params = {}) {
    let url;
    
    // Use unified API Gateway for new endpoints
    if (service === 'API_GATEWAY' || API_CONFIG.API_GATEWAY.ENDPOINTS[endpoint]) {
        url = API_CONFIG.API_GATEWAY.BASE_URL + API_CONFIG.API_GATEWAY.ENDPOINTS[endpoint];
    } else {
        // Legacy service URLs (for backward compatibility)
        url = API_CONFIG[service].BASE_URL + API_CONFIG[service].ENDPOINTS[endpoint];
    }
    
    // Replace path parameters
    Object.keys(params).forEach(key => {
        url = url.replace(`{${key}}`, params[key]);
    });
    
    return url;
}

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

// New utility function for unified API Gateway endpoints
// Health check endpoint configuration
const HEALTH_CONFIG = {
    BASE_URL: '', // Use root path for health endpoint
    ENDPOINT: '/health'
};

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

// Enhanced API request function with OpenTelemetry tracing
async function makeApiRequest(url, options = {}) {
    const startTime = performance.now();
    const traceId = generateTraceId();
    
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Trace-Id': traceId
        },
        mode: 'cors',
        credentials: 'omit'
    };
    
    const requestOptions = { ...defaultOptions, ...options };
    
    // Merge headers
    if (options.headers) {
        requestOptions.headers = { ...defaultOptions.headers, ...options.headers };
    }
    
    // Create OpenTelemetry span if tracer is available
    let span = null;
    if (logger.tracer) {
        span = logger.tracer.startSpan(`http.client.${requestOptions.method.toLowerCase()}`);
        span.setAttributes({
            'http.method': requestOptions.method,
            'http.url': url,
            'http.user_agent': navigator.userAgent,
            'trace.id': traceId
        });
    }
    
    logger.info('API Request Started', {
        url: url,
        method: requestOptions.method,
        traceId: traceId
    });
    
    try {
        const response = await fetch(url, requestOptions);
        const duration = performance.now() - startTime;
        
        if (span) {
            span.setAttributes({
                'http.status_code': response.status,
                'http.response_size': response.headers.get('content-length') || 0,
                'http.duration_ms': duration
            });
        }
        
        if (!response.ok) {
            const error = new Error(`HTTP error! status: ${response.status}`);
            if (span) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message }); // ERROR
            }
            
            logger.error('API Request Failed', {
                url: url,
                status: response.status,
                statusText: response.statusText,
                duration: duration,
                traceId: traceId
            });
            throw error;
        }
        
        if (span) {
            span.setStatus({ code: 1 }); // OK
        }
        
        logger.info('API Request Completed', {
            url: url,
            status: response.status,
            duration: duration,
            traceId: traceId
        });
        
        // Handle different content types
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        const duration = performance.now() - startTime;
        
        if (span) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message }); // ERROR
        }
        
        logger.error('API Request Error', {
            url: url,
            error: error.message,
            duration: duration,
            traceId: traceId
        });
        throw error;
    } finally {
        if (span) {
            span.end();
        }
    }
}

// Generate trace ID for request correlation
function generateTraceId() {
    return 'trace-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
}

// CORS preflight check utility
async function checkCorsSupport(serviceUrl) {
    try {
        const response = await fetch(serviceUrl + '/health', {
            method: 'OPTIONS',
            headers: {
                'Origin': window.location.origin,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });
        return response.ok;
    } catch (error) {
        logger.warn('CORS preflight check failed', { serviceUrl: serviceUrl, error: error.message });
        return false;
    }
}

// Export for use in other modules
window.API_CONFIG = API_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.ENVIRONMENT = ENVIRONMENT;
window.DYNATRACE_CONFIG = DYNATRACE_CONFIG;
window.Utils = Utils;
window.EventBus = EventBus;
window.logger = logger;
window.buildApiUrl = buildApiUrl;
window.buildUnifiedApiUrl = buildUnifiedApiUrl;
window.makeApiRequest = makeApiRequest;
window.checkCorsSupport = checkCorsSupport;