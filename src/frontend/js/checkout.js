// Checkout and Order Management Module
class CheckoutManager {
    constructor() {
        this.currentOrder = null;
        this.isProcessing = false;
        this.orderHistory = [];
        this.currentPage = 1;
        this.pageSize = 10;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Checkout navigation
        document.getElementById('back-to-cart')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showCart();
        });
        
        document.getElementById('cancel-checkout')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showCart();
        });
        
        // Order history navigation
        document.getElementById('orders-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showOrderHistory();
        });
        
        document.getElementById('back-to-products-from-history')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showProducts();
        });
        
        document.getElementById('view-order-history')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showOrderHistory();
        });
        
        document.getElementById('start-shopping')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showProducts();
        });
        
        // Confirmation actions
        document.getElementById('continue-shopping-confirmation')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showProducts();
        });
        
        // Checkout form
        document.getElementById('checkout-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitOrder();
        });
        
        // Form validation
        this.setupFormValidation();
        
        // Order history pagination
        document.getElementById('prev-orders-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadOrderHistory();
            }
        });
        
        document.getElementById('next-orders-page')?.addEventListener('click', () => {
            this.currentPage++;
            this.loadOrderHistory();
        });
    }
    
    setupFormValidation() {
        const zipCodeInput = document.getElementById('checkout-zipcode');
        if (zipCodeInput) {
            zipCodeInput.addEventListener('input', (e) => {
                const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                if (value.length <= 5) {
                    e.target.value = value;
                } else if (value.length <= 9) {
                    e.target.value = value.slice(0, 5) + '-' + value.slice(5);
                }
            });
        }
        
        // Real-time validation for all form fields
        const formFields = ['checkout-street', 'checkout-city', 'checkout-state', 'checkout-zipcode'];
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldId));
                field.addEventListener('input', () => this.clearFieldError(fieldId));
            }
        });
    }
    
    validateField(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + '-error');
        
        if (!field || !errorElement) return true;
        
        let isValid = true;
        let errorMessage = '';
        
        const value = field.value.trim();
        
        switch (fieldId) {
            case 'checkout-street':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Street address is required';
                } else if (value.length > 200) {
                    isValid = false;
                    errorMessage = 'Street address must be less than 200 characters';
                }
                break;
                
            case 'checkout-city':
                if (!value) {
                    isValid = false;
                    errorMessage = 'City is required';
                } else if (value.length > 100) {
                    isValid = false;
                    errorMessage = 'City must be less than 100 characters';
                }
                break;
                
            case 'checkout-state':
                if (!value) {
                    isValid = false;
                    errorMessage = 'State is required';
                }
                break;
                
            case 'checkout-zipcode':
                if (!value) {
                    isValid = false;
                    errorMessage = 'ZIP code is required';
                } else if (!/^\d{5}(-\d{4})?$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Invalid ZIP code format (use 12345 or 12345-6789)';
                }
                break;
        }
        
        if (isValid) {
            errorElement.textContent = '';
            field.classList.remove('error');
        } else {
            errorElement.textContent = errorMessage;
            field.classList.add('error');
        }
        
        return isValid;
    }
    
    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + '-error');
        
        if (field && errorElement) {
            errorElement.textContent = '';
            field.classList.remove('error');
        }
    }
    
    validateForm() {
        const fields = ['checkout-street', 'checkout-city', 'checkout-state', 'checkout-zipcode'];
        let isValid = true;
        
        fields.forEach(fieldId => {
            if (!this.validateField(fieldId)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    showCheckout() {
        if (!window.authManager?.isAuthenticated()) {
            this.showNotification('Please log in to proceed to checkout', 'error');
            return;
        }
        
        const cartItems = window.cartManager?.getCart() || [];
        if (cartItems.length === 0) {
            this.showNotification('Your cart is empty', 'error');
            return;
        }
        
        // Hide other sections
        this.hideAllSections();
        
        // Show checkout section
        document.getElementById('checkout-section')?.classList.remove('hidden');
        
        // Populate checkout summary
        this.populateCheckoutSummary(cartItems);
        
        // Clear any previous form data
        this.clearCheckoutForm();
    }
    
    populateCheckoutSummary(cartItems) {
        const itemsList = document.getElementById('checkout-items-list');
        const itemCount = document.getElementById('checkout-item-count');
        const subtotal = document.getElementById('checkout-subtotal');
        const shipping = document.getElementById('checkout-shipping');
        const total = document.getElementById('checkout-total');
        
        if (!itemsList) return;
        
        // Render checkout items
        itemsList.innerHTML = cartItems.map(item => `
            <div class="checkout-item">
                <div class="checkout-item-info">
                    <span class="checkout-item-name">${item.name || 'Unknown Product'}</span>
                    <span class="checkout-item-quantity">Qty: ${item.quantity}</span>
                </div>
                <div class="checkout-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');
        
        // Calculate totals
        const itemCountValue = cartItems.reduce((total, item) => total + item.quantity, 0);
        const subtotalValue = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        const shippingValue = 0; // Free shipping
        const totalValue = subtotalValue + shippingValue;
        
        // Update summary
        if (itemCount) itemCount.textContent = itemCountValue.toString();
        if (subtotal) subtotal.textContent = `$${subtotalValue.toFixed(2)}`;
        if (shipping) shipping.textContent = shippingValue === 0 ? 'Free' : `$${shippingValue.toFixed(2)}`;
        if (total) total.textContent = `$${totalValue.toFixed(2)}`;
    }
    
    clearCheckoutForm() {
        const form = document.getElementById('checkout-form');
        if (form) {
            form.reset();
        }
        
        // Clear all error messages
        const errorElements = form?.querySelectorAll('.error-text');
        errorElements?.forEach(el => el.textContent = '');
        
        // Remove error classes
        const fields = form?.querySelectorAll('.form-group input, .form-group select');
        fields?.forEach(field => field.classList.remove('error'));
    }
    
    async submitOrder() {
        if (this.isProcessing) return;
        
        // Validate form
        if (!this.validateForm()) {
            this.showCheckoutError('Please correct the errors above');
            return;
        }
        
        // Get cart items
        const cartItems = window.cartManager?.getCart() || [];
        if (cartItems.length === 0) {
            this.showCheckoutError('Your cart is empty');
            return;
        }
        
        // Get user info
        const user = window.authManager?.getCurrentUser();
        if (!user) {
            this.showCheckoutError('Please log in to place an order');
            return;
        }
        
        this.setProcessing(true);
        
        try {
            // Collect form data
            const formData = new FormData(document.getElementById('checkout-form'));
            const shippingAddress = {
                street: formData.get('street'),
                city: formData.get('city'),
                state: formData.get('state'),
                zipCode: formData.get('zipCode'),
                country: 'US'
            };
            
            // Prepare order data
            const orderData = {
                userId: user.userId,
                items: cartItems.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                shippingAddress: shippingAddress
            };
            
            // Submit order
            const response = await fetch(buildUnifiedApiUrl('ORDERS'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getSessionId()}`
                },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                const order = await response.json();
                this.currentOrder = order;
                
                // Clear cart (this should happen automatically on the server)
                await window.cartManager?.loadCartFromServer();
                
                // Show confirmation
                this.showOrderConfirmation(order);
                
                this.showNotification('Order placed successfully!');
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Order submission failed: ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('Order submission error:', error);
            this.showCheckoutError(error.message || 'Failed to place order. Please try again.');
        } finally {
            this.setProcessing(false);
        }
    }
    
    showOrderConfirmation(order) {
        // Hide other sections
        this.hideAllSections();
        
        // Show confirmation section
        document.getElementById('order-confirmation-section')?.classList.remove('hidden');
        
        // Populate confirmation details
        const orderIdElement = document.getElementById('confirmation-order-id');
        const orderDateElement = document.getElementById('confirmation-order-date');
        const totalAmountElement = document.getElementById('confirmation-total-amount');
        const shippingAddressElement = document.getElementById('confirmation-shipping-address');
        const itemsListElement = document.getElementById('confirmation-items-list');
        
        if (orderIdElement) orderIdElement.textContent = order.orderId;
        if (orderDateElement) {
            const date = new Date(order.createdAt);
            orderDateElement.textContent = date.toLocaleDateString();
        }
        if (totalAmountElement) totalAmountElement.textContent = `$${order.totalAmount.toFixed(2)}`;
        
        if (shippingAddressElement) {
            const addr = order.shippingAddress;
            shippingAddressElement.innerHTML = `
                <div>${addr.street}</div>
                <div>${addr.city}, ${addr.state} ${addr.zipCode}</div>
                <div>${addr.country}</div>
            `;
        }
        
        if (itemsListElement) {
            itemsListElement.innerHTML = order.items.map(item => `
                <div class="confirmation-item">
                    <div class="confirmation-item-info">
                        <span class="confirmation-item-name">${item.name}</span>
                        <span class="confirmation-item-details">Qty: ${item.quantity} × $${item.price.toFixed(2)}</span>
                    </div>
                    <div class="confirmation-item-total">$${(item.price * item.quantity).toFixed(2)}</div>
                </div>
            `).join('');
        }
    }
    
    async showOrderHistory() {
        if (!window.authManager?.isAuthenticated()) {
            this.showNotification('Please log in to view order history', 'error');
            return;
        }
        
        // Hide other sections
        this.hideAllSections();
        
        // Show order history section
        document.getElementById('order-history-section')?.classList.remove('hidden');
        
        // Reset pagination
        this.currentPage = 1;
        
        // Load order history
        await this.loadOrderHistory();
    }
    
    async loadOrderHistory() {
        const user = window.authManager?.getCurrentUser();
        if (!user) {
            this.showOrderHistoryError('Please log in to view order history');
            return;
        }
        
        this.setOrderHistoryLoading(true);
        
        try {
            const response = await fetch(
                buildUnifiedApiUrl('USER_ORDERS', { userId: user.userId }) + 
                `?page=${this.currentPage}&page_size=${this.pageSize}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${window.authManager.getSessionId()}`
                    }
                }
            );
            
            if (response.ok) {
                const orderData = await response.json();
                this.orderHistory = orderData.orders || [];
                this.displayOrderHistory(orderData);
            } else if (response.status === 404) {
                // No orders found
                this.orderHistory = [];
                this.displayEmptyOrderHistory();
            } else {
                throw new Error(`Failed to load order history: ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('Error loading order history:', error);
            this.showOrderHistoryError('Failed to load order history. Please try again.');
        } finally {
            this.setOrderHistoryLoading(false);
        }
    }
    
    displayOrderHistory(orderData) {
        const emptySection = document.getElementById('order-history-empty');
        const contentSection = document.getElementById('order-history-content');
        const ordersList = document.getElementById('order-history-list');
        const pagination = document.getElementById('order-history-pagination');
        
        if (this.orderHistory.length === 0) {
            this.displayEmptyOrderHistory();
            return;
        }
        
        // Show content section
        emptySection?.classList.add('hidden');
        contentSection?.classList.remove('hidden');
        
        // Render orders
        if (ordersList) {
            ordersList.innerHTML = this.orderHistory.map(order => this.renderOrderHistoryItem(order)).join('');
            
            // Add click listeners for order details
            this.attachOrderHistoryListeners();
        }
        
        // Update pagination
        this.updateOrderHistoryPagination(orderData);
    }
    
    displayEmptyOrderHistory() {
        const emptySection = document.getElementById('order-history-empty');
        const contentSection = document.getElementById('order-history-content');
        
        emptySection?.classList.remove('hidden');
        contentSection?.classList.add('hidden');
    }
    
    renderOrderHistoryItem(order) {
        const orderDate = new Date(order.createdAt).toLocaleDateString();
        const statusClass = order.status.toLowerCase();
        
        return `
            <div class="order-history-item" data-order-id="${order.orderId}">
                <div class="order-header">
                    <div class="order-info">
                        <div class="order-number">Order #${order.orderId.slice(-8)}</div>
                        <div class="order-date">${orderDate}</div>
                    </div>
                    <div class="order-status">
                        <span class="status-badge ${statusClass}">${order.status}</span>
                    </div>
                    <div class="order-total">$${order.totalAmount.toFixed(2)}</div>
                </div>
                
                <div class="order-items-preview">
                    ${order.items.slice(0, 3).map(item => `
                        <span class="item-preview">${item.name} (${item.quantity})</span>
                    `).join(', ')}
                    ${order.items.length > 3 ? `<span class="more-items">+${order.items.length - 3} more</span>` : ''}
                </div>
                
                <div class="order-actions">
                    <button class="btn btn-secondary view-order-details" data-order-id="${order.orderId}">
                        View Details
                    </button>
                    <button class="btn btn-primary reorder-btn" data-order-id="${order.orderId}">
                        Reorder
                    </button>
                </div>
            </div>
        `;
    }
    
    attachOrderHistoryListeners() {
        // View details buttons
        document.querySelectorAll('.view-order-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.dataset.orderId;
                this.showOrderDetails(orderId);
            });
        });
        
        // Reorder buttons
        document.querySelectorAll('.reorder-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.dataset.orderId;
                this.reorderItems(orderId);
            });
        });
    }
    
    async showOrderDetails(orderId) {
        try {
            const response = await fetch(buildUnifiedApiUrl('ORDER_DETAIL', { orderId }), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.authManager.getSessionId()}`
                }
            });
            
            if (response.ok) {
                const order = await response.json();
                this.displayOrderDetailsModal(order);
            } else {
                throw new Error(`Failed to load order details: ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('Error loading order details:', error);
            this.showNotification('Failed to load order details', 'error');
        }
    }
    
    displayOrderDetailsModal(order) {
        // Create modal dynamically
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content order-details-modal">
                <span class="close">&times;</span>
                <h2>Order Details</h2>
                
                <div class="order-details-content">
                    <div class="order-info-section">
                        <h3>Order Information</h3>
                        <div class="info-grid">
                            <div class="info-row">
                                <span>Order Number:</span>
                                <span>${order.orderId}</span>
                            </div>
                            <div class="info-row">
                                <span>Order Date:</span>
                                <span>${new Date(order.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div class="info-row">
                                <span>Status:</span>
                                <span class="status-badge ${order.status.toLowerCase()}">${order.status}</span>
                            </div>
                            <div class="info-row">
                                <span>Total Amount:</span>
                                <span>$${order.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shipping-info-section">
                        <h3>Shipping Address</h3>
                        <div class="address-display">
                            <div>${order.shippingAddress.street}</div>
                            <div>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</div>
                            <div>${order.shippingAddress.country}</div>
                        </div>
                    </div>
                    
                    <div class="order-items-section">
                        <h3>Items Ordered</h3>
                        <div class="order-items-detailed">
                            ${order.items.map(item => `
                                <div class="order-item-detailed">
                                    <div class="item-info">
                                        <div class="item-name">${item.name}</div>
                                        <div class="item-details">Qty: ${item.quantity} × $${item.price.toFixed(2)}</div>
                                    </div>
                                    <div class="item-total">$${(item.price * item.quantity).toFixed(2)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add close functionality
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
    
    async reorderItems(orderId) {
        const order = this.orderHistory.find(o => o.orderId === orderId);
        if (!order) {
            this.showNotification('Order not found', 'error');
            return;
        }
        
        try {
            // Add all items from the order to cart
            let addedCount = 0;
            for (const item of order.items) {
                const success = await window.cartManager?.addToCart(
                    item.productId, 
                    item.quantity, 
                    {
                        name: item.name,
                        price: item.price,
                        category: 'Reorder'
                    }
                );
                if (success) addedCount++;
            }
            
            if (addedCount > 0) {
                this.showNotification(`Added ${addedCount} items to cart from previous order`);
                // Navigate to cart
                setTimeout(() => {
                    this.showCart();
                }, 1500);
            } else {
                this.showNotification('Failed to add items to cart', 'error');
            }
            
        } catch (error) {
            console.error('Reorder error:', error);
            this.showNotification('Failed to reorder items', 'error');
        }
    }
    
    updateOrderHistoryPagination(orderData) {
        const pagination = document.getElementById('order-history-pagination');
        const prevBtn = document.getElementById('prev-orders-page');
        const nextBtn = document.getElementById('next-orders-page');
        const pageInfo = document.getElementById('orders-page-info');
        
        if (!pagination || !orderData) return;
        
        const totalPages = Math.ceil(orderData.totalCount / this.pageSize);
        
        if (totalPages <= 1) {
            pagination.classList.add('hidden');
            return;
        }
        
        pagination.classList.remove('hidden');
        
        // Update buttons
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
        
        // Update page info
        if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
    }
    
    // Navigation methods
    showCart() {
        window.cartManager?.showCart();
    }
    
    showProducts() {
        this.hideAllSections();
        document.getElementById('products-section')?.classList.remove('hidden');
        document.getElementById('search-section')?.classList.remove('hidden');
        document.getElementById('pagination-section')?.classList.remove('hidden');
    }
    
    hideAllSections() {
        const sections = [
            'products-section', 'search-section', 'pagination-section',
            'cart-section', 'checkout-section', 'order-confirmation-section', 
            'order-history-section'
        ];
        
        sections.forEach(sectionId => {
            document.getElementById(sectionId)?.classList.add('hidden');
        });
    }
    
    // Loading and error states
    setProcessing(processing) {
        this.isProcessing = processing;
        const submitBtn = document.getElementById('place-order-btn');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnSpinner = submitBtn?.querySelector('.btn-spinner');
        const loadingElement = document.getElementById('checkout-loading');
        
        if (processing) {
            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.classList.add('hidden');
            if (btnSpinner) btnSpinner.classList.remove('hidden');
            if (loadingElement) loadingElement.classList.remove('hidden');
        } else {
            if (submitBtn) submitBtn.disabled = false;
            if (btnText) btnText.classList.remove('hidden');
            if (btnSpinner) btnSpinner.classList.add('hidden');
            if (loadingElement) loadingElement.classList.add('hidden');
        }
    }
    
    setOrderHistoryLoading(loading) {
        const loadingElement = document.getElementById('order-history-loading');
        const contentElement = document.getElementById('order-history-content');
        const emptyElement = document.getElementById('order-history-empty');
        
        if (loading) {
            loadingElement?.classList.remove('hidden');
            contentElement?.classList.add('hidden');
            emptyElement?.classList.add('hidden');
        } else {
            loadingElement?.classList.add('hidden');
        }
    }
    
    showCheckoutError(message) {
        const errorElement = document.getElementById('checkout-form-error');
        if (errorElement) {
            errorElement.textContent = message;
        }
        
        // Also show as notification
        this.showNotification(message, 'error');
    }
    
    showOrderHistoryError(message) {
        const errorElement = document.getElementById('order-history-error');
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
        document.querySelectorAll('.checkout-notification').forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.className = `checkout-notification ${type === 'error' ? 'error' : ''}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize checkout manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.checkoutManager = new CheckoutManager();
});