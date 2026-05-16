import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';


@Component({
  selector: 'app-appointment-details-dialog',
  templateUrl: './appointment-details-dialog.component.html',
  styleUrls: ['./appointment-details-dialog.component.css']
})
export class AppointmentDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AppointmentDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  downloadPDF(): void {
    const data = document.getElementById('appointment-dialog-content');
    const container = document.querySelector('.dialog-container') as HTMLElement;
    const content = document.querySelector('.dialog-content') as HTMLElement;

    if (data && container && content) {
      // Temporarily expand the content to its full height for a complete capture
      const originalMaxHeight = container.style.maxHeight;
      const originalOverflow = content.style.overflow;
      const originalHeight = content.style.height;

      // Hide actions buttons for the PDF
      const actions = data.querySelector('.dialog-actions') as HTMLElement;
      const closeBtn = data.querySelector('.close-btn') as HTMLElement;
      if (actions) actions.style.display = 'none';
      if (closeBtn) closeBtn.style.display = 'none';

      container.style.maxHeight = 'none';
      content.style.overflow = 'visible';
      content.style.height = 'auto';

      html2canvas(data, {
        scale: 3, // High resolution for crystal clear text
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Fix for Material Icons rendering as text ligatures in canvas
          const icons = clonedDoc.querySelectorAll('mat-icon');
          icons.forEach((icon: any) => {
            icon.style.fontFamily = "'Material Icons'";
            icon.style.fontVariantLigatures = 'none';
            icon.style.textRendering = 'optimizeLegibility';
          });
          
          // Fix for complex gradients that might render as black
          const header = clonedDoc.querySelector('.dialog-header') as HTMLElement;
          if (header) {
            header.style.background = 'linear-gradient(to right, #00838f, #00acc1)';
            header.style.color = '#ffffff';
          }
        }
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`MediBook_Appointment_${this.data.appointmentId}.pdf`);

        // Restore original UI state
        if (actions) actions.style.display = 'flex';
        if (closeBtn) closeBtn.style.display = 'flex';
        container.style.maxHeight = originalMaxHeight;
        content.style.overflow = originalOverflow;
        content.style.height = originalHeight;
      }).catch(err => {
        console.error('Error generating PDF:', err);
        // Ensure UI is restored even on error
        if (actions) actions.style.display = 'flex';
        if (closeBtn) closeBtn.style.display = 'flex';
        container.style.maxHeight = originalMaxHeight;
        content.style.overflow = originalOverflow;
        content.style.height = originalHeight;
      });
    }
  }

  downloadText(): void {
    const text = `
MEDIBOOK APPOINTMENT SUMMARY
---------------------------
Appointment ID: #${this.data.appointmentId}
Status: ${this.data.status}

PATIENT INFORMATION
Name: ${this.data.patientName || 'Anonymous'}
ID: ${this.data.patientId}
Email: ${this.data.patientEmail || 'N/A'}

HEALTHCARE PROVIDER
Name: ${this.data.providerName}
Specialization: ${this.data.specialization}
Email: ${this.data.providerEmail}

APPOINTMENT DETAILS
Date: ${this.formatDate(this.data.appointmentDate)}
Time: ${this.formatTime(this.data.startTime)} - ${this.formatTime(this.data.endTime)}
Consultation: ${this.data.modeOfConsultation}
Service: ${this.data.serviceType}

NOTES
${this.data.notes || 'No additional notes provided.'}
---------------------------
Generated on: ${new Date().toLocaleString()}
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediBook_Appointment_${this.data.appointmentId}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }



  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getStatusIcon(status: string): string {
    if (!status) return 'help';
    switch (status.toLowerCase()) {
      case 'scheduled': return 'event';
      case 'completed': return 'check_circle';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  }
}
