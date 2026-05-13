import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProviderService } from '../../../core/services/provider.service';

@Component({
  selector: 'app-search-providers',
  templateUrl: './search-providers.component.html',
  styleUrls: ['./search-providers.component.css']
})
export class SearchProvidersComponent implements OnInit {
  providers: any[] = [];
  filteredProviders: any[] = [];
  loading = false;
  searchTerm = '';
  selectedFilter = 'all';

  private allProviders: any[] = [];

  constructor(
    private router: Router,
    private providerService: ProviderService
  ) {}

  ngOnInit(): void {
    this.loadProviders();
  }

  loadProviders(): void {
    this.loading = true;

    this.providerService.getProviders().subscribe({
      next: (data) => {
        this.allProviders = data;
        this.providers = [...this.allProviders];
        this.filteredProviders = [...this.allProviders];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading providers:', error);
        this.allProviders = [];
        this.providers = [];
        this.filteredProviders = [];
        this.loading = false;
      }
    });
  }

  setFilter(filter: string): void {
    this.selectedFilter = filter;
    
    // If 'all' is selected, we might want to refresh from the server to get "real-time" data
    if (filter === 'all') {
      this.loadProviders();
    } else {
      this.search();
    }
  }

  search(): void {
    this.loading = true;
    const term = this.searchTerm.toLowerCase().trim();
    
    // Simulate real-time filter processing
    setTimeout(() => {
      this.filteredProviders = this.allProviders.filter(provider => {
        const name = provider.fullName || provider.clinicName || '';
        const specialty = provider.specialization || '';
        const clinic = provider.clinicName || '';

        const matchesSearch = term === '' || 
          name.toLowerCase().includes(term) || 
          specialty.toLowerCase().includes(term) ||
          clinic.toLowerCase().includes(term);
        
        const matchesFilter = this.selectedFilter === 'all' || 
          specialty.toLowerCase().includes(this.selectedFilter.toLowerCase());
        
        // Exclude Dr. Smith from search results
        const isDrSmith = name.toLowerCase().includes('dr. smith') || 
                           name.toLowerCase().includes('smith') ||
                           specialty.toLowerCase().includes('cardiology');
        
        return matchesSearch && matchesFilter && !isDrSmith;
      });
      
      this.providers = this.filteredProviders;
      this.loading = false;
    }, 300);
  }

  viewProfile(provider: any): void {
    // Navigate to provider profile page
    this.router.navigate(['/patient/provider-profile', provider.providerId]);
  }

  bookAppointment(provider: any): void {
    // Navigate to appointment booking page
    this.router.navigate(['/patient/book-appointment', provider.providerId]);
  }

  goBack(): void {
    this.router.navigate(['/patient/dashboard']);
  }
}
