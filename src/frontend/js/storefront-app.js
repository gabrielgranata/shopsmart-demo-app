// Main Application Module

// Safe logger wrapper
function safeLog(method, ...args) {
    if (window.logger && typeof window.logger[method] === 'function') {
        try {
            window.logger[method](...args);
        } catch (e) {
            console.warn('Logger error:', e);
        }
    }
}

class StorefrontApp {
    constructor() {
        this.isInitialized = false;
        this.performanceMetrics = {
            pageLoadStart: performance.now(),
            firstContentfulPaint: null,
            domContentLoaded: null,
            windowLoaded: null
        };
        
        this.initializeOpenTelemetry();
        this.initializeApp();
        this.bindGlobalEvents();
        this.trackPerformanceMetrics();
    }
    
    initializeOpenTelemetry() {
        // OpenTelemetry is initialized in config.js
        // This method ensures compatibility with the app initialization
        console.log('OpenTelemetry initialization handled by config.js');
    }
    
    initializeUserJourneyTracking() {
        // Track page views
        window.logger.info('page_load', 'load');
        
        // Track user interactions
        document.addEventListener('click', (e) => {
            const target = e.target;
            const actionName = this.getActionName(target);
            
            if (actionName) {
                window.logger.info(actionName, 'click');
                window.logger.info(actionName, {
                    element_type: target.tagName.toLowerCase(),
                    element_class: target.className,
                    element_id: target.id,
                    page_url: window.location.href
                });
            }
        });
        
        // Track form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const formName = form.id || form.className || 'unknown_form';
            
            window.logger.info(`form_submit_${formName}`, 'submit');
            window.logger.info(`form_submit_${formName}`, {
                form_id: form.id,
                form_action: form.action,
                page_url: window.location.href
            });
        });
        
        // Track navigation
        window.addEventListener('beforeunload', () => {
            window.logger.info('page_load');
        });
    }
    
    initializePerformanceTracking() {
        // Track Core Web Vitals
        this.trackCoreWebVitals();
        
        // Track custom performance metrics
        this.trackCustomPerformanceMetrics();
        
        // Track API performance
        this.trackApiPerformance();
    }
    
    initializeBusinessEventTracking() {
        // Track e-commerce events
        EventBus.on('cart:add-item', (item) => {
            window.logger.info('add_to_cart', {
                product_id: item.id,
                product_name: item.name,
                product_price: item.price,
                quantity: item.quantity,
                cart_value: this.getCartValue()
            });
        });
        
        EventBus.on('cart:remove-item', (itemId) => {
            window.logger.info('remove_from_cart', {
                product_id: itemId,
                cart_value: this.getCartValue()
            });
        });
        
        EventBus.on('checkout:start', () => {
            window.logger.info('checkout_start', {
                cart_value: this.getCartValue(),
                cart_items: this.getCartItemCount()
            });
        });
        
        EventBus.on('order:complete', (orderData) => {
            window.logger.info('purchase', {
                order_id: orderData.orderId,
                order_value: orderData.summary.total,
                order_items: orderData.items.length,
                customer_type: this.getCustomerType()
            });
        });
        
        // Track authentication events
        EventBus.on('auth:login', (user) => {
            window.logger.info('user_login', {
                user_id: user.id,
                user_type: user.type || 'customer'
            });
        });
        
        EventBus.on('auth:logout', () => {
            window.logger.info('user_logout', {});
        });
        
        // Track search events
        EventBus.on('search:performed', (searchData) => {
            window.logger.info('search', {
                search_query: searchData.query,
                search_results: searchData.results,
                search_filters: searchData.filters
            });
        });
    }
    
    trackCoreWebVitals() {
        // First Contentful Paint (FCP)
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    this.performanceMetrics.firstContentfulPaint = entry.startTime;
                    window.logger.info('first_contentful_paint', entry.startTime, {
                        page_url: window.location.href
                    });
                }
            }
        }).observe({ entryTypes: ['paint'] });
        
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            
            window.logger.info('largest_contentful_paint', lastEntry.startTime, {
                page_url: window.location.href,
                element: lastEntry.element?.tagName
            });
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay (FID)
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                window.logger.info('first_input_delay', entry.processingStart - entry.startTime, {
                    page_url: window.location.href,
                    event_type: entry.name
                });
            }
        }).observe({ entryTypes: ['first-input'] });
        
        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            
            window.logger.info('cumulative_layout_shift', clsValue, {
                page_url: window.location.href
            });
        }).observe({ entryTypes: ['layout-shift'] });
    }
    
    trackCustomPerformanceMetrics() {
        // Track DOM content loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.performanceMetrics.domContentLoaded = performance.now();
            window.logger.info('dom_content_loaded', this.performanceMetrics.domContentLoaded, {
                page_url: window.location.href
            });
        });
        
        // Track window loaded
        window.addEventListener('load', () => {
            this.performanceMetrics.windowLoaded = performance.now();
            window.logger.info('window_loaded', this.performanceMetrics.windowLoaded, {
                page_url: window.location.href
            });
            
            // Track total page load time
            const totalLoadTime = this.performanceMetrics.windowLoaded - this.performanceMetrics.pageLoadStart;
            window.logger.info('total_page_load_time', totalLoadTime, {
                page_url: window.location.href
            });
        });
        
        // Track resource loading performance
        window.addEventListener('load', () => {
            const resources = performance.getEntriesByType('resource');
            
            resources.forEach(resource => {
                if (resource.duration > 1000) { // Track slow resources (>1s)
                    window.logger.info('slow_resource_load', resource.duration, {
                        resource_name: resource.name,
                        resource_type: resource.initiatorType,
                        page_url: window.location.href
                    });
                }
            });
        });
    }
    
    trackApiPerformance() {
        // Override fetch to track API calls
        const originalFetch = window.fetch;
        
        window.fetch = async function(...args) {
            const startTime = performance.now();
            const url = args[0];
            
            try {
                const response = await originalFetch.apply(this, args);
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                // Track API performance
                window.logger.info('api_response_time', duration, {
                    api_url: url,
                    status_code: response.status,
                    method: args[1]?.method || 'GET'
                });
                
                // Track API errors
                if (!response.ok) {
                    window.logger.info('api_error', {
                        api_url: url,
                        status_code: response.status,
                        method: args[1]?.method || 'GET'
                    });
                }
                
                return response;
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                // Track API failures
                window.logger.error(error, {
                    api_url: url,
                    duration: duration,
                    method: args[1]?.method || 'GET'
                });
                
                throw error;
            }
        };
    }
    
    initializeApp() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    }
    
    async onDOMReady() {
        this.isInitialized = true;
        
        // Track page load completion
        safeLog('info', 'app_initialized', 'load');
        
        // Initialize API client with error handling
        await this.initializeAPIClient();
        
        // Initialize error handling
        this.initializeErrorHandling();
        
        // Track initial page view
        this.trackPageView();
        
        console.log('Artisan Desks Storefront initialized');
    }
    
    async initializeAPIClient() {
        try {
            // Check if apiClient is available, but don't fail if it's not
            if (!window.apiClient) {
                console.warn('API Client not available, skipping health check');
                return;
            }
            
            // Perform health check on initialization
            const healthStatus = await window.apiClient.healthCheck();
            console.log('Service health status:', healthStatus);
            
            // Track service health in Dynatrace
            if (healthStatus.status) {
                safeLog('info', `service_health_overall`, healthStatus.status === 'healthy' ? 1 : 0, {
                    response_time: healthStatus.responseTime || 0,
                    error: healthStatus.error || null
                });
            }
            
            // Check if service is unhealthy
            if (healthStatus.status === 'unhealthy') {
                const errorMessage = `Services are currently experiencing issues. Please try again later.`;
                safeLog('error', new Error('Service health check failed'), {
                    health_status: healthStatus
                });
                
                // Show user-friendly error message
                this.showServiceUnavailableMessage(['backend services']);
            }
            
            // Set up periodic health checks
            this.setupHealthMonitoring();
            
            // Set up API client event listeners
            this.setupAPIClientEventListeners();
            
        } catch (error) {
            console.error('Failed to initialize API client:', error);
            safeLog('error', error, {
                context: 'api_client_initialization'
            });
            
            // Don't show error message if apiClient is just not available
            if (window.apiClient) {
                this.showConnectionErrorMessage();
            }
        }
    }
    
    setupHealthMonitoring() {
        setInterval(async () => {
            try {
                const status = await apiClient.healthCheck();
                
                // Track health metrics
                Object.entries(status).forEach(([service, serviceStatus]) => {
                    window.logger.info(`service_health_${service}`, serviceStatus.status === 'healthy' ? 1 : 0, {
                        service_name: service,
                        response_time: serviceStatus.responseTime || 0
                    });
                });
                
                EventBus.emit('health:update', status);
            } catch (error) {
                console.error('Health check failed:', error);
                window.logger.error(error, {
                    context: 'health_monitoring'
                });
            }
        }, 60000); // Check every minute
    }
    
    setupAPIClientEventListeners() {
        // Listen for authentication failures
        EventBus.on('auth:failure', (data) => {
            window.logger.info('authentication_failure', {
                reason: data.reason,
                timestamp: Date.now()
            });
            
            this.showAuthenticationErrorMessage();
        });
        
        // Listen for circuit breaker events
        EventBus.on('circuit:open', (data) => {
            window.logger.info('circuit_breaker_open', {
                service: data.service,
                failure_count: data.failureCount,
                timestamp: Date.now()
            });
            
            this.showServiceDegradationMessage(data.service);
        });
        
        // Listen for circuit breaker recovery
        EventBus.on('circuit:closed', (data) => {
            window.logger.info('circuit_breaker_closed', {
                service: data.service,
                timestamp: Date.now()
            });
            
            this.showServiceRecoveryMessage(data.service);
        });
    }
    
    showServiceUnavailableMessage(services) {
        const message = `Some services are temporarily unavailable: ${services.join(', ')}. We're working to restore them. Please try again in a few minutes.`;
        this.showNotification(message, 'warning', 10000);
    }
    
    showConnectionErrorMessage() {
        const message = 'Unable to connect to our services. Please check your internet connection and try refreshing the page.';
        this.showNotification(message, 'error', 0); // Don't auto-hide
    }
    
    showAuthenticationErrorMessage() {
        const message = 'Your session has expired. Please log in again to continue.';
        this.showNotification(message, 'warning', 8000);
    }
    
    showServiceDegradationMessage(service) {
        const message = `The ${service} service is experiencing issues. Some features may be temporarily unavailable.`;
        this.showNotification(message, 'warning', 5000);
    }
    
    showServiceRecoveryMessage(service) {
        const message = `The ${service} service has been restored. All features are now available.`;
        this.showNotification(message, 'success', 3000);
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add to page
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Auto-hide if duration is set
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
        
        // Track notification display
        safeLog('info', 'notification_shown', {
            message: message,
            type: type,
            duration: duration
        });
    }
    
    initializeErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            window.logger.error(event.error || new Error(event.message), {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                page_url: window.location.href
            });
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            window.logger.error(event.reason, {
                type: 'unhandled_promise_rejection',
                page_url: window.location.href
            });
        });
    }
    
    bindGlobalEvents() {
        // Track scroll depth
        let maxScrollDepth = 0;
        const trackScrollDepth = Utils.throttle(() => {
            const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            
            if (scrollDepth > maxScrollDepth) {
                maxScrollDepth = scrollDepth;
                
                // Track scroll milestones
                if (scrollDepth >= 25 && maxScrollDepth < 25) {
                    window.logger.info('scroll_depth_25', { page_url: window.location.href });
                } else if (scrollDepth >= 50 && maxScrollDepth < 50) {
                    window.logger.info('scroll_depth_50', { page_url: window.location.href });
                } else if (scrollDepth >= 75 && maxScrollDepth < 75) {
                    window.logger.info('scroll_depth_75', { page_url: window.location.href });
                } else if (scrollDepth >= 100 && maxScrollDepth < 100) {
                    window.logger.info('scroll_depth_100', { page_url: window.location.href });
                }
            }
        }, 1000);
        
        window.addEventListener('scroll', trackScrollDepth);
        
        // Track time on page
        let timeOnPage = 0;
        const trackTimeOnPage = () => {
            timeOnPage += 10; // Track every 10 seconds
            
            // Send time milestones
            if (timeOnPage % 30 === 0) { // Every 30 seconds
                safeLog('info', 'time_on_page', timeOnPage, {
                    page_url: window.location.href
                });
            }
        };
        
        setInterval(trackTimeOnPage, 10000);
        
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                window.logger.info('page_hidden', {
                    time_on_page: timeOnPage,
                    page_url: window.location.href
                });
            } else {
                window.logger.info('page_visible', {
                    page_url: window.location.href
                });
            }
        });
    }
    
    trackPerformanceMetrics() {
        // Track memory usage (if available)
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                safeLog('info', 'memory_usage', memory.usedJSHeapSize, {
                    total_heap_size: memory.totalJSHeapSize,
                    heap_size_limit: memory.jsHeapSizeLimit,
                    page_url: window.location.href
                });
            }, 30000); // Every 30 seconds
        }
        
        // Track connection quality
        if ('connection' in navigator) {
            const connection = navigator.connection;
            safeLog('info', 'connection_speed', connection.downlink, {
                connection_type: connection.effectiveType,
                rtt: connection.rtt,
                page_url: window.location.href
            });
        }
    }
    
    trackPageView() {
        window.logger.info('page_view', {
            page_url: window.location.href,
            page_title: document.title,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight
        });
    }
    
    trackCustomEvent(eventType, data) {
        // Store events for potential batch sending
        const event = {
            type: eventType,
            data: data,
            timestamp: Date.now(),
            session_id: this.getSessionId(),
            user_id: this.getUserId()
        };
        
        // In a real implementation, these would be sent to Dynatrace
        console.log('[Dynatrace Custom Event]', event);
    }
    
    getActionName(element) {
        // Determine action name based on element
        if (element.dataset.action) {
            return element.dataset.action;
        }
        
        if (element.classList.contains('btn')) {
            return element.textContent.trim().toLowerCase().replace(/\s+/g, '_');
        }
        
        if (element.tagName === 'A') {
            return 'link_click';
        }
        
        if (element.type === 'submit') {
            return 'form_submit';
        }
        
        return null;
    }
    
    getCartValue() {
        const cartManager = window.cartManager;
        return cartManager ? cartManager.getSubtotal() : 0;
    }
    
    getCartItemCount() {
        const cartManager = window.cartManager;
        return cartManager ? cartManager.getTotalItems() : 0;
    }
    
    getCustomerType() {
        const authManager = window.authManager;
        const user = authManager ? authManager.getCurrentUser() : null;
        return user ? (user.type || 'registered') : 'guest';
    }
    
    getSessionId() {
        let sessionId = sessionStorage.getItem('session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('session_id', sessionId);
        }
        return sessionId;
    }
    
    getUserId() {
        const authManager = window.authManager;
        const user = authManager ? authManager.getCurrentUser() : null;
        return user ? user.id : 'anonymous';
    }
}

// Make StorefrontApp globally available
window.StorefrontApp = StorefrontApp;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.storefrontApp = new StorefrontApp();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorefrontApp;
}