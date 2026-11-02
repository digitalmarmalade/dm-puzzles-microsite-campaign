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
| `organisation` | The charity or partner's name for the footer's copyright line, e.g. `"Dementia UK"`. Defaults to `text.title`. |
| `hosts` | Domains that show this campaign at their root, e.g. `["puzzles.examplecharity.org"]`. Each domain also has to point at the site's CloudFront distribution and be added to Firebase's authorised domains. |
| `timezone` | Whose midnight starts a new day. Default `Europe/London`. |
| `account` | `"required"`: players sign in with email and password before starting. `"optional"`: players start straight away as a guest. |
| `features` | Switches for optional features, e.g. `{"friends": false}`. Not used yet. |
| `schedule` | The days; see below. |
| `theme` | Colours: `primary`, `onPrimary` (text on primary), `secondary`, `background`, `text`. Images: `logo` replaces the title in the header; `banner` is a wide picture across the full width of the top of the landing page, with the tagline on it (bottom left, in white) and the sign-up card overlapping it on desktop (about 2000×750; it's cropped to 4:3 on phones), with `bannerFocus` saying which part to keep when cropping, as a CSS `object-position` such as `"20% 100%"` (keep the left of the picture on phones and its bottom on wide screens, which lifts people's heads clear of the header). On desktop the banner is never taller than the screen, so the tagline stays in view on short screens. Put a campaign's images in `public/campaigns/{id}/` and give their paths from there, e.g. `"/campaigns/{id}/banner.webp"`; `npm test` checks they exist. `skin: "advent"` expects a dark `background` (the samples use `#0a1940`), makes the page's own text light, hides the avatar, profile button and today's puzzle box, gives the player's challenge card a snowy night-sky background and turns the calendar into wrapped advent doors (in a fixed shuffled order, tapped to open, remembered per device) and, when there's no `banner`, uses a snowy night scene with falling snow as the landing banner. |
| `text` | The campaign's own words, per language: `{"en": {...}}` with `title`, `tagline`, `intro`, `finished` and `perfect`. `finished` and `perfect` are the headline of the player's finale once they've done every day (late or on time). Optional `summary` is a short paragraph shown in large type above "How it works", e.g. what the money raised pays for. Optional `pledge` is the sentence on players' share images, with `{org}`, `{headline}` (the track's headline) and `{days}` filled in; without it a standard sentence is used. Optional `footer` adds a line under the copyright, e.g. a registered charity number. Optional `steps`, e.g. `[{"title": "Open a door", "body": "A new puzzle every morning."}]`, replaces the landing page's standard "How it works" steps. |
| `tracks` | The challenges a player can choose between. One track means no choice. |
| `profile` | Optional. What players can add about themselves: `{"avatars": ["/img/...svg"], "reason": true}`. `avatars` replaces the default set of avatar images; `reason: false` hides the "why are you taking on the challenge" box; `publicPage: false` turns off players' public pages. Players always give a name. |
| `preview` | Optional sample data shown only when previewing a date: `name`, `avatar`, `reason` and `fundraising` (`raised`, `target`, `currency`, `sponsors`, `url`, `giftAid`, and `supporters`: `[{"name", "amount", "message", "daysAgo"}]`). |
| `sampleFundraising` | `true` shows the `preview.fundraising` sample on every player's real page too, marked "Sample", until real fundraising data is connected. For demos only. |

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
