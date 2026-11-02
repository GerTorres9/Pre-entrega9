// ============================================================================
// PRE-ENTREGA 9: ASINCRONISMO Y PROMESAS
// Simulador de Inventario, Cotización y Checkout — TechCore Hardware & PC
// Integra:
//   1. Temporizador con setTimeout() (aviso de cotización USD y cupón TECH10)
//   2. Promesas (new Promise resuelta/rechazada con setTimeout)
//   3. Consumo asíncrono con async / await
//   4. Manejo de errores con bloques try / catch / finally
//   5. Avances acumulados: Clases, DOM, Eventos, Destructuring, localStorage
// ============================================================================

const TASA_IVA_MEXICO = 0.16;
const COTIZACION_DOLAR_HOY = 20.15;
const PORCENTAJE_CUPON_TECH10 = 0.10;
const CLAVE_STORAGE_CATALOGO = "techcore_catalogo_hardware_v9";
const CLAVE_STORAGE_CARRITO = "techcore_carrito_cliente_v9";
const CLAVE_STORAGE_CUPON = "techcore_cupon_activo_v9";

// ============================================================================
// 1. CLASE PRINCIPAL DEL SIMULADOR
// ============================================================================

class ProductoHardware {
    constructor({ id, nombre, categoria, precio, stock }) {
        this.id = Number(id);
        this.nombre = nombre;
        this.categoria = categoria;
        this.precio = Number(precio);
        this.stock = Number(stock);
        this.disponible = this.stock > 0;
    }

    vender(cantidadUnidades = 1) {
        if (cantidadUnidades <= 0 || cantidadUnidades > this.stock) {
            return false;
        }
        this.stock -= cantidadUnidades;
        this.disponible = this.stock > 0;
        return true;
    }

    devolverAlStock(cantidadUnidades = 1) {
        this.stock += Number(cantidadUnidades);
        this.disponible = this.stock > 0;
    }

    aplicarDescuento(porcentajeDescuento = 10) {
        if (porcentajeDescuento > 0 && porcentajeDescuento < 100) {
            const factor = 1 - porcentajeDescuento / 100;
            this.precio = Math.round(this.precio * factor * 100) / 100;
        }
        return this.precio;
    }

    calcularPrecioConIva(tasaIva = TASA_IVA_MEXICO) {
        return Math.round(this.precio * (1 + tasaIva) * 100) / 100;
    }
}

function obtenerDatosSemillaCatalogo() {
    return [
        { id: 1, nombre: "Procesador AMD Ryzen 7 7800X3D", categoria: "Procesadores", precio: 8400, stock: 8 },
        { id: 2, nombre: "Tarjeta Gráfica NVIDIA RTX 4070 Super", categoria: "Tarjetas de Video", precio: 13900, stock: 5 },
        { id: 3, nombre: "Memoria RAM Kit 32GB DDR5 6000MHz", categoria: "Memorias RAM", precio: 2450, stock: 12 },
        { id: 4, nombre: "Unidad SSD NVMe M.2 Gen4 2TB", categoria: "Almacenamiento", precio: 2850, stock: 15 },
        { id: 5, nombre: "Monitor Gamer 27'' QHD 180Hz IPS", categoria: "Monitores", precio: 5600, stock: 6 },
        { id: 6, nombre: "Teclado Mecánico RGB Switch Red", categoria: "Periféricos", precio: 1650, stock: 10 }
    ];
}

// ============================================================================
// 2. PERSISTENCIA EN LOCALSTORAGE Y ESTADO DE LA APLICACIÓN
// ============================================================================

function leerCatalogoGuardadoOInicial() {
    const jsonGuardado = localStorage.getItem(CLAVE_STORAGE_CATALOGO);
    const listaCruda = jsonGuardado ? JSON.parse(jsonGuardado) : null;
    const arregloObjetos =
        Array.isArray(listaCruda) && listaCruda.length > 0
            ? listaCruda
            : obtenerDatosSemillaCatalogo();

    return arregloObjetos.map(
        ({ id, nombre, categoria, precio, stock }) =>
            new ProductoHardware({ id, nombre, categoria, precio, stock })
    );
}

function guardarCatalogoEnStorage(listaCatalogo) {
    localStorage.setItem(CLAVE_STORAGE_CATALOGO, JSON.stringify(listaCatalogo));
}

function cargarCarritoDesdeStorage() {
    const jsonCarrito = localStorage.getItem(CLAVE_STORAGE_CARRITO);
    const datosParseados = jsonCarrito ? JSON.parse(jsonCarrito) : null;
    return datosParseados ?? [];
}

function guardarCarritoEnStorage(listaCarrito) {
    localStorage.setItem(CLAVE_STORAGE_CARRITO, JSON.stringify(listaCarrito));
}

let catalogoProductosHardware = [];
let carritoCotizacion = cargarCarritoDesdeStorage();
let cuponTech10Activo = localStorage.getItem(CLAVE_STORAGE_CUPON) === "true";
let terminoBusquedaActual = "";
let operacionAsincronaEnCurso = false;

// ============================================================================
// 3. SELECCIÓN DE ELEMENTOS DEL DOM
// ============================================================================

const avisoTemporizadorDom = document.getElementById("aviso-temporizador");
const tituloAvisoTemporizadorDom = document.getElementById("titulo-aviso-temporizador");
const textoAvisoTemporizadorDom = document.getElementById("texto-aviso-temporizador");
const botonAplicarCuponAviso = document.getElementById("boton-aplicar-cupon-aviso");
const botonCerrarAviso = document.getElementById("boton-cerrar-aviso");

const botonRecargarPromesa = document.getElementById("boton-recargar-promesa");
const botonSimularError = document.getElementById("boton-simular-error");
const botonRestaurarStorage = document.getElementById("boton-restaurar-storage");

const formularioProducto = document.getElementById("formulario-producto");
const inputNombreProducto = document.getElementById("input-nombre");
const selectCategoriaProducto = document.getElementById("select-categoria");
const inputPrecioProducto = document.getElementById("input-precio");
const inputStockProducto = document.getElementById("input-stock");
const botonAgregarProducto = document.getElementById("boton-agregar");

const inputBusquedaTeclado = document.querySelector("#input-busqueda");
const botonVaciarCarrito = document.querySelector("#boton-vaciar-carrito");
const botonConfirmarCompra = document.getElementById("boton-confirmar-compra");

const contenedorItemsDom = document.getElementById("contenedor-items");
const contenedorCarritoDom = document.getElementById("contenedor-carrito");
const contenedorOrdenConfirmadaDom = document.getElementById("contenedor-orden-confirmada");
const insigniaCuponDom = document.getElementById("insignia-cupon");
const contadorResultadosDom = document.getElementById("contador-resultados");

const bannerFeedbackDom = document.getElementById("mensaje-feedback");
const textoFeedbackDom = document.getElementById("texto-feedback");
const estadoFinallyDom = document.getElementById("estado-finally");

const metricaTotalModelos = document.getElementById("metrica-total-modelos");
const metricaValorInventario = document.getElementById("metrica-valor-inventario");
const metricaUnidadesCotizadas = document.getElementById("metrica-unidades-cotizadas");
const metricaTotalCotizado = document.getElementById("metrica-total-cotizado");

// ============================================================================
// 4. UTILIDADES DE INTERFAZ Y FEEDBACK VISUAL
// ============================================================================

const formatearMonedaMxn = (monto) => `$${Number(monto || 0).toLocaleString("es-MX")} MXN`;

function obtenerHoraActualFormateada() {
    return new Date().toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function mostrarFeedbackVisual(mensajeTexto, tipoEstado = "exito", textoFinally = "") {
    const claseEstado =
        tipoEstado === "cargando"
            ? "feedback-cargando"
            : tipoEstado === "exito"
            ? "feedback-exito"
            : tipoEstado === "alerta"
            ? "feedback-alerta"
            : "feedback-eliminado";

    textoFeedbackDom.textContent = mensajeTexto;
    bannerFeedbackDom.className = `banner-feedback ${claseEstado}`;

    if (textoFinally) {
        estadoFinallyDom.textContent = textoFinally;
    }
}

function actualizarEstadoBotonesAsincronos(deshabilitar) {
    operacionAsincronaEnCurso = deshabilitar;
    botonRecargarPromesa.disabled = deshabilitar;
    botonSimularError.disabled = deshabilitar;
    botonConfirmarCompra.disabled = deshabilitar;
}

// ============================================================================
// 5. TEMPORIZADOR ASÍNCRONO CON setTimeout() (Requisito 1)
// Muestra información valiosa segundos después de ingresar sin bloquear la UI
// ============================================================================

function iniciarTemporizadorBienvenida() {
    setTimeout(() => {
        tituloAvisoTemporizadorDom.textContent = `Cotización del dólar hoy para hardware importado: $${COTIZACION_DOLAR_HOY} MXN`;
        textoAvisoTemporizadorDom.textContent = cuponTech10Activo
            ? "El cupón TECH10 (-10% adicional en tu carrito) ya se encuentra activo en tu sesión."
            : "Aprovecha envío asegurado y activa el cupón TECH10 para obtener 10% de descuento en tu compra.";

        if (cuponTech10Activo) {
            botonAplicarCuponAviso.textContent = "Cupón TECH10 Activo ✔️";
            botonAplicarCuponAviso.disabled = true;
        }

        avisoTemporizadorDom.classList.remove("oculto");
    }, 2800);
}

// ============================================================================
// 6. PROMESAS RESUELTAS CON setTimeout Y CONSUMIDAS CON ASYNC/AWAIT + TRY/CATCH/FINALLY
// ============================================================================

/**
 * Simula la consulta asíncrona de productos a un servidor mediante una Promise
 * resuelta o rechazada con setTimeout().
 */
function obtenerCatalogoDesdeServidor(forzarFalloRed = false) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (forzarFalloRed) {
                reject(
                    new Error(
                        "No se pudo procesar la operación con el servidor de inventario, intentá de nuevo."
                    )
                );
                return;
            }

            const productosRecuperados = leerCatalogoGuardadoOInicial();
            resolve(productosRecuperados);
        }, 1400);
    });
}

/**
 * Consume la promesa obtenerCatalogoDesdeServidor() utilizando async/await
 * dentro de un bloque try / catch / finally.
 */
async function cargarProductosSimuladorAsync(forzarFalloRed = false) {
    if (operacionAsincronaEnCurso) {
        return;
    }

    actualizarEstadoBotonesAsincronos(true);
    contadorResultadosDom.textContent = "⏳ Cargando productos...";
    mostrarFeedbackVisual(
        "⏳ Cargando productos del catálogo desde el servidor...",
        "cargando",
        "Ejecutando promesa..."
    );

    contenedorItemsDom.innerHTML = `
        <div class="estado-carga-promesa">
            <h3>⏳ Cargando productos...</h3>
            <p>Sincronizando disponibilidad y precios de hardware de forma asíncrona.</p>
        </div>
    `;

    try {
        const productosCargados = await obtenerCatalogoDesdeServidor(forzarFalloRed);
        catalogoProductosHardware = productosCargados;
        guardarCatalogoEnStorage(catalogoProductosHardware);

        renderizarInterfazCompleta();
        mostrarFeedbackVisual(
            `✔️ ${catalogoProductosHardware.length} productos cargados correctamente en el simulador.`,
            "exito"
        );
    } catch (errorCapturado) {
        contadorResultadosDom.textContent = "⚠️ Error al sincronizar";

        // Si ya teníamos catálogo en memoria lo mantenemos visible; si no, mostramos aviso de reintento
        if (catalogoProductosHardware.length > 0) {
            renderizarInterfazCompleta();
        } else {
            contenedorItemsDom.innerHTML = `
                <div class="estado-vacio">
                    <h3>⚠️ No se pudo cargar el catálogo</h3>
                    <p>${errorCapturado.message} Haz clic en "Recargar Catálogo (Promise)" para reintentar.</p>
                </div>
            `;
        }

        mostrarFeedbackVisual(
            `⚠️ ${errorCapturado.message}`,
            "eliminado"
        );
    } finally {
        // El bloque finally se ejecuta siempre (tanto en éxito como en error)
        actualizarEstadoBotonesAsincronos(false);
        estadoFinallyDom.textContent = `✔️ finally ejecutado (${obtenerHoraActualFormateada()})`;
    }
}

/**
 * Segunda Promesa con setTimeout para simular el procesamiento asíncrono de una orden de compra
 */
function procesarOrdenCompraEnServidor(carritoActual, totalFinal) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!Array.isArray(carritoActual) || carritoActual.length === 0) {
                reject(
                    new Error(
                        "No se pudo procesar la compra porque el carrito está vacío. Agregá al menos un componente."
                    )
                );
                return;
            }

            const folioGenerado = `TC-${Math.floor(100000 + Math.random() * 900000)}`;
            resolve({
                folio: folioGenerado,
                fecha: obtenerHoraActualFormateada(),
                totalPagado: totalFinal,
                unidades: carritoActual.reduce((acc, { cantidad }) => acc + cantidad, 0)
            });
        }, 1200);
    });
}

/**
 * Consumo con async/await y manejo de errores try/catch/finally al confirmar la compra
 */
async function confirmarCompraCarritoAsync() {
    if (operacionAsincronaEnCurso) {
        return;
    }

    actualizarEstadoBotonesAsincronos(true);
    contenedorOrdenConfirmadaDom.classList.add("oculto");
    mostrarFeedbackVisual(
        "⏳ Procesando orden de compra y verificando pago de forma asíncrona...",
        "cargando",
        "Procesando checkout..."
    );

    try {
        const { totalConDescuento } = calcularTotalesCarrito();
        const recibo = await procesarOrdenCompraEnServidor(carritoCotizacion, totalConDescuento);

        // Vaciar carrito tras confirmar la orden exitosamente (el stock ya fue descontado al agregar)
        carritoCotizacion = [];
        guardarCarritoEnStorage(carritoCotizacion);
        renderizarInterfazCompleta();

        contenedorOrdenConfirmadaDom.innerHTML = `
            <h4>✔️ Orden Confirmada #${recibo.folio}</h4>
            <p>Unidades adquiridas: <strong>${recibo.unidades}</strong></p>
            <p>Total procesado: <strong>${formatearMonedaMxn(recibo.totalPagado)}</strong></p>
            <p>Hora de confirmación: ${recibo.fecha}</p>
        `;
        contenedorOrdenConfirmadaDom.classList.remove("oculto");

        mostrarFeedbackVisual(
            `✔️ Compra procesada con éxito. Folio de seguimiento: ${recibo.folio}.`,
            "exito"
        );
    } catch (errorCompra) {
        mostrarFeedbackVisual(
            `⚠️ ${errorCompra.message}`,
            "eliminado"
        );
    } finally {
        actualizarEstadoBotonesAsincronos(false);
        estadoFinallyDom.textContent = `✔️ finally checkout (${obtenerHoraActualFormateada()})`;
    }
}

// ============================================================================
// 7. CÁLCULO DE MÉTRICAS Y RENDERIZADO DEL DOM
// ============================================================================

function calcularTotalesCarrito() {
    const totalUnidadesCarrito = carritoCotizacion.reduce(
        (acumulador, { cantidad }) => acumulador + cantidad,
        0
    );

    const subtotalConIva = carritoCotizacion.reduce(
        (acumulador, { precioConIva, cantidad }) =>
            Math.round((acumulador + precioConIva * cantidad) * 100) / 100,
        0
    );

    const factorDescuento = cuponTech10Activo ? 1 - PORCENTAJE_CUPON_TECH10 : 1;
    const totalConDescuento = Math.round(subtotalConIva * factorDescuento * 100) / 100;

    return {
        totalUnidadesCarrito,
        subtotalConIva,
        totalConDescuento
    };
}

function actualizarMetricasSincronizadas() {
    const totalModelos = catalogoProductosHardware.length;

    const valorTotalInventario = catalogoProductosHardware.reduce(
        (acumulador, { precio, stock }) => acumulador + precio * stock,
        0
    );

    const { totalUnidadesCarrito, totalConDescuento } = calcularTotalesCarrito();

    metricaTotalModelos.textContent = totalModelos;
    metricaValorInventario.textContent = formatearMonedaMxn(valorTotalInventario);
    metricaUnidadesCotizadas.textContent = totalUnidadesCarrito;
    metricaTotalCotizado.textContent = formatearMonedaMxn(totalConDescuento);

    if (cuponTech10Activo) {
        insigniaCuponDom.classList.remove("oculto");
    } else {
        insigniaCuponDom.classList.add("oculto");
    }
}

function obtenerProductosFiltrados(terminoFiltro) {
    const terminoLimpio = (terminoFiltro || "").trim().toLowerCase();

    return terminoLimpio === ""
        ? catalogoProductosHardware
        : catalogoProductosHardware.filter(
              ({ nombre, categoria }) =>
                  nombre.toLowerCase().includes(terminoLimpio) ||
                  categoria.toLowerCase().includes(terminoLimpio)
          );
}

function renderizarCarritoDom() {
    if (carritoCotizacion.length === 0) {
        contenedorCarritoDom.innerHTML = `
            <div class="estado-vacio">
                <p>No hay productos en el carrito guardado.</p>
            </div>
        `;
        return;
    }

    const htmlCarrito = carritoCotizacion
        .map(({ id, nombre, cantidad, precioConIva }) => {
            const subtotalItem = Math.round(cantidad * precioConIva * 100) / 100;
            return `
                <div class="item-carrito">
                    <div class="info-item-carrito">
                        <h4>${cantidad}x ${nombre}</h4>
                        <p>${formatearMonedaMxn(subtotalItem)} (IVA incl.)</p>
                    </div>
                    <button
                        type="button"
                        class="boton-quitar-carrito"
                        data-accion-carrito="quitar"
                        data-id="${id}"
                    >
                        Quitar
                    </button>
                </div>
            `;
        })
        .join("");

    contenedorCarritoDom.innerHTML = htmlCarrito;
}

function renderizarInterfazCompleta() {
    const listaFiltrada = obtenerProductosFiltrados(terminoBusquedaActual);

    contadorResultadosDom.textContent =
        listaFiltrada.length === 1
            ? "✔️ 1 producto cargado"
            : `✔️ ${listaFiltrada.length} productos cargados`;

    if (listaFiltrada.length === 0) {
        contenedorItemsDom.innerHTML = `
            <div class="estado-vacio">
                <h3>Sin coincidencias</h3>
                <p>No se encontraron componentes para "${terminoBusquedaActual}". Presiona Esc para ver todos.</p>
            </div>
        `;
    } else {
        const htmlTarjetas = listaFiltrada
            .map((producto) => {
                const { id, nombre, categoria, precio, stock } = producto;
                const precioConIva = producto.calcularPrecioConIva();
                const equivalenteUsd = (precio / COTIZACION_DOLAR_HOY).toFixed(0);

                const claseTarjeta = stock === 0 ? "tarjeta-item sin-stock" : "tarjeta-item";
                const etiquetaStock =
                    stock > 0
                        ? `Stock disponible: <strong>${stock}</strong> unidad(es)`
                        : `<span class="stock-agotado">AGOTADO (0 unidades)</span>`;
                const atributoDisabled = stock === 0 ? "disabled" : "";

                return `
                    <article class="${claseTarjeta}" data-id="${id}">
                        <div class="cabecera-item">
                            <span class="etiqueta-categoria">${categoria}</span>
                            <span class="id-item">ID #${id} · ~${equivalenteUsd} USD</span>
                        </div>
                        <h3 class="titulo-item">${nombre}</h3>
                        <p class="precio-item">${formatearMonedaMxn(precio)}</p>
                        <p class="precio-iva">Con IVA (16%): ${formatearMonedaMxn(precioConIva)}</p>
                        <p class="stock-item">${etiquetaStock}</p>
                        <div class="acciones-item">
                            <button
                                type="button"
                                class="boton-cotizar"
                                data-accion="cotizar"
                                data-id="${id}"
                                ${atributoDisabled}
                            >
                                + Al Carrito
                            </button>
                            <button
                                type="button"
                                class="boton-descuento"
                                data-accion="descuento"
                                data-id="${id}"
                                title="Aplicar 10% de descuento directo al componente"
                            >
                                -10%
                            </button>
                            <button
                                type="button"
                                class="boton-eliminar"
                                data-accion="eliminar"
                                data-id="${id}"
                            >
                                Eliminar
                            </button>
                        </div>
                    </article>
                `;
            })
            .join("");

        contenedorItemsDom.innerHTML = htmlTarjetas;
    }

    renderizarCarritoDom();
    actualizarMetricasSincronizadas();
}

// ============================================================================
// 8. OPERACIONES DEL SIMULADOR CON MANEJO DE ERRORES (try / catch / finally)
// ============================================================================

function obtenerSiguienteIdDisponible() {
    return (
        catalogoProductosHardware.reduce(
            (maximoId, { id }) => (id > maximoId ? id : maximoId),
            0
        ) + 1
    );
}

function agregarProductoYSincronizarStorage() {
    try {
        const nombreIngresado = inputNombreProducto.value.trim();
        const categoriaSeleccionada = selectCategoriaProducto.value || "Componentes";
        const precioIngresado = parseFloat(inputPrecioProducto.value);
        const stockIngresado = parseInt(inputStockProducto.value, 10);

        if (nombreIngresado === "") {
            inputNombreProducto.focus();
            throw new Error("Ingresá el nombre del componente antes de guardarlo.");
        }

        if (isNaN(precioIngresado) || precioIngresado <= 0) {
            inputPrecioProducto.focus();
            throw new Error("Ingresá un precio válido mayor a $0 MXN.");
        }

        if (isNaN(stockIngresado) || stockIngresado < 1) {
            inputStockProducto.focus();
            throw new Error("El stock inicial debe ser de al menos 1 unidad.");
        }

        const nuevoProducto = new ProductoHardware({
            id: obtenerSiguienteIdDisponible(),
            nombre: nombreIngresado,
            categoria: categoriaSeleccionada,
            precio: precioIngresado,
            stock: stockIngresado
        });

        catalogoProductosHardware.push(nuevoProducto);
        guardarCatalogoEnStorage(catalogoProductosHardware);

        inputNombreProducto.value = "";
        inputPrecioProducto.value = "";
        inputStockProducto.value = "5";
        inputNombreProducto.focus();

        renderizarInterfazCompleta();
        mostrarFeedbackVisual(
            `✔️ Componente agregado y persistido: "${nuevoProducto.nombre}" (${formatearMonedaMxn(nuevoProducto.precio)}).`,
            "exito"
        );
    } catch (errorFormulario) {
        mostrarFeedbackVisual(`⚠️ ${errorFormulario.message}`, "alerta");
    } finally {
        estadoFinallyDom.textContent = `✔️ finally validación (${obtenerHoraActualFormateada()})`;
    }
}

function gestionarAccionTarjetaCatalogo(idProducto, accion) {
    const indiceProducto = catalogoProductosHardware.findIndex(({ id }) => id === idProducto);
    if (indiceProducto === -1) {
        return;
    }

    const productoObjetivo = catalogoProductosHardware[indiceProducto];
    const { id, nombre } = productoObjetivo;

    if (accion === "cotizar") {
        const ventaExitosa = productoObjetivo.vender(1);
        if (!ventaExitosa) {
            return;
        }

        const itemExistente = carritoCotizacion.find((item) => item.id === id);
        if (itemExistente) {
            itemExistente.cantidad += 1;
            itemExistente.precioConIva = productoObjetivo.calcularPrecioConIva();
        } else {
            carritoCotizacion.push({
                id,
                nombre,
                cantidad: 1,
                precioConIva: productoObjetivo.calcularPrecioConIva()
            });
        }

        contenedorOrdenConfirmadaDom.classList.add("oculto");
        guardarCatalogoEnStorage(catalogoProductosHardware);
        guardarCarritoEnStorage(carritoCotizacion);
        renderizarInterfazCompleta();

        mostrarFeedbackVisual(
            `✔️ +1x "${nombre}" agregado al carrito (Stock restante: ${productoObjetivo.stock}).`,
            "exito"
        );
    } else if (accion === "descuento") {
        const precioPrevio = productoObjetivo.precio;
        const nuevoPrecio = productoObjetivo.aplicarDescuento(10);

        const itemEnCarrito = carritoCotizacion.find((item) => item.id === id);
        if (itemEnCarrito?.id) {
            itemEnCarrito.precioConIva = productoObjetivo.calcularPrecioConIva();
            guardarCarritoEnStorage(carritoCotizacion);
        }

        guardarCatalogoEnStorage(catalogoProductosHardware);
        renderizarInterfazCompleta();

        mostrarFeedbackVisual(
            `✔️ Descuento aplicado a "${nombre}": ${formatearMonedaMxn(precioPrevio)} -> ${formatearMonedaMxn(nuevoPrecio)}.`,
            "exito"
        );
    } else if (accion === "eliminar") {
        catalogoProductosHardware.splice(indiceProducto, 1);
        carritoCotizacion = carritoCotizacion.filter((item) => item.id !== id);

        guardarCatalogoEnStorage(catalogoProductosHardware);
        guardarCarritoEnStorage(carritoCotizacion);
        renderizarInterfazCompleta();

        mostrarFeedbackVisual(
            `🗑️ Componente eliminado del catálogo: "${nombre}".`,
            "eliminado"
        );
    }
}

function quitarItemDelCarritoStorage(idProducto) {
    const indiceEnCarrito = carritoCotizacion.findIndex(({ id }) => id === idProducto);
    if (indiceEnCarrito === -1) {
        return;
    }

    const { nombre, cantidad } = carritoCotizacion[indiceEnCarrito];
    const productoEnCatalogo = catalogoProductosHardware.find(({ id }) => id === idProducto);

    productoEnCatalogo?.devolverAlStock(cantidad);
    carritoCotizacion.splice(indiceEnCarrito, 1);

    guardarCatalogoEnStorage(catalogoProductosHardware);
    guardarCarritoEnStorage(carritoCotizacion);
    renderizarInterfazCompleta();

    mostrarFeedbackVisual(
        `Se quitó "${nombre}" del carrito y se devolvió el stock al almacén.`,
        "alerta"
    );
}

// ============================================================================
// 9. REGISTRO DE EVENTOS DEL DOM
// ============================================================================

botonAgregarProducto.addEventListener("click", () => {
    agregarProductoYSincronizarStorage();
});

formularioProducto.addEventListener("submit", (evento) => {
    evento.preventDefault();
    agregarProductoYSincronizarStorage();
});

// Recarga exitosa de la promesa con async/await
botonRecargarPromesa.addEventListener("click", () => {
    cargarProductosSimuladorAsync(false);
});

// Simulación de fallo en la promesa para comprobar el bloque catch y el bloque finally
botonSimularError.addEventListener("click", () => {
    cargarProductosSimuladorAsync(true);
});

// Confirmar compra consumiendo Promesa con async/await dentro de try/catch/finally
botonConfirmarCompra.addEventListener("click", () => {
    confirmarCompraCarritoAsync();
});

// Eventos del aviso emergente por setTimeout()
botonAplicarCuponAviso.addEventListener("click", () => {
    cuponTech10Activo = true;
    localStorage.setItem(CLAVE_STORAGE_CUPON, "true");
    botonAplicarCuponAviso.textContent = "Cupón TECH10 Activo ✔️";
    botonAplicarCuponAviso.disabled = true;
    textoAvisoTemporizadorDom.textContent =
        "¡Cupón TECH10 activado! Se aplicó un 10% de descuento sobre el total de tu carrito.";

    actualizarMetricasSincronizadas();
    mostrarFeedbackVisual(
        "🔔 Cupón TECH10 (-10%) activado exitosamente desde el aviso del temporizador.",
        "exito"
    );
});

botonCerrarAviso.addEventListener("click", () => {
    avisoTemporizadorDom.classList.add("oculto");
});

contenedorItemsDom.addEventListener("click", (evento) => {
    const botonAccion = evento.target.closest("button[data-accion]");
    const idProducto = Number(botonAccion?.dataset?.id ?? 0);
    const accion = botonAccion?.dataset?.accion ?? "";

    if (idProducto > 0 && accion !== "") {
        gestionarAccionTarjetaCatalogo(idProducto, accion);
    }
});

contenedorCarritoDom.addEventListener("click", (evento) => {
    const botonQuitar = evento.target.closest("button[data-accion-carrito='quitar']");
    const idProducto = Number(botonQuitar?.dataset?.id ?? 0);

    if (idProducto > 0) {
        quitarItemDelCarritoStorage(idProducto);
    }
});

inputBusquedaTeclado.addEventListener("keyup", (evento) => {
    if (evento.key === "Escape") {
        inputBusquedaTeclado.value = "";
        terminoBusquedaActual = "";
        renderizarInterfazCompleta();
        mostrarFeedbackVisual("Filtro limpiado con la tecla Escape.", "exito");
        return;
    }

    terminoBusquedaActual = evento.target.value ?? "";
    renderizarInterfazCompleta();
});

botonVaciarCarrito.addEventListener("click", () => {
    if (carritoCotizacion.length === 0) {
        mostrarFeedbackVisual("⚠️ El carrito ya está vacío.", "alerta");
        return;
    }

    carritoCotizacion.forEach(({ id, cantidad }) => {
        const producto = catalogoProductosHardware.find((item) => item.id === id);
        producto?.devolverAlStock(cantidad);
    });

    carritoCotizacion = [];
    localStorage.removeItem(CLAVE_STORAGE_CARRITO);
    guardarCatalogoEnStorage(catalogoProductosHardware);
    renderizarInterfazCompleta();

    mostrarFeedbackVisual("Carrito vaciado y unidades devueltas al inventario.", "alerta");
});

botonRestaurarStorage.addEventListener("click", () => {
    localStorage.removeItem(CLAVE_STORAGE_CATALOGO);
    localStorage.removeItem(CLAVE_STORAGE_CARRITO);
    localStorage.removeItem(CLAVE_STORAGE_CUPON);

    cuponTech10Activo = false;
    carritoCotizacion = [];
    terminoBusquedaActual = "";
    inputBusquedaTeclado.value = "";
    contenedorOrdenConfirmadaDom.classList.add("oculto");

    botonAplicarCuponAviso.textContent = "Activar Cupón TECH10 (-10%)";
    botonAplicarCuponAviso.disabled = false;

    cargarProductosSimuladorAsync(false);
});

// ============================================================================
// 10. INICIALIZACIÓN ASÍNCRONA AL ENTRAR AL SIMULADOR
// ============================================================================

iniciarTemporizadorBienvenida();
cargarProductosSimuladorAsync(false);
