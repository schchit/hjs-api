# Privacy Policy

**Last Updated: February 18, 2026**

Thank you for using the HJS API (hereinafter referred to as "the Service"). The Service is operated by **Human Judgment Systems Foundation Ltd.** (Singapore CLG, hereinafter referred to as "we," "the Foundation," or "HJS"). We are committed to protecting your privacy and handling your data in a transparent and secure manner.

**As a structured event tracing infrastructure, our core principles are:**
- **Data Minimization**: We only collect data necessary to provide the Service.
- **Transparency**: We clearly explain how data is collected, used, and retained.
- **Long-term Verifiability**: Through optional anchoring mechanisms, we aim to support the independent verification of your records, even if you leave our Service.

By using the Service, you acknowledge that you have read and understood this Privacy Policy.

---

## 1. Data We Collect

### 1.1 Data You Provide
When you use the Service via the API, the data you actively send is recorded. This includes:
- **Entity Identifier** (`entity` field): The identifier of the entity making the judgment, which may be a user ID, system name, email address, etc.
  - **Please Note**: We recommend avoiding the transmission of sensitive personal information (such as ID numbers, bank account numbers, medical records) in this field.
- **Action Description** (`action` field): The specific action being recorded.
- **Scope Data** (`scope` field): Business context data related to the record (e.g., amount, permission scope, risk score).
- **Timestamp** (`timestamp` field): The time of the event you provide. If not provided, the server time will be used.
- **Anchoring Strategy** (`immutability` field): The type of immutability anchor you choose and related options (optional).

### 1.2 Automatically Collected Data
To ensure the security and stable operation of the Service, we automatically record the following technical data:
- **API Key Identifier**: Used to identify the caller, but the key itself is not stored.
- **IP Address**: Used for security protection, rate limiting, and abnormal behavior analysis.
- **Request Time**: The precise timestamp of each API call.
- **User-Agent**: The type and version of the calling client (e.g., `curl/7.68.0`, `Node.js/18.0.0`).
- **Request Path and Parameters**: The specific API endpoints and query parameters you access.

### 1.3 Data We Do NOT Collect
- We **do not** actively collect your name, address, phone number, ID number, or other personal identification information.
- We **do not** use any third-party advertising, analytics, or tracking tools (such as Google Analytics).
- We **do not** sell, rent, or share your data with any third party for marketing purposes.

---

## 2. How We Use Data

We use the collected data only for the following specified purposes:

| Purpose | Description |
|---------|-------------|
| **Providing the Service** | Processing your API requests, recording, storing, and returning event data – the core function of the Service. |
| **Event Tracing** | Providing structured event records for traceability, serving as a source of evidence for external audits, compliance analysis, or responsibility determination. |
| **Security Protection** | Monitoring for abnormal call patterns, preventing service abuse, DDoS attacks, and unauthorized access. |
| **Troubleshooting** | Diagnosing and fixing service errors to improve API stability. |
| **Compliance Response** | Providing relevant records when required by legal directives (e.g., court orders). |
| **Service Improvement** | Optimizing API performance, documentation, and developer experience based on anonymized aggregate data. |

**We will never** use your data for any form of advertising, user profiling, or commercial promotion.

---

## 3. Data Retention and Deletion

As an event tracing infrastructure, we balance **long-term verifiability** with the **data minimization** principle.

### 3.1 Retention Periods

| Data Type | Retention Period | Description |
|-----------|------------------|-------------|
| **Event Records** (`judgments` table) | **7 years** | Covers common needs for finance, auditing, and legal proceedings, complementing optional anchoring mechanisms. |
| **Audit Logs** (`audit_logs` table) | **1 year** | Used for security analysis and troubleshooting; logs older than 1 year are automatically anonymized. |
| **API Key Records** (`api_keys` table) | Permanently retained until you revoke them | Keys are credentials for access and need to be valid long-term. You can revoke them at any time in the console. |
| **Anchor Proofs** (`anchor_proof` field) | Same as the corresponding event record | Stored as cryptographic evidence alongside the record. |

**Note on Retention Periods**: The above periods are the server-side defaults. Implementers may configure shorter or longer retention policies. We do not mandate that users adhere to specific retention periods.

### 3.2 Data Deletion
You can request data deletion through the following methods:

| Data Type | Deletion Method | Processing Time |
|-----------|-----------------|-----------------|
| **API Key** | Revoke it yourself in the [Developer Console](https://console.hjs.sh) | Immediate |
| **Event Record** | Send an email to `privacy@humanjudgment.org` with the record ID and your API key | Within 30 days |
| **All Data for an Email** | Send an email to `privacy@humanjudgment.org` with the email address and API key | Within 30 days |

**Please Note**: Deletion requests are subject to legal retention obligations. For example, if a record is part of ongoing legal proceedings, we may need to pause its deletion.

### 3.3 Independence of Anchor Proofs
Even if you request deletion of your event records, any anchor proof files you have previously downloaded (e.g., `.ots` files) remain valid. These files are anchored on public blockchains and **exist independently of our Service**, and can be verified at any time using compatible tools.

---

## 4. Data Storage and Security

### 4.1 Storage Location
All data is stored on servers located in **Singapore**, hosted by [Render.com](https://render.com). The Singapore Personal Data Protection Act (PDPA) is widely regarded as a standard comparable to the GDPR.

### 4.2 Security Measures
We employ multiple layers of security measures to protect your data:

| Layer | Measures |
|-------|----------|
| **Transmission Encryption** | All API communication is encrypted with TLS 1.3, mandating HTTPS. |
| **Storage Encryption** | Data at rest in the database is encrypted using AES-256. |
| **Access Control** | Strict internal permissions; only core maintainers can access the production environment, and all access is logged. |
| **Backup Strategy** | Daily automated backups, retained for 30 days; backups are also encrypted. |
| **Network Security** | Servers are located in Render's Virtual Private Cloud, with non-essential ports closed by default. |

### 4.3 Third-Party Services
We use the following third-party services, and their respective data processing policies apply:

| Service Provider | Purpose | Privacy Policy |
|------------------|---------|----------------|
| **Render.com** | Application hosting, database, static files | [Render Privacy Policy](https://render.com/privacy) |
| **GitHub** | Code hosting, issue tracking, documentation | [GitHub Privacy Policy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement) |
| **OpenTimestamps** | Optional anchoring service (only when you choose to use it) | OTS is an open protocol and does not involve data collection |

---

## 5. Your Rights

Under applicable data protection laws (such as the GDPR, Singapore PDPA, and China's Personal Information Protection Law), you may have the following rights:

| Right | Description |
|-------|-------------|
| **Right to be Informed** | To know what data we collect and how it is used. This policy serves this purpose. |
| **Right of Access** | To request a copy of the data we hold about you. |
| **Right to Rectification** | To request correction of inaccurate or incomplete data. |
| **Right to Erasure** | To request deletion of your data, subject to legal retention obligations. |
| **Right to Restrict Processing** | To request that we suspend the processing of your data in certain circumstances. |
| **Right to Data Portability** | To receive a copy of your data in a structured, commonly used format. |
| **Right to Lodge a Complaint** | To lodge a complaint with your local data protection authority. |

To exercise any of these rights, please contact us using the information below. We will respond within 30 days.

---

## 6. International Data Transfers

Our servers are located in Singapore. If you use the Service from other countries, your data will be transferred to Singapore. By using the Service, you consent to this transfer.

For users from the European Economic Area, we rely on **Standard Contractual Clauses (SCCs)** to ensure the legality of data transfers. Copies of these clauses are available upon request.

---

## 7. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in law, service improvements, or regulatory requirements. Material changes will be announced in advance through:

- Updating the "Last Updated" date at the top of this page
- Posting an announcement in the **Releases** or **Discussions** section of our GitHub repository
- For significant changes, we may send a notification to your registered email address (if provided)

We encourage you to review this page periodically for the latest information. Your continued use of the Service after changes are posted constitutes your acceptance of the updated terms.

---

## 8. Contact Us

If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us:

| Method | Contact | Description |
|--------|---------|-------------|
| **Email** | `privacy@humanjudgment.org` | For data protection inquiries |
| **GitHub Issues** | [hjs-api/issues](https://github.com/schchit/hjs-api/issues) | Please do not submit sensitive data in Issues |
| **Mailing Address** | Human Judgment Systems Foundation Ltd.<br>10 Anson Road, #22-02<br>International Plaza<br>Singapore 079903 | For legal correspondence |

---

## Appendix: Terminology

| Term | Description |
|------|-------------|
| **Event Record** | Business data created via the `POST /judgments` endpoint, containing fields like `entity`, `action`, and `scope`. |
| **Audit Log** | Operational logs recording who called which API and when, used for security auditing. |
| **Anchor Proof** | A file, such as those generated by OpenTimestamps (`.ots`), providing cryptographic evidence that a record existed at a specific point in time. |
| **CLG** | "Company Limited by Guarantee," a non-profit legal entity structure registered in Singapore. |

---

**© 2026 Human Judgment Systems Foundation Ltd.**  
This policy is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).