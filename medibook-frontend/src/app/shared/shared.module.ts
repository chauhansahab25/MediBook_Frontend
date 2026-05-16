import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AppointmentDetailsDialogComponent } from './components/appointment-details-dialog/appointment-details-dialog.component';
import { AppointmentReviewDialogComponent } from './components/appointment-review-dialog/appointment-review-dialog.component';
import { AddMedicalRecordDialogComponent } from './components/add-medical-record-dialog/add-medical-record-dialog.component';
import { RefundDialogComponent } from './components/refund-dialog/refund-dialog.component';

@NgModule({
  declarations: [
    AppointmentDetailsDialogComponent,
    AppointmentReviewDialogComponent,
    AddMedicalRecordDialogComponent,
    RefundDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  exports: [
    AppointmentDetailsDialogComponent,
    AppointmentReviewDialogComponent,
    AddMedicalRecordDialogComponent,
    RefundDialogComponent,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ]
})
export class SharedModule { }
