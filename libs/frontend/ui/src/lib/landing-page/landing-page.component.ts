import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartComponent } from '../chart/chart.component';

@Component({
  selector: 'aws-landing-page',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  @Output() login = new EventEmitter();

  features = [
    {
      title: 'Real-time Analytics',
      description:
        'Get instant insights into your portfolio performance with advanced analytics tools.',
    },
    {
      title: 'Global Markets',
      description:
        'Track investments across multiple markets and currencies in one place.',
    },
    {
      title: 'Bank-grade Security',
      description:
        'Your data is protected with enterprise-level security and encryption.',
    },
  ];

  chartData = {
    x: [new Date()],
    y: [1],
  };

  chartDat = [
    { month: 'Jan', value: 1000 },
    { month: 'Feb', value: 1200 },
    { month: 'Mar', value: 1100 },
    { month: 'Apr', value: 1400 },
    { month: 'May', value: 1800 },
    { month: 'Jun', value: 2200 },
  ];

  onClick() {
    this.login.emit();
  }

  ngOnInit(): void {
    const dates = [];
    const values = [];
    const today = new Date();
    const min = 100;
    const max = 1000;
    let currentValue = Math.floor(Math.random() * (max - min) + min);

    for (let i = 12; i > 0; i--) {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - i, 1);
      dates.push(firstDay);

      // Generate a small random step, allowing some backward steps but favoring upward.
      const step = Math.floor(Math.random() * 200 - 50); // Range: -50 to +150
      currentValue = currentValue + step;
      values.push(currentValue);
    }
    this.chartData = {
      x: dates,
      y: values,
    };
  }
}
