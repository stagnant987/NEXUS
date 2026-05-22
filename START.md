# Lancer NEXUS

## Première installation

```bash
# Terminal 1 — Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

```bash
# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

## Ensuite (juste relancer)

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Ouvrir : http://localhost:5173
