import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = environment.paymentUrl;

  constructor(private http: HttpClient) {}

  processPayment(paymentData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payments`, paymentData);
  }

  getPaymentByAppointment(appointmentId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/payments/appointment/${appointmentId}`);
  }

  getPaymentHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/payments/history`);
  }

  refundPayment(paymentId: number, refundAmount: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payments/${paymentId}/refund`, {
      refundAmount: refundAmount,
      refundDate: new Date().toISOString(),
      status: 'Refunded'
    });
  }

  deletePayment(paymentId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/payments/${paymentId}`);
  }

  // Mock Razorpay Payment
  mockRazorpayPayment(amount: number): Promise<any> {
    return new Promise((resolve) => {
      // Simulate Razorpay processing delay
      setTimeout(() => {
        resolve({
          razorpay_payment_id: 'pay_' + Math.random().toString(36).substr(2, 9),
          razorpay_order_id: 'order_' + Math.random().toString(36).substr(2, 9),
          razorpay_signature: 'mock_sig_' + Math.random().toString(36).substr(2, 12),
          status: 'success',
          amount: amount
        });
      }, 1500);
    });
  }
}
