import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProviderService {
  private apiUrl = environment.providerUrl;

  constructor(private http: HttpClient) {}

  getProviders(): Observable<any[]> {
    const url = `${this.apiUrl}/providers`;
    console.log('ProviderService: Calling GET', url);

    return this.http.get<any[]>(url).pipe(
      catchError((err) => {
        console.error('ProviderService.getProviders error:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);

        if (err.status === 0) {
          throw new Error('Cannot connect to ProviderService. Please check if it is running on port 5096.');
        }
        if (err.status === 404) {
          console.warn('Provider endpoint returned 404 - endpoint not found');
          return of([]);
        }
        throw err;
      })
    );
  }

  getProviderById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/providers/${id}`).pipe(
      catchError((err) => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  getProviderByUserId(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/providers/user/${userId}`).pipe(
      catchError((err) => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  searchProviders(term: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/providers/search?term=${term}`).pipe(
      catchError((err) => {
        if (err.status === 404) {
          return of([]);
        }
        throw err;
      })
    );
  }

  createProvider(providerData: any): Observable<any> {
    console.log('Creating provider profile:', providerData);
    return this.http.post<any>(`${this.apiUrl}/providers`, providerData).pipe(
      catchError((err) => {
        console.error('Create provider error:', err);
        throw err;
      })
    );
  }

  updateProvider(id: number, providerData: any): Observable<any> {
    console.log('Updating provider:', id, providerData);
    return this.http.put<any>(`${this.apiUrl}/providers/${id}`, providerData).pipe(
      catchError((err) => {
        console.error('Update provider error:', err);
        if (err.status === 404) {
          throw new Error('Update provider endpoint not implemented. Please add PUT /api/v1/providers/{id} to the backend.');
        }
        throw err;
      })
    );
  }

  deleteProvider(id: number): Observable<any> {
    console.log('Deleting provider:', id);
    return this.http.delete<any>(`${this.apiUrl}/providers/${id}`).pipe(
      catchError((err) => {
        console.error('Delete provider error:', err);
        if (err.status === 404) {
          throw new Error('Delete provider endpoint not implemented. Please add DELETE /api/v1/providers/{id} to the backend.');
        }
        throw err;
      })
    );
  }

  verifyProvider(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/providers/${id}/verify`, {});
  }

  unverifyProvider(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/providers/${id}/unverify`, {});
  }
}
