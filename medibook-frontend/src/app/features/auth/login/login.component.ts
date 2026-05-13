import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    console.log('onSubmit called');
    console.log('Form valid:', this.loginForm.valid);
    console.log('Form values:', this.loginForm.value);

    if (this.loginForm.invalid) {
      console.log('Form is invalid, returning');
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;
    console.log('Attempting login with:', { email, password: '***' });

    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.loading = false;
        this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
        // Backend returns role directly, not nested in user object
        const role = response.role || 'Patient';
        this.redirectBasedOnRole(role);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.loading = false;
        this.snackBar.open(error.error?.message || 'Login failed', 'Close', { duration: 3000 });
      }
    });
  }

  // Backup click handler for the sign in button
  onSignInClick(): void {
    console.log('Sign in button clicked');
    this.onSubmit();
  }

  private redirectBasedOnRole(role: string): void {
    console.log('Redirecting based on role:', role);
    switch (role) {
      case 'Patient':
        console.log('Navigating to Patient dashboard');
        this.router.navigate(['/patient/dashboard']).then(result => {
          console.log('Navigation result:', result);
        }).catch(err => {
          console.error('Navigation error:', err);
        });
        break;
      case 'Provider':
        console.log('Navigating to Provider dashboard');
        this.router.navigate(['/provider/dashboard']).then(result => {
          console.log('Navigation result:', result);
        }).catch(err => {
          console.error('Navigation error:', err);
        });
        break;
      case 'Admin':
        console.log('Navigating to Admin dashboard');
        this.router.navigate(['/admin/dashboard']).then(result => {
          console.log('Navigation result:', result);
        }).catch(err => {
          console.error('Navigation error:', err);
        });
        break;
      default:
        console.log('Navigating to home (default)');
        this.router.navigate(['/']);
    }
  }

  signInWithGoogle(): void {
    this.loading = true;
    this.authService.googleAuth().subscribe({
      next: (response) => {
        this.loading = false;
        this.snackBar.open('Google login successful!', 'Close', { duration: 3000 });
        const role = response.role || 'Patient';
        this.redirectBasedOnRole(role);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(error.error?.message || 'Google login failed', 'Close', { duration: 3000 });
      }
    });
  }
}
