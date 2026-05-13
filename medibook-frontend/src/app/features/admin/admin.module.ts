import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { AdminDashboardComponent } from './dashboard/admin-dashboard.component';
import { AdminPageComponent } from './admin-page/admin-page.component';
import { EditUserDialogComponent } from './dialogs/edit-user-dialog/edit-user-dialog.component';
import { EditProviderDialogComponent } from './dialogs/edit-provider-dialog/edit-provider-dialog.component';
import { ViewMedicalRecordDialogComponent } from './dialogs/view-medical-record-dialog/view-medical-record-dialog.component';
import { UserManagementCardComponent } from './dashboard/user-management-card/user-management-card.component';
import { AppointmentDetailComponent } from './appointment-detail/appointment-detail.component';

@NgModule({
  declarations: [AdminDashboardComponent, AdminPageComponent, EditUserDialogComponent, EditProviderDialogComponent, ViewMedicalRecordDialogComponent, UserManagementCardComponent, AppointmentDetailComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: AdminPageComponent, data: { title: 'Manage Users', icon: 'people', description: 'View and manage all user accounts on the platform' } },
      { path: 'providers', component: AdminPageComponent, data: { title: 'Manage Providers', icon: 'medical_services', description: 'Verify and manage healthcare providers' } },
      { path: 'appointments', component: AdminPageComponent, data: { title: 'Appointments', icon: 'event', description: 'View all appointments across the platform' } },
      { path: 'appointments/:id', component: AppointmentDetailComponent },
      { path: 'payments', component: AdminPageComponent, data: { title: 'Payments', icon: 'payments', description: 'Monitor and manage transactions' } },
      { path: 'reviews', component: AdminPageComponent, data: { title: 'Reviews', icon: 'star', description: 'Moderate user reviews and ratings' } },
      { path: 'records', component: AdminPageComponent, data: { title: 'Medical Records', icon: 'folder_open', description: 'Access medical records for audit' } },
      { path: 'analytics', component: AdminPageComponent, data: { title: 'Analytics', icon: 'analytics', description: 'View platform analytics and reports' } },
      { path: 'revenue', component: AdminPageComponent, data: { title: 'Revenue Reports', icon: 'account_balance', description: 'Generate revenue and financial reports' } },
      { path: 'notifications', component: AdminPageComponent, data: { title: 'Notifications', icon: 'notifications', description: 'Send notifications to users' } }
    ]),
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminModule { }
