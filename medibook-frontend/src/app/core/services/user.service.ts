import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.authUrl;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/auth/users`).pipe(
      catchError((err) => {
        if (err.status === 404) {
          // Backend endpoint not available - return empty array
          return of([]);
        }
        throw err;
      })
    );
  }

  getUserById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/users/${id}`).pipe(
      catchError((err) => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      })
    );
  }

  updateUser(id: number, userData: any): Observable<any> {
    console.log('UserService.updateUser called with ID:', id, 'Data:', userData);
    const url = `${this.apiUrl}/auth/users/${id}`;
    console.log('PUT URL:', url);

    return this.http.put<any>(url, userData).pipe(
      catchError((err) => {
        console.error('Update user HTTP error:', err);
        console.error('Error status:', err.status);
        console.error('Error statusText:', err.statusText);
        console.error('Error body:', err.error);

        if (err.status === 0) {
          throw new Error('Cannot connect to backend server. Please check if the AuthService is running on port 5219.');
        }
        if (err.status === 404) {
          throw new Error('PUT endpoint not found (404). Please implement: PUT /api/v1/auth/users/{id}');
        }
        if (err.status === 405) {
          throw new Error('Method not allowed (405). The PUT method may not be configured for this endpoint.');
        }
        if (err.status === 400) {
          throw new Error(`Bad request (400): ${err.error?.message || 'Invalid data sent to server'}`);
        }
        if (err.status === 500) {
          throw new Error(`Server error (500): ${err.error?.message || 'Internal server error'}`);
        }
        throw err;
      })
    );
  }

  deleteUser(id: number): Observable<any> {
    console.log('UserService.deleteUser called with ID:', id);
    const url = `${this.apiUrl}/auth/users/${id}`;
    console.log('DELETE URL:', url);

    return this.http.delete<any>(url).pipe(
      catchError((err) => {
        console.error('Delete user HTTP error:', err);
        console.error('Error status:', err.status);
        console.error('Error statusText:', err.statusText);
        console.error('Error body:', err.error);

        if (err.status === 0) {
          throw new Error('Cannot connect to backend server. Please check if the AuthService is running on port 5219.');
        }
        if (err.status === 404) {
          throw new Error('DELETE endpoint not found (404). Please implement: DELETE /api/v1/auth/users/{id}');
        }
        if (err.status === 405) {
          throw new Error('Method not allowed (405). The DELETE method may not be configured for this endpoint.');
        }
        if (err.status === 403) {
          throw new Error('Access denied (403). You may not have permission to delete users.');
        }
        throw err;
      })
    );
  }
}
