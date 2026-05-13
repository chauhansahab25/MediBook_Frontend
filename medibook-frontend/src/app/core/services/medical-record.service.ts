import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MedicalRecordService {
  private apiUrl = environment.medicalRecordUrl;

  constructor(private http: HttpClient) {}

  getMedicalRecords(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/records`);
  }

  getMedicalRecordsByPatient(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/records/patient/${patientId}`);
  }

  getMedicalRecordById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/records/${id}`);
  }

  getMedicalRecordsByProvider(providerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/records/provider/${providerId}`);
  }

  createRecord(record: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/records`, record);
  }

  downloadRecord(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/records/${id}/download`, {
      responseType: 'blob'
    });
  }
}
