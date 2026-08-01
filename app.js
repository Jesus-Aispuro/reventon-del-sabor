let productos = [];
let ventas = [];
let compras = [];
let ajustes = [];
let insumos = [];
let carrito = {}; // {productoId: cantidad}
let editingProdId = null;

const fmt = n => '$' + (Math.round(n*100)/100).toLocaleString('es-MX');
// Fecha local del negocio (no UTC). Si se usa UTC, todo lo vendido después de las
// 5 PM en Tijuana se contaría como del día siguiente.
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dia = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dia}`;
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1600);
}

const firebaseConfig = {
  apiKey: "AIzaSyASzoQRL0VE6my5qPafDakJG5iQChSKNrQ",
  authDomain: "reventon-del-sabor.firebaseapp.com",
  projectId: "reventon-del-sabor",
  storageBucket: "reventon-del-sabor.firebasestorage.app",
  messagingSenderId: "791483494902",
  appId: "1:791483494902:web:95dec978f05d889ba297d7"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const docRef = db.collection('puesto').doc('data');

// ============ CATÁLOGO DE INSUMOS ============
// El "stock" es lo que había cuando se cargó la lista. Se actualiza solo con
// las compras, las ventas (por receta) y los ajustes/merma.
const INSUMOS_INICIAL = [
  // --- Frutas y verduras ---
  {id:'ins_elote',      nombre:'Elote',   categoria:'Frutas y verduras', unidad:'pieza', stock:0},
  {id:'ins_limon',      nombre:'Limón',   categoria:'Frutas y verduras', unidad:'pieza', stock:0},
  {id:'ins_pepino',     nombre:'Pepino',  categoria:'Frutas y verduras', unidad:'pieza', stock:0},
  {id:'ins_jicama',     nombre:'Jícama',  categoria:'Frutas y verduras', unidad:'pieza', stock:0},

  // --- Salsas y condimentos ---
  {id:'ins_crema',        nombre:'Crema entera',        categoria:'Salsas y condimentos', unidad:'ml', stock:200},
  {id:'ins_mayonesa',     nombre:'Mayonesa',            categoria:'Salsas y condimentos', unidad:'g',  stock:3000},
  {id:'ins_mantequilla',  nombre:'Mantequilla',         categoria:'Salsas y condimentos', unidad:'g',  stock:500},
  {id:'ins_queso_nachos', nombre:'Queso para nachos',   categoria:'Salsas y condimentos', unidad:'g',  stock:1500},
  {id:'ins_queso_seco',   nombre:'Queso seco',          categoria:'Salsas y condimentos', unidad:'g',  stock:200},
  {id:'ins_chiles',       nombre:'Chiles para nachos',  categoria:'Salsas y condimentos', unidad:'g',  stock:100},
  {id:'ins_chamoy',       nombre:'Chamoy',              categoria:'Salsas y condimentos', unidad:'g',  stock:2500},
  {id:'ins_amor',         nombre:'Salsa del amor',      categoria:'Salsas y condimentos', unidad:'ml', stock:2000},
  {id:'ins_valentina',    nombre:'Salsa Valentina',     categoria:'Salsas y condimentos', unidad:'ml', stock:700},
  {id:'ins_tajin',        nombre:'Tajín',               categoria:'Salsas y condimentos', unidad:'g',  stock:400},
  {id:'ins_inglesa',      nombre:'Salsa inglesa',       categoria:'Salsas y condimentos', unidad:'g',  stock:45},
  {id:'ins_pekin',        nombre:'Salsa Pekín',         categoria:'Salsas y condimentos', unidad:'ml', stock:355},
  {id:'ins_maggi',        nombre:'Salsa Maggi',         categoria:'Salsas y condimentos', unidad:'ml', stock:150},
  {id:'ins_macha',        nombre:'Salsa macha',         categoria:'Salsas y condimentos', unidad:'ml', stock:0},
  {id:'ins_clamato',      nombre:'Clamato',             categoria:'Salsas y condimentos', unidad:'ml', stock:1000},
  {id:'ins_sal',          nombre:'Sal',                 categoria:'Salsas y condimentos', unidad:'g',  stock:850},

  // --- Abarrotes y empaquetados ---
  {id:'ins_doritos_hot',    nombre:'Doritos Flamin Hot', categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:4},
  {id:'ins_cheetos_hot',    nombre:'Cheetos Flamin Hot', categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:3},
  {id:'ins_doritos_rojos',  nombre:'Doritos rojos',      categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:4},
  {id:'ins_takis',          nombre:'Takis Fuego',        categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:1},
  {id:'ins_tostitos',       nombre:'Tostitos verdes',    categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:9},
  {id:'ins_totopos',        nombre:'Nachos totopos',     categoria:'Abarrotes y empaquetados', unidad:'g',     stock:350},
  {id:'ins_churros',        nombre:'Churros',            categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:4},
  {id:'ins_cueritos',       nombre:'Cueritos',           categoria:'Abarrotes y empaquetados', unidad:'g',     stock:100},
  {id:'ins_cacahuate',      nombre:'Cacahuate',          categoria:'Abarrotes y empaquetados', unidad:'g',     stock:1000},
  {id:'ins_serpentinas',    nombre:'Serpentinas',        categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:20},
  {id:'ins_chimichangas',   nombre:'Chimichangas',       categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:20},
  {id:'ins_skwinkles',      nombre:'Skwinkles',          categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:5},
  {id:'ins_chacachacas',    nombre:'Chacachacas',        categoria:'Abarrotes y empaquetados', unidad:'g',     stock:700},
  {id:'ins_pulparindo',     nombre:'Pulparindo',         categoria:'Abarrotes y empaquetados', unidad:'g',     stock:200},
  {id:'ins_tarugos',        nombre:'Tarugos',            categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:25},
  {id:'ins_maruchan',       nombre:'Maruchan camarón',   categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:8},

  // --- Desechables y bebidas ---
  {id:'ins_coca600',        nombre:'Coca-Cola 600ml',            categoria:'Desechables y bebidas', unidad:'pieza', stock:17},
  {id:'ins_coca600_sa',     nombre:'Coca-Cola 600ml sin azúcar', categoria:'Desechables y bebidas', unidad:'pieza', stock:9},
  {id:'ins_caprisun',       nombre:'Capri-Sun',                  categoria:'Desechables y bebidas', unidad:'pieza', stock:1},
  {id:'ins_arizona',        nombre:'Arizona',                    categoria:'Desechables y bebidas', unidad:'pieza', stock:7},
  {id:'ins_charola_nachos', nombre:'Charola para nachos',        categoria:'Desechables y bebidas', unidad:'pieza', stock:98},
  {id:'ins_charola_grande', nombre:'Charola grande',             categoria:'Desechables y bebidas', unidad:'pieza', stock:25},
  {id:'ins_charola_plana',  nombre:'Charola plana',              categoria:'Desechables y bebidas', unidad:'pieza', stock:24},
  {id:'ins_charola_elote',  nombre:'Charola para elote',         categoria:'Desechables y bebidas', unidad:'pieza', stock:2},
  {id:'ins_aluminio',       nombre:'Papel aluminio',             categoria:'Desechables y bebidas', unidad:'pieza', stock:13},
  {id:'ins_vaso10',         nombre:'Vaso 10 oz',                 categoria:'Desechables y bebidas', unidad:'pieza', stock:1},
  {id:'ins_vaso14',         nombre:'Vaso 14 oz',                 categoria:'Desechables y bebidas', unidad:'pieza', stock:14},
  {id:'ins_vaso16',         nombre:'Vaso 16 oz',                 categoria:'Desechables y bebidas', unidad:'pieza', stock:28},
  {id:'ins_vaso32',         nombre:'Vaso 32 oz',                 categoria:'Desechables y bebidas', unidad:'pieza', stock:17},
  {id:'ins_palos',          nombre:'Palos',                      categoria:'Desechables y bebidas', unidad:'pieza', stock:6},
  {id:'ins_cucharas',       nombre:'Cucharas',                   categoria:'Desechables y bebidas', unidad:'pieza', stock:60},
  {id:'ins_tenedores',      nombre:'Tenedores',                  categoria:'Desechables y bebidas', unidad:'pieza', stock:20},
  {id:'ins_bolsas',         nombre:'Bolsas',                     categoria:'Desechables y bebidas', unidad:'pieza', stock:0}
];

// ============ RECETAS ============
// El elote se descuenta por PIEZA (fracciones), no por gramos, porque las dueñas
// sirven al tanteo. Equivalencias medidas por ellas:
//   vaso 10 oz = 1.75 elotes | vaso 12 oz = 2 elotes | vaso 14 oz = 2.25 elotes
const R = (insumoId, cantidad) => ({insumoId, cantidad});

// Preparado base de un vaso de elote (lo que le ponen encima), por tamaño
const BASE_10 = [R('ins_mayonesa',15), R('ins_crema',10), R('ins_queso_seco',15), R('ins_mantequilla',8),
                 R('ins_tajin',2), R('ins_limon',0.5), R('ins_sal',1), R('ins_amor',5), R('ins_valentina',5)];
const BASE_12 = [R('ins_mayonesa',18), R('ins_crema',12), R('ins_queso_seco',18), R('ins_mantequilla',9),
                 R('ins_tajin',2.5), R('ins_limon',0.5), R('ins_sal',1.2), R('ins_amor',6), R('ins_valentina',6)];
const BASE_14 = [R('ins_mayonesa',20), R('ins_crema',14), R('ins_queso_seco',20), R('ins_mantequilla',10),
                 R('ins_tajin',3), R('ins_limon',0.5), R('ins_sal',1.5), R('ins_amor',7), R('ins_valentina',7)];
// Las 4 salsas extra que llevan las "cochinadas"
const SALSAS_EXTRA = [R('ins_maggi',3), R('ins_inglesa',3), R('ins_pekin',3), R('ins_macha',5)];
// Mezcla base de los "locos" (tostilocos, cueritos locos, churros locos)
const BASE_LOCOS = [R('ins_pepino',0.25), R('ins_jicama',0.25), R('ins_cacahuate',15), R('ins_chacachacas',20),
                    R('ins_clamato',30), R('ins_chamoy',20), R('ins_valentina',10), R('ins_amor',10),
                    R('ins_maggi',3), R('ins_inglesa',3), R('ins_pekin',3), R('ins_tajin',3),
                    R('ins_limon',0.5), R('ins_sal',1)];

const MENU_INICIAL = [
  // ---- ELOTES ----
  {id:'prod_elote_entero', nombre:'Elote entero', categoria:'Elotes', precio:45, costo:0, receta:[
    R('ins_elote',1), R('ins_palos',1), R('ins_aluminio',1), R('ins_charola_elote',1), ...BASE_10
  ]},
  {id:'prod_vaso_chico', nombre:'Vaso chico (10 oz)', categoria:'Elotes', precio:45, costo:0, receta:[
    R('ins_elote',1.75), R('ins_vaso10',1), R('ins_cucharas',1), ...BASE_10
  ]},
  {id:'prod_vaso_grande', nombre:'Vaso grande (14 oz)', categoria:'Elotes', precio:65, costo:0, receta:[
    R('ins_elote',2.25), R('ins_vaso14',1), R('ins_cucharas',1), ...BASE_14
  ]},
  {id:'prod_tostielote', nombre:'Tostielote', categoria:'Elotes', precio:80, costo:0, receta:[
    R('ins_elote',2), R('ins_tostitos',0.5), R('ins_vaso14',1), R('ins_cucharas',1), ...BASE_12
  ]},

  // ---- BOTANAS ----
  {id:'prod_tostilocos', nombre:'Tostilocos', categoria:'Botanas', precio:80, costo:0, receta:[
    R('ins_tostitos',1), R('ins_cueritos',20), R('ins_skwinkles',1), R('ins_tenedores',1), ...BASE_LOCOS
  ]},
  {id:'prod_cueritoslocos', nombre:'Cueritos locos (16 oz)', categoria:'Botanas', precio:60, costo:0, receta:[
    R('ins_vaso16',1), R('ins_cueritos',40), R('ins_serpentinas',1), R('ins_pulparindo',10),
    R('ins_tenedores',1), ...BASE_LOCOS
  ]},
  {id:'prod_churrolocos', nombre:'Churros locos (16 oz)', categoria:'Botanas', precio:100, costo:0, receta:[
    R('ins_vaso16',1), R('ins_churros',0.5), R('ins_cueritos',40), R('ins_serpentinas',1),
    R('ins_pulparindo',10), R('ins_tenedores',1), ...BASE_LOCOS
  ]},
  {id:'prod_churrolocos32', nombre:'Churros locos (32 oz)', categoria:'Botanas', precio:0, costo:0, receta:[
    R('ins_vaso32',1), R('ins_churros',1), R('ins_tarugos',1), R('ins_cueritos',60), R('ins_serpentinas',1),
    R('ins_pulparindo',15), R('ins_tenedores',1),
    R('ins_pepino',0.4), R('ins_jicama',0.4), R('ins_cacahuate',25), R('ins_chacachacas',30),
    R('ins_clamato',50), R('ins_chamoy',35), R('ins_valentina',15), R('ins_amor',15),
    R('ins_maggi',5), R('ins_inglesa',5), R('ins_pekin',5), R('ins_tajin',5),
    R('ins_limon',1), R('ins_sal',1.5)
  ]},
  {id:'prod_maruchan', nombre:'Maruchan loca', categoria:'Botanas', precio:130, costo:0, receta:[
    R('ins_maruchan',1), R('ins_elote',2.25), R('ins_tostitos',0.25), R('ins_charola_grande',1),
    R('ins_tenedores',1), ...BASE_14
  ]},
  {id:'prod_nachos_chico', nombre:'Nachos chico', categoria:'Botanas', precio:60, costo:0, receta:[
    R('ins_totopos',50), R('ins_queso_nachos',50), R('ins_chiles',10),
    R('ins_charola_nachos',1), R('ins_tenedores',1)
  ]},
  {id:'prod_nachos_grande', nombre:'Nachos grande', categoria:'Botanas', precio:80, costo:0, receta:[
    R('ins_totopos',90), R('ins_queso_nachos',80), R('ins_chiles',15),
    R('ins_charola_grande',1), R('ins_tenedores',1)
  ]},
  {id:'prod_nachos_elote', nombre:'Nachos con elote', categoria:'Botanas', precio:0, costo:0, receta:[
    R('ins_totopos',60), R('ins_queso_nachos',60), R('ins_chiles',10), R('ins_elote',1.75),
    R('ins_charola_nachos',1), R('ins_tenedores',1), ...BASE_10
  ]},
  {id:'prod_sabritas_queso', nombre:'Sabritas con queso', categoria:'Botanas', precio:40, costo:0, receta:[
    R('ins_cheetos_hot',1), R('ins_queso_nachos',40), R('ins_chiles',10), R('ins_tenedores',1)
  ]},
  {id:'prod_cochinada', nombre:'Cochinada', categoria:'Botanas', precio:0, costo:0, receta:[
    R('ins_elote',1), R('ins_bolsas',1), ...BASE_10, ...SALSAS_EXTRA
  ]},
  {id:'prod_machicochinada', nombre:'Machicochinada', categoria:'Botanas', precio:0, costo:0, receta:[
    R('ins_elote',2.75), R('ins_bolsas',1), R('ins_doritos_hot',1), R('ins_tenedores',1),
    ...BASE_10, ...SALSAS_EXTRA
  ]},

  // ---- BEBIDAS ----
  {id:'prod_coca600', nombre:'Coca-Cola 600ml', categoria:'Bebidas', precio:25, costo:0, receta:[R('ins_coca600',1)]},
  {id:'prod_coca600_sa', nombre:'Coca-Cola 600ml sin azúcar', categoria:'Bebidas', precio:25, costo:0, receta:[R('ins_coca600_sa',1)]},
  {id:'prod_arizona', nombre:'Arizona', categoria:'Bebidas', precio:0, costo:0, receta:[R('ins_arizona',1)]},
  {id:'prod_caprisun', nombre:'Capri-Sun', categoria:'Bebidas', precio:0, costo:0, receta:[R('ins_caprisun',1)]},

  // ---- EXTRAS ----
  {id:'prod_queso_extra', nombre:'Queso extra', categoria:'Extras', precio:10, costo:0, receta:[R('ins_queso_nachos',30)]}
];

// Al subir este número, la app vuelve a cargar el menú y los insumos de arriba.
// OJO: sobrescribe precios y recetas editados a mano en la app.
const DATOS_VERSION = '5';
let seeded = false;

function startListener(){
  docRef.onSnapshot(async (doc)=>{
    const d = doc.exists ? doc.data() : {};
    productos = d.productos || [];
    ventas = d.ventas || [];
    compras = d.compras || [];
    ajustes = d.ajustes || [];
    insumos = d.insumos || [];

    if(!seeded && d.datos_version !== DATOS_VERSION){
      seeded = true;
      productos = JSON.parse(JSON.stringify(MENU_INICIAL));
      // Los insumos que ya existan conservan su existencia actual; solo se agregan los nuevos
      const previos = {};
      insumos.forEach(i => previos[i.id] = i.stock);
      insumos = JSON.parse(JSON.stringify(INSUMOS_INICIAL)).map(i=>(
        previos[i.id] !== undefined ? {...i, stock: previos[i.id]} : i
      ));
      await docRef.set({productos, insumos, datos_version: DATOS_VERSION}, {merge:true});
      return; // esto vuelve a disparar el snapshot con los datos ya guardados
    }
    renderAll();
  }, (err)=>{
    console.error(err);
    showToast('No se pudo conectar a la base de datos');
  });
}

async function saveProductos(){ await docRef.set({productos}, {merge:true}); }
async function saveVentas(){ await docRef.set({ventas}, {merge:true}); }
async function saveCompras(){ await docRef.set({compras}, {merge:true}); }
async function saveInsumos(){ await docRef.set({insumos}, {merge:true}); }

let catState = {};

function renderAll(){
  renderProdGrid();
  renderCart();
  renderInventario();
  renderInsumos();
  renderCompras();
  renderResumen();
  renderCatList();
  renderInsumoSelect();
}

function renderCatList(){
  const cats = [...new Set(productos.map(p=>p.categoria || 'Otros'))];
  document.getElementById('catList').innerHTML = cats.map(c=>`<option value="${escapeHtml(c)}">`).join('');
}

// ---------- INSUMOS (categorías fijas para mantener orden) ----------
const INSUMO_CATEGORIAS = ['Frutas y verduras', 'Salsas y condimentos', 'Abarrotes y empaquetados', 'Desechables y bebidas'];
const INSUMO_CAT_STYLE = {
  'Frutas y verduras':          {bg:'var(--green)', fg:'#fff', emoji:'🥬'},
  'Salsas y condimentos':       {bg:'var(--chili)', fg:'#fff', emoji:'🌶️'},
  'Abarrotes y empaquetados':   {bg:'var(--corn)', fg:'var(--charcoal)', emoji:'📦'},
  'Desechables y bebidas':      {bg:'var(--blue)', fg:'#fff', emoji:'🥤'}
};
const UNIDAD_LABEL = {pieza:'piezas', g:'gramos', ml:'mililitros'};

// ---------- VENDER ----------
const CAT_STYLE = {
  'Elotes':  {bg:'var(--corn)', fg:'var(--charcoal)', emoji:'🌽'},
  'Botanas': {bg:'var(--chili)', fg:'#fff', emoji:`<svg viewBox="0 0 48 48" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 17 L16 40 Q16 42 18 42 H30 Q32 42 32 40 L35 17 Z" fill="#FFF6DC" stroke="#fff" stroke-width="2"/>
      <ellipse cx="24" cy="17" rx="11" ry="3" fill="#FFF6DC" stroke="#fff" stroke-width="2"/>
      <path d="M18 17 L14 5 L22 13 Z" fill="#F2B705" stroke="#fff" stroke-width="1.3"/>
      <path d="M27 17 L31 4 L34 14 Z" fill="#F2B705" stroke="#fff" stroke-width="1.3"/>
      <path d="M22 17 L24 7 L28 15 Z" fill="#F2B705" stroke="#fff" stroke-width="1.3"/>
      <path d="M17 22 Q24 27 31 22" stroke="#7A1F0E" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M18 29 Q24 33 30 29" stroke="#7A1F0E" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`},
  'Bebidas': {bg:'var(--blue)', fg:'#fff', emoji:'🥤'},
  'Extras':  {bg:'var(--green)', fg:'#fff', emoji:'➕'}
};
function catStyleFor(cat){
  return CAT_STYLE[cat] || {bg:'var(--muted)', fg:'#fff', emoji:'📦'};
}

function toggleCat(cat){
  const estabaAbierta = catState[cat] === true;
  catState = {}; // cierra todas las demás
  if(!estabaAbierta) catState[cat] = true; // abre la que tocaron, si no estaba ya abierta
  renderProdGrid();
}

function renderProdGrid(){
  const grid = document.getElementById('prodGrid');
  if(productos.length === 0){
    grid.innerHTML = '<div class="empty">Todavía no tienes productos. Agrégalos en la pestaña Inventario.</div>';
    return;
  }
  const grupos = {};
  productos.forEach(p=>{
    const cat = p.categoria || 'Otros';
    if(!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(p);
  });
  const orden = ['Elotes','Botanas','Bebidas','Extras'].filter(c=>grupos[c]);
  Object.keys(grupos).forEach(c=>{ if(!orden.includes(c)) orden.push(c); });

  grid.innerHTML = orden.map(cat=>{
    const abierto = catState[cat] === true;
    const st = catStyleFor(cat);
    const items = grupos[cat].map(p => `
      <button class="prod-btn" onclick="addToCart('${p.id}')">
        <div class="prod-name">${escapeHtml(p.nombre)}</div>
        <div class="prod-price">${fmt(p.precio)}</div>
        ${p.precio<=0?'<div class="prod-stock low">Falta poner precio</div>':''}
      </button>
    `).join('');
    return `
      <button class="cat-card" style="background:${st.bg}; color:${st.fg};" onclick="toggleCat('${escapeHtml(cat).replace(/'/g,"\\'")}')">
        <div class="cat-left">
          <span class="cat-emoji">${st.emoji}</span>
          <div>
            <div class="cat-name">${escapeHtml(cat)}</div>
            <div class="cat-count">${grupos[cat].length} producto${grupos[cat].length===1?'':'s'}</div>
          </div>
        </div>
        <span class="cat-chevron-big">${abierto ? '▾' : '▸'}</span>
      </button>
      <div class="cat-body" ${abierto ? '' : 'style="display:none;"'}>
        <div class="prod-grid">${items}</div>
      </div>
    `;
  }).join('');
}

function addToCart(id){
  const p = productos.find(x=>x.id===id);
  if(!p) return;
  carrito[id] = (carrito[id]||0) + 1;
  renderCart();
}

function changeCartQty(id, delta){
  let q = (carrito[id]||0) + delta;
  if(q <= 0){ delete carrito[id]; }
  else { carrito[id] = q; }
  renderCart();
}

let cartDetailOpen = false;
function toggleCartDetail(){
  cartDetailOpen = !cartDetailOpen;
  document.getElementById('cartDetail').style.display = cartDetailOpen ? 'block' : 'none';
  document.getElementById('cartChevron').textContent = cartDetailOpen ? '▾' : '▴';
}

function renderCart(){
  const ids = Object.keys(carrito);
  const bar = document.getElementById('cartBar');
  const detail = document.getElementById('cartDetail');
  const list = document.getElementById('cartList');

  if(ids.length === 0){
    bar.style.display='none';
    detail.style.display='none';
    cartDetailOpen = false;
    return;
  }
  bar.style.display='flex';

  let total = 0;
  let totalPiezas = 0;
  list.innerHTML = ids.map(id=>{
    const p = productos.find(x=>x.id===id);
    if(!p) return '';
    const sub = p.precio * carrito[id];
    total += sub;
    totalPiezas += carrito[id];
    return `<div class="cart-row">
      <div><div class="list-title">${escapeHtml(p.nombre)}</div><div class="list-sub">${fmt(p.precio)} c/u</div></div>
      <div class="qty-ctrl">
        <button onclick="changeCartQty('${id}',-1)">−</button>
        <span>${carrito[id]}</span>
        <button onclick="changeCartQty('${id}',1)">+</button>
      </div>
    </div>`;
  }).join('');

  document.getElementById('cartCountLbl').textContent = totalPiezas + (totalPiezas===1?' producto':' productos');
  document.getElementById('cartTotalBar').textContent = fmt(total);
  if(cartDetailOpen) detail.style.display='block';
}

// ---------- INSUMOS / RECETAS ----------
// Descuenta del inventario de insumos lo que marque la receta de cada producto vendido.
// Si un producto todavía no tiene receta definida (receta:[] vacío), simplemente no descuenta nada más.
function descontarInsumosPorVenta(items){
  items.forEach(item=>{
    const p = productos.find(x=>x.id===item.productoId);
    if(!p || !p.receta || p.receta.length===0) return;
    p.receta.forEach(r=>{
      const ins = insumos.find(x=>x.id===r.insumoId);
      if(!ins) return;
      ins.stock -= (r.cantidad * item.cantidad);
    });
  });
}

async function cobrarVenta(){
  const ids = Object.keys(carrito);
  if(ids.length === 0) return;
  let total = 0;
  const items = ids.map(id=>{
    const p = productos.find(x=>x.id===id);
    const sub = p.precio * carrito[id];
    total += sub;
    return {productoId:id, nombre:p.nombre, cantidad:carrito[id], precioUnit:p.precio};
  });
  ventas.push({id:uid(), fecha:todayStr(), ts:Date.now(), items, total});
  descontarInsumosPorVenta(items); // descuenta insumos según receta, si ya está definida
  carrito = {};
  catState = {}; // cierra todas las categorías otra vez
  await docRef.set({productos, ventas, insumos}, {merge:true}); // todo junto para que no se pisen los datos
  renderAll();
  showToast('Venta registrada: ' + fmt(total));
}

// ---------- INVENTARIO ----------
function renderInventario(){
  const list = document.getElementById('invList');
  if(productos.length === 0){
    list.innerHTML = '<div class="empty">Aún no tienes productos.</div>';
    return;
  }
  list.innerHTML = productos.map(p=>`
    <div class="list-row">
      <div class="list-main">
        <div class="list-title">${escapeHtml(p.nombre)}</div>
        <div class="list-sub">${escapeHtml(p.categoria || 'Otros')} · Venta ${fmt(p.precio)} · Costo ${fmt(p.costo)} · ${(p.receta&&p.receta.length)?p.receta.length+' insumo(s)':'sin receta'}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="openEditProd('${p.id}')">Editar</button>
    </div>
  `).join('');
  renderAjustes();
}

let recetaTemp = [];

function openNewProd(){
  editingProdId = null;
  document.getElementById('modalTitle').textContent = 'Nuevo producto';
  document.getElementById('pNombre').value='';
  document.getElementById('pCategoria').value='';
  document.getElementById('pPrecio').value='';
  document.getElementById('pCosto').value='';
  document.getElementById('delProdBtn').style.display='none';
  recetaTemp = [];
  renderRecetaEditor();
  document.getElementById('modalBg').classList.add('show');
}

function openEditProd(id){
  const p = productos.find(x=>x.id===id);
  if(!p) return;
  editingProdId = id;
  document.getElementById('modalTitle').textContent = 'Editar producto';
  document.getElementById('pNombre').value=p.nombre;
  document.getElementById('pCategoria').value=p.categoria || '';
  document.getElementById('pPrecio').value=p.precio;
  document.getElementById('pCosto').value=p.costo;
  document.getElementById('delProdBtn').style.display='inline-block';
  recetaTemp = JSON.parse(JSON.stringify(p.receta || []));
  renderRecetaEditor();
  document.getElementById('modalBg').classList.add('show');
}

function renderRecetaEditor(){
  const list = document.getElementById('recetaList');
  if(!list) return;
  if(recetaTemp.length === 0){
    list.innerHTML = '<div class="empty" style="padding:8px 0;">Sin ingredientes agregados todavía</div>';
    return;
  }
  list.innerHTML = recetaTemp.map((r,idx)=>{
    const ins = insumos.find(x=>x.id===r.insumoId);
    const nombre = ins ? ins.nombre : '(insumo eliminado)';
    const unidad = ins ? (UNIDAD_LABEL[ins.unidad]||ins.unidad) : '';
    return `<div class="cart-row">
      <div class="list-title">${escapeHtml(nombre)}</div>
      <div class="qty-ctrl">
        <span>${r.cantidad} ${unidad}</span>
        <button onclick="quitarIngrediente(${idx})">×</button>
      </div>
    </div>`;
  }).join('');
}

function agregarIngrediente(){
  const sel = document.getElementById('recetaInsumoSelect');
  const cant = parseFloat(document.getElementById('recetaCantidad').value);
  if(!sel.value){ showToast('Elige un insumo'); return; }
  if(!cant || cant<=0){ showToast('Pon una cantidad'); return; }
  const existente = recetaTemp.find(r=>r.insumoId===sel.value);
  if(existente){ existente.cantidad = cant; }
  else { recetaTemp.push({insumoId: sel.value, cantidad: cant}); }
  document.getElementById('recetaCantidad').value = '';
  renderRecetaEditor();
}

function quitarIngrediente(idx){
  recetaTemp.splice(idx,1);
  renderRecetaEditor();
}

async function saveProd(){
  const nombre = document.getElementById('pNombre').value.trim();
  const categoria = document.getElementById('pCategoria').value.trim() || 'Otros';
  const precio = parseFloat(document.getElementById('pPrecio').value)||0;
  const costo = parseFloat(document.getElementById('pCosto').value)||0;
  if(!nombre){ showToast('Ponle un nombre'); return; }
  if(editingProdId){
    const p = productos.find(x=>x.id===editingProdId);
    Object.assign(p, {nombre, categoria, precio, costo, receta: recetaTemp});
  }else{
    productos.push({id:uid(), nombre, categoria, precio, costo, receta: recetaTemp});
  }
  await saveProductos();
  document.getElementById('modalBg').classList.remove('show');
  renderAll();
  showToast('Guardado');
}

async function delProd(){
  if(!editingProdId) return;
  productos = productos.filter(x=>x.id!==editingProdId);
  await saveProductos();
  document.getElementById('modalBg').classList.remove('show');
  renderAll();
  showToast('Producto eliminado');
}

// ---------- AJUSTES / MERMA (solo sobre insumos) ----------
// Los productos del menú ya no tienen existencia propia: se preparan al momento,
// así que la merma real siempre ocurre sobre un insumo.
let ajustandoId = null;
let ajustandoTipoArticulo = 'insumo';

function openAjusteInsumo(id){
  const ins = insumos.find(x=>x.id===id);
  if(!ins) return;
  ajustandoId = id;
  ajustandoTipoArticulo = 'insumo';
  document.getElementById('ajusteProdNombre').textContent = ins.nombre + ' (' + (UNIDAD_LABEL[ins.unidad]||ins.unidad) + ')';
  document.getElementById('ajusteTipo').value = 'perdida';
  document.getElementById('ajusteCantidad').value = '';
  document.getElementById('ajusteMotivo').value = '';
  document.getElementById('ajusteModalBg').classList.add('show');
}

async function guardarAjuste(){
  const esInsumo = ajustandoTipoArticulo === 'insumo';
  const item = esInsumo ? insumos.find(x=>x.id===ajustandoId) : productos.find(x=>x.id===ajustandoId);
  if(!item) return;
  const tipo = document.getElementById('ajusteTipo').value; // 'perdida' o 'ganancia'
  const cantidad = parseFloat(document.getElementById('ajusteCantidad').value) || 0;
  const motivo = document.getElementById('ajusteMotivo').value.trim();
  if(cantidad <= 0){ showToast('Pon una cantidad mayor a 0'); return; }

  const delta = tipo === 'perdida' ? -cantidad : cantidad;
  item.stock += delta;

  ajustes.push({
    id: uid(), fecha: todayStr(), ts: Date.now(),
    tipoArticulo: ajustandoTipoArticulo,
    productoId: item.id, productoNombre: item.nombre,
    tipo, cantidad, motivo
  });

  if(esInsumo){
    await docRef.set({insumos, ajustes}, {merge:true});
  }else{
    await docRef.set({productos, ajustes}, {merge:true});
  }
  document.getElementById('ajusteModalBg').classList.remove('show');
  renderAll();
  showToast(tipo === 'perdida' ? 'Merma registrada' : 'Ajuste registrado');
}

function renderAjustes(){
  const list = document.getElementById('ajusteList');
  if(!list) return;
  if(ajustes.length === 0){ list.innerHTML = '<div class="empty">Sin ajustes registrados todavía.</div>'; return; }
  const sorted = [...ajustes].sort((a,b)=>b.ts-a.ts).slice(0,20);
  list.innerHTML = sorted.map(a=>`
    <div class="list-row">
      <div class="list-main">
        <div class="list-title">${escapeHtml(a.productoNombre)}${a.motivo ? ' · '+escapeHtml(a.motivo) : ''}</div>
        <div class="list-sub">${a.fecha} · ${a.tipo === 'perdida' ? 'Merma / pérdida' : 'Ajuste a favor'}</div>
      </div>
      <div class="pill" style="${a.tipo==='perdida'?'background:#FBEAE1;color:#D6482B;':'background:#EAF3E6;color:#4A6E40;'}">${a.tipo==='perdida'?'−':'+'}${a.cantidad}</div>
    </div>
  `).join('');
}

// ---------- INSUMOS (catálogo, agrupado por categoría fija) ----------
let editingInsumoId = null;
let insumoCatOpenState = {};

function renderInsumos(){
  const wrap = document.getElementById('insumoWrap');
  if(!wrap) return;
  if(insumos.length === 0){
    wrap.innerHTML = '<div class="empty">Aún no tienes insumos. Agrega el primero con "+ Agregar insumo".</div>';
    return;
  }
  const grupos = {};
  insumos.forEach(i=>{
    const cat = i.categoria || 'Otros';
    if(!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(i);
  });
  const orden = INSUMO_CATEGORIAS.filter(c=>grupos[c]);
  Object.keys(grupos).forEach(c=>{ if(!orden.includes(c)) orden.push(c); });

  wrap.innerHTML = orden.map(cat=>{
    const abierto = insumoCatOpenState[cat] === true;
    const st = INSUMO_CAT_STYLE[cat] || {bg:'var(--muted)', fg:'#fff', emoji:'📦'};
    const filas = grupos[cat].map(i=>`
      <div class="list-row">
        <div class="list-main">
          <div class="list-title">${escapeHtml(i.nombre)}</div>
          <div class="list-sub">${i.stock} ${UNIDAD_LABEL[i.unidad]||i.unidad}</div>
        </div>
        <div class="pill ${i.stock<=0?'low':''}" style="${i.stock<=0?'background:#FBEAE1;color:#D6482B;':''}">${i.stock<=0?'Agotado':'Disponible'}</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="openEditInsumo('${i.id}')">Editar</button>
          <button class="btn btn-ghost btn-sm" onclick="openAjusteInsumo('${i.id}')">Ajustar</button>
        </div>
      </div>
    `).join('');
    return `
      <button class="cat-card" style="background:${st.bg}; color:${st.fg};" onclick="toggleInsumoCat('${escapeHtml(cat).replace(/'/g,"\\'")}')">
        <div class="cat-left">
          <span class="cat-emoji">${st.emoji}</span>
          <div>
            <div class="cat-name">${escapeHtml(cat)}</div>
            <div class="cat-count">${grupos[cat].length} insumo${grupos[cat].length===1?'':'s'}</div>
          </div>
        </div>
        <span class="cat-chevron-big">${abierto ? '▾' : '▸'}</span>
      </button>
      <div class="cat-body" ${abierto ? '' : 'style="display:none;"'}>${filas}</div>
    `;
  }).join('');
}

function toggleInsumoCat(cat){
  const estabaAbierta = insumoCatOpenState[cat] === true;
  insumoCatOpenState = {};
  if(!estabaAbierta) insumoCatOpenState[cat] = true;
  renderInsumos();
}

function openNewInsumo(){
  editingInsumoId = null;
  document.getElementById('insumoModalTitle').textContent = 'Nuevo insumo';
  document.getElementById('iNombre').value = '';
  document.getElementById('iCategoria').value = INSUMO_CATEGORIAS[0];
  document.getElementById('iUnidad').value = 'pieza';
  document.getElementById('iStock').value = '';
  document.getElementById('delInsumoBtn').style.display = 'none';
  document.getElementById('insumoModalBg').classList.add('show');
}

function openEditInsumo(id){
  const i = insumos.find(x=>x.id===id);
  if(!i) return;
  editingInsumoId = id;
  document.getElementById('insumoModalTitle').textContent = 'Editar insumo';
  document.getElementById('iNombre').value = i.nombre;
  document.getElementById('iCategoria').value = i.categoria;
  document.getElementById('iUnidad').value = i.unidad;
  document.getElementById('iStock').value = i.stock;
  document.getElementById('delInsumoBtn').style.display = 'inline-block';
  document.getElementById('insumoModalBg').classList.add('show');
}

async function saveInsumo(){
  const nombre = document.getElementById('iNombre').value.trim();
  const categoria = document.getElementById('iCategoria').value;
  const unidad = document.getElementById('iUnidad').value;
  const stock = parseFloat(document.getElementById('iStock').value) || 0;
  if(!nombre){ showToast('Ponle un nombre'); return; }
  if(editingInsumoId){
    const i = insumos.find(x=>x.id===editingInsumoId);
    Object.assign(i, {nombre, categoria, unidad, stock});
  }else{
    insumos.push({id:uid(), nombre, categoria, unidad, stock});
  }
  await saveInsumos();
  document.getElementById('insumoModalBg').classList.remove('show');
  renderAll();
  showToast('Insumo guardado');
}

async function delInsumo(){
  if(!editingInsumoId) return;
  insumos = insumos.filter(x=>x.id!==editingInsumoId);
  await saveInsumos();
  document.getElementById('insumoModalBg').classList.remove('show');
  renderAll();
  showToast('Insumo eliminado');
}

function renderInsumoSelect(){
  const options = insumos.map(i=>`<option value="${i.id}">${escapeHtml(i.nombre)} (${UNIDAD_LABEL[i.unidad]||i.unidad})</option>`).join('');
  const sinInsumos = '<option value="">Agrega insumos en Inventario → Insumos</option>';

  const compraSel = document.getElementById('compraInsumoSelect');
  if(compraSel){
    compraSel.innerHTML = insumos.length ? options : sinInsumos;
    actualizarUnidadCompra();
  }
  const recetaSel = document.getElementById('recetaInsumoSelect');
  if(recetaSel){
    recetaSel.innerHTML = insumos.length ? options : sinInsumos;
  }
}

function actualizarUnidadCompra(){
  const sel = document.getElementById('compraInsumoSelect');
  const lbl = document.getElementById('compraUnidadLbl');
  if(!sel || !lbl) return;
  const ins = insumos.find(x=>x.id===sel.value);
  lbl.textContent = ins ? `Cantidad comprada (${UNIDAD_LABEL[ins.unidad]||ins.unidad})` : 'Cantidad comprada';
}

// Tabs Menú / Insumos dentro de Inventario
function switchInvTab(tab){
  const btnMenu = document.getElementById('invTabMenu');
  const btnIns = document.getElementById('invTabInsumos');
  if(tab === 'menu'){
    btnMenu.classList.add('btn-chili'); btnMenu.classList.remove('btn-ghost');
    btnIns.classList.add('btn-ghost'); btnIns.classList.remove('btn-chili');
  }else{
    btnIns.classList.add('btn-chili'); btnIns.classList.remove('btn-ghost');
    btnMenu.classList.add('btn-ghost'); btnMenu.classList.remove('btn-chili');
  }
  document.getElementById('invPanelMenu').style.display = tab==='menu' ? 'block' : 'none';
  document.getElementById('invPanelInsumos').style.display = tab==='insumos' ? 'block' : 'none';
}

// ---------- COMPRAS (ahora sobre insumos: aumenta su stock según su unidad) ----------
async function addCompra(){
  const insumoId = document.getElementById('compraInsumoSelect').value;
  const cantidad = parseFloat(document.getElementById('compraCantidad').value) || 0;
  const monto = parseFloat(document.getElementById('compraMonto').value) || 0;
  const ins = insumos.find(x=>x.id===insumoId);
  if(!ins){ showToast('Elige un insumo (agrégalo primero en Inventario → Insumos)'); return; }
  if(cantidad<=0 || monto<=0){ showToast('Falta la cantidad o el monto'); return; }

  ins.stock += cantidad;
  compras.push({
    id:uid(), fecha:todayStr(), ts:Date.now(),
    insumoId: ins.id, insumoNombre: ins.nombre, unidad: ins.unidad,
    cantidad, monto
  });
  await docRef.set({insumos, compras}, {merge:true});
  document.getElementById('compraCantidad').value='';
  document.getElementById('compraMonto').value='';
  renderAll();
  showToast('Compra guardada');
}

function renderCompras(){
  const list = document.getElementById('compraList');
  if(compras.length === 0){ list.innerHTML = '<div class="empty">Sin compras registradas todavía.</div>'; return; }
  const sorted = [...compras].sort((a,b)=>b.ts-a.ts).slice(0,30);
  list.innerHTML = sorted.map(c=>`
    <div class="list-row">
      <div class="list-main">
        <div class="list-title">${escapeHtml(c.insumoNombre || c.desc || '')}${c.cantidad?' · '+c.cantidad+' '+(UNIDAD_LABEL[c.unidad]||c.unidad||''):''}</div>
        <div class="list-sub">${c.fecha}</div>
      </div>
      <div class="pill">${fmt(c.monto)}</div>
    </div>
  `).join('');
}


// ---------- RESUMEN ----------
function renderResumen(){
  const hoy = todayStr();
  const ventasHoy = ventas.filter(v=>v.fecha===hoy).reduce((s,v)=>s+v.total,0);
  const gastosHoy = compras.filter(c=>c.fecha===hoy).reduce((s,c)=>s+c.monto,0);
  const ventasTotal = ventas.reduce((s,v)=>s+v.total,0);
  const gastosTotal = compras.reduce((s,c)=>s+c.monto,0);
  document.getElementById('statVentasHoy').textContent = fmt(ventasHoy);
  document.getElementById('statGastosHoy').textContent = fmt(gastosHoy);
  document.getElementById('statVentasTotal').textContent = fmt(ventasTotal);
  document.getElementById('statGastosTotal').textContent = fmt(gastosTotal);
  document.getElementById('statGanancia').textContent = fmt(ventasTotal - gastosTotal);

  // Mermas de hoy y totales (solo cuenta de ajustes tipo "perdida")
  const mermasHoy = ajustes.filter(a=>a.tipo==='perdida' && a.fecha===hoy).length;
  const mermasTotal = ajustes.filter(a=>a.tipo==='perdida').length;
  const elMermaHoy = document.getElementById('statMermaHoy');
  const elMermaTotal = document.getElementById('statMermaTotal');
  if(elMermaHoy) elMermaHoy.textContent = mermasHoy;
  if(elMermaTotal) elMermaTotal.textContent = mermasTotal;

  const mermaList = document.getElementById('mermaList');
  if(mermaList){
    const mermas = [...ajustes].filter(a=>a.tipo==='perdida').sort((a,b)=>b.ts-a.ts).slice(0,10);
    if(mermas.length === 0){
      mermaList.innerHTML = '<div class="empty">Sin mermas registradas todavía.</div>';
    }else{
      mermaList.innerHTML = mermas.map(a=>`
        <div class="list-row">
          <div class="list-main">
            <div class="list-title">${escapeHtml(a.productoNombre)}${a.motivo ? ' · '+escapeHtml(a.motivo) : ''}</div>
            <div class="list-sub">${a.fecha} · ${a.tipoArticulo === 'insumo' ? 'Insumo' : 'Producto'}</div>
          </div>
          <div class="pill" style="background:#FBEAE1;color:#D6482B;">−${a.cantidad}</div>
        </div>
      `).join('');
    }
  }

  const list = document.getElementById('ventasList');
  if(ventas.length===0){ list.innerHTML='<div class="empty">Aún no hay ventas.</div>'; return; }
  const sorted = [...ventas].sort((a,b)=>b.ts-a.ts).slice(0,15);
  list.innerHTML = sorted.map(v=>`
    <div class="list-row">
      <div class="list-main">
        <div class="list-title">${v.items.map(i=>i.cantidad+'x '+escapeHtml(i.nombre)).join(', ')}</div>
        <div class="list-sub">${v.fecha}</div>
      </div>
      <div class="pill">${fmt(v.total)}</div>
    </div>
  `).join('');
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ---------- NAV ----------
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-'+btn.dataset.view).classList.add('active');
  });
});

document.getElementById('cobrarBtn').addEventListener('click', cobrarVenta);
document.getElementById('addProdBtn').addEventListener('click', openNewProd);
document.getElementById('saveProdBtn').addEventListener('click', saveProd);
document.getElementById('delProdBtn').addEventListener('click', delProd);
document.getElementById('closeModal').addEventListener('click', ()=>document.getElementById('modalBg').classList.remove('show'));
document.getElementById('addCompraBtn').addEventListener('click', addCompra);
document.getElementById('guardarAjusteBtn').addEventListener('click', guardarAjuste);
document.getElementById('closeAjusteModal').addEventListener('click', ()=>document.getElementById('ajusteModalBg').classList.remove('show'));

document.getElementById('invTabMenu').addEventListener('click', ()=>switchInvTab('menu'));
document.getElementById('invTabInsumos').addEventListener('click', ()=>switchInvTab('insumos'));
document.getElementById('addInsumoBtn').addEventListener('click', openNewInsumo);
document.getElementById('saveInsumoBtn').addEventListener('click', saveInsumo);
document.getElementById('delInsumoBtn').addEventListener('click', delInsumo);
document.getElementById('closeInsumoModal').addEventListener('click', ()=>document.getElementById('insumoModalBg').classList.remove('show'));
document.getElementById('compraInsumoSelect').addEventListener('change', actualizarUnidadCompra);
document.getElementById('agregarIngredienteBtn').addEventListener('click', agregarIngrediente);

document.getElementById('dateLabel').textContent = new Date().toLocaleDateString('es-MX', {weekday:'long', day:'numeric', month:'long'});

startListener();
