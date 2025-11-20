// Product Management Module
class ProductManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.searchQuery = '';
        this.filters = {
            price: '',
            material: '',
            style: ''
        };
        
        this.initializeElements();
        this.bindEvents();
        this.loadProducts();
    }
    
    initializeElements() {
        // Search elements
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        
        // Filter elements
        this.priceFilter = document.getElementById('price-filter');
        this.materialFilter = document.getElementById('material-filter');
        this.styleFilter = document.getElementById('style-filter');
        this.clearFiltersBtn = document.getElementById('clear-filters');
        
        // Display elements
        this.productsGrid = document.getElementById('products-grid');
        this.loadingElement = document.getElementById('loading');
        this.errorElement = document.getElementById('error-message');
        this.noResultsElement = document.getElementById('no-results');
        
        // Initialize filter options
        this.initializeFilterOptions();
    }
    
    initializeFilterOptions() {
        // Populate material filter
        PRODUCT_CONFIG.MATERIALS.forEach(material => {
            const option = document.createElement('option');
            option.value = material.toLowerCase();
            option.textContent = material;
            this.materialFilter.appendChild(option);
        });
        
        // Populate style filter
        PRODUCT_CONFIG.STYLES.forEach(style => {
            const option = document.createElement('option');
            option.value = style.value;
            option.textContent = style.label;
            this.styleFilter.appendChild(option);
        });
    }
    
    bindEvents() {
        // Search events
        this.searchInput.addEventListener('input', 
            Utils.debounce(() => this.handleSearch(), APP_CONFIG.SEARCH_DEBOUNCE)
        );
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSearch();
            }
        });
        this.searchBtn.addEventListener('click', () => this.handleSearch());
        
        // Filter events
        this.priceFilter.addEventListener('change', () => this.handleFilterChange());
        this.materialFilter.addEventListener('change', () => this.handleFilterChange());
        this.styleFilter.addEventListener('change', () => this.handleFilterChange());
        this.clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        
        // Product card events (delegated)
        this.productsGrid.addEventListener('click', (e) => this.handleProductClick(e));
        
        // EventBus subscriptions
        EventBus.on('cart:updated', () => this.updateProductCards());
        EventBus.on('auth:login', () => this.updateProductCards());
        EventBus.on('auth:logout', () => this.updateProductCards());
    }
    
    async loadProducts() {
        try {
            this.showLoading();
            
            // Fetch products from the API through API Gateway
            const response = await makeStorefrontApiRequest('PRODUCTS');
            
            if (response && response.products) {
                this.products = response.products;
            } else {
                // Fallback to demo products if API is not available
                console.log('API not available, using demo products');
                this.products = this.generateDemoProducts();
            }
            
            this.applyFilters();
            this.hideLoading();
            
        } catch (error) {
            console.error('Failed to load products from API:', error);
            
            // Fallback to demo products
            console.log('Using demo products as fallback');
            this.products = this.generateDemoProducts();
            this.applyFilters();
            this.hideLoading();
        }
    }
    
    generateDemoProducts() {
        const deskNames = [
            "The Levitating Obsidian Workspace", "Crystal Harmony Standing Desk", "Ancient Redwood Time Portal",
            "Floating Glass Cloud Desk", "Meteorite Edge Executive Station", "Living Moss Breathing Desk",
            "Holographic Projection Surface", "Suspended Gravity Defier", "Crystallized Lightning Capture",
            "Fossilized Dragon Bone Workstation", "Liquid Mercury Flow Desk", "Quantum Entanglement Table",
            "Bioluminescent Coral Reef Desk", "Suspended Animation Chamber", "Temporal Distortion Workspace",
            "Ethereal Mist Condensation Desk", "Volcanic Glass Eruption Table", "Celestial Star Map Surface",
            "Interdimensional Portal Gateway", "Crystallized Sound Wave Desk", "Levitating Magnetic Field Table",
            "Petrified Lightning Strike Desk", "Suspended Liquid Nitrogen Station", "Holographic Memory Bank",
            "Crystallized Time Fragment Desk", "Floating Plasma Energy Surface", "Quantum Foam Workspace",
            "Suspended Gravity Well Desk", "Crystallized Dark Matter Table", "Levitating Antimatter Station",
            "Fossilized Stardust Workspace", "Suspended Black Hole Desk", "Crystallized Wormhole Surface",
            "Floating Neutron Star Fragment", "Quantum Vacuum Energy Table", "Suspended Parallel Universe Desk",
            "Crystallized Big Bang Remnant", "Levitating Multiverse Gateway", "Fossilized Cosmic String Desk",
            "Suspended Higgs Field Station", "Crystallized Dark Energy Surface", "Floating Quantum Entangled Desk",
            "Temporal Loop Infinity Table", "Suspended Reality Distortion Desk", "Crystallized Consciousness Stream",
            "Levitating Dream Catcher Workspace", "Fossilized Thought Pattern Desk", "Suspended Memory Palace Table",
            "Crystallized Inspiration Nexus", "Floating Creativity Amplifier Desk"
        ];
        
        const descriptions = [
            "Handcrafted by master artisans using techniques passed down through generations of cosmic craftsmen.",
            "Each piece is unique, formed through a proprietary process involving quantum manipulation and stellar alignment.",
            "Sourced from the rarest materials found only in the deepest corners of the universe.",
            "Features built-in levitation technology and self-adjusting ergonomic properties.",
            "Includes integrated holographic display and telepathic interface capabilities.",
            "Crafted during rare celestial events to imbue each piece with cosmic energy.",
            "Designed to enhance creativity and productivity through harmonic resonance fields.",
            "Each desk comes with a certificate of authenticity from the Intergalactic Artisan Guild.",
            "Incorporates ancient wisdom with futuristic technology for the ultimate workspace experience.",
            "Meticulously crafted over months by renowned artisans specializing in otherworldly furniture."
        ];
        
        return deskNames.map((name, index) => ({
            id: (index + 1).toString(),
            name: name,
            description: descriptions[Math.floor(Math.random() * descriptions.length)],
            price: Math.floor(Math.random() * 495000) + 5000, // $5,000 to $500,000
            category: 'Artisanal Desks',
            material: PRODUCT_CONFIG.MATERIALS[Math.floor(Math.random() * PRODUCT_CONFIG.MATERIALS.length)],
            style: PRODUCT_CONFIG.STYLES[Math.floor(Math.random() * PRODUCT_CONFIG.STYLES.length)].value,
            inventory_count: Math.floor(Math.random() * 5) + 1,
            crafting_time_months: Math.floor(Math.random() * 12) + 3,
            artisan_name: this.generateArtisanName(),
            authenticity_certificate: `AC-${(index + 1).toString().padStart(4, '0')}`,
            dimensions: {
                width: Math.floor(Math.random() * 40) + 60, // 60-100 inches
                depth: Math.floor(Math.random() * 20) + 30, // 30-50 inches  
                height: Math.floor(Math.random() * 10) + 28  // 28-38 inches
            },
            weight_kg: Math.floor(Math.random() * 100) + 50, // 50-150 kg
            image_url: `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(name.split(' ').slice(0, 2).join(' '))}`
        }));
    }
    
    generateArtisanName() {
        const firstNames = ['Zara', 'Kai', 'Luna', 'Orion', 'Nova', 'Sage', 'Phoenix', 'River', 'Storm', 'Atlas'];
        const lastNames = ['Starweaver', 'Moonforge', 'Crystalsmith', 'Voidcrafter', 'Lightbringer', 'Dreamshaper', 'Timekeeper', 'Soulbinder', 'Mindwright', 'Spacewright'];
        
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        return `${firstName} ${lastName}`;
    }
    
    handleSearch() {
        this.searchQuery = this.searchInput.value.trim().toLowerCase();
        this.currentPage = 1;
        this.applyFilters();
    }
    
    handleFilterChange() {
        this.filters.price = this.priceFilter.value;
        this.filters.material = this.materialFilter.value;
        this.filters.style = this.styleFilter.value;
        this.currentPage = 1;
        this.applyFilters();
    }
    
    clearAllFilters() {
        this.searchInput.value = '';
        this.priceFilter.value = '';
        this.materialFilter.value = '';
        this.styleFilter.value = '';
        
        this.searchQuery = '';
        this.filters = { price: '', material: '', style: '' };
        this.currentPage = 1;
        this.applyFilters();
    }
    
    applyFilters() {
        let filtered = [...this.products];
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(this.searchQuery) ||
                product.description.toLowerCase().includes(this.searchQuery) ||
                product.material.toLowerCase().includes(this.searchQuery) ||
                product.artisan_name.toLowerCase().includes(this.searchQuery)
            );
        }
        
        // Apply price filter
        if (this.filters.price) {
            const [min, max] = this.filters.price.split('-').map(Number);
            filtered = filtered.filter(product => 
                product.price >= min && (max ? product.price <= max : true)
            );
        }
        
        // Apply material filter
        if (this.filters.material) {
            filtered = filtered.filter(product => 
                product.material.toLowerCase().includes(this.filters.material)
            );
        }
        
        // Apply style filter
        if (this.filters.style) {
            filtered = filtered.filter(product => product.style === this.filters.style);
        }
        
        this.filteredProducts = filtered;
        this.calculatePagination();
        this.displayProducts();
    }
    
    calculatePagination() {
        this.totalPages = Math.ceil(this.filteredProducts.length / APP_CONFIG.PRODUCTS_PER_PAGE);
        if (this.currentPage > this.totalPages) {
            this.currentPage = 1;
        }
    }
    
    displayProducts() {
        if (this.filteredProducts.length === 0) {
            this.showNoResults();
            return;
        }
        
        const startIndex = (this.currentPage - 1) * APP_CONFIG.PRODUCTS_PER_PAGE;
        const endIndex = startIndex + APP_CONFIG.PRODUCTS_PER_PAGE;
        const productsToShow = this.filteredProducts.slice(startIndex, endIndex);
        
        this.productsGrid.innerHTML = productsToShow.map(product => 
            this.createProductCard(product)
        ).join('');
        
        this.hideError();
        this.hideNoResults();
    }
    
    createProductCard(product) {
        const isOutOfStock = product.inventory_count === 0;
        const user = Utils.storage.get(APP_CONFIG.USER_STORAGE_KEY);
        const canAddToCart = user && !isOutOfStock;
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    🪑
                </div>
                <div class="product-info">
                    <h3 class="product-name">${Utils.sanitizeHtml(product.name)}</h3>
                    <p class="product-description">${Utils.sanitizeHtml(product.description)}</p>
                    
                    <div class="product-meta">
                        <span class="product-tag">${Utils.sanitizeHtml(product.material)}</span>
                        <span class="product-tag">${Utils.sanitizeHtml(product.style)}</span>
                        <span class="product-tag">${product.crafting_time_months} months</span>
                    </div>
                    
                    <div class="product-price">${Utils.formatCurrency(product.price)}</div>
                    
                    <div class="product-actions">
                        <button class="btn btn-primary ${!canAddToCart ? 'btn-disabled' : ''}" 
                                data-action="add-to-cart" 
                                data-product-id="${product.id}"
                                ${!canAddToCart ? 'disabled' : ''}>
                            ${isOutOfStock ? 'Out of Stock' : 
                              !user ? 'Login to Purchase' : 'Add to Cart'}
                        </button>
                        <button class="btn btn-outline" 
                                data-action="view-details" 
                                data-product-id="${product.id}">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    handleProductClick(e) {
        const action = e.target.dataset.action;
        const productId = e.target.dataset.productId;
        
        if (!action || !productId) return;
        
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        switch (action) {
            case 'add-to-cart':
                this.addToCart(product);
                break;
            case 'view-details':
                this.showProductDetails(product);
                break;
        }
    }
    
    addToCart(product) {
        const user = Utils.storage.get(APP_CONFIG.USER_STORAGE_KEY);
        if (!user) {
            EventBus.emit('auth:show-login');
            return;
        }
        
        if (product.inventory_count === 0) {
            NotificationManager.show('This item is out of stock', 'error');
            return;
        }
        
        EventBus.emit('cart:add-item', {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image_url: product.image_url,
            crafting_time_months: product.crafting_time_months
        });
    }
    
    async showProductDetails(product) {
        try {
            // Try to load full product details from API
            const productDetail = await makeStorefrontApiRequest('PRODUCT_DETAIL', {}, { id: product.id });
            
            const modal = document.getElementById('product-modal');
            const title = document.getElementById('product-modal-title');
            const content = document.getElementById('product-detail-content');
            
            title.textContent = productDetail.name || product.name;
            content.innerHTML = this.createProductDetailContent(productDetail);
            
            // Bind events for product detail modal
            this.bindProductDetailEvents(productDetail);
            
            modal.classList.remove('hidden');
            
        } catch (error) {
            console.error('Failed to load product details from API:', error);
            
            // Fallback to showing the basic product info we already have
            const modal = document.getElementById('product-modal');
            const title = document.getElementById('product-modal-title');
            const content = document.getElementById('product-detail-content');
            
            title.textContent = product.name;
            content.innerHTML = this.createProductDetailContent(product);
            
            // Bind events for product detail modal
            this.bindProductDetailEvents(product);
            
            modal.classList.remove('hidden');
        }
    }
    
    createProductDetailContent(product) {
        const user = Utils.storage.get(APP_CONFIG.USER_STORAGE_KEY);
        const isOutOfStock = product.inventory_count === 0;
        const canAddToCart = user && !isOutOfStock;
        
        return `
            <div class="product-detail-grid">
                <div class="product-detail-image">
                    🪑
                </div>
                <div class="product-detail-info">
                    <h3>${Utils.sanitizeHtml(product.name)}</h3>
                    <div class="product-detail-price">${Utils.formatCurrency(product.price)}</div>
                    <p class="product-detail-description">${Utils.sanitizeHtml(product.description)}</p>
                    
                    <div class="product-specs">
                        <div class="spec-row">
                            <span class="spec-label">Material:</span>
                            <span class="spec-value">${Utils.sanitizeHtml(product.material)}</span>
                        </div>
                        <div class="spec-row">
                            <span class="spec-label">Style:</span>
                            <span class="spec-value">${Utils.sanitizeHtml(product.style)}</span>
                        </div>
                        <div class="spec-row">
                            <span class="spec-label">Artisan:</span>
                            <span class="spec-value">${Utils.sanitizeHtml(product.artisan_name)}</span>
                        </div>
                        <div class="spec-row">
                            <span class="spec-label">Crafting Time:</span>
                            <span class="spec-value">${product.crafting_time_months} months</span>
                        </div>
                        ${product.dimensions ? `
                        <div class="spec-row">
                            <span class="spec-label">Dimensions:</span>
                            <span class="spec-value">${product.dimensions.width}" × ${product.dimensions.depth}" × ${product.dimensions.height}"</span>
                        </div>
                        ` : ''}
                        ${product.weight_kg ? `
                        <div class="spec-row">
                            <span class="spec-label">Weight:</span>
                            <span class="spec-value">${product.weight_kg} kg</span>
                        </div>
                        ` : ''}
                        <div class="spec-row">
                            <span class="spec-label">Certificate:</span>
                            <span class="spec-value">${product.authenticity_certificate}</span>
                        </div>
                        <div class="spec-row">
                            <span class="spec-label">In Stock:</span>
                            <span class="spec-value">${product.inventory_count} available</span>
                        </div>
                    </div>
                    
                    <div class="quantity-selector">
                        <label>Quantity:</label>
                        <div class="quantity-controls">
                            <button class="quantity-btn" data-action="decrease" ${!canAddToCart ? 'disabled' : ''}>-</button>
                            <input type="number" class="quantity-input" value="1" min="1" max="${product.inventory_count}" ${!canAddToCart ? 'disabled' : ''}>
                            <button class="quantity-btn" data-action="increase" ${!canAddToCart ? 'disabled' : ''}>+</button>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary btn-large ${!canAddToCart ? 'btn-disabled' : ''}" 
                            id="add-to-cart-detail" 
                            ${!canAddToCart ? 'disabled' : ''}>
                        ${isOutOfStock ? 'Out of Stock' : 
                          !user ? 'Login to Purchase' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        `;
    }
    
    bindProductDetailEvents(product) {
        const quantityInput = document.querySelector('.quantity-input');
        const decreaseBtn = document.querySelector('[data-action="decrease"]');
        const increaseBtn = document.querySelector('[data-action="increase"]');
        const addToCartBtn = document.getElementById('add-to-cart-detail');
        
        if (decreaseBtn) {
            decreaseBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value);
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                }
            });
        }
        
        if (increaseBtn) {
            increaseBtn.addEventListener('click', () => {
                const currentValue = parseInt(quantityInput.value);
                if (currentValue < product.inventory_count) {
                    quantityInput.value = currentValue + 1;
                }
            });
        }
        
        if (addToCartBtn && !addToCartBtn.disabled) {
            addToCartBtn.addEventListener('click', () => {
                const quantity = parseInt(quantityInput.value);
                for (let i = 0; i < quantity; i++) {
                    this.addToCart(product);
                }
                closeModal('product-modal');
            });
        }
    }
    
    updateProductCards() {
        // Re-render product cards to update button states
        this.displayProducts();
    }
    
    showLoading() {
        this.isLoading = true;
        this.loadingElement.classList.remove('hidden');
        this.productsGrid.innerHTML = '';
        this.hideError();
        this.hideNoResults();
    }
    
    hideLoading() {
        this.isLoading = false;
        this.loadingElement.classList.add('hidden');
    }
    
    showError(message) {
        this.errorElement.textContent = message;
        this.errorElement.classList.remove('hidden');
        this.productsGrid.innerHTML = '';
        this.hideLoading();
        this.hideNoResults();
    }
    
    hideError() {
        this.errorElement.classList.add('hidden');
    }
    
    showNoResults() {
        this.noResultsElement.classList.remove('hidden');
        this.productsGrid.innerHTML = '';
        this.hideError();
        this.hideLoading();
    }
    
    hideNoResults() {
        this.noResultsElement.classList.add('hidden');
    }
}

// Global functions for HTML onclick handlers
function scrollToCollection() {
    Utils.scrollToElement('collection', 80);
}

function showAbout() {
    const aboutContent = `
        <h3>About Artisan Desks</h3>
        <p>We are the premier destination for the world's most extraordinary handcrafted desks. Each piece in our collection is a unique work of art, created by master craftsmen using the rarest materials and most advanced techniques.</p>
        <p>Our desks are not just furniture - they are investments in creativity, productivity, and cosmic harmony. Every piece comes with a certificate of authenticity and is crafted with meticulous attention to detail.</p>
        <p>From floating crystal surfaces to living wood sculptures, our collection represents the pinnacle of artisanal craftsmanship combined with otherworldly design.</p>
    `;
    
    NotificationManager.show(aboutContent, 'info', 8000);
}

function clearAllFilters() {
    if (window.productManager) {
        window.productManager.clearAllFilters();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productManager = new ProductManager();
});