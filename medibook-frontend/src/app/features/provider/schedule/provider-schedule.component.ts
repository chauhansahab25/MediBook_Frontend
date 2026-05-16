import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ScheduleService } from '../../../core/services/schedule.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-provider-schedule',
  templateUrl: './provider-schedule.component.html',
  styleUrls: ['./provider-schedule.component.css']
})
export class ProviderScheduleComponent implements OnInit {
  slots: any[] = [];
  loading = false;
  weekDays: any[] = [];
  filter: string = 'all';
  error = '';

  greeting = 'Good morning';
  currentDate = '';
  weekRange = '';
  userName = '';

  selectedDate: string = '';
  selectedDateSlots: any[] = [];
  showDateDetails: boolean = false;

  constructor(
    private location: Location,
    public router: Router,
    private scheduleService: ScheduleService,
    private authService: AuthService,
    private appointmentService: AppointmentService
  ) {}

  ngOnInit(): void {
    this.setGreeting();
    this.setUserName();
    this.setCurrentDate();
    this.loadSlots();
  }

  get availableSlots(): number {
    return this.slots.filter(s => !s.isBooked).length;
  }

  get bookedSlots(): number {
    return this.slots.filter(s => s.isBooked).length;
  }

  get filteredSlots(): any[] {
    if (this.filter === 'all') return this.slots;
    if (this.filter === 'available') return this.slots.filter(s => !s.isBooked);
    if (this.filter === 'booked') return this.slots.filter(s => s.isBooked);
    return this.slots;
  }

  get todaySlots(): any[] {
    const today = new Date().toISOString().split('T')[0];
    return this.slots.filter(s => s.date === today);
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

  setCurrentDate(): void {
    const options: any = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.currentDate = new Date().toLocaleDateString('en-US', options);
  }

  loadSlots(): void {
    this.loading = true;
    this.error = '';

    const user = this.authService.currentUserValue;
    const providerId = user?.providerId;

    if (!providerId) {
      this.error = 'Provider profile not found. Please complete your profile setup.';
      this.slots = [];
      this.loading = false;
      return;
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    forkJoin({
      slots: this.scheduleService.getAvailableSlots(providerId, today),
      appointments: this.appointmentService.getAppointmentsByProvider(providerId)
    }).subscribe({
      next: (result) => {
        const slots = result.slots;
        const appointments = result.appointments;

        this.slots = slots.map(slot => {
          // Find active appointments for this slot
          const appts = appointments.filter(a => a.slotId === slot.slotId && a.status !== 'Cancelled');
          
          if (appts.length > 0) {
            // sort by ID descending just in case there are multiple
            appts.sort((a, b) => (b.appointmentId || b.id) - (a.appointmentId || a.id));
            const appointment = appts[0];
            
            return {
              ...slot,
              isBooked: true, // Force it to true since an active appointment exists
              appointmentId: appointment.appointmentId || appointment.id,
              patientName: appointment.patientName || 'Patient',
              patientId: appointment.patientId,
              status: appointment.status
            };
          }
          
          // Ensure it's false if no active appointment exists
          return { ...slot, isBooked: false };
        });

        this.generateWeekDays();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load schedule data: ' + (err.message || 'Unknown error');
        this.slots = [];
        this.loading = false;
      }
    });
  }

  generateWeekDays(): void {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    this.weekRange = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    this.weekDays = days.map((name, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      console.log('Comparing today dateStr:', dateStr, 'with slots...');
      if (this.slots.length > 0 && index === 0) {
        console.log('Sample slot date:', this.slots[0].date);
      }

      // Calculate actual slots for this date from the loaded slots
      const daySlots = this.slots.filter(slot => {
        const slotDate = slot.date && slot.date.includes('T') ? slot.date.split('T')[0] : slot.date;
        return slotDate === dateStr;
      });
      const availableSlots = daySlots.filter(slot => !slot.isBooked).length;
      const totalSlots = daySlots.length;

      return {
        name,
        date: date.getDate(),
        fullDate: dateStr,
        slots: totalSlots,
        availableSlots,
        daySlots,
        isToday: index === today.getDay()
      };
    });
  }

  setFilter(filter: string): void {
    this.filter = filter;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  isMorning(slot: any): boolean {
    const hour = parseInt(slot.startTime.split(':')[0], 10);
    return hour < 12;
  }

  isAfternoon(slot: any): boolean {
    const hour = parseInt(slot.startTime.split(':')[0], 10);
    return hour >= 12 && hour < 17;
  }

  isEvening(slot: any): boolean {
    const hour = parseInt(slot.startTime.split(':')[0], 10);
    return hour >= 17;
  }

  getDuration(slot: any): number {
    const start = slot.startTime.split(':').map(Number);
    const end = slot.endTime.split(':').map(Number);
    return (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
  }

  addNewSlot(): void {
    this.router.navigate(['/provider/add-slot']);
  }

  addRecurringSlots(): void {
    this.router.navigate(['/provider/recurring-slots']);
  }

  viewCalendar(): void {
    this.router.navigate(['/provider/calendar']);
  }

  editSlot(slot: any): void {
    this.router.navigate(['/provider/edit-slot', slot.slotId]);
  }

  deleteSlot(slot: any): void {
    if (confirm(`Are you sure you want to delete this slot on ${slot.date} at ${slot.startTime}?`)) {
      this.scheduleService.cancelSlot(slot.slotId).subscribe({
        next: () => {
          this.slots = this.slots.filter(s => s.slotId !== slot.slotId);
          alert('Slot deleted successfully!');
        },
        error: (err) => {
          alert('Failed to delete slot: ' + (err.message || 'Unknown error'));
        }
      });
    }
  }

  viewBooking(slot: any): void {
    console.log('Viewing booking for slot:', slot);
    const id = slot.appointmentId || slot.id || slot.slotId;
    this.router.navigate(['/provider/booking-details', id]);
  }

  selectDate(day: any): void {
    this.selectedDate = day.fullDate;
    this.selectedDateSlots = day.daySlots || [];
    this.showDateDetails = true;
  }

  closeDateDetails(): void {
    this.showDateDetails = false;
    this.selectedDate = '';
    this.selectedDateSlots = [];
  }

  getSelectedDateDisplay(): string {
    if (!this.selectedDate) return '';
    const date = new Date(this.selectedDate);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  get selectedDateAvailableCount(): number {
    return this.selectedDateSlots.filter(slot => !slot.isBooked).length;
  }

  get selectedDateBookedCount(): number {
    return this.selectedDateSlots.filter(slot => slot.isBooked).length;
  }

  goBack(): void {
    this.router.navigate(['/provider/dashboard']);
  }
}
