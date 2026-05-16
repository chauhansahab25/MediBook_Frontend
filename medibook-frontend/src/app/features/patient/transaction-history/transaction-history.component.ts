import { Component, OnInit } from '@angular/core';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ProviderService } from '../../../core/services/provider.service';
import { UserService } from '../../../core/services/user.service';
import { firstValueFrom } from 'rxjs';

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
    private router: Router,
    private providerService: ProviderService,
    private userService: UserService
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
      next: async (payments: any[]) => {
        // Filter payments for current user
        let userTransactions = payments.filter(payment => 
          payment.patientId === this.currentUser?.userId || 
          payment.patientId === this.currentUser?.id
        );
        
        // Process transactions to ensure refunded amount is set to ₹500
        userTransactions = userTransactions.map(transaction => {
          if (transaction.status === 'Refunded' && !transaction.refundAmount) {
            // Set refund amount to ₹500 for refunded transactions if not already set
            transaction.refundAmount = 500;
          }
          return transaction;
        });
        
        // Sort by date (most recent first)
        userTransactions.sort((a, b) => 
          new Date(b.createdAt || b.paymentDate).getTime() - 
          new Date(a.createdAt || a.paymentDate).getTime()
        );
        
        // Resolve Provider Names
        try {
          const providerPromises = userTransactions.map(async (t) => {
            const pId = t.providerId || t.ProviderId;
            if (!pId) return { ...t, providerName: 'Unknown Provider' };

            let providerName = 'Unknown Provider';
            
            // 1. Try to get provider profile
            try {
              const providerProfile = await firstValueFrom(this.providerService.getProviderById(pId)).catch(() => null);
              
              if (providerProfile) {
                const profileName = providerProfile.fullName || providerProfile.FullName || '';
                const isPlaceholder = profileName.startsWith('Provider #') || profileName.startsWith('User #') || profileName === 'N/A';
                
                if (profileName && !isPlaceholder) {
                  providerName = profileName;
                } else if (providerProfile.userId || providerProfile.UserId) {
                  // 2. Try to get user details if profile name is empty/placeholder
                  const uId = providerProfile.userId || providerProfile.UserId;
                  const user = await firstValueFrom(this.userService.getUserById(uId)).catch(() => null);
                  if (user) {
                    providerName = user.fullName || user.FullName || providerName;
                  }
                }
              }
            } catch (err) {
              console.warn('Provider lookup failed', err);
            }

            // 3. Last resort direct fallback
            if (providerName === 'Unknown Provider' || providerName.startsWith('Provider #') || providerName.startsWith('User #')) {
               try {
                  // Only try this if we think pId might match userId or if we have no other option
                  const user = await firstValueFrom(this.userService.getUserById(pId)).catch(() => null);
                  if (user && (user.fullName || user.FullName)) {
                    providerName = user.fullName || user.FullName;
                  }
               } catch (e) { }
            }

            // Cleanup placeholders for final display
            if (providerName === 'Unknown Provider' || providerName.startsWith('User #') || providerName.startsWith('Provider #') || providerName === 'N/A') {
              providerName = `Provider #${pId}`;
            }

            return { ...t, providerName };
          });

          this.transactions = await Promise.all(providerPromises);
        } catch (err) {
          console.warn('Failed to resolve some provider names:', err);
          this.transactions = userTransactions;
        }

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
