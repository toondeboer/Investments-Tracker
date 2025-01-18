import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Router } from '@angular/router';

@Component({
  selector: 'aws-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './callback.component.html',
  styleUrl: './callback.component.scss',
})
export class CallbackComponent implements OnInit {
  constructor(private router: Router) {}
  private readonly oidcSecurityService = inject(OidcSecurityService);

  isAuthenticated = false;

  ngOnInit(): void {
    this.oidcSecurityService.checkAuth().subscribe(({ isAuthenticated }) => {
      this.isAuthenticated = isAuthenticated;

      if (isAuthenticated) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/login']);
      }

      console.warn('authenticated: ', isAuthenticated);
    });
  }
}
