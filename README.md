# 80/20 Half Marathon Training PWA

A mobile-first Vite + React + TypeScript PWA for a 15-week 80/20 half marathon plan. The first screen answers: what am I running today, how hard, and what pace?

## Run It

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run build
```

## StrideSync Link

The bottom navigation includes a `StrideSync` item so users can return to the StrideSync Training tab. Configure the destination with:

```bash
VITE_STRIDESYNC_URL=https://your-stridesync-url.example/?trainingTab=1
```

When `VITE_STRIDESYNC_URL` is not set, local development falls back to:

```text
http://localhost:5173/?trainingTab=1
```

## Project Rules And Regression Guardrails

Before starting new work, read:

- `AGENTS.md`
- `docs/APP_AUDIT_SUMMARY.md`
- `docs/REGRESSION_GUIDELINES.md`
- `docs/NEW_TASK_CHECKLIST.md`
