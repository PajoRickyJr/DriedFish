import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCZng7hGtaskclssS8d00s690x7V10h0AI",
  authDomain: "fishdriedfish-store.firebaseapp.com",
  projectId: "fishdriedfish-store",
  storageBucket: "fishdriedfish-store.appspot.com",
  messagingSenderId: "803235286692",
  appId: "1:803235286692:web:2aa4097a15d3e35bd52031",
  measurementId: "G-FP9Y9XZ02M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const imgbbApiKey = '3fa3a262af76069ec5f97c5828da82e6';

const ImageService = {
  /**
   * Uploads an image to ImgBB
   * @param {File} imageFile - The image file to upload
   * @returns {Promise<string>} - The URL of the uploaded image
   */
  async uploadToImgbb(imageFile) {
    if (!imageFile) return '';
    
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
  
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData
      });
  
      const data = await response.json();
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error('Image upload failed');
      }
    } catch (error) {
      console.error('Image upload error:');
      UIService.showNotification('Image upload failed: ');
      throw error;
    }
  },

  /**
   * Set up image preview functionality
   * @param {HTMLElement} inputElement - The file input element
   * @param {HTMLElement} previewElement - The image preview element
   */
  setupImagePreview(inputElement, previewElement) {
    if (!inputElement || !previewElement) return;
    
    inputElement.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          previewElement.src = evt.target.result;
          previewElement.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        previewElement.src = "https://placehold.co/150x150?text=Preview";
        previewElement.style.display = 'none';
      }
    });
  }
};

const ProductService = {
  /**
   * Listen for changes to the products collection
   * @param {Function} callback - Function to call with updated products
   * @returns {Function} - Unsubscribe function
   */
  listenToProducts(callback) {
    const productsCol = collection(db, 'products');
    return onSnapshot(productsCol, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(products);
    });
  },

  /**
   * Add a new product with optional image
   * @param {Object} productData - Product information
   * @param {File} imageFile - Optional image file
   * @returns {Promise<string>} - ID of the new product
   */
  async addProduct(productData, imageFile) {
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await ImageService.uploadToImgbb(imageFile);
      }
      
      const docRef = await addDoc(collection(db, 'products'), {
        ...productData,
        image: imageUrl,
        available: productData.stock > 0,
        createdAt: new Date().toISOString()
      });
      
      UIService.showNotification('Product added successfully!');
      return docRef.id;
    } catch (error) {
      UIService.showNotification('Error adding product: ');
      throw error;
    }
  },

  /**
   * Update an existing product
   * @param {string} productId - ID of the product to update
   * @param {Object} productData - Updated product information
   * @param {File} imageFile - Optional new image file
   * @returns {Promise<void>}
   */
  async updateProduct(productId, productData, imageFile) {
    try {
      let imageUrl = productData.image || '';
      if (imageFile && imageFile.size > 0) {
        imageUrl = await ImageService.uploadToImgbb(imageFile);
      }
      
      const docRef = doc(db, 'products', productId);
      await updateDoc(docRef, {
        ...productData,
        image: imageUrl,
        available: productData.stock > 0
      });
      
      UIService.showNotification('Product updated successfully!');
    } catch (error) {
      UIService.showNotification('Error updating product: ' + error.message);
      throw error;
    }
  },

  /**
   * Delete a product
   * @param {string} productId - ID of the product to delete
   * @returns {Promise<void>}
   */
  async deleteProduct(productId) {
    try {
      await deleteDoc(doc(db, 'products', productId));
      UIService.showNotification('Product deleted successfully!');
    } catch (error) {
      UIService.showNotification('Error deleting product: ' + error.message);
      throw error;
    }
  },

  /**
   * Update product stock level
   * @param {string} productId - ID of the product
   * @param {number} newStock - New stock level
   * @returns {Promise<void>}
   */
  async updateStock(productId, newStock) {
    try {
      const docRef = doc(db, 'products', productId);
      await updateDoc(docRef, {
        stock: newStock,
        available: newStock > 0
      });
      UIService.showNotification('Stock updated successfully!');
    } catch (error) {
      UIService.showNotification('Error updating stock: ' + error.message);
      throw error;
    }
  },

  /**
   * Toggle product availability
   * @param {string} productId - ID of the product
   * @param {boolean} newStatus - New availability status
   * @returns {Promise<void>}
   */
  async toggleAvailability(productId, newStatus) {
    try {
      const docRef = doc(db, 'products', productId);
      await updateDoc(docRef, {
        available: newStatus
      });
      UIService.showNotification(`Product ${newStatus ? 'made available' : 'made unavailable'}`);
    } catch (error) {
      UIService.showNotification('Error updating product availability');
      throw error;
    }
  },

  /**
   * Get a product by ID
   * @param {string} productId - ID of the product
   * @returns {Promise<Object>} - Product data
   */
  async getProduct(productId) {
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        return { id: productDoc.id, ...productDoc.data() };
      } else {
        throw new Error('Product not found');
      }
    } catch (error) {
      UIService.showNotification('Error loading product: ' + error.message);
      throw error;
    }
  }
};

const OrderService = {
  /**
   * Listen for changes to the orders collection
   * @param {Function} callback - Function to call with updated orders
   * @returns {Function} - Unsubscribe function
   */
  listenToOrders(callback) {
    const ordersCol = collection(db, 'orders');
    return onSnapshot(ordersCol, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(orders);
    });
  },

  /**
   * Add a new order
   * @param {Object} orderData - Order information
   * @returns {Promise<string>} - ID of the new order
   */
  async addOrder(orderData) {
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        createdAt: new Date().toISOString(),
        status: orderData.status || 'pending'
      });
      
      UIService.showNotification('Order added successfully!');
      return docRef.id;
    } catch (error) {
      UIService.showNotification('Error adding order: ' + error.message);
      throw error;
    }
  },

  /**
   * Update an existing order
   * @param {string} orderId - ID of the order to update
   * @param {Object} orderData - Updated order information
   * @returns {Promise<void>}
   */
  async updateOrder(orderId, orderData) {
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, orderData);
      
      UIService.showNotification('Order updated successfully!');
    } catch (error) {
      UIService.showNotification('Error updating order: ' + error.message);
      throw error;
    }
  },

  /**
   * Update order status
   * @param {string} orderId - ID of the order
   * @param {string} newStatus - New status value
   * @returns {Promise<void>}
   */
  async updateStatus(orderId, newStatus) {
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, {
        status: newStatus
      });
      UIService.showNotification(`Order status updated to ${newStatus}`);
    } catch (error) {
      UIService.showNotification('Error updating order status: ' + error.message);
      throw error;
    }
  },

  /**
   * Delete an order
   * @param {string} orderId - ID of the order to delete
   * @returns {Promise<void>}
   */
  async deleteOrder(orderId) {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      UIService.showNotification('Order deleted successfully!');
    } catch (error) {
      UIService.showNotification('Error deleting order: ' + error.message);
      throw error;
    }
  },

  /**
   * Get an order by ID
   * @param {string} orderId - ID of the order
   * @returns {Promise<Object>} - Order data
   */
  async getOrder(orderId) {
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        return { id: orderDoc.id, ...orderDoc.data() };
      } else {
        throw new Error('Order not found');
      }
    } catch (error) {
      UIService.showNotification('Error loading order: ' + error.message);
      throw error;
    }
  }
};


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

/**
 * Load Firebase modules dynamically
 * @returns {Promise<void>}
 */
async function loadFirebaseModules() {
    // Only load if not already loaded
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        return Promise.resolve();
    }
    
    try {
        // Load Firebase App
        await import("https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js").then(module => {
            window.firebase = { app: module.initializeApp };
        });
        
        // Load Firestore
        await import("https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js").then(module => {
            window.firebase.firestore = module.getFirestore;
            window.firebase.collection = module.collection;
            window.firebase.doc = module.doc;
            window.firebase.setDoc = module.setDoc;
            window.firebase.updateDoc = module.updateDoc;
            window.firebase.getDoc = module.getDoc;
        });
        
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
        
        const app = window.firebase.app(firebaseConfig);
        const db = window.firebase.firestore(app);
        
        // Store database instance globally for later use
        window.db = db;
        
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading Firebase modules:', error);
        return Promise.reject(error);
    }
}

// ============================
// UI SERVICES
// ============================

const UIService = {
  /**
   * Display a notification message
   * @param {string} message 
   * @param {number} duration 
   */
  showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, duration);
  },

  /**
   * Render the products table
   * @param {Array} products - Array of product objects
   */
  renderProducts(products) {
    const productsTableBody = document.getElementById('productsTableBody');
    if (!productsTableBody) return;
    
    if (!products || products.length === 0) {
      productsTableBody.innerHTML = '<tr><td colspan="6">No products found.</td></tr>';
      return;
    }

    productsTableBody.innerHTML = products.map(product => `
      <tr data-product-id="${product.id}">
        <td>
          <img src="${product.image || 'https://placehold.co/50x50?text=No+Image'}" 
               alt="${product.name}" 
               style="width: 50px; height: 50px; object-fit: cover;">
        </td>
        <td>${product.name}</td>
        <td>₱${product.price?.toFixed(2) || '0.00'}</td>
        <td>${product.category || 'Uncategorized'}</td>
        <td>
          <button class="btn-toggle ${product.available ? 'available' : 'unavailable'}"
                  data-product-id="${product.id}" 
                  data-action="toggle-availability" 
                  data-status="${!product.available}">
            ${product.available ? 'Available' : 'Unavailable'}
          </button>
        </td>
        <td>
          <button class="btn-edit" data-product-id="${product.id}" data-action="edit-product">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn-delete" data-product-id="${product.id}" data-action="delete-product">
            <i class="fas fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  },

  /**
   * Render the inventory table
   * @param {Array} products - Array of product objects
   */
  renderInventory(products) {
    const inventoryTableBody = document.getElementById('inventoryTableBody');
    if (!inventoryTableBody) return;
    
    if (!products || products.length === 0) {
      inventoryTableBody.innerHTML = '<tr><td colspan="5">No products found.</td></tr>';
      return;
    }

    inventoryTableBody.innerHTML = products.map(product => `
      <tr data-product-id="${product.id}">
        <td>
          <img src="${product.image || 'https://placehold.co/50x50?text=No+Image'}" 
               alt="${product.name}" 
               style="width: 50px; height: 50px; object-fit: cover;">
        </td>
        <td>${product.name}</td>
        <td class="${product.stock < 5 ? 'stock-warning' : ''}">${product.stock || 0}</td>
        <td>${product.available ? 'In Stock' : 'Out of Stock'}</td>
        <td>
          <button class="btn-edit" data-product-id="${product.id}" data-action="update-stock">
            <i class="fas fa-box"></i> Update Stock
          </button>
        </td>
      </tr>
    `).join('');
  },

  /**
   * Render the orders list
   * @param {Array} orders - Array of order objects
   */
  renderOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;
    if (!orders || orders.length === 0) {
      ordersList.innerHTML = '<p id="noOrdersMessage">No orders yet.</p>';
      return;
    }

    // Use a persistent variable to store the current sort value
    if (!UIService._orderSortValue) {
      UIService._orderSortValue = 'date-desc';
    }

    // Count orders by status
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
    const allStatuses = ['pending', 'processing', 'completed', 'cancelled'];

    // Sorting UI
    let sortOptions = `
      <div class="order-sort-bar" style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
        <div class="order-status-counts">
          ${allStatuses.map(status => `<span class="order-status ${status}" style="margin-right:1rem;">${status.charAt(0).toUpperCase() + status.slice(1)}: <b>${statusCounts[status] || 0}</b></span>`).join('')}
        </div>
        <div class="order-sort-select">
          <label for="orderSortSelect" style="margin-right:0.5rem;">Sort by:</label>
          <select id="orderSortSelect">
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="total-desc">Total (High to Low)</option>
            <option value="total-asc">Total (Low to High)</option>
          </select>
        </div>
      </div>
    `;

    // Render the sort bar and orders
    // Get current sort (default: date-desc)
    let sortValue = sessionStorage.getItem('orderSortValue') || 'date-desc';
    let sortedOrders = [...orders];
    switch (sortValue) {
      case 'date-asc':
        sortedOrders.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'date-desc':
        sortedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'total-desc':
        sortedOrders.sort((a, b) => (b.total || 0) - (a.total || 0));
        break;
      case 'total-asc':
        sortedOrders.sort((a, b) => (a.total || 0) - (b.total || 0));
        break;
    }

    ordersList.innerHTML =
      sortOptions +
      sortedOrders.map(order => `
      <div class="order-card">
        <div class="order-header">
          <h3>Order #${order.id}</h3>
          <span class="order-status ${order.status}">${order.status}</span>
        </div>
        <div class="order-details">
          <p><strong>Customer:</strong> ${order.customer?.name || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
          <p><strong>Total:</strong> ₱${order.total?.toFixed(2) || '0.00'}</p>
        </div>
        <div class="order-items">
          <h4>Items:</h4>
          ${order.items?.map(item => `
            <div class="order-item">
              <img src="${item.image || 'https://placehold.co/50x50?text=No+Image'}" alt="${item.name}">
              <div class="order-item-info">
                <p class="order-item-name">${item.name}</p>
                <p class="order-item-price">₱${item.price?.toFixed(2) || '0.00'} × ${item.quantity}</p>
              </div>
              <p class="order-item-total">₱${(item.price * item.quantity)?.toFixed(2) || '0.00'}</p>
            </div>
          `).join('') || 'No items'}
        </div>
        <div class="order-actions">
          <select class="status-select" data-order-id="${order.id}" data-action="update-order-status">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
          <button class="print-btn" data-order-id="${order.id}" data-action="print-order">
            <i class="fas fa-print"></i> Print
          </button>
        </div>
      </div>
    `).join('');

    // Always attach event listener to the current sort select after rendering
    const sortSelect = document.getElementById('orderSortSelect');
    if (sortSelect) {
      sortSelect.value = sortValue;
      sortSelect.addEventListener('change', function() {
        sessionStorage.setItem('orderSortValue', this.value);
        UIService.renderOrders(orders);
      });
    }

    // Add event listeners for status dropdowns to update status immediately
    document.querySelectorAll('.status-select').forEach(select => {
      select.addEventListener('change', async function() {
        const orderId = this.dataset.orderId;
        const newStatus = this.value;
        if (orderId && newStatus) {
          await OrderService.updateStatus(orderId, newStatus);
        }
      });
    });
  },

  /**
   * Show the product modal for adding/editing a product
   * @param {Object} product - Product data (null for new product)
   */
  showProductModal(product = null) {
    const productModal = document.getElementById('productModal');
    const productForm = document.getElementById('productForm');
    const productImagePreview = document.getElementById('productImagePreview');
    const modalTitle = document.getElementById('productModalTitle');
    const productStockInput = document.getElementById('productStock');
    
    if (!productModal || !productForm) return;

    // Reset form first
    productForm.reset();
    if (productImagePreview) {
      productImagePreview.src = '';
      productImagePreview.style.display = 'none';
    }
    // Set mode (add or edit)
    productForm.dataset.mode = product ? 'edit' : 'add';
    if (product) {
      // Fill form with product data for editing
      document.getElementById('productId').value = product.id;
      document.getElementById('productName').value = product.name || '';
      document.getElementById('productPrice').value = product.price || '';
      document.getElementById('productCategory').value = product.category || '';
      document.getElementById('productDescription').value = product.description || '';
      // Only set stock if the input exists (for edit mode)
      if (productStockInput) productStockInput.value = product.stock || 0;
      document.getElementById('productAvailable').value = product.available ? 'true' : 'false';
      // Set image preview if available
      if (product.image && productImagePreview) {
        productImagePreview.src = product.image;
        productImagePreview.style.display = 'block';
      }
      // Update modal title
      if (modalTitle) modalTitle.textContent = 'Edit Product';
    } else {
      // Set default values for new product
      document.getElementById('productId').value = '';
      // Do not set stock for new product (leave blank or default)
      if (modalTitle) modalTitle.textContent = 'Add New Product';
    }
    // Show modal
    productModal.style.display = 'block';
  },

  /**
   * Show the inventory modal for updating stock
   * @param {Object} product - Product data
   */
  showInventoryModal(product) {
    const inventoryModal = document.getElementById('inventoryModal');
    const productStockName = document.getElementById('productStockName');
    const productStock = document.getElementById('productStock');
    const inventoryProductId = document.getElementById('inventoryProductId');

    if (!inventoryModal || !productStockName || !productStock || !inventoryProductId) return;

    productStockName.value = product.name || '';
    productStock.value = product.stock || 0;
    inventoryProductId.value = product.id;
    inventoryModal.style.display = 'block';
  },

  /**
   * Close modals
   * @param {string} modalId - ID of the modal to close
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  },

  /**
   * Setup tab navigation
   */
  setupTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    if (!tabLinks || tabLinks.length === 0) return;
    
    tabLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all tabs
        document.querySelectorAll('.tab-link').forEach(l => {
          if (l && l.classList) l.classList.remove('active');
        });
        document.querySelectorAll('.admin-tab').forEach(tab => {
          if (tab && tab.classList) tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        this.classList.add('active');
        const tabId = this.getAttribute('data-tab');
        const tab = document.getElementById(tabId);
        if (tab && tab.classList) tab.classList.add('active');
      });
    });
  }
};

// ============================
// EVENT HANDLERS
// ============================

const EventHandlers = {
  /**
   * Handle product form submission (add/edit)
   * @param {Event} e - Form submit event
   */
  async handleProductFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const isEditMode = form.dataset.mode === 'edit';
    const productId = document.getElementById('productId')?.value;
    
    // Collect form data
    const formData = new FormData(form);
    // Debug: log all form values
    const debugData = {};
    for (let [key, value] of formData.entries()) {
      debugData[key] = value;
    }
    console.log('Product form data:', debugData);

    const productData = {
      name: (formData.get('productName') || '').trim(),
      price: parseFloat(formData.get('productPrice')),
      category: (formData.get('productCategory') || '').trim(),
      description: (formData.get('productDescription') || '').trim(),
      stock: parseInt(formData.get('productStock')) || 0,
      available: formData.get('productAvailable') === 'true' // If this is a checkbox, handle below
    };
    // If productAvailable is a checkbox, use:
    // productData.available = form.querySelector('[name="productAvailable"]').checked;

    const imageFile = formData.get('productImageFile');

    // Validation (treat empty string as missing, and NaN as missing)
    if (!productData.name || isNaN(productData.price) || productData.price <= 0 || !productData.category) {
      UIService.showNotification('Please fill in all required fields with valid values');
      return;
    }
    
    try {
      if (isEditMode && productId) {
        // Get current product to preserve image if not uploading new one
        if (!imageFile || imageFile.size === 0) {
          const currentProduct = await ProductService.getProduct(productId);
          productData.image = currentProduct.image;
        }
        await ProductService.updateProduct(productId, productData, imageFile);
      } else {
        await ProductService.addProduct(productData, imageFile);
      }
      // Close modal and reset form
      UIService.closeModal('productModal');
      form.reset();
    } catch (error) {
      console.error('Error handling product form:', error);
    }
  },

  /**
   * Handle inventory form submission
   * @param {Event} e - Form submit event
   */
  async handleInventoryFormSubmit(e) {
    e.preventDefault();
    
    const productId = document.getElementById('inventoryProductId')?.value;
    const newStock = parseInt(document.getElementById('productStock')?.value || '0');
    
    if (!productId) {
      UIService.showNotification('Product ID is required');
      return;
    }
    
    try {
      await ProductService.updateStock(productId, newStock);
      UIService.closeModal('inventoryModal');
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  },

  /**
   * Handle click events for the entire page
   * @param {Event} e - Click event
   */
  async handleGlobalClick(e) {
    // Close modals when clicking outside
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
      return;
    }
    
    // Find the button or element with data-action
    const actionElement = e.target.closest('[data-action]');
    if (!actionElement) return;
    
    const action = actionElement.dataset.action;
    const productId = actionElement.dataset.productId;
    const orderId = actionElement.dataset.orderId;
    
    try {
      switch (action) {
        case 'edit-product':
          if (productId) {
            const product = await ProductService.getProduct(productId);
            UIService.showProductModal(product);
          }
          break;
          
        case 'delete-product':
          if (productId) {
            if (confirm('Are you sure you want to delete this product?')) {
              await ProductService.deleteProduct(productId);
            }
          }
          break;
          
        case 'update-stock':
          if (productId) {
            const product = await ProductService.getProduct(productId);
            UIService.showInventoryModal(product);
          }
          break;
          
        case 'toggle-availability':
          if (productId) {
            const newStatus = actionElement.dataset.status === 'true';
            await ProductService.toggleAvailability(productId, newStatus);
          }
          break;
          
        case 'print-order':
          if (orderId) {
            // Implementation for print functionality
            console.log('Printing order:', orderId);
            // window.print() or custom print logic
          }
          break;
      }
    } catch (error) {
      console.error('Error handling action:', action, error);
    }
  },

  /**
   * Handle change events for the entire page
   * @param {Event} e - Change event
   */
  async handleGlobalChange(e) {
    const actionElement = e.target.closest('[data-action]');
    if (!actionElement) return;
    
    const action = actionElement.dataset.action;
    const orderId = actionElement.dataset.orderId;
    
    try {
      switch (action) {
        case 'update-order-status':
          if (orderId) {
            const newStatus = actionElement.value;
            await OrderService.updateStatus(orderId, newStatus);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling change:', action, error);
    }
  }
};

// ============================
// INITIALIZATION
// ============================

function initAdminDashboard() {
  // Set up global event listeners
  document.body.addEventListener('click', EventHandlers.handleGlobalClick);
  document.body.addEventListener('change', EventHandlers.handleGlobalChange);
  
  // Set up tabs
  UIService.setupTabs();
  
  // Set up image preview
  const imageInput = document.getElementById('productImageFile');
  const imagePreview = document.getElementById('productImagePreview');
  ImageService.setupImagePreview(imageInput, imagePreview);
  
  // Set up image upload area click
  const imageUploadArea = document.getElementById('imageUploadArea');
  if (imageUploadArea && imageInput) {
    imageUploadArea.addEventListener('click', () => {
      imageInput.click();
    });
  }
  
  // Set up form submissions
  const productForm = document.getElementById('productForm');
  if (productForm) {
    productForm.addEventListener('submit', EventHandlers.handleProductFormSubmit);
  }
  
  const inventoryForm = document.getElementById('inventoryForm');
  if (inventoryForm) {
    inventoryForm.addEventListener('submit', EventHandlers.handleInventoryFormSubmit);
  }
  
  // Set up add product button
  const addProductBtn = document.querySelector('.add-product-btn');
  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
      UIService.showProductModal();
    });
  }
  
  // Set up close modal buttons
  document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      if (modal) modal.style.display = 'none';
    });
  });
  
  // Set up data listeners
  const productsTableBody = document.getElementById('productsTableBody');
  if (productsTableBody) {
    ProductService.listenToProducts(products => {
      UIService.renderProducts(products);
      UIService.renderInventory(products);
    });
  }
  
  const ordersList = document.getElementById('ordersList');
  if (ordersList) {
    OrderService.listenToOrders(UIService.renderOrders);
  }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', initAdminDashboard);

// Make certain functions globally available for HTML event attributes
window.toggleProductAvailability = ProductService.toggleAvailability;
window.updateOrderStatus = OrderService.updateStatus;

// Integration Test for Order System
// This can be run in browser console to verify the integration works

// Test function to verify order flow
async function testOrderIntegration() {
    console.log('Starting order integration test...');
    
    // Step 1: Check if we have Firebase access
    const hasFirebase = typeof firebase !== 'undefined' && typeof firebase.firestore === 'function';
    console.log('Firebase available:', hasFirebase);
    
    // Step 2: Create a test order
    const testOrder = {
        id: 'TEST-' + Date.now(),
        date: new Date().toISOString(),
        customer: {
            name: 'Test Customer',
            email: 'test@example.com',
            phone: '1234567890'  
        },
        items: [
            {
                id: 'product-1',
                name: 'Test Product',
                price: 100,
                quantity: 1
            }
        ],
        subtotal: 100,
        shipping: 50,
        total: 150,
        status: 'pending'
    };
    
    // Step 3: Save to localStorage
    const existingOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
    existingOrders.unshift(testOrder);
    localStorage.setItem('adminOrders', JSON.stringify(existingOrders));
    console.log('Test order saved to localStorage');
    
    // Step 4: Try to save to Firestore if available
    if (hasFirebase) {
        try {
            const db = firebase.firestore();
            await db.collection('orders').doc(testOrder.id).set(testOrder);
            console.log('Test order saved to Firestore');
        } catch (error) {
            console.error('Failed to save to Firestore:', error);
        }
    }
    
    // Step 5: Test if the seller dashboard can see the order
    console.log('Test complete. Check if this order appears in the Orders tab of the seller dashboard.');
    console.log('Order ID:', testOrder.id);
    
    return testOrder.id;
}

// Test function to verify product stock update
async function testStockUpdate(productId, quantity = 1) {
    if (!productId) {
        console.error('Please provide a valid product ID');
        return;
    }
    
    console.log(`Testing stock update for product ${productId}, quantity: ${quantity}`);
    
    // Step 1: Get current stock from localStorage
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const product = products.find(p => String(p.id) === String(productId));
    
    if (!product) {
        console.error('Product not found in localStorage');
        return;
    }
    
    console.log('Current stock in localStorage:', product.stock);
    
    // Step 2: Update stock in localStorage
    const newStock = Math.max(0, product.stock - quantity);
    product.stock = newStock;
    product.available = newStock > 0;
    localStorage.setItem('products', JSON.stringify(products));
    console.log('Updated stock in localStorage:', newStock);
    
    // Step 3: Update stock in Firestore if available
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
            const db = firebase.firestore();
            const productRef = db.collection('products').doc(String(productId));
            await productRef.update({
                stock: newStock,
                available: newStock > 0
            });
            console.log('Updated stock in Firestore:', newStock);
        } catch (error) {
            console.error('Failed to update stock in Firestore:', error);
        }
    } else {
        console.warn('Firebase not available, stock only updated in localStorage');
    }
    
    console.log('Stock update test complete. Check if the stock level is updated in both product listing and inventory manager.');
}

function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (modal) modal.style.display = 'none';
}
window.closeProductModal = closeProductModal;

// Expose test functions globally
window.testOrderIntegration = testOrderIntegration;
window.testStockUpdate = testStockUpdate;