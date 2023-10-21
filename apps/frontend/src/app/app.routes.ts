import { Route } from '@angular/router';
import {
  DashboardComponent,
  PageWrapperComponent,
  TransactionsComponent,
} from '@aws/ui';

export const appRoutes: Route[] = [
  {
    path: '',
    component: PageWrapperComponent,
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
