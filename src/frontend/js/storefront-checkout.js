// Checkout Management Module
class CheckoutManager {
    constructor() {
        this.checkoutData = {
            items: [],
            shipping: {},
            billing: {},
            summary: {}
        };
        this.isProcessing = false;
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        this.checkoutModal = document.getElementById('checkout-modal');
        this.checkoutContent = document.getElementById('checkout-content');
    }
    
    bindEvents() {
        // EventBus subscriptions
        EventBus.on('checkout:show', () => this.showCheckout());
    }
    
    showCheckout() {
        const cartManager = window.cartManager;
        const authManager = window.authManager;
        
        if (!authManager || !authManager.isAuthenticated()) {
            NotificationManager.show('Please log in to proceed to checkout', 'warning');
            EventBus.emit('auth:show-login');
            return;
        }
        
        if (!cartManager || cartManager.cart.length === 0) {
            NotificationManager.show('Your cart is empty', 'warning');
            return;
        }
        
        this.checkoutData.items = cartManager.getCart();
        this.checkoutData.summary = cartManager.getCartSummary();
        
        this.renderCheckoutContent();
        this.checkoutModal.classList.remove('hidden');
    }
    
    renderCheckoutContent() {
        this.checkoutContent.innerHTML = this.createCheckoutContent();
        this.bindCheckoutEvents();
    }
    
    createCheckoutContent() {
        return `
            <div class="checkout-grid">
                <div class="checkout-form-section">
                    <form id="checkout-form" class="checkout-form">
                        <div class="form-section">
                            <h3>Shipping Information</h3>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="checkout-first-name">First Name *</label>
                                    <input type="text" id="checkout-first-name" name="firstName" required>
                                    <span class="error-text" id="checkout-first-name-error"></span>
                                </div>
                                
                                <div class="form-group">
                                    <label for="checkout-last-name">Last Name *</label>
                                    <input type="text" id="checkout-last-name" name="lastName" required>
                                    <span class="error-text" id="checkout-last-name-error"></span>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="checkout-email">Email *</label>
                                <input type="email" id="checkout-email" name="email" required>
                                <span class="error-text" id="checkout-email-error"></span>
                            </div>
                            
                            <div class="form-group">
                                <label for="checkout-phone">Phone Number</label>
                                <input type="tel" id="checkout-phone" name="phone">
                                <span class="error-text" id="checkout-phone-error"></span>
                            </div>
                            
                            <div class="form-group">
                                <label for="checkout-address">Street Address *</label>
                                <input type="text" id="checkout-address" name="address" required>
                                <span class="error-text" id="checkout-address-error"></span>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="checkout-city">City *</label>
                                    <input type="text" id="checkout-city" name="city" required>
                                    <span class="error-text" id="checkout-city-error"></span>
                                </div>
                                
                                <div class="form-group">
                                    <label for="checkout-state">State *</label>
                                    <select id="checkout-state" name="state" required>
                                        <option value="">Select State</option>
                                        ${this.createStateOptions()}
                                    </select>
                                    <span class="error-text" id="checkout-state-error"></span>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="checkout-zip">ZIP Code *</label>
                                    <input type="text" id="checkout-zip" name="zip" required pattern="[0-9]{5}(-[0-9]{4})?">
                                    <span class="error-text" id="checkout-zip-error"></span>
                                </div>
                                
                                <div class="form-group">
                                    <label for="checkout-country">Country *</label>
                                    <select id="checkout-country" name="country" required>
                                        <option value="US">United States</option>
                                        <option value="CA">Canada</option>
                                    </select>
                                    <span class="error-text" id="checkout-country-error"></span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h3>Special Instructions</h3>
                            <div class="form-group">
                                <label for="checkout-notes">Delivery Notes (Optional)</label>
                                <textarea id="checkout-notes" name="notes" rows="3" 
                                         placeholder="Any special delivery instructions or customization requests..."></textarea>
                            </div>
                        </div>
                        
                        <div class="checkout-actions">
                            <button type="button" class="btn btn-outline" onclick="closeModal('checkout-modal')">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary btn-large" id="place-order-btn">
                                <span class="btn-text">Place Order</span>
                                <span class="btn-spinner hidden">Processing...</span>
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <span class="error-text" id="checkout-form-error"></span>
                        </div>
                    </form>
                </div>
                
                <div class="checkout-summary">
                    <h3>Order Summary</h3>
                    
                    <div class="checkout-items">
                        ${this.checkoutData.items.map(item => this.createCheckoutItem(item)).join('')}
                    </div>
                    
                    <div class="checkout-totals">
                        <div class="summary-row">
                            <span>Subtotal (${this.checkoutData.summary.totalItems} items):</span>
                            <span>${Utils.formatCurrency(this.checkoutData.summary.subtotal)}</span>
                        </div>
                        <div class="summary-row">
                            <span>Shipping:</span>
                            <span>Free</span>
                        </div>
                        <div class="summary-row">
                            <span>Tax:</span>
                            <span>Calculated at delivery</span>
                        </div>
                        <div class="summary-row total">
                            <span>Total:</span>
                            <span>${Utils.formatCurrency(this.checkoutData.summary.total)}</span>
                        </div>
                    </div>
                    
                    <div class="delivery-info">
                        <h4>Delivery Information</h4>
                        <p><strong>Estimated Delivery:</strong> ${this.calculateDeliveryTime()} months</p>
                        <p><strong>Crafting Process:</strong> Each piece is handcrafted to order by master artisans</p>
                        <p><strong>Quality Guarantee:</strong> 100% satisfaction guaranteed with certificate of authenticity</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    createStateOptions() {
        const states = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
        ];
        
        return states.map(state => `<option value="${state}">${state}</option>`).join('');
    }
    
    createCheckoutItem(item) {
        return `
            <div class="checkout-item">
                <div class="checkout-item-image">🪑</div>
                <div class="checkout-item-info">
                    <h4>${Utils.sanitizeHtml(item.name)}</h4>
                    <p>Quantity: ${item.quantity}</p>
                    <p>${Utils.formatCurrency(item.price)} each</p>
                    ${item.crafting_time_months ? `<p>Crafting time: ${item.crafting_time_months} months</p>` : ''}
                </div>
                <div class="checkout-item-total">
                    ${Utils.formatCurrency(item.price * item.quantity)}
                </div>
            </div>
        `;
    }
    
    calculateDeliveryTime() {
        const maxCraftingTime = Math.max(...this.checkoutData.items.map(item => item.crafting_time_months || 6));
        return maxCraftingTime + 1; // Add 1 month for shipping
    }
    
    bindCheckoutEvents() {
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => this.handleCheckout(e));
        }
        
        // Pre-fill user information if available
        this.prefillUserInfo();
    }
    
    prefillUserInfo() {
        const authManager = window.authManager;
        if (authManager && authManager.isAuthenticated()) {
            const user = authManager.getCurrentUser();
            if (user.email) {
                const emailInput = document.getElementById('checkout-email');
                if (emailInput) {
                    emailInput.value = user.email;
                }
            }
        }
    }
    
    async handleCheckout(e) {
        e.preventDefault();
        
        if (this.isProcessing) return;
        
        const formData = new FormData(e.target);
        const orderData = this.extractOrderData(formData);
        
        // Clear previous errors
        this.clearFormErrors();
        
        // Validate form
        if (!this.validateCheckoutForm(orderData)) {
            return;
        }
        
        // Show loading state
        this.setProcessingState(true);
        
        try {
            // Simulate order processing
            await this.processOrder(orderData);
            
            // Show success and clear cart
            this.showOrderSuccess(orderData);
            
        } catch (error) {
            console.error('Checkout error:', error);
            this.showFormError('checkout-form-error', 
                error.message || 'Order processing failed. Please try again.');
        } finally {
            this.setProcessingState(false);
        }
    }
    
    extractOrderData(formData) {
        return {
            customer: {
                firstName: (formData.get('firstName') || '').trim(),
                lastName: (formData.get('lastName') || '').trim(),
                email: (formData.get('email') || '').trim(),
                phone: (formData.get('phone') || '').trim()
            },
            shipping: {
                address: (formData.get('address') || '').trim(),
                city: (formData.get('city') || '').trim(),
                state: formData.get('state') || '',
                zip: (formData.get('zip') || '').trim(),
                country: formData.get('country') || ''
            },
            notes: (formData.get('notes') || '').trim(),
            items: this.checkoutData.items,
            summary: this.checkoutData.summary
        };
    }
    
    validateCheckoutForm(orderData) {
        let isValid = true;
        
        // Customer validation
        if (!orderData.customer.firstName) {
            this.showFormError('checkout-first-name-error', 'First name is required');
            isValid = false;
        }
        
        if (!orderData.customer.lastName) {
            this.showFormError('checkout-last-name-error', 'Last name is required');
            isValid = false;
        }
        
        if (!orderData.customer.email) {
            this.showFormError('checkout-email-error', 'Email is required');
            isValid = false;
        } else if (!Utils.validateEmail(orderData.customer.email)) {
            this.showFormError('checkout-email-error', 'Please enter a valid email');
            isValid = false;
        }
        
        // Shipping validation
        if (!orderData.shipping.address) {
            this.showFormError('checkout-address-error', 'Address is required');
            isValid = false;
        }
        
        if (!orderData.shipping.city) {
            this.showFormError('checkout-city-error', 'City is required');
            isValid = false;
        }
        
        if (!orderData.shipping.state) {
            this.showFormError('checkout-state-error', 'State is required');
            isValid = false;
        }
        
        if (!orderData.shipping.zip) {
            this.showFormError('checkout-zip-error', 'ZIP code is required');
            isValid = false;
        } else if (!/^[0-9]{5}(-[0-9]{4})?$/.test(orderData.shipping.zip)) {
            this.showFormError('checkout-zip-error', 'Please enter a valid ZIP code');
            isValid = false;
        }
        
        return isValid;
    }
    
    async processOrder(orderData) {
        try {
            // Get user info
            const authManager = window.authManager;
            const user = authManager.getUser();
            
            if (!user || (!user.userId && !user.id)) {
                throw new Error('User not authenticated');
            }
            
            if (!orderData.items || orderData.items.length === 0) {
                throw new Error('Cart is empty');
            }
            
            // Prepare order request for Order Processing API
            const orderRequest = {
                user_id: user.userId || user.id,
                items: orderData.items.map(item => {
                    const itemId = item.id || item.productId;
                    if (!item || !itemId) {
                        console.error('Invalid item:', item);
                        throw new Error('Invalid item in cart');
                    }
                    return {
                        product_id: itemId.toString(),
                        name: item.name || 'Product',
                        price: item.price || 0,
                        quantity: item.quantity || 1,
                        unit_price: item.price || 0,
                        crafting_time_months: item.crafting_time_months || item.craftingTimeMonths || 6,
                        artisan_name: item.artisan_name || item.artisanName || 'Unknown Artisan'
                    };
                }),
                shipping_address: {
                    street: orderData.shipping.address,
                    city: orderData.shipping.city,
                    state: orderData.shipping.state,
                    zipCode: orderData.shipping.zip,
                    country: orderData.shipping.country || 'US'
                },
                billing_address: {
                    street: (orderData.billing && orderData.billing.address) || orderData.shipping.address,
                    city: (orderData.billing && orderData.billing.city) || orderData.shipping.city,
                    state: (orderData.billing && orderData.billing.state) || orderData.shipping.state,
                    zipCode: (orderData.billing && orderData.billing.zip) || orderData.shipping.zip,
                    country: (orderData.billing && orderData.billing.country) || orderData.shipping.country || 'US'
                },
                payment_method: (orderData.payment && orderData.payment.method) || 'credit_card'
            };
            
            // Call Order Processing API
            const response = await fetch(`${API_CONFIG.API_GATEWAY.BASE_URL}${API_CONFIG.API_GATEWAY.ENDPOINTS.ORDERS}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(orderRequest)
            });
            
            if (!response.ok) {
                const error = await response.json();
                const errorMessage = typeof error.detail === 'string' 
                    ? error.detail 
                    : (error.message || JSON.stringify(error.detail) || 'Failed to create order');
                console.error('Order creation failed:', error);
                throw new Error(errorMessage);
            }
            
            const order = await response.json();
            
            // Transform API response to match expected format
            orderData.orderId = order.order_id;
            orderData.orderDate = order.created_at;
            orderData.status = order.status;
            orderData.estimatedDelivery = order.estimated_delivery;
            orderData.trackingInfo = order.tracking_info;
            
            return orderData;
            
        } catch (error) {
            console.error('Order processing error:', error);
            throw error;
        }
    }
    
    calculateEstimatedDelivery() {
        const deliveryMonths = this.calculateDeliveryTime();
        const deliveryDate = new Date();
        deliveryDate.setMonth(deliveryDate.getMonth() + deliveryMonths);
        return deliveryDate.toISOString();
    }
    
    showOrderSuccess(orderData) {
        // Clear cart
        const cartManager = window.cartManager;
        if (cartManager) {
            cartManager.clearCart();
        }
        
        // Close checkout modal
        this.checkoutModal.classList.add('hidden');
        
        // Show success notification
        NotificationManager.show(SUCCESS_MESSAGES.ORDER_SUCCESS, 'success');
        
        // Show order confirmation modal
        this.showOrderConfirmation(orderData);
    }
    
    showOrderConfirmation(orderData) {
        const confirmationContent = `
            <div class="order-confirmation">
                <div class="confirmation-header">
                    <div class="success-icon">✓</div>
                    <h2>Order Confirmed!</h2>
                    <p>Thank you for your order. We'll send you updates as your desk is crafted.</p>
                </div>
                
                <div class="order-details">
                    <div class="order-info">
                        <h3>Order Information</h3>
                        <div class="info-row">
                            <span>Order Number:</span>
                            <span><strong>${orderData.orderId}</strong></span>
                        </div>
                        <div class="info-row">
                            <span>Order Date:</span>
                            <span>${new Date(orderData.orderDate).toLocaleDateString()}</span>
                        </div>
                        <div class="info-row">
                            <span>Total Amount:</span>
                            <span><strong>${Utils.formatCurrency(orderData.summary.total)}</strong></span>
                        </div>
                        <div class="info-row">
                            <span>Estimated Delivery:</span>
                            <span>${new Date(orderData.estimatedDelivery).toLocaleDateString()}</span>
                        </div>
                    </div>
                    
                    <div class="shipping-info">
                        <h3>Shipping Address</h3>
                        <div class="address-display">
                            ${orderData.customer.firstName} ${orderData.customer.lastName}<br>
                            ${orderData.shipping.address}<br>
                            ${orderData.shipping.city}, ${orderData.shipping.state} ${orderData.shipping.zip}<br>
                            ${orderData.shipping.country}
                        </div>
                    </div>
                    
                    <div class="order-items">
                        <h3>Items Ordered</h3>
                        ${orderData.items.map(item => `
                            <div class="confirmation-item">
                                <div class="confirmation-item-info">
                                    <div class="confirmation-item-name">${Utils.sanitizeHtml(item.name)}</div>
                                    <div class="confirmation-item-details">Quantity: ${item.quantity} × ${Utils.formatCurrency(item.price)}</div>
                                </div>
                                <div class="confirmation-item-total">${Utils.formatCurrency(item.price * item.quantity)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="confirmation-actions">
                    <button class="btn btn-outline" onclick="closeModal('order-confirmation-modal')">Close</button>
                    <button class="btn btn-primary" onclick="closeModal('order-confirmation-modal'); scrollToCollection()">
                        Continue Shopping
                    </button>
                </div>
            </div>
        `;
        
        // Create and show confirmation modal
        this.showCustomModal('order-confirmation-modal', 'Order Confirmation', confirmationContent);
    }
    
    showCustomModal(modalId, title, content) {
        // Remove existing modal if it exists
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create new modal
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('${modalId}')"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close" onclick="closeModal('${modalId}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
        
        // Auto-remove modal after 30 seconds
        setTimeout(() => {
            if (document.getElementById(modalId)) {
                closeModal(modalId);
            }
        }, 30000);
    }
    
    setProcessingState(isProcessing) {
        this.isProcessing = isProcessing;
        
        const submitBtn = document.getElementById('place-order-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        
        if (isProcessing) {
            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    }
    
    clearFormErrors() {
        const errorElements = document.querySelectorAll('[id^="checkout-"][id$="-error"]');
        errorElements.forEach(element => {
            element.textContent = '';
            element.classList.remove('visible');
        });
        
        // Remove error classes from inputs
        const inputs = document.querySelectorAll('#checkout-form input, #checkout-form select');
        inputs.forEach(input => {
            input.classList.remove('error');
        });
    }
    
    showFormError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
            
            // Add error class to corresponding input
            const inputId = elementId.replace('-error', '');
            const input = document.getElementById(inputId);
            if (input) {
                input.classList.add('error');
            }
        }
    }
}

// Global function to close custom modals
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        
        // Remove custom modals from DOM after animation
        if (modalId.includes('confirmation')) {
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.checkoutManager = new CheckoutManager();
});