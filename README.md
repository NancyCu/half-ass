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

The bottom navigation includes a `StrideSync` item so users can return to the StrideSync Training tab. Configure the destination with `VITE_STRIDESYNC_URL`.

For production deploys, set the return link to the hidden StrideSync Training tab:

```bash
VITE_STRIDESYNC_URL=https://mikerun.web.app/?trainingTab=1
```

Half_Ass_Training remains the working standalone training app for now, but the bottom-nav StrideSync item should land users directly in the hidden StrideSync Training tab while that migration surface is being tested.

For mobile local testing of the hidden StrideSync Training shell, set:

```bash
VITE_STRIDESYNC_URL=http://YOUR_MAC_LAN_IP:5173/?trainingTab=1
```

When `VITE_STRIDESYNC_URL` is not set, local development falls back to:

```text
http://localhost:5173/?trainingTab=1
```

That localhost fallback only works when Half_Ass_Training and StrideSync are opened on the same computer. On an iPhone, `localhost` points to the phone, not the Mac, so mobile local testing should use the Mac LAN IP in `.env.local`.

Example `.env.local`:

```bash
VITE_STRIDESYNC_URL=http://192.168.1.45:5173/?trainingTab=1
```

For local mobile testing, run StrideSync on the network port and run Half_Ass_Training on a separate port, for example:

```bash
cd /Users/michaelnguyen/RunningApps/StrideSync
npm run dev:network:5173

cd /Users/michaelnguyen/RunningApps/Half_Ass_Training
npm run dev -- --host 0.0.0.0 --port 5174
```

Then open Half_Ass_Training from the phone at the Mac LAN IP and Half_Ass port, such as `http://192.168.1.45:5174`.

## Project Rules And Regression Guardrails

Before starting new work, read:

- `AGENTS.md`
- `docs/APP_AUDIT_SUMMARY.md`
- `docs/REGRESSION_GUIDELINES.md`
- `docs/NEW_TASK_CHECKLIST.md`
