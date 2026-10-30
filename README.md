# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Debug & preview tools

Dev-only aids for previewing UI states without waiting for the real conditions
(a broken streak, a returning visitor, a new changelog entry, …). They're wired
into the client only and touch nothing persistent unless noted. Three kinds:
**URL params**, **console helpers**, and **Pinia store debug methods**.

> Preview params fire once, on the initial full page load. In-app (SPA)
> navigation won't re-trigger them — reload the page with the param.

### URL preview params

Append to any page URL, e.g. `http://localhost:3000/?showStreakFreeze`.

| Param | Shows |
| --- | --- |
| `?showChangelog` / `?showChangelog=all` | "What's New" modal — latest entry / every entry. Loads the real entries from `public/changelog.json`, bypasses the "last seen" check, and is side-effect-free (won't mark them seen). |
| `?showStreak=day` / `?showStreak=week` | Streak-increase modal (the animated dot strip). |
| `?showStreakFreeze` | "Streak broken" freeze-offer modal + the bottom "Save your streak" bar. |
| `?showStreakSaved=31` | "Streak saved!" celebration, counting up to the given number. |
| `?showOnboarding=1` / `?showOnboarding=N` | Onboarding flow — force open / jump to step `N`. |
| `?showNotificationsPrompt=1` | Notifications-permission prompt modal. |
| `?showRefresh=1` | Day-refresh overlay. |
| `?showUpdate=1` | New-version update banner. |
| `?mockFeatured=1` | Fake "Most played" / "Played last visit" featured panel (not persisted). |
| `?mockStatus=1` | Fake started / in-progress / completed states across the whole archive (not persisted). |
| `?showTour=1` | Home feature tour. |
| `?debug=taste` / `?debug=off` | Taste-model debug panel: per-puzzle score breakdown, confidence, difficulty leans, nudge status, and sample players held in memory only. English-only by design. |

### Styling previews (`?preview=`)

Forces a UI state with demo data so it can be styled. Combine them comma-separated (`?preview=welcome,announcement`), use `?preview=all` for everything, and `?preview=off` to clear. The choice lasts for the browser tab session. Preview buttons never write real settings.

| Value | Where | Shows |
| --- | --- | --- |
| `welcome` | Home | The first-visit welcome banner. |
| `nudge-level` | Home | The "ready to try the next level?" nudge, with a sample level. |
| `level-toast` | Home | The level-change toast. |
| `recap-card` | Home | The monthly Wrapped banner (demo data when last month is empty). |
| `announcement` | Home | The new-puzzle announcement panel, even before its puzzles exist. |
| `challenges` | Home, puzzle covers | Every challenge card state with demo data. Its buttons do nothing. |
| `banner-free` / `banner-used` | Any page | The login-gate banner, with free plays left / used up. |
| `gate-used` | Any page | Opens the "free play used" sign-in gate once. |
| `wrapped` | Any page | Opens the Wrapped slides (demo data when last month is empty). |
| `wrapped-perfect` | Any page | Opens the Wrapped slides with the demo month even when you have real play, so the Perfect month slide shows. |
| `profile-modal` | Any page | Opens the player-profile reveal with a sample profile. |
| `profile-toast` | Any page | The "your profile has changed" toast. |
| `reset` | Account | Enables "Remove all" under what we've learned about you (it does nothing). |
| `cover-last` | Puzzle cover | The Last time panel with demo stats. Open a puzzle you haven't started. |
| `assist-offer` | Crossword puzzle | The cover's offer of less help. |
| `assist-modal` | Crossword puzzle | Opens the help-feedback modal. |
| `letter-picker` | Crossword puzzle | The letter-picker step, at level 4. |
| `friends-welcome` | Friends | The no-leagues welcome screen, even when you have leagues, signed in or not. |
| `install-prompt` | Any | The iOS Add to Home Screen modal, on any device. |
| `friends-leagues` | Friends | Sample leagues, one per league card state (data in `app/lib/friendsPreview.js`). Open it signed in so the cards know which are yours. Their links lead nowhere. |
| `friends-members` | League Manage page | Sample players: two members, a pending request and a declined one. Their buttons do nothing. |

### Console helpers (`window.__…`)

Every preview param has a matching pair you can call from the browser console —
handy for re-triggering without a reload:

| Show | Hide |
| --- | --- |
| `__showChangelog()` · `__showChangelog('all')` | `__hideChangelog()` |
| `__showStreak(type, prev, next)` e.g. `__showStreak('day', 6, 7)` | `__hideStreak()` |
| `__showStreakFreeze()` | `__hideStreakFreeze()` |
| `__showStreakSaved(n)` | `__hideStreakSaved()` |
| `__showStreakToast(name, count)` — fire the "streak extended" toast | — |
| `__showOnboarding(step?)` | `__hideOnboarding()` |
| `__showNotifPrompt()` | `__hideNotifPrompt()` |
| `__showRefresh()` | `__hideRefresh()` |
| `__showUpdate()` | `__hideUpdate()` |
| `__mockFeatured()` | `__clearMockFeatured()` |
| `__mockPlayStatus()` | `__clearMockPlayStatus()` |
| `__preview('welcome,announcement')` · `__preview()` for all | `__preview('off')` |
| `__startTour()` | — |
| `__debugTaste()` | `__debugTaste(false)` |

### Store debug methods

Some helpers live on the Pinia stores. Grab a store handle first:

```js
const provides = document.querySelector('#__nuxt').__vue_app__._context.provides;
const pinia = provides[Object.getOwnPropertySymbols(provides).find(s => s.toString() === 'Symbol(pinia)')];
const challenges = pinia._s.get('challenges');   // also: 'playStatus', 'auth', 'modalStore', 'toast', 'preferences', …
```

Challenges store (streaks + challenges):

| Method | Effect |
| --- | --- |
| `challenges.debugStreakStep()` | Extend the day streak by one day (stamps a completion on the first missing day). |
| `challenges.debugBreakStreak(priorDays = 8)` | Stage a "streak just broke" scenario (a run ending the day before yesterday, yesterday empty) so the streak-freeze offer fires on next load. **Destructive** to today's/yesterday's completions. |
| `challenges.debugClearFreeze()` | Clear all freeze state (`frozenDays` / `freezeOffer` / `lastFreezeAt`). |
| `challenges.debugVariantStreak(variant, days = 5)` | Fake a per-variant streak so completed cards show the streak chip. |
| `challenges.debugClearVariantStreaks()` | Remove all faked per-variant streaks. |
| `challenges.debugAdvance('daily' \| 'weekly')` | Fake a completion that advances the active daily/weekly challenge by one. |
| `challenges.debugReset()` | Wipe the completion log. |

### End-to-end: streak freeze

1. `challenges.debugBreakStreak(8)` then **reload** → the "Streak broken" modal and the bottom "Save your streak" bar appear.
2. Complete 3 puzzles today to earn it — or simulate:
   ```js
   ['sudoku','crossword','kakuro'].forEach((v,i) => challenges.recordCompletion('freeze-test-'+i, v, {timeSec: 60}));
   ```
   → freeze earned, "Streak saved!" modal, and the bridged day turns blue on the streak chart.
3. Reset when done:
   ```js
   challenges.completions = challenges.completions.filter(c => !String(c.slug).startsWith('freeze-test-') && !String(c.slug).startsWith('_debug-break-'));
   challenges.debugClearFreeze();
   ```

### Streak number on cards + streak toast

Fire the toast: `window.__showStreakToast('Sudoku', 5)`.

Light up every visible card with a completed streak chip (marks today's cards
completed in memory + fakes a 5-day per-variant streak):

```js
(async () => {
  const P = document.querySelector('#__nuxt').__vue_app__._context.provides;
  const pinia = P[Object.getOwnPropertySymbols(P).find(s => s.toString() === 'Symbol(pinia)')];
  const challenges = pinia._s.get('challenges'), playStatus = pinia._s.get('playStatus'), auth = pinia._s.get('auth');
  if (auth && !auth.user) auth.user = { uid: 'mimic', displayName: 'Test' };
  const bySlug = (await fetch('/archive.json').then(r => r.json())).puzzles || {};
  const map = { ...playStatus.map }, seeded = new Set();
  for (const a of document.querySelectorAll('.puzzle-card__play[href], .puzzle-card__branch-link[href]')) {
    const slug = (a.getAttribute('href') || '').split('/').filter(Boolean).pop();
    const variant = bySlug[slug]?.variant;
    if (!slug || !variant) continue;
    if (!seeded.has(variant)) { challenges.debugVariantStreak(variant, 5); seeded.add(variant); }
    map[slug] = { started: true, completed: true, progress: null };
  }
  playStatus.map = map;
})();
```

Reset: `challenges.debugClearVariantStreaks()` then reload (reload also clears the in-memory completed states).

### Mimic completed per-puzzle achievements

Fill a puzzle's achievement shelf without playing. Set `VARIANT` / `N`, run on
that puzzle's archive page:

```js
(async () => {
  const provides = document.querySelector('#__nuxt').__vue_app__._context.provides;
  const pinia = provides[Object.getOwnPropertySymbols(provides).find(s => s.toString() === 'Symbol(pinia)')];
  const challenges = pinia._s.get('challenges'), playStatus = pinia._s.get('playStatus'), auth = pinia._s.get('auth');
  const VARIANT = 'WordWheel', N = 30;
  if (auth && !auth.user) auth.user = { uid: 'mimic', displayName: 'Test' };   // reveal the login-gated panel
  const now = Date.now();
  challenges.completions = [...challenges.completions, ...Array.from({length: N}, (_, i) => ({
    slug: `mimic-${VARIANT}-${i}`.toLowerCase(), variant: VARIANT,
    at: new Date(now - i * 864e5).toISOString(), timeSec: 60, checksUsed: 0, cellsRevealed: 0, wrongAnswers: 0, guesses: 2,
  }))];
  challenges.persist();
  const arch = await fetch('/archive.json').then(r => r.json());
  const slugs = Object.entries(arch.puzzles || {}).filter(([, p]) => p && p.variant === VARIANT).map(([s]) => s).slice(0, 5);
  const map = { ...playStatus.map };
  slugs.forEach(s => map[s] = { started: true, completed: true, wordsFound: 12, totalWords: 12, cellsRevealed: 0 });
  playStatus.map = map;
})();
```

Clear it: `challenges.completions = challenges.completions.filter(c => !String(c.slug).startsWith('mimic-')); challenges.persist();`

### Changelog "last seen" marker

The "What's New" modal only shows entries newer than the id stored in
`localStorage['sp-last-seen-changelog']`. To retrigger it the natural way, set
that key to an **older** id and reload — don't `removeItem` it, as an empty
marker is treated as a first visit and silently re-baselines to the newest
entry. Or just use `?showChangelog`.

### Feature flags

Whole features are toggled in `runtimeConfig.public.features` in
`nuxt.config.ts`, or per-deploy via `NUXT_PUBLIC_FEATURES_<NAME>=false`
(e.g. `NUXT_PUBLIC_FEATURES_STREAK_FREEZE=false`):

`requireAccount`, `account`, `friends`, `achievements`, `stats`, `challenges`, `streakFreeze`,
and `installPrompt` (the "Add to Home Screen" steps shown on iPhone and iPad
after finishing a puzzle; Android browsers offer to install on their own).

Off by default, switched on with `=true`: `changelog`, and `levelNudge` (the
"ready to try the next level?" question, both the home-page banner and the
toast after finishing a puzzle).

Config changes need a dev-server restart to take effect.

### Single-locale testing

To test the site in one language, set `SITE_LOCALES` to a comma-separated list
of locale codes, e.g. `SITE_LOCALES=pl npm run dev`. Unset means every locale in
`ALL_LOCALES` in `nuxt.config.ts`. `defaultLocale` follows the first entry and the
header language switcher hides itself when only one locale exists. An unknown
code fails the build. Needs a restart to take effect.

## Deployments

Each site is a static `nuxt generate` build synced to its own S3 bucket, behind
CloudFront. Pushing to a deploy branch deploys that site; the workflow can also
be run manually from the Actions tab, but only on its own deploy branch.

| Site | Branch | GitHub environment | Workflow |
| --- | --- | --- | --- |
| games.stickypuzzles.com | `deploy-games` | `Games` | `games.deploy.yml` |
| RASP (Polish, no accounts) | `deploy-rasp` | `RASP` | `rasp.deploy.yml` |

Both call the shared `.github/workflows/deploy.yml`. Each GitHub environment holds:

- **Secrets:** `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_DEFAULT_REGION`, `S3_BUCKET`.
- **Variables:** the build settings. The workflow writes every non-empty variable
  into `.env` before building and prints it in the run log. Adding a setting only
  needs a new variable, no workflow change. See `.env.example` for the full list.

| Variable | Games | RASP |
| --- | --- | --- |
| `NUXT_APP_BASE_URL` | `/` | `/` |
| `DM_ARCHIVE_FILE` | `/archive.json` | `/archive.json` |
| `FIREBASE_CONFIG_FILE` | `/firebaseConfig.json` | — |
| `NUXT_PUBLIC_SITE_URL` | — | `https://droizk47iuqob.cloudfront.net` |
| `SITE_LOCALES` | — | `pl` |
| `NUXT_PUBLIC_FEATURES_REQUIRE_ACCOUNT` | — | `false` |
| `NUXT_PUBLIC_FEATURES_ACCOUNT` | — | `false` |
| `NUXT_PUBLIC_FEATURES_FRIENDS` | — | `false` |

Settings changed in GitHub take effect on the next deploy of that site.

The deployed commit is in `/version.json`. `archive.json`, `firebaseConfig.json`,
`data/`, `gameplay/`, `puzzle-icons/` and `tools/` live only in the buckets and are
never overwritten by a deploy.

### Local env files

Copy `.env.example` to `.env` and fill in what you need for `npm run dev`. To
preview the RASP variant, create a `.env.rasp` with the RASP values from the table
above and run `npm run rasp`. Both files are gitignored.
