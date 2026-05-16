import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ReviewService } from '../../../core/services/review.service';
import { ProviderService } from '../../../core/services/provider.service';
import { ScheduleService } from '../../../core/services/schedule.service';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-provider-dashboard',
  templateUrl: './provider-dashboard.component.html',
  styleUrls: ['./provider-dashboard.component.css']
})
export class ProviderDashboardComponent implements OnInit {
  user: any;
  isVerified = false;
  upcomingAppointments = 0;
  totalPatients = 0;
  averageRating = 0;
  totalReviews = 0;
  totalSlots = 0;
  availableSlots = 0;
  bookedSlots = 0;
  loading = true;
  error = '';
  verificationLoaded = false;
  recentActivities: any[] = [];

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private reviewService: ReviewService,
    private providerService: ProviderService,
    private scheduleService: ScheduleService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUserValue;
    // Set initial verification status from user data to prevent flicker
    this.isVerified = this.user?.verified || this.user?.isVerified || false;
    console.log('Initial isVerified from user data:', this.isVerified);
    this.loadProviderVerificationStatus();
    this.loadStats();
  }

  loadProviderVerificationStatus(): void {
    const userId = this.user?.userId;
    console.log('Loading verification status for userId:', userId);
    if (!userId) {
      this.verificationLoaded = true;
      return;
    }

    this.providerService.getProviderByUserId(userId).subscribe({
      next: (provider) => {
        console.log('Provider data received:', provider);
        if (provider) {
          this.isVerified = provider.isVerified;
          console.log('isVerified set to:', this.isVerified);
          // Update user object in localStorage
          const currentUser = this.authService.currentUserValue;
          if (currentUser) {
            const updatedUser = { ...currentUser, verified: provider.isVerified };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            console.log('Updated user in localStorage:', updatedUser);
          }
        }
        this.verificationLoaded = true;
      },
      error: (err) => {
        console.error('Failed to load provider verification status:', err);
        this.isVerified = this.user?.verified || false;
        console.log('Using fallback isVerified:', this.isVerified);
        this.verificationLoaded = true;
      }
    });
  }

  loadStats(): void {
    this.loading = true;
    this.error = '';

    const providerId = this.user?.providerId || this.user?.userId;
    if (!providerId) {
      this.error = 'Provider ID not found';
      this.loading = false;
      return;
    }

    const todayDateStr = new Date().toISOString().split('T')[0];

    forkJoin({
      appointments: this.appointmentService.getAppointmentsByProvider(providerId),
      reviews: this.reviewService.getReviewsByProvider(providerId),
      slots: this.scheduleService.getAvailableSlots(providerId, todayDateStr)
    }).subscribe({
      next: (result) => {
        const appointments = result.appointments;
        const reviews = result.reviews;
        const slots = result.slots;

        // Process Appointments
        const todayDateObj = new Date();
        this.upcomingAppointments = appointments.filter((a: any) => 
          new Date(a.appointmentDate || a.date) >= todayDateObj && a.status !== 'Cancelled'
        ).length;
        
        const uniquePatients = new Set(appointments.map((a: any) => a.patientId));
        this.totalPatients = uniquePatients.size;

        // Process Reviews
        this.totalReviews = reviews.length;
        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
          this.averageRating = Math.round((totalRating / reviews.length) * 10) / 10;
        }

        // Process Slots (Synchronized with active appointments for real-time accuracy)
        this.totalSlots = slots.length;
        
        // Count a slot as booked if it's marked as such OR has an active appointment
        this.bookedSlots = slots.filter(slot => {
          const hasActiveAppt = appointments.some((a: any) => 
            (a.slotId === slot.slotId || a.SlotId === slot.slotId) && a.status !== 'Cancelled'
          );
          return slot.isBooked || slot.IsBooked || hasActiveAppt;
        }).length;

        this.availableSlots = this.totalSlots - this.bookedSlots;
        
        // Failsafe: if slots database is empty/unreachable but appointments exist
        if (this.totalSlots === 0 && appointments.length > 0) {
          const activeAppts = appointments.filter((a: any) => 
            a.status === 'Scheduled' || a.status === 'Confirmed' || a.status === 'Completed'
          );
          this.bookedSlots = activeAppts.length;
          this.totalSlots = this.bookedSlots;
          this.availableSlots = 0;
        }

        // Process Recent Activities
        const activities: any[] = [];

        // Add recent appointments
        appointments.forEach((a: any) => {
          if (a.status !== 'Cancelled') {
            const actDate = new Date(a.appointmentDate || a.date);
            activities.push({
              type: 'appointment',
              icon: 'check_circle',
              iconClass: 'confirmed',
              title: `Appointment ${a.status.toLowerCase()} with <strong>${a.patientName || 'Patient'}</strong>`,
              timestamp: actDate.getTime()
            });
          }
        });

        // Add recent reviews
        reviews.forEach((r: any) => {
          const revDate = new Date(r.reviewDate || r.date);
          activities.push({
            type: 'review',
            icon: 'star',
            iconClass: 'review',
            title: `New ${r.rating}-star review from <strong>${r.patientName || 'Patient'}</strong>`,
            timestamp: revDate.getTime()
          });
        });

        // Add new unique patients logic
        const seenPatients = new Set();
        appointments.forEach((a: any) => {
           if (!seenPatients.has(a.patientId)) {
               seenPatients.add(a.patientId);
               const regDate = new Date(a.appointmentDate || a.date);
               activities.push({
                 type: 'patient',
                 icon: 'person_add',
                 iconClass: 'new',
                 title: `New patient <strong>${a.patientName || 'Patient'}</strong> registered`,
                 timestamp: regDate.getTime() - 1000 // slightly before appt
               });
           }
        });

        // Sort by most recent first
        activities.sort((a, b) => b.timestamp - a.timestamp);
        
        // Take top 4
        this.recentActivities = activities.slice(0, 4);

        // Calculate relative time
        const now = new Date().getTime();
        this.recentActivities.forEach(act => {
          const diffMs = now - act.timestamp;
          if (diffMs < 0) {
              const futureHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
              if (futureHours < 24) act.timeAgo = `In ${Math.max(1, futureHours)} hours`;
              else act.timeAgo = `In ${Math.floor(futureHours/24)} days`;
          } else {
              const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
              if (diffHour < 1) act.timeAgo = 'Just now';
              else if (diffHour < 24) act.timeAgo = diffHour + (diffHour === 1 ? ' hour ago' : ' hours ago');
              else if (diffHour < 48) act.timeAgo = 'Yesterday';
              else act.timeAgo = Math.floor(diffHour / 24) + ' days ago';
          }
        });

        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load dashboard data: ' + (err.message || 'Unknown error');
        console.error(err);
        this.loading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateToSchedule(): void {
    this.router.navigate(['/provider/schedule']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/provider/profile']);
  }

  navigateToAppointments(): void {
    this.router.navigate(['/provider/appointments']);
  }

  navigateToReviews(): void {
    this.router.navigate(['/provider/reviews']);
  }

  navigateToEarnings(): void {
    this.router.navigate(['/provider/earnings']);
  }
}
