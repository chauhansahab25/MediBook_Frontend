import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-view-medical-record-dialog',
  templateUrl: './view-medical-record-dialog.component.html',
  styleUrls: ['./view-medical-record-dialog.component.css']
})
export class ViewMedicalRecordDialogComponent {
  record: any;

  constructor(
    private dialogRef: MatDialogRef<ViewMedicalRecordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.record = data.record;
  }

  onClose(): void {
    this.dialogRef.close();
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getPatientName(): string {
    return this.record.patientName || `Patient #${this.record.patientId}`;
  }

  getProviderName(): string {
    return this.record.providerName || `Provider #${this.record.providerId}`;
  }
}
