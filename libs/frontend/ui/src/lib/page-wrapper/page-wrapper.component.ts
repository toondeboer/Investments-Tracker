import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { getData, selectLoading } from '@aws/state';
import { ScrollingTextComponent } from '../scrolling-text/scrolling-text.component';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DialogService } from '../dialog/dialog.service';
import { CaptainPanelComponent } from '../captain-panel/captain-panel.component';

@Component({
  selector: 'aws-page-wrapper',
  templateUrl: './page-wrapper.component.html',
  styleUrls: ['./page-wrapper.component.scss'],
  imports: [
    RouterOutlet,
    ScrollingTextComponent,
    CommonModule,
    LucideAngularModule,
  ],
})
export class PageWrapperComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private store = inject(Store);
  private readonly dialog = inject(DialogService);

  loading$ = this.store.select(selectLoading);
  mobileQuery: MediaQueryList;
  sidenavOpen: boolean;

  navigationOptions = [
    { path: 'dashboard',  text: 'Dashboard',  icon: 'LayoutDashboard' },
    { path: 'portfolios', text: 'Portfolios', icon: 'FolderOpen' },
    { path: 'settings',   text: 'Settings',   icon: 'Settings' },
  ];

  private _mobileQueryListener: () => void;

  constructor() {
    const changeDetectorRef = inject(ChangeDetectorRef);
    const media = inject(MediaMatcher);

    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    // Open by default on desktop, closed on mobile.
    this.sidenavOpen = !this.mobileQuery.matches;
    this._mobileQueryListener = () => {
      // Keep sidenav open when expanding to desktop, close when shrinking to mobile.
      this.sidenavOpen = !this.mobileQuery.matches;
      changeDetectorRef.detectChanges();
    };
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  ngOnInit(): void {
    this.store.dispatch(getData());
  }

  openCaptain(): void {
    this.dialog.open(CaptainPanelComponent, { width: '440px' });
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  isActive(path: string): boolean {
    return this.router.url === '/' + path || this.router.url.startsWith('/' + path + '/');
  }

  routeTo(route: string): void {
    if (this.mobileQuery.matches) {
      this.sidenavOpen = false;
    }
    this.router.navigate([route]);
  }

  logout(): void {
    window.sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
