# Campaigns

Each folder here is one campaign, served at `/c/{folder name}`. Its `campaign.json`
says everything about it. `npm test` checks every campaign file, so a broken one fails
the tests rather than the live site.

`charity-sample` (a rolling 30-day challenge with two tracks and accounts required)
and `advent-sample` (24 fixed December days, guests welcome) are examples to copy.

## Adding a campaign

1. Copy one of the samples to a new folder. The folder name is the campaign's id.
2. Edit its `campaign.json` (below) and set `id` to the folder name.
3. Run `npm test`, then check it at `/c/{id}`, previewing dates with `?today=YYYY-MM-DD`.
   The dev server restarts by itself whenever a `campaign.json` is added, changed or
   removed, so give it a couple of seconds before reloading.

## campaign.json

| Setting | |
| --- | --- |
| `id` | Lowercase letters, numbers and hyphens; the same as the folder name. |
| `name` | For developers only; players see `text.title`. |
| `hosts` | Domains that show this campaign at their root, e.g. `["puzzles.examplecharity.org"]`. Each domain also has to point at the site's CloudFront distribution and be added to Firebase's authorised domains. |
| `timezone` | Whose midnight starts a new day. Default `Europe/London`. |
| `account` | `"required"`: players sign in with email and password before starting. `"optional"`: players start straight away as a guest. |
| `features` | Switches for optional features, e.g. `{"friends": false}`. Not used yet. |
| `schedule` | The days; see below. |
| `theme` | Colours: `primary`, `onPrimary` (text on primary), `background`, `text`. |
| `text` | The campaign's own words, per language: `{"en": {...}}` with `title`, `tagline`, `intro`, `finished` and `perfect`. |
| `tracks` | The challenges a player can choose between. One track means no choice. |
| `profile` | Optional. What players can add about themselves: `{"avatars": ["/img/...svg"], "reason": true}`. `avatars` replaces the default set of avatar images; `reason: false` hides the "why are you taking on the challenge" box. Players always give a name. |
| `preview` | Optional sample data shown only when previewing a date: `name`, `avatar`, `reason` and `fundraising`. |

### schedule

```json
{"mode": "fixed", "days": 24, "start": "2026-12-01", "late": {"until": "2026-12-31"}}
{"mode": "rolling", "days": 30, "startFrom": "2027-01-01", "startUntil": "2027-06-30", "late": true}
```

- `mode`
  - `"fixed"`: everyone shares the calendar. Day 1 is `start`.
  - `"rolling"`: each player's day 1 is the day they start, any day from `startFrom` to
    `startUntil`.
- `days`: how many days the campaign runs for. Every track needs exactly this many puzzles.
- `late`: whether missed days can still be played.
  - `false`: no.
  - `true`: yes, at any time.
  - `{"days": 3}`: for up to 3 days after.
  - `{"until": "2026-12-31"}`: until that date.

  A day played after its date always counts as late. A run with no late days is "perfect".

### tracks

```json
{"id": "logic", "name": "Logic", "description": "Sudoku, Takuzu and more.", "puzzles": [ ... ]}
```

`puzzles` is in day order: the first is day 1. Each puzzle is an entry in the same shape
as the microsite's `archive.json`, and needs at least `slug`, `name`, `type` and `url`
(the puzzle's data file). `variant` and `tag` are used for the puzzle's icon.

## When a day counts as done

A day is done when its puzzle reports itself complete. Word Wheel and the points-scored
word games report "complete" whenever the player ends the game, so they also need at
least 20% of the words or points (`app/lib/campaign/completion.js`). A GuessWord that
runs out of guesses counts, as it was played to the end.
