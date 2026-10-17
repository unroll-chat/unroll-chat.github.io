// ── Phosphor Icons ───────────────────────────────────────────

const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#f59e0b"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>`;
const ICON_X_CIRCLE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="#f87171"><path d="M165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>`;

export interface ProcessingHandle {
  root: HTMLElement;
  setStep: (text: string) => void;
  setDone: (text: string) => void;
  setError: (text: string) => void;
}

/**
 * Screen 2: Processing — step-by-step progress with spinners.
 */
export function createProcessingScreen(): ProcessingHandle {
  const root = document.createElement('div');
  root.className = 'screen flex flex-1 flex-col items-center justify-center py-24';

  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'flex flex-col gap-3 w-full max-w-[400px]';
  root.appendChild(stepsContainer);

  // Progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar mt-6 w-full max-w-[400px]';
  progressBar.innerHTML = '<div class="progress-bar__fill"></div>';
  root.appendChild(progressBar);

  function addStep(text: string, state: 'active' | 'done' | 'error'): HTMLElement {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 text-sm';

    const icon = document.createElement('span');
    icon.className = 'shrink-0 flex items-center justify-center w-5 h-5';

    if (state === 'active') {
      icon.innerHTML = '<span class="progress-spinner"></span>';
      row.innerHTML = '';
      row.appendChild(icon);
      const label = document.createElement('span');
      label.className = 'text-[var(--text-primary)]';
      label.textContent = text;
      row.appendChild(label);
    } else if (state === 'done') {
      icon.innerHTML = ICON_CHECK;
      row.appendChild(icon);
      const label = document.createElement('span');
      label.className = 'text-[var(--text-primary)]';
      label.textContent = text;
      row.appendChild(label);
    } else {
      icon.innerHTML = ICON_X_CIRCLE;
      row.appendChild(icon);
      const label = document.createElement('span');
      label.className = 'text-[#f87171]';
      label.textContent = text;
      row.appendChild(label);
    }

    stepsContainer.appendChild(row);
    return row;
  }

  let currentStep: HTMLElement | null = null;

  return {
    root,

    setStep(text: string): void {
      // Mark previous step as done if it exists
      if (currentStep) {
        const label = currentStep.querySelector('span:last-child');
        const iconWrap = currentStep.querySelector('span:first-child');
        if (iconWrap) iconWrap.innerHTML = ICON_CHECK;
      }
      currentStep = addStep(text, 'active');
    },

    setDone(text: string): void {
      if (currentStep) {
        const iconWrap = currentStep.querySelector('span:first-child');
        const label = currentStep.querySelector('span:last-child');
        if (iconWrap) iconWrap.innerHTML = ICON_CHECK;
        if (label) label.textContent = text;
      }
      // Stop the progress bar
      progressBar.querySelector('.progress-bar__fill')?.remove();
      const fill = document.createElement('div');
      fill.className = 'progress-bar__fill';
      fill.style.width = '100%';
      fill.style.animation = 'none';
      progressBar.appendChild(fill);
    },

    setError(text: string): void {
      if (currentStep) {
        currentStep.remove();
      }
      addStep(text, 'error');
      // Stop progress bar
      progressBar.querySelector('.progress-bar__fill')?.remove();
    },
  };
}
