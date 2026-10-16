import { useState } from "react";

import Modal from "../common/Modal/Modal";

import "../../styles/LeadManagement/LeadAssignmentModal.css";

import {
    Users,
    UserCheck,
} from "lucide-react";

const LeadAssignmentModal = ({
    open,
    loading = false,
    selectedLeads = [],
    employees = [],
    currentUser = null,
    onClose,
    onAssign,
}) => {
    const [employeeId, setEmployeeId] = useState("");
    const [assignmentType, setAssignmentType] = useState("MANUAL");
    const [priority, setPriority] = useState("NORMAL");
    const [note, setNote] = useState("");

    const myEmployee = employees.find((emp) =>
        (currentUser?.employee_id && String(emp.id) === String(currentUser.employee_id)) ||
        (currentUser?.id && String(emp.user_id) === String(currentUser.id)) ||
        (currentUser?.full_name && emp.full_name && emp.full_name.trim().toLowerCase() === currentUser.full_name.trim().toLowerCase())
    );

    const handleSubmit = () => {
        if (!employeeId) return;

        onAssign({
            employee_id: employeeId,
            assignment_type: assignmentType,
            priority,
            note,
            lead_ids: selectedLeads,
        });
    };

    return (
        <Modal
            open={open}
            title="Assign Leads"
            subtitle="Assign selected leads to an employee or self-assign"
            size="lg"
            loading={loading}
            onClose={onClose}
        >
            <div className="assignment-summary">
                <Users size={24}/>
                <div>
                    <h3>{selectedLeads.length}</h3>
                    <p>Leads Selected</p>
                </div>
            </div>

            <div className="assignment-form">
                <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label style={{ margin: 0, fontWeight: "600" }}>Employee / Assignee</label>
                        {myEmployee && (
                            <button
                                type="button"
                                onClick={() => setEmployeeId(String(myEmployee.id))}
                                style={{
                                    background: String(employeeId) === String(myEmployee.id) ? "#eff6ff" : "#f8fafc",
                                    color: String(employeeId) === String(myEmployee.id) ? "#2563eb" : "#475569",
                                    border: String(employeeId) === String(myEmployee.id) ? "1.5px solid #3b82f6" : "1px solid #cbd5e1",
                                    padding: "4px 10px",
                                    borderRadius: "16px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    transition: "all 0.15s ease",
                                }}
                            >
                                ⚡ Assign to Myself ({myEmployee.full_name})
                            </button>
                        )}
                    </div>

                    <select
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                    >
                        <option value="">Select Employee</option>
                        {employees.map((employee) => {
                            const isSelf = myEmployee && String(employee.id) === String(myEmployee.id);
                            return (
                                <option key={employee.id} value={employee.id}>
                                    {employee.full_name} {isSelf ? "⭐ (Myself / Manager)" : employee.designation ? `(${employee.designation})` : `(${employee.role})`}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="form-group">

                    <label>

                        Assignment Type

                    </label>

                    <select

                        value={assignmentType}

                        onChange={(e)=>

                            setAssignmentType(e.target.value)

                        }

                    >

                        <option value="MANUAL">

                            Manual

                        </option>

                        <option value="ROUND_ROBIN">

                            Round Robin

                        </option>

                    </select>

                </div>

                <div className="form-group">

                    <label>

                        Priority

                    </label>

                    <select

                        value={priority}

                        onChange={(e)=>

                            setPriority(e.target.value)

                        }

                    >

                        <option value="LOW">

                            Low

                        </option>

                        <option value="NORMAL">

                            Normal

                        </option>

                        <option value="HIGH">

                            High

                        </option>

                    </select>

                </div>

                <div className="form-group">

                    <label>

                        Assignment Note

                    </label>

                    <textarea

                        rows="4"

                        value={note}

                        onChange={(e)=>

                            setNote(e.target.value)

                        }

                        placeholder="Write note..."

                    />

                </div>

            </div>

            <div className="assignment-footer">

                <button

                    className="cancel-btn"

                    onClick={onClose}

                >

                    Cancel

                </button>

                <button

                    className="assign-btn"

                    disabled={!employeeId || loading}

                    onClick={handleSubmit}

                >

                    <UserCheck size={18}/>

                    Assign Leads

                </button>

            </div>

        </Modal>

    );

};

export default LeadAssignmentModal;