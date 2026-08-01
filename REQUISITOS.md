# El Reventón del Sabor — Requisitos del sistema

Punto de venta e inventario para un puesto de elotes y botanas.
Documento de referencia: describe qué debe hacer la app y cómo está construida.

---

## 1. Contexto del negocio

- Puesto de elotes y botanas afuera de casa, atendido por sus dueñas.
- Negocio pequeño, principiante. Prioridad: **que sea fácil de usar y no cueste dinero**.
- Se usa desde **varios dispositivos** (celulares y computadora) y todos deben ver **los mismos datos**.
- Requiere internet (se decidió sacrificar el modo sin conexión a cambio de la sincronización).

## 2. Restricciones que se decidieron

| Decisión | Motivo |
|---|---|
| Costo $0 | No gastar ni un peso |
| Sin dominio propio | GitHub Pages da hosting gratis |
| Sin necesidad de cuenta para las usuarias | Se descartó publicar en Claude porque pedía iniciar sesión |
| HTML + CSS + JS separados, sin frameworks | Fácil de mantener y de subir; no requiere compilar |
| Base de datos abierta (sin contraseña) | Simplicidad; el riesgo se aceptó porque el link no es público |

## 3. Arquitectura

```
index.html    → estructura de la página
estilos.css   → todo el diseño
app.js        → toda la lógica (ventas, inventario, insumos, Firebase)
```

- **Hosting:** GitHub Pages → `https://jesus-aispuro.github.io/reventon-del-sabor/`
- **Base de datos:** Firebase Firestore (proyecto `reventon-del-sabor`)
- **Dónde viven los datos:** colección `puesto` → documento `data`, con los campos
  `productos`, `insumos`, `ventas`, `compras`, `ajustes`.
- La app escucha cambios en tiempo real: si alguien vende en un celular, los demás
  dispositivos se actualizan solos.

### Control de caché (importante)
`index.html` carga los archivos con `?v=NÚMERO`. **Cada vez que se modifique
`app.js` o `estilos.css` hay que subir ese número** (v=4 → v=5), o los navegadores
seguirán usando la versión vieja guardada y la app se romperá de formas raras.

## 4. Pantallas y funciones

### Vender
- 4 categorías en tarjetas grandes de color: **Elotes, Botanas, Bebidas, Extras**.
- Cerradas al abrir; al tocar una se abre y se cierran las demás (acordeón).
- Se cierran todas al terminar una venta.
- Barra fija abajo, **siempre visible**, con número de productos y total.
  Al tocarla se despliega el detalle con botones + / − y el botón Cobrar.
- Al cobrar: si el producto tiene receta, **se descuentan sus insumos**
  (esto ocurre sin mostrarse en pantalla).

### Variantes
Un producto puede venderse con distintas botanas sin duplicarlo en el menú.
Se configura en Inventario → Menú → Editar → **Variantes**: se elige qué insumo
de la receta cambia (ej. Tostitos verdes) y se agregan las alternativas
(Doritos, Cheetos, Takis...).

Al vender, la app pregunta cuál se usó y descuenta **esa** botana, no la original.
En el ticket queda como "Tostilocos (Doritos Flamin Hot)".

### Buscadores
Hay búsqueda por nombre en: lista del menú, lista de insumos, selector de insumo
en Compras, y los dos selectores dentro del editor de producto (receta y variantes).

## Regla importante: el código NO administra el catálogo

El menú y los insumos escritos en `app.js` son **solo la carga inicial**: se usan
una única vez, cuando la base de datos está completamente vacía. A partir de ahí
el catálogo lo administran las dueñas desde la app y **el código nunca lo sobrescribe**.

Antes existía una `DATOS_VERSION` que al subirla reemplazaba todo el catálogo. Se
eliminó porque habría borrado el trabajo de las dueñas.

### Inventario
Dos pestañas:
- **Menú** — productos que se venden (nombre, categoría, precio, costo y su
  **receta**: qué insumos consume y cuánto). Solo botón Editar.
  **Los productos del menú NO tienen existencia propia**: se preparan al momento,
  así que lo único inventariado son los insumos.
- **Insumos** — ingredientes crudos, agrupados en 4 categorías plegables:
  - Frutas y verduras
  - Salsas y condimentos
  - Abarrotes y empaquetados
  - Desechables y bebidas

  Cada insumo tiene una **unidad fija**: pieza, gramos o mililitros.

### Compras
- Se elige el insumo de una lista; el campo de cantidad se adapta a su unidad
  (elote → piezas, mayonesa → gramos).
- Al guardar, **aumenta el stock de ese insumo** y queda el gasto registrado.

### Resumen
- Vendido y gastado **hoy**.
- Ventas, gastos y ganancia **de todo el tiempo**.
- **Merma**: cuántas hoy, cuántas en total, y las más recientes.
- Últimas ventas, cada una con botón **Cancelar**.

### Cancelar una venta
Se hace desde Resumen → Cancelar. Eso borra la venta **y regresa los insumos**
al inventario según la receta.

⚠️ **Nunca borrar ventas directo en Firestore.** Si se borra por fuera, la app no
tiene forma de saber qué insumos devolver y el inventario queda descuadrado
(hay que corregirlo a mano con "Ajuste a favor").

### Ajustes y merma
Solo sobre **insumos** (los productos del menú no tienen existencia). Dos tipos:
- **Merma / pérdida** — se tiró o se echó a perder (resta del stock).
- **Ajuste a favor** — había más de lo que marcaba el sistema (suma al stock).

Ambos quedan registrados con fecha, cantidad y motivo.

## 5. Reglas de negocio acordadas

- **Rendimiento del elote** (medido por las dueñas): un vaso chico ocupa entre 1 y 2
  elotes, un vaso grande entre 2 y 2.5. Se usa el promedio:
  - Vaso chico = **1.75 elotes**
  - Vaso grande = **2.25 elotes**

  Se decidió medir en fracciones de elote y no en gramos, porque las dueñas sirven
  al tanteo y pedirles pesar cambiaría su forma de trabajar.
- Las fechas usan la **hora local del dispositivo**, no UTC. Si se usara UTC, todo lo
  vendido después de las 5 PM en Tijuana se contaría como del día siguiente.
- Un producto **sin receta** funciona normal, solo que no descuenta insumos. Esto
  permite ir cargando las recetas poco a poco sin romper nada.

## 6. Pendientes / ideas a futuro

**Faltan datos que las dueñas deben confirmar:**
- **Existencia de 6 insumos** que las recetas usan pero no venían en la lista, y
  quedaron en 0: Elote, Limón, Pepino, Jícama, Salsa macha y Bolsas.
- **Pepino, jícama y limón se manejan en gramos**, porque las dueñas los compran
  por kilo. Al registrar la compra de un kilo se capturan 1000 g.
- **Precio de 6 productos** que quedaron en $0: Churros locos (32 oz),
  Nachos con elote, Cochinada, Machicochinada, Arizona y Capri-Sun.
- **Coca-Cola 300 ml** aparecía en el menú del puesto pero no en el inventario;
  se quitó del menú. Si la siguen vendiendo, hay que darla de alta como insumo y producto.
- Las cantidades de las recetas son **estimaciones**, no medidas exactas. Conviene
  compararlas contra el consumo real de una semana y corregirlas.
- Insumos en la lista que hoy no usa ninguna receta: Doritos rojos, Takis Fuego,
  Chimichangas, Charola plana. Falta saber en qué producto entran.

**Ideas a futuro:**
- Roles de usuario (empleada solo vende / dueña ve reportes y edita precios),
  usando Firebase Authentication.
- Reportes por semana o por producto más vendido.
- Aviso automático cuando un insumo esté por agotarse.

## 7. Cómo publicar un cambio

1. Subir el archivo modificado al repositorio en GitHub.
2. Si se cambió `app.js` o `estilos.css`, subir el número de versión en `index.html`
   (`?v=4` → `?v=5`) y subir también ese archivo.
3. Esperar 1–2 minutos: GitHub Pages tarda en publicar.
4. Recargar la página.
