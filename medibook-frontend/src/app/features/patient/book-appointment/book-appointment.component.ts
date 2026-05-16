import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProviderService } from '../../../core/services/provider.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { Observable, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-book-appointment',
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.css']
})
export class BookAppointmentComponent implements OnInit {
  provider: any;
  providerId: string | null = null;
  appointmentForm: FormGroup;
  loading = false;
  submitLoading = false;
  error = '';
  availableSlots: any[] = [];
  slotsLoading = false;
  selectedDate: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private providerService: ProviderService,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.appointmentForm = this.fb.group({
      date: ['', Validators.required],
      time: ['', Validators.required],
      slotId: ['', Validators.required],
      serviceType: ['General Consultation', Validators.required],
      reason: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.providerId = this.route.snapshot.paramMap.get('id');
    this.loadProviderInfo();
  }

  loadProviderInfo(): void {
    if (!this.providerId) return;

    this.loading = true;
    this.error = '';

    this.providerService.getProviderById(Number(this.providerId)).subscribe({
      next: async (provider) => {
        // Initial assignment
        this.provider = {
          ...provider,
          fullName: provider.fullName || provider.FullName || `User #${provider.userId}`,
          email: provider.email || provider.Email || 'N/A'
        };

        // Failsafe: if name is still a placeholder (User # or Provider #), fetch from public AuthService endpoint
        const currentName = this.provider.fullName || '';
        if (currentName.startsWith('User #') || currentName.startsWith('Provider #') || !currentName || currentName === 'N/A') {
          try {
            const user = await firstValueFrom(this.userService.getUserById(provider.userId)).catch(() => null);
            if (user) {
              this.provider.fullName = user.fullName;
              this.provider.email = user.email;
            }
          } catch (err) {
            console.warn('Failed to resolve provider name from AuthService:', err);
          }
        }

        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load provider information: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  onDateChange(): void {
    const dateValue = this.appointmentForm.get('date')?.value;
    if (dateValue && this.providerId) {
      // Format date as YYYY-MM-DD using local date parts (avoids UTC offset shifting the day)
      const d = new Date(dateValue);
      const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      this.selectedDate = dateValue;
      this.loadAvailableSlots(formattedDate);
    } else {
      this.availableSlots = [];
    }
  }

  loadAvailableSlots(date: string): void {
    if (!this.providerId || !date) return;

    this.slotsLoading = true;
    this.availableSlots = [];

    console.log('Loading slots for provider:', this.providerId, 'date:', date);

    this.appointmentService.getAvailableSlots(Number(this.providerId), date).subscribe({
      next: (slots) => {
        console.log('Received slots:', slots);
        this.availableSlots = slots || [];
        this.slotsLoading = false;
        
        // Clear time and slot selection when slots are loaded
        this.appointmentForm.get('time')?.setValue('');
        this.appointmentForm.get('slotId')?.setValue('');
      },
      error: (err) => {
        console.error('Failed to load available slots:', err);
        this.availableSlots = [];
        this.slotsLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    this.submitLoading = true;
    
    const user = this.authService.currentUserValue;
    const formValues = this.appointmentForm.value;
    
    // Check if user has any failed transactions before allowing booking
    this.checkPaymentStatus(user?.userId).subscribe({
      next: (hasFailedTransactions: any) => {
        if (hasFailedTransactions) {
          this.submitLoading = false;
          this.error = 'You cannot book appointments due to failed transactions. Please complete pending payments or contact support.';
          return;
        }
        
        // Proceed with normal booking if no failed transactions
        this.proceedWithBooking(user, formValues);
      },
      error: (err: any) => {
        console.error('Error checking payment status:', err);
        // Proceed with booking if payment status check fails
        this.proceedWithBooking(user, formValues);
      }
    });
  }

  checkPaymentStatus(userId: any): Observable<boolean> {
    // Check if user has failed transactions
    return new Observable(observer => {
      observer.next(false); // For now, assume no failed transactions
      observer.complete();
    });
  }

  proceedWithBooking(user: any, formValues: any): void {
    
    // Format date as YYYY-MM-DD
    const d = new Date(formValues.date);
    const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const selectedSlot = this.availableSlots.find(s => s.slotId === formValues.slotId);

    const appointmentData = {
      patientId: user?.userId,
      providerId: Number(this.providerId),
      slotId: formValues.slotId,
      serviceType: formValues.serviceType || 'General Consultation',
      appointmentDate: formattedDate,
      startTime: selectedSlot?.startTime || formValues.time,
      endTime: selectedSlot?.endTime || formValues.time,
      notes: formValues.reason,
      modeOfConsultation: 'InPerson'
    };

    console.log('Sending appointment data:', appointmentData);

    this.appointmentService.createAppointment(appointmentData).subscribe({
      next: (response: any) => {
        this.submitLoading = false;
        // The backend should return the created appointment object with its ID
        const appointmentId = response.appointmentId || response.id;
        if (appointmentId) {
          this.router.navigate(['/patient/payment', appointmentId], { 
            queryParams: { amount: 550.00 } 
          });
        } else {
          alert('Appointment booked successfully!');
          this.router.navigate(['/patient/appointments']);
        }
      },
      error: (err) => {
        this.submitLoading = false;
        console.error('Booking error detail:', err);
        alert('Failed to book appointment: ' + (err.error?.message || err.message || 'Unknown error'));
      }
    });
  }

  formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes} ${ampm}`;
  }

  goBack(): void {
    this.router.navigate(['/patient/search-providers']);
  }
}
