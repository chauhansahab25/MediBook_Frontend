import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {
  constructor(private authService: AuthService, private router: Router) {}

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  navigateToAuth(): void {
    this.router.navigate(['/auth/login']);
  }

  navigateToDashboard(): void {
    const role = this.authService.userRole;
    if (role === 'Patient') {
      this.router.navigate(['/patient/dashboard']);
    } else if (role === 'Provider') {
      this.router.navigate(['/provider/dashboard']);
    } else if (role === 'Admin') {
      this.router.navigate(['/admin/dashboard']);
    }
  }
}
