# Iron Loot - Web Frontend

Frontend de la plataforma de subastas Iron Loot.

## 🛠️ Desarrollo Local

Para desarrollar el frontend localmente pero conectándose a la API en Docker/Cloud:

1.  **Crear archivo `.env`**:
    ```bash
    VITE_API_URL=http://localhost:3000  # URL de la API (Docker host)
    PORT=5173                          # Puerto local del frontend
    ```

2.  **Iniciar en modo desarrollo**:
    ```bash
    npm run start:dev
    ```

    Esto levanta el servidor NestJS con un **Proxy configurado** para redirigir llamadas `/api/*` y `/v1/*` hacia la `VITE_API_URL` definida.

## Estructura
...

```
web/
├── public/                          # Archivos estáticos
│   ├── css/
│   │   ├── base/                    # Estilos base
│   │   │   ├── variables.css        # Variables CSS (colores, spacing, etc.)
│   │   │   ├── reset.css            # CSS Reset
│   │   │   └── typography.css       # Tipografía
│   │   │
│   │   ├── components/              # Componentes reutilizables
│   │   │   ├── buttons.css
│   │   │   ├── forms.css
│   │   │   ├── cards.css
│   │   │   ├── tables.css
│   │   │   └── modals.css
│   │   │
│   │   ├── layout/                  # Layout
│   │   │   ├── navigation.css
│   │   │   ├── sidebar.css
│   │   │   └── footer.css
│   │   │
│   │   └── pages/                   # Estilos por página
│   │       ├── auth.css
│   │       ├── home.css
│   │       ├── dashboard.css
│   │       ├── auctions.css
│   │       ├── auction-detail.css
│   │       └── wallet.css
│   │
│   ├── js/
│   │   ├── core/                    # Core scripts
│   │   │   ├── utils.js             # Utilidades
│   │   │   ├── api-client.js        # Cliente API
│   │   │   └── auth.js              # Gestión de autenticación
│   │   │
│   │   ├── components/              # Componentes JS
│   │   │   ├── navigation.js
│   │   │   ├── sidebar.js
│   │   │   └── modals.js
│   │   │
│   │   └── pages/                   # Scripts por página
│   │       ├── auth.js
│   │       ├── home.js
│   │       ├── dashboard.js
│   │       ├── auctions.js
│   │       ├── auction-detail.js
│   │       └── wallet.js
│   │
│   └── assets/
│       ├── images/
│       └── fonts/
│
├── views/                           # Templates HTML
│   ├── layouts/                     # Layouts base
│   │   ├── base.html                # Layout raíz
│   │   ├── main.html                # Layout con nav + sidebar
│   │   └── auth.html                # Layout para autenticación
│   │
│   ├── partials/                    # Componentes reutilizables
│   │   ├── navigation.html
│   │   ├── sidebar.html
│   │   ├── sidebar-content.html
│   │   └── footer.html
│   │
│   └── pages/                       # Páginas
│       ├── auth/
│       │   ├── login.html
│       │   ├── register.html
│       │   └── recovery.html
│       ├── home.html
│       ├── dashboard.html
│       ├── wallet.html
│       └── auctions/
│           ├── list.html
│           └── detail.html
│
└── README.md
```

## Sistema de Layouts

### base.html
Layout raíz con:
- `<head>` común (CSS, fonts, icons)
- Scripts comunes al final
- Blocks: `title`, `styles`, `body`, `scripts`

### main.html (extiende base.html)
Para páginas autenticadas con:
- Navegación superior
- Sidebar lateral
- Footer

### auth.html (extiende base.html)
Para páginas de autenticación con:
- Panel decorativo izquierdo
- Formulario derecho
- Sin navegación

## API Client

```javascript
// Autenticación
await Api.auth.login(email, password);
await Api.auth.logout();

// Subastas
const auctions = await Api.auctions.list({ status: 'ACTIVE' });
await Api.auctions.placeBid(auctionId, amount);

// Wallet
const balance = await Api.wallet.getBalance();
await Api.wallet.deposit(amount, referenceId);
```

## Páginas Implementadas

| Página | Ruta | Layout |
|--------|------|--------|
| Home | `/` | base + nav |
| Login | `/login` | auth |
| Register | `/register` | auth |
| Recovery | `/recovery` | auth |
| Dashboard | `/dashboard` | main |
| Subastas | `/auctions` | main |
| Detalle Subasta | `/auctions/:id` | main |
| Wallet | `/wallet` | main |

## CSS Variables

Ver `public/css/base/variables.css` para:
- Colores (primary, success, error, etc.)
- Tipografía (tamaños, pesos)
- Espaciado
- Border radius
- Sombras
- Z-index
- Transiciones

## Integración con Backend

El API Client (`public/js/core/api-client.js`) se comunica con el backend NestJS:
- Gestión automática de tokens JWT
- Auto-refresh cuando expira
- Queue de requests durante refresh
- Manejo centralizado de errores