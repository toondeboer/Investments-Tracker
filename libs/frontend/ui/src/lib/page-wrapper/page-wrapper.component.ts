import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { Router, RouterOutlet } from '@angular/router';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { Store } from '@ngrx/store';
import { getData } from '@aws/state';
import { ScrollingTextComponent } from '../scrolling-text/scrolling-text.component';
import { MatToolbar } from '@angular/material/toolbar';
import { MatListItem, MatNavList } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'aws-page-wrapper',
  templateUrl: './page-wrapper.component.html',
  styleUrls: ['./page-wrapper.component.scss'],
  imports: [
    RouterOutlet,
    MatSidenavContent,
    MatSidenavContainer,
    ScrollingTextComponent,
    MatToolbar,
    MatSidenav,
    MatNavList,
    CommonModule,
    MatButton,
    MatListItem
  ]
})
export class PageWrapperComponent implements OnInit, OnDestroy {
  mobileQuery: MediaQueryList;
  navigationOptions = [
    {
      path: 'dashboard',
      text: 'Dashboard',
    },
    {
      path: 'transactions',
      text: 'Transactions',
    },
  ];

  private _mobileQueryListener: () => void;

  constructor(
    changeDetectorRef: ChangeDetectorRef,
    media: MediaMatcher,
    private readonly router: Router,
    private store: Store
  ) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
  }

  ngOnInit(): void {
    this.store.dispatch(getData());
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  routeTo(route: string, snav: MatSidenav) {
    snav.close();
    this.router.navigate([route]);
  }
}
