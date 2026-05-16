import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-booking-details',
  templateUrl: './booking-details.component.html',
  styleUrls: ['./booking-details.component.css']
})
export class BookingDetailsComponent implements OnInit {
  booking: any = null;
  loading = false;
  error = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private appointmentService: AppointmentService,
    private paymentService: PaymentService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBookingDetails(parseInt(id, 10));
    }
  }

  loadBookingDetails(id: number): void {
    this.loading = true;
    this.error = '';

    console.log('Fetching booking details for ID:', id);

    this.appointmentService.getAppointmentById(id).subscribe({
      next: (data) => {
        console.log('Booking details received by ID:', data);
        this.booking = data;
        this.fetchAdditionalDetails(data);
      },
      error: (err) => {
        console.log('Fetching by standard ID failed, trying by slot ID...');
        // If not found by ID, try fetching by Slot ID
        this.appointmentService.getAppointmentBySlotId(id).subscribe({
          next: (dataBySlot) => {
            console.log('Booking details received by Slot ID:', dataBySlot);
            this.booking = dataBySlot;
            this.fetchAdditionalDetails(dataBySlot);
          },
          error: (secondErr) => {
            console.error('Failed to load booking details even by Slot ID:', secondErr);
            this.error = 'Failed to load booking details: ' + (secondErr.message || 'Unknown error');
            this.loading = false;
          }
        });
      }
    });
  }

  private fetchAdditionalDetails(appointment: any): void {
    const appointmentId = appointment.appointmentId || appointment.id || appointment.AppointmentId;
    const patientId = appointment.patientId || appointment.PatientId;

    console.log('Enriching details for:', { appointmentId, patientId });

    if (!appointmentId) {
      this.loading = false;
      return;
    }

    // Fetch Payment and Patient User info in parallel
    Promise.all([
      this.paymentService.getPaymentByAppointment(appointmentId).toPromise().catch(err => {
        console.warn('Payment fetch failed (likely 404):', err);
        return null;
      }),
      this.userService.getUsers().toPromise().catch(err => {
        console.warn('Users fetch failed:', err);
        return [];
      })
    ]).then(([payment, users]) => {
      console.log('Enrichment data received:', { 
        hasPayment: !!payment, 
        userCount: users?.length,
        targetPatientId: patientId,
        availableUserIds: users?.map((u: any) => u.userId || u.UserId || u.id)
      });
      
      if (this.booking) {
        // Update Payment Info
        if (payment) {
          this.booking.paymentStatus = payment.status || payment.Status || 'Paid';
          this.booking.paymentAmount = payment.amount || payment.Amount;
          this.booking.transactionId = payment.transactionId || payment.TransactionId;
        } else {
          // If no payment record found via API, check if it's already in the booking object
          this.booking.paymentStatus = this.booking.paymentStatus || 'Unpaid';
        }

        // Update Patient Info - use loose equality for ID matching
        const patientUser = (users || []).find((u: any) => {
          const uId = u.userId || u.UserId || u.id;
          return uId == patientId;
        });
        
        console.log('Final match result for patientId ' + patientId + ':', patientUser);
        
        if (patientUser) {
          this.booking.patientName = patientUser.fullName || patientUser.FullName;
          this.booking.patientEmail = patientUser.email || patientUser.Email;
          this.booking.patientPhone = patientUser.phone || patientUser.Phone;
          console.log('Enriched booking with name:', this.booking.patientName);
        } else {
          console.warn('MATCH FAILED: Could not find patientUser in users list for ID:', patientId);
          // Fallback: If we can't find the user but have a patientId, at least show that
          if (!this.booking.patientName) {
            this.booking.patientName = `Patient #${patientId}`;
          }
        }
      }
      this.loading = false;
    }).catch(err => {
      console.error('Final enrichment catch:', err);
      if (this.booking && !this.booking.paymentStatus) {
        this.booking.paymentStatus = 'Unpaid';
      }
      this.loading = false;
    });
  }

  goBack(): void {
    this.router.navigate(['/provider/schedule']);
  }

  cancelBooking(): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      const appointmentId = this.booking?.appointmentId || this.booking?.id;
      if (appointmentId) {
        this.appointmentService.cancelAppointment(appointmentId).subscribe({
          next: () => {
            alert('Appointment cancelled successfully!');
            this.router.navigate(['/provider/schedule']);
          },
          error: (err) => {
            alert('Failed to cancel appointment: ' + (err.message || 'Unknown error'));
          }
        });
      }
    }
  }

  rescheduleBooking(): void {
    alert('Reschedule feature - You can modify the appointment time.');
  }

  getInitials(name: string): string {
    if (!name) return 'P';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
}
