# Frontend

React 18 + TypeScript + Vite application.

## Quick Start

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Production build
npm run lint       # Check code quality
```

## Tech Stack

- React 18 with TypeScript 5.6
- Vite 5 (build tool)
- Tailwind CSS 3.4
- Axios (HTTP client)
- React DnD (drag-and-drop)

## Structure

```
src/
├── components/      # UI components
├── contexts/        # State management (Context + useReducer)
├── services/        # API client
├── types/           # TypeScript definitions
└── utils/           # Helper functions
```

## Environment Configuration

```bash
# .env file (create from .env.example)
VITE_API_BASE_URL=https://your-api-gateway-url.com/prod/
VITE_COGNITO_USER_POOL_ID=us-west-2_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=us-west-2
```

## Code Quality

```bash
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix issues
npm run format       # Prettier format
```

## State Management

- **DatasetContext** - Places dataset
- **ItineraryContext** - Itinerary CRUD + auto-save
- **FilterContext** - Search/filter state
- **UIContext** - Modal controls

## Build Configuration

- **TypeScript**: Strict mode, ES2020 target
- **Vite**: Code splitting, tree shaking, minification
- **Tailwind**: JIT mode, purge unused CSS
