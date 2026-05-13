import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      phone: [''],
      role: ['Patient', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup): any {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  setRole(role: string): void {
    this.registerForm.patchValue({ role });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    const { fullName, email, password, phone, role } = this.registerForm.value;

    this.authService.register({ fullName, email, password, phone, role }).subscribe({
      next: (response) => {
        this.loading = false;
        this.snackBar.open('Registration successful! Please log in.', 'Close', { duration: 3000 });
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(error.error?.message || 'Registration failed', 'Close', { duration: 3000 });
      }
    });
  }

  signInWithGoogle(): void {
    this.loading = true;
    this.authService.googleAuth().subscribe({
      next: (response) => {
        this.loading = false;
        this.snackBar.open('Google sign-up successful!', 'Close', { duration: 3000 });
        const role = response.role || 'Patient';
        this.redirectBasedOnRole(role);
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open(error.error?.message || 'Google sign-up failed', 'Close', { duration: 3000 });
      }
    });
  }

  private redirectBasedOnRole(role: string): void {
    switch (role) {
      case 'Patient':
        this.router.navigate(['/patient/dashboard']);
        break;
      case 'Provider':
        this.router.navigate(['/provider/dashboard']);
        break;
      case 'Admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }
}
