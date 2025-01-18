import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map, Observable, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private oidcSecurityService: OidcSecurityService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // Check if the user is authenticated by subscribing to the observable
    return this.oidcSecurityService.checkAuth().pipe(
      take(1), // Take the first emitted value and complete the observable
      map((auth) => {
        if (auth.isAuthenticated) {
          return true; // Allow access if authenticated
        } else {
          // Redirect to the landing page if not authenticated
          this.router.navigate(['/login']);
          return false; // Block access
        }
      })
    );
  }
}
