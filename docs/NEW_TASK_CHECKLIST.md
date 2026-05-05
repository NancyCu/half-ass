# New Task Checklist

## 1. Branch

```bash
cd /Users/michaelnguyen/Half_Ass_Training
git status --short --branch
git switch -c codex/<short-task-name>
```

If this folder is not yet a git repository, initialize or clone it first.

## 2. Identify Surface

- Frontend:
- Data:
- Persistence:
- Styling:
- PWA:
- Tests:
- Deployment:

## 3. Preserve Core Flows

- Dashboard today workout remains clear.
- Workout detail sheet opens from Plan and Progress.
- Mark complete, skip, modify, notes, and flags persist.
- Garmin copy/open remains available.
- Settings can adjust Week 1 and align to race date.
- Export/import progress still works.

## 4. Verify

```bash
npm run lint
npm run build
```

For UI changes, run the dev server and check mobile width.

## 5. Commit

```bash
git status --short
git diff --stat
git add <task-files>
git commit -m "<message>"
```
