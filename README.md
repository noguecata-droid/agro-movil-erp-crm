# Agro Móvil ERP & CRM

Sistema web ERP/CRM para **Plantas de Empaque Agroexportador Móviles y Contenedorizadas** bajo modelo **IaaS**.

- **Modelo de negocio:** sin inversión inicial para el agricultor. Se cobra **$0.15 por kilogramo procesado**.
- **CRM:** registro de agricultores (nombre, ubicación en Carchi/Santo Domingo, producto).
- **ERP:** gestión de contenedores Reefer de 40 pies, registro de lotes de kilos procesados y cálculo automático del cobro a $0.15/kg.
- **Stack:** Node.js, Express, SQLite (backend) y HTML + Tailwind CSS (CDN) en el frontend.

## Requisitos

- Node.js 18+ y npm

## Instalación

```bash
npm install
```

> Nota: el paquete `sqlite3` puede requerir herramientas de compilación en algunos sistemas. Si falla la instalación, asegúrate de tener Python y build tools disponibles, o usa una versión de Node con binarios precompilados compatibles.

## Ejecución

```bash
npm start
```

Luego abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Estructura

- `server.js` — servidor Express y API REST
- `db.js` — inicialización y conexión SQLite (`data.sqlite` se crea automáticamente)
- `public/index.html` — interfaz web (Dashboard, CRM, ERP)
- `package.json` — dependencias y scripts

## API principal

- `GET/POST /api/farmers` — agricultores
- `GET/POST /api/containers` — contenedores Reefer 40 pies
- `GET/POST /api/lots` — lotes procesados (calcula `total_cobro = kilos * 0.15`)
- `GET /api/summary` — métricas y resumen por ubicación
