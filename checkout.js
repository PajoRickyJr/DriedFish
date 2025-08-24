document.addEventListener('DOMContentLoaded', () => {
    // Initialize checkout functionality based on current page
    const isCheckoutPage = window.location.pathname.includes('checkout.html');
    
    if (isCheckoutPage) {
        initCheckoutPage();
    } else {
        // Set up checkout button on product/cart pages
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', handleCheckout);
        }
    }
});

/**
 * Handles the checkout button click from cart
 */
function handleCheckout() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        showNotification('Your cart is empty. Please add items before checkout.', 'error');
        return;
    }
    
    // Store current page to allow returning if needed
    sessionStorage.setItem('returnPage', window.location.href);
    
    // Redirect to checkout page
    window.location.href = 'checkout.html';
}

/**
 * Initialize the checkout page functionality
 */
function initCheckoutPage() {
    console.log('Initializing checkout page');
    
    // Load Firebase modules dynamically if not already loaded
    loadFirebaseModules()
        .then(() => {
            console.log('Firebase modules loaded');
        })
        .catch(error => {
            console.warn('Firebase modules could not be loaded:', error);
        })
        .finally(() => {
            // Continue with checkout initialization regardless of Firebase status
            
            // Load cart items into checkout summary
            loadCartItems();
            
            // Set up payment method toggles
            setupPaymentFieldsToggle();
            
            // Set up form submission handling
            setupFormSubmission();
            
            // Update cart count in the header
            updateCartCount();
        });
}
/*
* Load Firebase modules dynamically
 * @returns {Promise<void>}
 */
async function loadFirebaseModules() {
    // Only load if not already loaded
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        return Promise.resolve();
    }
    
    try {
        // Import Firebase app and firestore using v9 modular syntax
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js");
        const { 
            getFirestore, 
            collection, 
            doc, 
            setDoc, 
            updateDoc, 
            getDoc 
        } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js");
        
        // Initialize Firebase with your config
        const firebaseConfig = {
            apiKey: "AIzaSyCZng7hGtaskclssS8d00s690x7V10h0AI",
            authDomain: "fishdriedfish-store.firebaseapp.com",
            projectId: "fishdriedfish-store",
            storageBucket: "fishdriedfish-store.appspot.com",
            messagingSenderId: "803235286692",
            appId: "1:803235286692:web:2aa4097a15d3e35bd52031",
            measurementId: "G-FP9Y9XZ02M"
        };
        
        // Initialize app and get firestore instance
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        
        // Store references globally for later use
        window.firebaseModules = {
            db,
            collection,
            doc,
            setDoc,
            updateDoc,
            getDoc
        };
        
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading Firebase modules:', error);
        return Promise.reject(error);
    }
}

/**
 * Load cart items into the checkout summary
 */
function loadCartItems() {
    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const checkoutItemsContainer = document.getElementById('checkoutItems');
    
    if (!checkoutItemsContainer) {
        console.error('Checkout items container not found');
        return;
    }
    
    // Redirect to products if cart is empty
    if (cart.length === 0) {
        window.location.href = 'products.html';
        return;
    }
    
    let subtotal = 0;
    
    // Render each cart item
    checkoutItemsContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        return `
            <div class="checkout-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="checkout-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.quantity} × ₱${item.price.toFixed(2)}</p>
                </div>
                <div class="checkout-item-price">
                    ₱${itemTotal.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
    
    // Update monetary totals
    updateOrderTotals(subtotal);
}

/**
 * Update the order totals display
 * @param {number} subtotal - The cart subtotal
 */
function updateOrderTotals(subtotal) {
    // Update subtotal
    const subtotalElement = document.getElementById('subtotal');
    if (subtotalElement) {
        subtotalElement.textContent = subtotal.toFixed(2);
    }
    
    // Get shipping cost and calculate total
    const shippingElement = document.getElementById('shipping');
    const shipping = shippingElement ? parseFloat(shippingElement.textContent) : 0;
    const total = subtotal + shipping;
    
    const totalElement = document.getElementById('total');
    if (totalElement) {
        totalElement.textContent = total.toFixed(2);
    }
}

/**
 * Toggle payment fields based on payment method selection
 */
function setupPaymentFieldsToggle() {
    const paymentMethod = document.getElementById('paymentMethod');
    const cardPaymentFields = document.getElementById('cardPaymentFields');
    
    if (!paymentMethod || !cardPaymentFields) return;
    
    paymentMethod.addEventListener('change', () => {
        const selectedMethod = paymentMethod.value;
        
        // Show card fields only for credit/debit card options
        if (selectedMethod === 'credit' || selectedMethod === 'debit') {
            cardPaymentFields.style.display = 'block';
            
            // Make card fields required
            document.getElementById('cardName').required = true;
            document.getElementById('cardNumber').required = true;
            document.getElementById('expDate').required = true;
            document.getElementById('cvv').required = true;
        } else {
            cardPaymentFields.style.display = 'none';
            
            // Make card fields not required
            document.getElementById('cardName').required = false;
            document.getElementById('cardNumber').required = false;
            document.getElementById('expDate').required = false;
            document.getElementById('cvv').required = false;
        }
    });
    
    // Initial toggle - hide by default
    cardPaymentFields.style.display = 'none';
}

/**
 * Set up form submission handler
 */
function setupFormSubmission() {
    const checkoutForm = document.getElementById('checkoutForm');
    
    if (!checkoutForm) return;
    
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Validate form before submission
        if (!validateCheckoutForm()) {
            return;
        }
        
        // Update button to show processing
        const orderButton = checkoutForm.querySelector('.place-order-btn');
        const originalText = orderButton.textContent;
        
        orderButton.textContent = 'Processing...';
        orderButton.disabled = true;
        
        // Process the order
        processOrder().then(() => {
            // Show order success
            const checkoutContent = document.getElementById('checkoutContent');
            const orderSuccess = document.getElementById('orderSuccess');
            
            if (checkoutContent) checkoutContent.style.display = 'none';
            if (orderSuccess) orderSuccess.style.display = 'block';
        }).catch(error => {
            console.error('Order processing error:', error);
            // Show error message
            const orderError = document.getElementById('orderError');
            if (orderError) orderError.style.display = 'block';
            
            // Reset button
            orderButton.textContent = originalText;
            orderButton.disabled = false;
        });
    });
}

/**
 * Validate checkout form fields
 * @returns {boolean} - Whether the form is valid
 */
function validateCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    // Check all required fields
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#e74c3c';
            isValid = false;
        } else {
            field.style.borderColor = '';
        }
    });
   
    return isValid;
}

function getPaymentDetails() {
    return { method: 'cod' };
}

/**
 * Process the order and store it
 * @returns {Promise} - Order processing promise
 */
async function processOrder() {
    return new Promise(async (resolve, reject) => {
        try {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const form = document.getElementById('checkoutForm');
            if (!form || cart.length === 0) { reject('No form or cart'); return; }
            const formData = new FormData(form);
            // Calculate order totals
            const subtotal = parseFloat(document.getElementById('subtotal')?.textContent || '0');
            const shipping = parseFloat(document.getElementById('shipping')?.textContent || '0');
            const total = subtotal + shipping;
            // Create order object
            const order = {
                id: generateOrderReference(),
                date: new Date().toISOString(),
                customer: {
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    phone: formData.get('phone'),
                    address: formData.get('address'),
                    city: formData.get('city')
                },
                items: cart,
                subtotal,
                shipping,
                total,
                payment: { method: 'cod' },
                status: 'pending'
            };
            // Save order to Firestore/localStorage
            await saveOrderToFirestore(order);
            await updateProductStock(cart);
            // Clear cart
            localStorage.removeItem('cart');
            // Show order success
            document.getElementById('orderReference').textContent = order.id;
            document.getElementById('orderSuccess').style.display = 'block';
            document.getElementById('checkoutContent').style.display = 'none';
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/*
* Save order to Firebase Firestore
 * @param {Object} order - The order to save
 * @returns {Promise<void>}
 */
async function saveOrderToFirestore(order) {
    try {
        if (!window.firebaseModules) {
            console.warn('Firebase modules not loaded');
            return;
        }
        
        const { db, collection, doc, setDoc } = window.firebaseModules;
        
        // Create a reference to the order document
        const orderCollection = collection(db, 'orders');
        const orderDoc = doc(orderCollection, order.id);
        
        // Set the order data
        await setDoc(orderDoc, order);
        console.log('Order saved to Firestore:', order.id);
    } catch (error) {
        console.error('Error saving order to Firestore:', error);
       
    }
}

/**
 * Update product stock after purchase
 * @param {Array} cartItems - Items from the cart
 * @returns {Promise} - Stock update promise
 */
async function updateProductStock(cartItems) {
    // Update localStorage
    const products = JSON.parse(localStorage.getItem('products')) || [];
    cartItems.forEach(cartItem => {
        const product = products.find(p => String(p.id) === String(cartItem.id));
        if (product && product.stock !== undefined) {
            product.stock -= cartItem.quantity;
            product.available = product.stock > 0;
        }
    });
    localStorage.setItem('products', JSON.stringify(products));

    // Check if Firebase modules are available
    if (window.firebaseModules) {
        const { db, collection, doc, getDoc, updateDoc } = window.firebaseModules;
        
        try {
            // Update Firebase stock in parallel
            const updatePromises = cartItems.map(async (cartItem) => {
                try {
                    // Create reference to the product document
                    const productsCollection = collection(db, 'products');
                    const productRef = doc(productsCollection, String(cartItem.id));
                    
                    // Get current stock to avoid race conditions
                    const productSnap = await getDoc(productRef);
                    
                    if (productSnap.exists()) {
                        const productData = productSnap.data();
                        const currentStock = productData.stock || 0;
                        const newStock = Math.max(0, currentStock - cartItem.quantity);
                        
                        return updateDoc(productRef, {
                            stock: newStock,
                            available: newStock > 0
                        });
                    }
                } catch (error) {
                    console.error(`Error updating stock for product ${cartItem.id}:`, error);
                }
            });
            
            await Promise.all(updatePromises);
            console.log('Product stock updated in Firestore');
        } catch (error) {
            console.error('Error updating Firestore stock:', error);
        }
    }
}   

/**
 * Generate a unique order reference number
 * @returns {string} - Order reference ID
 */
function generateOrderReference() {
    const prefix = 'FISH';
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Update cart count in header
 */
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    
    // Update all cart count elements
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = totalItems;
    });
}

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'success') {
    // Remove existing notification if present
    const existing = document.querySelector('.cart-notification');
    if (existing) existing.remove();
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `cart-notification ${type}`;
    
    // Set icon based on type
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

// Export public functions
export {
    handleCheckout,
    showNotification
};