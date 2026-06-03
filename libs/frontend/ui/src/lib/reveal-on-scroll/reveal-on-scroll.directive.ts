import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
} from '@angular/core';

/**
 * Reveals an element with a subtle fade + rise the first time it scrolls into
 * view. Self-contained: applies its own inline transition so it works in any
 * component without extra CSS. Honours `prefers-reduced-motion` (and SSR / older
 * browsers without IntersectionObserver) by showing the element immediately.
 *
 * Usage: `<div awsRevealOnScroll>` or `<div [awsRevealOnScroll]="150">` to add a
 * stagger delay in milliseconds.
 */
@Directive({
  selector: '[awsRevealOnScroll]',
  standalone: true,
})
export class RevealOnScrollDirective implements OnInit, OnDestroy {
  /** Stagger delay in milliseconds before the reveal transition starts. */
  @Input('awsRevealOnScroll') revealDelay: number | '' = 0;

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const node = this.el.nativeElement;

    // No animation: leave the element fully visible.
    if (this.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const delay = typeof this.revealDelay === 'number' ? this.revealDelay : 0;
    this.renderer.setStyle(node, 'opacity', '0');
    this.renderer.setStyle(node, 'transform', 'translateY(24px)');
    this.renderer.setStyle(node, 'transition', 'opacity 0.6s ease, transform 0.6s ease');
    this.renderer.setStyle(node, 'transition-delay', `${delay}ms`);
    this.renderer.setStyle(node, 'will-change', 'opacity, transform');

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.reveal();
            this.observer?.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15 }
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private reveal(): void {
    const node = this.el.nativeElement;
    this.renderer.setStyle(node, 'opacity', '1');
    this.renderer.setStyle(node, 'transform', 'none');
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
