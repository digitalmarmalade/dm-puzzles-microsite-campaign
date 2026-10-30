# Puzzle campaigns

One site that runs many puzzle campaigns at once, each with its own rules, puzzles and
look: a charity's 30-day sponsored challenge, an advent calendar, and so on. It started
as a copy of dm-puzzles-microsite-nuxt and reuses its puzzle gameplay, but none of the
Sticky Puzzles site features.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` and run `npm run local`, or `npm run dev` with a `.env`.
The dev server lists the campaigns in the build at `/`.

## Campaigns

Each campaign is a folder in `campaigns/` with a `campaign.json`: its dates, rules,
puzzles, colours and text. See [campaigns/README.md](campaigns/README.md) for every
setting and how to add one. A campaign lives at `/c/{id}`, and at its own domains when
it lists them in `hosts`.

The day rules (which days are open, late or missed) are in `app/lib/campaign/schedule.js`,
progress is saved by `useCampaignPlayer()` in `app/composables/campaign.js`, and the
pages are `app/pages/c/[campaign]/`.

### Previewing a date

Add `?today=2026-12-05` to any campaign page to see it as it would be on that day.
It lasts for the tab; `?today=off` stops it. While previewing, progress is kept in the
tab only, nothing is saved to Firebase, and sign-in is skipped.

## Tests

```bash
npm test              # day rules, and that every campaign.json is valid
npm run test:rules    # Firestore security rules, in the emulator
```

## Firebase

The campaigns site has its own Firebase project, separate from Sticky Puzzles. Its
Firestore security rules and indexes live in this repo (`firestore.rules`,
`firestore.indexes.json`; the data layout is described at the top of the rules) and
are deployed with the Firebase CLI:

```bash
firebase deploy --only firestore
```

Local testing: `firebase emulators:start` runs Auth and Firestore locally
(UI at http://localhost:4000).

What's stored, under `campaigns/{campaign}/`:

- `players/{uid}`: one per player, `{track, startedAt}`. `startedAt` is set by the
  server and can't be changed, so a rolling challenge's day 1 is fixed.
- `players/{uid}/days/{day}`: one per completed day, `{slug, completedAt}`. Create-only
  and stamped by the server, so a late day always stays late.
- `profiles/{uid}`: the player's `{name, avatar, reason, updatedAt}`, given when they
  register and editable at `/c/{id}/profile`. Only they (and the campaign's admins) can read it.
- `public/{shareId}`: what a player chose to show on their public challenge page (not built yet).
  Anyone can read one; only its owner can change it.
- `admins/{uid}`: partner staff who can see this campaign's players. Added by hand in
  the Firestore console; nobody can add one from the site.

## Deployments

One deployment serves every campaign: a static `nuxt generate` build synced to an
S3 bucket, behind CloudFront. Work happens on `main` and feature branches; pushing
to `deploy-campaigns` deploys the site. The workflow can also be run manually from
the Actions tab, but only on its deploy branch.

| Site | Branch | GitHub environment | Workflow |
| --- | --- | --- | --- |
| Campaigns | `deploy-campaigns` | `Campaigns` | `campaigns.deploy.yml` |

It calls the shared `.github/workflows/deploy.yml`, so another deploy target only
needs another small workflow and environment. The GitHub environment holds:

- **Secrets:** `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_DEFAULT_REGION`, `S3_BUCKET`.
- **Variables:** the build settings. The workflow writes every non-empty variable
  into `.env` before building and prints it in the run log. Adding a setting only
  needs a new variable, no workflow change. See `.env.example` for the full list.

| Variable | Campaigns |
| --- | --- |
| `NUXT_APP_BASE_URL` | `/` |
| `FIREBASE_CONFIG_FILE` | `/firebaseConfig.json` (the campaigns Firebase project, not Sticky Puzzles') |
| `NUXT_PUBLIC_SITE_URL` | the CloudFront URL until a domain is set up |

Settings changed in GitHub take effect on the next deploy.

The deployed commit is in `/version.json`. `archive.json`, `firebaseConfig.json`,
`data/`, `gameplay/`, `puzzle-icons/` and `tools/` live only in the buckets and are
never overwritten by a deploy.

### Local env files

Copy `.env.example` to `.env` and fill in what you need for `npm run dev`. It is
gitignored.
