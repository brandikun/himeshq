const TYPE_INTERVAL_MS = 28;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.querySelector<HTMLElement>('[data-dialog]');
const stageList = document.querySelector<HTMLElement>('#stages ul');

let typing: number | undefined;
let current = dialog?.textContent ?? '';

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

stageList?.addEventListener('pointerover', sayStage);
stageList?.addEventListener('focusin', sayStage);

// PRESS START is a real anchor; this adds Enter/Space while the title screen is in view.
document.addEventListener('keydown', (event) => {
  const onTitleScreen = window.scrollY < window.innerHeight / 2;
  if (
    (event.key === 'Enter' || event.key === ' ') &&
    event.target === document.body &&
    onTitleScreen
  ) {
    event.preventDefault();
    window.location.hash = 'stages';
  }
});
