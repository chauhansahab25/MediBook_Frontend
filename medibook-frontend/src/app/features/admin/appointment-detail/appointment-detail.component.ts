import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';

@Component({
  selector: 'app-appointment-detail',
  templateUrl: './appointment-detail.component.html',
  styleUrls: ['./appointment-detail.component.css']
})
export class AppointmentDetailComponent implements OnInit {
  appointment: any = null;
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointmentService: AppointmentService
  ) {}

  ngOnInit(): void {
    const appointmentId = this.route.snapshot.paramMap.get('id');
    if (appointmentId) {
      this.loadAppointment(+appointmentId);
    } else {
      this.error = 'No appointment ID provided';
      this.loading = false;
    }
  }

  loadAppointment(id: number): void {
    this.loading = true;
    this.error = null;

    this.appointmentService.getAppointmentById(id).subscribe({
      next: (appointment) => {
        this.appointment = appointment;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load appointment details';
        this.loading = false;
        console.error('Error loading appointment:', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/appointments']);
  }

  getStatusClass(status: string): string {
    return status?.toLowerCase() || '';
  }

  cancelAppointment(): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.appointmentService.cancelAppointment(this.appointment.appointmentId).subscribe({
        next: () => {
          this.appointment.status = 'Cancelled';
          alert('Appointment cancelled successfully!');
        },
        error: (err) => {
          alert('Failed to cancel appointment: ' + (err.message || 'Unknown error'));
        }
      });
    }
  }
}
