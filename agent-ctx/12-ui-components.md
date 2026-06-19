# Task 12-ui-components — Rebuild 3 lost UI components

## Files created
1. `/home/z/my-project/src/components/app/login-dialog.tsx` — `LoginDialog`
2. `/home/z/my-project/src/components/app/user-menu.tsx` — `UserMenu`
3. `/home/z/my-project/src/components/app/category-manager-dialog.tsx` — `CategoryManagerDialog` (with internal `CategoryFormDialog` + `DeleteCategoryDialog`)

## Approach
- Inspected shared infra: `src/lib/types.ts`, `src/hooks/use-data.ts`, `src/lib/auth.ts`, `src/lib/api-client.ts`, `src/components/app/{app-shell,common,theme-toggle}.tsx`, shadcn primitives (`button`, `dialog`, `alert-dialog`, `dropdown-menu`, `select`, `badge`, `avatar`), and `/api/auth/status` + `/api/categories` routes.
- Used `cn()` from `@/lib/utils` (backed by `twMerge`) so appended `className` overrides variant defaults cleanly — no `!important` needed for destructive AlertDialogAction (used a real `Button variant="destructive"` inside `AlertDialogFooter` so auto-close is disabled and the parent dialog's `open` state controls closing, which lets us await the async mutation before dismissing).
- Google "G" logo is an inline SVG with the 4 standard brand colors (#4285F4 / #34A853 / #FBBC05 / #EA4335).
- French typography: NBSP (`\u00A0`) before `:`, `?`, and `!` in literal text. Used `&nbsp;` HTML entities inside JSX text where the NBSP would otherwise be hard to read in source (e.g. around « » guillemets and before `?`).

## LoginDialog details
- Fetches `/api/auth/status` on mount → stores `googleConfigured: boolean | null` (null = loading).
- When `googleConfigured === true`: renders "Se connecter avec Google" outline button + "ou" divider before the demo accounts.
- Always renders 2 preset demo account buttons (Alex Athlète / Sophie Street Workout) + "Mode démo actif" status pill + "Utiliser un autre compte" ghost button → switches to a custom name/email form ("Continuer" / "Retour").
- When `googleConfigured === false`: shows an info box with `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `.env` code snippets and the dynamic redirect URI (`window.location.origin + "/api/auth/callback/google"`).
- Demo + custom flows call `signIn("google-demo", { email, name, image, redirect: false })`, then `toast.success` + `onOpenChange(false)` + `window.setTimeout(() => window.location.reload(), 300)`.
- Google flow calls `signIn("google", { callbackUrl: "/" })` (default redirect).
- Per-account `Loader2` spinner overlay on the clicked row while pending; whole form disabled while pending.

## UserMenu details
- `useSession()` → `status` drives 3 branches:
  - `"loading"` → `h-9 w-9 animate-pulse rounded-full bg-muted` placeholder.
  - `"unauthenticated"` → outline "Se connecter" button opening a local `<LoginDialog>`.
  - authenticated → avatar button (`<img>` if `user.image`, else `bg-primary text-primary-foreground` initials circle) wrapped in `DropdownMenuTrigger asChild`. Dropdown shows name (bold) + email (muted) in `DropdownMenuLabel`, separator, then a destructive "Se déconnecter" item calling `signOut({ callbackUrl: "/" })`.
- `getInitials()` accepts name or email fallback, handles single-token and multi-token cases, returns uppercase 1-2 chars.
- `aria-label="Menu utilisateur"` on the trigger for screen readers; focus-visible ring on the trigger button.

## CategoryManagerDialog details
- Public `CategoryManagerDialog` renders the list Dialog with a "Nouvelle catégorie" header button, scrollable list (`max-h-80 overflow-y-auto`) of category rows: emoji tile (tinted with `${color}22`), label/name, color dot, Pencil + Trash2 icon buttons.
- Empty state: dashed border box "Aucune catégorie…". Loading state: 3 pulse skeletons.
- "Nouvelle catégorie" / Pencil both open `CategoryFormDialog` (create vs edit mode driven by the `editing` prop).
- `CategoryFormDialog`:
  - Name (internal) Input — **disabled when editing** with `opacity-70` styling + helper text "Non modifiable après création."
  - Label Input.
  - 16-color preset grid (`grid-cols-8`) — each button shows a white `Check` (strokeWidth 3) when selected; `aria-pressed` for a11y.
  - 20-emoji preset grid (`grid-cols-10`) + a 4-char custom emoji Input.
  - Live "Aperçu" badge: tinted emoji tile + colored Badge (`style={{ backgroundColor: color, color: "#ffffff" }}`) showing the label/name.
  - Footer: "Annuler" outline + "Créer"/"Enregistrer" primary with `Loader2` while pending.
- `DeleteCategoryDialog`:
  - `AlertDialog` with title "Supprimer « X » ?" and description "Les exercices de cette catégorie seront réaffectés…".
  - Select to pick reassignment target (defaults to first other category). If no other categories exist, shows an amber warning instead.
  - Footer: `AlertDialogCancel` "Annuler" + `Button variant="destructive"` "Supprimer" (real Button so we can await the mutation; closing happens via parent `onOpenChange(false)` on success).

## Verification
- `bunx eslint src/components/app/{login-dialog,user-menu,category-manager-dialog}.tsx` → **0 errors, 0 warnings**.
- `bunx tsc --noEmit` → **0 errors in the 3 new files**. Remaining TS errors in the repo are all pre-existing and unrelated (next-auth v4 vs v5 type mismatches in API routes + `auth.ts`, and `CATEGORIES`/`CATEGORY_META` import issues in `exercises-view.tsx`).
- `bun run lint` (project-wide) → **clean**.
- Dev server log: initial "Module not found '@/components/app/user-menu'" was emitted by `app-shell.tsx` *before* my Write completed (the file is expected by `app-shell.tsx`); after the write, subsequent compiles report `✓ Compiled in 129ms` with no errors related to my files. The only remaining dev.log noise is a pre-existing Prisma `Unknown argument 'userId'` runtime error in `/api/workouts` and `/api/stats/top-exercises` — outside this task's scope.

## Clean compile: **yes**
