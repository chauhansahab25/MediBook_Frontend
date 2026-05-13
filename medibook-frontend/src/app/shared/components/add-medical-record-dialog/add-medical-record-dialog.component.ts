import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MedicalRecordService } from '../../../core/services/medical-record.service';

@Component({
  selector: 'app-add-medical-record-dialog',
  templateUrl: './add-medical-record-dialog.component.html',
  styleUrls: ['./add-medical-record-dialog.component.css']
})
export class AddMedicalRecordDialogComponent {
  recordData = {
    diagnosis: '',
    prescription: '',
    notes: '',
    recordType: 'Consultation',
    followUpDate: null,
    labResults: '',
    allergyInfo: '',
    surgeryDetails: ''
  };
  submitting = false;
  error = '';

  constructor(
    public dialogRef: MatDialogRef<AddMedicalRecordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private medicalRecordService: MedicalRecordService
  ) {}

  onSubmit(): void {
    if (!this.recordData.diagnosis) {
      this.error = 'Diagnosis is required.';
      return;
    }

    this.submitting = true;
    this.error = '';

    const payload = {
      appointmentId: this.data.appointmentId || this.data.id,
      patientId: this.data.patientId,
      providerId: this.data.providerId,
      diagnosis: this.recordData.diagnosis,
      prescription: this.recordData.prescription ? this.recordData.prescription : null,
      notes: this.recordData.notes ? this.recordData.notes : null,
      recordType: this.recordData.recordType,
      followUpDate: this.recordData.followUpDate ? this.recordData.followUpDate : null,
      // Include conditional fields based on record type
      labResults: this.recordData.labResults ? this.recordData.labResults : null,
      allergyInfo: this.recordData.allergyInfo ? this.recordData.allergyInfo : null,
      surgeryDetails: this.recordData.surgeryDetails ? this.recordData.surgeryDetails : null
    };

    this.medicalRecordService.createRecord(payload).subscribe({
      next: (response) => {
        this.submitting = false;
        this.dialogRef.close(response);
      },
      error: (err) => {
        this.submitting = false;
        console.error('Full Error:', err.error);
        const detailedError = err.error?.inner ? `${err.error.message} - ${err.error.inner}` : err.error?.message;
        this.error = detailedError || 'Failed to create medical record. See console.';
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
