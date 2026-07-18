import { Component } from '@angular/core';

/**
 * Pulsing placeholder block shown while content loads. Size it with
 * Tailwind classes on the element, e.g.
 * `<aws-skeleton class="h-24" />` or `<aws-skeleton class="h-4 w-3/5" />`.
 */
@Component({
  selector: 'aws-skeleton',
  template: '',
  host: {
    class: 'block animate-pulse rounded-md bg-navy/40',
    'aria-hidden': 'true',
  },
})
export class SkeletonComponent {}
