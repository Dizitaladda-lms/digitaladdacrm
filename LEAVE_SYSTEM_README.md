# Leave Request System - Quick Reference Guide

## 🎯 What Was Built

A complete leave management system integrated with the attendance module where employees can request leave (planned or urgent) with proper approval workflows:

- **Planned Leave**: Employee → Department Head Approval → HR Approval → Final Status
- **Urgent Leave**: Employee → HR Approval → Final Status (skips department head)

## 📂 Where to Find Everything

### Backend Files
| File | Location | Purpose |
|------|----------|---------|
| Database Migration | `server/migrations/20261017_create_leave_requests.sql` | Creates leave_requests table |
| Repository | `server/repositories/leaveRepository.js` | Data access & queries |
| Service | `server/services/leaveService.js` | Business logic |
| Controller | `server/controllers/leaveController.js` | HTTP handlers |
| Routes | `server/routes/leaveRoutes.js` | API endpoints |
| Tests | `server/tests/leaveService.test.js` | Unit tests |

### Frontend Files
| File | Location | Purpose |
|------|----------|---------|
| Component | `frontend/src/components/attendance/LeaveRequests.jsx` | React UI |
| Integration | `frontend/src/pages/employee/MyAttendance.jsx` | Embedded in attendance page |
| API Service | `frontend/src/services/attendanceService.js` | API calls |

## 🚀 Getting Started

### Step 1: Run Database Migration
```bash
npm run db:migrate
```

### Step 2: Build Frontend
```bash
npm run build --prefix frontend
```

### Step 3: Start Development Server
```bash
npm run dev
```

### Step 4: Test in Browser
Navigate to `/employee/my-attendance` and you'll see the leave request section below the attendance check-in.

## 🔗 API Endpoints

All endpoints require authentication (Bearer token).

### Create Leave Request
```
POST /api/leave
Content-Type: application/json

{
  "leave_type": "PLANNED",  // or "URGENT"
  "start_date": "2099-05-15",  // YYYY-MM-DD format
  "end_date": "2099-05-17",
  "reason": "Vacation"
}
```

### Get My Leave Requests
```
GET /api/leave/my-requests
```
Returns all leave requests by the authenticated user.

### Get Pending Approvals
```
GET /api/leave/approvals
```
Returns appropriate approvals based on user role:
- Department heads: See PENDING_DEPARTMENT_HEAD requests
- HR/Super Admin: See PENDING_HR_APPROVAL requests

### Approve/Reject Leave
```
POST /api/leave/{id}/decision
Content-Type: application/json

{
  "decision": "APPROVE",  // or "REJECT"
  "reason": "Cannot approve"  // optional, only for rejections
}
```

## 👥 User Roles & Permissions

### Employee
- Can submit planned or urgent leave requests
- Can see their own leave history and status
- Cannot see or approve other requests

### Department Head
- Has role "MANAGER" or "ADMIN"
- OR has designation containing "department head" or "head of department"
- Sees PENDING_DEPARTMENT_HEAD requests from their department(s)
- Can approve/reject planned leave requests
- Cannot approve urgent leave (goes straight to HR)
- Can manage multiple departments via `managed_department_ids` JSONB

### HR/Super Admin
- Has role "HR" or "SUPER_ADMIN"
- Sees all PENDING_HR_APPROVAL requests (both planned and urgent)
- Can approve/reject any leave request at final approval stage
- Cannot approve at department head stage

## 📋 Leave Request Status Flow

```
PLANNED LEAVE:
  PENDING_DEPARTMENT_HEAD
      ↓ (Department Head approves)
  PENDING_HR_APPROVAL
      ↓ (HR approves/rejects)
  APPROVED or REJECTED

URGENT LEAVE:
  PENDING_HR_APPROVAL (skips department head)
      ↓ (HR approves/rejects)
  APPROVED or REJECTED
```

## ✅ Validation Rules

### Date Validation
- Format: YYYY-MM-DD (ISO 8601)
- Valid calendar dates only (Feb 31 rejected)
- For PLANNED leave: start_date must be > today
- For URGENT leave: start_date can be today or future
- end_date must be >= start_date

### Reason Validation
- Length: 3-2000 characters (required)
- No special validation, free-form text

### Employee Validation
- Must have active employee profile
- Must have department_id assigned
- For PLANNED: Department must have configured department head

## 🔐 Security Features

1. **Transaction-based Approvals** - Database-level locking prevents race conditions
2. **Role-based Authorization** - Multiple checkpoints for each approval stage
3. **Status Immutability** - Once reviewed, status cannot be changed
4. **SQL Injection Prevention** - All queries use parameterized statements
5. **XSS Prevention** - React component sanitizes output
6. **Self-approval Prevention** - Users cannot approve their own requests

## 📊 Database Schema

### Table: employee_leave_requests
```sql
id (BIGINT, PK)
user_id (BIGINT, FK -> users)
employee_id (BIGINT, FK -> employees)
department_id (BIGINT, FK -> departments)
leave_type (VARCHAR: 'PLANNED', 'URGENT')
start_date (DATE)
end_date (DATE)
reason (TEXT)
status (VARCHAR: 'PENDING_DEPARTMENT_HEAD', 'PENDING_HR_APPROVAL', 'APPROVED', 'REJECTED')
department_head_id (BIGINT, FK -> users)
department_head_reviewed_at (TIMESTAMPTZ)
hr_id (BIGINT, FK -> users)
hr_reviewed_at (TIMESTAMPTZ)
rejection_reason (TEXT)
created_at (TIMESTAMPTZ)
updated_at (TIMESTAMPTZ)
```

### Indexes
- `idx_employee_leave_requests_user_created` - Query user's history
- `idx_employee_leave_requests_status_department` - Filter approvals

## 🧪 Testing

### Run Unit Tests
```bash
npm run test --prefix server
```

### Manual Testing Checklist
See `LEAVE_SYSTEM_TESTING.md` for complete testing guide including:
- Planned leave full flow
- Urgent leave full flow
- Rejection with reason
- Date validation
- Authorization checks
- Role-based access control

## 🐛 Troubleshooting

### Leave section not showing
- Check that component is imported in MyAttendance.jsx ✓
- Check browser console for JS errors
- Verify authentication token is valid

### Can't submit leave
- Verify employee has department_id in profile
- Verify department has configured department head (for planned leave)
- Check date is in correct format (YYYY-MM-DD)
- Check reason is 3-2000 characters

### Department head can't approve
- Verify user has role MANAGER/ADMIN or matching designation
- Verify user's department_id or managed_department_ids JSONB includes the leave request's department
- Verify user's employee record is active
- Verify leave status is PENDING_DEPARTMENT_HEAD

### HR doesn't see approvals
- Verify user has role HR or SUPER_ADMIN
- Verify leave status is PENDING_HR_APPROVAL
- Check database connection and query logs

## 📞 Support

For detailed implementation information, see:
- `LEAVE_SYSTEM_VALIDATION.md` - Complete system validation
- `LEAVE_SYSTEM_TESTING.md` - Comprehensive testing guide
- Individual source files for specific implementation details

## 🎓 Key Implementation Highlights

### Multi-Department Manager Support
Uses PostgreSQL JSONB `@>` operator to query `managed_department_ids` array:
```sql
WHERE department_id = $1 
   OR managed_department_ids @> jsonb_build_array($1::bigint)
```

### Role Detection
Checks both current role AND designation to support legacy data:
```javascript
isDepartmentHead = role IN ('MANAGER', 'ADMIN') 
                  OR designation LIKE '%department head%'
```

### Transaction Safety
Uses database-level row locking for concurrent approval safety:
```sql
SELECT ... FOR UPDATE OF lr
```

### Status Routing
Automatic routing based on leave type at creation:
```
PLANNED → PENDING_DEPARTMENT_HEAD
URGENT → PENDING_HR_APPROVAL
```

## 📈 Performance Considerations

- Indexed queries for fast approval queue retrieval
- Lazy-loaded component in React (doesn't block attendance page load)
- Connection pooling for database queries
- Transaction timeouts to prevent locks

## 🚀 Future Enhancements

Possible improvements:
- Notification system for leave approvals
- Email notifications to approvers
- Leave balance tracking
- Recurring/annual leave allocation
- Public holidays calendar integration
- Bulk leave approval for managers
- Leave report generation
- Approval workflow customization per department

---

**System Status**: ✅ Complete and Ready for Testing

**Last Updated**: 2026-10-17
**Version**: 1.0.0
