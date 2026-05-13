import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProviderService } from '../../../core/services/provider.service';

@Component({
  selector: 'app-provider-reviews',
  templateUrl: './provider-reviews.component.html',
  styleUrls: ['./provider-reviews.component.css']
})
export class ProviderReviewsComponent implements OnInit {
  reviews: any[] = [];
  loading = true;
  averageRating = 0;
  totalReviews = 0;
  ratingDistribution = [0, 0, 0, 0, 0]; // 1-5 stars
  error = '';
  userName = '';
  providerId: number | null = null;

  constructor(
    private router: Router,
    private reviewService: ReviewService,
    private authService: AuthService,
    private providerService: ProviderService
  ) {}

  ngOnInit(): void {
    this.setUserName();
    this.loadReviews();
  }

  setUserName(): void {
    const user = this.authService.currentUserValue;
    const name = user?.fullName || 'Provider';
    this.userName = name === 'Provider' ? name : `Dr. ${name}`;
  }

  loadReviews(): void {
    const user = this.authService.currentUserValue;
    if (!user || !user.userId) return;

    this.loading = true;
    this.error = '';

    // First get the provider profile to get the correct providerId
    this.providerService.getProviderByUserId(user.userId).subscribe({
      next: (provider) => {
        this.providerId = provider.providerId;
        
        if (!this.providerId) {
          this.error = 'Provider ID not found';
          this.loading = false;
          return;
        }
        
        // Now fetch reviews using the providerId
        this.reviewService.getReviewsByProvider(this.providerId).subscribe({
          next: (reviews) => {
            this.reviews = reviews.map(r => ({
              ...r,
              id: r.reviewId,
              date: r.reviewDate,
              patientName: r.patientId ? `Patient #${r.patientId}` : 'Anonymous Patient',
              helpful: Math.floor(Math.random() * 5) // Mocking helpful count
            })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            this.totalReviews = reviews.length;

            // Calculate average rating
            if (reviews.length > 0) {
              const totalRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
              this.averageRating = Math.round((totalRating / reviews.length) * 10) / 10;
            } else {
              this.averageRating = 0;
            }

            // Calculate rating distribution (index 0 = 5 stars, index 4 = 1 star)
            this.ratingDistribution = [0, 0, 0, 0, 0];
            reviews.forEach((r: any) => {
              if (r.rating >= 1 && r.rating <= 5) {
                this.ratingDistribution[5 - r.rating]++;
              }
            });

            this.loading = false;
          },
          error: (err) => {
            this.error = 'Failed to load reviews: ' + (err.message || 'Unknown error');
            this.reviews = [];
            this.loading = false;
          }
        });
      },
      error: (err) => {
        this.error = 'Failed to load provider profile: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/provider/dashboard']);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }

  markHelpful(review: any): void {
    review.helpful++;
    review.userMarkedHelpful = true;
  }
}
