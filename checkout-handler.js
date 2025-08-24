// Firebase initialization (using global firebase object)
const firebaseConfig = {
  apiKey: "AIzaSyCZng7hGtaskclssS8d00s690x7V10h0AI",
  authDomain: "fishdriedfish-store.firebaseapp.com",
  projectId: "fishdriedfish-store",
  storageBucket: "fishdriedfish-store.appspot.com",
  messagingSenderId: "803235286692",
  appId: "1:803235286692:web:2aa4097a15d3e35bd52031",
  measurementId: "G-FP9Y9XZ02M"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    // Use the global cartManager instance
    loadCartItems();
    setupPaymentFieldsToggle();
    setupFormSubmission();
    updateCartCount();
});

// Load cart items into the checkout summary
function loadCartItems() {
    const cart = window.cartManager.cart; 
    const checkoutItemsContainer = document.getElementById('checkoutItems');
    
    if (!checkoutItemsContainer) {
        console.error('Checkout items container not found');
        return;
    }
    
    if (cart.length === 0) {
        window.location.href = 'products.html';
        return;
    }
    
    let subtotal = 0;
    
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

// Toggle payment fields based on payment method selection
function setupPaymentFieldsToggle() {
    const paymentMethod = document.getElementById('paymentMethod');
    const cardPaymentFields = document.getElementById('cardPaymentFields');
    
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
    
    // Initial toggle
    cardPaymentFields.style.display = 'none';
}

// Handle form submission
function setupFormSubmission() {
    const checkoutForm = document.getElementById('checkoutForm');
    
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Validate form before submission
        if (!validateCheckoutForm()) {
            return;
        }
        
        // Simulate form processing
        const orderButton = checkoutForm.querySelector('.place-order-btn');
        const originalText = orderButton.textContent;
        
        orderButton.textContent = 'Processing...';
        orderButton.disabled = true;
        
        // Process the order
        processOrder();
    });
}

// Validate checkout form
function validateCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#e74c3c';
            isValid = false;
        } else {
            field.style.borderColor = '';
        }
    });
    
    // Additional validation for card fields if payment method requires them
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (paymentMethod === 'credit' || paymentMethod === 'debit') {
        const cardNumber = document.getElementById('cardNumber').value;
        if (!/^\d{16}$/.test(cardNumber)) {
            alert('Please enter a valid 16-digit card number');
            isValid = false;
        }
        
        const cvv = document.getElementById('cvv').value;
        if (!/^\d{3,4}$/.test(cvv)) {
            alert('Please enter a valid CVV (3 or 4 digits)');
            isValid = false;
        }
    }
    
    return isValid;
}

// Get payment details based on payment method
function getPaymentDetails() {
    const method = document.getElementById('paymentMethod')?.value || '';
    
    if (method === 'credit' || method === 'debit') {
        return {
            cardName: document.getElementById('cardName')?.value || '',
            cardNumber: document.getElementById('cardNumber')?.value?.slice(-4) || '',
            expDate: document.getElementById('expDate')?.value || '',
            cardType: method
        };
    } else if (method === 'gcash') {
        return {
            mobileNumber: document.getElementById('gcashNumber')?.value || '',
            reference: document.getElementById('gcashReference')?.value || ''
        };
    } else {
        return { method: method }; // For COD or other methods
    }
}

// Process the order and store it for admin
function processOrder() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const form = document.getElementById('checkoutForm');
    
    if (!form) {
        console.error('Checkout form not found');
        return;
    }
    
    const formData = new FormData(form);
    
    // Calculate order totals
    const subtotal = parseFloat(document.getElementById('subtotal')?.textContent || '0');
    const shipping = parseFloat(document.getElementById('shipping')?.textContent || '0');
    const total = subtotal + shipping;
    
    // Create comprehensive order object
    const order = {
        id: generateOrderReference(),
        date: new Date().toISOString(),
        customer: {
            name: `${formData.get('firstName') || ''} ${formData.get('lastName') || ''}`.trim(),
            email: formData.get('email') || '',
            phone: formData.get('phone') || '',
            address: formData.get('address') || '',
            city: formData.get('city') || '',
            zipCode: formData.get('zip') || ''
        },
        payment: {
            method: document.getElementById('paymentMethod')?.value || '',
            details: getPaymentDetails()
        },
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            category: item.category
        })),
        subtotal: subtotal,
        shipping: shipping,
        tax: 0, // You can add tax calculation if needed
        total: total,
        status: 'pending',
        notes: formData.get('orderNotes') || ''
    };
    
    // Save order to admin orders
    saveOrderToAdmin(order);
    
    // Update product stock
    updateProductStock(cart);
    
    // Show success message
    const orderReference = document.getElementById('orderReference');
    if (orderReference) {
        orderReference.textContent = order.id;
    }
    
    const checkoutContent = document.getElementById('checkoutContent');
    const orderSuccess = document.getElementById('orderSuccess');
    
    if (checkoutContent) checkoutContent.style.display = 'none';
    if (orderSuccess) orderSuccess.style.display = 'block';
    
    // Clear the cart
    localStorage.removeItem('cart');
    updateCartCount();
}

// Save order to admin's order list
function saveOrderToAdmin(order) {
    // Get existing orders or initialize empty array
    const orders = JSON.parse(localStorage.getItem('adminOrders')) || [];
    
    // Add new order to beginning of array (newest first)
    orders.unshift(order);
    
    // Save back to localStorage
    localStorage.setItem('adminOrders', JSON.stringify(orders));
    
    // Set flag for new orders (can be used to show notifications)
    localStorage.setItem('hasNewOrders', 'true');
}

// Update product stock after purchase in both localStorage and Firestore
async function updateProductStock(cartItems) {
    // Update localStorage as before
    const products = JSON.parse(localStorage.getItem('products')) || [];
    cartItems.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        if (product) {
            product.stock -= cartItem.quantity;
            product.available = product.stock > 0;
        }
    });
    localStorage.setItem('products', JSON.stringify(products));

    // Update Firestore
    for (const cartItem of cartItems) {
        try {
            const productRef = doc(db, 'products', cartItem.id);
            // Get current stock from Firestore to avoid race conditions
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
                const currentStock = productSnap.data().stock || 0;
                const newStock = Math.max(0, currentStock - cartItem.quantity);
                await updateDoc(productRef, {
                    stock: newStock,
                    available: newStock > 0
                });
            }
        } catch (error) {
            console.error('Error updating Firestore stock:', error);
        }
    }
}

// Generate a random order reference number
function generateOrderReference() {
    const prefix = 'FRISH';
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
}

// Update cart count in header
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    document.querySelector('.cart-count').textContent = totalItems;
}

// Simulate sending email confirmation (would need actual backend in production)
function simulateSendEmailConfirmation(order) {
    console.log('Email confirmation would be sent for order:', order.id);
    // In a real implementation, this would be an API call to your backend
}