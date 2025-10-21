# STEELIQ - Enterprise Steel Fabrication & Procurement Platform

## Overview
STEELIQ is an enterprise platform for Lateral Engineering Limited, managing the entire steel fabrication lifecycle from procurement to job execution. It integrates AI-powered optimization with comprehensive business management to achieve **Fortune 50 standards** in data integrity, operational efficiency, and enterprise control. The platform aims to revolutionize steel fabrication through self-learning AI estimation, automated procurement, real-time production monitoring, and comprehensive cost aggregation, ensuring complete traceability from drawing to delivery. Key goals include a 50% reduction in estimation time, 15-20% accuracy improvement, and $892K in annual savings.

## User Preferences
I prefer simple language and clear explanations.
I want iterative development with regular updates.
Ask before making major changes or architectural decisions.
Ensure all metrics are traceable to source records; do not use mock data.
Prioritize security and compliance with Fortune 50 standards.
Do not make changes to the `server/services` directory without explicit approval.
Ensure strict type checking and comprehensive error handling.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, styled with Tailwind CSS and Radix UI components. State management is handled by TanStack Query v5, forms by React Hook Form with Zod validation, and charts by Chart.js/Recharts. The design emphasizes responsive layouts for role-based workflows and mobile accessibility, supporting field access, GPS-verified time clocks, and photo uploads for quality inspections.

### Technical Implementations
The backend is built with Node.js and TypeScript, using Express.js for RESTful APIs. PostgreSQL (Neon) with Drizzle ORM serves as the database. The platform integrates Anthropic Claude Sonnet 4.0 API for AI services and uses PDFKit, pdf-parse, and dxf-parser for file processing. Authentication is managed via bcrypt with session management, and SendGrid/Gmail API handles email. Vite with ESBuild is used for the build process, and Drizzle Kit for database migrations.

### Feature Specifications
- **AI Estimation Engine**: Processes PDF/DXF/DWG drawings using Claude Sonnet 4.0 and 18 pattern templates to generate hierarchical Material Take-Offs (MTOs). It includes a self-learning feedback loop for continuous accuracy improvement.
- **Procurement Automation**: Manages purchase requisitions, RFQ generation, supplier matching, quote comparison, and one-click PO generation with approval workflows.
- **Production Intelligence**: Provides real-time machine monitoring, OEE (Overall Equipment Effectiveness) calculation, department efficiency analysis, and quality control tracking.
- **Cost Management**: Aggregates material, labor, overhead, and indirect costs, offering real-time variance reporting and margin protection alerts.
- **Job Lifecycle Integration**: Ensures seamless flow from AI Estimation to Job Creation, MTO Transfer, and Procurement, with robust validation, sequence-based numbering, and immutable event logging.
- **Data Integrity**: Enforces 100% database-driven metrics, eliminates mock data, and maintains a complete audit trail for all transactions.

### System Design Choices
The architecture emphasizes a layered approach with distinct services for AI estimation, workflow, DXF parsing, job lifecycle, RFQ automation, production monitoring, and cost aggregation. The database design is highly normalized with 95+ tables, including specific tables for AI learning, pattern recognition, and feedback. Security features include session-based authentication, granular Role-Based Access Control (RBAC), encryption at rest, immutable audit trails, and strict input validation to meet Fortune 50 security and compliance standards (AS/NZS, ISO 45001, GDPR, SOC 2 Type II).

## External Dependencies
- **Database**: PostgreSQL (Neon)
- **AI Service**: Anthropic Claude Sonnet 4.0 API
- **Email Services**: SendGrid, Gmail API
- **File Processing Libraries**: PDFKit, pdf-parse, dxf-parser
- **Authentication Libraries**: bcrypt
- **Frontend Libraries**: React, Tailwind CSS, Radix UI, TanStack Query, React Hook Form, Zod, Chart.js, Recharts, Wouter