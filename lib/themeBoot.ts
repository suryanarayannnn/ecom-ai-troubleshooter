export const THEME_KEY = "ll-theme";

// Inlined in <head> so the saved theme applies before first paint (no flash).
export const THEME_BOOT = `try{var t=localStorage.getItem('${THEME_KEY}');document.documentElement.dataset.theme=t==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}`;
