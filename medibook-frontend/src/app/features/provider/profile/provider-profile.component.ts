import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ProviderService } from '../../../core/services/provider.service';

@Component({
  selector: 'app-provider-profile',
  templateUrl: './provider-profile.component.html',
  styleUrls: ['./provider-profile.component.css']
})
export class ProviderProfileComponent implements OnInit {
  profile: any = {
    fullName: '',
    email: '',
    specialization: '',
    qualification: '',
    experienceYears: null,
    bio: '',
    phone: '',
    clinicName: '',
    clinicAddress: ''
  };
  loading = false;
  currentUser: any = null;
  userName = '';
  isVerified = false;
  
  // Password Change
  changingPassword = false;
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  passwordLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private providerService: ProviderService
  ) {}

  ngOnInit(): void {
    this.setUserName();
    this.loadProfile();
  }

  setUserName(): void {
    const user = this.authService.currentUserValue;
    const name = user?.fullName || 'Provider';
    this.userName = name === 'Provider' ? name : `Dr. ${name}`;
  }

  loadProfile(): void {
    this.loading = true;
    // Get current user from AuthService (data from registration/login)
    this.currentUser = this.authService.currentUserValue;

    if (this.currentUser) {
      // Load basic info from auth user
      this.profile.fullName = this.currentUser.fullName || '';
      this.profile.email = this.currentUser.email || '';
      this.profile.phone = this.currentUser.phone || '';

      // Fetch complete provider profile from backend API
      const userId = this.currentUser?.userId || this.currentUser?.id;
      if (userId) {
        this.providerService.getProviderByUserId(userId).subscribe({
          next: (userProfile: any) => {
            if (userProfile) {
              // Merge API data with current profile
              this.profile = {
                ...this.profile,
                fullName: userProfile.fullName || this.profile.fullName,
                email: userProfile.email || this.profile.email,
                phone: userProfile.phone || this.profile.phone,
                // Provider-specific fields from API
                specialization: userProfile.specialization || '',
                qualification: userProfile.qualification || '',
                experienceYears: userProfile.experienceYears || null,
                bio: userProfile.bio || '',
                clinicName: userProfile.clinicName || '',
                clinicAddress: userProfile.clinicAddress || ''
              };
              
              // Capture verification status
              this.isVerified = userProfile.isVerified || false;
            } else {
              // Default to unverified for new profiles
              this.isVerified = false;
            }

            // Also cache in localStorage for offline access
            localStorage.setItem('providerProfile', JSON.stringify({
              specialization: this.profile.specialization,
              qualification: this.profile.qualification,
              experienceYears: this.profile.experienceYears,
              bio: this.profile.bio,
              phone: this.profile.phone,
              clinicName: this.profile.clinicName,
              clinicAddress: this.profile.clinicAddress
            }));

            this.loading = false;
          },
          error: (err: any) => {
            console.error('Failed to load profile from API:', err);

            // Fallback: Load from localStorage if API fails
            const savedProfile = localStorage.getItem('providerProfile');
            if (savedProfile) {
              try {
                const parsed = JSON.parse(savedProfile);
                this.profile = { ...this.profile, ...parsed };
              } catch (e) {
                console.error('Failed to parse saved profile:', e);
              }
            }

            this.loading = false;
          }
        });
      } else {
        this.loading = false;
      }
    }
  }

  saveProfile(): void {
    this.loading = true;

    // Prepare complete profile data for API
    const profileData = {
      // Basic user info
      fullName: this.profile.fullName,
      email: this.profile.email,
      phone: this.profile.phone,

      // Provider-specific details
      specialization: this.profile.specialization,
      qualification: this.profile.qualification,
      experienceYears: this.profile.experienceYears,
      bio: this.profile.bio,
      clinicName: this.profile.clinicName,
      clinicAddress: this.profile.clinicAddress
    };

    // Save to backend API via ProviderService
    const userId = this.currentUser?.userId || this.currentUser?.id;
    if (userId) {
      this.providerService.getProviderByUserId(userId).subscribe({
        next: (existingProfile: any) => {
          if (existingProfile) {
            // Update existing provider profile
            const updateData = {
              ...existingProfile,
              ...profileData
            };

            this.providerService.updateProvider(existingProfile.providerId, updateData).subscribe({
              next: (updatedProfile) => {
                localStorage.setItem('providerProfile', JSON.stringify(profileData));
                alert('Profile updated successfully!');
                this.loading = false;
              },
              error: (err: any) => {
                console.error('Failed to update profile:', err);
                alert('Failed to update profile. Please try again.');
                this.loading = false;
              }
            });
          } else {
            // Create NEW provider profile
            const newProfileData = {
              userId: userId,
              ...profileData
            };
            
            this.providerService.createProvider(newProfileData).subscribe({
              next: (createdProfile) => {
                localStorage.setItem('providerProfile', JSON.stringify(profileData));
                alert('Profile created successfully! Your account is now pending admin verification.');
                this.loading = false;
              },
              error: (err: any) => {
                console.error('Failed to create profile:', err);
                alert('Failed to create profile. Please check your data and try again.');
                this.loading = false;
              }
            });
          }
        },
        error: (err: any) => {
          console.error('Failed to check existing profile:', err);
          alert('Network error. Failed to save profile.');
          this.loading = false;
        }
      });
    } else {
      alert('User ID not found. Please log in again.');
      this.loading = false;
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  goBack(): void {
    this.router.navigate(['/provider/dashboard']);
  }

  navigateToSchedule(): void {
    this.router.navigate(['/provider/schedule']);
  }

  navigateToAppointments(): void {
    this.router.navigate(['/provider/appointments']);
  }

  changePassword(): void {
    if (!this.passwordData.currentPassword || !this.passwordData.newPassword) {
      alert('Please fill in all password fields.');
      return;
    }

    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      alert('New passwords do not match.');
      return;
    }

    if (this.passwordData.newPassword.length < 6) {
      alert('New password must be at least 6 characters long.');
      return;
    }

    this.passwordLoading = true;
    const dto = {
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword
    };

    this.authService.changePassword(dto).subscribe({
      next: () => {
        alert('Password changed successfully!');
        this.passwordData = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        this.changingPassword = false;
        this.passwordLoading = false;
      },
      error: (err: any) => {
        console.error('Failed to change password:', err);
        alert(err.error?.message || 'Failed to change password. Please verify your current password.');
        this.passwordLoading = false;
      }
    });
  }

  togglePasswordChange(): void {
    this.changingPassword = !this.changingPassword;
    if (!this.changingPassword) {
      this.passwordData = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
    }
  }
}
