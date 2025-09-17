# Overview

This is a blood donor management system for Cruz Vermelha (Red Cross) in Angola. The application enables registration and management of blood donors, tracking their donation history, and generating reports. It features role-based access control with admin and user roles, provisional password management for new users, and comprehensive donor search and profile management capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent UI design
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL as the database
- **Authentication**: Session-based authentication using express-session
- **Password Security**: Bcrypt for password hashing
- **File Structure**: Monorepo structure with shared schema between client and server

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: PostgreSQL-backed session storage using connect-pg-simple
- **Development Storage**: In-memory storage implementation for development/testing
- **Schema Management**: Shared TypeScript schema definitions with Zod validation

## Authentication and Authorization
- **Session Management**: Server-side sessions with secure cookie storage
- **Role-Based Access**: Two-tier system with admin and user roles
- **Provisional Passwords**: System generates temporary passwords for new users via email
- **Password Reset**: Forced password change for first-time login users

## Key Features
- **Donor Management**: Registration, search, profile management with blood type tracking
- **Donation Tracking**: Recording and history of blood donations per donor
- **QR Code Integration**: BI (identity document) scanning for automated data entry
- **Email Integration**: Automated password delivery and welcome emails via Google Apps Script
- **Reports Dashboard**: Admin-only statistics and donor analytics
- **Leader Management**: Admin capability to create and manage user accounts

# External Dependencies

## Third-Party Services
- **Neon Database**: PostgreSQL hosting service (@neondatabase/serverless)
- **Google Apps Script**: Email service for sending provisional passwords and notifications
- **Radix UI**: Comprehensive UI component primitives for accessibility
- **Lucide Icons**: Icon library for consistent iconography

## Development Tools
- **Vite**: Build tool with React plugin and development server
- **Replit Integration**: Development environment plugins for cartographer and dev banner
- **ESBuild**: Production bundling for server-side code
- **TypeScript**: Type safety across the entire application

## Email System
- **Service**: External Google Apps Script endpoint
- **Functions**: Provisional password delivery, welcome emails, password recovery
- **Integration**: RESTful API calls to Google Apps Script with query parameters

## UI Component Library
- **Base**: Radix UI primitives for accessibility compliance
- **Styling**: Tailwind CSS with CSS variables for theming
- **Components**: Pre-built form controls, dialogs, alerts, and navigation elements