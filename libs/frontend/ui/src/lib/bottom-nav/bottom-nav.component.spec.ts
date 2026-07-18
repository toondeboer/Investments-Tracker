import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../icons';
import { BottomNavComponent } from './bottom-nav.component';

const OPTIONS = [
  { path: 'dashboard', text: 'Dashboard', icon: 'LayoutDashboard' },
  { path: 'portfolios', text: 'Portfolios', icon: 'FolderOpen' },
  { path: 'settings', text: 'Settings', icon: 'Settings' },
];

describe('BottomNavComponent', () => {
  let fixture: ComponentFixture<BottomNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNavComponent, LucideAngularModule.pick(APP_ICONS)],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    fixture.componentInstance.options = OPTIONS;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders one tab per navigation option with its label', () => {
    const links: NodeListOf<HTMLAnchorElement> =
      fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBe(3);
    expect(links[0].textContent).toContain('Dashboard');
    expect(links[1].textContent).toContain('Portfolios');
    expect(links[2].textContent).toContain('Settings');
  });

  it('links each tab to its route', () => {
    const links: NodeListOf<HTMLAnchorElement> =
      fixture.nativeElement.querySelectorAll('a');
    expect(links[0].getAttribute('href')).toBe('/dashboard');
    expect(links[1].getAttribute('href')).toBe('/portfolios');
    expect(links[2].getAttribute('href')).toBe('/settings');
  });
});
