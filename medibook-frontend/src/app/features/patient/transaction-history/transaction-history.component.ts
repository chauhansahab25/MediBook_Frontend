import { Component, OnInit } from '@angular/core';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-transaction-history',
  templateUrl: './transaction-history.component.html',
  styleUrls: ['./transaction-history.component.css']
})
export class TransactionHistoryComponent implements OnInit {
  transactions: any[] = [];
  loading = true;
  error = '';
  currentUser: any;

  constructor(
    private paymentService: PaymentService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadTransactionHistory();
  }

  loadTransactionHistory(): void {
    this.loading = true;
    this.error = '';

    // Get payment history for the current user
    this.paymentService.getPaymentHistory().subscribe({
      next: (payments: any[]) => {
        // Filter payments for current user
        this.transactions = payments.filter(payment => 
          payment.patientId === this.currentUser?.userId || 
          payment.patientId === this.currentUser?.id
        );
        
        // Process transactions to ensure refunded amount is set to ₹500
        this.transactions = this.transactions.map(transaction => {
          if (transaction.status === 'Refunded' && !transaction.refundAmount) {
            // Set refund amount to ₹500 for refunded transactions if not already set
            transaction.refundAmount = 500;
          }
          return transaction;
        });
        
        // Sort by date (most recent first)
        this.transactions.sort((a, b) => 
          new Date(b.createdAt || b.paymentDate).getTime() - 
          new Date(a.createdAt || a.paymentDate).getTime()
        );
        
        console.log('User transactions:', this.transactions);
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load transaction history:', err);
        this.error = 'Failed to load transaction history. Please try again later.';
        this.loading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'success':
        return 'status-completed';
      case 'pending':
      case 'processing':
        return 'status-pending';
      case 'refunded':
        return 'status-refunded';
      case 'failed':
        return 'status-failed';
      default:
        return 'status-unknown';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'success':
        return 'check_circle';
      case 'pending':
      case 'processing':
        return 'pending';
      case 'refunded':
        return 'refresh';
      case 'failed':
        return 'error';
      default:
        return 'help';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
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

  goBack(): void {
    this.router.navigate(['/patient/dashboard']);
  }
}
