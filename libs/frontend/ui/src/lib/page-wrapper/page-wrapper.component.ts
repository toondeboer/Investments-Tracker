import { Component, OnInit, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Router, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '@ngrx/store';
import { getData, selectLoading } from '@aws/state';
import { ScrollingTextComponent } from '../scrolling-text/scrolling-text.component';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DialogService } from '../dialog/dialog.service';
import { CaptainPanelComponent } from '../captain-panel/captain-panel.component';
import {
  BottomNavComponent,
  BottomNavOption,
} from '../bottom-nav/bottom-nav.component';

// Must match Tailwind's `md` breakpoint (768px): below it the sidenav is
// replaced by the bottom tab bar and templates rely on `md:` utilities to
// switch the same way.
const MOBILE_QUERY = '(max-width: 767.98px)';

@Component({
  selector: 'aws-page-wrapper',
  templateUrl: './page-wrapper.component.html',
  styleUrls: ['./page-wrapper.component.scss'],
  imports: [
    RouterOutlet,
    ScrollingTextComponent,
    CommonModule,
    LucideAngularModule,
    BottomNavComponent,
  ],
})
export class PageWrapperComponent implements OnInit {
  private readonly router = inject(Router);
  private store = inject(Store);
  private readonly dialog = inject(DialogService);
  private readonly breakpoints = inject(BreakpointObserver);

  loading$ = this.store.select(selectLoading);
  isMobile = toSignal(
    this.breakpoints.observe(MOBILE_QUERY).pipe(map(({ matches }) => matches)),
    { initialValue: this.breakpoints.isMatched(MOBILE_QUERY) },
  );
  sidenavOpen = true;

  navigationOptions: BottomNavOption[] = [
    { path: 'dashboard', text: 'Dashboard', icon: 'LayoutDashboard' },
    { path: 'portfolios', text: 'Portfolios', icon: 'FolderOpen' },
    { path: 'settings', text: 'Settings', icon: 'Settings' },
  ];

  ngOnInit(): void {
    this.store.dispatch(getData());
  }

  openCaptain(): void {
    this.dialog.open(CaptainPanelComponent, { width: '440px' });
  }

  isActive(path: string): boolean {
    return (
      this.router.url === '/' + path ||
      this.router.url.startsWith('/' + path + '/')
    );
  }

  routeTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    window.sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
