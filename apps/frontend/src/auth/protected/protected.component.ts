import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';

@Component({
  selector: 'app-protected',
  templateUrl: './protected.component.html',
  styleUrls: ['./protected.component.scss'],
  imports: [CommonModule],
})
export class ProtectedComponent implements OnInit {
  constructor(@Inject('ENVIRONMENT') private environment: any) {}

  private readonly oidcSecurityService = inject(OidcSecurityService);

  configuration$ = this.oidcSecurityService.getConfiguration();

  userData$ = this.oidcSecurityService.userData$;

  isAuthenticated = false;

  ngOnInit(): void {
    console.log(this.environment);
    this.oidcSecurityService.checkAuth().subscribe(({ isAuthenticated }) => {
      this.isAuthenticated = isAuthenticated;

      console.warn('authenticated: ', isAuthenticated);
    });
  }

  login(): void {
    console.log(this.isAuthenticated);
    this.oidcSecurityService.authorize();
  }

  logout(): void {
    // Clear session storage
    if (window.sessionStorage) {
      window.sessionStorage.clear();
    }

    const clientId = '3o34bbl92faeo9ljo11eebtim2';
    const logoutUri = `${this.environment.baseUrl}/callback`;
    const cognitoDomain =
      'https://us-east-1licb4lgde.auth.us-east-1.amazoncognito.com';
    console.log(
      `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
        logoutUri
      )}`
    );
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
      logoutUri
    )}`;
  }
}
