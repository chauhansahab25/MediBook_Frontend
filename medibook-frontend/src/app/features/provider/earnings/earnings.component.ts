import { Component, OnInit, OnDestroy } from '@angular/core';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { interval, Subscription, firstValueFrom, forkJoin } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { AppointmentService } from '../../../core/services/appointment.service';

@Component({
  selector: 'app-earnings',
  templateUrl: './earnings.component.html',
  styleUrls: ['./earnings.component.css']
})
export class EarningsComponent implements OnInit, OnDestroy {
  earnings: any[] = [];
  loading = true;
  error = '';
  currentUser: any;
  totalEarnings = 0;
  totalCompleted = 0;
  totalDeducted = 0;
  lastUpdated: Date | null = null;
  realTimeSubscription: Subscription | null = null;
  
  // Today's earnings
  todayEarnings = 0;
  todayCompleted = 0;
  todayDeducted = 0;

  // Warnings data
  warnings: any[] = [];

  constructor(
    private paymentService: PaymentService,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    console.log('Earnings component initialized with user:', this.currentUser);
    
    // Check if user data is properly loaded
    if (!this.currentUser || (!this.currentUser.userId && !this.currentUser.id)) {
      console.error('User data not properly loaded:', this.currentUser);
      this.error = 'User authentication data not available. Please refresh the page.';
      this.loading = false;
      return;
    }
    
    this.loadEarnings();
    // Start real-time updates every 30 seconds
    this.startRealTimeUpdates();
  }

  ngOnDestroy(): void {
    if (this.realTimeSubscription) {
      this.realTimeSubscription.unsubscribe();
    }
  }

  startRealTimeUpdates(): void {
    this.realTimeSubscription = interval(30000).subscribe(() => {
      this.loadEarnings();
    });
  }

  refreshEarnings(): void {
    this.loadEarnings();
  }

  loadEarnings(): void {
    this.loading = true;
    const providerId = Number(this.currentUser?.providerId || this.currentUser?.userId);
    
    // Fetch both provider appointments and payment history to cross-reference
    forkJoin({
      appointments: this.appointmentService.getAppointmentsByProvider(providerId),
      payments: this.paymentService.getPaymentHistory()
    }).subscribe({
      next: async (results: any) => {
        const providerAppointments: any[] = results.appointments;
        const allPayments: any[] = results.payments;
        
        // Create a map of appointment IDs for quick lookup
        const apptIds = new Set(providerAppointments.map((a: any) => a.appointmentId || a.id));
        
        // 1. Filter payments that either have our ProviderId OR match one of our AppointmentIds
        const filteredData = allPayments.filter((payment: any) => {
          const pId = Number(payment.providerId || payment.ProviderId);
          const aId = payment.appointmentId || payment.AppointmentId;
          const status = (payment.status || payment.Status || '').toLowerCase();
          
          const isOurPayment = pId === providerId || apptIds.has(aId);
          const isPaid = ['completed', 'paid', 'success'].includes(status);
          
          return isOurPayment && isPaid;
        });

        // 2. Enrich each payment
        const enrichedEarnings = [];
        for (let payment of filteredData) {
          const aId = payment.appointmentId || payment.AppointmentId;
          const appt = providerAppointments.find((a: any) => (a.appointmentId || a.id) === aId);
          
          let enriched = {
            ...payment,
            patientName: appt?.patientName || payment.patientName || 'Unknown Patient',
            patientId: appt?.patientId || payment.patientId || payment.PatientId,
            appointmentId: aId,
            paymentDate: payment.paymentDate || payment.date || payment.createdAt || payment.PaidAt || new Date().toISOString(),
            paymentMethod: payment.paymentMethod || payment.paymentType || payment.paymentMode || payment.Mode || 'Online',
            transactionId: payment.transactionId || payment.TransactionId || payment.paymentId || `TXN${Date.now()}`,
            status: payment.status || payment.Status || 'Completed',
            amount: parseFloat(payment.amount || payment.Amount || '0'),
          };

          // Resolve Patient Name if still placeholder
          if (enriched.patientName === 'Unknown Patient' || enriched.patientName.includes('Anonymous') || enriched.patientName.startsWith('User #')) {
            try {
              const userData = await firstValueFrom(this.userService.getUserById(enriched.patientId)).catch(() => null);
              if (userData) {
                enriched.patientName = userData.fullName || userData.userName || `Patient #${enriched.patientId}`;
              }
            } catch (err) {
              console.warn(`Failed to resolve patient name for ${enriched.patientId}:`, err);
            }
          }

          enrichedEarnings.push(enriched);
        }

        // 3. Sort and Calculate
        this.earnings = enrichedEarnings.sort((a, b) => 
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );

        this.calculateEarnings();
        this.lastUpdated = new Date();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load earnings data:', err);
        this.error = 'Failed to load earnings: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  calculateEarnings(): void {
    this.totalEarnings = 0;
    this.totalCompleted = 0;
    this.totalDeducted = 0;
    this.todayEarnings = 0;
    this.todayCompleted = 0;
    this.todayDeducted = 0;
    let totalGrossRevenue = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    this.earnings.forEach(earning => {
      // Match admin dashboard logic: include Completed, Paid, Success status
      if (['Completed', 'Paid', 'Success'].includes(earning.status)) {
        // ₹500 per completed booking (fixed provider income)
        const bookingEarning = 500;
        totalGrossRevenue += bookingEarning;
        this.totalCompleted++;

        // No platform charge - flat ₹500 per booking
        const finalEarning = bookingEarning;
        
        this.totalEarnings += finalEarning;

        // Check if earning is from today
        const earningDate = new Date(earning.paymentDate || earning.date || earning.createdAt);
        earningDate.setHours(0, 0, 0, 0);
        
        if (earningDate.getTime() === today.getTime()) {
          this.todayEarnings += finalEarning;
          this.todayCompleted++;
        }

        // Store calculated values in the earning object with real-time details
        earning.bookingEarning = bookingEarning; // ₹500 per booking
        earning.platformCharge = 0; // No platform charge
        earning.finalEarning = finalEarning;
        earning.earningPercentage = ((finalEarning / bookingEarning) * 100).toFixed(1);
        earning.isRecentEarning = this.isRecentEarning(earning.paymentDate || earning.date || earning.createdAt);
        earning.isTodayEarning = earningDate.getTime() === today.getTime();
        
        // Add real-time status indicators
        earning.earningStatus = this.getEarningStatus(earning);
        earning.timeAgo = this.getTimeAgo(earning.paymentDate || earning.date || earning.createdAt);
      }
    });

    // Add real-time summary statistics
    this.totalEarnings = Math.round(this.totalEarnings * 100) / 100; // Round to 2 decimal places
    this.todayEarnings = Math.round(this.todayEarnings * 100) / 100;
    
    console.log('Real-time earnings calculation:', {
      totalCompleted: this.totalCompleted,
      totalGrossRevenue,
      totalEarnings: this.totalEarnings,
      todayCompleted: this.todayCompleted,
      todayEarnings: this.todayEarnings,
      averageEarningPerBooking: this.totalCompleted > 0 ? (this.totalEarnings / this.totalCompleted).toFixed(2) : 0
    });
  }

  isRecentEarning(paymentDate: string): boolean {
    const earningDate = new Date(paymentDate);
    const now = new Date();
    const hoursDiff = (now.getTime() - earningDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24; // Consider earnings from last 24 hours as recent
  }

  getEarningStatus(earning: any): string {
    if (earning.isRecentEarning) {
      return 'Recent';
    }
    return 'Completed';
  }

  getTimeAgo(dateString: string): string {
    if (!dateString) return 'Just now';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 0) {
      return 'Future';
    }
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString('en-IN');
  }

  goBack(): void {
    this.router.navigate(['/provider/dashboard']);
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'refunded':
        return 'status-refunded';
      default:
        return 'status-default';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'check_circle';
      case 'pending':
        return 'pending';
      case 'refunded':
        return 'refresh';
      default:
        return 'help';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }
}
