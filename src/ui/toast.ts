/** Kurzlebige Hinweiszeile am unteren Rand. */
const toastEl = () => document.getElementById("toast")!;
let timer: ReturnType<typeof setTimeout> | undefined;
/** true, solange der Toast nicht automatisch verschwinden soll (Routen-Modus). */
let sticky = false;

export function showToast(html: string, opts: { sticky?: boolean } = {}): void {
  const el = toastEl();
  el.innerHTML = html;
  el.classList.add("open");
  sticky = opts.sticky ?? false;
  clearTimeout(timer);
  if (!sticky) timer = setTimeout(hideToast, 6000);
}

export function hideToast(force = false): void {
  if (sticky && !force) return;
  sticky = false;
  clearTimeout(timer);
  toastEl().classList.remove("open");
}

/** Start-Hinweis beim ersten Laden, verschwindet nach 9 s oder erstem Klick. */
export function initToast(): void {
  toastEl().classList.add("open");
  timer = setTimeout(() => hideToast(), 9000);
}
