import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { appRoutes } from './app.routes';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StoreModule } from '@ngrx/store';
import { StateModule } from '@aws/state';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

@NgModule({
  declarations: [AppComponent, DashboardComponent],
  imports: [
    BrowserModule,
    RouterModule.forRoot(appRoutes, { initialNavigation: 'enabledBlocking' }),
    StoreModule.forRoot(),
    StateModule,
    StoreDevtoolsModule.instrument(),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
