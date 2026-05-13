import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';


import { PatientDashboardComponent } from './dashboard/patient-dashboard.component';
import { SearchProvidersComponent } from './search-providers/search-providers.component';
import { PatientAppointmentsComponent } from './appointments/patient-appointments.component';
import { ProviderProfileComponent } from './provider-profile/provider-profile.component';
import { BookAppointmentComponent } from './book-appointment/book-appointment.component';

import { MedicalRecordsComponent } from './medical-records/medical-records.component';
import { ReviewsComponent } from './reviews/reviews.component';
import { PaymentComponent } from './payment/payment.component';
import { TransactionHistoryComponent } from './transaction-history/transaction-history.component';
import { SharedModule } from '../../shared/shared.module';



@NgModule({
  declarations: [
    PatientDashboardComponent,
    SearchProvidersComponent,
    PatientAppointmentsComponent,
    ProviderProfileComponent,
    BookAppointmentComponent,
    MedicalRecordsComponent,
    ReviewsComponent,
    PaymentComponent,
    TransactionHistoryComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,

    RouterModule.forChild([
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: PatientDashboardComponent },
      { path: 'search-providers', component: SearchProvidersComponent },
      { path: 'appointments', component: PatientAppointmentsComponent },
      { path: 'medical-records', component: MedicalRecordsComponent },
      { path: 'reviews', component: ReviewsComponent },
      { path: 'transaction-history', component: TransactionHistoryComponent },
      { path: 'provider-profile/:id', component: ProviderProfileComponent },
      { path: 'book-appointment/:id', component: BookAppointmentComponent },
      { path: 'payment/:id', component: PaymentComponent }
    ]),
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatIconModule,
    MatSnackBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatDialogModule,
    MatTabsModule
  ]
})
export class PatientModule { }
