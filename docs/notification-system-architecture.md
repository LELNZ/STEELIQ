# STEELIQ Multi-Channel Notification System Architecture

## Overview
The notification system provides real-time alerts and communications across multiple channels, designed for Fortune 50 compliance with comprehensive audit trails and delivery confirmation.

## Architecture Components

### 1. Internal Notification System

#### Database Schema
```typescript
// notifications table
{
  id: varchar primaryKey (UUID)
  userId: varchar (foreign key to users)
  type: varchar // 'system', 'time_clock', 'approval', 'alert', 'compliance'
  priority: varchar // 'low', 'medium', 'high', 'critical'
  title: varchar
  message: text
  metadata: jsonb {
    entityType?: string // 'time_entry', 'approval_request', 'payroll_run'
    entityId?: string
    actionRequired?: boolean
    actionUrl?: string
    expiresAt?: timestamp
  }
  status: varchar // 'pending', 'delivered', 'read', 'archived'
  deliveryChannels: text[] // ['in_app', 'email', 'whatsapp']
  deliveryStatus: jsonb {
    in_app?: { delivered: boolean, deliveredAt?: timestamp, readAt?: timestamp }
    email?: { sent: boolean, sentAt?: timestamp, messageId?: string }
    whatsapp?: { sent: boolean, sentAt?: timestamp, messageId?: string }
  }
  createdAt: timestamp
  readAt: timestamp nullable
  archivedAt: timestamp nullable
}

// notification_preferences table
{
  id: varchar primaryKey
  userId: varchar (foreign key)
  channel: varchar // 'in_app', 'email', 'whatsapp'
  enabled: boolean
  settings: jsonb {
    // Email settings
    emailAddress?: string
    digestFrequency?: 'immediate' | 'hourly' | 'daily'
    
    // WhatsApp settings
    phoneNumber?: string
    optedIn?: boolean
    optedInAt?: timestamp
    
    // In-app settings
    showDesktopNotifications?: boolean
    playSound?: boolean
  }
  notificationTypes: jsonb {
    time_clock: boolean
    approvals: boolean
    payroll: boolean
    compliance: boolean
    system_alerts: boolean
  }
  updatedAt: timestamp
}
```

#### Core Services

##### NotificationService (server/services/notificationService.ts)
```typescript
class NotificationService {
  // Core notification creation and routing
  async createNotification(data: NotificationData): Promise<Notification> {
    // 1. Create notification record
    // 2. Check user preferences
    // 3. Route to appropriate channels
    // 4. Track delivery status
    // 5. Create audit trail
  }
  
  // Channel-specific delivery
  async sendToInApp(notification: Notification): Promise<void>
  async sendToEmail(notification: Notification): Promise<void>
  async sendToWhatsApp(notification: Notification): Promise<void>
  
  // Bulk operations
  async sendBulkNotifications(notifications: NotificationData[]): Promise<void>
  
  // Status management
  async markAsRead(notificationId: string): Promise<void>
  async markAsDelivered(notificationId: string, channel: string): Promise<void>
}
```

##### Real-time WebSocket Handler
```typescript
// WebSocket for instant in-app notifications
class NotificationWebSocketHandler {
  // Manage user connections
  userConnections: Map<string, WebSocket[]>
  
  // Push notifications to connected clients
  async pushNotification(userId: string, notification: Notification): void
  
  // Handle connection lifecycle
  handleConnection(ws: WebSocket, userId: string): void
  handleDisconnection(ws: WebSocket, userId: string): void
}
```

### 2. In-App Notification Components

#### Frontend Components

##### NotificationCenter (client/src/components/notifications/NotificationCenter.tsx)
```tsx
// Bell icon with unread count badge
// Dropdown panel with notification list
// Real-time updates via WebSocket
// Mark as read/archive functionality
// Filter by type/priority
// Search notifications
```

##### NotificationToast (client/src/components/notifications/NotificationToast.tsx)
```tsx
// Toast notifications for immediate alerts
// Auto-dismiss with configurable duration
// Action buttons for quick responses
// Priority-based styling (colors/icons)
```

##### NotificationPreferences (client/src/components/settings/NotificationPreferences.tsx)
```tsx
// Channel enable/disable toggles
// Type-specific preferences
// WhatsApp opt-in flow
// Email address management
// Digest frequency settings
```

### 3. Email Integration

#### Current Implementation
- **Primary**: Gmail SMTP (Google Workspace)
- **Fallback**: SendGrid API
- **Features**:
  - HTML templates with company branding
  - Delivery tracking
  - Bounce handling
  - Unsubscribe links
  - SPF/DKIM authentication

#### Email Templates
```typescript
// Time & Payroll specific templates
- Clock In/Out confirmation
- Approval requests
- Payroll run notifications
- Compliance alerts
- Weekly time summaries
```

### 4. WhatsApp Business API Integration (Planned)

#### Architecture Design
```typescript
interface WhatsAppConfig {
  businessAccountId: string
  phoneNumberId: string
  accessToken: string // From Meta Business Platform
  webhookVerifyToken: string
}

class WhatsAppService {
  // Message sending
  async sendMessage(phoneNumber: string, template: string, params: any): Promise<void>
  
  // Template management
  async createMessageTemplate(template: MessageTemplate): Promise<void>
  
  // Opt-in management
  async requestOptIn(phoneNumber: string): Promise<void>
  async confirmOptIn(phoneNumber: string, code: string): Promise<void>
  
  // Webhook handling for delivery status
  async handleWebhook(event: WebhookEvent): Promise<void>
}
```

#### Message Templates (Pre-approved by WhatsApp)
```
1. Time Clock Alerts
   "Hi {{1}}, you've successfully {{2}} at {{3}}. Location: {{4}}"

2. Approval Requests
   "{{1}} requires your approval for {{2}}. Reply APPROVE or DENY."

3. Payroll Notifications
   "Your payroll for period {{1}} has been processed. Amount: ${{2}}"

4. Compliance Alerts
   "ACTION REQUIRED: {{1}}. Due by {{2}}. Reply INFO for details."
```

#### Free 24-Hour Customer Service Window
- No charges for messages within 24 hours of user-initiated contact
- Ideal for time clock confirmations and immediate responses
- Outside 24-hour window: Use approved message templates

### 5. Notification Priority & Routing Logic

```typescript
enum NotificationPriority {
  LOW = 'low',        // In-app only
  MEDIUM = 'medium',  // In-app + Email digest
  HIGH = 'high',      // In-app + Immediate email
  CRITICAL = 'critical' // All channels immediately
}

// Routing rules
const routingRules = {
  time_clock: {
    clock_in_out: Priority.LOW,
    missed_clock_out: Priority.HIGH,
    location_override: Priority.CRITICAL
  },
  approvals: {
    pending: Priority.MEDIUM,
    escalated: Priority.HIGH,
    expired: Priority.CRITICAL
  },
  payroll: {
    processed: Priority.MEDIUM,
    error: Priority.CRITICAL,
    audit_flag: Priority.CRITICAL
  }
};
```

### 6. Audit & Compliance

#### Notification Audit Trail
```typescript
interface NotificationAudit {
  notificationId: string
  action: 'created' | 'delivered' | 'read' | 'failed'
  channel: string
  timestamp: Date
  metadata: {
    deliveryAttempt?: number
    failureReason?: string
    ipAddress?: string
    userAgent?: string
  }
}
```

#### Compliance Features
- **Data Retention**: 7-year retention for payroll notifications
- **Encryption**: AES-256 for sensitive notification content
- **Access Control**: RBAC-based notification visibility
- **Delivery Confirmation**: Legal proof of notification delivery
- **Opt-out Compliance**: GDPR/CAN-SPAM compliant unsubscribe

### 7. Implementation Phases

#### Phase 1: Core Infrastructure (Current)
- ✅ Database schema
- ✅ Email integration (Gmail/SendGrid)
- ✅ Basic notification service
- 🔄 In-app notification UI

#### Phase 2: Real-time Delivery
- WebSocket integration
- Push notification support
- Notification center UI
- Read/unread tracking

#### Phase 3: WhatsApp Integration
- Meta Business Platform setup
- Message template approval
- Opt-in flow implementation
- Webhook integration

#### Phase 4: Advanced Features
- Notification scheduling
- Bulk notification campaigns
- A/B testing for templates
- Analytics dashboard

### 8. Performance Considerations

#### Scalability
- Queue-based processing for bulk notifications
- Rate limiting per channel
- Retry logic with exponential backoff
- Database indexing on userId, status, createdAt

#### Caching
- User preference caching (Redis)
- Template caching
- Delivery status caching

#### Monitoring
- Delivery success rates
- Channel-specific metrics
- User engagement tracking
- Error rate monitoring

### 9. Security Measures

- **Authentication**: JWT tokens for WebSocket connections
- **Authorization**: Permission-based notification access
- **Data Sanitization**: XSS prevention in notification content
- **Rate Limiting**: Prevent notification spam
- **Encryption**: TLS for all communication channels

### 10. Cost Optimization

#### Email (Gmail/SendGrid)
- Gmail: Free up to 500 emails/day
- SendGrid: 100 emails/day free tier
- Bulk sending during off-peak hours

#### WhatsApp Business
- Free: 24-hour customer service window
- Paid: Template messages outside window (~$0.01-0.05 per message)
- Optimization: Batch non-urgent notifications

#### In-App
- No external costs
- Minimal server resources
- Most cost-effective channel

## Next Steps

1. **Immediate**: Fix Gmail authentication for email notifications
2. **This Week**: Implement in-app notification UI components
3. **Next Sprint**: Set up WebSocket for real-time delivery
4. **Future**: WhatsApp Business API integration

## Regional Considerations for New Zealand

- **No SMS**: Due to 5-6 week Twilio short code delays in NZ
- **WhatsApp Preferred**: High adoption rate in NZ (>80% smartphone users)
- **Email Standard**: Gmail/Google Workspace common in NZ businesses
- **Time Zones**: NZST/NZDT handling for notification scheduling