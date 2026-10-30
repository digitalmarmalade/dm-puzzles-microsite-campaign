<script setup>
import Archive from '@/api/Archive.js'
import {adjustAssists, assistKind, assistRule, isValidRating, levelOf, stepAssists} from '@/lib/assists'
import {variantLook} from '@/lib/variantLook'
import {themeSlug} from '@/lib/utils'
import {PuzzleChannel} from '@/lib/puzzleChannel'

const config = useRuntimeConfig()

await Archive.load(config.public.archiveFile)

const {locale, t} = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const {theme} = useTheme()
const puzzleId = route.params.id
const puzzle = Archive.getPuzzles(puzzleId)
const playStatus = usePlayStatusStore()
const challenges = useChallengesStore()
const toast = useToastStore()
const gate = useLoginGate()
const auth = useAuthStore()
const freePlay = useFreePlayStore()
const assists = useAssistsStore()
const {offerAfterCompletion: offerTasteNudge} = useTasteNudge()
const {seed: seedProfile, offerAfterCompletion: offerProfile} = useProfileAnnounce()
const preview = usePreview()
const features = useFeatures()
const {nextFor, anotherFor, differentFor} = useNextPuzzle()
const look = variantLook(puzzle?.variant)

const cover = ref(false)
const picking = ref(null)
const usesLetters = assistKind(puzzle?.type) === 'letters'
const offer = ref(null)
const plan = ref(null)
const last = ref(null)
const coverStatus = ref(null)
const frameReady = ref(false)
const releaseWindowChannel = claimWindowChannel()

setPuzzleAppData();

useHead({title: () => puzzle?.name || puzzle?.variant || t('nav.puzzles')})

const puzzleUrl = computed(() => {
    const url = Archive.getPuzzleUrl(puzzle, locale.value, theme.value, config.public.buildVersion)
    console.log('puzzleUrl', url)
    return url
})

const PERSIST_EVENTS = ['puzzlestart', 'puzzleprogress', 'puzzlecomplete', 'puzzlereset']
const CHANNEL_EVENTS = [...PERSIST_EVENTS, 'puzzledifficulty', 'puzzleassists']
const PLAY_STATS = ['cellsRevealed', 'prefilled', 'hintsShown', 'checksUsed', 'wrongAnswers', 'wordsFound', 'totalWords', 'score', 'maxScore', 'guesses', 'solved']
let channel = null

function relatedPuzzle(link) {
    if (!link) return null
    return {
        heading: t('puzzle.relatedHeading'),
        icon: link.image,
        title: link.title,
        theme: themeSlug(variantLook(link.variant).theme),
        url: link.url,
    }
}

const PICK_REASONS = ['favourite', 'boosted', 'stepUp', 'morning', 'afternoon', 'evening', 'night', 'played', 'tour']

function nextHeading({reason, category, puzzle: next}) {
    if (reason === 'streak') return t('puzzle.next.streak', {name: next.variant})
    if (reason === 'likeCategory') return t(`home.yourPuzzles.reasons.likeCategory.${category}`)
    if (PICK_REASONS.includes(reason)) return t(`home.yourPuzzles.reasons.${reason}`)
    return t(`puzzle.next.${reason}`)
}

function nextRelated() {
    if (features.requireAccount && !auth.user) return null
    const found = nextFor(puzzle)
    if (!found) return null
    const lang = localePath('/').slice(1)
    const url = new URL(Archive.getPuzzleSiteUrl(found.puzzle, lang, theme.value))
    url.searchParams.set('next', found.reason)
    return {
        heading: nextHeading(found),
        icon: Archive.getPuzzleImageUrl(found.puzzle, lang, theme.value),
        title: found.puzzle.name,
        theme: themeSlug(variantLook(found.puzzle.variant).theme),
        url: url.toString(),
    }
}

function completionLink(found, reason, base) {
    const lang = localePath('/').slice(1)
    const url = new URL(Archive.getPuzzleSiteUrl(found, lang, theme.value))
    url.searchParams.set('next', reason)
    return {
        ...base,
        title: found.name,
        variant: found.variant,
        link_text: found.name,
        url: url.toString(),
        image: Archive.getPuzzleImageUrl(found, lang, theme.value),
        target: '_parent',
    }
}

function playAnotherLink(completion) {
    const current = completion?.correct?.links?.[0]
    const found = anotherFor(puzzle)
    if (!found) return current && {...current, url: completion.correct.view_all_url}
    return completionLink(found, 'another', current)
}

function differentLink(completion) {
    const current = completion?.correct?.links?.[1]
    const found = differentFor(puzzle)
    return found ? completionLink(found, 'different', current) : current
}

function trackNextClick() {
    const reason = route.query.next
    if (!reason) return
    trackFunnel('sp_next_click', {reason, variant: puzzle?.variant})
    const {next, ...query} = route.query
    router.replace({query})
}

function startingAssists() {
    const rule = assistRule(puzzle?.type)
    return assists.forTag(puzzle?.tag) ?? (rule ? {[rule.key]: rule.min} : null)
}

function setPuzzleAppData() {
    // Some data for the puzzle gameplay to use
    const completion = Archive.getPuzzleCompletionData(puzzleId, localePath('/').slice(1), theme.value)
    window.puzzleApp = {
        completion,
        related: relatedPuzzle(completion.correct.links[1]),
        leaderboard: null,
        multiplayer: null,
        stats: challenges.statsForVariant(puzzle?.variant),
        assists: usesLetters ? null : startingAssists(),
        trophies: null,
        user: null,
    }
}

const PROGRESS_DEBOUNCE_MS = 1500
const PROGRESS_MAX_WAIT_MS = 8000
let progressPayload = null
let progressTimer = null
let progressMaxTimer = null

function clearProgressTimers() {
    if (progressTimer) { clearTimeout(progressTimer); progressTimer = null }
    if (progressMaxTimer) { clearTimeout(progressMaxTimer); progressMaxTimer = null }
}
function flushProgress() {
    clearProgressTimers()
    if (!progressPayload) return
    const payload = progressPayload
    progressPayload = null
    playStatus.save(puzzleId, payload)
}
function cancelProgress() {
    clearProgressTimers()
    progressPayload = null
}
function queueProgress(payload) {
    progressPayload = payload
    if (progressTimer) clearTimeout(progressTimer)
    progressTimer = setTimeout(flushProgress, PROGRESS_DEBOUNCE_MS)
    if (!progressMaxTimer) progressMaxTimer = setTimeout(flushProgress, PROGRESS_MAX_WAIT_MS)
}

function recentCompletions() {
    return (challenges.completions ?? [])
        .filter(c => c.variant === puzzle?.variant)
        .sort((a, b) => new Date(b.at) - new Date(a.at))
}

function previewOffer() {
    const rule = assistRule(puzzle.type)
    const next = stepAssists(puzzle.type, {[rule.key]: rule.start}, 'harder')
    return next ? {direction: 'harder', reason: 'clean', next, basedOn: 'preview'} : null
}

async function showCover() {
    if (gate.blocked || !puzzle || route.query.gid) return startPuzzle()
    await playStatus.loadAll()
    const status = playStatus.statusFor(puzzleId)
    const solved = status?.completed || (challenges.completions ?? []).some(c => c.slug === puzzleId)
    if (status?.started || solved) return startPuzzle()
    const recent = recentCompletions()
    coverStatus.value = status
    last.value = recent.find(c => c.slug !== puzzleId) ?? null
    offer.value = !assistRule(puzzle.type)
        ? null
        : preview.is('assist-offer') ? previewOffer() : assists.offerFor(puzzle.tag, puzzle.type, recent)
    plan.value = buildPlan(offer.value)
    cover.value = true
    if (offer.value) trackFunnel('sp_assist_offer_show', {variant: puzzle.variant, direction: offer.value.direction, reason: offer.value.reason})
}

function buildPlan(found) {
    const rule = assistRule(puzzle.type)
    if (!rule) return null
    const current = assists.forTag(puzzle.tag)
    const none = {[rule.key]: rule.min}
    const plan = (message, primary) => ({
        message,
        primary,
        alternative: none,
        secondary: levelOf(puzzle.type, primary) > rule.min ? 'playWithout' : null,
    })
    if (found?.direction === 'harder') return plan(levelOf(puzzle.type, found.next) > rule.min ? 'offerHarder' : 'offerOff', found.next)
    return plan(levelOf(puzzle.type, current) > rule.min ? 'adjusted' : null, current)
}

function onCoverStart(choice) {
    const current = offer.value
    const chosen = plan.value
    const primary = choice !== 'secondary'
    cover.value = false
    offer.value = null
    if (current?.basedOn === 'preview') {
        preview.hide('assist-offer')
    } else if (current) {
        assists.answerOffer(puzzle.tag, current, primary)
        trackFunnel('sp_assist_offer_answer', {variant: puzzle.variant, direction: current.direction, accepted: primary})
    }
    const level = preview.is('letter-picker') ? 4 : chosen ? levelOf(puzzle.type, primary ? chosen.primary : chosen.alternative) : 0
    if (chosen && !primary) trackFunnel('sp_assist_override', {variant: puzzle.variant, level})
    if (usesLetters && level > 0) {
        picking.value = {level}
        return
    }
    if (chosen && !usesLetters) window.puzzleApp.assists = primary ? chosen.primary : chosen.alternative
    startPuzzle()
}

function onLettersStart(letters) {
    const level = picking.value.level
    picking.value = null
    window.puzzleApp.assists = {type: 'letters', letterLevel: level, letters}
    if (!preview.is('letter-picker')) assists.rememberLetters(puzzle.tag, letters)
    trackFunnel('sp_letters_pick', {variant: puzzle.variant, level, count: letters.length})
    startPuzzle()
}

function onLettersSkip() {
    trackFunnel('sp_letters_skip', {variant: puzzle.variant, level: picking.value.level})
    picking.value = null
    window.puzzleApp.assists = null
    startPuzzle()
}

function startPuzzle() {
    if (window.puzzleApp && !gate.blocked) {
        const completion = window.puzzleApp.completion
        const another = playAnotherLink(completion) ?? completion.correct.links[0]
        const different = differentLink(completion)
        for (const key of ['correct', 'incorrect']) completion[key].links = [another, different]
        window.puzzleApp.related = nextRelated() ?? relatedPuzzle(different) ?? window.puzzleApp.related
    }
    frameReady.value = true
    nextTick(() => {
        openChannel()
        const frame = document.getElementById('puzzle-frame')?.contentWindow
        frame?.window.addEventListener('unload', onIframeUnload)
        document.getElementById('puzzle-frame')?.addEventListener('load', syncGameId)
        document.getElementById('puzzle-frame')?.addEventListener('load', watchNextLinks)
    })
}

function watchNextLinks() {
    try {
        document.getElementById('puzzle-frame')?.contentDocument?.addEventListener('click', onFrameLinkClick, true)
    } catch {
        //
    }
}

function onFrameLinkClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target.closest?.('a[href]')
    if (!link || !['_parent', '_top'].includes(link.target)) return
    const url = new URL(link.href, window.location.href)
    if (url.origin !== window.location.origin || !url.searchParams.has('next')) return
    event.preventDefault()
    window.location.replace(url.href)
}

function syncGameId() {
    try {
        const frame = document.getElementById('puzzle-frame')?.contentWindow
        if (!frame) return
        const gid = new URLSearchParams(frame.location.search).get('gid')
        const url = new URL(window.location.href)
        if ((url.searchParams.get('gid') || null) === (gid || null)) return
        if (gid) url.searchParams.set('gid', gid)
        else url.searchParams.delete('gid')
        window.history.replaceState(window.history.state, '', url.href)
    } catch {
        //
    }
}

function onVisibilityChange() {
    if (document.visibilityState === 'hidden') syncGameId()
}

function openChannel() {
    const frame = document.getElementById('puzzle-frame')?.contentWindow
    if (!frame || channel || !puzzleUrl.value) return
    channel = new PuzzleChannel(frame, new URL(puzzleUrl.value, window.location.href).origin, {events: {bubble: true, forward: false}})
    for (const name of CHANNEL_EVENTS) channel.on(name, message => handlePuzzleEvent(name, fromChannel(name, message)))
}

function closeChannel() {
    channel?.dispose()
    channel = null
    releaseWindowChannel()
}

function playStats(user) {
    if (!user || typeof user !== 'object') return {}
    return Object.fromEntries(PLAY_STATS.filter(key => key in user).map(key => [key, user[key]]))
}

function fromChannel(name, message) {
    const content = message?.content
    if (name === 'puzzledifficulty' || name === 'puzzleassists') return content
    const snapshot = content?.node === 'all' ? content.data : content?.node ? null : content
    const user = content?.node === 'user' ? content.data : snapshot?.user
    return {status: message?.status ?? snapshot?.status ?? null, ...playStats(user)}
}

async function offerAssistChange(rating) {
    const direction = rating === 'hard' ? 'easier' : rating === 'easy' ? 'harder' : null
    const current = assists.forTag(puzzle?.tag)
    if (!direction || !stepAssists(puzzle?.type, current, direction)) return
    const used = window.puzzleApp?.assists?.letters?.length ?? 0
    const choice = await showAssistFeedback({direction, type: puzzle.type, current, used, icon: look.icon, theme: look.theme})
    const next = choice && adjustAssists(puzzle.type, current, choice)
    trackFunnel('sp_assist_feedback_answer', {variant: puzzle.variant, direction, choice: choice ?? 'dismissed', accepted: !!next})
    if (!next) return
    window.puzzleApp.assists = assists.save(puzzle.tag, next)
}

function onDifficultyRating(payload) {
    const rating = payload?.rating
    if (!isValidRating(rating)) return
    challenges.recordRating(puzzleId, rating)
    trackFunnel('sp_difficulty_rating', {variant: puzzle?.variant, rating})
    if (payload.assists) {
        window.puzzleApp.assists = assists.applyRating(puzzle?.tag, puzzle?.type, payload)
        return
    }
    offerAssistChange(rating)
}

function onPuzzleMessage(e) {
    const data = e?.data
    if (data?.type) return handlePuzzleEvent(data.type, data.payload)
}

let holding = false

function completionExtras(payload) {
    return {
        timeSec: payload.status?.completed?.seconds,
        cellsRevealed: payload.cellsRevealed,
        prefilled: payload.prefilled,
        hintsShown: payload.hintsShown,
        checksUsed: payload.checksUsed,
        wrongAnswers: payload.wrongAnswers,
        wordsFound: payload.wordsFound,
        totalWords: payload.totalWords,
        score: payload.score,
        maxScore: payload.maxScore,
        guesses: payload.guesses,
        solved: payload.solved,
    }
}

async function afterCompletion(result, {prompts = true} = {}) {
    await new Promise(r => setTimeout(r, 3000))
    if (result.freezeEarned) {
        await showStreakSaved(result.dayStreak)
    } else {
        if (result.weekStreakGrew && result.weekStreak > 1) {
            await showStreakModal('week', result.prevWeekStreak, result.weekStreak)
        }
        if (result.dayStreakGrew && result.dayStreak > 1) {
            await showStreakModal('day', result.prevDayStreak, result.dayStreak)
        }
    }
    if (result.variantStreakGrew && result.variantStreak >= 2) {
        toast.streak(t('streakToast.title'), t('streakToast.body', {name: result.variant, count: result.variantStreak}))
    }
    if (!prompts) return
    const shownOther = offerTasteNudge()
    const shownProfile = await offerProfile(!shownOther)
    if (!shownOther && !shownProfile && !maybeShowInstallPrompt()) maybeShowNotificationsPrompt()
}

function releaseHeld({silent = false} = {}) {
    if (!holding) return
    holding = false
    const result = challenges.releaseHeldCompletion()
    if (result && !silent) afterCompletion(result, {prompts: false})
}

function onPageHide() {
    syncGameId()
    releaseHeld({silent: true})
}

async function handlePuzzleEvent(type, eventPayload) {
    if (type === 'puzzledifficulty') return onDifficultyRating(eventPayload)
    if (type === 'puzzleassists') {
        window.puzzleApp.assists = assists.applySetting(puzzle?.tag, puzzle?.type, eventPayload?.assists)
        return
    }
    if (!PERSIST_EVENTS.includes(type)) return
    if (type === 'puzzleprogress') {
        queueProgress(eventPayload)
        if (holding) challenges.holdCompletion(puzzleId, puzzle.variant, completionExtras(eventPayload ?? {}))
        return
    }
    cancelProgress()
    if (type === 'puzzlecomplete') {
        const payload = eventPayload ?? {}
        await playStatus.save(puzzleId, {...payload, status: {...(payload.status ?? {}), completed: payload.status?.completed || true}})
        if (!puzzle?.variant) return
        if (payload.status?.halfwayComplete && !payload.status?.completed) {
            holding = true
            challenges.holdCompletion(puzzleId, puzzle.variant, completionExtras(payload))
            return
        }
        holding = false
        challenges.dropHeldCompletion()
        await afterCompletion(challenges.recordCompletion(puzzleId, puzzle.variant, completionExtras(payload)))
    } else {
        playStatus.save(puzzleId, eventPayload)
    }
}

function onIframeUnload(e) {
    const iframe = document.getElementById('puzzle-frame').contentWindow

    console.log('onIframeUnload', iframe?.app?.puzzleApi)
    if (iframe?.app?.puzzleApi) {
        const status = iframe.app.puzzleApi.status.get();

        if (!status.completed && !playStatus.statusFor(puzzleId)?.completed) {
            playStatus.save(puzzleId, {status: status})
        }
    }
}

onMounted(() => {
    seedProfile()
    trackNextClick()
    window.addEventListener('message', onPuzzleMessage)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    showCover()
    if (preview.is('assist-modal')) {
        preview.hide('assist-modal')
        showAssistFeedback({direction: 'easier', type: 'crossword', current: {letterLevel: 2}, used: 2, icon: look.icon, theme: look.theme})
    }

    PuzzleEvents.init(puzzle)

    if (!gate.blocked) {
        trackFirstPlay(puzzleId, {signedIn: !!auth.user, free: !auth.user && freePlay.claimedSlug === puzzleId})
    }
})
onBeforeUnmount(() => {
    window.removeEventListener('message', onPuzzleMessage)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', onPageHide)
    flushProgress()
    releaseHeld()
    closeChannel()
    /*const iframe = document.getElementById('puzzle-frame').contentWindow
    iframe.window.removeEventListener('unload', onIframeUnload)*/
    PuzzleEvents.deinit()
})

function goBack() {
    if (import.meta.client && window.history.length > 1) router.back()
    else router.push(localePath('/'))
}
</script>

<template>
<PuzzleLayout title="Play">
  <div class="puzzle-wrapper">
      <button type="button" class="close-button" :aria-label="t('common.back')" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              aria-hidden="true" focusable="false">
                <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>{{ t('common.back') }}</span>
      </button>
      <PuzzleCover
        v-if="cover"
        :puzzle="puzzle"
        :icon="look.icon"
        :theme="look.theme"
        :status="coverStatus"
        :last="last"
        :plan="plan"
        @start="onCoverStart"
      />
      <PuzzleLetterPicker
        v-else-if="picking"
        :puzzle="puzzle"
        :icon="look.icon"
        :theme="look.theme"
        :level="picking.level"
        :remembered="assists.letters[puzzle.tag] ?? []"
        @start="onLettersStart"
        @skip="onLettersSkip"
      />
      <PuzzleFrame
        v-else-if="frameReady"
        :url="puzzleUrl"
      />
  </div>
</PuzzleLayout>
</template>

<style scoped>

  .puzzle-wrapper {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .close-button {
    appearance: unset;
    background-color: transparent;
    block-size: 3.6rem;
    border: none;
    cursor: pointer;
    inset-block-start: .6rem;
    inset-inline-start: .6rem;
    position: fixed;
    z-index: 51;
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    padding: 0 1.2rem;
    color: var(--text-colour, #333);
    font-size: 1.4rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .05rem;
    background: var(--card-background);
    border-radius: 9999px;
    border: 1px solid var(--card-border);

    @media (width < 720px) {
        min-inline-size: 5rem;
        block-size: 4rem;
        justify-content: center;

        span {
            display: none;
        }
    }

    @media (width >= 720px) {
        inset-block-start: 1.4rem;
        inset-inline-start: max(1.4rem, (100vw - 1440px) / 2 + 2rem);
    }
  }

  .close-button svg {
    inline-size: 1.6rem;
    block-size: 1.6rem;

    @media (width < 720px) {
        inline-size: 2rem;
        block-size: 2rem;
    }
  }

  .close-button:hover {
      @media (hover: hover) {
          color: var(--nav-link-hover);
      }
  }
</style>
