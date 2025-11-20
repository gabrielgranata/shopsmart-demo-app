// Shopping Cart Management Module
class CartManager {
    constructor() {
        this.cart = [];
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadCart();
    }
    
    initializeElements() {
        // Cart button in header
        this.cartBtn = document.getElementById('cart-btn');
        this.cartCount = document.getElementById('cart-count');
        
        // Cart modal
        this.cartModal = document.getElementById('cart-modal');
        this.cartContent = document.getElementById('cart-content');
    }
    
    bindEvents() {
        // Cart button click
        this.cartBtn.addEventListener('click', () => this.showCart());
        
        // EventBus subscriptions
        EventBus.on('cart:add-item', (item) => this.addItem(item));
        EventBus.on('cart:remove-item', (itemId) => this.removeItem(itemId));
        EventBus.on('cart:update-quantity', (data) => this.updateQuantity(data.itemId, data.quantity));
        EventBus.on('cart:clear', () => this.clearCart());
        EventBus.on('auth:logout', () => this.clearCart());
    }
    
    async loadCart() {
        const authManager = window.authManager;
        
        // First load from localStorage
        const savedCart = Utils.storage.get(APP_CONFIG.CART_STORAGE_KEY);
        if (savedCart && Array.isArray(savedCart)) {
            this.cart = savedCart;
        }
        
        if (authManager && authManager.isAuthenticated()) {
            try {
                const user = authManager.getCurrentUser();
                const userId = user?.id;
                const token = user?.token;
                if (userId && token) {
                    // Try to load cart from API
                    const response = await makeStorefrontApiRequest('CART_GET', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }, { userId });
                    
                    // Only override localStorage cart if API has items
                    if (response && response.items && response.items.length > 0) {
                        // Enrich cart items with product details if missing
                        const enrichedItems = await Promise.all(response.items.map(async (item) => {
                            // If item already has name and price, use it
                            if (item.name && item.price > 0) {
                                return { ...item, id: item.productId || item.id };
                            }
                            
                            // Otherwise fetch product details
                            try {
                                const productId = item.productId || item.id;
                                const product = await makeStorefrontApiRequest('PRODUCT_DETAIL', {}, { id: productId });
                                return {
                                    id: productId,
                                    name: product.name,
                                    price: product.price,
                                    quantity: item.quantity,
                                    image_url: product.image_url,
                                    crafting_time_months: product.crafting_time_months || 6
                                };
                            } catch (error) {
                                console.error('Failed to fetch product details:', error);
                                // Return item as-is if fetch fails
                                return { ...item, id: item.productId || item.id };
                            }
                        }));
                        
                        this.cart = enrichedItems;
                        this.saveCart(); // Save enriched cart to localStorage
                    }
                }
            } catch (error) {
                console.error('Failed to load cart from API:', error);
                // Keep localStorage cart on error
            }
        }
        
        this.updateCartDisplay();
    }
    
    saveCart() {
        Utils.storage.set(APP_CONFIG.CART_STORAGE_KEY, this.cart);
        this.updateCartDisplay();
        EventBus.emit('cart:updated', this.cart);
    }
    
    async addItem(item) {
        const authManager = window.authManager;
        if (!authManager || !authManager.isAuthenticated()) {
            NotificationManager.show('Please log in to add items to cart', 'warning');
            EventBus.emit('auth:show-login');
            return;
        }
        
        try {
            const userId = authManager.getCurrentUser()?.id;
            if (!userId) {
                throw new Error('User ID not found');
            }
            
            // Try to add item via API
            const user = authManager.getCurrentUser();
            const token = user?.token;
            if (token) {
                await makeStorefrontApiRequest('CART_ADD_ITEM', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        productId: item.id,
                        quantity: item.quantity || 1,
                        productData: {
                            name: item.name,
                            price: item.price,
                            image_url: item.image_url,
                            crafting_time_months: item.crafting_time_months
                        }
                    })
                }, { userId });
            }
            
            // Update local cart on success
            const existingItem = this.cart.find(cartItem => cartItem.id === item.id);
            if (existingItem) {
                existingItem.quantity += item.quantity || 1;
            } else {
                this.cart.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity || 1,
                    image_url: item.image_url,
                    crafting_time_months: item.crafting_time_months || 0,
                    addedAt: Date.now()
                });
            }
            
            this.saveCart();
            NotificationManager.show('Added to cart successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to add item to cart via API:', error);
            
            // Fallback to local storage
            const existingItem = this.cart.find(cartItem => cartItem.id === item.id);
            if (existingItem) {
                existingItem.quantity += item.quantity || 1;
            } else {
                this.cart.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity || 1,
                    image_url: item.image_url,
                    crafting_time_months: item.crafting_time_months || 0,
                    addedAt: Date.now()
                });
            }
            
            this.saveCart();
            NotificationManager.show('Added to cart (local storage)', 'success');
        }
    }
    
    removeItem(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.saveCart();
        NotificationManager.show(SUCCESS_MESSAGES.CART_REMOVE_SUCCESS, 'success');
    }
    
    updateQuantity(itemId, quantity) {
        const item = this.cart.find(cartItem => cartItem.id === itemId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(itemId);
            } else {
                item.quantity = quantity;
                this.saveCart();
                NotificationManager.show(SUCCESS_MESSAGES.CART_UPDATE_SUCCESS, 'success');
            }
        }
    }
    
    async clearCart() {
        // Clear backend cart if authenticated
        const authManager = window.authManager;
        if (authManager && authManager.isAuthenticated()) {
            try {
                const user = authManager.getCurrentUser();
                const token = user?.token;
                if (token) {
                    await makeStorefrontApiRequest('CART_CLEAR', {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }, { userId: user.id });
                }
            } catch (error) {
                console.error('Failed to clear cart via API:', error);
            }
        }
        
        // Clear local cart
        this.cart = [];
        this.saveCart();
    }
    
    showCart() {
        this.renderCartContent();
        this.cartModal.classList.remove('hidden');
    }
    
    renderCartContent() {
        if (this.cart.length === 0) {
            this.cartContent.innerHTML = this.createEmptyCartContent();
        } else {
            this.cartContent.innerHTML = this.createCartContent();
            this.bindCartEvents();
        }
    }
    
    createEmptyCartContent() {
        return `
            <div class="cart-empty">
                <h3>Your cart is empty</h3>
                <p>Discover our exquisite collection of handcrafted desks</p>
                <button class="btn btn-primary" onclick="closeModal('cart-modal'); scrollToCollection()">
                    Browse Collection
                </button>
            </div>
        `;
    }
    
    createCartContent() {
        const subtotal = this.getSubtotal();
        const totalItems = this.getTotalItems();
        
        return `
            <div class="cart-items">
                ${this.cart.map(item => this.createCartItem(item)).join('')}
            </div>
            
            <div class="cart-summary">
                <div class="summary-row">
                    <span>Items (${totalItems}):</span>
                    <span>${Utils.formatCurrency(subtotal)}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping:</span>
                    <span>Free</span>
                </div>
                <div class="summary-row total">
                    <span>Total:</span>
                    <span>${Utils.formatCurrency(subtotal)}</span>
                </div>
                
                <div class="cart-actions">
                    <button class="btn btn-outline" onclick="clearCart()">Clear Cart</button>
                    <button class="btn btn-primary btn-large" onclick="proceedToCheckout()">
                        Proceed to Checkout
                    </button>
                </div>
            </div>
        `;
    }
    
    createCartItem(item) {
        return `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="cart-item-image">
                    🪑
                </div>
                
                <div class="cart-item-info">
                    <h4>${Utils.sanitizeHtml(item.name)}</h4>
                    <div class="cart-item-price">${Utils.formatCurrency(item.price)} each</div>
                    ${item.crafting_time_months ? `<div class="cart-item-meta">Crafting time: ${item.crafting_time_months} months</div>` : ''}
                </div>
                
                <div class="cart-item-quantity">
                    <button class="quantity-btn" data-action="decrease" data-item-id="${item.id}">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="10" 
                           data-item-id="${item.id}">
                    <button class="quantity-btn" data-action="increase" data-item-id="${item.id}">+</button>
                </div>
                
                <div class="cart-item-total">
                    ${Utils.formatCurrency(item.price * item.quantity)}
                </div>
                
                <button class="btn btn-text cart-item-remove" data-action="remove" data-item-id="${item.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0,0 1,-2,2H7a2,2 0,0 1,-2,-2V6m3,0V4a2,2 0,0 1,2,-2h4a2,2 0,0 1,2,2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        `;
    }
    
    bindCartEvents() {
        // Quantity button events
        this.cartContent.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const itemId = e.target.dataset.itemId;
            
            if (!action || !itemId) return;
            
            switch (action) {
                case 'increase':
                    this.handleQuantityChange(itemId, 1);
                    break;
                case 'decrease':
                    this.handleQuantityChange(itemId, -1);
                    break;
                case 'remove':
                    this.removeItem(itemId);
                    this.renderCartContent(); // Re-render after removal
                    break;
            }
        });
        
        // Quantity input events
        this.cartContent.addEventListener('change', (e) => {
            if (e.target.classList.contains('quantity-input')) {
                const itemId = e.target.dataset.itemId;
                const newQuantity = parseInt(e.target.value);
                
                if (newQuantity > 0 && newQuantity <= 10) {
                    this.updateQuantity(itemId, newQuantity);
                    this.renderCartContent(); // Re-render to update totals
                } else {
                    e.target.value = this.cart.find(item => item.id === itemId)?.quantity || 1;
                }
            }
        });
    }
    
    handleQuantityChange(itemId, change) {
        const item = this.cart.find(cartItem => cartItem.id === itemId);
        if (item) {
            const newQuantity = item.quantity + change;
            if (newQuantity > 0 && newQuantity <= 10) {
                this.updateQuantity(itemId, newQuantity);
                this.renderCartContent(); // Re-render to update totals
            }
        }
    }
    
    updateCartDisplay() {
        const totalItems = this.getTotalItems();
        
        if (totalItems > 0) {
            this.cartCount.textContent = totalItems;
            this.cartCount.classList.remove('hidden');
        } else {
            this.cartCount.classList.add('hidden');
        }
    }
    
    getTotalItems() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }
    
    getSubtotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    getCart() {
        return [...this.cart];
    }
    
    getCartSummary() {
        return {
            items: this.cart.length,
            totalItems: this.getTotalItems(),
            subtotal: this.getSubtotal(),
            shipping: 0,
            total: this.getSubtotal()
        };
    }
}

// Global functions for HTML onclick handlers
function clearCart() {
    if (window.cartManager) {
        if (confirm('Are you sure you want to clear your cart?')) {
            window.cartManager.clearCart();
            window.cartManager.renderCartContent();
        }
    }
}

function proceedToCheckout() {
    const authManager = window.authManager;
    if (!authManager || !authManager.isAuthenticated()) {
        NotificationManager.show('Please log in to proceed to checkout', 'warning');
        closeModal('cart-modal');
        EventBus.emit('auth:show-login');
        return;
    }
    
    const cartManager = window.cartManager;
    if (!cartManager || cartManager.cart.length === 0) {
        NotificationManager.show('Your cart is empty', 'warning');
        return;
    }
    
    // Close cart modal and show checkout
    closeModal('cart-modal');
    EventBus.emit('checkout:show');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cartManager = new CartManager();
});