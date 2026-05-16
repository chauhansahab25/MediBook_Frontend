import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ProviderService } from '../../../core/services/provider.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patient-dashboard',
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.css']
})
export class PatientDashboardComponent implements OnInit {
  user: any;
  upcomingAppointments = 0;
  pastAppointments = 0;
  providersCount = 0;
  loading = true;
  error = '';

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private providerService: ProviderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;
    this.loadDashboardStats();
  }

  private loadDashboardStats(): void {
    if (!this.user || !this.user.userId) return;
    
    this.loading = true;
    this.error = '';

    // Load patient-specific appointments from API for real-time counts
    this.appointmentService.getAppointmentsByPatient(this.user.userId).subscribe({
      next: (appointments: any[]) => {
        // Correctly categorize based on status and date
        this.upcomingAppointments = appointments.filter((a: any) => 
          ['Scheduled', 'Confirmed'].includes(a.status)
        ).length;
        
        this.pastAppointments = appointments.filter((a: any) => 
          a.status === 'Completed'
        ).length;
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load dashboard appointments:', err);
        this.loading = false;
      }
    });

    // Load total providers count from API
    this.providerService.getProviders().subscribe({
      next: (providers) => {
        this.providersCount = providers.length;
      },
      error: (err) => {
        console.error('Failed to load providers count:', err);
      }
    });
  }

  navigateToSearchProviders(): void {
    this.router.navigate(['/patient/search-providers']);
  }

  navigateToAppointments(): void {
    this.router.navigate(['/patient/appointments']);
  }

  navigateToMedicalRecords(): void {
    this.router.navigate(['/patient/medical-records']);
  }

  navigateToReviews(): void {
    this.router.navigate(['/patient/reviews']);
  }

  navigateToTransactionHistory(): void {
    this.router.navigate(['/patient/transaction-history']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
