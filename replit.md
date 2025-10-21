# STEELIQ - Enterprise Steel Fabrication & Procurement Platform

## Overview
STEELIQ is an enterprise platform designed to manage and streamline the entire steel fabrication lifecycle, from procurement to job execution. Its core purpose is to achieve Fortune 50 standards in data integrity, operational efficiency, and enterprise control. Key capabilities include AI-powered optimization, self-learning AI estimation, automated procurement, real-time production monitoring, and comprehensive cost aggregation. The platform aims to transition from manual to automatic processes, improve accuracy through AI, and significantly reduce estimation time, ensuring complete traceability from drawing to delivery.

## User Preferences
I prefer simple language and clear explanations.
I want iterative development with regular updates.
Ask before making major changes or architectural decisions.
Ensure all metrics are traceable to source records; do not use mock data.
Prioritize security and compliance with Fortune 50 standards.
Do not make changes to the `server/services` directory without explicit approval.
Ensure strict type checking and comprehensive error handling.

## System Architecture
STEELIQ's architecture supports a complete job lifecycle, integrating AI estimation, job creation, procurement, production, monitoring, and cost tracking.

### Core Service Architecture
The system is built around 7 key microservices:
-   **aiEstimationService.ts**: AI-powered MTO extraction using Claude Sonnet 4.0.
-   **aiWorkflowService.ts**: PDF/DXF processing pipeline.
-   **dxfParserService.ts**: Precision CAD geometry parsing (0.01mm accuracy).
-   **jobLifecycleService.ts**: Job creation, validation, and MTO transfer.
-   **rfqAutomationService.ts**: Automated supplier matching and RFQ generation.
-   **productionMonitoringService.ts**: Real-time OEE tracking and metrics.
-   **costAggregationService.ts**: Multi-source cost analysis and variance tracking.

### Database Architecture
The system utilizes PostgreSQL with Drizzle ORM, featuring 95+ tables categorized into Core Business (Jobs, Estimation, Procurement, Production, Financial, Team), AI & Learning (ai_mto_elements, ai_pattern_library, ai_feedback), and System (numbering_sequences, audit_events).

### UI/UX Decisions
The frontend is developed using React 18 with TypeScript, Tailwind CSS, and Radix UI components. It leverages TanStack Query v5 for state management, React Hook Form with Zod for validation, and Chart.js/Recharts for data visualization. The design emphasizes responsive layouts, role-based workflows, and mobile accessibility for field operations.

### Technical Implementations
The backend is built with Node.js and TypeScript, using Express.js for RESTful APIs. Authentication uses bcrypt with session management. Vite with ESBuild handles the build process, and Drizzle Kit manages database migrations. The system enforces strict type checking, comprehensive error handling, and immutable audit trails.

### Feature Specifications
-   **AI Estimation Engine**: Processes PDF/DXF/DWG drawings, uses 18 AS/NZS steel pattern templates for hierarchical MTO generation, and self-improves through user feedback.
-   **Procurement Automation**: Automates requisition generation, multi-supplier RFQ distribution, quote comparison, one-click PO generation, and OCR-based invoice processing.
-   **Production Intelligence**: Provides real-time machine monitoring, OEE metrics, department efficiency analysis, shift management, and NCR tracking.
-   **Cost Management**: Aggregates costs from multiple sources, performs real-time variance analysis, allocates overhead, tracks indirect costs, and alerts for cost overruns.

## External Dependencies
-   **Database**: PostgreSQL (Neon)
-   **AI Service**: Anthropic Claude Sonnet 4.0 API
-   **Email Services**: SendGrid, Gmail API
-   **File Processing**: PDFKit, pdf-parse, dxf-parser
-   **Authentication**: bcrypt
-   **Frontend Libraries**: React, Tailwind CSS, Radix UI, TanStack Query, React Hook Form, Zod, Chart.js, Recharts, Wouter