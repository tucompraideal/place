let allProducts = [];
let activeSection = 'todos';

const FORMSPREE_ID = "TU_ID_DE_FORMSPREE"; 

let currentProduct = null;
let selectedPayment = "";
let selectedShippingAgreement = "";
let clientAddress = "";
let clientEmail = "";

async function fetchProducts() {
    try {
        const response = await fetch('productos.json');
        allProducts = await response.json();
        applyFilters();
    } catch (error) {
        console.error("Error al leer el archivo JSON:", error);
        document.getElementById('products-grid').innerHTML = `<p class="text-center w-100 text-danger">Error al cargar productos.</p>`;
    }
}

function switchSection(section) {
    activeSection = section;
    document.querySelectorAll('.section-btn').forEach(btn => btn.classList.remove('active'));
    if(section === 'todos') document.getElementById('btn-all').classList.add('active');
    if(section === 'mascotas') document.getElementById('btn-mascotas').classList.add('active');
    if(section === 'personas') document.getElementById('btn-personas').classList.add('active');
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
        grid.innerHTML = `<h5 class="text-center text-muted my-5 w-100">No se encontraron artículos.</h5>`;
        return;
    }

    filtered.forEach(product => {
        const coverImg = product.images && product.images.length > 0 ? product.images[0] : '';
        grid.innerHTML += `
            <div class="col">
                <div class="card h-100 product-card shadow-sm" onclick="viewProductDetail(${product.id})">
                    <img src="${coverImg}" class="card-img-top product-img" alt="${product.name}">
                    <div class="card-body d-flex flex-column justify-content-between p-3">
                        <div>
                            <span class="badge badge-cat mb-2 text-capitalize">${product.category}</span>
                            <h6 class="card-title text-dark fw-bold mb-1">${product.name}</h6>
                        </div>
                        <p class="card-text text-success fw-bold m-0 mt-2 fs-5">$${product.price.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        `;
    });
}

function viewProductDetail(productId) {
    const product = allProducts.find(p => p.id === productId);
    if(!product) return;
    
    currentProduct = product;

    document.getElementById('detail-name').innerText = product.name;
    document.getElementById('detail-category').innerText = `${product.section} / ${product.category}`;
    document.getElementById('detail-price').innerText = `$${product.price.toFixed(2)}`;
    document.getElementById('detail-description').innerText = product.description;

    const carouselInner = document.getElementById('carousel-images');
    carouselInner.innerHTML = "";
    product.images.forEach((imgUrl, index) => {
        carouselInner.innerHTML += `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img src="${imgUrl}" class="d-block w-100" alt="foto ${index}">
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
    
    appendBubble("bot", `¡Hola! Qué excelente elección. Me encargaré de procesar tu solicitud para el artículo: <strong>${currentProduct.name}</strong>.`);
    setTimeout(() => {
        appendBubble("bot", "¿Qué método de pago prefieres utilizar?");
        setChatActions(`
            <button class="btn btn-sm btn-outline-primary me-2" onclick="handlePayment('Transferencia Bancaria')">💳 Transferencia</button>
            <button class="btn btn-sm btn-outline-primary" onclick="handlePayment('Efectivo (Entrega Personal)')">💵 Efectivo</button>
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
        setChatActions(`<button class="btn btn-sm btn-success text-white" onclick="handleShippingAgreement()">Sí, de acuerdo</button>`);
    }, 600);
}

function handleShippingAgreement() {
    appendBubble("user", "Sí, de acuerdo");
    setTimeout(() => {
        appendBubble("bot", "Por favor, proporciona tu <strong>Dirección completa</strong> para agendar la entrega:");
        setChatActions(`
            <div class="input-group w-100 p-1">
                <input type="text" id="chat-address-input" class="form-control" placeholder="Calle, Número, Colonia...">
                <button class="btn btn-primary" onclick="handleAddressSubmit()">Siguiente</button>
            </div>
        `);
    }, 600);
}

function handleAddressSubmit() {
    const input = document.getElementById('chat-address-input');
    if(!input.value.trim()) return alert("Por favor ingresa tu dirección");
    
    clientAddress = input.value.trim();
    appendBubble("user", clientAddress);

    setTimeout(() => {
        appendBubble("bot", "Por último, proporciónanos tu <strong>Correo Electrónico</strong> para enviarte tu confirmación:");
        setChatActions(`
            <div class="input-group w-100 p-1">
                <input type="email" id="chat-email-input" class="form-control" placeholder="ejemplo@correo.com">
                <button class="btn btn-primary" onclick="handleEmailSubmit()">Finalizar</button>
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
    appendBubble("user", clientEmail);

    setTimeout(() => {
        appendBubble("bot", "Procesando los datos... Presiona el botón de abajo para confirmar tu pedido.");
        setChatActions(`
            <button class="btn btn-success w-100 py-2 fw-bold text-white shadow-sm" style="border-radius:20px;" onclick="sendOrderData()">
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
            setChatActions(`<button class="btn btn-secondary w-100" style="border-radius:20px;" onclick="showCatalog()">Volver al Catálogo</button>`);
        } else {
            throw new Error();
        }
    })
    .catch(() => {
        appendBubble("bot", "❌ Hubo un inconveniente al enviar los datos. Vuelve a intentarlo.");
        setChatActions(`<button class="btn btn-danger w-100" style="border-radius:20px;" onclick="sendOrderData()">Reintentar Envío</button>`);
    });
}

document.getElementById('search-bar').addEventListener('input', applyFilters);
window.onload = fetchProducts;
