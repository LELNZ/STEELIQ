# STEELIQ - Enterprise Steel Fabrication & Procurement Platform

## Overview
STEELIQ is an enterprise platform for Lateral Engineering Limited, designed to manage the entire steel fabrication lifecycle from procurement to job execution. It aims to achieve Fortune 50 standards in data integrity, operational efficiency, and enterprise control by integrating AI-powered optimization, self-learning AI estimation, automated procurement, real-time production monitoring, and comprehensive cost aggregation. The platform ensures complete traceability from drawing to delivery, targeting a 50% reduction in estimation time, 15-20% accuracy improvement, and $892K in annual savings.

## User Preferences
I prefer simple language and clear explanations.
I want iterative development with regular updates.
Ask before making major changes or architectural decisions.
Ensure all metrics are traceable to source records; do not use mock data.
Prioritize security and compliance with Fortune 50 standards.
Do not make changes to the `server/services` directory without explicit approval.
Ensure strict type checking and comprehensive error handling.

## System Architecture

### Complete Job Lifecycle Flow
The platform manages a comprehensive job lifecycle:
1.  **AI Estimation**: Processes PDF/DXF input using Claude AI for pattern matching.
2.  **Job Creation**: Validates and transfers MTOs to create job numbers.
3.  **Procurement**: Generates RFQs and matches suppliers.
4.  **Production**: Manages work orders and assignments.
5.  **Monitoring**: Tracks machine data, OEE metrics, and department efficiency.
6.  **Cost Tracking**: Aggregates costs and performs variance analysis.

### Core Service Architecture
The `server/services` directory contains key microservices:
-   `aiEstimationService.ts`: AI MTO extraction with Claude.
-   `aiWorkflowService.ts`: PDF/DXF processing pipeline.
-   `dxfParserService.ts`: Precision CAD geometry parsing (0.01mm).
-   `jobLifecycleService.ts`: Job creation & validation.
-   `rfqAutomationService.ts`: Automated supplier matching.
-   `productionMonitoringService.ts`: Real-time OEE tracking.
-   `costAggregationService.ts`: Multi-source cost analysis.

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript, styled with Tailwind CSS and Radix UI components. State management is handled by TanStack Query v5, forms by React Hook Form with Zod validation, and charts by Chart.js/Recharts. The design prioritizes responsive layouts for role-based workflows and mobile accessibility, including field access, GPS-verified time clocks, and photo uploads.

### Technical Implementations
The backend is built with Node.js and TypeScript, using Express.js for RESTful APIs. PostgreSQL (Neon) with Drizzle ORM serves as the database. Authentication uses bcrypt with session management. Vite with ESBuild is used for the build process, and Drizzle Kit for database migrations.

### Feature Specifications
-   **AI Estimation Engine**: Processes PDF/DXF/DWG using Claude Sonnet 4.0, applies 18 AS/NZS steel pattern templates, generates hierarchical MTOs, and includes a self-learning feedback loop.
-   **Procurement Automation**: Generates purchase requisitions, auto-generates RFQs with supplier matching, enables quote comparison, one-click PO generation, and invoice OCR.
-   **Production Intelligence**: Provides real-time machine status monitoring, OEE calculation, department efficiency tracking, and quality control with NCR tracking.
-   **Cost Management**: Aggregates costs from multiple sources, performs real-time variance analysis, allocates department-level overhead, and tracks indirect costs.
-   **Job Lifecycle Integration**: Ensures seamless flow from AI Estimation to Job Creation, MTO Transfer, and Procurement with validation, sequence-based numbering, and complete audit trails.

### System Design Choices
The architecture follows a layered approach with distinct services. The database design is highly normalized with 95+ tables, including specific tables for AI learning, pattern recognition, and feedback. Security features encompass session-based authentication, granular Role-Based Access Control (RBAC), encryption at rest, immutable audit trails, and strict input validation to meet Fortune 50 standards (AS/NZS, ISO 45001, GDPR, SOC 2 Type II).

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **AI Service**: Anthropic Claude Sonnet 4.0 API
-   **Email Services**: SendGrid, Gmail API
-   **File Processing Libraries**: PDFKit, pdf-parse, dxf-parser
-   **Authentication Libraries**: bcrypt
-   **Frontend Libraries**: React, Tailwind CSS, Radix UI, TanStack Query, React Hook Form, Zod, Chart.js, Recharts, Wouter