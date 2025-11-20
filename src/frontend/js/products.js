// Products Module - Handles product browsing, search, and display
class ProductsManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE;
        this.totalPages = 1;
        this.currentSearch = '';
        this.currentCategory = '';
        this.products = [];
        this.categories = [];
        this.searchTimeout = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadInitialData();
    }
    
    initializeElements() {
        // Search elements
        this.searchInput = document.getElementById('search-input');
        this.searchBtn = document.getElementById('search-btn');
        this.categoryFilter = document.getElementById('category-filter');
        
        // Display elements
        this.productsGrid = document.getElementById('products-grid');
        this.loadingElement = document.getElementById('loading');
        this.errorElement = document.getElementById('error-message');
        
        // Pagination elements
        this.paginationSection = document.getElementById('pagination');
        this.prevPageBtn = document.getElementById('prev-page');
        this.nextPageBtn = document.getElementById('next-page');
        this.pageInfo = document.getElementById('page-info');
        
        // Modal elements
        this.productModal = document.getElementById('product-modal');
        this.productDetail = document.getElementById('product-detail');
        this.modalClose = this.productModal.querySelector('.close');
    }
    
    bindEvents() {
        // Search events
        this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.categoryFilter.addEventListener('change', (e) => this.handleCategoryChange(e));
        
        // Pagination events
        this.prevPageBtn.addEventListener('click', () => this.goToPreviousPage());
        this.nextPageBtn.addEventListener('click', () => this.goToNextPage());
        
        // Modal events
        this.modalClose.addEventListener('click', () => this.closeProductModal());
        this.productModal.addEventListener('click', (e) => {
            if (e.target === this.productModal) {
                this.closeProductModal();
            }
        });
        
        // Keyboard events
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.productModal.classList.contains('hidden')) {
                this.closeProductModal();
            }
        });
    }
    
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadCategories(),
                this.loadProducts()
            ]);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load initial data. Please refresh the page.');
        }
    }
    
    async loadCategories() {
        try {
            const url = buildUnifiedApiUrl('PRODUCT_CATEGORIES');
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.categories = data.categories || [];
            this.populateCategoryFilter();
        } catch (error) {
            console.error('Failed to load categories:', error);
            // Continue without categories - not critical
        }
    }
    
    populateCategoryFilter() {
        // Clear existing options except "All Categories"
        while (this.categoryFilter.children.length > 1) {
            this.categoryFilter.removeChild(this.categoryFilter.lastChild);
        }
        
        // Add category options
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            this.categoryFilter.appendChild(option);
        });
    }
    
    async loadProducts(page = 1, search = '', category = '') {
        this.showLoading();
        
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: this.pageSize.toString()
            });
            
            if (search) {
                params.append('search', search);
            }
            
            if (category) {
                params.append('category', category);
            }
            
            const url = `${buildUnifiedApiUrl('PRODUCTS')}?${params}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.products = data.products || [];
            this.currentPage = data.page || 1;
            this.totalPages = data.totalPages || 1;
            
            this.displayProducts();
            this.updatePagination();
            this.hideLoading();
            
        } catch (error) {
            console.error('Failed to load products:', error);
            this.hideLoading();
            this.showError('Failed to load products. Please try again.');
        }
    }
    
    displayProducts() {
        if (this.products.length === 0) {
            this.productsGrid.innerHTML = `
                <div class="no-products">
                    <p>No products found.</p>
                    ${this.currentSearch || this.currentCategory ? 
                        '<p>Try adjusting your search or filter criteria.</p>' : ''}
                </div>
            `;
            return;
        }
        
        this.productsGrid.innerHTML = this.products.map(product => 
            this.createProductCard(product)
        ).join('');
        
        // Add click events to product cards
        this.productsGrid.querySelectorAll('.product-card').forEach((card, index) => {
            card.addEventListener('click', () => this.showProductDetail(this.products[index]));
        });
    }
    
    createProductCard(product) {
        const price = typeof product.price === 'number' ? product.price.toFixed(2) : '0.00';
        const description = product.description || 'No description available';
        const category = product.category || 'Uncategorized';
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    ${product.image_url ? 
                        `<img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
                        'No Image Available'
                    }
                </div>
                <div class="product-info">
                    <h3 class="product-name">${this.escapeHtml(product.name)}</h3>
                    <p class="product-description">${this.escapeHtml(description)}</p>
                    <div class="product-price">$${price}</div>
                    <span class="product-category">${this.escapeHtml(category)}</span>
                </div>
            </div>
        `;
    }
    
    async showProductDetail(product) {
        try {
            // Load full product details
            const url = buildUnifiedApiUrl('PRODUCT_DETAIL', { id: product.id });
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const productDetail = await response.json();
            this.displayProductDetail(productDetail);
            this.productModal.classList.remove('hidden');
            
        } catch (error) {
            console.error('Failed to load product details:', error);
            this.showError('Failed to load product details. Please try again.');
        }
    }
    
    displayProductDetail(product) {
        const price = typeof product.price === 'number' ? product.price.toFixed(2) : '0.00';
        const description = product.description || 'No description available';
        const category = product.category || 'Uncategorized';
        const inventoryCount = product.inventory_count || 0;
        
        this.productDetail.innerHTML = `
            <div class="product-detail-image">
                ${product.image_url ? 
                    `<img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">` :
                    'No Image Available'
                }
            </div>
            <h2 class="product-detail-name">${this.escapeHtml(product.name)}</h2>
            <div class="product-detail-price">$${price}</div>
            <p class="product-detail-description">${this.escapeHtml(description)}</p>
            <span class="product-detail-category">${this.escapeHtml(category)}</span>
            
            ${inventoryCount > 0 ? `
                <div class="quantity-controls">
                    <label for="quantity-input">Quantity:</label>
                    <button class="quantity-btn" id="decrease-qty">-</button>
                    <input type="number" id="quantity-input" value="1" min="1" max="${inventoryCount}">
                    <button class="quantity-btn" id="increase-qty">+</button>
                    <span class="inventory-info">(${inventoryCount} available)</span>
                </div>
                
                <div class="add-to-cart-section">
                    <button id="add-to-cart-btn" class="btn btn-primary" data-product-id="${product.id}">
                        Add to Cart
                    </button>
                </div>
            ` : `
                <div class="out-of-stock">
                    <p style="color: #dc3545; font-weight: bold;">Out of Stock</p>
                </div>
            `}
        `;
        
        // Bind quantity control events
        if (inventoryCount > 0) {
            this.bindQuantityControls(inventoryCount);
            this.bindAddToCartEvent(product);
        }
    }
    
    bindQuantityControls(maxQuantity) {
        const quantityInput = document.getElementById('quantity-input');
        const decreaseBtn = document.getElementById('decrease-qty');
        const increaseBtn = document.getElementById('increase-qty');
        
        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
        
        increaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue < maxQuantity) {
                quantityInput.value = currentValue + 1;
            }
        });
        
        quantityInput.addEventListener('change', () => {
            const value = parseInt(quantityInput.value);
            if (value < 1) quantityInput.value = 1;
            if (value > maxQuantity) quantityInput.value = maxQuantity;
        });
    }
    
    bindAddToCartEvent(product) {
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        const quantityInput = document.getElementById('quantity-input');
        
        addToCartBtn.addEventListener('click', async () => {
            const quantity = parseInt(quantityInput.value);
            
            if (window.cartManager) {
                try {
                    const productData = {
                        name: product.name,
                        price: product.price,
                        category: product.category,
                        image_url: product.image_url
                    };
                    
                    const success = await window.cartManager.addToCart(product.id, quantity, productData);
                    if (success) {
                        this.closeProductModal();
                        // Success message is shown by cartManager
                    }
                } catch (error) {
                    console.error('Failed to add to cart:', error);
                    this.showError('Failed to add item to cart. Please try again.');
                }
            } else {
                this.showError('Cart functionality not available. Please refresh the page.');
            }
        });
    }
    
    closeProductModal() {
        this.productModal.classList.add('hidden');
    }
    
    handleSearchInput(e) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch();
        }, APP_CONFIG.UI.SEARCH_DEBOUNCE_MS);
    }
    
    performSearch() {
        this.currentSearch = this.searchInput.value.trim();
        this.currentPage = 1;
        this.loadProducts(this.currentPage, this.currentSearch, this.currentCategory);
    }
    
    handleCategoryChange(e) {
        this.currentCategory = e.target.value;
        this.currentPage = 1;
        this.loadProducts(this.currentPage, this.currentSearch, this.currentCategory);
    }
    
    goToPreviousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadProducts(this.currentPage, this.currentSearch, this.currentCategory);
        }
    }
    
    goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadProducts(this.currentPage, this.currentSearch, this.currentCategory);
        }
    }
    
    updatePagination() {
        if (this.totalPages <= 1) {
            this.paginationSection.classList.add('hidden');
            return;
        }
        
        this.paginationSection.classList.remove('hidden');
        this.pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        
        this.prevPageBtn.disabled = this.currentPage <= 1;
        this.nextPageBtn.disabled = this.currentPage >= this.totalPages;
    }
    
    showLoading() {
        this.loadingElement.classList.remove('hidden');
        this.productsGrid.innerHTML = '';
        this.errorElement.classList.add('hidden');
    }
    
    hideLoading() {
        this.loadingElement.classList.add('hidden');
    }
    
    showError(message) {
        this.errorElement.textContent = message;
        this.errorElement.classList.remove('hidden');
        this.productsGrid.innerHTML = '';
    }
    
    showSuccessMessage(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #d4edda;
            color: #155724;
            padding: 1rem;
            border-radius: 5px;
            border: 1px solid #c3e6cb;
            z-index: 1001;
            max-width: 300px;
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 3000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize products manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productsManager = new ProductsManager();
});