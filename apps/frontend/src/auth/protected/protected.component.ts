import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Router } from '@angular/router';

@Component({
  selector: 'aws-protected',
  templateUrl: './protected.component.html',
  styleUrls: ['./protected.component.scss'],
  imports: [CommonModule],
})
export class ProtectedComponent implements OnInit {
  constructor(
    @Inject('ENVIRONMENT') private environment: any,
    private router: Router
  ) {}

  private readonly oidcSecurityService = inject(OidcSecurityService);

  isAuthenticated = false;

  title = 'Investment Tracker';
  description =
    'Track your investments, monitor portfolio value, and stay on top of your financial goals with ease.';
  features = [
    {
      title: 'Real-Time Tracking',
      description:
        'Get updates on your portfolio value and performance in real-time.',
    },
    {
      title: 'Investment History',
      description:
        'Review the history of your investments and track their growth.',
    },
    {
      title: 'Financial Insights',
      description:
        'Get personalized insights and recommendations based on your investment patterns.',
    },
  ];

  ngOnInit(): void {
    console.log(this.environment);
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
