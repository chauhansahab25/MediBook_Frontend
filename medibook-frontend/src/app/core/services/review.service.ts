import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = environment.reviewUrl;

  constructor(private http: HttpClient) {}

  getReviews(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reviews`);
  }

  getReviewById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reviews/${id}`);
  }

  createReview(review: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reviews`, review);
  }

  updateReview(id: number, review: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/reviews/${id}`, review);
  }

  deleteReview(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/reviews/${id}`);
  }

  getReviewsByProvider(providerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reviews/provider/${providerId}`);
  }

  getReviewsByPatient(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reviews/patient/${patientId}`);
  }
}
