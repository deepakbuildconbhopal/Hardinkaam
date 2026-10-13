// Small flashy feedback on every action: ripple + spark burst on buttons/links. Skips the landing page.
const COLORS = ['#ff7a00', '#ffb000', '#5b3df5', '#2a4bd7'];
export function initHdkFx() {
  if (typeof document === 'undefined' || (window as any).__hdkFx) return;
  (window as any).__hdkFx = true;
  document.addEventListener('pointerdown', (e) => {
    if (document.querySelector('.hdk-landing')) return;
    const el = (e.target as HTMLElement | null)?.closest?.('button,[role=button],a,.cursor-pointer') as HTMLElement | null;
    if (!el || (el as HTMLButtonElement).disabled) return;
    const r = el.getBoundingClientRect();
    if (r.width < 400 && r.height < 200) {
      const d = Math.max(r.width, r.height) * 2;
      const s = document.createElement('span');
      s.className = 'hdk-ripple';
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(s);
      setTimeout(() => s.remove(), 650);
    }
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('i');
      const a = (Math.PI * 2 * i) / 6 + Math.random();
      const dist = 26 + Math.random() * 22;
      p.className = 'hdk-spark';
      p.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--x:${Math.cos(a) * dist}px;--y:${Math.sin(a) * dist}px;--c:${COLORS[i % 4]}`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 720);
    }
  }, { passive: true });
}
