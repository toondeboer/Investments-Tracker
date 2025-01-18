import { Route } from '@angular/router';
import {
  DashboardComponent,
  PageWrapperComponent,
  TransactionsComponent,
} from '@aws/ui';
import { ProtectedComponent } from '../auth/protected/protected.component';
import { CallbackComponent } from '../auth/callback/callback.component';
import { AuthGuard } from '../auth/guard/auth.guard';

export const appRoutes: Route[] = [
  { path: 'login', component: ProtectedComponent },
  {
    path: 'callback',
    component: CallbackComponent,
  },
  {
    path: '',
    component: PageWrapperComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'transactions',
        component: TransactionsComponent,
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
