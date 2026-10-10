#!/bin/bash
# Leave Management System - Deployment & Testing Checklist

## Phase 1: Database Setup ✅ READY

### Execute Migration
```bash
npm run db:migrate
```
This will create the `employee_leave_requests` table with all indexes and constraints.

### Verify Table Creation
```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'employee_leave_requests';
SELECT indexname FROM pg_indexes WHERE tablename = 'employee_leave_requests';
```

## Phase 2: Backend Testing ✅ READY

### Run Unit Tests
```bash
npm run test --prefix server
```
This will execute:
- `server/tests/leaveService.test.js` - Service layer logic
- `server/tests/leaveIntegration.test.js` - Integration flow

### Manual Backend Testing
```bash
npm run dev
```
Then test these endpoints:

#### 1. Create Planned Leave Request (Employee)
```bash
curl -X POST http://localhost:5000/api/leave \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "leave_type": "PLANNED",
    "start_date": "2099-05-15",
    "end_date": "2099-05-17",
    "reason": "Vacation to visit family"
  }'
```
Expected Response: Status PENDING_DEPARTMENT_HEAD

#### 2. Get Department Head Approvals
```bash
curl -X GET http://localhost:5000/api/leave/approvals \
  -H "Authorization: Bearer <DEPT_HEAD_TOKEN>"
```
Should return the leave request from step 1

#### 3. Approve Leave as Department Head
```bash
curl -X POST http://localhost:5000/api/leave/1/decision \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <DEPT_HEAD_TOKEN>" \
  -d '{"decision": "APPROVE"}'
```
Expected Response: Status PENDING_HR_APPROVAL

#### 4. Get HR Approvals
```bash
curl -X GET http://localhost:5000/api/leave/approvals \
  -H "Authorization: Bearer <HR_TOKEN>"
```
Should return the leave request from step 1

#### 5. Approve Leave as HR
```bash
curl -X POST http://localhost:5000/api/leave/1/decision \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <HR_TOKEN>" \
  -d '{"decision": "APPROVE"}'
```
Expected Response: Status APPROVED

#### 6. Get User's Leave History
```bash
curl -X GET http://localhost:5000/api/leave/my-requests \
  -H "Authorization: Bearer <TOKEN>"
```
Should return all leave requests for that user

#### 7. Create Urgent Leave Request (Employee)
```bash
curl -X POST http://localhost:5000/api/leave \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "leave_type": "URGENT",
    "start_date": "2026-10-10",
    "end_date": "2026-10-10",
    "reason": "Emergency at home"
  }'
```
Expected Response: Status PENDING_HR_APPROVAL (bypasses department head!)

#### 8. Test Rejection with Reason
```bash
curl -X POST http://localhost:5000/api/leave/1/decision \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <DEPT_HEAD_TOKEN>" \
  -d '{
    "decision": "REJECT",
    "reason": "Cannot approve due to project deadline"
  }'
```
Expected Response: Status REJECTED, rejection_reason set

## Phase 3: Frontend Testing ✅ READY

### Build Frontend
```bash
npm run build --prefix frontend
```
Should compile without errors.

### Start Development Server
```bash
npm run dev
```

### Manual UI Testing

#### Test Case 1: Submit Planned Leave
1. Navigate to `/employee/my-attendance`
2. Scroll to "Leave Requests" section
3. Click "Raise a leave request"
4. Select "Planned leave"
5. Fill in:
   - Start Date: Select a future date (e.g., 2099-05-15)
   - End Date: Select same or later date (e.g., 2099-05-17)
   - Reason: "Vacation planning"
6. Click "Submit Leave Request"
7. Verify: Request appears in "My leave history" with status "Waiting for department head"

#### Test Case 2: Department Head Approves
1. Login as a department head (must have role MANAGER/ADMIN or designation containing "department head")
2. Navigate to `/employee/my-attendance`
3. Scroll to "Leave Requests" section
4. Look for "Pending leave approvals" section
5. Should see the leave request from Test Case 1
6. Click "Approve" button
7. Verify: Request status changes to "Waiting for HR"

#### Test Case 3: HR Approves
1. Login as HR user (must have role HR or SUPER_ADMIN)
2. Navigate to `/employee/my-attendance`
3. Scroll to "Pending leave approvals" section
4. Should see the leave request from Test Case 1 (now in HR approval stage)
5. Click "Approve" button
6. Verify: Request status changes to "Approved"

#### Test Case 4: Submit Urgent Leave
1. Navigate to `/employee/my-attendance`
2. Click "Raise a leave request"
3. Select "Urgent leave"
4. Fill in:
   - Start Date: Today or future date
   - End Date: Same or later date
   - Reason: "Emergency"
5. Click "Submit Leave Request"
6. Verify: Request appears in "My leave history" with status "Waiting for HR" (NOT "Waiting for department head")

#### Test Case 5: Reject with Reason
1. Login as department head
2. Navigate to `/employee/my-attendance`
3. In "Pending leave approvals", click "Reject" button
4. Fill in reason: "Project needs you during this time"
5. Click "Reject"
6. Verify: Request appears with status "Rejected"
7. Login as requesting employee
8. Verify: "Review note: Project needs you during this time" displays under the rejected request

#### Test Case 6: Date Validation
1. Try submitting with:
   - Start date in past: Should show error
   - End date before start date: Should show error
   - Invalid date (e.g., 2099-13-01): Should show error
   - Reason with < 3 chars: Should show error
   - Reason with > 2000 chars: Should show error

## Phase 4: End-to-End Workflow Testing

### Complete Flow: Planned Leave
Employee → Department Head Approval → HR Approval → Final Status

### Complete Flow: Urgent Leave
Employee → HR Approval → Final Status (skips Department Head)

### Role-Based Access Testing
- Employee: Can only see/create own requests
- Department Head: Can see and approve pending requests from their department
- HR: Can see and approve all pending HR requests
- Admin/Super Admin: Same as HR

## Phase 5: Edge Cases & Security

### Authorization Tests
- Non-department-head tries to approve: Should get 403 Forbidden
- Non-HR tries to approve HR stage: Should get 403 Forbidden
- Employee tries to approve own request: Should get error (forbidden)
- Department head from different department tries to approve: Should get 403 Forbidden

### Data Integrity Tests
- Try submitting duplicate same-day requests: Should be allowed (different requests)
- Try modifying a request after approval: Should be rejected (status immutable)
- Try accessing other employee's request: Should be forbidden or read-only

### Performance Tests
- Create 100+ leave requests
- Verify query performance for approval lists
- Check index usage with EXPLAIN ANALYZE

## Phase 6: Deployment Preparation

### Code Quality
- ✅ No console.log in production code
- ✅ Proper error handling throughout
- ✅ SQL injection prevention via parameterized queries
- ✅ XSS prevention via React
- ✅ CSRF protection via existing middleware

### Environment Variables
- Verify database connection strings
- Verify API endpoint configuration
- Verify JWT secret and token settings

### Database Backups
- Create database backup before running migration
- Test backup restoration process

## Success Criteria

- ✅ Database migration executes without errors
- ✅ All API endpoints return correct status codes
- ✅ Frontend component renders without errors
- ✅ Complete approval workflow functions end-to-end
- ✅ Planned leave routes through department head
- ✅ Urgent leave bypasses department head
- ✅ Authorization checks work correctly
- ✅ Date validation prevents invalid submissions
- ✅ Rejection reasons display properly
- ✅ No console errors in frontend
- ✅ No SQL errors in backend logs

## Support & Troubleshooting

### If migration fails:
1. Check PostgreSQL version (requires 10+)
2. Verify database connection
3. Check for existing `employee_leave_requests` table
4. Review migration syntax in `server/migrations/20261017_create_leave_requests.sql`

### If API returns 500 errors:
1. Check server logs for SQL errors
2. Verify user has employee record with department_id
3. Verify department head exists for department
4. Check token validity

### If frontend doesn't show leave section:
1. Verify component import in MyAttendance.jsx
2. Check browser console for JS errors
3. Verify API endpoint is accessible
4. Check auth token is being sent

### If approvals don't show up:
1. Verify user has correct role/designation
2. Verify user's department_id matches leave request's department_id
3. Check leave request status is PENDING_DEPARTMENT_HEAD or PENDING_HR_APPROVAL
4. Check user's employee record is active

## Contact & Questions

For issues or questions about the leave system, refer to:
- Backend logic: `server/services/leaveService.js`
- Database queries: `server/repositories/leaveRepository.js`
- Frontend UI: `frontend/src/components/attendance/LeaveRequests.jsx`
- Validation tests: `server/tests/leaveService.test.js`
