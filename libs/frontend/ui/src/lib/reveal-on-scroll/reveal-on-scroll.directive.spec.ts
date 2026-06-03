import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RevealOnScrollDirective } from './reveal-on-scroll.directive';

@Component({
  standalone: true,
  imports: [RevealOnScrollDirective],
  template: `<div [awsRevealOnScroll]="150">content</div>`,
})
class HostComponent {}

describe('RevealOnScrollDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let element: HTMLElement;
  let observeSpy: jest.Mock;
  let disconnectSpy: jest.Mock;
  let intersectionCallback: IntersectionObserverCallback;
  let reducedMotion: boolean;

  const buildFixture = () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    element = fixture.nativeElement.querySelector('div');
  };

  beforeEach(() => {
    reducedMotion = false;
    observeSpy = jest.fn();
    disconnectSpy = jest.fn();

    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce') ? reducedMotion : false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia;

    (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      class {
        constructor(cb: IntersectionObserverCallback) {
          intersectionCallback = cb;
        }
        observe = observeSpy;
        disconnect = disconnectSpy;
        unobserve = jest.fn();
        takeRecords = jest.fn();
      } as unknown as typeof IntersectionObserver;

    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('starts hidden and observes the element', () => {
    buildFixture();
    expect(element.style.opacity).toBe('0');
    expect(element.style.transitionDelay).toBe('150ms');
    expect(observeSpy).toHaveBeenCalledWith(element);
  });

  it('reveals and disconnects when the element intersects', () => {
    buildFixture();
    intersectionCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(element.style.opacity).toBe('1');
    expect(element.style.transform).toBe('none');
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('shows immediately and skips observing when reduced motion is preferred', () => {
    reducedMotion = true;
    buildFixture();
    expect(element.style.opacity).toBe('');
    expect(observeSpy).not.toHaveBeenCalled();
  });

  it('disconnects on destroy', () => {
    buildFixture();
    fixture.destroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
