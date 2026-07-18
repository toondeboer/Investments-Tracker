import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

export interface BottomNavOption {
  path: string;
  text: string;
  icon: string;
}

@Component({
  selector: 'aws-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
})
export class BottomNavComponent {
  @Input() options: BottomNavOption[] = [];
}
