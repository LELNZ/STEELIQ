# STEELIQ - Enterprise Steel Fabrication & Procurement Platform

## Overview
STEELIQ is a Fortune 500-standard enterprise platform for Lateral Engineering Limited, designed to manage the entire steel fabrication lifecycle. This includes advanced optimization from material procurement through job execution, combining sophisticated algorithms with comprehensive business management capabilities. The platform aims to streamline procurement, material and inventory management, job and project tracking, financial operations, and team coordination. Its business vision is to provide a robust, integrated solution that significantly reduces operational costs, enhances efficiency, and ensures compliance and traceability across all stages of steel fabrication and procurement. The project ambition is to set a new industry standard for integrated enterprise resource planning in the steel sector.

## User Preferences
I prefer simple language. I want iterative development. Ask before making major changes. I prefer detailed explanations. Do not make changes to the folder Z. Do not make changes to the file Y.

## System Architecture

### Core Business Domains
The platform is structured around six core business domains:
1.  **Procurement & Supply Chain Management**: Manages the complete purchase order (PO) lifecycle, including RFQ management, supplier integration, SendGrid-powered email distribution, a token-based supplier portal, and linking all procurement to specific jobs for cost tracking.
2.  **Material & Inventory Management**: Features a material library with 600+ steel materials, real-time inventory tracking with low-stock alerts, mill certificate management, 1D linear cutting optimization, and automatic remnant tracking.
3.  **Job & Project Management**: Supports a job lifecycle (Draft → Active → In Progress → Completed), material takeoff, a three-phase estimation engine, Fortune 500 standard project tracking views (Kanban/Timeline/List), ISO-compliant document management, and integrated procurement.
4.  **Financial Management**: Handles multi-location quote generation with e-signatures, automated invoice processing, real-time job costing, budget monitoring with variance analysis, and complete cost visibility from RFQ to payment.
5.  **Team & Resource Management**: Includes a granular Role-Based Access Control (RBAC) system, mobile-first time tracking with GPS, skill-based labor rates, automated KPI tracking, and qualification expiry alerts.
6.  **Email & Communication Systems**: Utilizes a three-tier architecture with Google Workspace for receiving, SendGrid for transactional emails (POs, RFQs), and an email cost import system for automated invoice processing.

### Technical Implementation
-   **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI.
-   **Backend**: Node.js, Express.js, RESTful APIs.
-   **Database**: PostgreSQL (Neon) with Drizzle ORM, featuring 75+ tables, comprehensive audit trails, soft deletes, and optimized indexing.
-   **Authentication**: bcrypt, session-based.
-   **File Processing**: PDFKit, Multer, CSV parsing.
-   **Build Tools**: Vite, ESBuild.

### UI/UX Decisions
The platform adheres to Fortune 500 standard UI/UX, featuring a mobile-first responsive design, a consistent component library, blue/green status indicators, accessibility compliance, and compact, information-dense layouts.

### Feature Specifications
Key completed features include a full requisition and approval workflow, purchase order creation and distribution, SendGrid integration, material library with cutting optimization, job management with estimation, team management with RBAC, time tracking, financial settings, email cost import, and a comprehensive audit trail. Recent additions include a database-driven template management system, enhanced data management with configurable numbering, direct import from Material Takeoffs (MTO) to estimation, and a library of 102 industry-standard connection components for automated costing.

### System Design Choices
-   **Procurement Flow**: Implements an RFQ-first procurement process, guiding requisitions through multi-level approval, RFQ generation, quote evaluation, PO creation, goods receipt, three-way matching, and job cost updates.
-   **Email Flow**: Separate flows for RFQs (Create RFQ → SendGrid → Suppliers → Quote Portal → Comparison) and Purchase Orders (Create PO → SendGrid → Supplier Email → Portal Link → Acknowledgment). Invoice processing involves Supplier Email → Gmail API → OCR/Extract → Cost Import → Job Costs.
-   **Supplier Portal**: A token-based external portal allows suppliers to view RFQs/POs, submit quotes, acknowledge receipts, update delivery status, and add notes without requiring a full login.
-   **Security**: Role-based access control, session-based authentication, secure token generation, API rate limiting, encrypted sensitive data, secure file uploads, comprehensive audit trails, and compliance with AS/NZS, ISO, and GDPR-ready data handling.
-   **Performance**: Targeted uptime of 99.9%, response time under 200ms, support for 100+ concurrent users, and processing of 10,000+ material catalog items.

## External Dependencies
-   **Database**: PostgreSQL (specifically Neon for cloud-hosted PostgreSQL).
-   **Email Services**: SendGrid API (for transactional emails and PO distribution), Google Workspace (for company email receiving and Gmail API for invoice processing).
-   **Authentication Libraries**: bcrypt.
-   **ORM**: Drizzle ORM.
-   **UI Libraries**: Radix UI.
-   **PDF Generation**: PDFKit.
-   **File Uploads**: Multer.
-   **Template Builder**: GrapesJS (used in the Template Management System).