# MediBook - Online Appointment Booking System

A comprehensive Angular web application for managing healthcare appointments with three user roles: Patient, Healthcare Provider, and Admin.

## Features

### Patient Features
- Search and browse verified healthcare providers
- Book appointments with providers
- View appointment history and status
- Access medical records
- Submit and manage reviews

### Healthcare Provider Features
- Manage profile and qualifications
- Set availability slots
- View and manage appointments
- Track patient reviews and ratings
- Admin verification required for activation

### Admin Features
- User management (ban/unban, delete)
- Provider verification and management
- View all appointments and payments
- Review moderation
- Access medical records
- Analytics and revenue reports
- Send notifications to users

## Technology Stack

- **Frontend**: Angular 17
- **UI Framework**: Angular Material
- **State Management**: RxJS
- **HTTP**: Angular HttpClient with interceptors
- **Authentication**: JWT tokens
- **Forms**: Reactive Forms

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Installation

1. Navigate to the project directory:
```bash
cd E:\MediBook_Frontend\medibook-frontend
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The API endpoints are configured in `src/environments/environment.ts`. Update the URLs to match your backend services:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api/v1',
  authUrl: 'http://localhost:5001/api/v1',
  providerUrl: 'http://localhost:5002/api/v1',
  appointmentUrl: 'http://localhost:5003/api/v1',
  scheduleUrl: 'http://localhost:5004/api/v1',
  reviewUrl: 'http://localhost:5005/api/v1',
  medicalRecordUrl: 'http://localhost:5006/api/v1',
  paymentUrl: 'http://localhost:5007/api/v1',
  notificationUrl: 'http://localhost:5008/api/v1'
};
```

## Running the Application

1. Start the development server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:4200
```

## Building for Production

1. Build the application:
```bash
npm run build
```

2. The built files will be in the `dist/medibook-frontend` directory.

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/           # Route guards for authentication
│   │   ├── interceptors/     # HTTP interceptors for JWT
│   │   ├── models/           # Data models and interfaces
│   │   └── services/         # Core services (auth, etc.)
│   ├── features/
│   │   ├── admin/            # Admin dashboard and management
│   │   ├── auth/             # Login and registration
│   │   ├── landing/          # Landing page
│   │   ├── patient/          # Patient features
│   │   └── provider/         # Provider features
│   ├── shared/               # Shared components
│   ├── app.component.ts      # Root component
│   ├── app.module.ts         # Root module
│   └── app-routing.module.ts # Root routing
├── assets/                   # Static assets
└── environments/             # Environment configurations
```

## User Roles

### Patient
- Can register/login
- Search for providers
- Book appointments
- View medical records
- Submit reviews

### Healthcare Provider
- Can register/login (requires admin verification)
- Manage profile and schedule
- View appointments
- Manage availability slots

### Admin
- Full platform control
- Verify providers
- Manage users and content
- View analytics and reports

## Backend Services

This frontend connects to the following microservices:

- **AuthService** (Port 5001): Authentication and user management
- **ProviderService** (Port 5002): Provider profiles and verification
- **AppointmentService** (Port 5003): Appointment booking and management
- **ScheduleService** (Port 5004): Availability slot management
- **ReviewService** (Port 5005): Reviews and ratings
- **MedicalRecordService** (Port 5006): Medical records
- **PaymentService** (Port 5007): Payment processing
- **NotificationService** (Port 5008): Notifications

## Authentication

The application uses JWT-based authentication:
- Tokens are stored in localStorage
- HTTP interceptor adds Authorization header automatically
- Guards protect routes based on user roles

## Development Notes

- TypeScript strict mode is enabled
- All components use Angular Material for UI
- Responsive design for mobile and desktop
- Error handling with MatSnackBar notifications

## License

This project is part of the MediBook Online Appointment Booking System.
