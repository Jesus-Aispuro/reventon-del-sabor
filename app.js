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
  {id:'ins_limon',      nombre:'Limón',   categoria:'Frutas y verduras', unidad:'g', stock:0},
  {id:'ins_pepino',     nombre:'Pepino',  categoria:'Frutas y verduras', unidad:'g', stock:0},
  {id:'ins_jicama',     nombre:'Jícama',  categoria:'Frutas y verduras', unidad:'g', stock:0},

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
  {id:'ins_doritos_dinamita', nombre:'Doritos Dinamita Flamin Hot', categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:0},
  {id:'ins_cheetos_hot',    nombre:'Cheetos Flamin Hot', categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:3},
  {id:'ins_doritos_rojos',  nombre:'Doritos rojos',      categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:4},
  {id:'ins_takis',          nombre:'Takis Fuego',        categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:1},
  {id:'ins_tostitos',       nombre:'Tostitos verdes',    categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:9},
  {id:'ins_tostitos_fh',    nombre:'Tostitos Flamin Hot',categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:0},
  {id:'ins_ruffles_verdes', nombre:'Ruffles verdes',     categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:0},
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
                 R('ins_tajin',2), R('ins_limon',25), R('ins_sal',1), R('ins_amor',5), R('ins_valentina',5)];
const BASE_12 = [R('ins_mayonesa',18), R('ins_crema',12), R('ins_queso_seco',18), R('ins_mantequilla',9),
                 R('ins_tajin',2.5), R('ins_limon',28), R('ins_sal',1.2), R('ins_amor',6), R('ins_valentina',6)];
const BASE_14 = [R('ins_mayonesa',20), R('ins_crema',14), R('ins_queso_seco',20), R('ins_mantequilla',10),
                 R('ins_tajin',3), R('ins_limon',30), R('ins_sal',1.5), R('ins_amor',7), R('ins_valentina',7)];
// Las 4 salsas extra que llevan las "cochinadas"
const SALSAS_EXTRA = [R('ins_maggi',3), R('ins_inglesa',3), R('ins_pekin',3), R('ins_macha',5)];
// Mezcla base de los "locos" (tostilocos, cueritos locos, churros locos)
const BASE_LOCOS = [R('ins_pepino',50), R('ins_jicama',60), R('ins_cacahuate',15), R('ins_chacachacas',20),
                    R('ins_clamato',30), R('ins_chamoy',20), R('ins_valentina',10), R('ins_amor',10),
                    R('ins_maggi',3), R('ins_inglesa',3), R('ins_pekin',3), R('ins_tajin',3),
                    R('ins_limon',25), R('ins_sal',1)];

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
    R('ins_pepino',80), R('ins_jicama',95), R('ins_cacahuate',25), R('ins_chacachacas',30),
    R('ins_clamato',50), R('ins_chamoy',35), R('ins_valentina',15), R('ins_amor',15),
    R('ins_maggi',5), R('ins_inglesa',5), R('ins_pekin',5), R('ins_tajin',5),
    R('ins_limon',50), R('ins_sal',1.5)
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

// ============ MIGRACIONES ============
// Cambios que se aplican una sola vez sobre una base que YA tiene datos.
// Regla de oro: una migración solo puede AGREGAR o completar. Nunca borrar ni
// reemplazar lo que las dueñas capturaron.
const SABRITAS = [
  {id:'ins_tostitos',          nombre:'Tostitos verdes'},
  {id:'ins_tostitos_fh',       nombre:'Tostitos Flamin Hot'},
  {id:'ins_doritos_rojos',     nombre:'Doritos rojos'},
  {id:'ins_doritos_hot',       nombre:'Doritos Flamin Hot'},
  {id:'ins_doritos_dinamita',  nombre:'Doritos Dinamita Flamin Hot'},
  {id:'ins_cheetos_hot',       nombre:'Cheetos Flamin Hot'},
  {id:'ins_ruffles_verdes',    nombre:'Ruffles verdes'}
];

const MIGRACIONES = [
  {
    id: 'sabritas_variantes_v1',
    aplicar(){
      // 1. Dar de alta las sabritas que falten (sin tocar las que ya existen)
      SABRITAS.forEach(s=>{
        if(!insumos.some(i=>i.id===s.id)){
          insumos.push({id:s.id, nombre:s.nombre, categoria:'Abarrotes y empaquetados', unidad:'pieza', stock:0});
        }
      });

      // 2. Poner las 7 sabritas como variantes en los productos que la llevan.
      //    "base" es el insumo de la receta que se intercambia.
      const conVariantes = [
        {nombres:['Tostilocos'],                       base:'ins_tostitos'},
        {nombres:['Tostielote'],                       base:'ins_tostitos'},
        {nombres:['Maruchan loca'],                    base:'ins_tostitos'},
        {nombres:['Machicochinada','Maxi cochinada'],  base:'ins_doritos_hot'},
        {nombres:['Sabritas con queso'],               base:'ins_cheetos_hot'}
      ];
      const opciones = SABRITAS.map(s=>s.id);

      conVariantes.forEach(cfg=>{
        const p = productos.find(x=>cfg.nombres.some(n=>x.nombre.toLowerCase().includes(n.toLowerCase())));
        if(!p) return;
        p.receta = p.receta || [];
        // Si la receta no trae la sabrita base, se agrega (1 bolsa) para poder intercambiarla
        if(!p.receta.some(r=>r.insumoId===cfg.base)) p.receta.push({insumoId:cfg.base, cantidad:1});
        p.variantes = {insumoBase: cfg.base, opciones: [...opciones]};
      });

      // 3. Producto para vender la bolsa sola, si no existe ya
      if(!productos.some(p=>p.nombre.toLowerCase().includes('bolsa sola'))){
        productos.push({
          id: uid(), nombre:'Sabritas (bolsa sola)', categoria:'Botanas',
          precio:0, costo:0,
          receta:[{insumoId:'ins_tostitos', cantidad:1}],
          variantes:{insumoBase:'ins_tostitos', opciones:[...opciones]}
        });
      }
    }
  },
  {
    // Calcula el costo por unidad de cada insumo a partir de su última compra,
    // reasigna las compras que quedaron apuntando a insumos borrados, y valúa
    // en pesos las mermas que se registraron antes de que existiera el costo.
    id: 'costos_y_valor_merma_v1',
    aplicar(){
      // 1. Rescatar compras huérfanas: quedaron apuntando a un insumo que ya no
      //    existe (se creó a mano y luego se perdió). Se reasignan al insumo
      //    actual que tenga el mismo nombre, para no perder ese gasto.
      const normalizar = s => (s||'').toLowerCase()
        .replace(/flamin\s*hot/g,'fh').replace(/[^a-z0-9]/g,'');
      const idsVivos = new Set(insumos.map(i=>i.id));
      compras.forEach(c=>{
        if(!c.insumoId || idsVivos.has(c.insumoId)) return;
        const match = insumos.find(i => normalizar(i.nombre) === normalizar(c.insumoNombre));
        if(match){ c.insumoId = match.id; c.insumoNombre = match.nombre; }
      });

      // 2. Costo por unidad = el de la compra más reciente de ese insumo
      const porInsumo = {};
      [...compras].sort((a,b)=>(a.ts||0)-(b.ts||0)).forEach(c=>{
        if(c.insumoId && c.cantidad > 0) porInsumo[c.insumoId] = c.monto / c.cantidad;
      });
      insumos.forEach(i=>{
        if(i.costoUnitario === undefined && porInsumo[i.id] !== undefined){
          i.costoUnitario = porInsumo[i.id];
        }
      });

      // 3. Valuar las mermas anteriores con ese costo
      ajustes.forEach(a=>{
        if(a.valor !== undefined) return;
        const costo = porInsumo[a.productoId] || 0;
        a.costoUnitario = costo;
        a.valor = (a.cantidad || 0) * costo;
      });
    }
  }
];

async function aplicarMigraciones(hechas){
  const pendientes = MIGRACIONES.filter(m => !hechas.includes(m.id));
  if(pendientes.length === 0) return false;
  pendientes.forEach(m => m.aplicar());
  await docRef.set({
    productos, insumos, compras, ajustes,
    migraciones: hechas.concat(pendientes.map(m=>m.id))
  }, {merge:true});
  return true;
}

// El menú y los insumos escritos arriba son SOLO la carga inicial de un puesto nuevo.
// NUNCA deben sobrescribir un catálogo existente.
let seeded = false;
let migrado = false;

function startListener(){
  docRef.onSnapshot(async (doc)=>{
    const d = doc.exists ? doc.data() : {};
    productos = d.productos || [];
    ventas = d.ventas || [];
    compras = d.compras || [];
    ajustes = d.ajustes || [];
    insumos = d.insumos || [];

    renderAll();

    // ---- Carga inicial (solo para un puesto totalmente nuevo) ----
    // Tres candados, porque escribir aquí por error borra el catálogo real:
    //  1. Que el documento NO exista (no basta con que venga vacío).
    //  2. Que los datos vengan del SERVIDOR, no de la caché local del navegador.
    //     Al abrir la app, Firestore suele avisar primero con datos vacíos de caché;
    //     confiar en ese primer aviso fue lo que borró el catálogo una vez.
    //  3. Que no haya ventas, compras ni ajustes: si existen, este puesto YA venía
    //     trabajando y su catálogo debe recuperarse, nunca reemplazarse.
    const vieneDeCache = doc.metadata && doc.metadata.fromCache;
    const yaHuboMovimientos = ventas.length > 0 || compras.length > 0 || ajustes.length > 0;

    if(!seeded && !doc.exists && !vieneDeCache && !yaHuboMovimientos){
      seeded = true;
      productos = JSON.parse(JSON.stringify(MENU_INICIAL));
      insumos = JSON.parse(JSON.stringify(INSUMOS_INICIAL));
      await docRef.set({productos, insumos}, {merge:true});
      return;
    }

    // ---- Migraciones (solo AGREGAN cosas al catálogo que ya existe) ----
    if(!migrado && doc.exists && !vieneDeCache && productos.length > 0){
      migrado = true;
      await aplicarMigraciones(d.migraciones || []);
    }
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
  renderAlertas();
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
        ${p.precio<=0?'<div class="prod-stock low">Falta poner precio</div>':
          (tieneVariantes(p)?'<div class="prod-stock">Elige opción ▸</div>':'')}
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

// El carrito guarda { clave: {productoId, varianteId, cantidad} }.
// La clave incluye la variante para que un Tostiloco de Doritos y uno de Cheetos
// se cuenten como renglones distintos.
const claveCarrito = (productoId, varianteId) => productoId + '|' + (varianteId || '');

function addToCart(id, varianteId){
  const p = productos.find(x=>x.id===id);
  if(!p) return;
  // Si el producto tiene variantes y todavía no eligieron cuál, se pregunta primero
  if(tieneVariantes(p) && !varianteId){ abrirSelectorVariante(p); return; }

  const k = claveCarrito(id, varianteId);
  if(carrito[k]) carrito[k].cantidad += 1;
  else carrito[k] = {productoId:id, varianteId: varianteId || null, cantidad:1};
  renderCart();
}

function changeCartQty(clave, delta){
  const item = carrito[clave];
  if(!item) return;
  item.cantidad += delta;
  if(item.cantidad <= 0) delete carrito[clave];
  renderCart();
}

// Nombre a mostrar: "Tostilocos (Doritos Flamin Hot)"
function nombreConVariante(p, varianteId){
  if(!varianteId) return p.nombre;
  const ins = insumos.find(x=>x.id===varianteId);
  return p.nombre + (ins ? ' (' + ins.nombre + ')' : '');
}

let cartDetailOpen = false;
function toggleCartDetail(){
  cartDetailOpen = !cartDetailOpen;
  document.getElementById('cartDetail').style.display = cartDetailOpen ? 'block' : 'none';
  document.getElementById('cartChevron').textContent = cartDetailOpen ? '▾' : '▴';
}

function renderCart(){
  const claves = Object.keys(carrito);
  const bar = document.getElementById('cartBar');
  const detail = document.getElementById('cartDetail');
  const list = document.getElementById('cartList');

  if(claves.length === 0){
    bar.style.display='none';
    detail.style.display='none';
    cartDetailOpen = false;
    return;
  }
  bar.style.display='flex';

  let total = 0;
  let totalPiezas = 0;
  list.innerHTML = claves.map(k=>{
    const it = carrito[k];
    const p = productos.find(x=>x.id===it.productoId);
    if(!p) return '';
    total += p.precio * it.cantidad;
    totalPiezas += it.cantidad;
    return `<div class="cart-row">
      <div><div class="list-title">${escapeHtml(nombreConVariante(p, it.varianteId))}</div><div class="list-sub">${fmt(p.precio)} c/u</div></div>
      <div class="qty-ctrl">
        <button onclick="changeCartQty('${k}',-1)">−</button>
        <span>${it.cantidad}</span>
        <button onclick="changeCartQty('${k}',1)">+</button>
      </div>
    </div>`;
  }).join('');

  document.getElementById('cartCountLbl').textContent = totalPiezas + (totalPiezas===1?' producto':' productos');
  document.getElementById('cartTotalBar').textContent = fmt(total);
  if(cartDetailOpen) detail.style.display='block';
}

// ---------- VARIANTES ----------
// Un producto con variantes tiene:
//   variantes: { insumoBase:'ins_tostitos', opciones:['ins_tostitos','ins_doritos_hot', ...] }
// Al venderlo se descuenta la receta normal, pero cambiando insumoBase por la opción elegida.
function tieneVariantes(p){
  return !!(p.variantes && p.variantes.insumoBase && (p.variantes.opciones||[]).length > 0);
}

function abrirSelectorVariante(p){
  const cont = document.getElementById('varianteOpciones');
  document.getElementById('varianteTitulo').textContent = p.nombre;
  cont.innerHTML = p.variantes.opciones.map(insId=>{
    const ins = insumos.find(x=>x.id===insId);
    if(!ins) return '';
    const agotado = ins.stock <= 0;
    return `<button class="prod-btn" style="width:100%; margin-bottom:8px; ${agotado?'opacity:0.5;':''}"
              onclick="elegirVariante('${p.id}','${insId}')">
        <div class="prod-name">${escapeHtml(ins.nombre)}</div>
        <div class="prod-stock ${agotado?'low':''}">${agotado?'Sin existencia':'Quedan '+ins.stock+' '+(UNIDAD_LABEL[ins.unidad]||ins.unidad)}</div>
      </button>`;
  }).join('');
  document.getElementById('varianteModalBg').classList.add('show');
}

function elegirVariante(productoId, insumoId){
  document.getElementById('varianteModalBg').classList.remove('show');
  addToCart(productoId, insumoId);
}

// Devuelve la receta ya con la variante aplicada
function recetaEfectiva(p, varianteId){
  const receta = p.receta || [];
  if(!varianteId || !tieneVariantes(p)) return receta;
  return receta.map(r => r.insumoId === p.variantes.insumoBase ? {...r, insumoId: varianteId} : r);
}

// ---------- INSUMOS / RECETAS ----------
// Descuenta (signo -1) o devuelve (signo +1) los insumos de una lista de items vendidos.
// Si un producto no tiene receta definida, simplemente no mueve insumos.
function moverInsumosPorItems(items, signo){
  items.forEach(item=>{
    const p = productos.find(x=>x.id===item.productoId);
    if(!p) return;
    recetaEfectiva(p, item.varianteId).forEach(r=>{
      const ins = insumos.find(x=>x.id===r.insumoId);
      if(!ins) return;
      ins.stock += signo * (r.cantidad * item.cantidad);
    });
  });
}

function descontarInsumosPorVenta(items){ moverInsumosPorItems(items, -1); }

// ---------- COBRO ----------
// Antes de cerrar la venta se muestra el total y se calcula el cambio.
let totalACobrar = 0;

function abrirCobro(){
  const claves = Object.keys(carrito);
  if(claves.length === 0) return;
  totalACobrar = claves.reduce((s,k)=>{
    const it = carrito[k];
    const p = productos.find(x=>x.id===it.productoId);
    return s + (p ? p.precio * it.cantidad : 0);
  },0);

  document.getElementById('cobroTotal').textContent = fmt(totalACobrar);
  document.getElementById('cobroPago').value = '';
  document.getElementById('cobroCambio').innerHTML = '';

  // Sugerencias de billetes: el exacto y los billetes comunes que alcanzan
  const billetes = [50,100,200,500,1000].filter(b=>b > totalACobrar);
  document.getElementById('cobroSugerencias').innerHTML =
    `<button class="btn btn-ghost btn-sm" onclick="ponerPago(${totalACobrar})">Exacto</button>` +
    billetes.slice(0,3).map(b=>`<button class="btn btn-ghost btn-sm" onclick="ponerPago(${b})">$${b}</button>`).join('');

  document.getElementById('cobroModalBg').classList.add('show');
}

function ponerPago(monto){
  document.getElementById('cobroPago').value = monto;
  calcularCambio();
}

function calcularCambio(){
  const pago = parseFloat(document.getElementById('cobroPago').value);
  const box = document.getElementById('cobroCambio');
  if(!pago && pago !== 0){ box.innerHTML = ''; return; }
  const cambio = pago - totalACobrar;
  if(cambio < 0){
    box.innerHTML = `<div class="cambio-box falta">Faltan ${fmt(Math.abs(cambio))}</div>`;
  }else{
    box.innerHTML = `<div class="cambio-box">Cambio<strong>${fmt(cambio)}</strong></div>`;
  }
}

async function cobrarVenta(){
  const claves = Object.keys(carrito);
  if(claves.length === 0) return;
  let total = 0;
  const items = claves.map(k=>{
    const it = carrito[k];
    const p = productos.find(x=>x.id===it.productoId);
    total += p.precio * it.cantidad;
    return {
      productoId: it.productoId,
      varianteId: it.varianteId || null,
      nombre: nombreConVariante(p, it.varianteId),
      cantidad: it.cantidad,
      precioUnit: p.precio
    };
  });
  const pago = parseFloat(document.getElementById('cobroPago').value);
  const registro = {id:uid(), fecha:todayStr(), ts:Date.now(), items, total};
  if(!isNaN(pago) && pago >= total){ registro.pago = pago; registro.cambio = pago - total; }
  ventas.push(registro);
  document.getElementById('cobroModalBg').classList.remove('show');
  descontarInsumosPorVenta(items); // descuenta insumos según receta, si ya está definida
  carrito = {};
  catState = {}; // cierra todas las categorías otra vez
  await docRef.set({productos, ventas, insumos}, {merge:true}); // todo junto para que no se pisen los datos
  renderAll();
  showToast('Venta registrada: ' + fmt(total));
}

// ---------- INVENTARIO ----------
let filtroMenu = '';
function setFiltroMenu(v){ filtroMenu = (v||'').toLowerCase(); renderInventario(); }

// Costo real de preparar un producto, sumando el costo de cada insumo de su receta.
// Devuelve {costo, completo, faltantes}: "completo" es false si algún insumo
// todavía no tiene costo, en cuyo caso el total mostrado se queda corto.
function costoDeReceta(p, varianteId){
  const receta = recetaEfectiva(p, varianteId);
  let costo = 0;
  const faltantes = [];
  receta.forEach(r=>{
    const ins = insumos.find(x=>x.id===r.insumoId);
    if(!ins) return;
    if(ins.costoUnitario === undefined || ins.costoUnitario === null){
      faltantes.push(ins.nombre);
    }else{
      costo += ins.costoUnitario * r.cantidad;
    }
  });
  return {costo, completo: faltantes.length === 0, faltantes};
}

// Con variantes, el costo cambia según la botana. Se reporta el rango.
function costoProducto(p){
  if(!tieneVariantes(p)) return costoDeReceta(p);
  const calculos = p.variantes.opciones.map(id=>costoDeReceta(p, id));
  const costos = calculos.map(c=>c.costo);
  return {
    costo: Math.min(...costos),
    costoMax: Math.max(...costos),
    completo: calculos.every(c=>c.completo),
    faltantes: [...new Set(calculos.flatMap(c=>c.faltantes))]
  };
}

// Insumos que ya se acabaron o están por acabarse.
// "Por acabarse" solo aplica si le pusieron un mínimo en Inventario → Insumos.
function insumosEnAlerta(){
  const agotados = [], bajos = [];
  insumos.forEach(i=>{
    if(i.stock <= 0) agotados.push(i);
    else if(i.minimo > 0 && i.stock <= i.minimo) bajos.push(i);
  });
  return {agotados, bajos};
}

function renderAlertas(){
  const box = document.getElementById('alertasBox');
  if(!box) return;
  const {agotados, bajos} = insumosEnAlerta();

  // Solo se avisa de lo que realmente se usa en alguna receta; si no, sería ruido
  const usados = new Set(productos.flatMap(p=>(p.receta||[]).map(r=>r.insumoId))
    .concat(productos.flatMap(p=>p.variantes ? p.variantes.opciones : [])));
  const ag = agotados.filter(i=>usados.has(i.id));
  const bj = bajos.filter(i=>usados.has(i.id));

  if(ag.length === 0 && bj.length === 0){ box.innerHTML = ''; return; }

  const nombres = arr => arr.map(i=>escapeHtml(i.nombre)).join(', ');
  box.innerHTML = `
    ${ag.length ? `<div class="alerta alerta-roja">
      <strong>Se acabó:</strong> ${nombres(ag)}
    </div>` : ''}
    ${bj.length ? `<div class="alerta alerta-amarilla">
      <strong>Ya casi se acaba:</strong> ${nombres(bj)}
    </div>` : ''}`;
}

function renderInventario(){
  const list = document.getElementById('invList');
  if(productos.length === 0){
    list.innerHTML = '<div class="empty">Aún no tienes productos.</div>';
    renderAjustes();
    return;
  }
  const visibles = productos.filter(p=>!filtroMenu || p.nombre.toLowerCase().includes(filtroMenu));
  if(visibles.length === 0){
    list.innerHTML = '<div class="empty">Nada coincide con la búsqueda.</div>';
    renderAjustes();
    return;
  }
  list.innerHTML = visibles.map(p=>{
    const c = costoProducto(p);
    const tieneReceta = p.receta && p.receta.length > 0;
    const rango = c.costoMax !== undefined && c.costoMax > c.costo;
    const margen = p.precio - c.costo;
    const pct = p.precio > 0 ? Math.round(margen / p.precio * 100) : 0;

    let linea;
    if(!tieneReceta){
      linea = '<span style="color:var(--chili);">sin receta</span>';
    }else if(!c.completo && c.costo === 0){
      linea = '<span style="color:var(--chili);">falta costo de insumos</span>';
    }else{
      linea = `cuesta ${fmt(c.costo)}${rango?' – '+fmt(c.costoMax):''}` +
              (p.precio > 0 ? ` · deja ${fmt(margen)} (${pct}%)` : '') +
              (c.completo ? '' : ' <span style="color:var(--chili);">(incompleto)</span>');
    }

    return `
    <div class="list-row">
      <div class="list-main">
        <div class="list-title">${escapeHtml(p.nombre)}${tieneVariantes(p)?' <span class="pill">'+p.variantes.opciones.length+' opciones</span>':''}</div>
        <div class="list-sub">${escapeHtml(p.categoria || 'Otros')} · Vende ${fmt(p.precio)}</div>
        <div class="list-sub">${linea}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="openEditProd('${p.id}')">Editar</button>
    </div>`;
  }).join('');
  renderAjustes();
}

let recetaTemp = [];
let variantesTemp = null; // {insumoBase, opciones:[]}

function openNewProd(){
  editingProdId = null;
  document.getElementById('modalTitle').textContent = 'Nuevo producto';
  document.getElementById('pNombre').value='';
  document.getElementById('pCategoria').value='';
  document.getElementById('pPrecio').value='';
  document.getElementById('delProdBtn').style.display='none';
  recetaTemp = [];
  variantesTemp = null;
  document.getElementById('recetaBuscar').value='';
  document.getElementById('varOpcionBuscar').value='';
  llenarSelectInsumos('recetaInsumoSelect','');
  llenarSelectInsumos('varOpcionSelect','');
  renderRecetaEditor();
  renderVariantesEditor();
  reiniciarSeccionesProd();
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
  document.getElementById('delProdBtn').style.display='inline-block';
  recetaTemp = JSON.parse(JSON.stringify(p.receta || []));
  variantesTemp = p.variantes ? JSON.parse(JSON.stringify(p.variantes)) : null;
  document.getElementById('recetaBuscar').value='';
  document.getElementById('varOpcionBuscar').value='';
  llenarSelectInsumos('recetaInsumoSelect','');
  llenarSelectInsumos('varOpcionSelect','');
  renderRecetaEditor();
  renderVariantesEditor();
  reiniciarSeccionesProd();
  document.getElementById('modalBg').classList.add('show');
}

// Secciones plegables del editor de producto (para que no sea un scroll larguísimo)
function toggleSeccionProd(id){
  const body = document.getElementById(id);
  const chev = document.getElementById('chev' + id.charAt(0).toUpperCase() + id.slice(1));
  const abierto = body.style.display !== 'none';
  body.style.display = abierto ? 'none' : 'block';
  if(chev) chev.textContent = abierto ? '▸' : '▾';
}

// Deja el editor con solo la primera sección abierta
function reiniciarSeccionesProd(){
  [['secDatos', true], ['secReceta', false], ['secVariantes', false]].forEach(([id, abierto])=>{
    const body = document.getElementById(id);
    const chev = document.getElementById('chev' + id.charAt(0).toUpperCase() + id.slice(1));
    if(body) body.style.display = abierto ? 'block' : 'none';
    if(chev) chev.textContent = abierto ? '▾' : '▸';
  });
}

// Etiquetas de resumen en los encabezados, para saber qué hay dentro sin abrir
function actualizarBadgesProd(){
  const bR = document.getElementById('badgeReceta');
  const bV = document.getElementById('badgeVariantes');
  if(bR) bR.textContent = recetaTemp.length ? recetaTemp.length + ' insumos' : 'vacía';
  if(bV) bV.textContent = (variantesTemp && variantesTemp.opciones.length > 1)
    ? variantesTemp.opciones.length + ' opciones' : 'ninguna';
}

function renderRecetaEditor(){
  const list = document.getElementById('recetaList');
  if(!list) return;
  if(recetaTemp.length === 0){
    list.innerHTML = '<div class="empty" style="padding:8px 0;">Sin ingredientes agregados todavía</div>';
  }else{
    list.innerHTML = recetaTemp.map((r,idx)=>{
      const ins = insumos.find(x=>x.id===r.insumoId);
      const nombre = ins ? ins.nombre : '(insumo eliminado)';
      const unidad = ins ? (UNIDAD_LABEL[ins.unidad]||ins.unidad) : '';
      const sinCosto = !ins || ins.costoUnitario === undefined || ins.costoUnitario === null;
      const importe = sinCosto ? null : ins.costoUnitario * r.cantidad;
      return `<div class="cart-row">
        <div>
          <div class="list-title">${escapeHtml(nombre)}</div>
          <div class="list-sub">${sinCosto ? '<span style="color:var(--chili);">falta su costo</span>' : fmt(importe)}</div>
        </div>
        <div class="qty-ctrl">
          <span>${r.cantidad} ${unidad}</span>
          <button onclick="quitarIngrediente(${idx})">×</button>
        </div>
      </div>`;
    }).join('');
  }
  renderCostoCalculado();
  renderVarBaseSelect();
  actualizarBadgesProd();
}

// Muestra cuánto cuesta preparar el producto según la receta que se está editando
function renderCostoCalculado(){
  const box = document.getElementById('costoCalculado');
  if(!box) return;
  if(recetaTemp.length === 0){ box.innerHTML = ''; return; }

  const fake = {receta: recetaTemp, variantes: (variantesTemp && variantesTemp.opciones.length>1) ? variantesTemp : null};
  const c = costoProducto(fake);
  const precio = parseFloat(document.getElementById('pPrecio').value) || 0;
  const rango = c.costoMax !== undefined && c.costoMax > c.costo;
  const margen = precio - c.costo;
  const pct = precio > 0 ? Math.round(margen/precio*100) : 0;

  box.innerHTML = `
    <div class="costo-box">
      <div class="costo-linea">
        <span>Cuesta prepararlo</span>
        <strong>${fmt(c.costo)}${rango ? ' – '+fmt(c.costoMax) : ''}</strong>
      </div>
      ${precio > 0 ? `
      <div class="costo-linea">
        <span>Se vende en</span><strong>${fmt(precio)}</strong>
      </div>
      <div class="costo-linea costo-margen ${margen < 0 ? 'negativo' : ''}">
        <span>Deja de ganancia</span><strong>${fmt(margen)} (${pct}%)</strong>
      </div>` : '<div class="list-sub">Pon el precio de venta para ver la ganancia.</div>'}
      ${!c.completo ? `<div class="list-sub" style="color:var(--chili); margin-top:6px;">
        Falta el costo de: ${c.faltantes.map(escapeHtml).join(', ')}. El total real es mayor.
      </div>` : ''}
    </div>`;
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
  const quitado = recetaTemp[idx];
  recetaTemp.splice(idx,1);
  // Si se quitó el insumo que servía de base para las variantes, se desactivan
  if(variantesTemp && quitado && variantesTemp.insumoBase === quitado.insumoId) variantesTemp = null;
  renderRecetaEditor();
  renderVariantesEditor();
  actualizarBadgesProd();
}

// ---------- Editor de variantes ----------
// Permite que un producto (ej. Tostilocos) se venda con distintas botanas sin
// tener que crear un producto separado por cada una.
function renderVarBaseSelect(){
  const sel = document.getElementById('varBaseSelect');
  if(!sel) return;
  const opts = recetaTemp.map(r=>{
    const ins = insumos.find(x=>x.id===r.insumoId);
    return ins ? `<option value="${ins.id}">${escapeHtml(ins.nombre)}</option>` : '';
  }).join('');
  sel.innerHTML = '<option value="">Sin variantes</option>' + opts;
  sel.value = variantesTemp ? variantesTemp.insumoBase : '';
}

function cambiarVarBase(){
  const val = document.getElementById('varBaseSelect').value;
  if(!val){ variantesTemp = null; }
  else if(!variantesTemp || variantesTemp.insumoBase !== val){
    // La primera opción siempre es el insumo original de la receta
    variantesTemp = {insumoBase: val, opciones:[val]};
  }
  renderVariantesEditor();
}

function renderVariantesEditor(){
  const cont = document.getElementById('varOpcionesList');
  const box = document.getElementById('varOpcionesBox');
  if(!cont || !box) return;
  renderVarBaseSelect();
  if(!variantesTemp){ box.style.display='none'; cont.innerHTML=''; return; }
  box.style.display='block';
  cont.innerHTML = variantesTemp.opciones.map((insId,idx)=>{
    const ins = insumos.find(x=>x.id===insId);
    return `<div class="cart-row">
      <div class="list-title">${escapeHtml(ins?ins.nombre:'(insumo eliminado)')}</div>
      <div class="qty-ctrl"><button onclick="quitarOpcionVariante(${idx})">×</button></div>
    </div>`;
  }).join('') || '<div class="empty" style="padding:8px 0;">Agrega al menos una opción</div>';
}

function agregarOpcionVariante(){
  if(!variantesTemp){ showToast('Primero elige el insumo que cambia'); return; }
  const val = document.getElementById('varOpcionSelect').value;
  if(!val){ showToast('Elige un insumo'); return; }
  if(variantesTemp.opciones.includes(val)){ showToast('Esa opción ya está'); return; }
  variantesTemp.opciones.push(val);
  renderVariantesEditor();
}

function quitarOpcionVariante(idx){
  variantesTemp.opciones.splice(idx,1);
  renderVariantesEditor();
}

async function saveProd(){
  const nombre = document.getElementById('pNombre').value.trim();
  const categoria = document.getElementById('pCategoria').value.trim() || 'Otros';
  const precio = parseFloat(document.getElementById('pPrecio').value)||0;
  // El costo ya no se captura: se calcula desde la receta
  const c = costoProducto({receta: recetaTemp, variantes: (variantesTemp && variantesTemp.opciones.length>1) ? variantesTemp : null});
  const costo = c.costo;
  if(!nombre){ showToast('Ponle un nombre'); return; }
  // Si quedó una sola opción, no tiene sentido preguntar: se guarda sin variantes
  const variantes = (variantesTemp && variantesTemp.opciones.length > 1) ? variantesTemp : null;
  if(editingProdId){
    const p = productos.find(x=>x.id===editingProdId);
    Object.assign(p, {nombre, categoria, precio, costo, receta: recetaTemp, variantes});
  }else{
    productos.push({id:uid(), nombre, categoria, precio, costo, receta: recetaTemp, variantes});
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

  // Se guarda el costo del momento: si mañana cambia el precio del insumo,
  // esta merma sigue valuada a lo que costaba cuando ocurrió.
  const costoUnitario = item.costoUnitario || 0;

  ajustes.push({
    id: uid(), fecha: todayStr(), ts: Date.now(),
    tipoArticulo: ajustandoTipoArticulo,
    productoId: item.id, productoNombre: item.nombre,
    tipo, cantidad, motivo,
    costoUnitario, valor: cantidad * costoUnitario
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
        <div class="list-sub">${a.fecha} · ${a.tipo === 'perdida' ? 'Merma / pérdida' : 'Ajuste a favor'}${a.valor ? ' · '+fmt(a.valor) : ''}</div>
      </div>
      <div class="pill" style="${a.tipo==='perdida'?'background:#FBEAE1;color:#D6482B;':'background:#EAF3E6;color:#4A6E40;'}">${a.tipo==='perdida'?'−':'+'}${a.cantidad}</div>
      <button class="btn btn-ghost btn-sm" onclick="deshacerAjuste('${a.id}')">Deshacer</button>
    </div>
  `).join('');
}

// Deshace un ajuste: lo borra del historial y regresa el inventario como estaba.
// Si se capturó mal la cantidad, se deshace y se vuelve a registrar bien.
async function deshacerAjuste(ajusteId){
  const a = ajustes.find(x=>x.id===ajusteId);
  if(!a) return;
  const item = a.tipoArticulo === 'insumo'
    ? insumos.find(x=>x.id===a.productoId)
    : productos.find(x=>x.id===a.productoId);

  const texto = `${a.productoNombre}\n${a.tipo==='perdida'?'Merma':'Ajuste a favor'} de ${a.cantidad}` +
                (a.motivo ? `\nMotivo: ${a.motivo}` : '');
  if(!confirm(`¿Deshacer este ajuste?\n\n${texto}\n\n` +
              (item ? 'La existencia volverá a como estaba.' : 'Ese artículo ya no existe; solo se borrará del historial.'))) return;

  // Revertir el movimiento: si fue pérdida se suma, si fue ganancia se resta
  if(item) item.stock += (a.tipo === 'perdida' ? a.cantidad : -a.cantidad);

  ajustes = ajustes.filter(x=>x.id!==ajusteId);
  await docRef.set({insumos, productos, ajustes}, {merge:true});
  renderAll();
  showToast('Ajuste deshecho');
}

// ---------- INSUMOS (catálogo, agrupado por categoría fija) ----------
let editingInsumoId = null;
let insumoCatOpenState = {};

let filtroInsumos = '';
function setFiltroInsumos(v){ filtroInsumos = (v||'').toLowerCase(); renderInsumos(); }

function renderInsumos(){
  const wrap = document.getElementById('insumoWrap');
  if(!wrap) return;
  if(insumos.length === 0){
    wrap.innerHTML = '<div class="empty">Aún no tienes insumos. Agrega el primero con "+ Agregar insumo".</div>';
    return;
  }
  const visibles = insumos.filter(i=>!filtroInsumos || i.nombre.toLowerCase().includes(filtroInsumos));
  if(visibles.length === 0){
    wrap.innerHTML = '<div class="empty">Ningún insumo coincide con la búsqueda.</div>';
    return;
  }
  const grupos = {};
  visibles.forEach(i=>{
    const cat = i.categoria || 'Otros';
    if(!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(i);
  });
  const orden = INSUMO_CATEGORIAS.filter(c=>grupos[c]);
  Object.keys(grupos).forEach(c=>{ if(!orden.includes(c)) orden.push(c); });

  wrap.innerHTML = orden.map(cat=>{
    const abierto = filtroInsumos ? true : (insumoCatOpenState[cat] === true);
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
  document.getElementById('iCosto').value = '';
  document.getElementById('iMinimo').value = '';
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
  document.getElementById('iCosto').value = i.costoUnitario !== undefined ? i.costoUnitario : '';
  document.getElementById('iMinimo').value = i.minimo !== undefined ? i.minimo : '';
  document.getElementById('delInsumoBtn').style.display = 'inline-block';
  document.getElementById('insumoModalBg').classList.add('show');
}

async function saveInsumo(){
  const nombre = document.getElementById('iNombre').value.trim();
  const categoria = document.getElementById('iCategoria').value;
  const unidad = document.getElementById('iUnidad').value;
  const stock = parseFloat(document.getElementById('iStock').value) || 0;
  const costoTxt = document.getElementById('iCosto').value.trim();
  const costoUnitario = costoTxt === '' ? undefined : (parseFloat(costoTxt) || 0);
  const minTxt = document.getElementById('iMinimo').value.trim();
  const minimo = minTxt === '' ? undefined : (parseFloat(minTxt) || 0);
  if(!nombre){ showToast('Ponle un nombre'); return; }
  if(editingInsumoId){
    const i = insumos.find(x=>x.id===editingInsumoId);
    Object.assign(i, {nombre, categoria, unidad, stock});
    if(costoUnitario !== undefined) i.costoUnitario = costoUnitario;
    if(minimo !== undefined) i.minimo = minimo;
  }else{
    const nuevo = {id:uid(), nombre, categoria, unidad, stock};
    if(costoUnitario !== undefined) nuevo.costoUnitario = costoUnitario;
    if(minimo !== undefined) nuevo.minimo = minimo;
    insumos.push(nuevo);
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

// Llena un <select> de insumos, opcionalmente filtrando por texto.
// Conserva la opción que ya estaba elegida si sigue apareciendo tras filtrar.
function llenarSelectInsumos(selectId, filtro){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  const previo = sel.value;
  const f = (filtro||'').toLowerCase();
  const lista = insumos.filter(i => !f || i.nombre.toLowerCase().includes(f));

  if(insumos.length === 0){
    sel.innerHTML = '<option value="">Agrega insumos en Inventario → Insumos</option>';
    return;
  }
  if(lista.length === 0){
    sel.innerHTML = '<option value="">Ningún insumo coincide</option>';
    return;
  }
  sel.innerHTML = lista.map(i=>`<option value="${i.id}">${escapeHtml(i.nombre)} (${UNIDAD_LABEL[i.unidad]||i.unidad})</option>`).join('');
  if(lista.some(i=>i.id===previo)) sel.value = previo;
}

function renderInsumoSelect(){
  llenarSelectInsumos('compraInsumoSelect', document.getElementById('compraBuscar')?.value || '');
  llenarSelectInsumos('recetaInsumoSelect', document.getElementById('recetaBuscar')?.value || '');
  llenarSelectInsumos('varOpcionSelect',    document.getElementById('varOpcionBuscar')?.value || '');
  actualizarUnidadCompra();
}

function buscarInsumoCompra(){
  llenarSelectInsumos('compraInsumoSelect', document.getElementById('compraBuscar').value);
  actualizarUnidadCompra();
}
function buscarInsumoReceta(){
  llenarSelectInsumos('recetaInsumoSelect', document.getElementById('recetaBuscar').value);
}
function buscarInsumoVariante(){
  llenarSelectInsumos('varOpcionSelect', document.getElementById('varOpcionBuscar').value);
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
  // El costo por unidad se actualiza con el ÚLTIMO precio pagado.
  // Sirve para valuar la merma en pesos.
  ins.costoUnitario = monto / cantidad;
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


// ---------- EDITAR UNA VENTA ----------
// Para corregir una venta mal capturada sin tener que cancelarla y rehacerla.
let ventaEditandoId = null;
let itemsEdit = [];

function abrirEditarVenta(ventaId){
  const v = ventas.find(x=>x.id===ventaId);
  if(!v) return;
  ventaEditandoId = ventaId;
  itemsEdit = JSON.parse(JSON.stringify(v.items));
  document.getElementById('editVentaFecha').textContent = fechaBonita(v.fecha);
  renderEditarVenta();
  document.getElementById('editVentaModalBg').classList.add('show');
}

function cambiarCantidadEdit(idx, delta){
  const it = itemsEdit[idx];
  if(!it) return;
  it.cantidad += delta;
  if(it.cantidad <= 0) itemsEdit.splice(idx,1);
  renderEditarVenta();
}

function renderEditarVenta(){
  const list = document.getElementById('editVentaList');
  const total = itemsEdit.reduce((s,i)=>s + i.precioUnit * i.cantidad, 0);

  if(itemsEdit.length === 0){
    list.innerHTML = '<div class="empty" style="padding:14px 0;">Sin productos. Si guardas así, la venta se cancela por completo.</div>';
  }else{
    list.innerHTML = itemsEdit.map((it,idx)=>`
      <div class="cart-row">
        <div>
          <div class="list-title">${escapeHtml(it.nombre)}</div>
          <div class="list-sub">${fmt(it.precioUnit)} c/u</div>
        </div>
        <div class="qty-ctrl">
          <button onclick="cambiarCantidadEdit(${idx},-1)">−</button>
          <span>${it.cantidad}</span>
          <button onclick="cambiarCantidadEdit(${idx},1)">+</button>
        </div>
      </div>`).join('');
  }
  document.getElementById('editVentaTotal').textContent = fmt(total);
}

async function guardarEdicionVenta(){
  const v = ventas.find(x=>x.id===ventaEditandoId);
  if(!v) return;

  if(itemsEdit.length === 0){
    if(!confirm('La venta quedó sin productos. ¿Cancelarla por completo?')) return;
    moverInsumosPorItems(v.items, +1);          // devolver todo
    ventas = ventas.filter(x=>x.id!==ventaEditandoId);
  }else{
    // Se devuelve lo que consumía antes y se descuenta lo que consume ahora
    moverInsumosPorItems(v.items, +1);
    moverInsumosPorItems(itemsEdit, -1);
    v.items = itemsEdit;
    v.total = itemsEdit.reduce((s,i)=>s + i.precioUnit * i.cantidad, 0);
    if(v.pago !== undefined) v.cambio = v.pago - v.total;   // recalcular el cambio
  }

  await docRef.set({ventas, insumos}, {merge:true});
  document.getElementById('editVentaModalBg').classList.remove('show');
  renderAll();
  showToast(itemsEdit.length === 0 ? 'Venta cancelada' : 'Venta corregida');
}

// Ranking de lo más vendido en el rango elegido
function renderTopProductos(vR){
  const box = document.getElementById('topProductos');
  if(!box) return;

  const acum = {};
  vR.forEach(v=>v.items.forEach(i=>{
    // Se agrupa por producto, juntando sus variantes (todos los Tostilocos suman igual)
    const p = productos.find(x=>x.id===i.productoId);
    const nombre = p ? p.nombre : i.nombre.replace(/\s*\(.*\)$/,'');
    if(!acum[nombre]) acum[nombre] = {cantidad:0, importe:0};
    acum[nombre].cantidad += i.cantidad;
    acum[nombre].importe  += i.precioUnit * i.cantidad;
  }));

  const lista = Object.entries(acum).sort((a,b)=>b[1].importe - a[1].importe);
  if(lista.length === 0){ box.innerHTML = '<div class="empty">Sin ventas en este periodo.</div>'; return; }

  const maxImporte = lista[0][1].importe;
  box.innerHTML = lista.slice(0,10).map(([nombre,dat],idx)=>`
    <div class="top-fila">
      <div class="top-pos">${idx+1}</div>
      <div class="top-main">
        <div class="top-nombre">${escapeHtml(nombre)}</div>
        <div class="top-barra"><span style="width:${Math.round(dat.importe/maxImporte*100)}%"></span></div>
      </div>
      <div class="top-datos">
        <div class="top-importe">${fmt(dat.importe)}</div>
        <div class="list-sub">${dat.cantidad} vendidos</div>
      </div>
    </div>`).join('');
}

// ---------- RESUMEN ----------
let rangoResumen = 'hoy';        // 'hoy' | 'semana' | 'mes' | 'todo'
let diasAbiertos = {};           // qué días están desplegados

function setRango(r){
  rangoResumen = r;
  diasAbiertos = {};
  renderResumen();
}
function toggleDia(fecha){
  diasAbiertos[fecha] = !diasAbiertos[fecha];
  renderResumen();
}

// Fecha (YYYY-MM-DD) desde la que cuenta el rango elegido
function inicioDelRango(){
  const d = new Date();
  if(rangoResumen === 'semana') d.setDate(d.getDate() - 6);   // hoy + 6 días atrás
  else if(rangoResumen === 'mes') d.setDate(d.getDate() - 29);
  else if(rangoResumen === 'todo') return '0000-00-00';
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dia=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dia}`;
}

function enRango(fecha){ return fecha >= inicioDelRango(); }

// Valor en pesos de una merma. Usa el costo guardado al momento; si es una
// merma vieja sin valor, cae al costo actual del insumo.
function valorMerma(a){
  if(a.valor !== undefined) return a.valor;
  const ins = insumos.find(x=>x.id===a.productoId);
  return (a.cantidad||0) * ((ins && ins.costoUnitario) || 0);
}

function fechaBonita(f){
  const [y,m,d] = f.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  const txt = dt.toLocaleDateString('es-MX', {weekday:'long', day:'numeric', month:'long'});
  if(f === todayStr()) return 'Hoy — ' + txt;
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function renderResumen(){
  // --- Botones de rango ---
  const cont = document.getElementById('rangoBtns');
  if(cont){
    const opciones = [['hoy','Hoy'],['semana','7 días'],['mes','30 días'],['todo','Todo']];
    cont.innerHTML = opciones.map(([val,txt])=>
      `<button class="btn btn-sm ${rangoResumen===val?'btn-chili':'btn-ghost'}" style="flex:1;"
        onclick="setRango('${val}')">${txt}</button>`).join('');
  }

  // --- Totales del rango ---
  const vR = ventas.filter(v=>enRango(v.fecha));
  const cR = compras.filter(c=>enRango(c.fecha));
  const mR = ajustes.filter(a=>a.tipo==='perdida' && enRango(a.fecha));

  const totalVentas = vR.reduce((s,v)=>s+v.total,0);
  const totalGastos = cR.reduce((s,c)=>s+c.monto,0);
  const totalMerma  = mR.reduce((s,a)=>s+valorMerma(a),0);

  document.getElementById('statVentasRango').textContent = fmt(totalVentas);
  document.getElementById('statGastosRango').textContent = fmt(totalGastos);
  document.getElementById('statGananciaRango').textContent = fmt(totalVentas - totalGastos);
  document.getElementById('statMermaRango').textContent = fmt(totalMerma);
  document.getElementById('statMermaCount').textContent =
    mR.length + (mR.length===1 ? ' merma registrada' : ' mermas registradas');

  renderTopProductos(vR);

  // --- Desglose día por día ---
  const dias = {};
  const meter = (fecha, tipo, obj) => {
    if(!dias[fecha]) dias[fecha] = {ventas:[], compras:[], mermas:[]};
    dias[fecha][tipo].push(obj);
  };
  vR.forEach(v=>meter(v.fecha,'ventas',v));
  cR.forEach(c=>meter(c.fecha,'compras',c));
  mR.forEach(a=>meter(a.fecha,'mermas',a));

  const fechas = Object.keys(dias).sort().reverse();
  const wrap = document.getElementById('diasWrap');

  if(fechas.length === 0){
    wrap.innerHTML = '<div class="empty">No hay movimientos en este periodo.</div>';
    return;
  }

  wrap.innerHTML = fechas.map(f=>{
    const dd = dias[f];
    const vend = dd.ventas.reduce((s,v)=>s+v.total,0);
    const gast = dd.compras.reduce((s,c)=>s+c.monto,0);
    const merm = dd.mermas.reduce((s,a)=>s+valorMerma(a),0);
    const abierto = diasAbiertos[f] === true;

    const detalle = !abierto ? '' : `
      <div class="dia-detalle">
        ${dd.ventas.length ? `<div class="dia-seccion">
          <div class="dia-seccion-tit">Ventas</div>
          ${dd.ventas.sort((a,b)=>b.ts-a.ts).map(v=>`
            <div class="list-row">
              <div class="list-main">
                <div class="list-title">${v.items.map(i=>i.cantidad+'x '+escapeHtml(i.nombre)).join(', ')}</div>
              </div>
              <div class="pill">${fmt(v.total)}</div>
              <div style="display:flex; flex-direction:column; gap:5px;">
                <button class="btn btn-ghost btn-sm" onclick="abrirEditarVenta('${v.id}')">Editar</button>
                <button class="btn btn-ghost btn-sm" onclick="cancelarVenta('${v.id}')">Cancelar</button>
              </div>
            </div>`).join('')}
        </div>` : ''}

        ${dd.compras.length ? `<div class="dia-seccion">
          <div class="dia-seccion-tit">Compras</div>
          ${dd.compras.sort((a,b)=>b.ts-a.ts).map(c=>`
            <div class="list-row">
              <div class="list-main">
                <div class="list-title">${escapeHtml(c.insumoNombre||'')}</div>
                <div class="list-sub">${c.cantidad} ${UNIDAD_LABEL[c.unidad]||c.unidad||''}</div>
              </div>
              <div class="pill">${fmt(c.monto)}</div>
            </div>`).join('')}
        </div>` : ''}

        ${dd.mermas.length ? `<div class="dia-seccion">
          <div class="dia-seccion-tit">Merma</div>
          ${dd.mermas.sort((a,b)=>b.ts-a.ts).map(a=>`
            <div class="list-row">
              <div class="list-main">
                <div class="list-title">${escapeHtml(a.productoNombre)}</div>
                <div class="list-sub">${a.cantidad} ${a.motivo ? '· '+escapeHtml(a.motivo) : ''}</div>
              </div>
              <div class="pill" style="background:#FBEAE1;color:#D6482B;">
                ${valorMerma(a) > 0 ? '−'+fmt(valorMerma(a)) : 'sin costo'}
              </div>
            </div>`).join('')}
        </div>` : ''}
      </div>`;

    return `
      <div class="dia-card">
        <button class="dia-header" onclick="toggleDia('${f}')">
          <div>
            <div class="dia-fecha">${fechaBonita(f)}</div>
            <div class="dia-nums">
              <span class="dia-vend">+${fmt(vend)}</span>
              ${gast>0 ? `<span class="dia-gast">−${fmt(gast)}</span>` : ''}
              ${merm>0 ? `<span class="dia-merm">merma ${fmt(merm)}</span>` : ''}
            </div>
          </div>
          <span class="cat-chevron-big">${abierto ? '▾' : '▸'}</span>
        </button>
        ${detalle}
      </div>`;
  }).join('');
}

// Cancela una venta: la borra del historial y REGRESA los insumos al inventario.
// Siempre hay que cancelar desde aquí, no borrando el dato en Firestore: si se
// borra por fuera, la app no puede saber qué insumos devolver.
async function cancelarVenta(ventaId){
  const v = ventas.find(x=>x.id===ventaId);
  if(!v) return;
  const detalle = v.items.map(i=>i.cantidad+'x '+i.nombre).join(', ');
  if(!confirm(`¿Cancelar esta venta?\n\n${detalle}\nTotal: ${fmt(v.total)}\n\nSe regresarán los insumos al inventario.`)) return;

  // Devolver al inventario lo que consumió cada producto según su receta
  moverInsumosPorItems(v.items, +1);

  ventas = ventas.filter(x=>x.id!==ventaId);
  await docRef.set({ventas, insumos}, {merge:true});
  renderAll();
  showToast('Venta cancelada, insumos devueltos');
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

document.getElementById('cobrarBtn').addEventListener('click', abrirCobro);
document.getElementById('confirmarCobroBtn').addEventListener('click', cobrarVenta);
document.getElementById('cobroPago').addEventListener('input', calcularCambio);
document.getElementById('guardarEdicionVentaBtn').addEventListener('click', guardarEdicionVenta);
document.getElementById('closeEditVentaModal').addEventListener('click', ()=>document.getElementById('editVentaModalBg').classList.remove('show'));
document.getElementById('closeCobroModal').addEventListener('click', ()=>document.getElementById('cobroModalBg').classList.remove('show'));
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
document.getElementById('pPrecio').addEventListener('input', renderCostoCalculado);
document.getElementById('agregarOpcionVarBtn').addEventListener('click', agregarOpcionVariante);
document.getElementById('closeVarianteModal').addEventListener('click', ()=>document.getElementById('varianteModalBg').classList.remove('show'));

document.getElementById('dateLabel').textContent = new Date().toLocaleDateString('es-MX', {weekday:'long', day:'numeric', month:'long'});

startListener();
