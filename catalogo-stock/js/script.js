// ---------------------------------------------------------------
// Configuración rápida: cambiá esto y el sitio se ajusta solo.
// ---------------------------------------------------------------
const BRAND_NAME = "MÁRQUEZ PLACE";
const DATA_URL = "data/productos.json";
const CURRENCY = "ARS";

// Paleta rotativa para el placeholder de imagen cuando el producto
// todavía no tiene foto cargada.
const PLACEHOLDER_COLORS = ["#FF4D00", "#2E6F4E", "#3A5AA8", "#B3492D", "#8A5CC7", "#C77A2E"];

// Categorías que admiten filtro por talle
const TALLE_CATEGORIES = ["Ropa", "Calzado"];

let allProducts = [];
let activeCategory = "Todos";
let activeTalle = "";
let searchTerm = "";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  $("brand-name").textContent = BRAND_NAME;
  $("today").textContent = new Date()
    .toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" })
    .toUpperCase();
  init();
});

async function init() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error("No se pudo cargar el catálogo");
    allProducts = await res.json();
  } catch (err) {
    $("product-grid").innerHTML =
      `<p class="empty-state">No pudimos cargar el catálogo. Revisá que data/productos.json exista.</p>`;
    console.error(err);
    return;
  }

  $("total-items").textContent = allProducts.length;
  renderChips();
  renderTalleChips();
  renderGrid();

  const searchInput = $("search-input");
  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    renderGrid();
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      searchTerm = "";
      renderGrid();
    }
  });
}

function renderChips() {
  const counts = allProducts.reduce((acc, p) => {
    acc[p.categoria] = (acc[p.categoria] || 0) + 1;
    return acc;
  }, {});

  const categories = ["Todos", ...new Set(allProducts.map((p) => p.categoria))];
  const chipRow = $("category-chips");
  chipRow.innerHTML = "";

  categories.forEach((cat) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (cat === activeCategory ? " active" : "");
    chip.setAttribute("role", "tab");
    chip.setAttribute("aria-selected", cat === activeCategory);
    const count = cat === "Todos" ? allProducts.length : counts[cat];
    chip.innerHTML = `${escapeHtml(cat)} <span class="chip-count">${count}</span>`;
    chip.addEventListener("click", () => {
      activeCategory = cat;
      activeTalle = "";
      renderChips();
      renderTalleChips();
      renderGrid();
    });
    chipRow.appendChild(chip);
  });
}

function renderTalleChips() {
  const talleRow = $("talle-chips");

  if (!TALLE_CATEGORIES.includes(activeCategory)) {
    talleRow.hidden = true;
    talleRow.innerHTML = "";
    return;
  }

  const categoryProducts = allProducts.filter((p) => p.categoria === activeCategory);
  const talleCounts = categoryProducts.reduce((acc, p) => {
    if (p.talle) acc[p.talle] = (acc[p.talle] || 0) + 1;
    return acc;
  }, {});

  const talles = Object.keys(talleCounts);
  if (talles.length === 0) {
    talleRow.hidden = true;
    return;
  }

  talleRow.hidden = false;
  talleRow.innerHTML = "";

  const label = document.createElement("span");
  label.className = "chip-label";
  label.textContent = "TALLE ▸";
  talleRow.appendChild(label);

  const allChip = document.createElement("button");
  allChip.className = "chip" + (activeTalle === "" ? " active" : "");
  allChip.setAttribute("role", "tab");
  allChip.setAttribute("aria-selected", activeTalle === "");
  allChip.innerHTML = `Todos <span class="chip-count">${categoryProducts.length}</span>`;
  allChip.addEventListener("click", () => {
    activeTalle = "";
    renderTalleChips();
    renderGrid();
  });
  talleRow.appendChild(allChip);

  talles.forEach((talle) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (talle === activeTalle ? " active" : "");
    chip.setAttribute("role", "tab");
    chip.setAttribute("aria-selected", talle === activeTalle);
    chip.innerHTML = `${escapeHtml(talle)} <span class="chip-count">${talleCounts[talle]}</span>`;
    chip.addEventListener("click", () => {
      activeTalle = talle;
      renderTalleChips();
      renderGrid();
    });
    talleRow.appendChild(chip);
  });
}

function renderGrid() {
  const grid = $("product-grid");
  const emptyState = $("empty-state");
  const resultCount = $("result-count");

  grid.classList.remove("ready");

  const filtered = allProducts.filter((p) => {
    const matchesCategory = activeCategory === "Todos" || p.categoria === activeCategory;
    const matchesSearch = !searchTerm || p.nombre.toLowerCase().includes(searchTerm);
    const matchesTalle = !activeTalle || p.talle === activeTalle;
    return matchesCategory && matchesSearch && matchesTalle;
  });

  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "PRODUCTO" : "PRODUCTOS"}`;

  grid.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  filtered.forEach((product, i) => {
    grid.appendChild(buildCard(product, i));
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => grid.classList.add("ready"));
  });
}

function buildCard(product, index) {
  const card = document.createElement("article");
  card.className = "card";
  card.style.setProperty("--i", index);
  card.classList.toggle("is-out", !product.stock);

  const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  const initial = product.nombre.trim().charAt(0).toUpperCase();
  const letterMarkup = `<span class="card-plate-letter">${initial}</span>`;

  const imageMarkup = product.imagen
    ? `<img src="${product.imagen}" alt="${escapeHtml(product.nombre)}" loading="lazy"
         onerror='this.parentElement.innerHTML="${letterMarkup}"; this.parentElement.style.background="${color}";'>`
    : letterMarkup;

  const priceFormatted = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(product.precio);

  const talleMarkup = product.talle
    ? `<span class="card-talle">${escapeHtml(product.talle)}</span>`
    : "";

  card.innerHTML = `
    <div class="card-top">
      <span class="card-sku">${escapeHtml(product.sku || "—")}</span>
      <span class="card-hole" aria-hidden="true"></span>
      <span class="card-no">№${String(index + 1).padStart(2, "0")}</span>
    </div>
    <div class="card-image" style="background:${product.imagen ? "transparent" : color}">
      ${imageMarkup}
    </div>
    <div class="card-body">
      <h3 class="card-name">${escapeHtml(product.nombre)}</h3>
      <div class="card-meta">
        <span class="card-category">${escapeHtml(product.categoria)}</span>
        ${talleMarkup}
      </div>
      <div class="card-bottom">
        <span class="card-price">${priceFormatted}</span>
        <span class="stock-badge ${product.stock ? "in-stock" : "out-stock"}">
          ${product.stock ? "En stock" : "Agotado"}
        </span>
      </div>
    </div>
    <div class="card-barcode" aria-hidden="true"></div>
  `;

  return card;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
