const TYPE_INTERVAL_MS = 28;
const WAVE_STEPS = 10;
const WAVE_STEP_MS = 55;
const WAVE_STRENGTH = 140;

type Phase = 'title' | 'stages';

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.querySelector<HTMLElement>('[data-dialog]');
const stageList = document.querySelector<HTMLElement>('#stages ul');
const titleScreen = document.querySelector<HTMLElement>('#title-screen');
const stageSelect = document.querySelector<HTMLElement>('#stages');
const waveMap = document.querySelector<SVGFEDisplacementMapElement>('#wave-map');
const waveNoise = document.querySelector<SVGFETurbulenceElement>('#wave-noise');

let typing: number | undefined;
let current = dialog?.textContent ?? '';
let busy = false;

function say(text: string): void {
  if (!dialog || text === current) {
    return;
  }
  current = text;
  window.clearInterval(typing);
  if (reducedMotion.matches) {
    dialog.textContent = text;
    return;
  }
  let shown = 0;
  typing = window.setInterval(() => {
    shown += 1;
    dialog.textContent = text.slice(0, shown);
    if (shown >= text.length) {
      window.clearInterval(typing);
    }
  }, TYPE_INTERVAL_MS);
}

function sayStage(event: Event): void {
  if (!(event.target instanceof Element)) {
    return;
  }
  const blurb = event.target.closest('[data-stage]')?.querySelector('[data-blurb]');
  if (blurb?.textContent) {
    say(blurb.textContent.trim());
  }
}

function setPhase(phase: Phase): void {
  root.dataset.phase = phase;
  titleScreen?.style.removeProperty('opacity');
  stageSelect?.style.removeProperty('opacity');
}

/** Whole-step wave: the screen wobbles sideways in bands while it fades, like a console HDMA effect. */
function wipe(target: HTMLElement, direction: 'out' | 'in'): Promise<void> {
  const frame = (step: number): void => {
    const visible = direction === 'out' ? 1 - step / WAVE_STEPS : step / WAVE_STEPS;
    waveMap?.setAttribute('scale', String(Math.round((1 - visible) * WAVE_STRENGTH)));
    waveNoise?.setAttribute('seed', String(step + 1));
    target.style.opacity = String(visible);
  };

  return new Promise<void>((resolve) => {
    let step = 0;
    target.classList.add('wave');
    frame(step);
    const timer = window.setInterval(() => {
      step += 1;
      frame(step);
      if (step >= WAVE_STEPS) {
        window.clearInterval(timer);
        target.classList.remove('wave');
        if (direction === 'in') {
          target.style.removeProperty('opacity');
        }
        resolve();
      }
    }, WAVE_STEP_MS);
  });
}

/** Wave out of the current screen, swap, wave into the next. Instant under reduced motion. */
async function transition(next: Phase): Promise<void> {
  const leaving = next === 'stages' ? titleScreen : stageSelect;
  const entering = next === 'stages' ? stageSelect : titleScreen;
  if (!leaving || !entering || busy || root.dataset.phase === next || reducedMotion.matches) {
    setPhase(next);
    window.scrollTo(0, 0);
    return;
  }
  busy = true;
  await wipe(leaving, 'out');
  setPhase(next);
  window.scrollTo(0, 0);
  await wipe(entering, 'in');
  const focusTarget =
    next === 'stages' ? entering.querySelector('h2') : entering.querySelector('a');
  focusTarget?.focus({ preventScroll: true });
  busy = false;
}

function start(): void {
  if (busy || root.dataset.phase !== 'title') {
    return;
  }
  window.history.pushState({ phase: 'stages' }, '', '#stages');
  void transition('stages');
}

/** Back to the title. Through history when we pushed the entry; in place after a deep link. */
function goBack(): void {
  if (busy || root.dataset.phase !== 'stages') {
    return;
  }
  if ((window.history.state as { phase?: string } | null)?.phase === 'stages') {
    window.history.back();
    return;
  }
  window.history.replaceState(null, '', window.location.pathname);
  void transition('title');
}

setPhase(window.location.hash === '#stages' ? 'stages' : 'title');
window.addEventListener('popstate', () => {
  void transition(window.location.hash === '#stages' ? 'stages' : 'title');
});

stageList?.addEventListener('pointerover', sayStage);
stageList?.addEventListener('focusin', sayStage);

// Without JS the PRESS START anchor just scrolls to #stages; with JS it plays the transition.
document.querySelector('a[href="#stages"]')?.addEventListener('click', (event) => {
  event.preventDefault();
  start();
});
document.querySelector('[data-back]')?.addEventListener('click', goBack);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    goBack();
  } else if (
    (event.key === 'Enter' || event.key === ' ') &&
    event.target === document.body &&
    root.dataset.phase === 'title'
  ) {
    event.preventDefault();
    start();
  }
});
