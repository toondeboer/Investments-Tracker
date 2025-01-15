import { NgxEchartsModule } from 'ngx-echarts';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { appRoutes } from './app.routes';
import { StoreModule } from '@ngrx/store';
import { StateModule } from '@aws/state';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';
import { HttpClientModule } from '@angular/common/http';
import { UiModule } from '@aws/ui';
import { YahooModule } from '@aws/yahoo';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from '../environments/environment';
import { AuthModule } from 'angular-auth-oidc-client';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from '../auth/jwtInterceptor/JwtInterceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(appRoutes, { initialNavigation: 'enabledBlocking' }),
    StoreModule.forRoot(),
    EffectsModule.forRoot(),
    StateModule,
    YahooModule,
    StoreDevtoolsModule.instrument(),
    UiModule,
    NgxEchartsModule.forRoot({
      /**
       * This will import all modules from echarts.
       * If you only need custom modules,
       * please refer to [Custom Build] section.
       */
      echarts: () => import('echarts'), // or import('./path-to-my-custom-echarts')
    }),
    AuthModule.forRoot({
      config: {
        authority:
          'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_liCB4LgDE',
        redirectUrl: `${environment.baseUrl}/callback`,
        clientId: '3o34bbl92faeo9ljo11eebtim2',
        scope: 'email openid profile',
        responseType: 'code',
      },
    }),
  ],
  providers: [
    { provide: 'ENVIRONMENT', useValue: environment },
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
  exports: [AuthModule],
})
export class AppModule {}
