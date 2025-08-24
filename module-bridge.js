export function init() {
    console.log("Module bridge initialized");
  }
  
  // Wait until DOM is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Check if cart.js is properly loaded
    if (!window.cartManager && !window.CartManager) {
      console.error("CartManager not found - cart.js may not be loading properly");
      
      // Add cart.js as a regular script instead of a module
      const cartScript = document.createElement('script');
      cartScript.src = 'cart.js';
      cartScript.type = 'text/javascript'; // Not a module
      document.body.appendChild(cartScript);
    }
    
    // Initialize toggleCart function if missing
    if (typeof window.toggleCart !== 'function') {
      window.toggleCart = function() {
        const sidebar = document.getElementById('cartSidebar');
        if (!sidebar) return;
        
        sidebar.classList.toggle('active');
        
        // Close when clicking outside
        if (sidebar.classList.contains('active')) {
          const overlay = document.createElement('div');
          overlay.className = 'cart-overlay';
          overlay.addEventListener('click', window.toggleCart);
          document.body.appendChild(overlay);
        } else {
          const overlay = document.querySelector('.cart-overlay');
          if (overlay) overlay.remove();
        }
      };
      
      // Set up event listener for cart close button
      const closeBtn = document.querySelector('.cart-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', window.toggleCart);
      }
    }
  });