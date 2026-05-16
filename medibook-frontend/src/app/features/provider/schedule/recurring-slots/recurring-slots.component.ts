import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ScheduleService } from '../../../../core/services/schedule.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-recurring-slots',
  templateUrl: './recurring-slots.component.html',
  styleUrls: ['./recurring-slots.component.css']
})
export class RecurringSlotsComponent {
  recurringSlot = {
    startTime: '09:00',
    endTime: '09:30',
    days: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    }
  };
  loading = false;
  error = '';

  constructor(
    private router: Router,
    private scheduleService: ScheduleService,
    private authService: AuthService
  ) {}

  onSubmit(): void {
    const selectedDays = Object.entries(this.recurringSlot.days)
      .filter(([_, value]) => value)
      .map(([key, _]) => key);

    if (selectedDays.length === 0) {
      alert('Please select at least one day of the week.');
      return;
    }

    this.loading = true;
    this.error = '';

    const user = this.authService.currentUserValue;
    const providerId = user?.providerId || user?.userId;
    
    if (!providerId) {
      this.error = 'Provider ID not found. Please complete your profile setup.';
      this.loading = false;
      return;
    }

    const recurringData = {
      providerId: providerId,
      startDate: new Date().toISOString().split('T')[0], // Today as start date
      endDate: new Date(Date.now() + 30 * 24 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      startTime: this.recurringSlot.startTime,
      endTime: this.recurringSlot.endTime,
      pattern: 'Daily' // Backend expects "Daily" or "Weekly"
    };

    this.scheduleService.createRecurringSlots(recurringData).subscribe({
      next: (response: any) => {
        alert('Recurring slots created successfully!');
        this.loading = false;
        this.router.navigate(['/provider/schedule']);
      },
      error: (err: any) => {
        this.error = 'Failed to create recurring slots: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/provider/schedule']);
  }
}
