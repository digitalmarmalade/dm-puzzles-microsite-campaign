export default defineNuxtPlugin(() => {
    if (import.meta.env.DEV) {
        const originalInfo = console.info;
        console.info = (...args) => {
            if (typeof args[0] === "string") {
                if (args[0].startsWith("<Suspense>")) {
                    return; // terminate msg
                }
            }
            originalInfo(...args);
        };
    }
});