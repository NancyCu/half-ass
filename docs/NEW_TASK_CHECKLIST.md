# New Task Checklist

## 1. Branch

```bash
cd /Users/michaelnguyen/RunningApps/Half_Ass_Training
git status --short --branch
git switch -c codex/<short-task-name>
```

## 2. Identify Surface

- Frontend:
- Training data:
- Progress/localStorage:
- Settings/date math:
- Garmin helper:
- Styling/PWA:
- Tests:
- Deployment:

## 3. Preserve Core Flows

- Dashboard today workout remains clear.
- Calendar/plan views still show the current week and full plan.
- Workout detail sheet opens from Dashboard, Calendar, and Progress.
- Complete/skip/modify, notes, flags, and manual runs persist.
- Garmin copy/open remains available.
- Settings can adjust Week 1 and align to race date.
- Export/import progress still works.
- Dark and print themes remain usable.

## 4. Verify

```bash
npm run lint
npm run build
```

For UI changes:

```bash
npm run dev
```

Check mobile width when possible.

## 5. Commit

```bash
git status --short
git diff --stat
git add <task-files>
git commit -m "<message>"
```

Only stage task files. Leave unrelated dirty work alone.
