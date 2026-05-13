import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProviderService } from '../../../core/services/provider.service';

@Component({
  selector: 'app-provider-profile',
  templateUrl: './provider-profile.component.html',
  styleUrls: ['./provider-profile.component.css']
})
export class ProviderProfileComponent implements OnInit {
  provider: any;
  providerId: string | null = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private providerService: ProviderService
  ) {}

  ngOnInit(): void {
    this.providerId = this.route.snapshot.paramMap.get('id');
    this.loadProviderProfile();
  }

  loadProviderProfile(): void {
    if (!this.providerId) return;

    this.loading = true;
    this.error = '';

    this.providerService.getProviderById(Number(this.providerId)).subscribe({
      next: (provider) => {
        this.provider = provider;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load provider profile: ' + (err.message || 'Unknown error');
        this.loading = false;
      }
    });
  }

  bookAppointment(): void {
    this.router.navigate(['/patient/book-appointment', this.providerId]);
  }

  goBack(): void {
    this.router.navigate(['/patient/search-providers']);
  }
}
