import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ScheduleService } from '../../../../core/services/schedule.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  currentMonth: Date = new Date();
  selectedDate: Date | null = null;
  slots: any[] = [];
  loading = false;
  error = '';
  calendarDays: any[] = [];
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  greeting = 'Good morning';
  userName = '';

  constructor(
    private router: Router,
    private scheduleService: ScheduleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setGreeting();
    this.setUserName();
    this.loadSlots();
    this.generateCalendar();
  }

  setGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good morning';
    else if (hour < 17) this.greeting = 'Good afternoon';
    else this.greeting = 'Good evening';
  }

  setUserName(): void {
    const user = this.authService.currentUserValue;
    const name = user?.fullName || 'Provider';
    this.userName = name === 'Provider' ? name : `Dr. ${name}`;
  }

  loadSlots(): void {
    this.loading = true;
    this.error = '';

    const user = this.authService.currentUserValue;
    const providerId = user?.providerId;

    if (!providerId) {
      this.error = 'Provider profile not found';
      this.slots = [];
      this.loading = false;
      return;
    }

    // Load slots from the beginning of the current month to show all data
    const startOfMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const startDate = startOfMonth.toISOString().split('T')[0];

    this.scheduleService.getAvailableSlots(providerId, startDate).subscribe({
      next: (slots) => {
        this.slots = slots;
        this.loading = false;
        this.generateCalendar();
      },
      error: (err) => {
        this.error = 'Failed to load slots: ' + (err.message || 'Unknown error');
        this.slots = [];
        this.loading = false;
      }
    });
  }

  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    this.calendarDays = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      this.calendarDays.push({ empty: true });
    }

    // Add days of the month
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      
      // Format date to YYYY-MM-DD using local time
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      
      const daySlots = this.slots.filter(s => {
        const slotDate = s.date.includes('T') ? s.date.split('T')[0] : s.date;
        return slotDate === dateStr;
      });
      
      const availableSlots = daySlots.filter(s => !s.isBooked).length;
      const bookedSlots = daySlots.filter(s => s.isBooked).length;
      const totalSlots = daySlots.length;

      this.calendarDays.push({
        date,
        day,
        dateStr,
        totalSlots,
        availableSlots,
        bookedSlots,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: this.selectedDate && date.toDateString() === this.selectedDate.toDateString()
      });
    }
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1);
    this.loadSlots();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1);
    this.loadSlots();
  }

  selectDate(day: any): void {
    if (day.empty) return;
    this.selectedDate = day.date;
    // Don't regenerate calendar, just update the selected date
  }

  get selectedDateSlots(): any[] {
    if (!this.selectedDate) return [];
    
    // Format selectedDate to YYYY-MM-DD
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    console.log('Searching for slots on date:', dateStr);
    console.log('Available slots data:', this.slots);
    
    const filtered = this.slots.filter(s => {
      // Ensure s.date is just the date part if it's a full ISO string
      const slotDate = s.date.includes('T') ? s.date.split('T')[0] : s.date;
      return slotDate === dateStr;
    });
    
    console.log('Found slots:', filtered);
    return filtered;
  }

  get selectedDateAvailableCount(): number {
    return this.selectedDateSlots.filter(s => !s.isBooked).length;
  }

  get selectedDateBookedCount(): number {
    return this.selectedDateSlots.filter(s => s.isBooked).length;
  }

  get availableSlotsCount(): number {
    return this.slots.filter(s => !s.isBooked).length;
  }

  get bookedSlotsCount(): number {
    return this.slots.filter(s => s.isBooked).length;
  }

  getSelectedDateDisplay(): string {
    if (!this.selectedDate) return '';
    return this.selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  goBack(): void {
    this.router.navigate(['/provider/schedule']);
  }

  addSlot(): void {
    this.router.navigate(['/provider/add-slot']);
  }

  editSlot(slot: any): void {
    this.router.navigate(['/provider/edit-slot', slot.slotId]);
  }

  deleteSlot(slot: any): void {
    if (confirm(`Are you sure you want to delete this slot on ${slot.date} at ${slot.startTime}?`)) {
      this.scheduleService.cancelSlot(slot.slotId).subscribe({
        next: () => {
          this.slots = this.slots.filter(s => s.slotId !== slot.slotId);
          this.generateCalendar();
          alert('Slot deleted successfully!');
        },
        error: (err) => {
          alert('Failed to delete slot: ' + (err.message || 'Unknown error'));
        }
      });
    }
  }
}
