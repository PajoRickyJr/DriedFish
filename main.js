import { CartManager, toggleCart } from './cart.js';

// Initialize cart manager
const cartManager = new CartManager();

// Expose to window if needed for HTML event handlers
window.cartManager = cartManager;
window.toggleCart = toggleCart;

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.querySelector('.cart-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', toggleCart);
    }
    console.log('Cart system initialized');
});