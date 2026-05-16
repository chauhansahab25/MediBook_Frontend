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
    vaccinationDate: null,
    labResults: '',
    allergyInfo: '',
    surgeryDetails: '',
    documentUrl: ''
  };
  selectedFile: File | null = null;
  submitting = false;
  error = '';

  constructor(
    public dialogRef: MatDialogRef<AddMedicalRecordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private medicalRecordService: MedicalRecordService
  ) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      // In a real app, you'd upload this to a storage service and get a URL
      // For now, we'll store the filename or a mock URL
      this.recordData.documentUrl = `uploads/${file.name}`;
      console.log('File selected:', file.name);
    }
  }

  onSubmit(): void {
    if (this.recordData.recordType !== 'Lab Report' && this.recordData.recordType !== 'Vaccination' && !this.recordData.diagnosis) {
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
      vaccinationDate: this.recordData.vaccinationDate ? this.recordData.vaccinationDate : null,
      labResults: this.recordData.labResults ? this.recordData.labResults : null,
      allergyInfo: this.recordData.allergyInfo ? this.recordData.allergyInfo : null,
      surgeryDetails: this.recordData.surgeryDetails ? this.recordData.surgeryDetails : null,
      documentUrl: this.recordData.documentUrl || null
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
