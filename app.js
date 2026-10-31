const APP_VERSION = 'v6';
let allProducts = [];
let activeSection = 'todos';

const FORMSPREE_ID = "TU_ID_DE_FORMSPREE"; 

let currentProduct = null;
let selectedPayment = "";
let selectedShippingAgreement = "";
let clientAddress = "";
let clientEmail = "";
let clientPhone = "";
let deliveryMode = ""; // "personal" o "domicilio"

// ---------- Carrito ----------
const FREE_SHIPPING = 500;
let cart = {};
try { cart = JSON.parse(localStorage.getItem('cart') || '{}'); } catch (e) { cart = {}; }

let cartNotice = '';
// Si un producto no trae "stock", se considera sin límite
function stockOf(p) { return typeof p.stock === 'number' ? p.stock : Infinity; }
function stockLabel(p) {
    const n = stockOf(p);
    return n <= 0 ? 'Agotado' : n === 1 ? '¡Última pieza!' : n <= 3 ? `Quedan ${n}` : '';
}
function stockTag(p) {
    const t = stockLabel(p);
    return t ? `<span class="stock-tag ${stockOf(p) <= 0 ? 'out' : ''}">${t}</span>` : '';
}
// Ajusta el carrito guardado si ya no hay suficientes piezas
function clampCart() {
    let changed = false;
    Object.keys(cart).forEach(id => {
        const p = allProducts.find(x => x.id == id);
        const max = p ? stockOf(p) : 0;
        if (cart[id] > max) { changed = true; if (max > 0) cart[id] = max; else delete cart[id]; }
    });
    if (changed) {
        cartNotice = 'Ajustamos tu carrito: algunas piezas ya no están disponibles.';
        try { localStorage.setItem('cart', JSON.stringify(cart)); } catch (e) {}
    }
}

function saveCart() {
    try { localStorage.setItem('cart', JSON.stringify(cart)); } catch (e) {}
    renderCart();
}
function cartItems() {
    return Object.keys(cart).map(id => ({ p: allProducts.find(x => x.id == id), qty: cart[id] })).filter(i => i.p);
}
function cartTotal() { return cartItems().reduce((sum, i) => sum + i.p.price * i.qty, 0); }
function orderSummary() { return cartItems().map(i => `${i.qty} x ${i.p.name} ($${(i.p.price * i.qty).toFixed(2)})`).join('\n'); }
function shipMsg(total) {
    const missing = FREE_SHIPPING - total;
    return missing > 0 ? `Te faltan <strong>$${missing.toFixed(2)}</strong> para envío gratis.` : '🎉 ¡Tu pedido ya tiene envío gratis!';
}
function addToCart(id, btn) {
    const p = allProducts.find(x => x.id == id);
    const ok = !!p && (cart[id] || 0) < stockOf(p);
    if (ok) { cart[id] = (cart[id] || 0) + 1; saveCart(); }
    if (btn) { const old = btn.textContent; btn.textContent = ok ? '✓ Agregado' : 'Sin más piezas'; setTimeout(() => btn.textContent = old, 1200); }
    return ok;
}
function changeQty(id, delta) {
    const p = allProducts.find(x => x.id == id);
    const next = Math.min((cart[id] || 0) + delta, p ? stockOf(p) : 0);
    if (next <= 0) delete cart[id]; else cart[id] = next;
    saveCart();
}
function addCurrent() {
    const p = currentProduct;
    if (!addToCart(p.id)) {
        return appendBubble("bot", stockOf(p) <= 0 ? "Este producto está agotado por ahora." : `Ya tienes en tu carrito todas las piezas disponibles (${stockOf(p)}).`);
    }
    appendBubble("bot", `✅ Agregué <strong>${escapeHtml(p.name)}</strong> a tu carrito. ${shipMsg(cartTotal())}`);
}
function buyNow() {
    if (stockOf(currentProduct) <= 0) return;
    addToCart(currentProduct.id);
    startCheckout();
}

function renderCart() {
    if (!document.getElementById('cart-count')) return; // index.html sin carrito: no bloquear el catálogo
    const items = cartItems(), total = cartTotal();
    const count = items.reduce((sum, i) => sum + i.qty, 0);
    const missing = FREE_SHIPPING - total;
    document.getElementById('cart-count').textContent = count;
    document.getElementById('ship-text').textContent = count === 0
        ? '🚚 Envío gratis en pedidos desde $500'
        : missing > 0 ? `🛒 Llevas $${total.toFixed(2)} · te faltan $${missing.toFixed(2)} para envío gratis`
                      : `🎉 ¡Tu pedido ya tiene envío gratis! Llevas $${total.toFixed(2)}`;
    document.getElementById('ship-fill').style.width = Math.min(100, total / FREE_SHIPPING * 100) + '%';
    document.getElementById('cart-items').innerHTML = items.length ? items.map(({ p, qty }) => `
        <div class="cart-row">
            <div class="flex-grow-1"><div class="fw-bold">${escapeHtml(p.name)}</div><div>$${(p.price * qty).toFixed(2)}</div>${stockOf(p) <= 3 ? `<small>${stockLabel(p)}</small>` : ''}</div>
            <div class="qty">
                <button class="btn btn-pop btn-white btn-sm" aria-label="Quitar uno" onclick="changeQty(${p.id},-1)">−</button>
                <span>${qty}</span>
                <button class="btn btn-pop btn-white btn-sm" aria-label="Agregar uno" ${qty >= stockOf(p) ? 'disabled' : ''} onclick="changeQty(${p.id},1)">+</button>
            </div>
        </div>`).join('') : `<div class="empty-state"><strong>Tu carrito está vacío</strong>Agrega productos desde el catálogo.</div>`;
    document.getElementById('cart-footer').innerHTML = items.length ? `
        <div class="d-flex justify-content-between fw-bold fs-5 mb-3"><span>Total</span><span>$${total.toFixed(2)}</span></div>
        <button class="btn btn-pop btn-go w-100 py-2" data-bs-dismiss="offcanvas" onclick="startCheckout()">Finalizar compra</button>` : '';
    if (cartNotice) document.getElementById('cart-items').insertAdjacentHTML('afterbegin', `<div class="stock-note">${cartNotice}</div>`);
}

// Emoji que se muestra cuando una foto no carga (o el producto no tiene fotos)
const SECTION_EMOJI = { mascotas: '🐾', personas: '👕' };

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/"/g, '&quot;');
}

// Si una imagen falla, la cambiamos por un recuadro de color con emoji
function imgFail(img) {
    const box = document.createElement('div');
    box.className = img.classList.contains('product-img') ? 'img-fallback' : 'img-fallback img-fallback-lg';
    box.textContent = img.dataset.emoji || '🛍️';
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', img.alt);
    img.replaceWith(box);
}

async function fetchProducts() {
    const grid = document.getElementById('products-grid');
    const showError = (title, text, error) => {
        console.error(title, error);
        grid.innerHTML = `<div class="empty-state w-100"><strong>${title}</strong>${text}<br><small>Detalle: ${escapeHtml(String(error && error.message))} · app.js ${APP_VERSION}</small></div>`;
    };
    try {
        if (location.protocol === 'file:') throw new Error('abierto como archivo (file://)');
        // El parámetro evita que el navegador use una copia vieja de productos.json
        const response = await fetch('productos.json?v=' + Date.now());
        if (!response.ok) throw new Error('HTTP ' + response.status);
        allProducts = await response.json();
    } catch (error) {
        const local = location.protocol === 'file:';
        return showError('No pudimos cargar los productos',
            local ? 'Abriste la página con doble click y el navegador bloquea la lectura de productos.json. Ábrela con un servidor local (por ejemplo la extensión Live Server de VS Code) o súbela a tu hosting.'
                  : 'Revisa que productos.json esté junto a index.html y que no tenga errores (puedes validarlo en jsonlint.com).', error);
    }
    try {
        clampCart();
        renderCart();
        applyFilters();
    } catch (error) {
        showError('No pudimos mostrar los productos', 'Revisa que index.html y app.js sean de la misma versión.', error);
    }
}

function switchSection(section) {
    activeSection = section;
    const buttons = { todos: 'btn-all', mascotas: 'btn-mascotas', personas: 'btn-personas' };
    document.querySelectorAll('.section-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    const activeBtn = document.getElementById(buttons[section]);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-pressed', 'true');
    }
    applyFilters();
}

function applyFilters() {
    const searchText = document.getElementById('search-bar').value.toLowerCase();
    const grid = document.getElementById('products-grid');
    grid.innerHTML = "";

    const filtered = allProducts.filter(item => {
        const matchesSection = (activeSection === 'todos' || item.section === activeSection);
        const matchesSearch = item.name.toLowerCase().includes(searchText);
        return matchesSection && matchesSearch;
    });

    if(filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state w-100"><strong>No encontramos productos</strong>Prueba con otra palabra o cambia de categoría.</div>`;
        return;
    }

    filtered.forEach(product => {
        const coverImg = product.images && product.images.length > 0 ? product.images[0] : '';
        const emoji = SECTION_EMOJI[product.section] || '🛍️';
        const name = escapeHtml(product.name);
        const imgHtml = coverImg
            ? `<img src="${coverImg}" class="product-img" alt="${name}" data-emoji="${emoji}" onerror="imgFail(this)">`
            : `<div class="img-fallback" role="img" aria-label="${name}">${emoji}</div>`;

        grid.innerHTML += `
            <div class="col">
                <article class="card h-100 product-card sec-${product.section} ${stockOf(product) <= 0 ? 'soldout' : ''}" tabindex="0"
                         onclick="openCard(this,${product.id})"
                         onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openCard(this,${product.id});}">
                    <div class="img-wrap">
                        ${imgHtml}
                        ${stockTag(product)}
                        <span class="price-tag">$${product.price.toFixed(2)}</span>
                    </div>
                    <div class="product-body">
                        <span class="badge-cat">${escapeHtml(product.category)}</span>
                        <h6 class="product-name">${name}</h6>
                        ${stockOf(product) <= 0 ? '<button class="btn btn-pop btn-white btn-sm w-100 mt-3" disabled>Agotado</button>' : `<button class="btn btn-pop btn-pay btn-sm w-100 mt-3" onclick="event.stopPropagation();addToCart(${product.id},this)">🛒 Agregar al carrito</button>`}
                    </div>
                </article>
            </div>
        `;
    });
}

function openCard(el, id) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return viewProductDetail(id);
    el.classList.add('bounce');
    setTimeout(() => { el.classList.remove('bounce'); viewProductDetail(id); }, 220);
}

function viewProductDetail(productId) {
    const product = allProducts.find(p => p.id === productId);
    if(!product) return;
    
    currentProduct = product;
    const emoji = SECTION_EMOJI[product.section] || '🛍️';

    document.getElementById('detail-card').className = `detail-card p-4 sec-${product.section}`;
    document.getElementById('detail-name').innerText = product.name;
    document.getElementById('detail-category').innerText = `${product.section} / ${product.category}`;
    document.getElementById('detail-price').innerText = `$${product.price.toFixed(2)}`;
    document.getElementById('detail-description').innerText = product.description;
    document.getElementById('detail-stock').innerHTML = stockTag(product) + ' <small class="text-muted">Oferta sujeta a existencias</small>';
    const out = stockOf(product) <= 0;
    document.getElementById('btn-add').disabled = out;
    document.getElementById('btn-buy').disabled = out;

    const carouselInner = document.getElementById('carousel-images');
    carouselInner.innerHTML = "";
    const images = product.images && product.images.length > 0 ? product.images : [''];
    images.forEach((imgUrl, index) => {
        const slide = imgUrl
            ? `<img src="${imgUrl}" class="d-block w-100" alt="${escapeHtml(product.name)}, foto ${index + 1}" data-emoji="${emoji}" onerror="imgFail(this)">`
            : `<div class="img-fallback img-fallback-lg" role="img" aria-label="${escapeHtml(product.name)}">${emoji}</div>`;
        carouselInner.innerHTML += `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                ${slide}
            </div>
        `;
    });

    document.getElementById('catalog-view').classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');
    window.scrollTo(0,0);

    showBrowseLayout();
    initBrowseChat();
}

function showCatalog() {
    document.getElementById('detail-view').classList.add('hidden');
    document.getElementById('catalog-view').classList.remove('hidden');
}

function showBrowseLayout() {
    document.getElementById('detail-left').classList.remove('d-none');
    document.getElementById('chat-col').className = 'col-md-6 d-flex flex-column';
}

// Chat mientras el usuario ve un producto: le dice si alcanza el envío gratis
function initBrowseChat() {
    document.getElementById('chat-box').innerHTML = "";
    const p = currentProduct, total = cartTotal(), after = total + p.price, missing = FREE_SHIPPING - after;
    appendBubble("bot", `¡Hola! Estás viendo <strong>${escapeHtml(p.name)}</strong>.`);
    setChatActions(`<button class="btn btn-pop btn-white btn-sm" onclick="showCatalog()">Seguir viendo productos</button>`);
    setTimeout(() => {
        if (stockOf(p) <= 0) return appendBubble("bot", "Este producto está agotado por ahora. Mira otros productos del catálogo 👇");
        if (stockOf(p) === 1) appendBubble("bot", "⚡ Es la <strong>última pieza</strong> de esta oferta.");
        appendBubble("bot", total >= FREE_SHIPPING
            ? "Tu carrito ya tiene envío gratis 🎉. Puedes seguir agregando lo que quieras."
            : missing <= 0
                ? `Si lo agregas, tu pedido llegaría a $${after.toFixed(2)} y el envío sería <strong>gratis</strong> 🎉`
                : `Con este producto llevarías $${after.toFixed(2)} y te faltarían <strong>$${missing.toFixed(2)}</strong> para envío gratis. Si prefieres, puedes comprarlo igual: el envío se cobra aparte.`);
    }, 600);
}

// Chat de compra con todo el carrito
function startCheckout() {
    if (cartItems().length === 0) return;
    currentProduct = null;
    deliveryMode = ''; clientPhone = ''; clientAddress = '';
    document.getElementById('detail-card').className = 'detail-card p-4';
    document.getElementById('detail-left').classList.add('d-none');
    document.getElementById('chat-col').className = 'col-12 col-md-8 mx-auto d-flex flex-column';
    document.getElementById('catalog-view').classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');
    window.scrollTo(0, 0);

    document.getElementById('chat-box').innerHTML = "";
    setChatActions("");
    const lines = cartItems().map(i => `• ${i.qty} x ${escapeHtml(i.p.name)}`).join('<br>');
    appendBubble("bot", `¡Hola! Vamos a procesar tu pedido:<br>${lines}<br><strong>Total: $${cartTotal().toFixed(2)}</strong><br><small>Las ofertas están sujetas a existencias; confirmamos tu pedido por correo.</small>`);
    setTimeout(() => {
        appendBubble("bot", "¿Qué método de pago prefieres utilizar?");
        setChatActions(`
            <button class="btn btn-pop btn-pay btn-sm me-2" onclick="handlePayment('Transferencia Bancaria')">💳 Transferencia</button>
            <button class="btn btn-pop btn-pay btn-sm" onclick="handlePayment('Efectivo')">💵 Efectivo</button>
        `);
    }, 600);
}

function appendBubble(sender, text) {
    const chatBox = document.getElementById('chat-box');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}-bubble`;
    bubble.innerHTML = text;
    chatBox.appendChild(bubble);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function setChatActions(htmlContent) {
    document.getElementById('chat-actions').innerHTML = htmlContent;
}

function handlePayment(method) {
    selectedPayment = method;
    deliveryMode = '';
    appendBubble("user", method);
    setTimeout(() => {
        if (method === 'Efectivo') return handleCash();
        appendBubble("bot", "¿Cómo prefieres recibir tu pedido?");
        setChatActions(`
            <button class="btn btn-pop btn-pay btn-sm me-2" onclick="handleDelivery('personal')">🤝 Entrega personal</button>
            <button class="btn btn-pop btn-pay btn-sm" onclick="handleDelivery('domicilio')">🏠 Envío a domicilio</button>
        `);
    }, 600);
}

// Efectivo = entrega personal: se sugiere completar el monto, pero nunca se pide dirección ni se habla de cobro de envío
function handleCash() {
    deliveryMode = 'personal';
    const missing = FREE_SHIPPING - cartTotal();
    if (missing <= 0) return askPersonalPoint();
    appendBubble("bot", `Por cierto, con <strong>$${missing.toFixed(2)}</strong> más tu pedido calificaría para <strong>envío gratis</strong> 🚚. ¿Quieres agregar algo más?`);
    setChatActions(`
        <button class="btn btn-pop btn-pay btn-sm me-2" onclick="showCatalog()">Seguir viendo productos</button>
        <button class="btn btn-pop btn-white btn-sm" onclick="handleCashContinue()">Continuar así</button>
    `);
}

function handleCashContinue() {
    appendBubble("user", "Continuar así");
    setTimeout(askPersonalPoint, 600);
}

function askPersonalPoint() {
    selectedShippingAgreement = "Entrega personal en Atizapán (sin costo de envío)";
    appendBubble("bot", "📍 La entrega personal solo se realiza en <strong>Atizapán</strong>. ¿Te queda bien ese punto de entrega?");
    const other = selectedPayment === 'Efectivo'
        ? `<button class="btn btn-pop btn-white btn-sm" onclick="handlePayment('Transferencia Bancaria')">Prefiero transferencia</button>`
        : `<button class="btn btn-pop btn-white btn-sm" onclick="handleDelivery('domicilio')">Mejor a domicilio</button>`;
    setChatActions(`<button class="btn btn-pop btn-go btn-sm me-2" onclick="handlePersonalAccept()">Sí, me queda bien</button>${other}`);
}

function handleDelivery(mode) {
    deliveryMode = mode;
    appendBubble("user", mode === 'personal' ? "Entrega personal" : "Envío a domicilio");
    setTimeout(() => { mode === 'personal' ? askPersonalPoint() : askShipping(); }, 600);
}

// Envío a domicilio: aplica la regla de envío gratis desde $500
function askShipping() {
    const missing = FREE_SHIPPING - cartTotal();
    if (missing <= 0) {
        selectedShippingAgreement = "Envío Gratis (Supera $500)";
        appendBubble("bot", "🎉 ¡Buenas noticias! Tu pedido califica para <strong>Envío Gratis</strong>.<br><br>¿Continuamos con tus datos de entrega?");
        setChatActions(`<button class="btn btn-pop btn-go btn-sm" onclick="handleShippingAgreement('Sí, continuar')">Sí, continuar</button>`);
    } else {
        selectedShippingAgreement = "Envío con costo aparte (Menor a $500)";
        appendBubble("bot", `Te faltan <strong>$${missing.toFixed(2)}</strong> para <strong>envío gratis</strong> 🚚. ¿Quieres agregar algo más? Si prefieres, sigo con tu pedido tal cual: el envío se cobra aparte.`);
        setChatActions(`
            <button class="btn btn-pop btn-pay btn-sm me-2" onclick="showCatalog()">Seguir viendo productos</button>
            <button class="btn btn-pop btn-white btn-sm" onclick="handleShippingAgreement('Continuar así')">Continuar así</button>
        `);
    }
}

// Entrega personal: solo correo y teléfono
function handlePersonalAccept() {
    appendBubble("user", "Sí, me queda bien");
    setTimeout(() => {
        appendBubble("bot", "Perfecto. Solo necesito tu <strong>correo electrónico</strong> y tu <strong>teléfono</strong> para ponernos en contacto contigo. Primero, tu correo:");
        setChatActions(`
            <div class="input-group w-100 p-1">
                <input type="email" id="chat-email-input" class="form-control" placeholder="ejemplo@correo.com" aria-label="Correo electrónico">
                <button class="btn btn-pop btn-next" onclick="handleEmailSubmit()">Siguiente</button>
            </div>
        `);
    }, 600);
}

function handleShippingAgreement(label = "Sí, de acuerdo") {
    appendBubble("user", label);
    setTimeout(() => {
        appendBubble("bot", "Por favor, proporciona tu <strong>Dirección completa</strong> para agendar la entrega:");
        setChatActions(`
            <div class="input-group w-100 p-1">
                <input type="text" id="chat-address-input" class="form-control" placeholder="Calle, Número, Colonia..." aria-label="Dirección completa">
                <button class="btn btn-pop btn-next" onclick="handleAddressSubmit()">Siguiente</button>
            </div>
        `);
    }, 600);
}

function handleAddressSubmit() {
    const input = document.getElementById('chat-address-input');
    if(!input.value.trim()) return alert("Por favor ingresa tu dirección");
    
    clientAddress = input.value.trim();
    appendBubble("user", escapeHtml(clientAddress));

    setTimeout(() => {
        appendBubble("bot", "Por último, proporciónanos tu <strong>Correo Electrónico</strong> para enviarte tu confirmación:");
        setChatActions(`
            <div class="input-group w-100 p-1">
                <input type="email" id="chat-email-input" class="form-control" placeholder="ejemplo@correo.com" aria-label="Correo electrónico">
                <button class="btn btn-pop btn-next" onclick="handleEmailSubmit()">Finalizar</button>
            </div>
        `);
    }, 600);
}

function handleEmailSubmit() {
    const input = document.getElementById('chat-email-input');
    const emailValue = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if(!emailRegex.test(emailValue)) {
        return alert("Por favor ingresa un correo electrónico válido");
    }
    
    clientEmail = emailValue;
    appendBubble("user", escapeHtml(clientEmail));

    setTimeout(() => {
        if (deliveryMode === 'personal') {
            appendBubble("bot", "Gracias. Ahora tu <strong>número de teléfono</strong> (10 dígitos):");
            setChatActions(`
                <div class="input-group w-100 p-1">
                    <input type="tel" id="chat-phone-input" class="form-control" placeholder="10 dígitos" aria-label="Número de teléfono">
                    <button class="btn btn-pop btn-next" onclick="handlePhoneSubmit()">Finalizar</button>
                </div>
            `);
        } else {
            showConfirm();
        }
    }, 600);
}

function handlePhoneSubmit() {
    const input = document.getElementById('chat-phone-input');
    const digits = input.value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) return alert("Por favor ingresa un teléfono válido de 10 dígitos");
    clientPhone = digits;
    appendBubble("user", escapeHtml(input.value.trim()));
    setTimeout(showConfirm, 600);
}

function showConfirm() {
    appendBubble("bot", "Procesando los datos... Presiona el botón de abajo para confirmar tu pedido.");
    setChatActions(`
        <button class="btn btn-pop btn-go w-100 py-2" onclick="sendOrderData()">
            🚀 Confirmar y Procesar Pedido
        </button>
    `);
}

function sendOrderData() {
    if(FORMSPREE_ID === "TU_ID_DE_FORMSPREE") {
        alert("¡Falta Configuración! Registrate en formspree.io y reemplaza FORMSPREE_ID en app.js");
        return;
    }

    setChatActions(`<div class="spinner-border text-success" role="status"><span class="visually-hidden">Enviando...</span></div>`);

    const formData = {
        _replyto: clientEmail, 
        _subject: `📦 NUEVO PEDIDO (${cartItems().length} producto(s))`,
        "🛍️ Productos": orderSummary(),
        "💰 Total": `$${cartTotal().toFixed(2)}`,
        "💳 Pago": selectedPayment,
        "🚚 Envío": selectedShippingAgreement,
        "📍 Dirección": deliveryMode === 'personal' ? "Entrega personal en Atizapán" : clientAddress,
        "📧 Correo": clientEmail,
        "📞 Teléfono": clientPhone || "No aplica (envío a domicilio)"
    };

    fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (response.ok) {
            cart = {}; saveCart();
            appendBubble("bot", `✨ ¡Pedido recibido! ${deliveryMode === 'personal' ? 'Nos pondremos en contacto contigo por correo o teléfono para coordinar la entrega y confirmar la disponibilidad de tus piezas.' : 'Te confirmaremos por correo la disponibilidad de tus piezas.'}<br><br>💜 ¡Muchas gracias por tu compra! Esperamos que pronto regreses a seguir comprando.`);
            setChatActions(`<button class="btn btn-pop btn-white w-100" onclick="showCatalog()">Volver al Catálogo</button>`);
        } else {
            throw new Error();
        }
    })
    .catch(() => {
        appendBubble("bot", "❌ Hubo un inconveniente al enviar los datos. Vuelve a intentarlo.");
        setChatActions(`<button class="btn btn-pop btn-retry w-100" onclick="sendOrderData()">Reintentar Envío</button>`);
    });
}

document.getElementById('search-bar').addEventListener('input', applyFilters);
window.onload = fetchProducts;