let carrito = [];
let productosDisponibles = [];

document.addEventListener("DOMContentLoaded", () => {
    cargarProductos();
});

// 1. Cargar productos desde el JSON
function cargarProductos() {
    fetch('productos.json')
        .then(response => response.json())
        .then(data => {
            productosDisponibles = data;
            mostrarProductos(data);
        })
        .catch(error => console.error("Error al cargar los productos:", error));
}

// 2. Mostrar productos en el HTML con su imagen
function mostrarProductos(productos) {
    const contenedor = document.getElementById("productos-container");
    contenedor.innerHTML = "";

    productos.forEach(prod => {
        const div = document.createElement("div");
        div.classList.add("producto-card");
        div.innerHTML = `
            <img src="${prod.imagen}" alt="${prod.nombre}" style="width: 100px; height: 100px; object-fit: cover;">
            <h3>${prod.nombre}</h3>
            <p>$${prod.precio}</p>
            <button onclick="agregarAlCarrito(${prod.id})">Agregar al Carrito</button>
        `;
        contenedor.appendChild(div);
    });
}

// 3. Agregar producto al carrito
function agregarAlCarrito(id) {
    const productoEncontrado = productosDisponibles.find(p => p.id === id);
    if (productoEncontrado) {
        carrito.push(productoEncontrado);
        actualizarCarrito();
    }
}

// 4. Actualizar vista del carrito y evaluar la regla de los $500
function actualizarCarrito() {
    const listaCarrito = document.getElementById("lista-carrito");
    const spanTotal = document.getElementById("total-carrito");
    const mensajeEnvio = document.getElementById("mensaje-envio");
    const btnProcesar = document.getElementById("btn-procesar");

    listaCarrito.innerHTML = "";
    let total = 0;

    carrito.forEach((item, index) => {
        total += item.precio;
        const li = document.createElement("li");
        li.textContent = `${item.nombre} - $${item.precio}`;
        listaCarrito.appendChild(li);
    });

    spanTotal.textContent = total;

    // Regla de los $500 para envío a domicilio
    const minimoEnvio = 500;
    if (total === 0) {
        mensajeEnvio.textContent = "Tu carrito está vacío.";
        mensajeEnvio.style.color = "gray";
        btnProcesar.disabled = true;
    } else if (total < minimoEnvio) {
        let faltante = minimoEnvio - total;
        mensajeEnvio.innerHTML = `⚠️ Te faltan <strong>$${faltante}</strong> para alcanzar el envío a domicilio de $500. ¡Agrega más productos!`;
        mensajeEnvio.style.color = "orange";
        btnProcesar.disabled = true; // Opcional: puedes dejarlo habilitado si permites retiro en local
    } else {
        mensajeEnvio.innerHTML = `✅ ¡Genial! Tu pedido califica para **envío a domicilio gratis** ($500+).`;
        mensajeEnvio.style.color = "green";
        btnProcesar.disabled = false;
    }
}
