---
name: commit
description: Commit work in the attendance-app monorepo (web/ Next.js, mobile/ Flutter, supabase/migrations) as clean, logically grouped Conventional Commits. Use this whenever the user asks to commit, save or checkpoint their work, "make commits", clean up uncommitted changes, write a commit message, or asks what's uncommitted and wants it committed — even if they just say "commit this" or "/commit". Handles large backlogs by splitting them into one commit per feature, keeps migrations with the code that uses them, and keeps secrets and junk files out of history. Commits locally only; never pushes.
---

# Committing in attendance-app

The goal is a git history someone can read later and understand: each commit is one coherent change (a feature, a fix, a cleanup), its message says what changed and why, and nothing that shouldn't be in a public repo gets in. The remote is a GitHub repo, so anything committed is effectively published once the user pushes.

This repo has a history of large gaps between commits (one gap was months long, with 100+ files changed), so expect to be untangling a backlog, not just committing one tidy change.

## 1. Survey what changed

```bash
git status --short
git diff --stat
```

`git status --short` collapses brand-new directories into one line (e.g. `?? web/components/sessions/`). Expand those to real files with `git ls-files --others --exclude-standard <dir>`, because you need the actual file list to group commits.

Then understand the changes before grouping them: read `git diff <file>` for modified files and skim new files. Commit messages written from file names alone ("update sessions.ts") are useless; you need to know *what* the change does to describe it.

## 2. Keep out what doesn't belong

Never stage these, even if they show up as untracked:

| Path / pattern | Why |
|---|---|
| `.env*` anywhere (e.g. `web/.env.local`) | Credentials. `.env.example` with placeholder values is fine. |
| `web/supabase/` | Stray folder from running the Supabase CLI inside `web/`. The real migrations are in the root `supabase/migrations/`. |
| `.DS_Store`, `*.log`, `*.apk`, `*.tsbuildinfo` | OS/build junk. |
| `node_modules/`, `web/.next/`, `mobile/build/`, `mobile/.dart_tool/` | Build output and dependencies. |
| `.claude/settings.local.json` | Personal, machine-specific settings. |
| Scratch/test files you or the user created while debugging | Not part of the product. |

If a file looks like it might hold a secret (keys, tokens, `service_role`, `sb_secret_`, JWT secrets, Twilio auth tokens), open it and check before staging. Placeholder values and `env(...)` references are fine; real values are not. `supabase/config.toml` is safe to commit when its secrets use `env(...)`.

If junk shows up as untracked only because `.gitignore` doesn't cover it, add the pattern to the appropriate `.gitignore` and make that its own first commit (`chore: ignore …`). Note: the root `.gitignore` has been broken before (it contained only `gi`), so check it rather than assuming it works.

Tell the user about anything you deliberately left uncommitted, so it isn't silently forgotten.

## 3. Group into logical commits

One commit = one thing a teammate could describe in a sentence. Group by feature or fix, not by folder:

- **A migration goes in the same commit as the code that needs it.** If `014_location_constraint.sql` adds columns that `web/actions/sessions.ts` and `mobile/lib/services/attendance_service.dart` start using, all three land together. Checking out that commit should give a working app plus the schema it expects.
- **Shared files follow the feature that changed them.** A field added to `web/types/index.ts` for the location feature goes in the location commit. If one file has edits for two features, put it with the feature it matters most to and mention the other in the body (splitting hunks non-interactively isn't worth the risk).
- **Cleanups and deletions are their own commits.** E.g. removing the unused `backend/` NestJS starter, `.gitignore` fixes, dependency bumps.
- **Order commits so the history builds forward:** lower-numbered migrations before higher ones, and a feature before the follow-up fix to it.

With a big backlog, use migration numbers and file names as clues to the order features were built, then confirm by reading the diffs.

**Before committing more than one commit, show the user the plan and wait for an OK.** List each commit's message and files, plus anything you're leaving out. Grouping is a judgment call and it's their history. For a single small, obviously-coherent change, just commit it.

## 4. Write the message (Conventional Commits)

```
<type>(<scope>): <summary>

<body: what changed and why, wrapped at ~72 chars>

<trailer>
```

- **type:** `feat` (new capability), `fix` (bug fix), `refactor`, `chore` (tooling, ignores, deps, removals), `docs`, `test`, `style`.
- **scope:** where it lives: `web`, `mobile`, `db`. For a change spanning several, list them (`feat(web,mobile,db): …`). Omit the scope for repo-wide chores.
- **summary:** imperative ("add", not "added"), lowercase after the colon, no trailing period, under ~72 characters. Say what a user or developer gets, not which files moved.
- **body:** the *why*, plus anything non-obvious: migrations included (by number), behavior changes, known limitations. Skip the body only for truly trivial commits.
- **trailer:** if the environment specifies a `Co-Authored-By` attribution line for commits, end the message with it exactly as given.

Good examples from this project:

```
feat(web,mobile,db): add optional location constraint for sessions

Teachers can require check-ins within a radius of a point picked on a
map or taken from their current location. check_in() now validates the
student's coordinates with a haversine distance check and rejects scans
outside the radius. The mobile app sends GPS with each scan.

Includes migration 014_location_constraint.sql.
```

```
fix(db): evaluate fixed check-in window in the course's timezone

fixed_check_in() compared scheduled times against the database clock,
which runs in UTC, so a 4:00 PM class in Asia/Jerusalem was checked 3
hours off. Courses now store an IANA timezone captured from the
teacher's browser, and all date/time math happens in that zone.

Includes migration 018_course_timezone.sql.
```

```
chore: remove unused backend/ NestJS starter
```

Avoid messages like `fix`, `mm`, `update files`, or `wip`. The existing history has a few of these, and they make it impossible to find anything later.

Pass multi-line messages with a heredoc so formatting survives:

```bash
git commit -m "$(cat <<'EOF'
feat(web): add map picker for session location

Body here.
EOF
)"
```

## 5. Stage and commit safely

- Stage by explicit path: `git add path/one path/two`. Avoid `git add -A` / `git add .`; they sweep in exactly the junk from step 2.
- Deleted files: `git add path/to/deleted` (or `git rm path`) stages the deletion.
- Before each commit, run `git diff --cached --stat` and confirm the staged set matches the plan.
- Let git hooks run. If a hook fails, fix the cause and make a new commit attempt. Don't use `--no-verify`, and don't `--amend` (a failed commit didn't happen, so amending would rewrite the *previous* commit).
- Don't amend, rebase, reset, or otherwise rewrite existing commits unless the user explicitly asks.
- **Don't push.** Committing is local and reversible; pushing publishes. Leave pushing to the user.

Optional but helpful: if the commit touches `web/`, run `npx tsc --noEmit` there; if it touches `mobile/`, run `flutter analyze`. Report failures to the user, noting whether they're new or pre-existing, and don't block on pre-existing ones.

## 6. Report back

Finish with a short summary:
- Each commit created: short hash and subject (`git log --oneline -n <count>`).
- Anything left uncommitted and why (secrets, junk, files you weren't sure about).
- A reminder that nothing was pushed, so the user knows they still need to push when ready.
