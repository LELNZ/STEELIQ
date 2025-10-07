# STEELIQ - Enterprise Steel Fabrication & Procurement Platform

## Overview
STEELIQ is an enterprise platform designed for Lateral Engineering Limited, managing the entire steel fabrication lifecycle from procurement to job execution. It integrates advanced optimization with comprehensive business management, aiming for Fortune 500 standards in efficiency and operational control. The platform streamlines material procurement, inventory management, project execution, financial tracking, and team resource allocation. Its core purpose is to optimize steel fabrication processes, reduce costs, improve accuracy, and ensure compliance across all operations.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
I prefer a formal and professional communication style.
I prefer to use TypeScript for type safety.
I prefer a component-based architecture.
I prefer RESTful API design.
I prefer database normalization.
I prefer comprehensive error handling.
I prefer job-linked data integrity.
I want all file uploads to have: type validation, MIME verification, size limits, and sanitized filenames.
I want OAuth/session tokens to be encrypted at rest.
I want audit events to be immutable (triggers prevent modification).
I want all sensitive operations logged to audit_events.
Before implementing any new feature, I want to ensure the following:
1. Proper relational structure is used (no JSONB abuse).
2. Foreign key relationships exist.
3. Audit trail is implemented.
4. Appropriate indexes for queries are added.
5. Security headers for file operations are implemented.
6. `role_permissions` are used for access control.

## System Architecture

### Core Business Domains
STEELIQ's architecture is segmented into several core business domains:
- **Procurement & Supply Chain Management**: Manages the full purchase order lifecycle, RFQ processes, supplier integration, and email distribution.
- **Material & Inventory Management**: Handles material libraries, real-time inventory tracking, mill certificates, 1D cutting optimization, and remnant management.
- **Job & Project Management**: Oversees job lifecycles, material takeoffs, a three-phase estimation engine, project tracking (Kanban/Timeline/List views), and document management.
- **Financial Management**: Facilitates quote generation, automated invoice processing, real-time job costing, budget monitoring, and RFQ-to-PO cost tracking.
- **Team & Resource Management**: Implements a granular Role-Based Access Control (RBAC) system, mobile-first time tracking, skill-based labor rates, and qualification tracking.
- **Email & Communication Systems**: Utilizes a three-tier architecture with Google Workspace for receiving, SendGrid for transactional emails, and automated email invoice processing.

### Technical Infrastructure
- **Technology Stack**:
    - Frontend: React 18, TypeScript, Tailwind CSS, Radix UI
    - Backend: Node.js, Express.js, RESTful APIs
    - Database: PostgreSQL (Neon), Drizzle ORM
    - Authentication: bcrypt, session-based
    - Build Tools: Vite, ESBuild
- **Database Schema**: 75+ tables with audit trails, soft deletes, optimized indexes, and complete procurement workflow tables.
- **UI/UX Decisions**: Fortune 500 standard, mobile-first, responsive design with a consistent component library. Uses blue/green status indicators and compact, information-dense layouts.

### System Design Choices
- **Procurement Workflow**: A detailed flow from requisition, multi-level approval, RFQ to suppliers, quote comparison, purchase order creation, goods receipt, and job cost update. Adheres to industry best practices (STRUMIS/PROCORE standards) with categorized workflows based on value.
- **Email Flow**: Separate flows for RFQs (creation, SendGrid, supplier response via portal, comparison) and Purchase Orders (creation, SendGrid, supplier acknowledgment via portal). Automated invoice processing via Gmail API, OCR, and cost import.
- **Supplier Portal**: An external-facing, token-based portal allowing suppliers to view RFQs/POs, submit quotes, acknowledge receipts, and update delivery statuses without requiring a login.
- **Security & Compliance**: Role-based permissions, session-based authentication, secure token generation, API rate limiting, encrypted sensitive data, secure file uploads, comprehensive audit trails, and adherence to AS/NZS, ISO, and GDPR-ready standards.
- **Data Storage**: Mandatory use of normalized relational tables for all business data; JSONB is restricted to true metadata/UI preferences.

## External Dependencies
- **Database**: Neon (PostgreSQL)
- **Email Services**:
    - SendGrid API (for transactional emails and PO distribution)
    - Google Workspace (for company email receiving)
    - Gmail API (for automated invoice recognition and import)
- **Mapping/Geocoding**: GPS integration for time tracking
- **File Processing**: PDFKit, Multer, CSV parsing
- **UI Components**: Radix UI
- **Visual Template Builder**: GrapesJS (for template management system)