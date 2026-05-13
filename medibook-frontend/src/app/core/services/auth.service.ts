import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, LoginResponse, RegisterDto, LoginDto } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
      try {
        this.currentUserSubject.next(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        localStorage.removeItem('currentUser');
      }
    }
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserValue && !!localStorage.getItem('accessToken');
  }

  get userRole(): string | null {
    return this.currentUserValue?.role || null;
  }

  register(dto: RegisterDto): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.authUrl}/auth/register`, dto).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  login(dto: LoginDto): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.authUrl}/auth/login`, dto).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  googleAuth(): Observable<LoginResponse> {
    return this.http.get<LoginResponse>(`${environment.authUrl}/auth/google`).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${environment.authUrl}/auth/profile`);
  }

  updateProfile(data: any): Observable<User> {
    return this.http.put<User>(`${environment.authUrl}/auth/profile`, data).pipe(
      tap(user => {
        const currentUser = this.currentUserValue;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...user };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          this.currentUserSubject.next(updatedUser);
        }
      })
    );
  }

  changePassword(data: any): Observable<any> {
    return this.http.put(`${environment.authUrl}/auth/password`, data);
  }

  private handleAuthResponse(response: LoginResponse): void {
    console.log('handleAuthResponse - Full response:', response);
    
    // Map backend response to frontend format
    const accessToken = response.accessToken || response.token || '';
    const refreshToken = response.refreshToken || '';

    // Create user object from response - backend returns user data at root level
    const user: User = {
      userId: (response as any).userId || response.user?.userId || 0,
      fullName: response.fullName || response.user?.fullName || '',
      email: response.email || response.user?.email || '',
      role: (response.role || response.user?.role || 'Patient') as 'Patient' | 'Provider' | 'Admin',
      provider: 'Local',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    console.log('Created user object:', user);

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);

    // If provider, fetch provider profile to get providerId and verification status
    if (user.role === 'Provider' && user.userId) {
      this.fetchProviderProfile(user.userId, accessToken);
    }
  }

  private fetchProviderProfile(userId: number, token: string): void {
    this.http.get<any>(`${environment.providerUrl}/providers/user/${userId}`).subscribe({
      next: (provider) => {
        console.log('Provider profile fetched:', provider);
        if (provider) {
          const currentUser = this.currentUserValue;
          if (currentUser) {
            const updatedUser = { 
              ...currentUser, 
              providerId: provider.providerId,
              verified: provider.isVerified 
            };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            this.currentUserSubject.next(updatedUser);
            console.log('Provider profile updated in user:', updatedUser);
          }
        }
      },
      error: (err) => {
        console.warn('Could not fetch provider profile:', err);
      }
    });
  }
}
