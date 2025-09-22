# STEELIQ - Enterprise Steel Fabrication & Procurement Platform

## Overview
STEELIQ is a Fortune 500-standard enterprise platform for Lateral Engineering Limited, designed to manage the entire steel fabrication lifecycle. It integrates advanced optimization algorithms with comprehensive business management capabilities, spanning material procurement through job execution. The platform's core purpose is to streamline operations, reduce costs, enhance efficiency, and ensure compliance in steel fabrication and supply chain management. Key capabilities include procurement, material and inventory management, job and project management, financial management, and team and resource management.

## User Preferences
I prefer simple language and detailed explanations. I want iterative development and for the agent to ask before making major changes. I prefer detailed explanations, do not make changes to the folder Z, and do not make changes to the file Y.

## System Architecture
### Core Business Domains
The platform is structured around six core business domains:
1.  **Procurement & Supply Chain Management**: Manages the complete Purchase Order (PO) lifecycle, Request for Quote (RFQ) system, supplier integration, and email distribution. Features include a supplier portal for acknowledgments and linking all procurement to specific jobs for cost tracking.
2.  **Material & Inventory Management**: Includes a comprehensive material library (600+ steel materials) and connection components library (102 standard components), real-time inventory tracking with low-stock alerts, mill certificate management, 1D linear cutting optimization, and remnant management.
3.  **Job & Project Management**: Covers the full job lifecycle (Draft to Completed), material takeoff, a three-phase estimation engine, project tracking (Kanban/Timeline/List views), document management with version control, and integrated procurement.
4.  **Financial Management**: Handles multi-location quote generation, automated invoice processing, real-time job costing and profitability tracking, budget monitoring, and complete RFQ-to-PO cost visibility.
5.  **Team & Resource Management**: Implements Role-Based Access Control (RBAC), mobile-first time tracking with GPS and offline sync, skill-based labor rates, performance reviews, and qualification tracking with renewal alerts.
6.  **Email & Communication Systems**: Features a three-tier architecture utilizing Google Workspace for receiving, SendGrid for transactional emails (POs, RFQs, notifications), and an automated system for invoice cost import.

### Technical Infrastructure
-   **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI.
-   **Backend**: Node.js, Express.js, RESTful APIs.
-   **Database**: PostgreSQL (Neon), Drizzle ORM.
-   **Authentication**: bcrypt, session-based.
-   **File Processing**: PDFKit, Multer, CSV parsing.
-   **Build Tools**: Vite, ESBuild.
-   **Database Schema**: 75+ tables with audit trails, soft deletes, and optimized indexes.

### Integration Architecture
-   **Procurement Flow**: Job Project → Purchase Requisition → Multi-Level Approval → RFQ to Suppliers → Quote Comparison → Purchase Order → Goods Receipt → Job Cost Update.
-   **Email Flow**: Separate flows for RFQs, Purchase Orders (with PDF attachments and tracking), and Invoice Processing (via Gmail API, OCR, and cost import).
-   **Supplier Portal**: Token-based access for external suppliers to view RFQs/POs, submit quotes, acknowledge receipts, and update delivery status, integrated with an internal Supplier Integration Hub.

### UI/UX Decisions
-   Fortune 500 standard UI/UX with a mobile-first responsive design.
-   Consistent component library, blue/green status indicators, and accessibility compliance.
-   Compact, information-dense layouts with a clear navigation structure (Main Dashboard, Procurement Center, Jobs, Inventory, Team, Finance, Settings).

### Security & Compliance
-   **Access Control**: Role-based permissions, session-based authentication, secure token generation, API rate limiting, and approval hierarchy enforcement.
-   **Data Protection**: Encrypted sensitive data, secure file uploads, comprehensive audit trails, 7-year data retention, and job-level cost segregation.
-   **Compliance Standards**: Adherence to AS/NZS steel standards, ISO document management, GDPR-ready data handling, and industry-standard security practices.

## External Dependencies
-   **Email Services**: SendGrid API (for transactional emails), Google Workspace (for company email reception), Gmail API (for invoice processing).
-   **Database**: Neon (for PostgreSQL hosting).
-   **UI Libraries**: Radix UI, Tailwind CSS.
-   **File Manipulation**: PDFKit, Multer.
-   **Build Tools**: Vite, ESBuild.
-   **ORM**: Drizzle ORM.
-   **Template Builder**: GrapesJS (for template management system).