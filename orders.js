import { db } from './firebaseConfig.js';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const ordersSection = document.getElementById("ordersSection");
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  if (!userInfo || !userInfo.mobile) {
    ordersSection.innerHTML = "<p>Please place an order first to see your orders here.</p>";
    return;
  }

  const q = query(
    collection(db, "orders"),
    where("mobile", "==", userInfo.mobile)
  );

  onSnapshot(q, (snapshot) => {
    console.log("Orders snapshot updated:", snapshot.size);

    ordersSection.innerHTML = ""; // always clear first

    if (snapshot.empty) {
      ordersSection.innerHTML = "<p>You have no orders yet.</p>";
      return;
    }

    snapshot.forEach(docSnap => {
      const order = docSnap.data();
      console.log("Order:", order);

      const productsHTML = order.cart.map(item =>
        `<li>${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}</li>`
      ).join("");

      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <h3>Order - Room ${order.room}</h3>
        <p>📞 ${order.mobile}</p>
        <ul>${productsHTML}</ul>
        <p><strong>Total:</strong> ₹${order.total}</p>
        <p>Status: <strong>${order.status}</strong></p>
      `;
      ordersSection.appendChild(card);
    });
  });
});

