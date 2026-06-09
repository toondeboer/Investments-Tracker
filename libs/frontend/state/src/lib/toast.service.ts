import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  open(
    message: string,
    _action?: string,
    config?: { duration?: number },
  ): void {
    const el = document.createElement('div');
    el.className = 'sailor-toast sailor-toast-error';
    el.textContent = message;
    document.body.appendChild(el);

    const dismiss = () => {
      el.classList.add('sailor-toast-dismiss');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };

    el.addEventListener('click', dismiss);
    setTimeout(dismiss, config?.duration ?? 6000);
  }
}
