import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Router } from '@angular/router';
import { LandingPageComponent } from '../../../../../libs/frontend/ui/src/lib/landing-page.component';

@Component({
  selector: 'aws-protected',
  templateUrl: './protected.component.html',
  styleUrls: ['./protected.component.scss'],
  imports: [CommonModule, LandingPageComponent],
})
export class ProtectedComponent implements OnInit {
  constructor(
    @Inject('ENVIRONMENT') private environment: any,
    private router: Router
  ) {}

  private readonly oidcSecurityService = inject(OidcSecurityService);

  isAuthenticated = false;

  ngOnInit(): void {
    this.oidcSecurityService.checkAuth().subscribe(({ isAuthenticated }) => {
      this.isAuthenticated = isAuthenticated;

      if (isAuthenticated) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  login(): void {
    if (this.isAuthenticated) {
      this.router.navigate(['/dashboard']);
    } else {
      this.oidcSecurityService.authorize();
    }
  }
}
