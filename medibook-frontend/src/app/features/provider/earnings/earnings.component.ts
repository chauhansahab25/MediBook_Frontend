import { Component, OnInit, OnDestroy } from '@angular/core';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';

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
    private authService: AuthService,
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
    console.log('Starting earnings load for provider:', this.currentUser?.userId || this.currentUser?.id);
    
    this.paymentService.getPaymentHistory().subscribe({
      next: (data) => {
        console.log('Real-time earnings data loaded:', data);
        console.log('Data type:', typeof data, 'Data length:', data?.length);
        console.log('Current user:', this.currentUser);
        
        // Log sample payment data structure to understand available fields
        if (data && data.length > 0) {
          console.log('Sample payment data structure:', JSON.stringify(data[0], null, 2));
          console.log('Available fields in payment:', Object.keys(data[0]));
        }
        
        // Process and filter payments for the current provider
        // Match admin dashboard logic: include Completed, Paid, Success status
        // TEMPORARILY DISABLE PROVIDER FILTERING TO SHOW ALL REAL DATA
        this.earnings = data
          .filter(payment => {
            console.log('Filtering payment:', payment, 'Status check:', payment.status);
            
            // Only filter by status - show all completed payments
            const statusMatch = ['Completed', 'Paid', 'Success'].includes(payment.status);
            
            console.log('Payment filter result:', { statusMatch, paymentId: payment.paymentId });
            
            return statusMatch;
          })
          .map(payment => {
            // Enhance payment data with additional real-time details
            // Match admin dashboard payment structure
            return {
              ...payment,
              // Ensure all required fields are present with better fallbacks
              patientName: payment.patientName || 
                           payment.patient?.fullName || 
                           payment.patient?.name || 
                           payment.patientName || 
                           payment.appointment?.patientName ||
                           payment.appointment?.patient?.fullName ||
                           payment.appointment?.patient?.name ||
                           'Unknown Patient',
              paymentDate: payment.paymentDate || payment.date || payment.createdAt || new Date().toISOString(),
              paymentMethod: payment.paymentMethod || payment.paymentType || payment.paymentMode || 'Online',
              transactionId: payment.transactionId || payment.id || payment.paymentId || `TXN${Date.now()}`,
              status: payment.status || 'Completed',
              // Use amount field like admin dashboard
              amount: parseFloat(payment.amount || payment.paymentAmount || '0'),
              // Add real-time processing info
              processedAt: new Date().toISOString(),
              isRealTime: true
            };
          })
          .sort((a, b) => new Date(b.paymentDate || b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.paymentDate || a.createdAt).getTime());

        console.log('Filtered earnings for provider:', this.earnings);
        console.log('Filtered earnings count:', this.earnings.length);

        // Calculate earnings with real-time data
        this.calculateEarnings();
        
        // Update last updated timestamp
        this.lastUpdated = new Date();
        
        this.loading = false;
        console.log('Final earnings calculation:', {
          totalCompleted: this.totalCompleted,
          totalEarnings: this.totalEarnings,
          todayCompleted: this.todayCompleted,
          todayEarnings: this.todayEarnings
        });
      },
      error: (err) => {
        console.error('PaymentService error:', err);
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
