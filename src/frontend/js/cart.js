// Cart Management Module
class CartManager {
    constructor() {
        this.cartItems = [];
        this.cartCount = 0;
        this.isLoading = false;
        
        // Initialize cart display
        this.updateCartCount();
        this.initializeEventListeners();
        
        // Load cart on initialization if user is logged in
        this.loadCartFromServer();
    }
    
    initializeEventListeners() {
        // Cart navigation
        document.getElementById('cart-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showCart();
        });
        
        document.getElementById('back-to-products')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showProducts();
        });
        
        document.getElementById('continue-shopping')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showProducts();
        });
        
        // Cart actions
        document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
            this.clearCart();
        });
        
        document.getElementById('checkout-btn')?.addEventListener('click', () => {
            this.proceedToCheckout();
        });
    }
    
    showCart() {
        // Hide products section
        document.getElementById('products-section')?.classList.add('hidden');
        document.getElementById('search-section')?.classList.add('hidden');
        document.getElementById('pagination-section')?.classList.add('hidden');
        
        // Show cart section
        document.getElementById('cart-section')?.classList.remove('hidden');
        
        // Load and display cart
        this.loadCartFromServer();
    }
    
    showProducts() {
        // Show products section
        document.getElementById('products-section')?.classList.remove('hidden');
        document.getElementById('search-section')?.classList.remove('hidden');
        document.getElementById('pagination-section')?.classList.remove('hidden');
        
        // Hide cart section
        document.getElementById('cart-section')?.classList.add('hidden');
    }
    
    async loadCartFromServer() {
        if (!window.authManager?.isAuthenticated()) {
            this.displayEmptyCart();
            return;
        }
        
        this.setLoading(true);
        
        try {
            const userId = window.authManager.getCurrentUser()?.userId;
            if (!userId) {
                throw new Error('User ID not found');
            }
            
            const response = await fetch(buildUnifiedApiUrl('AUTH_CART', { userId }), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getSessionId()}`
                }
            });
            
            if (response.ok) {
                const cartData = await response.json();
                this.cartItems = cartData.items || [];
                this.updateCartDisplay();
            } else if (response.status === 404) {
                // Cart doesn't exist yet, show empty cart
                this.cartItems = [];
                this.updateCartDisplay();
            } else {
                throw new Error(`Failed to load cart: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading cart:', error);
            this.showError('Failed to load cart. Please try again.');
            this.displayEmptyCart();
        } finally {
            this.setLoading(false);
        }
    }
    
    async addToCart(productId, quantity = 1, productData = null) {
        if (!window.authManager?.isAuthenticated()) {
            this.showNotification('Please log in to add items to cart', 'error');
            return false;
        }
        
        try {
            const userId = window.authManager.getCurrentUser()?.userId;
            if (!userId) {
                throw new Error('User ID not found');
            }
            
            const response = await fetch(buildUnifiedApiUrl('AUTH_CART_ITEMS', { userId }), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getSessionId()}`
                },
                body: JSON.stringify({
                    productId,
                    quantity,
                    productData
                })
            });
            
            if (response.ok) {
                // Update local cart
                const existingItem = this.cartItems.find(item => item.productId === productId);
                if (existingItem) {
                    existingItem.quantity += quantity;
                } else {
                    this.cartItems.push({
                        productId,
                        quantity,
                        ...productData
                    });
                }
                
                this.updateCartDisplay();
                this.showNotification(`Added ${quantity} item(s) to cart`);
                return true;
            } else {
                throw new Error(`Failed to add to cart: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showNotification('Failed to add item to cart', 'error');
            return false;
        }
    }
    
    async updateCartItem(productId, quantity) {
        if (!window.authManager?.isAuthenticated()) {
            return false;
        }
        
        try {
            const userId = window.authManager.getCurrentUser()?.userId;
            if (!userId) {
                throw new Error('User ID not found');
            }
            
            if (quantity <= 0) {
                return this.removeFromCart(productId);
            }
            
            const response = await fetch(buildUnifiedApiUrl('AUTH_CART_ITEM', { userId, itemId: productId }), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getSessionId()}`
                },
                body: JSON.stringify({ quantity })
            });
            
            if (response.ok) {
                // Update local cart
                const item = this.cartItems.find(item => item.productId === productId);
                if (item) {
                    item.quantity = quantity;
                }
                
                this.updateCartDisplay();
                return true;
            } else {
                throw new Error(`Failed to update cart item: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error updating cart item:', error);
            this.showNotification('Failed to update cart item', 'error');
            return false;
        }
    }
    
    async removeFromCart(productId) {
        if (!window.authManager?.isAuthenticated()) {
            return false;
        }
        
        try {
            const userId = window.authManager.getCurrentUser()?.userId;
            if (!userId) {
                throw new Error('User ID not found');
            }
            
            const response = await fetch(buildUnifiedApiUrl('AUTH_CART_ITEM', { userId, itemId: productId }), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.authManager.getSessionId()}`
                }
            });
            
            if (response.ok) {
                // Update local cart
                this.cartItems = this.cartItems.filter(item => item.productId !== productId);
                this.updateCartDisplay();
                this.showNotification('Item removed from cart');
                return true;
            } else {
                throw new Error(`Failed to remove from cart: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error removing from cart:', error);
            this.showNotification('Failed to remove item from cart', 'error');
            return false;
        }
    }
    
    async clearCart() {
        if (!window.authManager?.isAuthenticated()) {
            return false;
        }
        
        if (!confirm('Are you sure you want to clear your cart?')) {
            return false;
        }
        
        try {
            const userId = window.authManager.getCurrentUser()?.userId;
            if (!userId) {
                throw new Error('User ID not found');
            }
            
            const response = await fetch(buildUnifiedApiUrl('AUTH_CLEAR_CART', { userId }), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.authManager.getSessionId()}`
                }
            });
            
            if (response.ok) {
                this.cartItems = [];
                this.updateCartDisplay();
                this.showNotification('Cart cleared');
                return true;
            } else {
                throw new Error(`Failed to clear cart: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error clearing cart:', error);
            this.showNotification('Failed to clear cart', 'error');
            return false;
        }
    }
    
    updateCartDisplay() {
        this.updateCartCount();
        
        const cartEmpty = document.getElementById('cart-empty');
        const cartContent = document.getElementById('cart-content');
        const cartItemsList = document.getElementById('cart-items-list');
        
        if (this.cartItems.length === 0) {
            this.displayEmptyCart();
            return;
        }
        
        // Show cart content
        cartEmpty?.classList.add('hidden');
        cartContent?.classList.remove('hidden');
        
        // Render cart items
        if (cartItemsList) {
            cartItemsList.innerHTML = this.cartItems.map(item => this.renderCartItem(item)).join('');
            
            // Add event listeners to cart items
            this.attachCartItemListeners();
        }
        
        // Update summary
        this.updateCartSummary();
    }
    
    displayEmptyCart() {
        const cartEmpty = document.getElementById('cart-empty');
        const cartContent = document.getElementById('cart-content');
        
        cartEmpty?.classList.remove('hidden');
        cartContent?.classList.add('hidden');
        
        this.updateCartCount();
    }
    
    renderCartItem(item) {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        
        return `
            <div class="cart-item" data-product-id="${item.productId}">
                <div class="cart-item-image">
                    ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 5px;">` : 'No Image'}
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name || 'Unknown Product'}</div>
                    <div class="cart-item-category">${item.category || 'Uncategorized'}</div>
                    <div class="cart-item-price mobile-only">$${item.price?.toFixed(2) || '0.00'}</div>
                </div>
                <div class="cart-item-price desktop-only">$${item.price?.toFixed(2) || '0.00'}</div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn decrease-btn" data-product-id="${item.productId}">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="99" data-product-id="${item.productId}">
                    <button class="quantity-btn increase-btn" data-product-id="${item.productId}">+</button>
                </div>
                <div class="cart-item-total desktop-only">$${itemTotal}</div>
                <button class="cart-item-remove" data-product-id="${item.productId}">Remove</button>
            </div>
        `;
    }
    
    attachCartItemListeners() {
        // Quantity buttons
        document.querySelectorAll('.decrease-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                const input = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
                const currentQuantity = parseInt(input.value);
                if (currentQuantity > 1) {
                    this.updateCartItem(productId, currentQuantity - 1);
                }
            });
        });
        
        document.querySelectorAll('.increase-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                const input = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
                const currentQuantity = parseInt(input.value);
                if (currentQuantity < 99) {
                    this.updateCartItem(productId, currentQuantity + 1);
                }
            });
        });
        
        // Quantity input direct change
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const productId = e.target.dataset.productId;
                const quantity = parseInt(e.target.value);
                if (quantity >= 1 && quantity <= 99) {
                    this.updateCartItem(productId, quantity);
                } else {
                    // Reset to current quantity if invalid
                    const item = this.cartItems.find(item => item.productId === productId);
                    if (item) {
                        e.target.value = item.quantity;
                    }
                }
            });
        });
        
        // Remove buttons
        document.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                this.removeFromCart(productId);
            });
        });
    }
    
    updateCartSummary() {
        const itemCount = this.cartItems.reduce((total, item) => total + item.quantity, 0);
        const subtotal = this.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        const shipping = 0; // Free shipping
        const total = subtotal + shipping;
        
        // Update summary elements
        document.getElementById('cart-item-count').textContent = itemCount;
        document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('cart-shipping').textContent = shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`;
        document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
        
        // Enable/disable checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = itemCount === 0;
        }
    }
    
    updateCartCount() {
        this.cartCount = this.cartItems.reduce((total, item) => total + item.quantity, 0);
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = this.cartCount.toString();
        }
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        const cartLoading = document.getElementById('cart-loading');
        const cartContent = document.getElementById('cart-content');
        const cartEmpty = document.getElementById('cart-empty');
        
        if (loading) {
            cartLoading?.classList.remove('hidden');
            cartContent?.classList.add('hidden');
            cartEmpty?.classList.add('hidden');
        } else {
            cartLoading?.classList.add('hidden');
        }
    }
    
    showError(message) {
        const errorElement = document.getElementById('cart-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
            
            setTimeout(() => {
                errorElement.classList.add('hidden');
            }, 5000);
        }
    }
    
    showNotification(message, type = 'success') {
        // Remove existing notifications
        document.querySelectorAll('.cart-notification').forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type === 'error' ? 'error' : ''}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    proceedToCheckout() {
        if (this.cartItems.length === 0) {
            this.showNotification('Your cart is empty', 'error');
            return;
        }
        
        if (!window.authManager?.isAuthenticated()) {
            this.showNotification('Please log in to proceed to checkout', 'error');
            return;
        }
        
        // Use the checkout manager to show checkout
        if (window.checkoutManager) {
            window.checkoutManager.showCheckout();
        } else {
            this.showNotification('Checkout functionality is not available', 'error');
        }
    }
    
    // Public API methods
    getCart() {
        return this.cartItems;
    }
    
    getCartTotal() {
        return this.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
    
    getCartItemCount() {
        return this.cartCount;
    }
}

// Initialize cart manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cartManager = new CartManager();
});