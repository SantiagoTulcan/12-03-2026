# StorePro — Procurement & Order Management System

A **TypeScript OOP** web application modeled after the procurement flowchart, covering the full cycle:
**Shipping Office → Buyer Agent → Supervisor → Seller → Receive Agent**

---

## 🗂 Project Structure

```
store-procurement-system/
├── src/
│   ├── models/
│   │   └── index.ts          # Entidad, Producto, Usuario, Pedido, Cotizacion, Orden
│   ├── services/
│   │   └── index.ts          # ServicioProcuramiento (business logic)
│   └── controllers/
│       └── index.ts          # ControladorVistas (compiled reference)
├── public/
│   ├── css/
│   │   └── styles.css        # Full design system
│   └── js/
│       └── app.js            # Compiled + browser-ready app
├── index.html                # Main UI
├── tsconfig.json             # TypeScript config
├── package.json
└── store-procurement.code-workspace  # Open this in VS Code
```

---

## 🚀 Getting Started

### Option A: Open directly in browser (no install needed)
1. Unzip the file
2. Double-click `index.html`
3. That's it — the app runs fully in the browser

### Option B: VS Code with TypeScript compilation
1. Open VS Code
2. **File → Open Workspace from File…** → select `store-procurement.code-workspace`
3. Install recommended extensions (VS Code will prompt you)
4. Open terminal and run:
   ```bash
   npm install
   npm run watch      # or Ctrl+Shift+B for build task
   ```
5. Use **Live Server** extension (right-click `index.html` → "Open with Live Server")

---

## 🏗 OOP Architecture

### Classes (Spanish variable names, English logic/comments)

| Class | Role |
|-------|------|
| `Entidad` | Abstract base — `id`, `fechaCreacion`, `_generarId()` |
| `Producto` | Store item with `nombre`, `precio`, `cantidad`, `categoria` |
| `Usuario` | System user with `rol` and `tienePermiso()` |
| `Pedido` | Requisition/RFQ — tracks `estado`, `historial`, `productos` |
| `Cotizacion` | Seller quote linked to a `Pedido` |
| `Orden` | Purchase order from accepted quote — `facturaGenerada`, `pagoRecibido` |

### Service Layer

`ServicioProcuramiento` orchestrates the full workflow:
1. `crearRequisicion()` — Shipping Office creates request
2. `prepararRFQ()` — Buyer Agent sends to seller (optionally via Supervisor)
3. `aprobarSolicitud()` — Supervisor approves/rejects
4. `crearCotizacion()` — Seller submits quote
5. `revisarCotizacion()` — Buyer accepts/rejects quote
6. `crearOrden()` — Buyer creates order from accepted quote
7. `revisarOrden()` — Seller accepts/rejects order
8. `completarOrden()` — Receive Agent confirms delivery

---

## 🖥 UI Views

| View | Description |
|------|-------------|
| **Dashboard** | KPI cards, recent activity, workflow mini-status |
| **Requisitions** | Create & manage RFQs, role-based actions |
| **Quotes** | Submit and review supplier quotes |
| **Orders** | Track orders through fulfillment |
| **Workflow** | Live lane diagram of the full procurement process |
| **Code Editor** | In-app TypeScript source browser |

---

## 🎭 Role Simulation

Use the **Active Role** dropdown in the sidebar to switch roles and see context-sensitive actions:

- **Shipping Office** — create requisitions
- **Buyer Agent** — prepare RFQs, review quotes, create orders
- **Supervisor** — approve/reject requests
- **Seller** — submit quotes, accept/reject orders
- **Receive Agent** — complete deliveries

---

## 📦 Recommended VS Code Extensions

- `esbenp.prettier-vscode` — Code formatting
- `ms-vscode.vscode-typescript-next` — TypeScript support
- `ritwickdey.liveserver` — Local dev server
- `zhuangtongfa.material-theme` or `One Dark Pro` — Theme

---

*All UI text and comments are in English. All variable/class/property names follow Spanish naming conventions.*
