import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProviderService } from '../../../core/services/provider.service';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-medical-records',
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.css']
})
export class MedicalRecordsComponent implements OnInit {
  records: any[] = [];
  loading = false;

  constructor(
    private router: Router,
    private medicalRecordService: MedicalRecordService,
    private authService: AuthService,
    private providerService: ProviderService
  ) {}

  ngOnInit(): void {
    this.loadMedicalRecords();
  }

  loadMedicalRecords(): void {
    const user = this.authService.currentUserValue;
    const patientId = user?.userId;

    if (!patientId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loading = true;

    this.medicalRecordService.getMedicalRecordsByPatient(patientId).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          this.records = [];
          this.loading = false;
          return;
        }

        const providerRequests = data.map(record => {
          if (!record.providerId) return of(null);
          return this.providerService.getProviderById(record.providerId);
        });

        forkJoin(providerRequests).subscribe({
          next: (providers) => {
            this.records = data.map((record, index) => {
              const provider = providers[index];
              return {
                ...record,
                providerName: provider?.fullName ? `Dr. ${provider.fullName}` : `Provider ID: ${record.providerId}`
              };
            });
            this.loading = false;
          },
          error: (err) => {
            console.error('Error fetching provider details:', err);
            // Fallback to IDs if provider fetch fails
            this.records = data.map(record => ({
              ...record,
              providerName: `Provider ID: ${record.providerId}`
            }));
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading medical records:', error);
        this.records = [];
        this.loading = false;
      }
    });
  }

  getFilteredRecords(type: string): any[] {
    if (type === 'all') return this.records;
    return this.records.filter(r => r.recordType === type);
  }

  getPrescriptionRecords(): any[] {
    return this.records.filter(r => r.recordType === 'Prescription');
  }

  getLabRecords(): any[] {
    return this.records.filter(r => r.recordType === 'Lab Report');
  }

  getConsultationRecords(): any[] {
    return this.records.filter(r => r.recordType === 'Consultation');
  }

  getOtherRecords(): any[] {
    const types = ['Prescription', 'Lab Report', 'Consultation'];
    return this.records.filter(r => !types.includes(r.recordType));
  }

  resetData(): void {
    this.loadMedicalRecords();
    alert('Data refreshed from database!');
  }

  getRecordIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'prescription':
        return 'medication';
      case 'lab report':
        return 'science';
      case 'diagnosis':
        return 'assignment';
      default:
        return 'folder';
    }
  }

  downloadRecord(record: any): void {
    console.log('Downloading record:', record);
    this.medicalRecordService.downloadRecord(record.recordId || record.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Medical_Record_${record.diagnosis.replace(/\s+/g, '_')}_${new Date(record.createdAt).toLocaleDateString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        alert('Failed to download record. Please try again later.');
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/patient/dashboard']);
  }
}
