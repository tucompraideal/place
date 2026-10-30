let allProducts = [];
let activeSection = 'todos';

// CONFIGURACIÓN OBLIGATORIA DE TU RECEPTOR DE PEDIDOS
// Regístrate gratis en formspree.io, crea un form y pega aquí el ID de 8 dígitos
const FORMSPREE_ID = "TU_ID_DE_FORMSPREE"; 

// Variables de almacenamiento temporal para el Chatbot
let currentProduct = null;
let selectedPayment = "";
let selectedShippingAgreement = "";
let clientAddress = "";
let clientEmail = "";

// Cargar catálogo de productos
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

// Controladores de filtros por Apartados Principales
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
        const coverImg = product.images && product.images.length > 0 ? product.images[0] : 'https://placeholder.com';
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

// Desplegar ficha de detalles
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

// ==========================================
// ÁRBOL DE DECISIONES DEL CHATBOT
// ==========================================
function initChatbot() {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ""; 
    
    appendBubble("bot", `¡Hola! Qué excelente elección. Me encargaré de procesar tu solicitud para el artículo: <strong>${currentProduct.name}</strong> (Modelo Único / Unitalla).`);
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

// PASO 1: Captura de método de pago y procesamiento de envío/tiempos
function handlePayment(method) {
    selectedPayment = method;
    appendBubble("user", method);
    
    setTimeout(() => {
        let shippingInfo = "";
        if(currentProduct.price >= 500) {
            shippingInfo = `🎉 ¡Buenas noticias! Tu pedido califica para <strong>Envío Gratis</strong> por superar los $500.`;
            selectedShippingAgreement = "Envío Gratis (Supera $500)";
        } else {
            shippingInfo = `⚠️ Nota: El costo del envío a domicilio es <strong>aparte</strong> del costo del producto (¡Recuerda que es gratis en compras mayores a $500!).`;
            selectedShippingAgreement = "Envío con costo aparte (Menor a $500)";
        }

        appendBubble("bot", `${shippingInfo}<br><br>🚨 <strong>Información importante sobre la entrega:</strong><br>• Las entregas a domicilio se realizan al <strong>día siguiente</strong> de procesado tu pedido.<br>• Las entregas en persona quedan completamente <strong>sujetas a disponibilidad de horario y día</strong>.<br><br>¿Estás de acuerdo con estos términos de entrega?`);
        
        setChatActions(`
            <button class="btn btn-sm btn-success text-white" onclick="handleShippingAgreement()">Sí, de acuerdo</button>
        `);
    }, 600);
}

// PASO 2: Confirmación de políticas de entrega
function handleShippingAgreement() {
    appendBubble("user", "Sí, de acuerdo");

    setTimeout(() => {
        appendBubble("bot", "Perfecto. Por favor, proporciona tu <strong>Dirección completa</strong> para agendar la entrega del producto:");
        setChatActions(`
            <div class="input-group w-100 p-1">
                <input type="text" id="chat-address-input" class="form-control" placeholder="Calle, Número, Colonia, Ciudad...">
                <button class="btn btn-primary" onclick="handleAddressSubmit()">Siguiente</button>
            </div>
        `);
    }, 600);
}

// PASO 3: Captura de dirección y petición de correo electrónico de contacto
function handleAddressSubmit() {
    const input = document.getElementById('chat-address-input');
    if(!input.value.trim()) return alert("Por favor ingresa tu dirección para poder continuar");
    
    clientAddress = input.value.trim();
    appendBubble("user", clientAddress);

    setTimeout(() => {
        appendBubble("bot", "¡Casi terminamos! Por último, proporciónanos tu <strong>Correo Electrónico</strong>. Lo utilizaremos para procesar la orden y mandarte tu confirmación digital automáticamente:");
        setChatActions(`
            <div class="input-group w-100 p-1">
                <input type="email" id="chat-email-input" class="form-control" placeholder="ejemplo@correo.com">
                <button class="btn btn-primary" onclick="handleEmailSubmit()">Finalizar</button>
            </div>
        `);
    }, 600);
}

// PASO 4: Validación regex de email y creación de botón final
function handleEmailSubmit() {
    const input = document.getElementById('chat-email-input');
    const emailValue = input.value.trim();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(emailValue)) {
        return alert("Por favor ingresa un formato de correo electrónico válido (ejemplo@correo.com)");
    }
    
    clientEmail = emailValue;
    appendBubble("user", clientEmail);

    setTimeout(() => {
        appendBubble("bot", "Procesando los datos en nuestro sistema... Por favor, presiona el botón de abajo para confirmar el envío de tu pedido.");
        
        setChatActions(`
            <button class="btn btn-success w-100 py-2 fw-bold text-white shadow-sm" style="border-radius:20px;" onclick="sendOrderData()">
                🚀 Confirmar y Procesar Pedido
            </button>
        `);
    }, 600);
}

// ENVÍO DE DATOS AUTOMÁTICO EN SEGUNDO PLANO (API Formspree)
function sendOrderData() {
    if(FORMSPREE_ID === "TU_ID_DE_FORMSPREE") {
        alert("¡Falta Configuración! Debes registrarte en formspree.io y cambiar la constante FORMSPREE_ID en tu archivo app.js");
        return;
    }

    setChatActions(`<div class="spinner-border text-success" role="status"><span class="visually-hidden">Enviando...</span></div>`);

    // Estructuración del correo
    const formData = {
        _replyto: clientEmail, 
        _subject: `📦 NUEVO PEDIDO DEL CATÁLOGO: ${currentProduct.name}`,
        "🛍️ Producto Solicitado": currentProduct.name,
        "💰 Costo del Producto": $${currentProduct.price.toFixed(2)},
"💳 Método de Pago Elegido": selectedPayment,
"🚚 Estatus del Envío": selectedShippingAgreement,
"📍 Dirección Postal de Entrega": clientAddress,
"📧 Correo Electrónico Cliente": clientEmail,
_confirmation: "¡Gracias por tu pedido! Hemos recibido tu solicitud correctamente en nuestro sistema. Procesaremos tu orden según los tiempos estipulados (las entregas a domicilio se agendan para el día siguiente; las entregas personales quedan sujetas a horarios disponibles). Tu orden ya está siendo preparada por el equipo."
};
fetch('https://formspree.io{FORMSPREE_ID}', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Accept': 'application/json'
},
body: JSON.stringify(formData)
})
.then(response => {
if (response.ok) {
appendBubble("bot", "✨ ¡Pedido Procesado con éxito! Hemos recibido tus datos de forma segura. En un par de minutos recibirás un correo electrónico confirmando la recepción y los detalles estipulados de tu orden.");
setChatActions(<button class="btn btn-secondary w-100" style="border-radius:20px;" onclick="showCatalog()">Volver al Catálogo</button>);
} else {
throw new Error();
}
})
.catch(error => {
appendBubble("bot", "❌ Hubo un pequeño inconveniente al transmitir los datos de la compra. Por favor, vuelve a intentarlo.");
setChatActions(<button class="btn btn-danger w-100" style="border-radius:20px;" onclick="sendOrderData()">Reintentar Envío</button>);
});
}
document.getElementById('search-bar').addEventListener('input', applyFilters);
window.onload = fetchProducts;
