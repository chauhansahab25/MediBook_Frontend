import { Component, OnInit } from '@angular/core';
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
      this.providerService.getProviders().toPromise(),
      this.userService.getUsers().toPromise()
    ]).then(([providers, users]) => {
      console.log('Providers loaded:', providers);
      console.log('Users loaded:', users);
      
      // Merge provider data with user data
      this.dataList = (providers || []).map((provider: any) => {
        const user = (users || []).find((u: any) => u.userId === provider.userId);
        return {
          ...provider,
          fullName: user?.fullName || `Provider #${provider.providerId}`,
          email: user?.email || 'N/A',
          phone: user?.phone || 'N/A'
        };
      });
      
      console.log('Merged provider data:', this.dataList);
      this.totalCount = this.dataList.length;
      this.activeCount = this.dataList.filter((p: any) => p.isVerified).length;
      this.pendingCount = this.dataList.filter((p: any) => !p.isVerified).length;
      this.loading = false;
    }).catch((err) => {
      console.error('Failed to load providers:', err);
      this.error = 'Failed to load providers: ' + (err.message || 'Unknown error');
      this.loading = false;
    });
  }

  loadAppointments(): void {
    this.appointmentService.getAppointments().subscribe({
      next: (appointments: any[]) => {
        console.log('Raw appointments from backend:', appointments);
        
        this.dataList = appointments.map((a: any) => {
          // Handle null/undefined appointment object
          if (!a) {
            console.warn('Null appointment found:', a);
            return null;
          }
          
          const mapped = {
            appointmentId: a.appointmentId || 0,
            patientId: a.patientId || 0,
            providerId: a.providerId || 0,
            slotId: a.slotId || 0,
            patientName: a.patientName || `Patient #${a.patientId || 'Unknown'}`,
            providerName: a.providerName || `Provider #${a.providerId || 'Unknown'}`,
            specialization: a.specialization || 'N/A',
            serviceType: a.serviceType || 'Consultation',
            appointmentDate: a.appointmentDate || new Date(),
            startTime: a.startTime || new Date(),
            endTime: a.endTime || new Date(),
            modeOfConsultation: a.modeOfConsultation || 'InPerson',
            status: a.status || 'Unknown',
            notes: a.notes || '',
            paymentStatus: a.paymentStatus || 'Pending',
            paymentAmount: a.paymentAmount || 0,
            paymentMode: a.paymentMode || '',
            transactionId: a.transactionId || '',
            cancelledBy: a.cancelledBy || '',
            createdAt: a.createdAt || new Date(),
            updatedAt: a.updatedAt || new Date()
          };
          console.log('Mapped appointment:', mapped);
          return mapped;
        }).filter(a => a !== null); // Remove any null appointments
        
        this.totalCount = appointments.length;
        this.activeCount = appointments.filter((a: any) => a && (a.status === 'Scheduled' || a.status === 'Confirmed')).length;
        this.pendingCount = appointments.filter((a: any) => a && a.status === 'Pending').length;
        this.loading = false;
        
        console.log('Final dataList:', this.dataList);
        console.log('Total count:', this.totalCount);
        console.log('DataList length:', this.dataList.length);
      },
      error: (err: any) => {
        this.error = 'Failed to load appointments: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  loadPayments(): void {
    this.paymentService.getPaymentHistory().subscribe({
      next: (payments: any[]) => {
        console.log('=== Payments Loaded ===', payments);
        this.dataList = payments.map((p: any) => ({
          ...p,
          date: p.createdAt || p.paymentDate,
          amount: p.amount || p.paymentAmount
        }));
        
        // Calculate real totals
        this.totalCount = payments.length;
        this.activeCount = payments.filter((p: any) => 
          p.status === 'Completed' || p.status === 'Paid' || p.status === 'Success'
        ).length;
        
        // Calculate completed and pending counts
        this.completedPayments = payments.filter((p: any) => 
          p.status === 'Completed' || p.status === 'Paid' || p.status === 'Success'
        ).length;
        this.pendingPayments = payments.filter((p: any) => 
          p.status === 'Pending' || p.status === 'Processing'
        ).length;
        
        // Calculate total revenue: completed payments + platform fees from refunded payments
        const completedRevenue = payments
          .filter((p: any) => p.status === 'Completed' || p.status === 'Paid' || p.status === 'Success')
          .reduce((sum: number, p: any) => sum + (parseFloat(p.amount || p.paymentAmount || 0)), 0);
        
        // Add platform fees (₹50) from refunded payments
        const refundedPlatformFees = payments
          .filter((p: any) => p.status === 'Refunded')
          .reduce((sum: number, p: any) => {
            const platformFee = 50; // Fixed platform fee
            const refundAmount = parseFloat(p.refundAmount || p.amount - platformFee || 0);
            const originalAmount = parseFloat(p.amount || 0);
            return sum + (originalAmount - refundAmount); // Platform fee = original - refund
          }, 0);
        
        this.totalRevenue = completedRevenue + refundedPlatformFees;
        
        console.log(`Revenue calculation: ${completedRevenue} (completed) + ${refundedPlatformFees} (platform fees) = ${this.totalRevenue}`);
        
        // Calculate today's payments - includes completed payments + platform fees from refunded payments
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Today's completed payments
        const todayCompletedRevenue = payments
          .filter((p: any) => {
            const paymentDate = new Date(p.createdAt || p.paymentDate);
            return paymentDate >= today && (p.status === 'Completed' || p.status === 'Paid' || p.status === 'Success');
          })
          .reduce((sum: number, p: any) => sum + (parseFloat(p.amount || p.paymentAmount || 0)), 0);
        
        // Today's platform fees from refunded payments
        const todayRefundedPlatformFees = payments
          .filter((p: any) => {
            const paymentDate = new Date(p.createdAt || p.paymentDate);
            return paymentDate >= today && p.status === 'Refunded';
          })
          .reduce((sum: number, p: any) => {
            const platformFee = 50; // Fixed platform fee
            const refundAmount = parseFloat(p.refundAmount || p.amount - platformFee || 0);
            const originalAmount = parseFloat(p.amount || 0);
            return sum + (originalAmount - refundAmount); // Platform fee = original - refund
          }, 0);
        
        this.todayPayments = todayCompletedRevenue + todayRefundedPlatformFees;
        
        console.log(`Today's payments calculation: ${todayCompletedRevenue} (completed) + ${todayRefundedPlatformFees} (platform fees) = ${this.todayPayments}`);
        
        // Track last payment update time
        const recentPayments = payments
          .filter((p: any) => p.createdAt || p.paymentDate)
          .sort((a: any, b: any) => new Date(b.createdAt || b.paymentDate).getTime() - new Date(a.createdAt || a.paymentDate).getTime());
        
        if (recentPayments.length > 0) {
          this.lastPaymentUpdate = new Date(recentPayments[0].createdAt || recentPayments[0].paymentDate);
        }
        
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load payments: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  loadReviews(): void {
    this.reviewService.getReviews().subscribe({
      next: (reviews: any[]) => {
        console.log('=== Reviews Loaded ===', reviews);
        this.dataList = reviews;
        this.totalCount = reviews.length;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load reviews: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  loadRecords(): void {
    this.medicalRecordService.getMedicalRecords().subscribe({
      next: (records: any[]) => {
        this.dataList = records.map((r: any) => ({
          ...r,
          patientName: r.patientName || `Patient #${r.patientId}`,
          title: r.diagnosis || 'Medical Record',
          createdAt: r.createdAt,
          appointmentDate: r.appointmentDate // Add appointment date for display
        }));
        this.totalCount = records.length;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load medical records: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
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
    alert(`Payment Details:\n\nAmount: ${payment.amount}\nStatus: ${payment.status}\nDate: ${payment.date}\nTransaction ID: ${payment.transactionId || 'N/A'}`);
  }

  deletePayment(payment: any): void {
    if (confirm(`Are you sure you want to delete this payment of ₹${payment.amount}?\n\nThis will permanently remove the transaction and reduce the total revenue.\n\nTransaction ID: ${payment.transactionId || 'N/A'}`)) {
      console.log('Deleting payment:', payment);
      
      this.paymentService.deletePayment(payment.paymentId || payment.id).subscribe({
        next: () => {
          // Remove payment from the list
          this.dataList = this.dataList.filter((p: any) => (p.paymentId || p.id) !== (payment.paymentId || payment.id));
          this.totalCount = this.dataList.length;
          
          // Calculate the actual amount to deduct based on payment status
          let deductAmount = 0;
          if (payment.status === 'Refunded') {
            // For refunded payments, only deduct the refund amount (not the platform fee)
            deductAmount = parseFloat(payment.refundAmount || payment.amount - 50 || payment.amount) || 0;
          } else if (payment.status === 'Completed' || payment.status === 'Paid') {
            // For completed/paid payments, deduct the full amount
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
          
          alert(`✅ Payment deleted successfully!\n\n₹${payment.amount} has been deducted from total revenue.`);
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
