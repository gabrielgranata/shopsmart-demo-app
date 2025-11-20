// Production API Configuration for Artisan Desk Storefront
// URLs are injected at deployment time
const API_CONFIG = {
    // Product Catalog Service (EC2)
    PRODUCT_SERVICE: {
        BASE_URL: window.PRODUCT_CATALOG_URL || '',
        ENDPOINTS: {
            PRODUCTS: '/products',
            PRODUCT_DETAIL: '/products/{id}',
            CATEGORIES: '/products/categories',
            AVAILABILITY: '/products/{id}/availability',
            HEALTH: '/health'
        }
    },
    
    // Authentication Service (Lambda via API Gateway)
    AUTH_SERVICE: {
        BASE_URL: window.AUTH_SERVICE_URL || '',
        ENDPOINTS: {
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            VALIDATE: '/auth/validate/{sessionId}',
            CART: '/auth/cart/{userId}',
            CART_ITEMS: '/auth/cart/{userId}/items'
        }
    },
    
    // Order Processing Service (ECS)
    ORDER_SERVICE: {
        BASE_URL: window.ORDER_PROCESSING_URL || '',
        ENDPOINTS: {
            ORDERS: '/orders',
            ORDER_DETAIL: '/orders/{id}',
            CREATE_ORDER: '/orders',
            HEALTH: '/health'
        }
    },
    
    // Request timeout in milliseconds
    TIMEOUT: 10000,
    
    // Retry configuration
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

// Application Configuration
const APP_CONFIG = {
    // Pagination
    PRODUCTS_PER_PAGE: 12,
    
    // Search debounce delay in milliseconds
    SEARCH_DEBOUNCE: 300,
    
    // Cart storage key
    CART_STORAGE_KEY: 'artisan_cart',
    
    // User storage key
    USER_STORAGE_KEY: 'artisan_user',
    
    // Session timeout in milliseconds (30 minutes)
    SESSION_TIMEOUT: 30 * 60 * 1000,
    
    // Notification auto-hide delay
    NOTIFICATION_DELAY: 5000
};

// Export for use in other modules
window.API_CONFIG = API_CONFIG;
window.APP_CONFIG = APP_CONFIG;