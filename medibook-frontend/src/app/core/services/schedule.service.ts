import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private apiUrl = environment.scheduleUrl;

  constructor(private http: HttpClient) {}

  getAvailableSlots(providerId: number, date: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/slots/provider/${providerId}`);
  }

  bookSlot(slotId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/slots/${slotId}/book`, {});
  }

  cancelSlot(slotId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/slots/${slotId}`);
  }

  createSlot(slot: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/slots`, slot);
  }

  createRecurringSlots(recurringData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/slots/generateRecurring`, recurringData);
  }
}
