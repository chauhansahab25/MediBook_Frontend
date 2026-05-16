import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ScheduleService } from '../../../../core/services/schedule.service';

@Component({
  selector: 'app-edit-slot',
  templateUrl: './edit-slot.component.html',
  styleUrls: ['./edit-slot.component.css']
})
export class EditSlotComponent implements OnInit {
  slotId: number | null = null;
  slot = {
    date: '',
    startTime: '09:00',
    endTime: '09:30'
  };
  loading = false;
  error = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private scheduleService: ScheduleService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.slotId = parseInt(id, 10);
      this.loadSlotDetails();
    }
  }

  loadSlotDetails(): void {
    this.loading = true;
    this.error = '';

    // Note: The ScheduleService doesn't have a getSlotById method yet.
    // This would need to be added to the backend API.
    // For now, we'll show empty form with just the slotId.
    this.loading = false;
  }

  onSubmit(): void {
    this.loading = true;
    this.error = '';

    // Note: The ScheduleService doesn't have an updateSlot method yet.
    // This would need to be added to the backend API.
    alert('Updating slot...\n\nNote: The update slot API endpoint needs to be implemented on the backend.\n\nSlot Details:\nDate: ' + this.slot.date + '\nTime: ' + this.slot.startTime + ' - ' + this.slot.endTime);
    this.loading = false;
    this.router.navigate(['/provider/schedule']);
  }

  goBack(): void {
    this.router.navigate(['/provider/schedule']);
  }

  deleteSlot(): void {
    if (confirm('Are you sure you want to delete this slot?')) {
      if (this.slotId) {
        this.scheduleService.cancelSlot(this.slotId).subscribe({
          next: () => {
            alert('Slot deleted successfully!');
            this.router.navigate(['/provider/schedule']);
          },
          error: (err) => {
            alert('Failed to delete slot: ' + (err.message || 'Unknown error'));
          }
        });
      }
    }
  }
}
