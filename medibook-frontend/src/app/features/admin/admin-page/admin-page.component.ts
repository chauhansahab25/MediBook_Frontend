import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ProviderService } from '../../../core/services/provider.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ReviewService } from '../../../core/services/review.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { UserService } from '../../../core/services/user.service';
import { EditUserDialogComponent } from '../dialogs/edit-user-dialog/edit-user-dialog.component';
import { EditProviderDialogComponent } from '../dialogs/edit-provider-dialog/edit-provider-dialog.component';
import { ViewMedicalRecordDialogComponent } from '../dialogs/view-medical-record-dialog/view-medical-record-dialog.component';

@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.css']
})
export class AdminPageComponent implements OnInit {
  pageTitle = '';
  pageIcon = '';
  pageDescription = '';
  pageType = '';

  dataList: any[] = [];
  loading = true;
  error: string | null = null;

  totalCount = 0;
  activeCount = 0;
  pendingCount = 0;
  totalRevenue = 0;
  todayPayments = 0;
  lastPaymentUpdate: Date | null = null;
  completedPayments = 0;
  pendingPayments = 0;

  private realTimeInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private providerService: ProviderService,
    private appointmentService: AppointmentService,
    private paymentService: PaymentService,
    private reviewService: ReviewService,
    private notificationService: NotificationService,
    private medicalRecordService: MedicalRecordService,
    private userService: UserService
  ) {
    this.route.data.subscribe(data => {
      this.pageTitle = data['title'] || 'Admin';
      this.pageIcon = data['icon'] || 'settings';
      this.pageDescription = data['description'] || '';
    });
  }

  ngOnInit(): void {
    this.pageType = this.router.url.split('/').pop() || '';
    this.loadData();
    
    // Set up real-time payment updates
    if (this.pageType === 'payments') {
      this.startRealTimeUpdates();
    }
  }

  ngOnDestroy(): void {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
    }
  }

  startRealTimeUpdates(): void {
    // Update payment data every 30 seconds for real-time effect
    this.realTimeInterval = setInterval(() => {
      this.loadPayments();
    }, 30000);
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    switch (this.pageType) {
      case 'users':
        this.loadUsers();
        break;
      case 'providers':
        this.loadProviders();
        break;
      case 'appointments':
        this.loadAppointments();
        break;
      case 'payments':
        this.loadPayments();
        break;
      case 'reviews':
        this.loadReviews();
        break;
      case 'records':
        this.loadRecords();
        break;
      case 'notifications':
        this.loadNotifications();
        break;
      case 'analytics':
      case 'revenue':
        this.loading = false;
        break;
      default:
        this.loading = false;
    }
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users: any[]) => {
        this.dataList = users;
        this.totalCount = users.length;
        this.activeCount = users.filter((u: any) => u.isActive).length;
        this.pendingCount = users.filter((u: any) => !u.isActive).length;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load users:', err);
        if (err.status === 401) {
          this.error = 'Authentication required. Please log in as Admin to view users.';
        } else {
          this.error = 'Failed to load users: ' + (err.message || 'Unknown error');
        }
        this.loading = false;
      }
    });
  }

  loadProviders(): void {
    console.log('=== Loading providers ===');
    this.loading = true;
    this.error = null;

    // Load providers and users, then merge the data
    Promise.all([
      firstValueFrom(this.providerService.getProviders()).catch(() => []),
      firstValueFrom(this.userService.getUsers()).catch(() => [])
    ]).then(([providers, users]) => {
      console.log('Admin: Robust Sync - Providers:', providers?.length, 'Users:', users?.length);
      
      const mergedList: any[] = [];
      const processedUserIds = new Set<number>();

      // 1. Process all entries from the Providers API
      (providers || []).forEach((p: any) => {
        const uId = p.userId || p.UserId;
        const user = (users || []).find((u: any) => (u.userId || u.UserId) === uId);
        
        // Improved name resolution: Priority: Profile Name > User Name > Email Handle > ID Fallback
        const userEmail = user?.email || user?.Email || p.email || p.Email;
        const emailHandle = userEmail ? userEmail.split('@')[0] : null;
        const resolvedName = p.fullName || p.FullName || user?.fullName || user?.FullName || emailHandle || `Provider #${p.providerId || p.ProviderId || uId}`;

        processedUserIds.add(uId);
        mergedList.push({
          ...p,
          userId: uId,
          fullName: resolvedName,
          email: userEmail || 'N/A',
          isVerified: p.isVerified === true || p.IsVerified === true || p.status === 'Verified' || p.Status === 'Verified' || user?.verified
        });
      });

      // 2. Add any Users with the 'Provider' role who weren't in the Providers list
      (users || []).forEach((u: any) => {
        const uId = u.userId || u.UserId;
        const role = (u.role || u.Role || '').toLowerCase();
        
        if (role === 'provider' && !processedUserIds.has(uId)) {
          const userEmail = u.email || u.Email;
          const emailHandle = userEmail ? userEmail.split('@')[0] : null;
          const resolvedName = u.fullName || u.FullName || emailHandle || `New Provider #${uId}`;

          mergedList.push({
            userId: uId,
            fullName: resolvedName,
            email: userEmail || 'N/A',
            isVerified: u.verified === true || u.Verified === true || u.isVerified === true,
            status: 'Pending Profile',
            specialization: 'Not Assigned'
          });
        }
      });

      this.dataList = mergedList;
      this.totalCount = this.dataList.length;
      this.activeCount = this.dataList.filter((p: any) => p.isVerified).length;
      this.pendingCount = this.dataList.length - this.activeCount;
      this.loading = false;
    }).catch((err) => {
      console.error('Failed to load providers:', err);
      this.error = 'Failed to load providers: ' + (err.message || 'Unknown error');
      this.loading = false;
    });
  }

  loadAppointments(): void {
    this.loading = true;
    this.error = null;

    // Load appointments, users, providers, and payments to merge data
    Promise.all([
      firstValueFrom(this.appointmentService.getAppointments()),
      firstValueFrom(this.userService.getUsers()),
      firstValueFrom(this.providerService.getProviders()),
      firstValueFrom(this.paymentService.getPaymentHistory())
    ]).then(([appointments, users, providers, payments]) => {
      console.log('Data loaded for merging:', { appointments, users, providers, payments });
      
      this.dataList = (appointments || []).map((a: any) => {
        if (!a) return null;

        // Find patient user account
        const patientUser = (users || []).find((u: any) => u.userId === a.patientId);
        
        // Find provider profile
        const providerProfile = (providers || []).find((p: any) => p.providerId === a.providerId);
        // Find provider user account to get their name
        const providerUser = providerProfile ? (users || []).find((u: any) => u.userId === providerProfile.userId) : null;
        
        // Find payment for this appointment (handle both appointmentId and AppointmentId)
        const payment = (payments || []).find((p: any) => {
          const pApptId = p.appointmentId || p.AppointmentId;
          const aApptId = a.appointmentId || a.id;
          return pApptId === aApptId && pApptId !== undefined;
        });

        return {
          ...a,
          patientName: patientUser?.fullName || a.patientName || `Patient #${a.patientId || 'Unknown'}`,
          providerName: providerUser?.fullName || a.providerName || `Provider #${a.providerId || 'Unknown'}`,
          specialization: providerProfile?.specialization || a.specialization || 'N/A',
          paymentStatus: payment ? (payment.status || payment.Status) : (a.paymentStatus || 'Pending'),
          paymentAmount: payment ? (payment.amount || payment.Amount) : (a.paymentAmount || 0),
          transactionId: payment ? (payment.transactionId || payment.TransactionId) : (a.transactionId || '')
        };
      }).filter(a => a !== null);

      this.totalCount = this.dataList.length;
      this.activeCount = this.dataList.filter((a: any) => a.status === 'Scheduled' || a.status === 'Confirmed').length;
      this.pendingCount = this.dataList.filter((a: any) => a.status === 'Pending').length;
      this.loading = false;
      
      console.log('Enriched appointments list:', this.dataList);
    }).catch(err => {
      console.error('Failed to load enriched appointments:', err);
      this.error = 'Failed to load appointments: ' + (err.message || 'Unknown error');
      this.loading = false;
    });
  }

  loadPayments(): void {
    this.loading = true;
    this.error = null;

    Promise.all([
      firstValueFrom(this.paymentService.getPaymentHistory()),
      firstValueFrom(this.userService.getUsers()),
      firstValueFrom(this.providerService.getProviders()),
      firstValueFrom(this.appointmentService.getAppointments())
    ]).then(([payments, users, providers, appointments]) => {
      console.log('=== Payments Loaded ===', payments);
      // Process payments and merge with other data
      this.dataList = (payments || []).map((p: any) => {
        const user = (users || []).find((u: any) => u.userId === (p.patientId || p.PatientId));
        
        let providerId = p.providerId || p.ProviderId;
        if (!providerId && (p.appointmentId || p.AppointmentId)) {
          const apptId = p.appointmentId || p.AppointmentId;
          const appt = (appointments || []).find((a: any) => (a.appointmentId || a.id || a.AppointmentId) === apptId);
          if (appt) {
            providerId = appt.providerId || appt.ProviderId;
          }
        }
        
        return {
          ...p,
          paymentId: p.paymentId || p.PaymentId || p.id,
          patientName: user?.fullName || user?.FullName || `Patient #${p.patientId || p.PatientId}`,
          providerName: this.getProviderName(providerId, providers, users),
          date: p.createdAt || p.CreatedAt || p.paymentDate || p.PaymentDate,
          amount: p.amount || p.Amount || p.paymentAmount || p.PaymentAmount || 0,
          status: p.status || p.Status || 'Pending'
        };
      });
      
      console.log('Processed Payments Data:', this.dataList);

      // 1. Calculate Overall Stats
      this.totalCount = this.dataList.length;
      
      this.completedPayments = this.dataList.filter((p: any) => 
        ['Completed', 'Paid', 'Success'].includes(p.status)
      ).length;

      this.pendingPayments = this.dataList.filter((p: any) => 
        ['Pending', 'Processing'].includes(p.status)
      ).length;
      
      this.activeCount = this.completedPayments;
      
      // 2. Calculate Total Revenue (Completed Payments + Refund Fees)
      const completedRevenue = this.dataList
        .filter((p: any) => ['Completed', 'Paid', 'Success'].includes(p.status))
        .reduce((sum: number, p: any) => sum + (parseFloat(p.amount || 0)), 0);
      
      const refundedPlatformFees = this.dataList
        .filter((p: any) => p.status === 'Refunded')
        .reduce((sum: number, p: any) => {
          const platformFee = 50; 
          const original = parseFloat(p.amount || 0);
          const refunded = parseFloat(p.refundAmount || p.RefundAmount || 0);
          // If refund amount is explicitly set, platform fee is original - refund. Else assume 50.
          return sum + (refunded > 0 ? (original - refunded) : platformFee);
        }, 0);
      
      this.totalRevenue = completedRevenue + refundedPlatformFees;
      console.log('Total Revenue (from DB):', this.totalRevenue);
      
      // 3. Calculate "Today's" (Last 24h) Payments
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      const todayCompletedRevenue = this.dataList
        .filter((p: any) => {
          const pDate = new Date(p.date);
          return pDate >= twentyFourHoursAgo && ['Completed', 'Paid', 'Success'].includes(p.status);
        })
        .reduce((sum: number, p: any) => sum + (parseFloat(p.amount || 0)), 0);
      
      const todayRefundedFees = this.dataList
        .filter((p: any) => {
          const pDate = new Date(p.date);
          return pDate >= twentyFourHoursAgo && p.status === 'Refunded';
        })
        .reduce((sum: number, p: any) => {
          const platformFee = 50;
          const original = parseFloat(p.amount || 0);
          const refunded = parseFloat(p.refundAmount || p.RefundAmount || 0);
          return sum + (refunded > 0 ? (original - refunded) : platformFee);
        }, 0);
      
      this.todayPayments = todayCompletedRevenue + todayRefundedFees;
      console.log('Last 24h Revenue (from DB):', this.todayPayments);
      console.log('24h Revenue calculated:', this.todayPayments);
      
      // Track last payment update time
      const recentPayments = (payments || [])
        .filter((p: any) => p.createdAt || p.paymentDate)
        .sort((a: any, b: any) => new Date(b.createdAt || b.paymentDate).getTime() - new Date(a.createdAt || a.paymentDate).getTime());
      
      if (recentPayments.length > 0) {
        this.lastPaymentUpdate = new Date(recentPayments[0].createdAt || recentPayments[0].paymentDate);
      }
      
      this.loading = false;
    }).catch((err) => {
      console.error('Failed to load payments:', err);
      this.error = 'Failed to load payments: ' + (err.message || 'Unknown error');
      this.loading = false;
    });
  }

  loadReviews(): void {
    this.loading = true;
    this.error = null;

    Promise.all([
      firstValueFrom(this.reviewService.getReviews()),
      firstValueFrom(this.userService.getUsers()),
      firstValueFrom(this.providerService.getProviders())
    ]).then(([reviews, users, providers]) => {
      console.log('=== Reviews Loaded ===', reviews);
      this.dataList = (reviews || []).map((r: any) => {
        // If the review is anonymous, don't try to look up the user by ID
        if (r.isAnonymous) {
          return {
            ...r,
            patientName: 'Anonymous Patient',
            providerName: this.getProviderName(r.providerId, providers, users),
            date: r.createdAt || r.date || r.reviewDate
          };
        }

        const patientUser = (users || []).find((u: any) => u.userId === r.patientId);
        
        return {
          ...r,
          patientName: r.patientName || patientUser?.fullName || (r.patientId ? `Patient #${r.patientId}` : 'Anonymous Patient'),
          providerName: r.providerName || this.getProviderName(r.providerId, providers, users),
          date: r.createdAt || r.date || r.reviewDate
        };
      });
      this.totalCount = (reviews || []).length;
      this.loading = false;
    }).catch((err) => {
      console.error('Failed to load reviews:', err);
      this.error = 'Failed to load reviews: ' + (err.message || 'Unknown error');
      this.loading = false;
    });
  }

  // Helper method to resolve provider name
  private getProviderName(providerId: number, providers: any[], users: any[]): string {
    const providerProfile = (providers || []).find((p: any) => p.providerId === providerId);
    const providerUser = providerProfile ? (users || []).find((u: any) => u.userId === providerProfile.userId) : null;
    return providerUser?.fullName || `Provider #${providerId}`;
  }

  loadRecords(): void {
    this.loading = true;
    this.error = null;

    Promise.all([
      firstValueFrom(this.medicalRecordService.getMedicalRecords()),
      firstValueFrom(this.userService.getUsers())
    ]).then(([records, users]) => {
      this.dataList = (records || []).map((r: any) => {
        const user = (users || []).find((u: any) => u.userId === r.patientId);
        return {
          ...r,
          patientName: user?.fullName || r.patientName || `Patient #${r.patientId}`,
          title: r.diagnosis || 'Medical Record',
          createdAt: r.createdAt,
          appointmentDate: r.appointmentDate
        };
      });
      this.totalCount = (records || []).length;
      this.loading = false;
    }).catch((err) => {
      console.error('Failed to load medical records:', err);
      this.error = 'Failed to load medical records: ' + (err.message || 'Unknown error');
      this.loading = false;
    });
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (notifications: any[]) => {
        this.dataList = notifications;
        this.totalCount = notifications.length;
        this.activeCount = notifications.filter((n: any) => !n.isRead).length;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load notifications: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  refreshData(): void {
    this.loadData();
  }

  // User Actions
  editUser(user: any): void {
    const dialogRef = this.dialog.open(EditUserDialogComponent, {
      width: '500px',
      disableClose: false,
      data: { user: user }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        // Reload users to show updated data
        this.loadUsers();
      }
    });
  }

  toggleUserStatus(user: any): void {
    console.log('Toggle user status - Full user object:', user);
    console.log('User ID:', user.userId, 'Current isActive:', user.isActive);

    const action = user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${user.fullName}?`)) {
      return;
    }

    if (!user.userId) {
      alert('Error: User ID is missing. Cannot update user.');
      console.error('User object missing userId:', user);
      return;
    }

    const newStatus = !user.isActive;
    const updateData = { isActive: newStatus };

    console.log(`Sending PUT request to: /api/v1/auth/users/${user.userId}`);
    console.log('Update data:', updateData);

    this.userService.updateUser(user.userId, updateData).subscribe({
      next: (updatedUser) => {
        console.log('User updated successfully. Response:', updatedUser);
        // Reload users to confirm change persisted
        this.loadUsers();
        alert(`User ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      },
      error: (err: any) => {
        console.error('Failed to update user. Full error:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);

        let errorMsg = err.message || 'Unknown error';
        if (err.status === 404) {
          errorMsg = 'Backend endpoint not found. The PUT /api/v1/auth/users/{id} endpoint needs to be implemented.';
        } else if (err.status === 403) {
          errorMsg = 'Access denied. You may not have permission to update users.';
        } else if (err.status === 500) {
          errorMsg = 'Server error. Please check the backend logs.';
        }

        alert(`Failed to ${action} user.\n\nStatus: ${err.status || 'Unknown'}\nError: ${errorMsg}\n\nPlease ensure the backend has:\nPUT /api/v1/auth/users/${user.userId}`);
      }
    });
  }

  deleteUser(user: any): void {
    if (confirm(`Are you sure you want to delete ${user.fullName}?`)) {
      this.userService.deleteUser(user.userId).subscribe({
        next: () => {
          // Reload users to confirm deletion persisted
          this.loadUsers();
          alert('User deleted successfully!');
        },
        error: (err: any) => {
          console.error('Failed to delete user:', err);
          const errorMsg = err.message || 'Unknown error';
          alert(`Failed to delete user.\n\nError: ${errorMsg}\n\nPlease ensure the backend has:\nDELETE /api/v1/auth/users/${user.userId}`);
        }
      });
    }
  }

  // Provider Actions
  editProvider(provider: any): void {
    const dialogRef = this.dialog.open(EditProviderDialogComponent, {
      width: '600px',
      disableClose: false,
      data: { provider: provider }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadProviders();
      }
    });
  }

  toggleProviderStatus(provider: any): void {
    if (!provider.providerId) {
      alert(`Cannot verify ${provider.fullName} yet.\n\nThis user has registered but has not completed their Provider Profile setup. They must fill out their profile information before you can verify them.`);
      return;
    }

    const action = provider.isVerified ? 'unverify' : 'verify';
    if (!confirm(`Are you sure you want to ${action} ${provider.fullName}?`)) {
      return;
    }

    console.log(`Attempting to ${action} provider:`, provider.providerId);

    const request = provider.isVerified 
      ? this.providerService.unverifyProvider(provider.providerId)
      : this.providerService.verifyProvider(provider.providerId);

    request.subscribe({
      next: (updatedProvider) => {
        console.log('Provider updated successfully:', updatedProvider);
        this.loadProviders();
        alert(`Provider ${action}ed successfully!`);
      },
      error: (err: any) => {
        console.error('Failed to update provider:', err);
        const errorMsg = err.message || 'Unknown error';
        alert(`Failed to ${action} provider.\n\nError: ${errorMsg}`);
      }
    });
  }

  deleteProvider(provider: any): void {
    if (confirm(`Are you sure you want to delete ${provider.fullName}?`)) {
      this.providerService.deleteProvider(provider.providerId).subscribe({
        next: () => {
          this.loadProviders();
          alert('Provider deleted successfully!');
        },
        error: (err: any) => {
          console.error('Failed to delete provider:', err);
          const errorMsg = err.message || 'Unknown error';
          alert(`Failed to delete provider.\n\nError: ${errorMsg}\n\nPlease ensure the backend has:\nDELETE /api/v1/providers/${provider.providerId}`);
        }
      });
    }
  }

  // Appointment Actions
  viewAppointment(appointment: any): void {
    this.router.navigate(['/admin/appointments', appointment.appointmentId]);
  }

  deleteAppointment(appointment: any): void {
    let action = '';
    let confirmMessage = '';
    let serviceCall;
    
    // Determine action based on appointment status
    if (appointment.status === 'Scheduled' || appointment.status === 'Pending') {
      action = 'cancel';
      confirmMessage = `Are you sure you want to cancel this appointment with ${appointment.patientName}?`;
      serviceCall = this.appointmentService.cancelAppointment(appointment.appointmentId);
    } else if (appointment.status === 'Cancelled' || appointment.status === 'Failed' || appointment.status === 'Completed') {
      action = 'delete';
      confirmMessage = `Are you sure you want to delete this appointment record permanently?`;
      serviceCall = this.appointmentService.deleteAppointment(appointment.appointmentId);
    } else {
      // For any other status, just show info
      alert(`This appointment cannot be modified in its current state.`);
      return;
    }
    
    if (confirm(confirmMessage)) {
      serviceCall.subscribe({
        next: () => {
          this.loadAppointments();
          alert(`Appointment ${action}ed successfully!`);
        },
        error: (err: any) => {
          alert(`Failed to ${action} appointment: ` + (err.message || 'Unknown error'));
        }
      });
    }
  }

  // Payment Actions
  viewPayment(payment: any): void {
    const formattedDate = new Date(payment.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    alert(`Payment Details:\n\nPatient: ${payment.patientName}\nProvider: ${payment.providerName}\nAmount: ₹${payment.amount}\nStatus: ${payment.status}\nDate: ${formattedDate}\nTransaction ID: ${payment.transactionId || 'N/A'}`);
  }

  deletePayment(payment: any): void {
    const isRefunded = payment.status === 'Refunded';
    const isSuccess = ['Completed', 'Paid', 'Success'].includes(payment.status);
    
    let confirmMessage = `Are you sure you want to delete this payment of ₹${payment.amount}?\n\nThis will permanently remove the transaction record.\n\nTransaction ID: ${payment.transactionId || 'N/A'}`;
    
    if (isRefunded) {
      confirmMessage += `\n\n⚠️ This is a REFUNDED payment. Deleting it will reduce total revenue by the ₹50 platform fee that was kept.`;
    } else if (isSuccess) {
      confirmMessage += `\n\n⚠️ This will reduce your total revenue by the full amount of ₹${payment.amount}.`;
    }

    if (confirm(confirmMessage)) {
      console.log('Deleting payment:', payment);
      
      this.paymentService.deletePayment(payment.paymentId || payment.id).subscribe({
        next: () => {
          // Remove payment from the list
          this.dataList = this.dataList.filter((p: any) => (p.paymentId || p.id) !== (payment.paymentId || payment.id));
          this.totalCount = this.dataList.length;
          
          // Calculate the actual amount to deduct based on payment status
          let deductAmount = 0;
          if (isRefunded) {
            deductAmount = 50; 
          } else if (isSuccess) {
            deductAmount = parseFloat(payment.amount) || 0;
          }
          
          // Reduce revenue
          if (deductAmount > 0) {
            this.totalRevenue -= deductAmount;
            console.log(`Revenue reduced by ₹${deductAmount}. New total: ₹${this.totalRevenue}`);
          }
          
          // Recalculate payment stats
          this.completedPayments = this.dataList.filter((p: any) => 
            ['Completed', 'Paid', 'Success'].includes(p.status)
          ).length;
          this.pendingPayments = this.dataList.filter((p: any) => 
            ['Pending', 'Processing'].includes(p.status)
          ).length;
          
          const msgSuffix = deductAmount > 0 ? `\n\n₹${deductAmount} has been deducted from total revenue.` : '';
          alert(`✅ Payment record deleted successfully!${msgSuffix}`);
        },
        error: (err: any) => {
          console.error('Failed to delete payment:', err);
          const errorMsg = err.message || 'Unknown error';
          alert(`❌ Failed to delete payment.\n\nError: ${errorMsg}\n\nPlease ensure the backend has:\nDELETE /api/v1/payments/${payment.paymentId || payment.id}`);
        }
      });
    }
  }

  
  // Review Actions
  viewReview(review: any): void {
    alert(`Review Details:\n\nPatient: ${review.patientName}\nRating: ${review.rating}/5\nComment: ${review.comment}\nDate: ${review.date}`);
  }

  deleteReview(review: any): void {
    if (confirm('Are you sure you want to delete this review?')) {
      this.reviewService.deleteReview(review.id).subscribe({
        next: () => {
          this.dataList = this.dataList.filter((r: any) => r.id !== review.id);
          this.totalCount = this.dataList.length;
          alert('Review deleted successfully!');
        },
        error: (err: any) => {
          alert('Failed to delete review: ' + (err.message || 'Unknown error'));
        }
      });
    }
  }

  // Record Actions
  viewRecord(record: any): void {
    const dialogRef = this.dialog.open(ViewMedicalRecordDialogComponent, {
      width: '600px',
      disableClose: false,
      data: { record: record }
    });
  }

  downloadRecord(record: any): void {
    this.medicalRecordService.downloadRecord(record.recordId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MedicalRecord_${record.recordId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        alert('Failed to download record: ' + (err.message || 'Unknown error'));
      }
    });
  }

  deleteRecord(record: any): void {
    if (confirm(`Are you sure you want to delete the medical record for ${record.patientName} (${record.title})?`)) {
      this.medicalRecordService.deleteRecord(record.recordId || record.id).subscribe({
        next: () => {
          this.dataList = this.dataList.filter(r => (r.recordId || r.id) !== (record.recordId || record.id));
          this.totalCount = this.dataList.length;
          alert('Medical record deleted successfully!');
        },
        error: (err) => {
          alert('Failed to delete medical record: ' + (err.message || 'Unknown error'));
        }
      });
    }
  }

  // Notification Actions
  viewNotification(notification: any): void {
    alert(`Notification Details:\n\nTitle: ${notification.title}\nMessage: ${notification.message}\nDate: ${notification.createdAt}`);
  }

  deleteNotification(notification: any): void {
    if (confirm('Are you sure you want to delete this notification?')) {
      this.notificationService.deleteNotification(notification.id).subscribe({
        next: () => {
          this.dataList = this.dataList.filter((n: any) => n.id !== notification.id);
          this.totalCount = this.dataList.length;
          alert('Notification deleted successfully!');
        },
        error: (err: any) => {
          alert('Failed to delete notification: ' + (err.message || 'Unknown error'));
        }
      });
    }
  }
}
