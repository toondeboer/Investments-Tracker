import {
  Component,
  OnInit,
  HostListener,
  EventEmitter,
  Output,
  OnDestroy,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ChartComponent } from '../chart/chart.component';
import { RevealOnScrollDirective } from '../reveal-on-scroll/reveal-on-scroll.directive';
import { buildDemoSeries, buildDemoSummary } from '../demo/demo-data';

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
  imports: [
    CommonModule,
    DecimalPipe,
    RouterLink,
    LucideAngularModule,
    ChartComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit, OnDestroy {
  @Output() login = new EventEmitter();

  title = 'portfolio-tracker';
  isScrolled = false;
  mobileMenuOpen = false;
  currentYear = new Date().getFullYear();

  // Rotating hero verb (nautical flavour, cross-faded via CSS).
  heroWords = ['Navigate', 'Chart', 'Captain', 'Steer'];
  heroWordIndex = 0;
  heroWordVisible = true;
  private wordTimer?: ReturnType<typeof setInterval>;

  // Hero chart + stat cards — driven by the shared static demo series so the
  // numbers and the curve tell the same story.
  private readonly demoSeries = buildDemoSeries();
  private readonly demoSummary = buildDemoSummary(this.demoSeries);
  heroChartX: Date[] = this.demoSeries.dates;
  heroChartY: number[] = this.demoSeries.portfolioValues;

  portfolioReturn = 0;
  portfolioValue = 0;

  get heroWord(): string {
    return this.heroWords[this.heroWordIndex];
  }

  features: Feature[] = [
    {
      icon: 'ShieldCheck',
      title: 'Secure Harbour',
      description:
        'Enterprise-grade security keeps your portfolio data encrypted and protected at all times — a safe harbour for your investments.',
    },
    {
      icon: 'Sparkles',
      title: 'AI-Powered Insights',
      description:
        'Intelligent analytics chart your course. Beautiful visualisations and trend detection help you navigate markets with confidence.',
    },
    {
      icon: 'Upload',
      title: 'DeGiro Integration',
      description:
        'Seamlessly import CSV exports from DeGiro. Our smart parser automatically organises your trading history — no manual entry.',
    },
    {
      icon: 'Zap',
      title: 'Real-Time Data',
      description:
        'Live market data powered by Yahoo Finance. Stay current with real-time prices and portfolio valuation as markets move.',
    },
  ];

  steps: Step[] = [
    {
      number: 1,
      title: 'Set Sail',
      description:
        'Create your account in under 30 seconds. sailor handles the authentication so you can focus on your investments.',
    },
    {
      number: 2,
      title: 'Chart Your Course',
      description:
        'Export your CSV from DeGiro and upload it. Our AI engine automatically charts your complete trading history.',
    },
    {
      number: 3,
      title: 'Navigate to Growth',
      description:
        'Watch your portfolio come alive with real-time analytics, performance charts, and intelligent insights.',
    },
  ];

  ngOnInit() {
    // Count up the hero stats to the demo summary's headline figures.
    this.animateValue(
      'portfolioReturn',
      0,
      Math.round(this.demoSummary.totalReturn.percentage * 10) / 10,
      2000
    );
    this.animateValue(
      'portfolioValue',
      Math.round(this.demoSummary.totalInvested),
      Math.round(this.demoSummary.portfolioValue),
      2500
    );

    // Cross-fade the rotating hero verb.
    this.wordTimer = setInterval(() => {
      this.heroWordVisible = false;
      setTimeout(() => {
        this.heroWordIndex = (this.heroWordIndex + 1) % this.heroWords.length;
        this.heroWordVisible = true;
      }, 350);
    }, 2800);
  }

  onClick() {
    this.login.emit();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;

    // Prevent body scroll when menu is open
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (event.target.innerWidth > 768 && this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
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

  // Make sure to close mobile menu on component destroy
  ngOnDestroy(): void {
    document.body.style.overflow = '';
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
    }
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
