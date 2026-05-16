import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl = environment.appointmentUrl;

  constructor(private http: HttpClient) {}

  getAppointments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments`);
  }

  getAppointmentsByPatient(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments/patient/${patientId}`);
  }

  getAppointmentsByProvider(providerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments/provider/${providerId}`);
  }

  getAppointmentById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/appointments/${id}`);
  }

  createAppointment(appointment: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/appointments`, appointment);
  }

  getAppointmentBySlotId(slotId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/appointments/slot/${slotId}`);
  }

  updateAppointment(id: number, appointment: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/appointments/${id}`, appointment);
  }

  cancelAppointment(id: number, cancelledBy: string = 'Patient'): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/appointments/${id}/cancel?cancelledBy=${cancelledBy}`, {});
  }

  completeAppointment(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/appointments/${id}/complete`, {});
  }

  rescheduleAppointment(id: number, newDate: string, newTime: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/appointments/${id}/reschedule`, {
      newDate: newDate,
      newTime: newTime
    });
  }

  getAvailableSlots(providerId: number, date: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.scheduleUrl}/slots/provider/${providerId}/available?date=${date}`);
  }

  unbookSlot(slotId: number): Observable<any> {
    return this.http.put<any>(`${environment.scheduleUrl}/slots/${slotId}/unbook`, {});
  }

  deleteAppointment(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/appointments/${id}`);
  }
}
