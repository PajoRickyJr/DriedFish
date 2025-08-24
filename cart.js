class CartManager {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.products = JSON.parse(localStorage.getItem('products')) || [];
        this.initEventListeners();
        this.updateCartDisplay();
    }

    initEventListeners() {
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
        }
        if (this._documentChangeHandler) {
            document.removeEventListener('change', this._documentChangeHandler);
        }
        
        // Use event delegation for dynamic cart items
        this._documentClickHandler = this.handleDocumentClick.bind(this);
        this._documentChangeHandler = this.handleDocumentChange.bind(this);
        
        document.addEventListener('click', this._documentClickHandler);
        document.addEventListener('change', this._documentChangeHandler);
        
        // Debug log to verify initialization
        console.log('Cart Manager event listeners initialized');
    }

    handleDocumentClick(e) {
        // Handle trash icon clicks with improved selector logic
        if (e.target.classList.contains('fa-trash') || e.target.classList.contains('remove-cart-item')) {
            const button = e.target.classList.contains('remove-cart-item') ? e.target : e.target.closest('.remove-cart-item');
            
            if (!button) {
                console.error('Could not find remove button element');
                return;
            }
            
            const itemId = button.dataset.id;
            console.log('Raw item ID from dataset:', itemId);
            
            if (!itemId) {
                console.error('No item ID found in remove button');
                return;
            }
            
            console.log('Removing item with ID:', itemId);
            this.removeFromCart(itemId);
            return;
        }
        
        // Handle other cart sidebar clicks
        if (e.target.closest('#cartSidebar')) {
            // Clear cart
            if (e.target.closest('.clear-cart-btn')) {
                this.clearCart();
                return;
            }
            
            // Handle quantity buttons in cart with stock validation
            if (e.target.closest('.quantity-btn')) {
                e.preventDefault();
                const button = e.target.closest('.quantity-btn');
                const id = button.dataset.id; // Keep as string to match product IDs
                const input = button.parentElement.querySelector('.cart-quantity-input');
                let newValue = parseInt(input.value) || 1;
                
                // Get product data for stock validation
                const product = this.products.find(p => String(p.id) === String(id));
                
                if (button.classList.contains('plus')) {
                    // Check stock before allowing increase
                    if (product && product.stock !== undefined) {
                        if (newValue >= product.stock) {
                            this.showNotification(`Cannot add more than available stock (${product.stock})`, 'error');
                            return; // Don't increase quantity
                        }
                    }
                    newValue++;
                } else if (button.classList.contains('minus')) {
                    newValue = Math.max(1, newValue - 1);
                }
                
                // Update input value
                input.value = newValue;
                
                // Update cart item quantity with validation
                this.updateCartItemQuantity(id, newValue);
                return;
            }
        }
    }

    handleDocumentChange(e) {
        if (e.target.classList.contains('cart-quantity-input') && !e.target.dataset.programmatic) {
            let newValue = parseInt(e.target.value);
            const id = e.target.dataset.id;
            
            // Validate input
            if (isNaN(newValue) || newValue < 1) {
                newValue = 1;
                e.target.value = 1;
            }
            
            // Get product data for stock validation
            const product = this.products.find(p => String(p.id) === String(id));
            
            // Check against available stock
            if (product && product.stock !== undefined && newValue > product.stock) {
                this.showNotification(`Only ${product.stock} items available in stock`, 'error');
                newValue = product.stock;
                e.target.value = product.stock;
            }
            
            console.log('Updating quantity for item ID:', id, 'to', newValue);
            this.updateCartItemQuantity(id, newValue);
        }
    }

    addToCart(productId, quantity) {
        console.log('Adding to cart - product ID:', productId, 'Type:', typeof productId);
        
        // Find the product, handling potential type mismatches
        const productData = this.products.find(p => String(p.id) === String(productId));
        
        if (!productData) {
            console.error('Product not found:', productId);
            this.showNotification('Product not found!', 'error');
            return;
        }

        // Enhanced stock validation
        if (productData.stock !== undefined) {
            // Check if product is available
            if (!productData.available || productData.stock <= 0) {
                this.showNotification('This product is currently out of stock', 'error');
                return;
            }
            
            // Find existing item in cart
            const existingItem = this.cart.find(item => String(item.id) === String(productId));
            const currentQty = existingItem ? existingItem.quantity : 0;
            const totalRequestedQty = quantity + currentQty;
            
            // Check if requested quantity exceeds available stock
            if (totalRequestedQty > productData.stock) {
                const availableToAdd = productData.stock - currentQty;
                if (availableToAdd <= 0) {
                    this.showNotification(`You already have the maximum available quantity (${productData.stock}) in your cart`, 'error');
                    return;
                } else {
                    this.showNotification(`Only ${availableToAdd} more can be added (${productData.stock} total available)`, 'error');
                    return;
                }
            }
        }

        // Find existing item, handling potential type mismatches
        const existingItem = this.cart.find(item => String(item.id) === String(productId));
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                id: productData.id, // Use exactly as-is from the product data
                name: productData.name,
                price: productData.price,
                quantity: quantity,
                image: productData.image,
                category: productData.category,
                maxStock: productData.stock // Store max available stock for validation
            });
        }

        this.updateStorage();
        this.updateCartDisplay();
        this.showNotification(`Added ${productData.name} to cart!`, 'success');
    }

    updateStorage() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }

    updateCartDisplay() {
        // Update cart count
        const totalItems = this.cart.reduce((acc, item) => acc + item.quantity, 0);
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = totalItems;
        });

        // Update cart items
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        
        if (!cartItems || !cartTotal) return;

        if (this.cart.length === 0) {
            cartItems.innerHTML = '<div class="empty-message">Your cart is empty</div>';
            cartTotal.textContent = '0.00';
            return;
        }

        cartItems.innerHTML = this.cart.map(item => {
            console.log(`Rendering cart item: ${item.id}, Type: ${typeof item.id}`);
            
            const product = this.products.find(p => String(p.id) === String(item.id)) || {};
            const maxAvailable = product.stock !== undefined ? product.stock : Infinity;
            
            // Disable plus button if at max stock
            const disablePlus = item.quantity >= maxAvailable ? 'disabled' : '';
            
            // Show stock warning if quantity is at or near max
            const stockWarning = product.stock !== undefined && item.quantity >= product.stock 
                ? '<p class="stock-warning">Maximum quantity reached</p>' 
                : '';
            
            return `
            <div class="cart-item" data-item-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p class="item-price">₱${item.price.toFixed(2)}</p>
                    <div class="quantity-control">
                        <button class="quantity-btn minus" data-id="${item.id}">−</button>
                        <input type="number" 
                               class="cart-quantity-input" 
                               value="${item.quantity}" 
                               min="1" 
                               max="${maxAvailable}"
                               data-id="${item.id}">
                        <button class="quantity-btn plus" data-id="${item.id}" ${disablePlus}>+</button>
                    </div>
                    ${product.stock !== undefined ? 
                      `<p class="stock-info">${product.stock} in stock</p>` : ''}
                    ${stockWarning}
                </div>
                <div class="item-subtotal">
                    <p>₱${(item.price * item.quantity).toFixed(2)}</p>
                    <button class="remove-cart-item" data-id="${item.id}" aria-label="Remove item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');

        // Debug what's in the DOM after rendering
        console.log('Cart updated, items:', this.cart.length);
        document.querySelectorAll('.remove-cart-item').forEach(btn => {
            console.log('Remove button ID:', btn.dataset.id, 'Type:', typeof btn.dataset.id);
        });

        // Update total
        const subtotal = this.cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        cartTotal.textContent = subtotal.toFixed(2);
    }

    removeFromCart(id) {
        console.log('Before removal - cart contents:', this.cart);
        console.log('Attempting to remove item with ID:', id);
        
        // Debug item types
        this.cart.forEach(item => {
            console.log(`Cart item ID: ${item.id}, Type: ${typeof item.id}`);
        });
        
        const idToRemove = id;
        
        // Filter out the item to be removed using loose equality
        const filteredCart = this.cart.filter(item => {
            return item.id != idToRemove;
        });
        
        // Check if anything was actually removed
        if (filteredCart.length === this.cart.length) {
            console.warn(`No item found with ID: ${idToRemove}`);
            console.warn('ID type:', typeof idToRemove);
            
            // Attempt more flexible matching as fallback
            const foundItem = this.cart.find(item => 
                String(item.id) === String(idToRemove) || 
                item.id === idToRemove
            );
            
            if (foundItem) {
                console.log('Found item with alternative matching:', foundItem);
                this.cart = this.cart.filter(item => item.id !== foundItem.id);
                this.updateStorage();
                this.updateCartDisplay();
                this.showNotification('Item removed from cart', 'info');
            }
        } else {
            this.cart = filteredCart;
            this.updateStorage();
            this.updateCartDisplay();
            this.showNotification('Item removed from cart', 'info');
        }
        console.log('After removal - cart contents:', this.cart);
    }

    clearCart() {
        this.cart = [];
        this.updateStorage();
        this.updateCartDisplay();
        this.showNotification('Cart cleared', 'info');
    }

    updateCartItemQuantity(id, newQuantity) {
        const item = this.cart.find(item => String(item.id) === String(id));
        if (!item) {
            console.error('Cart item not found for ID:', id);
            return;
        }
        
        const product = this.products.find(p => String(p.id) === String(id)) || {};
        
        // Validate against stock if applicable
        if (product.stock !== undefined && newQuantity > product.stock) {
            this.showNotification(`Only ${product.stock} items available in stock`, 'error');
            item.quantity = product.stock;
            
            // Update the input field in the DOM to reflect the corrected quantity
            const input = document.querySelector(`.cart-quantity-input[data-id='${id}']`);
            if (input) {
                input.dataset.programmatic = 'true'; // Prevent triggering change event
                input.value = product.stock;
                setTimeout(() => delete input.dataset.programmatic, 0); // Remove flag after update
            }
        } else {
            item.quantity = Math.max(1, newQuantity); // Ensure minimum quantity of 1
        }
        
        this.updateStorage();
        this.updateCartDisplay();
    }

    // Method to refresh product data (call this when products are updated)
    updateProductData(newProducts) {
        this.products = newProducts;
        
        // Validate existing cart items against updated stock
        let cartUpdated = false;
        this.cart.forEach(item => {
            const product = this.products.find(p => String(p.id) === String(item.id));
            if (product && product.stock !== undefined && item.quantity > product.stock) {
                console.log(`Adjusting cart item ${item.name} quantity from ${item.quantity} to ${product.stock}`);
                item.quantity = Math.max(1, product.stock);
                cartUpdated = true;
            }
        });
        
        if (cartUpdated) {
            this.updateStorage();
            this.updateCartDisplay();
            this.showNotification('Cart quantities adjusted due to stock changes', 'info');
        }
    }

    showNotification(message, type = 'success') {
        const existing = document.querySelector('.cart-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        
        let icon = '';
        switch(type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            case 'info':
                icon = '<i class="fas fa-info-circle"></i>';
                break;
        }
        
        // Create notification content
        notification.innerHTML = `
            <div class="notification-content">
                ${icon}
                <span>${message}</span>
            </div>
            <div class="notification-progress"></div>
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Start progress bar animation
        const progressBar = notification.querySelector('.notification-progress');
        progressBar.style.width = '100%';
        
        // Remove notification after delay
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Toggle Cart Visibility
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    if (!sidebar) return;
    
    sidebar.classList.toggle('active');
    
    // Close when clicking outside
    if (sidebar.classList.contains('active')) {
        const overlay = document.createElement('div');
        overlay.className = 'cart-overlay';
        overlay.addEventListener('click', toggleCart);
        document.body.appendChild(overlay);
    } else {
        const overlay = document.querySelector('.cart-overlay');
        if (overlay) overlay.remove();
    }
}

export { CartManager, toggleCart };