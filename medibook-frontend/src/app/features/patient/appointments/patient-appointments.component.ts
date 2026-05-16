import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentService } from '../../../core/services/payment.service';
import { MatDialog } from '@angular/material/dialog';
import { AppointmentDetailsDialogComponent } from '../../../shared/components/appointment-details-dialog/appointment-details-dialog.component';
import { AppointmentReviewDialogComponent } from '../../../shared/components/appointment-review-dialog/appointment-review-dialog.component';
import { RefundDialogComponent } from '../../../shared/components/refund-dialog/refund-dialog.component';
import { ProviderService } from '../../../core/services/provider.service';
import { UserService } from '../../../core/services/user.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-patient-appointments',
  templateUrl: './patient-appointments.component.html',
  styleUrls: ['./patient-appointments.component.css']
})
export class PatientAppointmentsComponent implements OnInit {
  appointments: any[] = [];
  filteredAppointments: any[] = [];
  loading = false;
  selectedTab = 'all';

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private paymentService: PaymentService,
    private providerService: ProviderService,
    private userService: UserService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    const user = this.authService.currentUserValue;
    if (!user || !user.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loading = true;

    this.appointmentService.getAppointmentsByPatient(user.userId).subscribe({
      next: async (data: any[]) => {
        const enrichedAppointments = [...data];

        // Enrich each appointment with provider details and payment status
        for (let apt of enrichedAppointments) {
          // 1. Resolve Provider Details
          if (!apt.providerName || apt.providerName.startsWith('Provider #') || apt.providerName.startsWith('User #')) {
            try {
              const provider = await firstValueFrom(this.providerService.getProviderById(apt.providerId)).catch(() => null);
              if (provider) {
                apt.providerName = provider.fullName || provider.FullName || `Provider #${apt.providerId}`;
                apt.specialization = provider.specialization || provider.Specialization || apt.specialization;
                
                if (apt.providerName.startsWith('Provider #') || apt.providerName.startsWith('User #')) {
                  const userData = await firstValueFrom(this.userService.getUserById(provider.userId)).catch(() => null);
                  if (userData) {
                    apt.providerName = userData.fullName;
                  }
                }
              }
            } catch (err) {
              console.warn(`Failed to enrich provider for appointment ${apt.appointmentId}:`, err);
            }
          }

          // 2. Resolve Real-Time Payment Status
          try {
            // Silently handle 404s if no payment record exists yet
            const payment = await firstValueFrom(this.paymentService.getPaymentByAppointment(apt.appointmentId)).catch(() => null);
            if (payment) {
              apt.paymentStatus = payment.status || payment.Status || apt.paymentStatus;
              apt.paymentAmount = payment.amount || payment.Amount || apt.paymentAmount;
              apt.transactionId = payment.transactionId || payment.TransactionId || apt.transactionId;
            } else {
              // Default states if no payment record is found in the database
              if (apt.status === 'Scheduled') {
                apt.paymentStatus = 'Pending';
              } else if (apt.status === 'Cancelled') {
                apt.paymentStatus = 'N/A';
              } else {
                apt.paymentStatus = 'Unpaid';
              }
            }
          } catch (err) {
            // Overall catch to prevent the entire list from failing
            apt.paymentStatus = apt.paymentStatus || 'Pending';
          }
          
          // 3. Resolve Patient Details (Current User)
          if (apt.patientId === user.userId) {
            apt.patientName = user.fullName || 'Anonymous';
            apt.patientEmail = user.email || 'N/A';
          }

          apt.specialization = apt.specialization || apt.serviceType || 'General Consultation';
        }

        this.appointments = enrichedAppointments;
        this.filterAppointments();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading appointments:', error);
        this.appointments = [];
        this.filteredAppointments = [];
        this.loading = false;
      }
    });
  }

  filterAppointments(): void {
    switch (this.selectedTab) {
      case 'upcoming':
        this.filteredAppointments = this.appointments.filter(apt => 
          ['Scheduled', 'Confirmed'].includes(apt.status)
        );
        break;
      case 'past':
        this.filteredAppointments = this.appointments.filter(apt => 
          ['Completed', 'Cancelled'].includes(apt.status)
        );
        break;
      case 'completed':
        this.filteredAppointments = this.appointments.filter(apt => 
          apt.status === 'Completed'
        );
        break;
      case 'cancelled':
        this.filteredAppointments = this.appointments.filter(apt => 
          apt.status === 'Cancelled'
        );
        break;
      default:
        this.filteredAppointments = this.appointments;
    }
  }

  selectTab(tab: string): void {
    this.selectedTab = tab;
    this.filterAppointments();
  }

  bookNewAppointment(): void {
    this.router.navigate(['/patient/search-providers']);
  }

  goBack(): void {
    this.router.navigate(['/patient/dashboard']);
  }

  viewDetails(appointment: any): void {
    this.dialog.open(AppointmentDetailsDialogComponent, {
      width: '600px',
      data: appointment,
      panelClass: 'premium-dialog-panel'
    });
  }

  rescheduleAppointment(appointment: any): void {
    console.log('Rescheduling appointment:', appointment);
    
    const newDate = prompt('Enter new date (YYYY-MM-DD):', appointment.appointmentDate);
    if (newDate === null) return;
    
    const newTime = prompt('Enter new time (e.g., 10:00 AM):', appointment.startTime);
    if (newTime === null) return;
    
    this.appointmentService.rescheduleAppointment(appointment.appointmentId, newDate, newTime).subscribe({
      next: (response) => {
        appointment.appointmentDate = newDate;
        appointment.startTime = newTime;
        alert(`Appointment rescheduled successfully!\n\nNew Date: ${this.formatDate(newDate)}\nNew Time: ${newTime}`);
      },
      error: (error) => {
        console.error('Error rescheduling appointment:', error);
        appointment.appointmentDate = newDate;
        appointment.startTime = newTime;
        alert(`Appointment rescheduled (local update)!\n\nNew Date: ${this.formatDate(newDate)}\nNew Time: ${newTime}`);
      }
    });
  }

  cancelAppointment(appointment: any): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      console.log('=== CANCELLING APPOINTMENT ===');
      console.log('Appointment object:', appointment);
      console.log('Appointment keys:', Object.keys(appointment));
      console.log('paymentStatus:', appointment.paymentStatus);
      console.log('isPaid:', appointment.isPaid);
      console.log('status:', appointment.status);
      console.log('paymentId:', appointment.paymentId);
      console.log('amount:', appointment.amount);
      console.log('paymentAmount:', appointment.paymentAmount);
      
      // Check multiple possible indicators of payment
      const isPaid = appointment.paymentStatus === 'Completed' || 
                     appointment.paymentStatus === 'Paid' ||
                     appointment.isPaid === true || 
                     appointment.status === 'Paid' ||
                     appointment.paymentId != null ||
                     appointment.paymentId !== undefined ||
                     appointment.transactionId != null;
      
      console.log('isPaid check result:', isPaid);
      
      if (isPaid) {
        console.log('Appointment is PAID - showing refund dialog');
        const paymentAmount = appointment.paymentAmount || appointment.amount || 550;
        const platformCharge = 50;
        const refundAmount = paymentAmount - platformCharge;
        
        console.log('Payment amount:', paymentAmount);
        console.log('Platform charge:', platformCharge);
        console.log('Refund amount:', refundAmount);
        
        // Open refund dialog
        const dialogRef = this.dialog.open(RefundDialogComponent, {
          width: '450px',
          panelClass: 'premium-dialog-panel',
          data: {
            appointmentId: appointment.appointmentId,
            originalAmount: paymentAmount,
            platformCharge: platformCharge,
            refundAmount: refundAmount
          }
        });
        
        dialogRef.afterClosed().subscribe(result => {
          console.log('Dialog closed with result:', result);
          if (result) {
            this.processRefundAndCancel(appointment, refundAmount);
          } else {
            this.cancelAppointmentOnly(appointment);
          }
        });
      } else {
        console.log('Appointment is NOT PAID - cancelling appointment only');
        this.cancelAppointmentOnly(appointment);
      }
    }
  }

  private processRefundAndCancel(appointment: any, refundAmount: number): void {
    console.log('Processing refund and cancelling appointment:', refundAmount);
    console.log('Appointment ID:', appointment.appointmentId);
    
    // First, get the payment details for this appointment
    this.paymentService.getPaymentByAppointment(appointment.appointmentId).subscribe({
      next: (payment) => {
        console.log('Found payment:', payment);
        
        if (payment && payment.paymentId) {
          // Call the refund API
          this.paymentService.refundPayment(payment.paymentId, refundAmount).subscribe({
            next: (refundResponse) => {
              console.log('Refund processed successfully:', refundResponse);
              
              // Update appointment payment status to Refunded
              appointment.paymentStatus = 'Refunded';
              appointment.isPaid = false;
              
              // Now cancel the appointment with updated payment status
              this.cancelAppointmentWithRefundStatus(appointment);
              
              alert(`✅ Appointment cancelled and refund of ₹${refundAmount.toFixed(2)} processed successfully!\n\nYour money will be returned in 2-3 working days.`);
            },
            error: (refundError) => {
              console.error('Error processing refund:', refundError);
              
              // Still cancel the appointment even if refund fails
              this.cancelAppointmentOnly(appointment);
              
              alert(`⚠️ Appointment cancelled but refund processing failed.\nPlease contact support with Appointment ID: ${appointment.appointmentId}`);
            }
          });
        } else {
          console.log('No payment found for appointment, cancelling without refund');
          this.cancelAppointmentOnly(appointment);
          alert('Appointment cancelled. No payment record found for refund.');
        }
      },
      error: (error) => {
        console.error('Error getting payment details:', error);
        
        // Still cancel the appointment
        this.cancelAppointmentOnly(appointment);
        
        alert(`⚠️ Appointment cancelled but could not verify payment status.\nPlease contact support with Appointment ID: ${appointment.appointmentId}`);
      }
    });
  }

  private cancelAppointmentWithRefundStatus(appointment: any): void {
    // Cancel the appointment using the existing cancel endpoint
    this.appointmentService.cancelAppointment(appointment.appointmentId).subscribe({
      next: (response) => {
        console.log('Appointment cancelled successfully:', response);
        
        // Update local appointment status to show refund status
        appointment.status = 'Cancelled';
        appointment.paymentStatus = 'Refunded';
        appointment.isPaid = false;
        
        // Then unbook the slot to make it available again
        if (appointment.slotId) {
          console.log('Unbooking slot:', appointment.slotId);
          this.appointmentService.unbookSlot(appointment.slotId).subscribe({
            next: () => {
              console.log('Slot unbooked successfully');
            },
            error: (slotError) => {
              console.error('Error unbooking slot:', slotError);
            }
          });
        }
        
        this.filterAppointments();
      },
      error: (error) => {
        console.error('Error cancelling appointment with refund status:', error);
        // Fall back to regular cancellation
        this.cancelAppointmentOnly(appointment);
      }
    });
  }

  private cancelAppointmentOnly(appointment: any): void {
    // First cancel the appointment
    this.appointmentService.cancelAppointment(appointment.appointmentId).subscribe({
      next: (response) => {
        console.log('Appointment cancelled successfully:', response);
        
        // Then unbook the slot to make it available again
        if (appointment.slotId) {
          console.log('Unbooking slot:', appointment.slotId);
          this.appointmentService.unbookSlot(appointment.slotId).subscribe({
            next: () => {
              console.log('Slot unbooked successfully');
            },
            error: (slotError) => {
              console.error('Error unbooking slot:', slotError);
            }
          });
        } else {
          console.log('No slotId found for appointment, cannot unbook slot');
        }
        
        appointment.status = 'Cancelled';
        this.filterAppointments();
      },
      error: (error) => {
        console.error('Error cancelling appointment:', error);
        appointment.status = 'Cancelled';
        this.filterAppointments();
      }
    });
  }

  addReview(appointment: any): void {
    const user = this.authService.currentUserValue;
    if (!user || !user.userId) return;

    this.dialog.open(AppointmentReviewDialogComponent, {
      width: '450px',
      panelClass: 'premium-dialog-panel',
      data: {
        appointmentId: appointment.appointmentId,
        patientId: user.userId,
        providerId: appointment.providerId,
        providerName: appointment.providerName
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        alert('Thank you for your feedback!');
      }
    });
  }

  deleteAppointment(appointment: any): void {
    if (confirm('Are you sure you want to permanently delete this appointment record?')) {
      this.appointmentService.deleteAppointment(appointment.appointmentId).subscribe({
        next: () => {
          this.appointments = this.appointments.filter(a => a.appointmentId !== appointment.appointmentId);
          this.filterAppointments();
          alert('Appointment record deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting appointment:', error);
          alert('Failed to delete appointment record. Please try again.');
        }
      });
    }
  }

  resetData(): void {
    this.loadAppointments();
    alert('Data refreshed from database!');
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatTime(timeString: string): string {
    return timeString;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Scheduled': return '#2196F3';
      case 'Confirmed': return '#4CAF50';
      case 'Completed': return '#9C27B0';
      case 'Cancelled': return '#F44336';
      case 'Pending': return '#FF9800';
      case 'Unpaid': return '#78909c';
      case 'N/A': return '#CFD8DC';
      case 'Paid': return '#4CAF50';
      case 'Refunded': return '#FF5722';
      default: return '#757575';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Scheduled': return 'event';
      case 'Confirmed': return 'check_circle';
      case 'Completed': return 'done_all';
      case 'Cancelled': return 'cancel';
      case 'Pending': return 'hourglass_empty';
      case 'Unpaid': return 'payments';
      case 'N/A': return 'remove_circle_outline';
      case 'Paid': return 'verified';
      case 'Refunded': return 'undo';
      default: return 'help';
    }
  }

  setTab(tab: string): void {
    this.selectedTab = tab;
    this.filterAppointments();
  }
}
