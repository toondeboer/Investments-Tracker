import { Route } from '@angular/router';
import {
  DashboardComponent,
  DemoComponent,
  PageWrapperComponent,
  PortfoliosComponent,
  SettingsComponent,
  TransactionsComponent,
} from '@aws/ui';
import { LandingWrapperComponent } from '../auth/landing-wrapper/landing-wrapper.component';
import { LoginComponent } from '../auth/login/login.component';
import { SignUpComponent } from '../auth/signup/signup.component';
import { AuthGuard } from '../auth/guard/auth.guard';

export const appRoutes: Route[] = [
  { path: 'login', component: LandingWrapperComponent },
  { path: 'demo', component: DemoComponent },
  { path: 'signin', component: LoginComponent },
  { path: 'signup', component: SignUpComponent },
  { path: 'callback', redirectTo: 'login' },
  {
    path: '',
    component: PageWrapperComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'portfolios', component: PortfoliosComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'transactions', redirectTo: 'portfolios' },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
