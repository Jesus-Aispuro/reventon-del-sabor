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

const MENU_INICIAL = [
  {id: uid(), nombre:'Elote entero', categoria:'Elotes', precio:45, costo:0, stock:20},
  {id: uid(), nombre:'Vaso chico', categoria:'Elotes', precio:45, costo:0, stock:20},
  {id: uid(), nombre:'Vaso grande', categoria:'Elotes', precio:65, costo:0, stock:20},
  {id: uid(), nombre:'Tostilocos', categoria:'Botanas', precio:80, costo:0, stock:20},
  {id: uid(), nombre:'Churrolocos', categoria:'Botanas', precio:100, costo:0, stock:20},
  {id: uid(), nombre:'Cueritoslocos', categoria:'Botanas', precio:60, costo:0, stock:20},
  {id: uid(), nombre:'Nachos chico', categoria:'Botanas', precio:60, costo:0, stock:20},
  {id: uid(), nombre:'Nachos grande', categoria:'Botanas', precio:80, costo:0, stock:20},
  {id: uid(), nombre:'Maruchan loca', categoria:'Botanas', precio:130, costo:0, stock:20},
  {id: uid(), nombre:'Sabritas con queso', categoria:'Botanas', precio:40, costo:0, stock:20},
  {id: uid(), nombre:'Tostielote', categoria:'Botanas', precio:80, costo:0, stock:20},
  {id: uid(), nombre:'Coca-Cola 600ml', categoria:'Bebidas', precio:25, costo:0, stock:20},
  {id: uid(), nombre:'Coca-Cola 300ml', categoria:'Bebidas', precio:15, costo:0, stock:20},
  {id: uid(), nombre:'Queso extra', categoria:'Extras', precio:10, costo:0, stock:50}
];
// Para asignar categoría a productos que ya existían antes de este cambio
const CATEGORIA_POR_NOMBRE = {};
MENU_INICIAL.forEach(p => CATEGORIA_POR_NOMBRE[p.nombre] = p.categoria);
// Para renombrar categorías de una versión anterior (Antojitos/Elotes y vasos) a las 4 nuevas
const CATEGORIA_RENOMBRE = {
  'Antojitos': 'Botanas',
  'Elotes y vasos': 'Elotes'
};

const MENU_VERSION = '2';
const CATEGORIA_VERSION = '3';
let seeded = false;

function startListener(){
  docRef.onSnapshot(async (doc)=>{
    const d = doc.exists ? doc.data() : {};
    productos = d.productos || [];
    ventas = d.ventas || [];
    compras = d.compras || [];
    ajustes = d.ajustes || [];
    insumos = d.insumos || [];

    if(!seeded && (productos.length === 0 || d.menu_version !== MENU_VERSION)){
      seeded = true;
      productos = JSON.parse(JSON.stringify(MENU_INICIAL));
      await docRef.set({productos, menu_version: MENU_VERSION, categoria_version: CATEGORIA_VERSION}, {merge:true});
      return; // esto vuelve a disparar el snapshot con los datos ya guardados
    }

    if(!seeded && d.categoria_version !== CATEGORIA_VERSION){
      seeded = true;
      productos = productos.map(p=>{
        let cat = p.categoria || CATEGORIA_POR_NOMBRE[p.nombre] || 'Extras';
        if(CATEGORIA_RENOMBRE[cat]) cat = CATEGORIA_RENOMBRE[cat];
        return {...p, categoria: cat};
      });
      await docRef.set({productos, categoria_version: CATEGORIA_VERSION}, {merge:true});
      return;
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
      <button class="prod-btn" onclick="addToCart('${p.id}')" ${p.stock<=0?'style="opacity:0.45;"':''}>
        <div class="prod-name">${escapeHtml(p.nombre)}</div>
        <div class="prod-price">${fmt(p.precio)}</div>
        <div class="prod-stock ${p.stock<=3?'low':''}">${p.stock<=0?'Sin stock':'Stock: '+p.stock}</div>
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
  if(!p || p.stock <= (carrito[id]||0)) { showToast('No hay más stock'); return; }
  carrito[id] = (carrito[id]||0) + 1;
  renderCart();
}

function changeCartQty(id, delta){
  const p = productos.find(x=>x.id===id);
  let q = (carrito[id]||0) + delta;
  if(q <= 0){ delete carrito[id]; }
  else if(p && q > p.stock){ showToast('No hay más stock'); return; }
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
    p.stock -= carrito[id];
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
      <div class="pill ${p.stock<=3?'low':''}" style="${p.stock<=3?'background:#FBEAE1;color:#D6482B;':''}">Stock: ${p.stock}</div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        <button class="btn btn-ghost btn-sm" onclick="openEditProd('${p.id}')">Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="openAjuste('${p.id}')">Ajustar</button>
      </div>
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
  document.getElementById('pStock').value='';
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
  document.getElementById('pStock').value=p.stock;
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
  const stock = parseInt(document.getElementById('pStock').value)||0;
  if(!nombre){ showToast('Ponle un nombre'); return; }
  if(editingProdId){
    const p = productos.find(x=>x.id===editingProdId);
    Object.assign(p, {nombre, categoria, precio, costo, stock, receta: recetaTemp});
  }else{
    productos.push({id:uid(), nombre, categoria, precio, costo, stock, receta: recetaTemp});
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

// ---------- AJUSTES / MERMA (funciona para productos e insumos) ----------
let ajustandoId = null;
let ajustandoTipoArticulo = 'producto'; // 'producto' o 'insumo'

function openAjuste(id){
  const p = productos.find(x=>x.id===id);
  if(!p) return;
  ajustandoId = id;
  ajustandoTipoArticulo = 'producto';
  document.getElementById('ajusteProdNombre').textContent = p.nombre;
  document.getElementById('ajusteTipo').value = 'perdida';
  document.getElementById('ajusteCantidad').value = '';
  document.getElementById('ajusteMotivo').value = '';
  document.getElementById('ajusteModalBg').classList.add('show');
}

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
