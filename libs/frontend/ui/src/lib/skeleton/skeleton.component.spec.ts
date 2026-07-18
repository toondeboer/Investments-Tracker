import { TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  it('renders as a pulsing block hidden from assistive tech', async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.className).toContain('animate-pulse');
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });
});
