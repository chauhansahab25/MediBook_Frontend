import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';

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
    private appointmentService: AppointmentService
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    const user = this.authService.currentUserValue;
    if (!user || !user.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loading = true;

    this.reviewService.getReviewsByPatient(user.userId).pipe(
      switchMap(reviews => {
        if (reviews.length === 0) return of([]);

        // For each review, fetch the appointment to get provider details
        const detailRequests = reviews.map(review => 
          this.appointmentService.getAppointmentById(review.appointmentId).pipe(
            map(appt => ({
              ...review,
              provider: appt.providerName,
              specialization: appt.specialization || 'Healthcare Provider',
              clinic: appt.modeOfConsultation || 'General Consultation',
              date: this.formatDate(review.reviewDate),
              id: review.reviewId // Map reviewId to id for compatibility
            })),
            catchError(() => of({
              ...review,
              provider: 'Unknown Provider',
              specialization: 'Healthcare',
              clinic: 'N/A',
              date: this.formatDate(review.reviewDate),
              id: review.reviewId
            }))
          )
        );

        return forkJoin(detailRequests);
      })
    ).subscribe({
      next: (enrichedReviews) => {
        this.reviews = enrichedReviews;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.reviews = [];
        this.loading = false;
      }
    });
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
