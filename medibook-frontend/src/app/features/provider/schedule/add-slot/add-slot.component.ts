import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ScheduleService } from '../../../../core/services/schedule.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-add-slot',
  templateUrl: './add-slot.component.html',
  styleUrls: ['./add-slot.component.css']
})
export class AddSlotComponent {
  slot = {
    date: '',
    startTime: '09:00',
    endTime: '09:30',
    isRecurring: false
  };
  loading = false;
  error = '';

  constructor(
    private router: Router,
    private scheduleService: ScheduleService,
    private authService: AuthService
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.error = '';

    const user = this.authService.currentUserValue;
    const providerId = user?.providerId || user?.userId;
    
    if (!providerId) {
      this.error = 'Provider ID not found. Please complete your profile setup.';
      this.loading = false;
      return;
    }

    if (!this.slot.date || !this.slot.startTime || !this.slot.endTime) {
      this.error = 'Please fill in all required fields.';
      this.loading = false;
      return;
    }

    // Format date as ISO string (YYYY-MM-DD)
    const dateStr = this.slot.date;
    
    // Format times as TimeSpan strings (HH:mm:ss)
    const startTimeStr = this.slot.startTime + ':00';
    const endTimeStr = this.slot.endTime + ':00';

    const slotData = {
      providerId: providerId,
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      durationMinutes: 30,
      recurrence: 'None'
    };

    console.log('Sending slot data:', slotData);

    this.scheduleService.createSlot(slotData).subscribe({
      next: (response: any) => {
        alert('Slot created successfully!');
        this.loading = false;
        this.router.navigate(['/provider/schedule']);
      },
      error: (err: any) => {
        console.error('Create slot error:', err);
        this.error = 'Failed to create slot: ' + (err.error?.message || err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/provider/schedule']);
  }
}
