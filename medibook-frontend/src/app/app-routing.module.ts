import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { PatientGuard } from './core/guards/patient.guard';
import { ProviderGuard } from './core/guards/provider.guard';
import { AdminGuard } from './core/guards/admin.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/landing/landing.module')
      .then(m => m.LandingModule)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module')
      .then(m => m.AuthModule)
  },
  {
    path: 'patient',
    canActivate: [AuthGuard, PatientGuard],
    loadChildren: () => import('./features/patient/patient.module')
      .then(m => m.PatientModule)
  },
  {
    path: 'provider',
    canActivate: [AuthGuard, ProviderGuard],
    loadChildren: () => import('./features/provider/provider.module')
      .then(m => m.ProviderModule)
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, AdminGuard],
    loadChildren: () => import('./features/admin/admin.module')
      .then(m => m.AdminModule)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
