import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  totalUsers = 0;
  totalProviders = 0;
  totalAppointments = 0;
  loading = false;
  error = '';

  // User management statistics
  activeUsers = 0;
  usersTrend = 0;
  usersTrendIcon = 'trending_up';
  usersTrendText = '';

  // Provider statistics
  verifiedProviders = 0;
  pendingProviders = 0;

  // Appointment statistics
  todayAppointments = 0;

  // Payment statistics
  totalPayments = 0;
  todayPayments = 0;
  totalRevenue = 0;
  completedPayments = 0;
  pendingPayments = 0;
  lastPaymentUpdate: Date | null = null;
  private paymentUpdateInterval: any;

  // Review statistics
  totalReviews = 0;
  averageRating = 0;
  pendingReviews = 0;

  // Medical Record statistics
  totalRecords = 0;
  secureRecords = 0;

  // Analytics statistics
  monthlyGrowth = 0;
  totalVisits = 0;

  // Revenue statistics
  monthlyRevenue = 0;
  revenueGrowth = 0;

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
    this.startRealTimePaymentUpdates();
  }

  ngOnDestroy(): void {
    if (this.paymentUpdateInterval) {
      clearInterval(this.paymentUpdateInterval);
    }
  }

  loadDashboardStats(): void {
    this.loading = true;
    this.error = '';

    console.log('Loading dashboard stats...');
    console.log('Auth URL:', environment.authUrl);
    console.log('Provider URL:', environment.providerUrl);
    console.log('Appointment URL:', environment.appointmentUrl);

    // Load real users from API
    this.http.get<any[]>(`${environment.authUrl}/auth/users`).subscribe({
      next: (users) => {
        console.log('Users loaded:', users);
        this.totalUsers = users.length;
        this.activeUsers = users.filter((u: any) => u.isActive).length;
        this.usersTrend = this.activeUsers; // Use active users as trend for now
        this.usersTrendIcon = 'trending_up';
        this.usersTrendText = `+${this.activeUsers} active`;
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.totalUsers = 0;
        this.activeUsers = 0;
      }
    });

    // Load real providers from API
    this.http.get<any[]>(`${environment.providerUrl}/providers`).subscribe({
      next: (providers) => {
        console.log('Providers loaded:', providers);
        this.totalProviders = providers.length;
        this.verifiedProviders = providers.filter((p: any) => p.isVerified).length;
        this.pendingProviders = providers.filter((p: any) => !p.isVerified).length;
      },
      error: (err) => {
        console.error('Failed to load providers:', err);
        this.totalProviders = 0;
        this.verifiedProviders = 0;
        this.pendingProviders = 0;
      }
    });

    // Load real appointments from API
    this.http.get<any[]>(`${environment.appointmentUrl}/appointments`).subscribe({
      next: (appointments) => {
        console.log('Appointments loaded:', appointments);
        this.totalAppointments = appointments.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.todayAppointments = appointments.filter((a: any) => {
          const appointmentDate = new Date(a.appointmentDate);
          appointmentDate.setHours(0, 0, 0, 0);
          return appointmentDate.getTime() === today.getTime();
        }).length;
        console.log('Today appointments:', this.todayAppointments);
      },
      error: (err) => {
        console.error('Failed to load appointments:', err);
        this.totalAppointments = 0;
        this.todayAppointments = 0;
      }
    });

    // Load real payments from API
    this.loadPaymentData();

    // Load real reviews from API
    this.http.get<any[]>(`${environment.reviewUrl}/reviews`).subscribe({
      next: (reviews) => {
        console.log('Reviews loaded:', reviews);
        this.totalReviews = reviews.length;
        
        // Calculate average rating
        if (reviews.length > 0) {
          const validRatings = reviews.filter((r: any) => r.rating && r.rating > 0);
          if (validRatings.length > 0) {
            this.averageRating = validRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / validRatings.length;
          }
        }
        
        // Count reviews that might need moderation (you can add moderation logic here)
        this.pendingReviews = reviews.filter((r: any) => !r.isModerated).length;
      },
      error: (err) => {
        console.error('Failed to load reviews:', err);
        this.totalReviews = 0;
        this.averageRating = 0;
        this.pendingReviews = 0;
      }
    });

    // Load real medical records from API
    this.http.get<any[]>(`${environment.medicalRecordUrl}/records`).subscribe({
      next: (records) => {
        console.log('Medical records loaded:', records);
        this.totalRecords = records.length;
        // Assume all records are secure unless marked otherwise
        this.secureRecords = records.filter((r: any) => r.isSecure !== false).length;
      },
      error: (err) => {
        console.error('Failed to load medical records:', err);
        this.totalRecords = 0;
        this.secureRecords = 0;
      }
    });

    // Calculate analytics from existing data
    this.calculateAnalytics();
    this.loading = false;
  }

  get totalUsersAsNumber(): number {
    return typeof this.totalUsers === 'string' ? parseInt(this.totalUsers) : this.totalUsers;
  }

  get activeUsersAsNumber(): number {
    return typeof this.activeUsers === 'string' ? parseInt(this.activeUsers) : this.activeUsers;
  }

  get securePercentage(): number {
    if (this.totalRecords === 0) return 0;
    return Math.round((this.secureRecords / this.totalRecords) * 100);
  }

  loadPaymentData(): void {
    this.http.get<any[]>(`${environment.paymentUrl}/payments/history`).subscribe({
      next: (payments) => {
        console.log('Payments loaded:', payments);
        
        // If no payments from API, use mock data for demonstration
        if (!payments || payments.length === 0) {
          this.loadMockPaymentData();
          return;
        }
        
        this.totalPayments = payments.length;
        
        // Calculate completed, pending, and refunded payments
        this.completedPayments = payments.filter((p: any) => 
          ['Completed', 'Paid', 'Success'].includes(p.status)
        ).length;
        this.pendingPayments = payments.filter((p: any) => 
          ['Pending', 'Processing'].includes(p.status)
        ).length;
        const refundedPayments = payments.filter((p: any) => 
          ['Refunded'].includes(p.status)
        ).length;
        
        // Calculate total revenue: completed payments + platform fees from refunded payments
        const completedRevenue = payments
          .filter((p: any) => ['Completed', 'Paid', 'Success'].includes(p.status))
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount || p.paymentAmount || 0), 0);
        
        // Add platform fees (₹50) from refunded payments
        const refundedPlatformFees = payments
          .filter((p: any) => ['Refunded'].includes(p.status))
          .reduce((sum: number, p: any) => {
            const platformFee = 50; // Fixed platform fee
            const refundAmount = parseFloat(p.refundAmount || p.amount - platformFee || 0);
            const originalAmount = parseFloat(p.amount || 0);
            return sum + (originalAmount - refundAmount); // Platform fee = original - refund
          }, 0);
        
        this.totalRevenue = completedRevenue + refundedPlatformFees;
        
        // Calculate today's payments (amount, not count) - includes completed payments + platform fees from refunded payments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Today's completed payments
        const todayCompletedRevenue = payments
          .filter((p: any) => {
            const paymentDate = new Date(p.createdAt || p.paymentDate);
            return paymentDate >= today && ['Completed', 'Paid', 'Success'].includes(p.status);
          })
          .reduce((sum: number, p: any) => sum + parseFloat(p.amount || p.paymentAmount || 0), 0);
        
        // Today's platform fees from refunded payments
        const todayRefundedPlatformFees = payments
          .filter((p: any) => {
            const paymentDate = new Date(p.createdAt || p.paymentDate);
            return paymentDate >= today && ['Refunded'].includes(p.status);
          })
          .reduce((sum: number, p: any) => {
            const platformFee = 50; // Fixed platform fee
            const refundAmount = parseFloat(p.refundAmount || p.amount - platformFee || 0);
            const originalAmount = parseFloat(p.amount || 0);
            return sum + (originalAmount - refundAmount); // Platform fee = original - refund
          }, 0);
        
        this.todayPayments = todayCompletedRevenue + todayRefundedPlatformFees;
        
        console.log(`Today's payments calculation: ${todayCompletedRevenue} (completed) + ${todayRefundedPlatformFees} (platform fees) = ${this.todayPayments}`);
        
        // Track last payment update
        const recentPayments = payments.filter(p => p.createdAt || p.paymentDate)
          .sort((a, b) => new Date(b.createdAt || b.paymentDate).getTime() - new Date(a.createdAt || a.paymentDate).getTime());
        this.lastPaymentUpdate = recentPayments.length > 0 ? new Date(recentPayments[0].createdAt || recentPayments[0].paymentDate) : null;
      },
      error: (err) => {
        console.error('Failed to load payments from API:', err);
        console.log('Setting payment values to zero due to API error');
        // Set to zero instead of mock data when API fails
        this.totalPayments = 0;
        this.completedPayments = 0;
        this.pendingPayments = 0;
        this.totalRevenue = 0;
        this.todayPayments = 0;
        this.lastPaymentUpdate = null;
      }
    });
  }

  loadMockPaymentData(): void {
    // Mock payment data for demonstration
    const mockPayments = [
      {
        id: 1,
        amount: 550.00,
        status: 'Completed',
        createdAt: new Date().toISOString(),
        paymentDate: new Date().toISOString(),
        transactionId: 'TXN001'
      },
      {
        id: 2,
        amount: 1200.00,
        status: 'Completed',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        paymentDate: new Date(Date.now() - 86400000).toISOString(),
        transactionId: 'TXN002'
      },
      {
        id: 3,
        amount: 750.00,
        status: 'Pending',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        paymentDate: new Date(Date.now() - 3600000).toISOString(),
        transactionId: 'TXN003'
      },
      {
        id: 4,
        amount: 450.00,
        status: 'Completed',
        createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        paymentDate: new Date(Date.now() - 7200000).toISOString(),
        transactionId: 'TXN004'
      },
      {
        id: 5,
        amount: 300.00,
        status: 'Refunded',
        createdAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        paymentDate: new Date(Date.now() - 10800000).toISOString(),
        transactionId: 'TXN005'
      }
    ];

    this.totalPayments = mockPayments.length;
    this.completedPayments = mockPayments.filter(p => ['Completed', 'Paid', 'Success'].includes(p.status)).length;
    this.pendingPayments = mockPayments.filter(p => ['Pending', 'Processing'].includes(p.status)).length;
    this.totalRevenue = mockPayments
      .filter(p => ['Completed', 'Paid', 'Success'].includes(p.status))
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
    
    // Calculate today's payments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.todayPayments = mockPayments
      .filter(p => {
        const paymentDate = new Date(p.createdAt || p.paymentDate);
        return paymentDate >= today && ['Completed', 'Paid', 'Success'].includes(p.status);
      })
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
    
    this.lastPaymentUpdate = new Date();
    console.log('Mock payment data loaded:', mockPayments);
  }

  startRealTimePaymentUpdates(): void {
    // Update payment data every 30 seconds for real-time effect
    this.paymentUpdateInterval = setInterval(() => {
      this.loadPaymentData();
    }, 30000);
  }

  calculateAnalytics(): void {
    // Calculate monthly growth based on user registrations
    // For now, use active users as a growth indicator
    this.monthlyGrowth = this.activeUsers > 0 ? Math.round((this.activeUsers / this.totalUsers) * 100) : 0;
    
    // Estimate total visits based on appointments and user activity
    // Each appointment represents a visit, plus some general activity
    this.totalVisits = this.totalAppointments + Math.round(this.totalUsers * 2.5);
    
    // Calculate revenue metrics
    // Use total revenue as monthly revenue for now
    this.monthlyRevenue = this.totalRevenue;
    
    // Calculate revenue growth (simple estimation based on active users)
    this.revenueGrowth = this.activeUsers > 0 ? Math.round((this.activeUsers / Math.max(this.totalUsers, 1)) * 15) : 0;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  navigateToUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  navigateToProviders(): void {
    this.router.navigate(['/admin/providers']);
  }

  navigateToAppointments(): void {
    this.router.navigate(['/admin/appointments']);
  }

  navigateToPayments(): void {
    this.router.navigate(['/admin/payments']);
  }

  navigateToReviews(): void {
    this.router.navigate(['/admin/reviews']);
  }

  navigateToRecords(): void {
    this.router.navigate(['/admin/records']);
  }

  navigateToAnalytics(): void {
    this.router.navigate(['/admin/analytics']);
  }

  navigateToRevenue(): void {
    this.router.navigate(['/admin/revenue']);
  }
}
