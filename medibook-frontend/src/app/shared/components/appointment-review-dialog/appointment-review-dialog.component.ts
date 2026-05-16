import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReviewService } from '../../../core/services/review.service';

@Component({
  selector: 'app-appointment-review-dialog',
  template: `
    <div class="review-dialog">
      <div class="dialog-header">
        <mat-icon>rate_review</mat-icon>
        <h2>Rate your Experience</h2>
      </div>
      
      <div class="dialog-content">
        <p>How was your appointment with <strong>{{ data.providerName }}</strong>?</p>
        
        <div class="rating-stars">
          <mat-icon *ngFor="let star of [1,2,3,4,5]" 
                    [class.active]="star <= rating"
                    (click)="setRating(star)">
            {{ star <= rating ? 'star' : 'star_outline' }}
          </mat-icon>
        </div>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Share your thoughts (optional)</mat-label>
          <textarea matInput [(ngModel)]="comment" rows="4" placeholder="How was the consultation?"></textarea>
        </mat-form-field>
        
        <mat-checkbox [(ngModel)]="isAnonymous">Submit anonymously</mat-checkbox>
      </div>
      
      <div class="dialog-actions">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-button class="submit-btn" 
                [disabled]="rating === 0 || loading"
                (click)="onSubmit()">
          <span *ngIf="!loading">Submit Review</span>
          <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .review-dialog { 
      padding: 0; 
      min-width: 450px; 
      background: white;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .dialog-header { 
      background: linear-gradient(135deg, #00acc1, #00838f); 
      color: white; 
      padding: 24px; 
      display: flex; 
      align-items: center; 
      gap: 12px;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }
    .dialog-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
    .dialog-content { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .rating-stars { display: flex; justify-content: center; gap: 8px; margin: 8px 0; }
    .rating-stars mat-icon { 
      font-size: 40px; 
      width: 40px; 
      height: 40px; 
      cursor: pointer; 
      color: #e0e0e0; 
      transition: all 0.2s;
    }
    .rating-stars mat-icon.active { color: #00acc1; transform: scale(1.1); }
    .full-width { width: 100%; }
    .submit-btn {
      background: linear-gradient(135deg, #00acc1, #00838f) !important;
      color: white !important;
      padding: 8px 24px !important;
      border-radius: 8px !important;
    }
    .submit-btn:disabled {
      background: #e0e0e0 !important;
      color: #9e9e9e !important;
    }
    .dialog-actions { padding: 16px 24px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #eee; }
  `]
})
export class AppointmentReviewDialogComponent {
  rating = 0;
  comment = '';
  isAnonymous = false;
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<AppointmentReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private reviewService: ReviewService
  ) {}

  setRating(star: number): void {
    this.rating = star;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.rating === 0) return;

    this.loading = true;
    const reviewData = {
      appointmentId: this.data.appointmentId,
      patientId: this.data.patientId,
      providerId: this.data.providerId,
      rating: this.rating,
      comment: this.comment,
      isAnonymous: this.isAnonymous
    };

    this.reviewService.createReview(reviewData).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Failed to submit review:', err);
        alert('Failed to submit review. You might have already reviewed this appointment.');
        this.dialogRef.close(false);
      }
    });
  }
}
