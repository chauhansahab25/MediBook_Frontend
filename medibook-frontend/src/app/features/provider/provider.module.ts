import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { SharedModule } from '../../shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';


import { ProviderDashboardComponent } from './dashboard/provider-dashboard.component';
import { ProviderScheduleComponent } from './schedule/provider-schedule.component';
import { ProviderProfileComponent } from './profile/provider-profile.component';
import { ProviderAppointmentsComponent } from './appointments/provider-appointments.component';
import { ProviderReviewsComponent } from './reviews/provider-reviews.component';
import { EarningsComponent } from './earnings/earnings.component';
import { AddSlotComponent } from './schedule/add-slot/add-slot.component';
import { RecurringSlotsComponent } from './schedule/recurring-slots/recurring-slots.component';
import { CalendarComponent } from './schedule/calendar/calendar.component';
import { EditSlotComponent } from './schedule/edit-slot/edit-slot.component';
import { BookingDetailsComponent } from './schedule/booking-details/booking-details.component';

@NgModule({
  declarations: [
    ProviderDashboardComponent,
    ProviderScheduleComponent,
    ProviderProfileComponent,
    ProviderAppointmentsComponent,
    ProviderReviewsComponent,
    EarningsComponent,
    AddSlotComponent,
    RecurringSlotsComponent,
    CalendarComponent,
    EditSlotComponent,
    BookingDetailsComponent
  ],
  imports: [
    CommonModule,
    SharedModule,

    RouterModule.forChild([
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: ProviderDashboardComponent },
      { path: 'schedule', component: ProviderScheduleComponent },
      { path: 'appointments', component: ProviderAppointmentsComponent },
      { path: 'reviews', component: ProviderReviewsComponent },
      { path: 'earnings', component: EarningsComponent },
      { path: 'add-slot', component: AddSlotComponent },
      { path: 'recurring-slots', component: RecurringSlotsComponent },
      { path: 'calendar', component: CalendarComponent },
      { path: 'edit-slot/:id', component: EditSlotComponent },
      { path: 'booking-details/:id', component: BookingDetailsComponent },
      { path: 'profile', component: ProviderProfileComponent }
    ]),
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    FormsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule
  ]
})
export class ProviderModule { }
