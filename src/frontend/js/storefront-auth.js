// Authentication Management Module
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = null;
        
        this.initializeElements();
        this.bindEvents();
        this.checkAuthStatus();
    }
    
    initializeElements() {
        // Header auth elements
        this.userInfo = document.getElementById('user-info');
        this.userName = document.getElementById('user-name');
        this.logoutBtn = document.getElementById('logout-btn');
        this.authButtons = document.getElementById('auth-buttons');
        this.loginBtn = document.getElementById('login-btn');
        this.registerBtn = document.getElementById('register-btn');
        
        // Modal elements
        this.loginModal = document.getElementById('login-modal');
        this.registerModal = document.getElementById('register-modal');
        
        // Form elements
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        
        // Switch buttons
        this.switchToRegister = document.getElementById('switch-to-register');
        this.switchToLogin = document.getElementById('switch-to-login');
    }
    
    bindEvents() {
        // Header button events
        this.loginBtn.addEventListener('click', () => this.showLogin());
        this.registerBtn.addEventListener('click', () => this.showRegister());
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        // Form events
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Switch events
        this.switchToRegister.addEventListener('click', () => this.switchToRegisterModal());
        this.switchToLogin.addEventListener('click', () => this.switchToLoginModal());
        
        // EventBus subscriptions
        EventBus.on('auth:show-login', () => this.showLogin());
        EventBus.on('auth:show-register', () => this.showRegister());
    }
    
    checkAuthStatus() {
        const savedUser = Utils.storage.get(APP_CONFIG.USER_STORAGE_KEY);
        if (savedUser) {
            // Check if session is still valid
            const now = Date.now();
            if (savedUser.loginTime && (now - savedUser.loginTime) < APP_CONFIG.SESSION_TIMEOUT) {
                this.currentUser = savedUser;
                this.updateAuthDisplay();
                this.startSessionTimeout();
                EventBus.emit('auth:login', this.currentUser);
            } else {
                // Session expired
                this.logout(false);
            }
        }
    }
    
    showLogin() {
        this.clearForms();
        this.loginModal.classList.remove('hidden');
        const loginInput = document.getElementById('login-username') || document.getElementById('login-email');
        if (loginInput) loginInput.focus();
    }
    
    showRegister() {
        this.clearForms();
        this.registerModal.classList.remove('hidden');
        const registerInput = document.getElementById('register-email') || document.getElementById('register-name');
        if (registerInput) registerInput.focus();
    }
    
    switchToRegisterModal() {
        this.loginModal.classList.add('hidden');
        this.showRegister();
    }
    
    switchToLoginModal() {
        this.registerModal.classList.add('hidden');
        this.showLogin();
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(this.loginForm);
        const username = (formData.get('username') || formData.get('email') || '').trim();
        const password = formData.get('password');
        
        // Clear previous errors
        this.clearFormErrors('login');
        
        // Validate input
        if (!this.validateLoginForm(username, password)) {
            return;
        }
        
        // Show loading state
        this.setFormLoading('login', true);
        
        try {
            // Call the Auth API through API Gateway
            const response = await makeStorefrontApiRequest('AUTH_LOGIN', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: username,
                    password: password 
                })
            });
            
            if (response.sessionId && response.userId) {
                const user = {
                    id: response.userId,
                    username: response.email,
                    name: response.name || response.email.split('@')[0],
                    email: response.email,
                    loginTime: Date.now(),
                    token: response.sessionId
                };
                
                this.loginSuccess(user);
            } else {
                throw new Error(response.error || response.message || 'Login failed. Please check your credentials.');
            }
            
        } catch (error) {
            
            // Handle demo fallback for development
            if (username === 'demo' && password === 'demo') {
                const user = {
                    id: 'demo-user',
                    username: 'demo',
                    name: 'Demo User',
                    email: 'demo@artisandesks.com',
                    loginTime: Date.now(),
                    token: 'demo-token-' + Date.now()
                };
                this.loginSuccess(user);
            } else {
                this.showFormError('login-form-error', 
                    error.message || 'Login failed. Please try again.');
            }
        } finally {
            this.setFormLoading('login', false);
        }
    }
    
    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(this.registerForm);
        const email = formData.get('email').trim();
        const username = (formData.get('username') || formData.get('name') || '').trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        
        // Clear previous errors
        this.clearFormErrors('register');
        
        // Validate input
        if (!this.validateRegisterForm(email, username, password, confirmPassword)) {
            return;
        }
        
        // Show loading state
        this.setFormLoading('register', true);
        
        try {
            // Call the Auth API through API Gateway
            const response = await makeStorefrontApiRequest('AUTH_REGISTER', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: email,
                    name: username, // Use username as name
                    password: password
                })
            });
            
            if (response.userId) {
                // Registration successful, now login automatically
                try {
                    const loginResponse = await makeStorefrontApiRequest('AUTH_LOGIN', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            email: email,
                            password: password 
                        })
                    });
                    
                    if (loginResponse.sessionId && loginResponse.userId) {
                        const user = {
                            id: loginResponse.userId,
                            username: loginResponse.email,
                            name: response.name || username,
                            email: loginResponse.email,
                            loginTime: Date.now(),
                            token: loginResponse.sessionId
                        };
                        
                        this.loginSuccess(user);
                        NotificationManager.show('Account created successfully! You are now logged in.', 'success');
                    } else {
                        NotificationManager.show('Account created successfully! Please log in.', 'success');
                        this.switchToLoginModal();
                    }
                } catch (loginError) {
                    console.error('Auto-login after registration failed:', loginError);
                    NotificationManager.show('Account created successfully! Please log in.', 'success');
                    this.switchToLoginModal();
                }
            } else {
                throw new Error(response.error || response.message || 'Registration failed. Please try again.');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            
            // Demo fallback for development
            console.log('Using demo fallback registration');
            const user = {
                id: 'user-' + Date.now(),
                username: username,
                name: username,
                email: email,
                loginTime: Date.now(),
                token: 'token-' + Date.now()
            };
            
            this.loginSuccess(user);
            NotificationManager.show('Account created successfully! (Demo mode)', 'success');
            
        } finally {
            this.setFormLoading('register', false);
        }
    }
    
    validateLoginForm(username, password) {
        let isValid = true;
        
        // Handle both username and email field naming
        const usernameErrorId = document.getElementById('login-username-error') ? 'login-username-error' : 'login-email-error';
        const passwordErrorId = document.getElementById('login-password-error') ? 'login-password-error' : 'login-password-error';
        
        if (!username) {
            this.showFormError(usernameErrorId, 'Email is required');
            isValid = false;
        } else if (!Utils.validateEmail(username)) {
            this.showFormError(usernameErrorId, 'Please enter a valid email address');
            isValid = false;
        }
        
        if (!password) {
            this.showFormError(passwordErrorId, 'Password is required');
            isValid = false;
        }
        
        return isValid;
    }
    
    validateRegisterForm(email, username, password, confirmPassword) {
        let isValid = true;
        
        if (!email) {
            this.showFormError('register-email-error', 'Email is required');
            isValid = false;
        } else if (!Utils.validateEmail(email)) {
            this.showFormError('register-email-error', 'Please enter a valid email');
            isValid = false;
        }
        
        if (!username) {
            // Handle both username and name field naming
            const usernameErrorId = document.getElementById('register-username-error') ? 'register-username-error' : 'register-name-error';
            this.showFormError(usernameErrorId, 'Name is required');
            isValid = false;
        } else if (username.length < 2) {
            const usernameErrorId = document.getElementById('register-username-error') ? 'register-username-error' : 'register-name-error';
            this.showFormError(usernameErrorId, 'Name must be at least 2 characters');
            isValid = false;
        }
        
        if (!password) {
            this.showFormError('register-password-error', 'Password is required');
            isValid = false;
        } else if (!Utils.validatePassword(password)) {
            this.showFormError('register-password-error', 'Password must be at least 6 characters');
            isValid = false;
        }
        
        if (confirmPassword !== undefined && password !== confirmPassword) {
            this.showFormError('register-confirm-password-error', 'Passwords do not match');
            isValid = false;
        }
        
        return isValid;
    }
    
    loginSuccess(user) {
        this.currentUser = user;
        Utils.storage.set(APP_CONFIG.USER_STORAGE_KEY, user);
        this.updateAuthDisplay();
        this.loginModal.classList.add('hidden');
        this.registerModal.classList.add('hidden');
        this.startSessionTimeout();
        EventBus.emit('auth:login', user);
        NotificationManager.show(SUCCESS_MESSAGES.LOGIN_SUCCESS, 'success');
    }
    
    getUser() {
        return this.currentUser;
    }
    
    logout(showMessage = true) {
        // Clear user data
        this.currentUser = null;
        Utils.storage.remove(APP_CONFIG.USER_STORAGE_KEY);
        
        // Clear session timeout
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
            this.sessionTimeout = null;
        }
        
        // Update UI
        this.updateAuthDisplay();
        
        // Clear cart
        EventBus.emit('cart:clear');
        
        // Emit event
        EventBus.emit('auth:logout');
        
        // Show success message
        if (showMessage) {
            NotificationManager.show(SUCCESS_MESSAGES.LOGOUT_SUCCESS, 'success');
        }
    }
    
    updateAuthDisplay() {
        if (this.currentUser) {
            if (this.userName) this.userName.textContent = this.currentUser.name || this.currentUser.username;
            if (this.userInfo) this.userInfo.classList.remove('hidden');
            if (this.authButtons) this.authButtons.classList.add('hidden');
        } else {
            if (this.userInfo) this.userInfo.classList.add('hidden');
            if (this.authButtons) this.authButtons.classList.remove('hidden');
        }
    }
    
    startSessionTimeout() {
        // Clear existing timeout
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }
        
        // Set new timeout
        this.sessionTimeout = setTimeout(() => {
            NotificationManager.show('Your session has expired. Please log in again.', 'warning');
            this.logout(false);
        }, APP_CONFIG.SESSION_TIMEOUT);
    }
    
    setFormLoading(formType, isLoading) {
        const form = formType === 'login' ? this.loginForm : this.registerForm;
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
            form.classList.add('loading');
        } else {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
            form.classList.remove('loading');
        }
    }
    
    clearForms() {
        this.loginForm.reset();
        this.registerForm.reset();
        this.clearFormErrors('login');
        this.clearFormErrors('register');
    }
    
    clearFormErrors(formType) {
        const prefix = formType === 'login' ? 'login' : 'register';
        const errorElements = document.querySelectorAll(`[id^="${prefix}"][id$="-error"]`);
        
        errorElements.forEach(element => {
            element.textContent = '';
            element.classList.remove('visible');
        });
        
        // Remove error classes from inputs
        const inputs = document.querySelectorAll(`#${prefix}-form input`);
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
    
    // Public methods
    getCurrentUser() {
        return this.currentUser;
    }
    
    isAuthenticated() {
        return !!this.currentUser;
    }
    
    getAuthToken() {
        return this.currentUser ? this.currentUser.token : null;
    }
}

// Notification Management Module
class NotificationManager {
    static container = null;
    
    static init() {
        if (!NotificationManager.container) {
            NotificationManager.container = document.getElementById('notification-container');
        }
    }
    
    static show(message, type = 'info', duration = APP_CONFIG.NOTIFICATION_DELAY) {
        NotificationManager.init();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                ${typeof message === 'string' ? Utils.sanitizeHtml(message) : message}
            </div>
        `;
        
        NotificationManager.container.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            NotificationManager.remove(notification);
        }, duration);
        
        // Allow manual removal by clicking
        notification.addEventListener('click', () => {
            NotificationManager.remove(notification);
        });
        
        return notification;
    }
    
    static remove(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'notificationSlideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }
    
    static clear() {
        NotificationManager.init();
        NotificationManager.container.innerHTML = '';
    }
}

// Modal Management
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        
        // Clear any form errors when closing
        if (modalId === 'login-modal' || modalId === 'register-modal') {
            const authManager = window.authManager;
            if (authManager) {
                authManager.clearForms();
            }
        }
    }
}

// Global click handler for modal overlays
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
});

// Global escape key handler for modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const visibleModal = document.querySelector('.modal:not(.hidden)');
        if (visibleModal) {
            visibleModal.classList.add('hidden');
        }
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    NotificationManager.init();
});