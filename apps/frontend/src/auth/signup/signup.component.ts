import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

type Step = 'register' | 'confirm';

@Component({
  selector: 'aws-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignUpComponent {
  step: Step = 'register';

  email = '';
  password = '';
  confirmPassword = '';
  code = '';

  error = '';
  info = '';
  loading = false;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  get passwordMismatch(): boolean {
    return (
      this.confirmPassword.length > 0 && this.password !== this.confirmPassword
    );
  }

  async register(): Promise<void> {
    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    this.error = '';
    this.loading = true;
    try {
      await this.auth.signUp(this.email, this.password);
      this.step = 'confirm';
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Sign up failed.';
    } finally {
      this.loading = false;
    }
  }

  async confirm(): Promise<void> {
    this.error = '';
    this.loading = true;
    try {
      await this.auth.confirmSignUp(this.email, this.code.trim());
      await this.router.navigate(['/login']);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Confirmation failed.';
    } finally {
      this.loading = false;
    }
  }

  async resend(): Promise<void> {
    this.error = '';
    this.info = '';
    try {
      await this.auth.resendCode(this.email);
      this.info = 'A new code has been sent to your email.';
    } catch (err: unknown) {
      this.error =
        err instanceof Error ? err.message : 'Could not resend code.';
    }
  }
}
