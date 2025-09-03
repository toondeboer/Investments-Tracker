import {
  Component,
  OnInit,
  HostListener,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface Step {
  number: number;
  title: string;
  description: string;
}

@Component({
  selector: 'aws-landing-page',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  @Output() login = new EventEmitter();

  title = 'portfolio-tracker';
  isScrolled = false;
  chartLoaded = false;
  portfolioReturn = 12.5;
  portfolioValue = 24856;
  currentYear = new Date().getFullYear();

  features: Feature[] = [
    {
      icon: '👤',
      title: 'Secure Account Management',
      description:
        'Create your personal account with enterprise-grade security. Your data is encrypted and protected at all times.',
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description:
        'Beautiful line and bar charts that visualize your portfolio performance over time with detailed insights and trends.',
    },
    {
      icon: '🔗',
      title: 'DeGiro Integration',
      description:
        'Seamlessly upload CSV files from DeGiro. Our smart parser automatically imports and organizes your trading data.',
    },
    {
      icon: '⚡',
      title: 'Real-Time Data',
      description:
        'Live market data powered by Yahoo Finance API. Stay updated with real-time prices and market movements.',
    },
  ];

  steps: Step[] = [
    {
      number: 1,
      title: 'Create Account',
      description:
        'Sign up with your email and create a secure password. It takes less than 30 seconds.',
    },
    {
      number: 2,
      title: 'Upload Data',
      description:
        "Download your CSV from DeGiro and upload it to our platform. We'll handle the rest automatically.",
    },
    {
      number: 3,
      title: 'Track Performance',
      description:
        'Watch your portfolio come to life with real-time analytics and beautiful visualizations.',
    },
  ];

  ngOnInit() {
    // Simulate chart loading
    setTimeout(() => {
      this.chartLoaded = true;
    }, 2000);

    // Animate portfolio values
    this.animateValue('portfolioReturn', 0, 12.5, 2000);
    this.animateValue('portfolioValue', 20000, 24856, 2500);
  }

  onClick() {
    this.login.emit();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 100;
  }

  scrollTo(elementId: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  trackByFeature(index: number, feature: Feature): string {
    return feature.title;
  }

  trackByStep(index: number, step: Step): number {
    return step.number;
  }

  onFeatureHover(feature: Feature) {
    // Add any hover logic here
  }

  onFeatureLeave(feature: Feature) {
    // Add any hover leave logic here
  }

  private animateValue(
    property: string,
    start: number,
    end: number,
    duration: number
  ) {
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = start + (end - start) * this.easeOutCubic(progress);

      (this as any)[property] =
        property === 'portfolioReturn'
          ? Math.round(currentValue * 10) / 10
          : Math.round(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
