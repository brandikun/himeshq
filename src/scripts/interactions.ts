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

async function start(): Promise<void> {
  if (busy || root.dataset.phase !== 'title' || !titleScreen || !stageSelect) {
    return;
  }
  busy = true;
  window.history.pushState(null, '', '#stages');
  if (!reducedMotion.matches) {
    await wipe(titleScreen, 'out');
  }
  setPhase('stages');
  window.scrollTo(0, 0);
  if (!reducedMotion.matches) {
    await wipe(stageSelect, 'in');
  }
  stageSelect.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  busy = false;
}

setPhase(window.location.hash === '#stages' ? 'stages' : 'title');
window.addEventListener('popstate', () => {
  setPhase(window.location.hash === '#stages' ? 'stages' : 'title');
  window.scrollTo(0, 0);
});

stageList?.addEventListener('pointerover', sayStage);
stageList?.addEventListener('focusin', sayStage);

// Without JS the PRESS START anchor just scrolls to #stages; with JS it plays the transition.
document.querySelector('a[href="#stages"]')?.addEventListener('click', (event) => {
  event.preventDefault();
  void start();
});

document.addEventListener('keydown', (event) => {
  if (
    (event.key === 'Enter' || event.key === ' ') &&
    event.target === document.body &&
    root.dataset.phase === 'title'
  ) {
    event.preventDefault();
    void start();
  }
});
