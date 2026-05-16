import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppointmentService } from '../../../core/services/appointment.service';
import { UserService } from '../../../core/services/user.service';
import { ProviderService } from '../../../core/services/provider.service';
import { PaymentService } from '../../../core/services/payment.service';

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
    private appointmentService: AppointmentService,
    private userService: UserService,
    private providerService: ProviderService,
    private paymentService: PaymentService
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

    firstValueFrom(this.appointmentService.getAppointmentById(id))
      .then(async (appointment) => {
        if (!appointment) {
          throw new Error('Appointment not found');
        }

        try {
          // Enrich data in parallel
          const [patientUser, providerProfile, payment] = await Promise.all([
            firstValueFrom(this.userService.getUserById(appointment.patientId)).catch(() => null),
            firstValueFrom(this.providerService.getProviderById(appointment.providerId)).catch(() => null),
            firstValueFrom(this.paymentService.getPaymentByAppointment(id)).catch(() => null)
          ]);

          let providerUser = null;
          if (providerProfile) {
            providerUser = await firstValueFrom(this.userService.getUserById(providerProfile.userId)).catch(() => null);
          }

          this.appointment = {
            ...appointment,
            patientName: patientUser?.fullName || appointment.patientName || `Patient #${appointment.patientId}`,
            patientEmail: patientUser?.email || 'N/A',
            providerName: providerUser?.fullName || appointment.providerName || `Provider #${appointment.providerId}`,
            providerEmail: providerUser?.email || 'N/A',
            specialization: providerProfile?.specialization || appointment.specialization || 'N/A',
            paymentStatus: payment?.status || appointment.paymentStatus || 'Pending',
            paymentAmount: payment?.amount || appointment.paymentAmount || 0,
            transactionId: payment?.transactionId || appointment.transactionId || 'N/A'
          };
        } catch (mergeError) {
          console.warn('Failed to fully enrich appointment data:', mergeError);
          this.appointment = appointment; // Fallback to raw data
        }

        this.loading = false;
      })
      .catch((err) => {
        this.error = 'Failed to load appointment details: ' + (err.message || 'Unknown error');
        this.loading = false;
        console.error('Error loading appointment:', err);
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
