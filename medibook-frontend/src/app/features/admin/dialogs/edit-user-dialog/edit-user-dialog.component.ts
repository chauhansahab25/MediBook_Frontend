import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-edit-user-dialog',
  templateUrl: './edit-user-dialog.component.html',
  styleUrls: ['./edit-user-dialog.component.css']
})
export class EditUserDialogComponent {
  user: any;
  loading = false;
  error: string | null = null;

  roles = ['Patient', 'Provider', 'Admin'];

  constructor(
    private dialogRef: MatDialogRef<EditUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private userService: UserService
  ) {
    // Clone the user data to avoid modifying the original
    this.user = { ...data.user };
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.loading = true;
    this.error = null;

    const updateData = {
      fullName: this.user.fullName,
      email: this.user.email,
      phone: this.user.phone,
      role: this.user.role,
      isActive: this.user.isActive
    };

    this.userService.updateUser(this.user.userId, updateData).subscribe({
      next: (updatedUser) => {
        this.loading = false;
        this.dialogRef.close({ success: true, user: updatedUser });
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.message || 'Failed to update user. Please try again.';
        console.error('Update user error:', err);
      }
    });
  }
}
