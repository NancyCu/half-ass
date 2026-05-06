# Shared Run System Contracts

Phase 1 keeps the running-system contracts copied inside each existing app repo instead of creating a parent repo, monorepo, shared package, or fourth app.

This repo's copy lives at `src/shared/run-system-types.ts`. It is contract-only and is not imported into runtime code yet. The copied contract may become a real shared package later, but only after Garmin activity export/import and training-plan export/import flows are proven safely.
