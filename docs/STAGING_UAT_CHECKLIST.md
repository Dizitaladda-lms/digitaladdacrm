# 📋 DIZITALADDA CRM - Staging User Acceptance Testing (UAT) Checklist

This checklist must be executed on the Staging environment prior to production sign-off.

---

## 1. Authentication & Security (Role-Access Matrix)

| Test Case | Steps | Expected Result | Pass / Fail |
|:---|:---|:---|:---:|
| **Admin Login** | Sign in using `admin@dizitaladda.com` | Redirects to `/dashboard`; Admin navigation (Leads, Staff, Campaigns, Admissions, Settings) visible. | [ ] |
| **Counsellor Login** | Sign in using `counsellor@dizitaladda.com` | Redirects to `/employee/dashboard`; Counsellor sidebar (My Leads, My Followups, My Admissions, Performance) visible. | [ ] |
| **Role Boundary Protection** | Counsellor accesses `/leads` or `/employees` directly | Blocked with 403 Forbidden / redirected to `/employee/dashboard`. | [ ] |
| **Public Registration Escalation** | POST `/api/auth/register` with `role: "ADMIN"` | Role is forced to `COUNSELLOR` or rejected. No admin privileges granted. | [ ] |
| **Password Reset Security** | Submit `/api/auth/forgot-password` with valid user email | Returns generic success message. **Reset token is NEVER returned in response body**. | [ ] |
| **Token Refresh** | Call `/api/auth/refresh-token` with valid cookie/body | Returns new access token without requiring re-login. | [ ] |
| **Logout** | Click Logout on Sidebar | Tokens invalidated, redirected to `/`, browser storage cleared. | [ ] |

---

## 2. Public Lead Capture & Duplicate Protection

| Test Case | Steps | Expected Result | Pass / Fail |
|:---|:---|:---|:---:|
| **New Lead Enquiry** | Submit website form with new mobile (`9876500099`) | New lead created with status `NEW`, lead code generated, activity logged. | [ ] |
| **Duplicate Lead Resubmission** | Assign existing lead to Counsellor A, update status to `FOLLOW_UP`. Resubmit public form with same mobile. | **Counsellor assignment, notes, and `FOLLOW_UP` status are PRESERVED**. Timeline logs `LEAD_RESUBMITTED`. | [ ] |

---

## 3. Admission & Fee Ledger (Enrolled Details Freeze)

| Test Case | Steps | Expected Result | Pass / Fail |
|:---|:---|:---|:---:|
| **Lead to Admission** | Open lead drawer, mark status `ENROLLED`, fill course fee and initial installment. | Admission created, ledger entry generated, fee status calculated. | [ ] |
| **Enrolled Details Freeze** | Re-open enrolled student drawer | Personal details (Name, DOB, Mobile) and Academic fields are **LOCKED / disabled**. Only fee installments and notes are editable. | [ ] |
| **Installment Payment** | Add second payment installment (₹15,000 via UPI) | Paid fee increases, pending balance decreases, transaction ledger updates in real time. | [ ] |

---

## 4. Universal Data Exports (CSV / Excel)

| Test Case | Page / Location | Expected Result | Pass / Fail |
|:---|:---|:---:|:---:|
| **Admin Leads Export** | Lead Management (`/leads`) -> "Export CSV" | Downloads `.csv` containing filtered leads with UTF-8 BOM encoding. | [ ] |
| **Admissions Ledger Export** | Admission Management (`/admissions`) -> "Export CSV Ledger" | Downloads full student fee ledger with payment breakdown. | [ ] |
| **Counsellor Admissions Export** | My Admissions (`/employee/admissions`) -> "Export CSV" | Downloads assigned students & fee collection records. | [ ] |
| **Staff Directory Export** | Staff Management (`/employees`) -> "Export Staff" | Downloads employee roster with designations and statuses. | [ ] |
| **Campaigns Export** | Campaigns (`/campaigns`) -> "Export CSV" | Downloads marketing campaigns, budgets, and lead counts. | [ ] |
| **Follow-up Planner Export** | My Follow-ups (`/employee/followups`) -> "Export CSV" | Downloads daily callbacks and scheduled task list. | [ ] |

---

## 5. Mobile Responsiveness & Layout Stability

| Test Case | Screen Resolution | Expected Result | Pass / Fail |
|:---|:---|:---:|:---:|
| **Mobile Login Screen** | 375px x 667px (iPhone SE) / 390px (iPhone 14) | Single column layout, no horizontal scroll, logo aspect-ratio preserved (CLS < 0.1). | [ ] |
| **Mobile Counsellor Dashboard** | 390px width | Responsive tables with horizontal swipe, drawer renders bottom-sheet cleanly. | [ ] |
