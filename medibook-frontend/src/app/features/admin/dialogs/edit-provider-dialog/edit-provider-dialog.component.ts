import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ProviderService } from '../../../../core/services/provider.service';

@Component({
  selector: 'app-edit-provider-dialog',
  templateUrl: './edit-provider-dialog.component.html',
  styleUrls: ['./edit-provider-dialog.component.css']
})
export class EditProviderDialogComponent {
  provider: any;
  loading = false;
  error: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<EditProviderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private providerService: ProviderService
  ) {
    this.provider = { ...data.provider };
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.loading = true;
    this.error = null;

    const updateData = {
      specialization: this.provider.specialization,
      qualification: this.provider.qualification,
      experienceYears: this.provider.experienceYears,
      bio: this.provider.bio,
      clinicName: this.provider.clinicName,
      clinicAddress: this.provider.clinicAddress
    };

    this.providerService.updateProvider(this.provider.providerId, updateData).subscribe({
      next: (updatedProvider) => {
        this.loading = false;
        this.dialogRef.close({ success: true, provider: updatedProvider });
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.message || 'Failed to update provider. Please try again.';
        console.error('Update provider error:', err);
      }
    });
  }
}
