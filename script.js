document.addEventListener("DOMContentLoaded", () => {

    /* ---------- Loader ---------- */
    // Prevent the browser from auto-restoring a previous scroll position
    // (this was causing the site to "jump" straight to a lower section on load)
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const loader = document.querySelector(".loader");
    document.documentElement.classList.add("loading");

    function revealSite() {
        loader.classList.add("hide");
        document.documentElement.classList.remove("loading");
        window.scrollTo(0, 0);
    }
    window.addEventListener("load", () => {
        setTimeout(revealSite, 600);
    });
    setTimeout(revealSite, 2200);

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

    /* ---------- Playful "pop" animation on any image click ---------- */
    document.querySelectorAll(".image-box, .space-photo, .service-media").forEach(el => {
        el.addEventListener("click", (e) => {
            if (e.target.closest(".fav")) return;
            el.classList.remove("img-pop");
            void el.offsetWidth; // restart animation if clicked again quickly
            el.classList.add("img-pop");
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

    function getCardImage(card) {
        const box = card.querySelector(".image-box");
        if (!box || box.classList.contains("img-fallback")) return null;
        const img = box.querySelector(".img-front") || box.querySelector("img");
        return img ? img.getAttribute("src") : null;
    }

    function thumbHTML(img, name) {
        return img
            ? `<img class="item-thumb" src="${img}" alt="${name}">`
            : `<span class="item-thumb item-thumb-fallback">☕</span>`;
    }

    function renderFavorites() {
        if (favorites.length === 0) {
            favItemsEl.innerHTML = '<li class="empty-state">No favorites yet. Tap ♡ on a card.</li>';
            return;
        }

        favItemsEl.innerHTML = favorites.map((item, idx) => `
            <li>
                <span style="display:flex; align-items:center; gap:0.6rem;">
                    ${thumbHTML(item.img, item.name)}
                    ${item.name}
                </span>
                <span style="display:flex; align-items:center; gap:0.5rem;">
                    $${item.price.toFixed(2)}
                    <button class="item-add" data-name="${item.name}" data-price="${item.price}" data-img="${item.img || ''}">Add</button>
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
                addToCart(btn.dataset.name, parseFloat(btn.dataset.price), btn.dataset.img || null);
                showToast(btn.dataset.name + " added to your order");

                const idx = favorites.findIndex(f => f.name === btn.dataset.name);
                if (idx > -1) favorites.splice(idx, 1);
                renderFavorites();
                syncFavButtons();
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
            const img = getCardImage(card);
            const existingIdx = favorites.findIndex(f => f.name === name);

            if (existingIdx > -1) {
                favorites.splice(existingIdx, 1);
                btn.classList.remove("active");
                btn.textContent = "♡";
            } else {
                favorites.push({ name, price, img });
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
                <span style="display:flex; align-items:center; gap:0.6rem;">
                    ${thumbHTML(item.img, item.name)}
                    ${item.qty} × ${item.name}
                </span>
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

    function addToCart(name, price, img) {
        const existing = cart.find(i => i.name === name);
        if (existing) existing.qty += 1;
        else cart.push({ name, price, qty: 1, img: img || null });
        renderCart();
    }

    document.querySelectorAll(".add-cart").forEach(btn => {
        btn.addEventListener("click", () => {
            const card = btn.closest(".card");
            const name = card.querySelector("h3").dataset.original;
            const price = parseFloat(card.dataset.price);
            const img = getCardImage(card);

            addToCart(name, price, img);
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

    /* ---------- Reveal Menu (hidden until "Explore Menu" / nav link click) ---------- */
    const menuWrapper = document.getElementById("menuWrapper");
    const menuSectionIds = ["hot-drinks", "cold-drinks", "desserts", "reviews"];

    function revealMenuAndScrollTo(targetId) {
        const wasHidden = !menuWrapper.classList.contains("revealed");
        menuWrapper.classList.remove("menu-hidden");
        menuWrapper.classList.add("revealed");

        const spaceSection = document.getElementById("our-space");
        if (spaceSection) spaceSection.classList.add("space-hidden");
        const servicesSection = document.getElementById("services");
        if (servicesSection) servicesSection.classList.add("space-hidden");
        const contactSection = document.getElementById("contact");
        if (contactSection) contactSection.classList.add("space-hidden");

        const target = document.getElementById(targetId);
        // give the browser a moment to lay out the newly-revealed content
        setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth" });
        }, wasHidden ? 60 : 0);
    }

    // "Contact" nav link / "Visit Us" button always bring the Contact section back,
    // even if it was hidden while browsing the menu.
    document.querySelectorAll('a[href="#contact"]').forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const contactSection = document.getElementById("contact");
            contactSection.classList.remove("space-hidden");
            setTimeout(() => contactSection.scrollIntoView({ behavior: "smooth" }), 60);
        });
    });

    // "Home" nav link / logo resets back to the landing view (Hero + Our Space)
    document.querySelectorAll('a[href="#home"]').forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            menuWrapper.classList.remove("revealed");
            menuWrapper.classList.add("menu-hidden");
            const spaceSection = document.getElementById("our-space");
            if (spaceSection) spaceSection.classList.remove("space-hidden");
            const servicesSection = document.getElementById("services");
            if (servicesSection) servicesSection.classList.remove("space-hidden");
            const contactSection = document.getElementById("contact");
            if (contactSection) contactSection.classList.remove("space-hidden");
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        const targetId = link.getAttribute("href").slice(1);
        if (menuSectionIds.includes(targetId)) {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                revealMenuAndScrollTo(targetId);
            });
        }
    });

    /* ---------- Scroll reveal (dynamic entrance as sections come into view) ---------- */
    const revealTargets = document.querySelectorAll(
        ".section-head, .card, .review-card, .contact-info, .contact-form, .service-card"
    );
    revealTargets.forEach(el => el.classList.add("reveal"));

    // Images themselves get a bolder, distinct "flying in" entrance
    const imageRevealTargets = document.querySelectorAll(".image-box, .service-media, .hero-media, .space-photo");
    imageRevealTargets.forEach((el, i) => {
        el.classList.add("reveal-img");
        el.style.setProperty("--img-delay", (i % 4) * 90 + "ms");
    });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in-view");
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    revealTargets.forEach(el => revealObserver.observe(el));

    // Images: toggle in/out every time they enter or leave the viewport,
    // in either scroll direction (up or down)
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            entry.target.classList.toggle("in-view", entry.isIntersecting);
        });
    }, { threshold: 0.15 });

    imageRevealTargets.forEach(el => imageObserver.observe(el));

    /* ---------- init ---------- */
    renderCart();
    renderFavorites();
});
