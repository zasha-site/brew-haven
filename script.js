document.addEventListener("DOMContentLoaded", () => {

    /* ---------- Loader ---------- */
    const loader = document.querySelector(".loader");
    window.addEventListener("load", () => {
        setTimeout(() => loader.classList.add("hide"), 500);
    });
    setTimeout(() => loader.classList.add("hide"), 1800);

    /* ---------- Dark mode ---------- */
    const darkBtn = document.getElementById("darkMode");
    const root = document.documentElement;
    const savedTheme = sessionStorage.getItem("bh-theme");
    if (savedTheme === "dark") {
        root.setAttribute("data-theme", "dark");
        darkBtn.textContent = "☀️";
    }
    darkBtn.addEventListener("click", () => {
        const isDark = root.getAttribute("data-theme") === "dark";
        if (isDark) {
            root.removeAttribute("data-theme");
            darkBtn.textContent = "🌙";
            sessionStorage.setItem("bh-theme", "light");
        } else {
            root.setAttribute("data-theme", "dark");
            darkBtn.textContent = "☀️";
            sessionStorage.setItem("bh-theme", "dark");
        }
    });

    /* ---------- Toast ---------- */
    const toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add("show");
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
    }

    /* ---------- Image toggle (click to swap front/back photo) ---------- */
    document.querySelectorAll(".image-box").forEach(box => {
        // only toggle if there's an actual second image (skip single-image / fallback boxes)
        if (box.classList.contains("single")) return;
        box.addEventListener("click", (e) => {
            // avoid triggering when clicking the fav heart button on top of the image
            if (e.target.closest(".fav")) return;
            box.classList.toggle("flipped");
        });
    });

    /* ---------- Search filter + highlight ---------- */
    const searchInput = document.getElementById("search");
    const allCards = document.querySelectorAll(".card");

    // store original title text so we can safely re-highlight without accumulating <mark> tags
    allCards.forEach(card => {
        const h3 = card.querySelector("h3");
        h3.dataset.original = h3.textContent;
    });

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    searchInput.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();

        allCards.forEach(card => {
            const name = card.dataset.name || "";
            const h3 = card.querySelector("h3");
            const original = h3.dataset.original;
            const visible = term === "" || name.includes(term);
            card.style.display = visible ? "" : "none";

            if (term && visible) {
                const regex = new RegExp("(" + escapeRegExp(term) + ")", "ig");
                h3.innerHTML = original.replace(regex, "<mark>$1</mark>");
            } else {
                h3.textContent = original;
            }
        });
    });

    /* ---------- Favorites ---------- */
    let favorites = [];
    const favItemsEl = document.getElementById("favItems");
    // clicking the ♡ on any card adds/removes it from the favorites list
    // shown alongside the order ticket inside the cart drawer

    function renderFavorites() {
        if (favorites.length === 0) {
            favItemsEl.innerHTML = '<li class="empty-state">No favorites yet. Tap ♡ on a card.</li>';
            return;
        }

        favItemsEl.innerHTML = favorites.map((item, idx) => `
            <li>
                <span>${item.name}</span>
                <span style="display:flex; align-items:center; gap:0.5rem;">
                    $${item.price.toFixed(2)}
                    <button class="item-add" data-name="${item.name}" data-price="${item.price}">Add</button>
                    <button class="item-remove" data-idx="${idx}" aria-label="Remove ${item.name}">✕</button>
                </span>
            </li>
        `).join("");

        favItemsEl.querySelectorAll(".item-remove").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = Number(btn.dataset.idx);
                const removedName = favorites[idx].name;
                favorites.splice(idx, 1);
                renderFavorites();
                syncFavButtons();
                showToast(removedName + " removed from favorites");
            });
        });

        favItemsEl.querySelectorAll(".item-add").forEach(btn => {
            btn.addEventListener("click", () => {
                addToCart(btn.dataset.name, parseFloat(btn.dataset.price));
                showToast(btn.dataset.name + " added to your order");
            });
        });
    }

    function syncFavButtons() {
        document.querySelectorAll(".card").forEach(card => {
            const name = card.querySelector("h3").dataset.original;
            const btn = card.querySelector(".fav");
            const isFav = favorites.some(f => f.name === name);
            btn.classList.toggle("active", isFav);
            btn.textContent = isFav ? "♥" : "♡";
        });
    }

    document.querySelectorAll(".fav").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".card");
            const name = card.querySelector("h3").dataset.original;
            const price = parseFloat(card.dataset.price);
            const existingIdx = favorites.findIndex(f => f.name === name);

            if (existingIdx > -1) {
                favorites.splice(existingIdx, 1);
                btn.classList.remove("active");
                btn.textContent = "♡";
            } else {
                favorites.push({ name, price });
                btn.classList.add("active");
                btn.textContent = "♥";
            }
            renderFavorites();
        });
    });

    /* ---------- Cart logic ---------- */
    let cart = [];
    const cartCountEl = document.getElementById("cart-count");
    const cartTotalEl = document.getElementById("cart-total");
    const receiptItemsEl = document.getElementById("receiptItems");
    const cartDrawer = document.getElementById("cartDrawer");
    const cartOverlay = document.getElementById("cartOverlay");
    const cartToggle = document.getElementById("cartToggle");
    const cartClose = document.getElementById("cartClose");
    const checkoutBtn = document.getElementById("checkoutBtn");

    function openCart() {
        cartDrawer.classList.add("open");
        cartOverlay.classList.add("show");
    }
    function closeCart() {
        cartDrawer.classList.remove("open");
        cartOverlay.classList.remove("show");
    }
    cartToggle.addEventListener("click", openCart);
    cartClose.addEventListener("click", closeCart);
    cartOverlay.addEventListener("click", closeCart);

    function renderCart() {
        cartCountEl.textContent = cart.reduce((sum, i) => sum + i.qty, 0);
        const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        cartTotalEl.textContent = "$" + total.toFixed(2);

        if (cart.length === 0) {
            receiptItemsEl.innerHTML = '<li class="empty-state">No items yet. Add something good.</li>';
            return;
        }
        receiptItemsEl.innerHTML = cart.map((item, idx) => `
            <li>
                <span>${item.qty} × ${item.name}</span>
                <span style="display:flex; align-items:center; gap:0.5rem;">
                    $${(item.price * item.qty).toFixed(2)}
                    <button class="item-remove" data-idx="${idx}" aria-label="Remove ${item.name}">✕</button>
                </span>
            </li>
        `).join("");

        receiptItemsEl.querySelectorAll(".item-remove").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = Number(btn.dataset.idx);
                cart.splice(idx, 1);
                renderCart();
            });
        });
    }

    function addToCart(name, price) {
        const existing = cart.find(i => i.name === name);
        if (existing) existing.qty += 1;
        else cart.push({ name, price, qty: 1 });
        renderCart();
    }

    document.querySelectorAll(".add-cart").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".card");
            const name = card.querySelector("h3").dataset.original;
            const price = parseFloat(card.dataset.price);

            addToCart(name, price);
            showToast(name + " added to your order");

            btn.classList.add("added");
            btn.textContent = "Added ✓";
            setTimeout(() => {
                btn.classList.remove("added");
                btn.textContent = "Add To Cart";
            }, 1200);
        });
    });

    checkoutBtn.addEventListener("click", () => {
        if (cart.length === 0) {
            showToast("Your order is empty");
            return;
        }
        showToast("Order placed — see you soon!");
        cart = [];
        renderCart();
        setTimeout(closeCart, 900);
    });

    /* ---------- Contact form ---------- */
    const contactForm = document.getElementById("contactForm");
    contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        showToast("Message sent — we'll get back to you soon!");
        contactForm.reset();
    });

    /* ---------- init ---------- */
    renderCart();
    renderFavorites();
});
