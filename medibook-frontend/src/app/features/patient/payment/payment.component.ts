import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../../core/services/payment.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit {
  appointmentId: number | null = null;
  providerId: number | null = null;
  amount: number = 550.00;
  loading = false;
  paymentProcessing = false;
  
  // Flow control
  currentStep: 'contact' | 'methods' | 'banks' | 'processing' | 'dialog_choice' | 'result' = 'contact';
  paymentStatus: 'success' | 'failed' | null = null;
  selectedMethod: string = 'upi';

  // User details
  contactInfo = {
    email: '',
    phone: '9000900009'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private appointmentService: AppointmentService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.appointmentId = idParam ? Number(idParam) : null;
    
    const amountParam = this.route.snapshot.queryParamMap.get('amount');
    if (amountParam) {
      this.amount = Number(amountParam);
    }

    const user = this.authService.currentUserValue;
    if (user) {
      this.contactInfo.email = user.email || '';
      this.contactInfo.phone = user.phone || '9000900009';
    }

    if (this.appointmentId) {
      this.appointmentService.getAppointmentById(this.appointmentId).subscribe({
        next: (appointment) => {
          this.providerId = appointment.providerId;
        }
      });
    }
  }

  goToMethods(): void {
    this.currentStep = 'methods';
  }

  onImgError(event: any): void {
    event.target.style.display = 'none';
  }

  goToBanks(method: string): void {
    this.selectedMethod = method;
    this.currentStep = 'banks';
  }

  processPayment(): void {
    this.currentStep = 'processing';
    this.paymentProcessing = true;
    
    // Show the success/fail choice dialog after a short processing delay
    setTimeout(() => {
      this.currentStep = 'dialog_choice';
      this.paymentProcessing = false;
    }, 1500);
  }

  onChoiceSelect(success: boolean): void {
    this.currentStep = 'processing';
    this.paymentProcessing = true;

    // Small delay to simulate final verification
    setTimeout(() => {
      if (success) {
        this.completeSuccessfulPayment();
      } else {
        this.recordFailedPayment();
      }
    }, 1000);
  }

  recordFailedPayment(): void {
    const txnId = 'fail_' + Math.random().toString(36).substr(2, 9);
    
    const paymentData = {
      appointmentId: this.appointmentId,
      patientId: this.authService.currentUserValue?.userId,
      amount: this.amount,
      status: 'Failed',
      mode: 'Razorpay',
      transactionId: txnId,
      currency: 'INR',
      notes: `Failed payment attempt for appointment #${this.appointmentId}`
    };

    this.paymentService.processPayment(paymentData).subscribe({
      next: () => {
        this.paymentStatus = 'failed';
        this.currentStep = 'result';
        this.paymentProcessing = false;
      },
      error: (err) => {
        console.error('Error recording failed payment:', err);
        this.paymentStatus = 'failed';
        this.currentStep = 'result';
        this.paymentProcessing = false;
      }
    });
  }

  completeSuccessfulPayment(): void {
    const txnId = 'pay_' + Math.random().toString(36).substr(2, 9);
    
    const paymentData = {
      appointmentId: this.appointmentId,
      patientId: this.authService.currentUserValue?.userId,
      amount: this.amount,
      status: 'Paid',
      mode: 'Razorpay',
      transactionId: txnId,
      currency: 'INR',
      notes: `Payment from ${this.contactInfo.email}`
    };

    this.paymentService.processPayment(paymentData).subscribe({
      next: () => {
        this.paymentStatus = 'success';
        this.currentStep = 'result';
        this.paymentProcessing = false;
        
        setTimeout(() => {
          this.router.navigate(['/patient/appointments']);
        }, 3000);
      },
      error: (err) => {
        this.paymentProcessing = false;
        alert('Payment successful but failed to update database: ' + err.message);
      }
    });
  }

  
  retry(): void {
    this.router.navigate(['/patient/appointments']);
  }

  cancel(): void {
    this.router.navigate(['/patient/appointments']);
  }
}
