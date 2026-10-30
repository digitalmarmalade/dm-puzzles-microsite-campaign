export function useFeatures() {
    const cfg = useRuntimeConfig().public.features || {}
    const requireAccount = cfg.requireAccount !== false
    return {
        requireAccount,
        account: requireAccount || cfg.account !== false,
        friends: cfg.friends !== false,
        achievements: cfg.achievements !== false,
        //  home-page panels — `stats` covers the WeeklySummary + Streak cards,
        //  `challenges` covers the Challenge panel. Default on.
        stats: cfg.stats !== false,
        challenges: cfg.challenges !== false,
        //  streak freeze — rescue a broken streak by completing puzzles the day
        //  you return. Gated on its own; disable to switch the whole flow off.
        streakFreeze: cfg.streakFreeze !== false,
        changelog: cfg.changelog === true,
        levelNudge: cfg.levelNudge === true,
        installPrompt: cfg.installPrompt !== false,
    }
}
