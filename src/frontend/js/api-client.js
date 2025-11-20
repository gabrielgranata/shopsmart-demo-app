/**
 * Centralized API Client with Error Handling, Retry Logic, and Circuit Breaker
 * Implements comprehensive error handling and resilience patterns for service communication
 */

class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000, monitoringPeriod = 10000) {
        this.threshold = threshold;
        this.timeout = timeout;
        this.monitoringPeriod = monitoringPeriod;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.nextAttempt = Date.now();
        this.monitoringInterval = null;
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
                this.state = 'HALF_OPEN';
                console.log('Circuit breaker moving to HALF_OPEN state');
            }
        }, this.monitoringPeriod);
    }
    
    async execute(operation) {
        if (this.state === 'OPEN') {
            throw new Error('Circuit breaker is OPEN - service unavailable');
        }
        
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            console.log('Circuit breaker reset to CLOSED state');
        }
    }
    
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.log(`Circuit breaker opened due to ${this.failureCount} failures`);
        }
    }
    
    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            nextAttempt: this.nextAttempt
        };
    }
    
    destroy() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }
}

class APIClient {
    constructor() {
        this.baseURL = '';
        this.defaultTimeout = 10000;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.circuitBreakers = new Map();
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.errorInterceptors = [];
        
        // Initialize circuit breakers for each service
        this.initializeCircuitBreakers();
        
        // Setup default interceptors
        this.setupDefaultInterceptors();
        
        // Track request metrics
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            requestTimes: []
        };
    }
    
    initializeCircuitBreakers() {
        const services = ['products', 'auth', 'orders'];
        services.forEach(service => {
            this.circuitBreakers.set(service, new CircuitBreaker(5, 60000, 10000));
        });
    }
    
    setupDefaultInterceptors() {
        // Request interceptor for authentication
        this.addRequestInterceptor((config) => {
            const user = Utils.storage.get(APP_CONFIG.USER_STORAGE_KEY);
            if (user && user.token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${user.token}`;
            }
            
            // Add request ID for tracing
            config.headers = config.headers || {};
            config.headers['X-Request-ID'] = this.generateRequestId();
            
            // Add timestamp for performance tracking
            config._startTime = Date.now();
            
            return config;
        });
        
        // Response interceptor for logging and metrics
        this.addResponseInterceptor(
            (response, config) => {
                const duration = Date.now() - config._startTime;
                this.updateMetrics(true, duration);
                this.logRequest(config, response, duration);
                return response;
            },
            (error, config) => {
                const duration = Date.now() - (config._startTime || Date.now());
                this.updateMetrics(false, duration);
                this.logError(config, error, duration);
                return Promise.reject(error);
            }
        );
        
        // Error interceptor for token refresh
        this.addErrorInterceptor(async (error, config) => {
            if (error.status === 401 && !config._retry) {
                try {
                    await this.refreshToken();
                    config._retry = true;
                    return this.request(config);
                } catch (refreshError) {
                    this.handleAuthenticationFailure();
                    throw refreshError;
                }
            }
            throw error;
        });
    }
    
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    
    addResponseInterceptor(successInterceptor, errorInterceptor) {
        this.responseInterceptors.push({ success: successInterceptor, error: errorInterceptor });
    }
    
    addErrorInterceptor(interceptor) {
        this.errorInterceptors.push(interceptor);
    }
    
    async request(config) {
        // Apply request interceptors
        let processedConfig = { ...config };
        for (const interceptor of this.requestInterceptors) {
            processedConfig = await interceptor(processedConfig);
        }
        
        // Determine service for circuit breaker
        const service = this.getServiceFromUrl(processedConfig.url);
        const circuitBreaker = this.circuitBreakers.get(service);
        
        if (circuitBreaker) {
            return circuitBreaker.execute(() => this.executeRequest(processedConfig));
        } else {
            return this.executeRequest(processedConfig);
        }
    }
    
    async executeRequest(config) {
        const {
            url,
            method = 'GET',
            data,
            headers = {},
            timeout = this.defaultTimeout,
            retries = this.maxRetries,
            retryDelay = this.retryDelay
        } = config;
        
        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                this.metrics.totalRequests++;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const fetchConfig = {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    },
                    signal: controller.signal
                };
                
                if (data && method !== 'GET') {
                    fetchConfig.body = JSON.stringify(data);
                }
                
                const response = await fetch(url, fetchConfig);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorData = await this.parseErrorResponse(response);
                    const error = new APIError(
                        errorData.message || `HTTP ${response.status}`,
                        response.status,
                        errorData.code,
                        errorData.details
                    );
                    throw error;
                }
                
                const responseData = await response.json();
                
                // Apply response interceptors
                let processedResponse = responseData;
                for (const interceptor of this.responseInterceptors) {
                    if (interceptor.success) {
                        processedResponse = await interceptor.success(processedResponse, config);
                    }
                }
                
                return processedResponse;
                
            } catch (error) {
                lastError = error;
                
                // Apply error interceptors
                for (const interceptor of this.responseInterceptors) {
                    if (interceptor.error) {
                        try {
                            return await interceptor.error(error, config);
                        } catch (interceptorError) {
                            lastError = interceptorError;
                        }
                    }
                }
                
                // Apply error-specific interceptors
                for (const interceptor of this.errorInterceptors) {
                    try {
                        return await interceptor(error, config);
                    } catch (interceptorError) {
                        lastError = interceptorError;
                    }
                }
                
                // Retry logic
                if (attempt < retries && this.shouldRetry(error)) {
                    const delay = this.calculateRetryDelay(attempt, retryDelay);
                    console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1})`);
                    await this.sleep(delay);
                    continue;
                }
                
                break;
            }
        }
        
        throw lastError;
    }
    
    async parseErrorResponse(response) {
        try {
            return await response.json();
        } catch {
            return {
                message: response.statusText || 'Unknown error',
                code: 'UNKNOWN_ERROR'
            };
        }
    }
    
    shouldRetry(error) {
        // Retry on network errors, timeouts, and 5xx server errors
        return (
            error.name === 'AbortError' ||
            error.name === 'TypeError' ||
            (error.status >= 500 && error.status < 600) ||
            error.status === 429 // Rate limiting
        );
    }
    
    calculateRetryDelay(attempt, baseDelay) {
        // Exponential backoff with jitter
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getServiceFromUrl(url) {
        if (url.includes('/api/products') || url.includes('/products')) return 'products';
        if (url.includes('/api/auth') || url.includes('/auth')) return 'auth';
        if (url.includes('/api/orders') || url.includes('/orders')) return 'orders';
        return 'unknown';
    }
    
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    updateMetrics(success, duration) {
        if (success) {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
        }
        
        this.metrics.requestTimes.push(duration);
        if (this.metrics.requestTimes.length > 100) {
            this.metrics.requestTimes.shift();
        }
        
        this.metrics.averageResponseTime = 
            this.metrics.requestTimes.reduce((a, b) => a + b, 0) / this.metrics.requestTimes.length;
    }
    
    logRequest(config, response, duration) {
        console.log(`API Request: ${config.method || 'GET'} ${config.url} - ${duration}ms`, {
            requestId: config.headers['X-Request-ID'],
            duration,
            status: 'success'
        });
        
        // Send to telemetry collector
        if (window.telemetryClient) {
            window.telemetryClient.sendTrace(`http.client.request`, {
                'http.url': config.url,
                'http.method': config.method || 'GET',
                'http.status_code': 200,
                'http.request_id': config.headers['X-Request-ID']
            }, duration);
        }
    }
    
    logError(config, error, duration) {
        console.error(`API Error: ${config.method || 'GET'} ${config.url} - ${duration}ms`, {
            requestId: config.headers['X-Request-ID'],
            duration,
            error: error.message,
            status: error.status || 'unknown'
        });
        
        // Send to telemetry collector
        if (window.telemetryClient) {
            window.telemetryClient.sendTrace(`http.client.request`, {
                'http.url': config.url,
                'http.method': config.method || 'GET',
                'http.status_code': error.status || 0,
                'http.request_id': config.headers['X-Request-ID'],
                'error': true,
                'error.message': error.message
            }, duration);
        }
    }
    
    async refreshToken() {
        const user = Utils.storage.get(APP_CONFIG.USER_STORAGE_KEY);
        if (!user || !user.refreshToken) {
            throw new Error('No refresh token available');
        }
        
        try {
            const response = await fetch(buildUnifiedApiUrl('AUTH_REFRESH'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken: user.refreshToken
                })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            const updatedUser = {
                ...user,
                token: data.token,
                refreshToken: data.refreshToken || user.refreshToken
            };
            
            Utils.storage.set(APP_CONFIG.USER_STORAGE_KEY, updatedUser);
            return data.token;
        } catch (error) {
            console.error('Token refresh failed:', error);
            throw error;
        }
    }
    
    handleAuthenticationFailure() {
        Utils.storage.remove(APP_CONFIG.USER_STORAGE_KEY);
        Utils.storage.remove(APP_CONFIG.CART_STORAGE_KEY);
        
        // Emit authentication failure event
        EventBus.emit('auth:failure', { reason: 'token_expired' });
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('login')) {
            window.location.href = '/login';
        }
    }
    
    // Convenience methods
    get(url, params = {}, config = {}) {
        const searchParams = new URLSearchParams(params);
        const fullUrl = searchParams.toString() ? `${url}?${searchParams}` : url;
        return this.request({ url: fullUrl, method: 'GET', ...config });
    }
    
    post(url, data = {}, config = {}) {
        return this.request({ url, method: 'POST', data, ...config });
    }
    
    put(url, data = {}, config = {}) {
        return this.request({ url, method: 'PUT', data, ...config });
    }
    
    delete(url, config = {}) {
        return this.request({ url, method: 'DELETE', ...config });
    }
    
    patch(url, data = {}, config = {}) {
        return this.request({ url, method: 'PATCH', data, ...config });
    }
    
    // Health check methods
    async healthCheck() {
        try {
            const startTime = Date.now();
            const response = await this.get(buildUnifiedApiUrl('HEALTH'));
            return {
                status: 'healthy',
                responseTime: Date.now() - startTime,
                details: response
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            circuitBreakers: Object.fromEntries(
                Array.from(this.circuitBreakers.entries()).map(([service, cb]) => [
                    service,
                    cb.getState()
                ])
            )
        };
    }
    
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            requestTimes: []
        };
    }
    
    destroy() {
        this.circuitBreakers.forEach(cb => cb.destroy());
        this.circuitBreakers.clear();
    }
}

// APIError is defined in config.js

// Service-specific API clients
class ProductAPI {
    constructor(apiClient) {
        this.client = apiClient;
    }
    
    async getProducts(filters = {}) {
        return this.client.get(buildUnifiedApiUrl('PRODUCTS'), filters);
    }
    
    async getProduct(id) {
        return this.client.get(buildUnifiedApiUrl('PRODUCT_DETAIL', { id }));
    }
    
    async getCategories() {
        return this.client.get(buildUnifiedApiUrl('PRODUCT_CATEGORIES'));
    }
    
    async getMaterials() {
        return this.client.get(buildUnifiedApiUrl('PRODUCT_MATERIALS'));
    }
    
    async getStyles() {
        return this.client.get(buildUnifiedApiUrl('PRODUCT_STYLES'));
    }
    
    async reserveInventory(productId, quantity) {
        return this.client.post(buildUnifiedApiUrl('PRODUCT_RESERVE', { id: productId }), { quantity });
    }
    
    async checkAvailability(productId, quantity) {
        return this.client.post(buildUnifiedApiUrl('PRODUCT_AVAILABILITY', { id: productId }), { quantity });
    }
}

class AuthAPI {
    constructor(apiClient) {
        this.client = apiClient;
    }
    
    async login(credentials) {
        return this.client.post(buildUnifiedApiUrl('AUTH_LOGIN'), credentials);
    }
    
    async register(userData) {
        return this.client.post(buildUnifiedApiUrl('AUTH_REGISTER'), userData);
    }
    
    async logout() {
        return this.client.post(buildUnifiedApiUrl('AUTH_LOGOUT'));
    }
    
    async validateSession(sessionId) {
        return this.client.get(buildUnifiedApiUrl('AUTH_VALIDATE', { sessionId }));
    }
    
    async getProfile() {
        return this.client.get(buildUnifiedApiUrl('AUTH_PROFILE'));
    }
    
    async updateProfile(profileData) {
        return this.client.put(buildUnifiedApiUrl('AUTH_PROFILE'), profileData);
    }
    
    async getCart(userId) {
        return this.client.get(buildUnifiedApiUrl('AUTH_CART', { userId }));
    }
    
    async addToCart(userId, itemData) {
        return this.client.post(buildUnifiedApiUrl('AUTH_CART_ITEMS', { userId }), itemData);
    }
    
    async updateCartItem(userId, itemId, itemData) {
        return this.client.put(buildUnifiedApiUrl('AUTH_CART_ITEM', { userId, itemId }), itemData);
    }
    
    async removeCartItem(userId, itemId) {
        return this.client.delete(buildUnifiedApiUrl('AUTH_CART_ITEM', { userId, itemId }));
    }
    
    async clearCart(userId) {
        return this.client.delete(buildUnifiedApiUrl('AUTH_CLEAR_CART', { userId }));
    }
}

class OrderAPI {
    constructor(apiClient) {
        this.client = apiClient;
    }
    
    async createOrder(orderData) {
        return this.client.post(buildUnifiedApiUrl('ORDERS'), orderData);
    }
    
    async getOrder(orderId) {
        return this.client.get(buildUnifiedApiUrl('ORDER_DETAIL', { orderId }));
    }
    
    async getUserOrders(userId, params = {}) {
        return this.client.get(buildUnifiedApiUrl('USER_ORDERS', { userId }), params);
    }
    
    async updateOrderStatus(orderId, status) {
        return this.client.put(buildUnifiedApiUrl('ORDER_STATUS', { orderId }), { status });
    }
}

// Global API client instance
const apiClient = new APIClient();
const productAPI = new ProductAPI(apiClient);
const authAPI = new AuthAPI(apiClient);
const orderAPI = new OrderAPI(apiClient);

// Make available globally
window.apiClient = apiClient;
window.productAPI = productAPI;
window.authAPI = authAPI;
window.orderAPI = orderAPI;
window.APIError = APIError;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APIClient,
        APIError,
        CircuitBreaker,
        ProductAPI,
        AuthAPI,
        OrderAPI,
        apiClient,
        productAPI,
        authAPI,
        orderAPI
    };
}