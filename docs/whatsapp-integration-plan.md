# WhatsApp Business API Integration Plan for STEELIQ

## Executive Summary
WhatsApp Business API integration provides instant, cost-effective notifications for Time & Payroll system, leveraging New Zealand's high WhatsApp adoption (>80% smartphone users) while avoiding SMS limitations (5-6 week short code delays).

## Business Case

### Advantages for New Zealand Market
- **High Adoption**: 80%+ smartphone users active on WhatsApp
- **Cost-Effective**: Free messaging within 24-hour customer service window
- **Instant Delivery**: Real-time notifications without carrier delays
- **Rich Media**: Support for images, PDFs, location sharing
- **Two-Way Communication**: Interactive approvals and responses
- **No Short Code Delays**: Immediate deployment vs 5-6 weeks for SMS

### Use Cases
1. **Time Clock Confirmations** (Free - within 24hr window)
   - Clock in/out notifications with GPS location
   - Photo evidence delivery
   - Missed clock-out alerts

2. **Approval Workflows** (Free - user-initiated)
   - Time correction approvals
   - Overtime authorization
   - Leave requests

3. **Payroll Notifications** (Template messages)
   - Payslip availability
   - Payment confirmations
   - Tax document notifications

4. **Compliance Alerts** (Template messages)
   - Certification expiry warnings
   - Training reminders
   - Safety compliance updates

## Technical Implementation

### Prerequisites

#### 1. Meta Business Account Setup
```
Steps:
1. Create Meta Business Account at business.facebook.com
2. Verify business (requires business documents)
3. Create WhatsApp Business Account
4. Add phone number (cannot be used for personal WhatsApp)
5. Display name approval (1-2 days)
6. Generate permanent access token
```

#### 2. Phone Number Requirements
- Dedicated business number (not personal WhatsApp)
- SMS capability for initial verification
- New Zealand number recommended (+64)

#### 3. API Access Setup
```javascript
// Required credentials
const WHATSAPP_CONFIG = {
  BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ID,
  PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_ID,
  ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_TOKEN,
  API_VERSION: 'v18.0'
};
```

### Message Template Requirements

#### Template Approval Process (3-24 hours)
```yaml
Template Name: time_clock_confirmation
Category: UTILITY
Language: en_NZ
Content: |
  Hi {{1}}, you've successfully {{2}} at {{3}}.
  Location: {{4}}
  Job: {{5}}
  
  If this wasn't you, reply DISPUTE.

Variables:
  1: Employee name
  2: Action (clocked in/out)
  3: Time
  4: Location name
  5: Job number
```

#### Pre-Launch Templates Needed
1. `time_clock_confirmation` - Clock in/out confirmations
2. `approval_request` - Manager approval requests
3. `payroll_notification` - Payroll processing updates
4. `compliance_alert` - Compliance and safety alerts
5. `shift_reminder` - Upcoming shift reminders

### Integration Architecture

#### 1. Service Implementation
```typescript
// server/services/whatsappService.ts
import axios from 'axios';

export class WhatsAppService {
  private baseUrl = 'https://graph.facebook.com/v18.0';
  private phoneNumberId: string;
  private accessToken: string;
  
  async sendMessage(to: string, template: string, parameters: any[]) {
    const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'template',
      template: {
        name: template,
        language: { code: 'en_NZ' },
        components: [{
          type: 'body',
          parameters: parameters.map(p => ({
            type: 'text',
            text: p
          }))
        }]
      }
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  }
  
  async sendInteractiveMessage(to: string, body: string, buttons: any[]) {
    // For quick replies and interactive buttons
  }
  
  private formatPhoneNumber(phone: string): string {
    // Ensure NZ format: 64XXXXXXXXX
    return phone.replace(/^\+/, '').replace(/^0/, '64');
  }
}
```

#### 2. Webhook Handler
```typescript
// server/routes/whatsapp-webhook.ts
app.post('/api/webhooks/whatsapp', async (req, res) => {
  const { entry } = req.body;
  
  for (const change of entry[0].changes) {
    if (change.field === 'messages') {
      const message = change.value.messages[0];
      
      // Handle incoming messages
      await handleIncomingMessage({
        from: message.from,
        text: message.text?.body,
        type: message.type,
        timestamp: message.timestamp
      });
    }
  }
  
  res.sendStatus(200);
});

// Webhook verification
app.get('/api/webhooks/whatsapp', (req, res) => {
  const token = process.env.WHATSAPP_WEBHOOK_TOKEN;
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = req.query['hub.verify_token'];
  
  if (mode === 'subscribe' && verifyToken === token) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
```

#### 3. Opt-in Management
```typescript
// Database schema for WhatsApp opt-ins
interface WhatsAppOptIn {
  id: string;
  userId: string;
  phoneNumber: string;
  optedIn: boolean;
  optedInAt: Date;
  optedOutAt?: Date;
  consentMethod: 'web' | 'message' | 'import';
  consentText: string;
}

// Opt-in flow
class OptInService {
  async requestOptIn(userId: string, phoneNumber: string) {
    // 1. Store opt-in request
    // 2. Send SMS/Email with confirmation link
    // 3. Once confirmed, enable WhatsApp notifications
  }
  
  async handleOptOut(phoneNumber: string) {
    // 1. Mark as opted out in database
    // 2. Stop all WhatsApp notifications
    // 3. Send confirmation
  }
}
```

### Cost Structure

#### Pricing Model (NZD estimates)
```
1. Customer Service Window (Free)
   - 24 hours from last user message
   - Unlimited messages
   - Best for: Time clock confirmations, approvals
   
2. Business-Initiated (Paid)
   - Template messages only
   - Cost: $0.015 - $0.08 per message
   - Best for: Scheduled reminders, broadcasts
   
3. Monthly Active Users
   - First 1,000 free conversations/month
   - Ideal for pilot program
```

#### Cost Optimization Strategies
1. **Maximize 24-hour window**: Send confirmations immediately after user actions
2. **Batch non-urgent**: Combine multiple notifications into daily digests
3. **User preferences**: Allow opt-out of non-critical notifications
4. **Smart routing**: Use email for non-time-sensitive, WhatsApp for urgent

### Implementation Phases

#### Phase 1: Setup & Testing (Week 1-2)
- [ ] Create Meta Business Account
- [ ] Verify business and phone number
- [ ] Submit initial message templates
- [ ] Set up webhook endpoints
- [ ] Create opt-in flow UI

#### Phase 2: Basic Integration (Week 3-4)
- [ ] Implement WhatsAppService class
- [ ] Add to notification routing logic
- [ ] Test with internal users
- [ ] Monitor delivery rates

#### Phase 3: Time & Payroll Features (Week 5-6)
- [ ] Clock in/out confirmations
- [ ] Approval request flows
- [ ] GPS location sharing
- [ ] Photo evidence delivery

#### Phase 4: Advanced Features (Week 7-8)
- [ ] Interactive buttons for approvals
- [ ] Quick reply templates
- [ ] Shift swap requests
- [ ] Leave balance queries

### Compliance & Privacy

#### GDPR/Privacy Act Compliance
```typescript
// Required consent text
const CONSENT_TEXT = `
By providing your phone number, you agree to receive WhatsApp messages 
from STEELIQ regarding time tracking, payroll, and work notifications. 
You can opt out anytime by replying STOP. Message frequency varies. 
Standard data rates may apply.
`;

// Data retention
- Messages: 30 days (operational)
- Audit logs: 7 years (compliance)
- Opt-in records: Permanent
```

#### Security Measures
1. **Encryption**: End-to-end encryption by WhatsApp
2. **Authentication**: Verify sender phone numbers
3. **Rate limiting**: Prevent message flooding
4. **Access control**: Restrict API key access
5. **Audit trails**: Log all messages sent/received

### Monitoring & Analytics

#### Key Metrics
```typescript
interface WhatsAppMetrics {
  // Delivery metrics
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  messagesFailed: number;
  
  // Engagement metrics
  responseRate: number;
  responseTime: number;
  optInRate: number;
  optOutRate: number;
  
  // Cost metrics
  freeMessages: number;
  paidMessages: number;
  totalCost: number;
  costPerUser: number;
}
```

#### Dashboard Requirements
- Real-time delivery status
- Template performance
- User engagement trends
- Cost tracking
- Error monitoring

### Testing Strategy

#### Test Scenarios
1. **Opt-in Flow**
   - Web-based consent
   - Message-based consent
   - Opt-out handling

2. **Message Delivery**
   - Template messages
   - Interactive messages
   - Media messages (photos)
   - Location sharing

3. **Error Handling**
   - Invalid phone numbers
   - API rate limits
   - Network failures
   - Template rejections

#### Test Phone Numbers
```
Meta provides test numbers:
- +1 555 025 3483
- +1 555 041 8904
- No charges for testing
```

### Rollout Plan

#### Pilot Program (Month 1)
- 10-20 volunteer employees
- Time clock notifications only
- Gather feedback
- Monitor costs

#### Gradual Expansion (Month 2-3)
- Add approval workflows
- Expand to 100 users
- A/B test message templates
- Optimize delivery times

#### Full Deployment (Month 4+)
- All employees opt-in option
- Complete feature set
- Cost optimization
- Performance tuning

### Risk Mitigation

| Risk | Mitigation Strategy |
|------|-------------------|
| Template rejection | Pre-approve 10+ variations |
| API downtime | Fallback to email |
| High costs | Set spending limits, monitor daily |
| Low adoption | Education campaign, incentives |
| Privacy concerns | Clear consent, easy opt-out |
| Technical issues | Gradual rollout, monitoring |

### Success Criteria

#### Technical KPIs
- 99.9% delivery rate
- <2 second delivery time
- <0.1% error rate
- 100% audit compliance

#### Business KPIs
- 50% employee opt-in rate
- 80% message read rate
- 30% reduction in missed clock-outs
- 50% faster approval workflows

### Budget Estimate (Annual)

```
Setup Costs:
- Business verification: $0
- Dedicated phone line: $240/year
- Development (internal): 80 hours

Operational Costs (500 employees):
- Free tier: 1,000 conversations/month
- Estimated paid messages: 5,000/month
- Average cost: $0.03/message
- Monthly: $150
- Annual: $1,800

Total Year 1: ~$2,100 NZD
Cost per employee: ~$4.20/year
```

### Conclusion

WhatsApp Business API offers the most viable multi-channel notification solution for STEELIQ's New Zealand operations:

✅ **Immediate deployment** (vs 5-6 weeks for SMS)
✅ **High user adoption** (80%+ smartphone penetration)  
✅ **Cost-effective** (free 24-hour window)
✅ **Rich features** (photos, location, interactive)
✅ **Fortune 50 compliance** (audit trails, encryption)

Recommended immediate action: Begin Meta Business Account setup and verification process while finalizing message templates.