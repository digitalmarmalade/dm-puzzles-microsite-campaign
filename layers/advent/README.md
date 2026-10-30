# Advent challenge

A self-contained Nuxt layer: 24 doors from 1 to 24 December, each with a small puzzle task for that day. Doing every door on its own day keeps a player "perfect". Missed doors can be caught up until 31 December; they count towards the award but not towards perfect. Nobody can fail; the award depends on how many doors were done.

Nuxt picks this folder up automatically (`layers/` is auto-registered). Deleting the folder removes the feature completely. The only hook in the main app is the generic `<ExtraSlot name="home-banners" />` on the home page, filled here by `registerExtra()`.

## Files

- `app/lib/advent.js`: the campaign year and dates, the door schedule (`SCHEDULE`), the door rules, perfect and award logic. Pure functions, no Vue.
- `app/composables/advent.js`: `useAdvent()`, which reads the completion log, favourites and archive, works out progress, fetches the shared counts and picks a puzzle for a door.
- `app/plugins/advent.client.js`: merges this layer's strings into i18n, registers the home banner and writes the player's record to Firestore.
- `app/pages/advent/index.vue`: the calendar page at `/advent`; `app/pages/advent/banners.vue` is the banner states page.
- `app/components/`: the banner, door, door modal, awards and snow backdrop.
- `i18n/*.json`: strings for all 7 locales under `advent.*`. The non-English ones are machine-translated and need a native review.
- `public/img/advent/`: award art, `perfect.webp`, `silver.webp`, `bronze.webp` and `coal.webp`, 500×500.

## Progress and the shared count

Progress is worked out from the synced completion log, so nothing extra is stored for a player's own calendar apart from which doors they've tapped open (`sp-advent-opened`, this device only).

Each signed-in player who has done at least one door writes one record, `advent/{year}/players/{uid}` = `{perfectThrough, done, updatedAt}`. `perfectThrough` is the number of doors in a row from door 1 done on their day. "Still perfect" is a Firestore count of records with `perfectThrough >= today - 1` (24 after Christmas Eve), so players who stopped coming drop out without visiting. Counts are cached for five minutes.

The Firestore security rules live outside this repo. Add this before December, or the counts stay hidden (the page still works):

```
match /advent/{year}/players/{uid} {
  allow list: if request.auth != null;
  allow get: if request.auth != null && request.auth.uid == uid;
  allow create, update: if request.auth != null
    && request.auth.uid == uid
    && request.resource.data.keys().hasOnly(['perfectThrough', 'done', 'updatedAt'])
    && request.resource.data.perfectThrough is int
    && request.resource.data.perfectThrough >= 0
    && request.resource.data.perfectThrough <= 24
    && request.resource.data.done is int
    && request.resource.data.done >= 0
    && request.resource.data.done <= 24
    && request.resource.data.updatedAt == request.time;
}
```

`list` is what the count queries need. It lets a signed-in player list the records (user ids plus two numbers); there's nothing else in them. The record trusts the player's device, which is fine for a friendly count.

## Previewing

- `?advent=12` pretends it's 12 December (any day; `0` is the teaser, `26` is catch-up, `33` is after the end).
- `?advent=12,demo` also uses sample progress and sample counts. `?advent=12,perfect` uses a perfect run.
- `?advent=off` clears it. It persists for the tab session (`sp-advent-preview`).
- `/advent/banners` shows the home banner in every state with sample data (teaser, not started, perfect, out, signed out, catch-up, each final award), at full width and at half width. Its doors don't open.

While a preview is on, nothing is written to Firestore.

## Switching off

`NUXT_PUBLIC_FEATURES_ADVENT=false` hides the banner and sends `/advent` to the home page.

## Next year

Change `YEAR` in `app/lib/advent.js`, and the schedule if you like. Records are stored per year.

## Analytics

`sp_advent_view` (`phase`, `day`), `sp_advent_door_open` (`day`, `kind`), `sp_advent_play` (`day`, `kind`, `slug`), `sp_advent_door_done` (`day`, `late`), `sp_advent_award` (`award`).
