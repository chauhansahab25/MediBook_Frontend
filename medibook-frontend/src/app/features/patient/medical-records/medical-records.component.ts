import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProviderService } from '../../../core/services/provider.service';
import { UserService } from '../../../core/services/user.service';
import { forkJoin, of, firstValueFrom } from 'rxjs';

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
    private providerService: ProviderService,
    private userService: UserService
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
          next: async (providers) => {
            const enrichedRecords = [];
            
            for (let i = 0; i < data.length; i++) {
              const record = data[i];
              const provider = providers[i];
              let name = provider?.fullName || provider?.FullName;

              // If name is still placeholder/missing, try fetching from UserService
              if (!name || name.startsWith('Provider #') || name === 'N/A') {
                const uId = provider?.userId || record.providerId;
                if (uId) {
                  try {
                    const user = await firstValueFrom(this.userService.getUserById(uId)).catch(() => null);
                    if (user) {
                      name = user.fullName || user.FullName;
                    }
                  } catch (e) {
                    console.warn(`Could not resolve user for provider ${uId}`);
                  }
                }
              }

              enrichedRecords.push({
                ...record,
                providerName: name ? `Dr. ${name}` : `Dr. Provider #${record.providerId}`
              });
            }
            
            this.records = enrichedRecords;
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

  getConsultationRecords(): any[] {
    return this.records.filter(r => r.recordType === 'Consultation');
  }

  getLabRecords(): any[] {
    return this.records.filter(r => r.recordType === 'Lab Report');
  }

  getVaccinationRecords(): any[] {
    return this.records.filter(r => r.recordType === 'Vaccination');
  }

  getSurgeryRecords(): any[] {
    return this.records.filter(r => r.recordType === 'Surgery');
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
    
    // If a specific document is uploaded, download/view that instead
    if (record.documentUrl) {
      // In a real app, this would be a full URL. For now, we open/download it.
      const fileUrl = record.documentUrl.startsWith('http') ? record.documentUrl : `${this.medicalRecordService['apiUrl']}/${record.documentUrl}`;
      window.open(fileUrl, '_blank');
      return;
    }

    // Fallback: Download a summary text file
    this.medicalRecordService.downloadRecord(record.recordId || record.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date(record.createdAt || record.date).toLocaleDateString().replace(/\//g, '-');
        a.download = `Medical_Record_${(record.diagnosis || record.recordType).replace(/\s+/g, '_')}_${dateStr}.txt`;
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
