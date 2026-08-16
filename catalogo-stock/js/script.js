(function () {
  "use strict";

  const URL_DATOS = "data/productos.json";

  const estado = {
    productos: [],
    categoria: "Todas",
    stockFiltro: "todos",
    busqueda: ""
  };

  const $ = (id) => document.getElementById(id);

  const grilla = $("grilla");
  const contador = $("contador");
  const vacio = $("vacio");
  const buscador = $("buscador");
  const filtrosEstado = $("filtrosEstado");
  const filtrosCategoria = $("filtrosCategoria");

  const formatPrecio = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  });

  /* ---------- utilidades de stock ---------- */

  function estadoStock(producto) {
    if (producto.stock <= 0) return "cero";
    if (producto.stock <= (producto.minStock || 0)) return "bajo";
    return "ok";
  }

  /* ---------- resumen ---------- */

  function actualizarResumen(productos) {
    $("resumenTotal").textContent = productos.length;

    const agotados = productos.filter((p) => p.stock <= 0).length;
    const bajo = productos.filter((p) => {
      const e = estadoStock(p);
      return e === "bajo";
    }).length;
    const valor = productos.reduce((acc, p) => acc + p.stock * p.precio, 0);

    $("resumenAgotados").textContent = agotados;
    $("resumenBajo").textContent = bajo;
    $("resumenValor").textContent = formatPrecio.format(valor);
  }

  /* ---------- filtros ---------- */

  function construirFiltrosCategoria(productos) {
    const categorias = ["Todas", ...new Set(productos.map((p) => p.categoria))];

    filtrosCategoria.innerHTML = "";
    categorias.forEach((cat) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "btn-filtro" + (cat === "Todas" ? " btn-filtro--activo" : "");
      boton.textContent = cat;
      boton.dataset.categoria = cat;
      boton.addEventListener("click", () => {
        estado.categoria = cat;
        filtrosCategoria.querySelectorAll(".btn-filtro").forEach((b) =>
          b.classList.toggle("btn-filtro--activo", b === boton)
        );
        render();
      });
      filtrosCategoria.appendChild(boton);
    });
  }

  const opcionesEstado = [
    { valor: "todos", etiqueta: "Todos" },
    { valor: "ok", etiqueta: "En stock" },
    { valor: "bajo", etiqueta: "Stock bajo" },
    { valor: "cero", etiqueta: "Agotados" }
  ];

  function construirFiltrosEstado() {
    filtrosEstado.innerHTML = "";
    opcionesEstado.forEach((op) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "btn-filtro" + (op.valor === "todos" ? " btn-filtro--activo" : "");
      boton.textContent = op.etiqueta;
      boton.dataset.estado = op.valor;
      boton.addEventListener("click", () => {
        estado.stockFiltro = op.valor;
        filtrosEstado.querySelectorAll(".btn-filtro").forEach((b) =>
          b.classList.toggle("btn-filtro--activo", b === boton)
        );
        render();
      });
      filtrosEstado.appendChild(boton);
    });
  }

  function aplicarFiltros() {
    const texto = estado.busqueda.trim().toLowerCase();

    return estado.productos.filter((p) => {
      const coincideCategoria =
        estado.categoria === "Todas" || p.categoria === estado.categoria;
      const coincideStock =
        estado.stockFiltro === "todos" || estadoStock(p) === estado.stockFiltro;
      const coincideTexto =
        !texto ||
        p.nombre.toLowerCase().includes(texto) ||
        p.categoria.toLowerCase().includes(texto) ||
        (p.id || "").toLowerCase().includes(texto);
      return coincideCategoria && coincideStock && coincideTexto;
    });
  }

  /* ---------- render ---------- */

  function crearBarras() {
    const div = document.createElement("div");
    div.className = "card__barras";
    div.setAttribute("aria-hidden", "true");
    return div;
  }

  function crearImagen(producto) {
    const img = document.createElement("img");
    img.className = "card__imagen";
    if (producto.imagen) {
      img.src = producto.imagen;
      img.alt = producto.nombre;
    } else {
      img.className += " card__imagen--vacia";
      img.src = "";
      img.alt = "";
      const texto = document.createElement("span");
      texto.textContent = "sin foto";
      img.appendChild(texto);
    }
    return img;
  }

  function crearCard(producto) {
    const card = document.createElement("article");
    card.className = "card";

    const interior = document.createElement("div");
    interior.className = "card__interior";

    const codigo = document.createElement("p");
    codigo.className = "card__codigo";
    codigo.textContent = producto.id || "SIN CODIGO";

    const nombre = document.createElement("h2");
    nombre.className = "card__nombre";
    nombre.textContent = producto.nombre;

    if (producto.descripcion) {
      const desc = document.createElement("p");
      desc.className = "card__descripcion";
      desc.textContent = producto.descripcion;
      interior.appendChild(desc);
    }

    const meta = document.createElement("div");
    meta.className = "card__meta";

    const precio = document.createElement("span");
    precio.className = "card__precio";
    precio.textContent = formatPrecio.format(producto.precio);

    const categoria = document.createElement("span");
    categoria.className = "card__categoria";
    categoria.textContent = producto.categoria;

    meta.appendChild(precio);
    meta.appendChild(categoria);

    const stock = document.createElement("span");
    const e = estadoStock(producto);
    stock.className = "card__stock card__stock--" + e;
    stock.textContent =
      e === "cero"
        ? "SIN STOCK"
        : e === "bajo"
          ? "STOCK BAJO: " + producto.stock
          : "EN STOCK: " + producto.stock;

    interior.prepend(nombre);
    interior.prepend(codigo);
    if (producto.imagen) {
      interior.prepend(crearImagen(producto));
    }
    interior.appendChild(meta);
    interior.appendChild(stock);
    interior.appendChild(crearBarras());

    card.appendChild(interior);

    if (e === "cero") {
      const sello = document.createElement("span");
      sello.className = "card__sello card__sello--agotado";
      sello.textContent = "Agotado";
      card.appendChild(sello);
    } else if (e === "bajo") {
      const sello = document.createElement("span");
      sello.className = "card__sello card__sello--bajo";
      sello.textContent = "Reponer";
      card.appendChild(sello);
    }

    return card;
  }

  function render() {
    const visibles = aplicarFiltros();

    grilla.innerHTML = "";
    visibles.forEach((p) => grilla.appendChild(crearCard(p)));

    vacio.hidden = visibles.length !== 0;

    const total = estado.productos.length;
    contador.innerHTML =
      total === visibles.length
        ? "Mostrando <strong>" + total + "</strong> productos"
        : "Mostrando <strong>" + visibles.length + "</strong> de <strong>" + total + "</strong> productos";

    actualizarResumen(estado.productos);
  }

  /* ---------- arranque ---------- */

  async function iniciar() {
    $("fecha").textContent = new Date().toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    try {
      const res = await fetch(URL_DATOS);
      if (!res.ok) throw new Error("HTTP " + res.status);
      estado.productos = await res.json();
    } catch (err) {
      console.error("No se pudo cargar " + URL_DATOS, err);
      grilla.innerHTML =
        '<div class="vacio">No se pudo cargar <code>data/productos.json</code>. ' +
        "Recorda servir el sitio con un servidor local (ej: <code>python3 -m http.server</code>).</div>";
      vacio.hidden = true;
      return;
    }

    construirFiltrosCategoria(estado.productos);
    construirFiltrosEstado();
    render();
  }

  buscador.addEventListener("input", (e) => {
    estado.busqueda = e.target.value;
    render();
  });

  iniciar();
})();
