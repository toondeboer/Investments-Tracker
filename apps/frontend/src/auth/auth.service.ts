import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../environments/environment';

const POOL = new CognitoUserPool({
  UserPoolId: environment.cognito.userPoolId,
  ClientId: environment.cognito.clientId,
  Storage: window.sessionStorage,
});

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  getIdToken(): string | null {
    const user = POOL.getCurrentUser();
    if (!user) return null;
    let token: string | null = null;
    // getSession fires synchronously when tokens are cached in sessionStorage.
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (!err && session?.isValid()) {
        token = session.getIdToken().getJwtToken();
      }
    });
    return token;
  }

  isAuthenticated(): boolean {
    const token = this.getIdToken();
    if (!token) return false;
    try {
      const { exp } = jwtDecode<{ exp: number }>(token);
      return exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  signIn(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: POOL,
        Storage: window.sessionStorage,
      });
      const details = new AuthenticationDetails({
        Username: email,
        Password: password,
      });
      user.authenticateUser(details, {
        onSuccess: () => resolve(),
        onFailure: reject,
        newPasswordRequired: () =>
          reject(
            new Error('A new password is required. Please contact support.'),
          ),
      });
    });
  }

  signUp(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const attrs = [new CognitoUserAttribute({ Name: 'email', Value: email })];
      POOL.signUp(email, password, attrs, [], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  confirmSignUp(email: string, code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: POOL,
        Storage: window.sessionStorage,
      });
      user.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  resendCode(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: POOL,
        Storage: window.sessionStorage,
      });
      user.resendConfirmationCode((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  signOut(): void {
    POOL.getCurrentUser()?.signOut();
    this.router.navigate(['/login']);
  }
}
