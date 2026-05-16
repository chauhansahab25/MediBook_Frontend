import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ProviderService } from '../../../core/services/provider.service';
import { UserService } from '../../../core/services/user.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-reviews',
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.css']
})
export class ReviewsComponent implements OnInit {
  reviews: any[] = [];
  loading = false;

  constructor(
    private router: Router,
    private reviewService: ReviewService,
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private providerService: ProviderService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  async loadReviews(): Promise<void> {
    const user = this.authService.currentUserValue;
    if (!user || !user.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loading = true;

    try {
      const reviews = await firstValueFrom(this.reviewService.getReviewsByPatient(user.userId));
      const enrichedReviews = [];

      for (let review of reviews) {
        let enriched = {
          ...review,
          provider: 'Healthcare Provider',
          specialization: 'General Practice',
          clinic: 'Medical Center',
          date: this.formatDate(review.reviewDate),
          id: review.reviewId
        };

        try {
          // 1. Try to get details from Appointment
          const appt = await firstValueFrom(this.appointmentService.getAppointmentById(review.appointmentId)).catch(() => null);
          if (appt) {
            enriched.provider = appt.providerName || enriched.provider;
            enriched.specialization = appt.specialization || appt.serviceType || enriched.specialization;
            enriched.clinic = appt.modeOfConsultation || enriched.clinic;
          }

          // 2. Resolve Provider Name if it's a placeholder
          if (enriched.provider.startsWith('Provider #') || enriched.provider.startsWith('User #') || enriched.provider === 'Healthcare Provider') {
            const provider = await firstValueFrom(this.providerService.getProviderById(review.providerId)).catch(() => null);
            if (provider) {
              enriched.provider = provider.fullName || provider.FullName || enriched.provider;
              enriched.specialization = provider.specialization || provider.Specialization || enriched.specialization;
              
              if (enriched.provider.startsWith('Provider #') || enriched.provider.startsWith('User #')) {
                const userData = await firstValueFrom(this.userService.getUserById(provider.userId)).catch(() => null);
                if (userData) {
                  enriched.provider = userData.fullName;
                }
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to enrich review ${review.reviewId}:`, err);
        }

        enrichedReviews.push(enriched);
      }

      this.reviews = enrichedReviews;
    } catch (error) {
      console.error('Error loading reviews:', error);
      this.reviews = [];
    } finally {
      this.loading = false;
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }

  goBack(): void {
    this.router.navigate(['/patient/dashboard']);
  }

  editReview(review: any): void {
    const newComment = prompt('Edit your review comment:', review.comment);
    if (newComment === null) return;
    
    const newRatingStr = prompt('Edit your rating (1-5):', review.rating.toString());
    if (newRatingStr === null) return;
    
    const newRating = parseInt(newRatingStr, 10);
    if (isNaN(newRating) || newRating < 1 || newRating > 5) {
      alert('Please enter a valid rating between 1 and 5');
      return;
    }
    
    const updateData = {
      rating: newRating,
      comment: newComment,
      isAnonymous: review.isAnonymous
    };
    
    this.reviewService.updateReview(review.id, updateData).subscribe({
      next: () => {
        review.comment = newComment;
        review.rating = newRating;
        alert('Review updated successfully!');
      },
      error: (error) => {
        console.error('Error updating review:', error);
        alert('Failed to update review.');
      }
    });
  }

  deleteReview(review: any): void {
    if (confirm('Are you sure you want to delete this review?')) {
      this.reviewService.deleteReview(review.id).subscribe({
        next: () => {
          this.reviews = this.reviews.filter(r => r.id !== review.id);
          alert('Review deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          alert('Failed to delete review.');
        }
      });
    }
  }
}
