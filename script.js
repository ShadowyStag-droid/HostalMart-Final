import { db, auth } from './firebaseConfig.js';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ADMIN_EMAIL = "sushan.kumar@hostel.com";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("admin-login");
  const adminContent = document.getElementById("admin-content");
  const logoutBtn = document.getElementById("logoutBtn");
  const ordersContainer = document.getElementById("ordersContainer");
  const productsContainer = document.getElementById("productsContainer");
  const productForm = document.getElementById("product-form");
  const placeOrderBtn = document.getElementById("placeOrderBtn");

  // Admin login
  if (loginForm) {
    loginForm.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = loginForm.querySelector("input[name=email]").value;
      const password = loginForm.querySelector("input[name=password]").value;

      signInWithEmailAndPassword(auth, email, password)
        .then(() => loginForm.querySelector("form").reset())
        .catch(err => alert("Login failed: " + err.message));
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => signOut(auth));
  }

  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL) {
      loginForm?.classList.add("hidden");
      adminContent?.classList.remove("hidden");
      logoutBtn?.classList.remove("hidden");
      loadProductsAdmin();
      loadOrdersAdmin();

      const clearAllOrdersBtn = document.getElementById("clearAllOrdersBtn");
      if (clearAllOrdersBtn) {
        clearAllOrdersBtn.addEventListener("click", async () => {
          if (confirm("Are you sure you want to mark ALL orders as Delivered?")) {
            const snapshot = await getDocs(collection(db, "orders"));
            const updates = snapshot.docs.map(docSnap =>
              updateDoc(doc(db, "orders", docSnap.id), { status: "Delivered" })
            );
            await Promise.all(updates);
            alert("All orders have been marked as Delivered.");
          }
        });
      }

    } else {
      adminContent?.classList.add("hidden");
      loginForm?.classList.remove("hidden");
      logoutBtn?.classList.add("hidden");
      if (user) signOut(auth);
    }
  });

  // Load products in admin panel
  function loadProductsAdmin() {
    if (!productsContainer) return;
    onSnapshot(collection(db, "products"), (snapshot) => {
      productsContainer.innerHTML = "";
      snapshot.forEach(docSnap => {
        const product = docSnap.data();
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
          ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-img">` : ""}
          <h3>${product.name}</h3>
          <p>Price: ₹${product.price}</p>
          <p>Category: ${product.category}</p>
          <div style="display:flex;gap:6px;justify-content:center;">
            <button class="edit-btn nav-btn" data-id="${docSnap.id}">Edit</button>
            <button class="delete-btn nav-btn" data-id="${docSnap.id}">Delete</button>
          </div>
        `;
        productsContainer.appendChild(card);
      });

      productsContainer.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = () => deleteDoc(doc(db, "products", btn.dataset.id));
      });

      productsContainer.querySelectorAll(".edit-btn").forEach(btn => {
        btn.onclick = async () => {
          const snapshot = await getDocs(collection(db, "products"));
          snapshot.forEach(docSnap => {
            if (docSnap.id === btn.dataset.id) {
              const data = docSnap.data();
              productForm.name.value = data.name;
              productForm.price.value = data.price;
              productForm.category.value = data.category;
              productForm.imageUrl.value = data.imageUrl || "";
              productForm.productId.value = btn.dataset.id;
            }
          });
        };
      });
    });
  }

  // Add or edit product
  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = productForm.name.value;
      const price = parseFloat(productForm.price.value);
      const category = productForm.category.value;
      const imageUrl = productForm.imageUrl.value;
      const id = productForm.productId.value;

      const data = { name, price, category, imageUrl };

      if (id) {
        await updateDoc(doc(db, "products", id), data);
      } else {
        await addDoc(collection(db, "products"), data);
      }

      productForm.reset();
    });
  }

  // Load and manage user orders
  function loadOrdersAdmin() {
    if (!ordersContainer) return;
    onSnapshot(collection(db, "orders"), (snapshot) => {
      ordersContainer.innerHTML = "";
      snapshot.forEach(docSnap => {
        const order = docSnap.data();
        const card = document.createElement("div");
        card.className = "product-card";
        const productsHTML = order.cart.map(item =>
          `<li>${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}</li>`
        ).join("");
        card.innerHTML = `
          <h3>${order.name} - Room ${order.room}</h3>
          <p>📞 ${order.mobile}</p>
          <ul>${productsHTML}</ul>
          <p><strong>Total:</strong> ₹${order.total}</p>
          <select data-id="${docSnap.id}" class="status-select">
            <option value="Pending" ${order.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
          </select>
        `;
        ordersContainer.appendChild(card);
      });

      ordersContainer.querySelectorAll(".status-select").forEach(select => {
        select.addEventListener("change", () => {
          updateDoc(doc(db, "orders", select.dataset.id), {
            status: select.value
          });
        });
      });
    });
  }

  // Place order button (cart.html)
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", async () => {
      const name = document.getElementById("userName").value;
      const room = document.getElementById("userRoom").value;
      const mobile = document.getElementById("userMobile").value;
      const remember = document.getElementById("rememberMe").checked;
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      if (!name || !room || !mobile) {
        alert("Please fill all fields.");
        return;
      }

      await addDoc(collection(db, "orders"), {
        name, room, mobile, cart, total,
        status: "Pending",
        timestamp: Date.now()
      });

      if (remember) {
        localStorage.setItem("userInfo", JSON.stringify({ name, room, mobile }));
      } else {
        localStorage.removeItem("userInfo");
      }

      localStorage.removeItem("cart");
      alert("Order placed successfully!");
      window.location.href = "orders.html";
    });

    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (userInfo) {
      document.getElementById("userName").value = userInfo.name || "";
      document.getElementById("userRoom").value = userInfo.room || "";
      document.getElementById("userMobile").value = userInfo.mobile || "";
      document.getElementById("rememberMe").checked = true;
    }
  }

  // Display cart
  const cartItemsContainer = document.getElementById("cartItems");
  if (cartItemsContainer) {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
    } else {
      let total = 0;
      cartItemsContainer.innerHTML = cart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        return `
          <div class="product-card">
            <h3>${item.name}</h3>
            <p>Price: ₹${item.price}</p>
            <p>Quantity: ${item.quantity}</p>
            <p>Subtotal: ₹${subtotal}</p>
          </div>
        `;
      }).join("") + `<h2>Total: ₹${total}</h2>`;
    }
  }

  // Display products on index.html
  const productsGrid = document.getElementById("products") || document.getElementById("productList");
  const categoryFilter = document.getElementById("categoryFilter") || document.getElementById("categorySelect");
  const searchInput = document.getElementById("searchInput");

  if (productsGrid) {
    onSnapshot(collection(db, "products"), (snapshot) => {
      const products = [];
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });
      renderProducts(products);

      categoryFilter?.addEventListener("change", () => renderProducts(products));
      searchInput?.addEventListener("input", () => renderProducts(products));

      function renderProducts(all) {
        let filtered = [...all];
        const category = categoryFilter?.value;
        const search = searchInput?.value?.toLowerCase();

        if (category && category !== "all") {
          filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }
        if (search) {
          filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
        }

        productsGrid.innerHTML = filtered.map(prod => `
          <div class="product-card">
            ${prod.imageUrl ? `<img src="${prod.imageUrl}" alt="${prod.name}" class="product-img">` : ""}
            <h3>${prod.name}</h3>
            <p>₹${prod.price}</p>
            <button onclick="addToCart('${prod.id}', '${prod.name}', ${prod.price})">Add to Cart</button>
          </div>
        `).join("");
      }
    });
  }

  // Add to cart function
  window.addToCart = function (id, name, price) {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find(p => p.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id, name, price, quantity: 1 });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added to cart");
  };
});








