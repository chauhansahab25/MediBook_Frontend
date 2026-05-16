import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'MediBook';
  
  constructor(private authService: AuthService, private router: Router) {}

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  get userRole(): string | null {
    return this.authService.userRole;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  navigateToDashboard(): void {
    const role = this.userRole;
    if (role === 'Patient') {
      this.router.navigate(['/patient/dashboard']);
    } else if (role === 'Provider') {
      this.router.navigate(['/provider/dashboard']);
    } else if (role === 'Admin') {
      this.router.navigate(['/admin/dashboard']);
    }
  }
}
