import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProviderService } from '../../../core/services/provider.service';
import { ReviewService } from '../../../core/services/review.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-search-providers',
  templateUrl: './search-providers.component.html',
  styleUrls: ['./search-providers.component.css']
})
export class SearchProvidersComponent implements OnInit {
  providers: any[] = [];
  filteredProviders: any[] = [];
  loading = false;
  error: string | null = null;
  searchTerm = '';
  selectedFilter = 'all';

  private allProviders: any[] = [];

  constructor(
    private router: Router,
    private providerService: ProviderService,
    private userService: UserService,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    this.loadProviders();
  }

  loadProviders(): void {
    this.loading = true;
    this.error = null;

    this.providerService.getProviders().subscribe({
      next: async (providers: any[]) => {
        // First, map the providers we have
        const initialProviders = (providers || []).map((p: any) => ({
          ...p,
          fullName: p.fullName || p.FullName || `User #${p.userId || p.providerId}`,
          email: p.email || p.Email || 'N/A'
        }));

        // Identify providers that still have placeholder names or missing ratings
        const providersWithMissingNames = initialProviders.filter(p => 
          p.fullName.startsWith('User #') || p.fullName.startsWith('Provider #') || !p.fullName || p.fullName === 'N/A'
        );

        console.log(`Enriching ${initialProviders.length} providers with real-time ratings and resolving ${providersWithMissingNames.length} names...`);
        
        try {
          // Fetch missing user details and real-time ratings in parallel
          const userPromises = providersWithMissingNames.map(p => 
            firstValueFrom(this.userService.getUserById(p.userId)).catch(() => null)
          );
          
          const ratingPromises = initialProviders.map(p => 
            firstValueFrom(this.reviewService.getAverageRating(p.providerId)).catch(() => ({ averageRating: 0 }))
          );
          
          const [resolvedUsers, resolvedRatings] = await Promise.all([
            Promise.all(userPromises),
            Promise.all(ratingPromises)
          ]) as [any[], any[]];
          
          // Map all resolved data back to our providers
          this.allProviders = initialProviders.map((p, index) => {
            const resolvedUser = resolvedUsers.find(u => u && u.userId === p.userId);
            const resolvedRating = resolvedRatings[index];
            
            return {
              ...p,
              fullName: resolvedUser?.fullName || p.fullName,
              email: resolvedUser?.email || p.email,
              avgRating: resolvedRating?.averageRating || p.avgRating || 0
            };
          });
        } catch (err) {
          console.warn('Failed to resolve some provider details:', err);
          this.allProviders = initialProviders;
        }

        // Filter out unverified providers for patients
        this.allProviders = this.allProviders.filter(p => p.isVerified || p.IsVerified);
        
        this.providers = [...this.allProviders];
        this.filteredProviders = [...this.allProviders];
        this.loading = false;
        this.search(); 
      },
      error: (error) => {
        console.error('Error loading providers:', error);
        this.error = 'Failed to load providers. Please try again later.';
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
    
    // Real-time filter processing
    this.filteredProviders = this.allProviders.filter(provider => {
      const name = provider.fullName || provider.clinicName || '';
      const specialty = provider.specialization || '';
      const clinic = provider.clinicName || '';

      const matchesSearch = term === '' || 
        name.toLowerCase().includes(term) || 
        specialty.toLowerCase().includes(term) ||
        clinic.toLowerCase().includes(term);
      
      let matchesFilter = false;
      if (this.selectedFilter === 'all') {
        matchesFilter = true;
      } else {
        const lowerSpec = specialty.toLowerCase();
        const lowerFilter = this.selectedFilter.toLowerCase();
        
        // Map common specialties to their roots to match both -logy and -logist
        const specialtyRoots: { [key: string]: string[] } = {
          'cardiology': ['cardiolog'],
          'dermatology': ['dermatolog'],
          'general': ['general', 'physician'],
          'pediatrics': ['pediatric', 'paediatric'],
          'gynecology': ['gynecolog', 'gynaecolog', 'obgyn']
        };

        const rootsToMatch = specialtyRoots[lowerFilter] || [lowerFilter];
        matchesFilter = rootsToMatch.some(root => lowerSpec.includes(root));
      }
      
      return matchesSearch && matchesFilter;
    });
    
    this.providers = this.filteredProviders;
    this.loading = false;
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
