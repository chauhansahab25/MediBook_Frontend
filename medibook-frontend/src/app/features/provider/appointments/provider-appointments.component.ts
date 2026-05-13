import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { AppointmentDetailsDialogComponent } from '../../../shared/components/appointment-details-dialog/appointment-details-dialog.component';
import { AddMedicalRecordDialogComponent } from '../../../shared/components/add-medical-record-dialog/add-medical-record-dialog.component';
import { forkJoin } from 'rxjs';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { PaymentService } from '../../../core/services/payment.service';

@Component({
  selector: 'app-provider-appointments',
  templateUrl: './provider-appointments.component.html',
  styleUrls: ['./provider-appointments.component.css']
})
export class ProviderAppointmentsComponent implements OnInit {
  appointments: any[] = [];
  filter: string = 'all';
  loading = true;
  error = '';

  currentUser: any = null;
  userName = '';

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private dialog: MatDialog,
    private medicalRecordService: MedicalRecordService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.setUserName();
    this.loadAppointments();
  }

  setUserName(): void {
    const user = this.authService.currentUserValue;
    const name = user?.fullName || 'Provider';
    this.userName = name === 'Provider' ? name : `Dr. ${name}`;
  }

  loadAppointments(): void {
    this.loading = true;
    this.error = '';

    const providerId = this.currentUser?.providerId || this.currentUser?.userId;
    if (!providerId) {
      this.error = 'Provider ID not found. Please complete your profile setup.';
      this.loading = false;
      return;
    }

    forkJoin({
      appointments: this.appointmentService.getAppointmentsByProvider(providerId),
      records: this.medicalRecordService.getMedicalRecordsByProvider(providerId)
    }).subscribe({
      next: (results) => {
        const recordsMap = new Map();
        results.records.forEach(r => recordsMap.set(r.appointmentId, r));
        
        this.appointments = results.appointments.map(a => {
          const id = a.appointmentId || a.id;
          return {
            ...a,
            hasMedicalRecord: recordsMap.has(id),
            medicalRecord: recordsMap.get(id)
          };
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load appointments: ' + (err.message || 'Unknown error');
        this.appointments = [];
        this.loading = false;
      }
    });
  }

  get filteredAppointments(): any[] {
    if (this.filter === 'all') return this.appointments;
    // Map backend status to filter (Scheduled -> pending/confirmed?)
    // Actually I'll just filter by backend status directly
    if (this.filter === 'scheduled') return this.appointments.filter(a => a.status === 'Scheduled');
    if (this.filter === 'completed') return this.appointments.filter(a => a.status === 'Completed');
    if (this.filter === 'cancelled') return this.appointments.filter(a => a.status === 'Cancelled');
    return this.appointments;
  }

  setFilter(filter: string): void {
    this.filter = filter;
  }

  goBack(): void {
    this.router.navigate(['/provider/dashboard']);
  }

  viewAppointment(appointment: any): void {
    this.dialog.open(AppointmentDetailsDialogComponent, {
      width: '600px',
      data: appointment,
      panelClass: 'premium-dialog-panel'
    });
  }

  confirmAppointment(appointment: any): void {
    this.appointmentService.updateAppointment(appointment.id, { ...appointment, status: 'confirmed' }).subscribe({
      next: () => {
        appointment.status = 'confirmed';
        alert(`Appointment with ${appointment.patientName} has been confirmed!`);
      },
      error: (err) => {
        alert('Failed to confirm appointment: ' + (err.message || 'Unknown error'));
      }
    });
  }

  cancelAppointment(appointment: any): void {
    if (confirm(`Are you sure you want to cancel with ${appointment.patientName}? This will refund the full amount of ₹550.`)) {
      this.appointmentService.cancelAppointment(appointment.appointmentId || appointment.id, 'Provider').subscribe({
        next: () => {
          appointment.status = 'Cancelled';
          
          // Process automatic refund for provider-cancelled appointment
          this.processRefund(appointment);
          
          alert('Appointment cancelled successfully! Full refund of ₹550 has been processed.');
        },
        error: (err) => {
          alert('Failed to cancel appointment: ' + (err.message || 'Unknown error'));
        }
      });
    }
  }

  completeAppointment(appointment: any): void {
    if (confirm(`Mark appointment with ${appointment.patientName} as completed?`)) {
      this.appointmentService.completeAppointment(appointment.appointmentId || appointment.id).subscribe({
        next: () => {
          appointment.status = 'Completed';
          alert('Appointment marked as completed!');
        },
        error: (err) => {
          alert('Failed to complete appointment: ' + (err.message || 'Unknown error'));
        }
      });
    }
  }

  processRefund(appointment: any): void {
    // Find the payment for this appointment first
    this.paymentService.getPaymentByAppointment(appointment.appointmentId || appointment.id).subscribe({
      next: (payment) => {
        if (payment && payment.paymentId) {
          // Refund the full amount of ₹550
          this.paymentService.refundPayment(payment.paymentId, 550).subscribe({
            next: () => {
              console.log('Refund processed successfully for appointment:', appointment.appointmentId);
            },
            error: (err: any) => {
              console.error('Failed to process refund:', err);
              alert('Refund failed. Please contact support.');
            }
          });
        } else {
          console.error('No payment found for appointment:', appointment.appointmentId);
          alert('No payment record found for this appointment.');
        }
      },
      error: (err: any) => {
        console.error('Failed to find payment for refund:', err);
        alert('Failed to process refund. Please contact support.');
      }
    });
  }

  addMedicalRecord(appointment: any): void {
    const dialogRef = this.dialog.open(AddMedicalRecordDialogComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        appointmentId: appointment.appointmentId || appointment.id,
        patientId: appointment.patientId,
        providerId: appointment.providerId,
        patientName: appointment.patientName,
        appointmentDate: appointment.appointmentDate
      },
      panelClass: 'premium-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        alert('Medical record created successfully!');
        this.loadAppointments(); // Reload to show the new 'View Record' button
      }
    });
  }

  viewMedicalRecord(appointment: any): void {
    const record = appointment.medicalRecord;
    if (!record) return;

    this.medicalRecordService.downloadRecord(record.recordId || record.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Medical_Record_${record.diagnosis?.replace(/\s+/g, '_')}_${new Date(record.createdAt).toLocaleDateString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        alert('Failed to download record. Please try again later.');
        console.error(err);
      }
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getConfirmedCount(): number {
    return this.appointments.filter(a => ['confirmed', 'completed'].includes(a.status?.toLowerCase())).length;
  }

  getPendingCount(): number {
    return this.appointments.filter(a => a.status?.toLowerCase() === 'scheduled' || a.status?.toLowerCase() === 'pending').length;
  }

  getStatusColor(status: string): string {
    if (!status) return '#9e9e9e';
    switch (status.toLowerCase()) {
      case 'confirmed': return '#4caf50';
      case 'completed': return '#2196f3';
      case 'scheduled':
      case 'pending': return '#ff9800';
      case 'cancelled': return '#f44336';
      default: return '#9e9e9e';
    }
  }

  deleteAppointment(appointment: any): void {
    if (confirm(`Are you sure you want to permanently delete this cancelled appointment?`)) {
      this.appointmentService.deleteAppointment(appointment.appointmentId || appointment.id).subscribe({
        next: () => {
          this.appointments = this.appointments.filter(a => (a.appointmentId || a.id) !== (appointment.appointmentId || appointment.id));
          alert('Appointment record deleted successfully!');
        },
        error: (err) => {
          alert('Failed to delete appointment: ' + (err.message || 'Unknown error'));
        }
      });
    }
  }
}
