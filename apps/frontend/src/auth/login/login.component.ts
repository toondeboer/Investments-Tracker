import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'aws-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async submit(): Promise<void> {
    this.error = '';
    this.loading = true;
    try {
      await this.auth.signIn(this.email, this.password);
      await this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Sign in failed.';
    } finally {
      this.loading = false;
    }
  }
}
