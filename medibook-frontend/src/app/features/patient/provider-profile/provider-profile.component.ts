import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProviderService } from '../../../core/services/provider.service';
import { ReviewService } from '../../../core/services/review.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-provider-profile',
  templateUrl: './provider-profile.component.html',
  styleUrls: ['./provider-profile.component.css']
})
export class ProviderProfileComponent implements OnInit {
  provider: any;
  providerId: string | null = null;
  loading = true;
  error = '';
  reviewCount = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private providerService: ProviderService,
    private reviewService: ReviewService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.providerId = this.route.snapshot.paramMap.get('id');
    this.loadProviderProfile();
  }

  loadProviderProfile(): void {
    if (!this.providerId) return;

    this.loading = true;
    this.error = '';

    const id = Number(this.providerId);

    // Fetch provider, review count, average rating, and potentially missing user details
    Promise.all([
      firstValueFrom(this.providerService.getProviderById(id)),
      firstValueFrom(this.reviewService.getReviewCount(id)).catch(() => ({ count: 0 })),
      firstValueFrom(this.reviewService.getAverageRating(id)).catch(() => ({ averageRating: 0 }))
    ]).then(async ([provider, reviewData, ratingData]: [any, any, any]) => {
      if (!provider) {
        throw new Error('Provider not found');
      }

      this.reviewCount = reviewData?.count || 0;
      const realTimeRating = ratingData?.averageRating || 0;
      
      // Initial assignment
      this.provider = {
        ...provider,
        reviewCount: this.reviewCount,
        avgRating: realTimeRating || provider.avgRating || 0,
        fullName: provider.fullName || provider.FullName || `User #${provider.userId}`,
        email: provider.email || provider.Email || 'N/A'
      };

      // Failsafe: if name is still a placeholder (User # or Provider #), fetch from public AuthService endpoint
      const currentName = this.provider?.fullName || '';
      if (currentName.startsWith('User #') || currentName.startsWith('Provider #') || !currentName || currentName === 'N/A') {
        try {
          const uId = provider?.userId || provider?.UserId;
          if (uId) {
            const user = await firstValueFrom(this.userService.getUserById(uId)).catch(() => null);
            if (user && typeof user === 'object') {
              this.provider.fullName = user?.fullName || user?.FullName || this.provider.fullName;
              this.provider.email = user?.email || user?.Email || this.provider.email;
            }
          }
        } catch (err) {
          console.warn('Failed to resolve provider name from AuthService:', err);
        }
      }

      this.loading = false;
    }).catch((err) => {
      this.error = 'Failed to load provider profile: ' + (err.message || 'Unknown error');
      this.loading = false;
    });
  }

  bookAppointment(): void {
    this.router.navigate(['/patient/book-appointment', this.providerId]);
  }

  goBack(): void {
    this.router.navigate(['/patient/search-providers']);
  }
}
