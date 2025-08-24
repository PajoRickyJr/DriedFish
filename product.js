import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyCZng7hGtaskclssS8d00s690x7V10h0AI",
  authDomain: "fishdriedfish-store.firebaseapp.com",
  projectId: "fishdriedfish-store",
  storageBucket: "fishdriedfish-store.firebasestorage.app",
  messagingSenderId: "803235286692",
  appId: "1:803235286692:web:2aa4097a15d3e35bd52031",
  measurementId: "G-FP9Y9XZ02M"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Product Manager Class
class ProductManager {
  constructor() {
    this.products = [];
    this.unsubscribe = null;
    this.cartManager = null;
    this.generateProductCards = this.generateProductCards.bind(this);
    this.setupEventListeners();
    this.listenToProducts();
    
    // Initialize or connect to CartManager
    this.initCartManager();
  }

  // Connect with CartManager safely
  initCartManager() {
    // Try to use existing cart manager instance
    if (window.cartManager) {
      this.cartManager = window.cartManager;
    } 
    // Or wait for CartManager to be available
    else {
      // Check if CartManager class is available (not instance)
      if (window.CartManager) {
        this.cartManager = new window.CartManager();
      } else {
        // Wait for CartManager to load if not yet available
        window.addEventListener('cartManagerReady', () => {
          if (window.cartManager) {
            this.cartManager = window.cartManager;
          } else if (window.CartManager) {
            this.cartManager = new window.CartManager();
          }
        }, { once: true });
      }
    }
  }

  // Listen to Firestore for real-time product updates
  listenToProducts() {
    if (this.unsubscribe) this.unsubscribe();
    const productsCol = collection(db, 'products');
    this.unsubscribe = onSnapshot(productsCol, (snapshot) => {
      this.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      localStorage.setItem('products', JSON.stringify(this.products));
      
      // Update cart manager's products data and validate cart against new stock levels
      if (this.cartManager) {
        this.cartManager.updateProductData(this.products); // Use new method for better sync
      }
      
      this.generateProductCards();
      this.applyCategoryFromURL();
    });
  }

  // Generate product cards for display
  generateProductCards() {
    const container = document.getElementById('productContainer');
    if (!container) return;
    
    if (!this.products || !this.products.length) {
      container.innerHTML = '<p style="text-align:center;">No products available.</p>';
      return;
    }
    
    container.innerHTML = this.products.map(product => {
      // Check if product is available and has stock
      const isOutOfStock = product.available === false || (product.stock !== undefined && product.stock <= 0);
      const isLowStock = product.stock !== undefined && product.stock < 5 && product.stock > 0;
      
      return `
      <div class="product-card" data-category="${product.category || 'uncategorized'}" data-id="${product.id}">
        <img src="${product.image || 'https://placehold.co/300x180?text=Fish'}" alt="${product.name}" class="product-image">
        <div class="product-info">
          <h3 class="product-title">${product.name}</h3>
          <p class="product-price">₱${Number(product.price).toFixed(2)}</p>
          ${product.stock !== undefined ? `
            <p class="product-stock ${isLowStock ? 'low-stock' : ''} ${isOutOfStock ? 'out-of-stock' : ''}">
              ${isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
            </p>
          ` : ''}
          <div class="stock-quantity-container"> 
            <div class="quantity-control">
              <button class="quantity-btn minus" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>−</button>
              <input type="number" class="quantity-input" value="1" min="1" 
                ${product.stock !== undefined ? `max="${product.stock}"` : ''} 
                ${isOutOfStock ? 'disabled' : ''}>
              <button class="quantity-btn plus" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>+</button>
            </div>
          </div> 
          <button class="add-to-cart-btn" data-id="${product.id}" ${isOutOfStock ? 'disabled' : ''}>
            ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <div class="product-details">
            <details>
              <summary>Product Details</summary>
              <p>${product.description || 'No description.'}</p>
            </details>
          </div>
        </div>
      </div>
    `;
    }).join('');
  }

  // Setup event listeners for product interactions
  setupEventListeners() {
    // Clean up any existing event listeners
    if (this._productContainerHandler) {
      document.getElementById('productContainer')?.removeEventListener('click', this._productContainerHandler);
    }
    
    if (this._backToTopHandler) {
      document.querySelector("#backtoTop")?.removeEventListener("click", this._backToTopHandler);
    }
    
    // Category filtering
    document.querySelectorAll('.category-nav a')?.forEach(link => {
      // Clean up existing handlers first
      const oldHandler = link._categoryClickHandler;
      if (oldHandler) {
        link.removeEventListener('click', oldHandler);
      }
      
      // Add new handler
      const newHandler = (e) => {
        e.preventDefault();
        const category = link.getAttribute('href').substring(1);
        this.filterProducts(category);
        document.querySelectorAll('.category-nav a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        
        // Update URL hash for bookmarking
        window.location.hash = category;
      };
      
      link._categoryClickHandler = newHandler;
      link.addEventListener('click', newHandler);
    });

    // Product container event delegation (quantity + add to cart)
    this._productContainerHandler = (e) => {
      // Handle quantity buttons
      if (e.target.classList.contains('quantity-btn')) {
        const productCard = e.target.closest('.product-card');
        const productId = productCard.dataset.id;
        const input = e.target.parentElement.querySelector('.quantity-input');
        let value = parseInt(input.value) || 1;
        
        // Get product data for stock validation
        const product = this.products.find(p => String(p.id) === String(productId));
        
        if (e.target.classList.contains('plus')) {
          const max = parseInt(input.getAttribute('max')) || Infinity;
          if (product && product.stock !== undefined && value >= product.stock) {
            // Show notification that max stock reached
            if (this.cartManager) {
              this.cartManager.showNotification(`Maximum available quantity is ${product.stock}`, 'warning');
            }
            return; // Don't increase
          }
          if (value < max) value++;
        } else if (e.target.classList.contains('minus')) {
          value = Math.max(1, value - 1);
        }
        
        input.value = value;
      }
      
      // Handle add to cart button
      if (e.target.classList.contains('add-to-cart-btn')) {
        const productCard = e.target.closest('.product-card');
        const productId = productCard.dataset.id;
        const quantityInput = productCard.querySelector('.quantity-input');
        const quantity = parseInt(quantityInput?.value) || 1;
        
        // Check if button is disabled (out of stock)
        if (e.target.disabled) {
          return;
        }
        
        if (this.cartManager) {
          this.cartManager.addToCart(productId, quantity);
          
          // Reset quantity input to 1 after adding to cart
          if (quantityInput) {
            quantityInput.value = 1;
          }
        } else if (window.cartManager) {
          window.cartManager.addToCart(productId, quantity);
          
          // Reset quantity input to 1 after adding to cart
          if (quantityInput) {
            quantityInput.value = 1;
          }
        } else {
          console.error('Cart manager not available');
        }
      }
    };
    
    document.getElementById('productContainer')?.addEventListener('click', this._productContainerHandler);

    // Back to top button
    this._backToTopHandler = (e) => {
      e.preventDefault();
      window.scrollTo({top: 0, behavior: "smooth"});
    };
    
    document.querySelector("#backtoTop")?.addEventListener("click", this._backToTopHandler);
  }

  // Filter products by category
  filterProducts(category) {
    document.querySelectorAll('.product-card').forEach(card => {
      if (category === 'all') {
        card.style.display = 'block';
      } else {
        const cardCategory = card.dataset.category || 'uncategorized';
        card.style.display = (cardCategory === category) ? 'block' : 'none';
      }
    });
  }

  // Apply category from URL hash
  applyCategoryFromURL() {
    if (window.location.hash) {
      const categoryFromHash = window.location.hash.substring(1); // Remove #
      if (categoryFromHash) {
        this.filterProducts(categoryFromHash);
        const categoryNavLinks = document.querySelectorAll('.category-nav a');
        if (categoryNavLinks.length > 0) {
          categoryNavLinks.forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href').substring(1) === categoryFromHash) {
              a.classList.add('active');
            }
          });
        }
      }
    }
  }
  
  // Clean up when the component is no longer used
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// Initialize Product Manager when DOM is loaded
let productManagerInstance = null;

window.addEventListener('DOMContentLoaded', () => {
  // Create product manager and expose it globally
  productManagerInstance = new ProductManager();
  window.productManager = productManagerInstance;
  
  // Notify that product manager is ready
  window.dispatchEvent(new CustomEvent('productManagerReady'));
});

// Clean up resources properly when page unloads
window.addEventListener('beforeunload', () => {
  if (productManagerInstance) {
    productManagerInstance.destroy();
  }
});

// Export the ProductManager class for module usage
export { ProductManager };