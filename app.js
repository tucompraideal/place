let allProducts = [];
let activeSection = 'todos';

const FORMSPREE_ID = "TU_ID_DE_FORMSPREE"; 

let currentProduct = null;
let selectedPayment = "";
let selectedShippingAgreement = "";
let clientAddress = "";
let clientEmail = "";

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
    try {
        const response = await fetch('productos.json');
        allProducts = await response.json();
        applyFilters();
    } catch (error) {
        console.error("Error al leer el archivo JSON:", error);
        document.getElementById('products-grid').innerHTML = `<div class="empty-state w-100"><strong>No pudimos cargar los productos</strong>Recarga la página. Si sigue igual, revisa que productos.json esté junto a index.html.</div>`;
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
                <article class="card h-100 product-card sec-${product.section}" tabindex="0" role="button"
                         onclick="viewProductDetail(${product.id})"
                         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();viewProductDetail(${product.id});}">
                    <div class="img-wrap">
                        ${imgHtml}
                        <span class="price-tag">$${product.price.toFixed(2)}</span>
                    </div>
                    <div class="product-body">
                        <span class="badge-cat">${escapeHtml(product.category)}</span>
                        <h6 class="product-name">${name}</h6>
                    </div>
                </article>
            </div>
        `;
    });
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

    initChatbot();
}

function showCatalog() {
    document.getElementById('detail-view').classList.add('hidden');
    document.getElementById('catalog-view').classList.remove('hidden');
}

function initChatbot() {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ""; 
    setChatActions("");
    
    appendBubble("bot", `¡Hola! Qué excelente elección. Me encargaré de procesar tu solicitud para el artículo: <strong>${escapeHtml(currentProduct.name)}</strong>.`);
    setTimeout(() => {
        appendBubble("bot", "¿Qué método de pago prefieres utilizar?");
        setChatActions(`
            <button class="btn btn-pop btn-pay btn-sm me-2" onclick="handlePayment('Transferencia Bancaria')">💳 Transferencia</button>
            <button class="btn btn-pop btn-pay btn-sm" onclick="handlePayment('Efectivo (Entrega Personal)')">💵 Efectivo</button>
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
    appendBubble("user", method);
    
    setTimeout(() => {
        let shippingInfo = "";
        if(currentProduct.price >= 500) {
            shippingInfo = `🎉 ¡Buenas noticias! Tu pedido califica para <strong>Envío Gratis</strong> por superar los $500.`;
            selectedShippingAgreement = "Envío Gratis (Supera $500)";
        } else {
            shippingInfo = `⚠️ Nota: El costo del envío a domicilio es <strong>aparte</strong> del costo del producto.`;
            selectedShippingAgreement = "Envío con costo aparte (Menor a $500)";
        }

        appendBubble("bot", `${shippingInfo}<br><br>¿Estás de acuerdo con estos términos de entrega?`);
        setChatActions(`<button class="btn btn-pop btn-go btn-sm" onclick="handleShippingAgreement()">Sí, de acuerdo</button>`);
    }, 600);
}

function handleShippingAgreement() {
    appendBubble("user", "Sí, de acuerdo");
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
        appendBubble("bot", "Procesando los datos... Presiona el botón de abajo para confirmar tu pedido.");
        setChatActions(`
            <button class="btn btn-pop btn-go w-100 py-2" onclick="sendOrderData()">
                🚀 Confirmar y Procesar Pedido
            </button>
        `);
    }, 600);
}

function sendOrderData() {
    if(FORMSPREE_ID === "TU_ID_DE_FORMSPREE") {
        alert("¡Falta Configuración! Registrate en formspree.io y reemplaza FORMSPREE_ID en app.js");
        return;
    }

    setChatActions(`<div class="spinner-border text-success" role="status"><span class="visually-hidden">Enviando...</span></div>`);

    const formData = {
        _replyto: clientEmail, 
        _subject: `📦 NUEVO PEDIDO: ${currentProduct.name}`,
        "🛍️ Producto": currentProduct.name,
        "💰 Costo": `$${currentProduct.price.toFixed(2)}`,
        "💳 Pago": selectedPayment,
        "🚚 Envío": selectedShippingAgreement,
        "📍 Dirección": clientAddress,
        "📧 Correo": clientEmail
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
            appendBubble("bot", "✨ ¡Pedido procesado con éxito! Recibirás un correo con los detalles.");
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