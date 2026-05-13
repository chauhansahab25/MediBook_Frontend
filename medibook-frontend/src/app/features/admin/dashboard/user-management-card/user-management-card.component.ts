import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-user-management-card',
  templateUrl: './user-management-card.component.html',
  styleUrls: ['./user-management-card.component.css']
})
export class UserManagementCardComponent {
  @Input() title: string = '';
  @Input() count: number = 0;
  @Input() icon: string = '';
  @Input() color: string = '';
  @Input() trend: number = 0;
  @Input() trendIcon: string = '';
  @Input() trendText: string = '';
}
