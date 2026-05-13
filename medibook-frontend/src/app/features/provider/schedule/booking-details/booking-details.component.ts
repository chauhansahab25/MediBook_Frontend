import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AppointmentService } from '../../../../core/services/appointment.service';

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
    private appointmentService: AppointmentService
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
        this.loading = false;
      },
      error: (err) => {
        console.log('Fetching by standard ID failed, trying by slot ID...');
        // If not found by ID, try fetching by Slot ID
        this.appointmentService.getAppointmentBySlotId(id).subscribe({
          next: (dataBySlot) => {
            console.log('Booking details received by Slot ID:', dataBySlot);
            this.booking = dataBySlot;
            this.loading = false;
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
