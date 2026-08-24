/**
 * Erklär-Overlay: erscheint beim ersten Besuch (localStorage-Flag, try/catch
 * für Private-Mode/gesperrten Storage) und jederzeit über den ?-Button.
 */
const STORAGE_KEY = "pistenatlas_intro";

const wrap = () => document.getElementById("introWrap")!;

let lastFocus: HTMLElement | null = null;

export function showIntro(): void {
  lastFocus = document.activeElement as HTMLElement | null;
  wrap().classList.add("open");
  document.getElementById("introGo")?.focus();
}

export function hideIntro(): void {
  wrap().classList.remove("open");
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* Storage gesperrt (z. B. Private Mode) — Overlay erscheint dann erneut */
  }
  lastFocus?.focus();
}

export function initIntro(): void {
  document.getElementById("zhelp")!.addEventListener("click", showIntro);
  document.getElementById("introGo")!.addEventListener("click", hideIntro);
  wrap().addEventListener("click", (e) => {
    if (e.target === wrap()) hideIntro();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && wrap().classList.contains("open")) hideIntro();
  });

  let seen = false;
  try {
    seen = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    /* siehe oben */
  }
  if (!seen) showIntro();
}
