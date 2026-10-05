import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Users,
  Building2,
  UserCheck,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Network,
  Phone,
  Mail,
  User,
  ExternalLink,
  Layers,
  ArrowRight,
  RefreshCw,
  FolderTree,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { getEmployees, updateEmployee } from "../../services/employeeService";
import { getDepartments } from "../../services/departmentService";
import { useAuth } from "../../context/AuthContext";
import "./OrganizationTree.css";

// Role-based badge styling
const getRoleTheme = (role = "") => {
  const r = String(role).toUpperCase();
  if (r.includes("SUPER_ADMIN")) {
    return { bg: "#f3e8ff", color: "#7e22ce", border: "#d8b4fe", label: "Super Admin", avatarBg: "#7e22ce" };
  }
  if (r.includes("ADMIN")) {
    return { bg: "#e0e7ff", color: "#4338ca", border: "#a5b4fc", label: "Admin", avatarBg: "#4338ca" };
  }
  if (r.includes("MANAGER")) {
    return { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd", label: "Manager", avatarBg: "#1d4ed8" };
  }
  if (r.includes("TL") || r.includes("LEAD")) {
    return { bg: "#dcfce7", color: "#15803d", border: "#86efac", label: "Team Leader", avatarBg: "#15803d" };
  }
  if (r.includes("COUNSELLOR")) {
    return { bg: "#e0f2fe", color: "#0369a1", border: "#7dd3fc", label: "Counsellor", avatarBg: "#0369a1" };
  }
  if (r.includes("TRAINER")) {
    return { bg: "#fef3c7", color: "#b45309", border: "#fde68a", label: "Trainer", avatarBg: "#b45309" };
  }
  if (r.includes("INTERN")) {
    return { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", label: "Intern", avatarBg: "#475569" };
  }
  return { bg: "#f8fafc", color: "#334155", border: "#cbd5e1", label: role || "Staff", avatarBg: "#2563eb" };
};

const getInitials = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
};

// Helper: Calculate total nested reports
const computeSubtreeCount = (node) => {
  if (!node.children || node.children.length === 0) {
    node.totalReports = 0;
    return 1;
  }
  let count = 0;
  for (const child of node.children) {
    count += computeSubtreeCount(child);
  }
  node.totalReports = count;
  return count + 1;
};

// Recursive Tree Node Component
const OrgNode = ({
  node,
  expandedIds,
  onToggleExpand,
  onSelectNode,
  selectedId,
  searchQuery,
  highlightedId,
}) => {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isHighlighted =
    highlightedId === node.id ||
    (searchQuery &&
      (node.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.employee_code?.toLowerCase().includes(searchQuery.toLowerCase())));

  const hasChildren = node.children && node.children.length > 0;
  const roleTheme = getRoleTheme(node.role);
  const initials = getInitials(node.full_name);

  return (
    <div className="org-tree-node-wrapper" style={{ "--children-count": node.children?.length || 1 }}>
      {/* Node Card */}
      <div
        className={`org-card ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode(node);
        }}
      >
        <div className="org-card-top">
          {node.profile_image ? (
            <div style={{ position: "relative" }}>
              <img src={node.profile_image} alt={node.full_name} className="org-avatar" />
              {node.today_attendance_status === "PRESENT" && <span className="org-online-dot" title="Present Today" />}
            </div>
          ) : (
            <div className="org-avatar" style={{ background: roleTheme.avatarBg }}>
              {initials || "EM"}
              {node.today_attendance_status === "PRESENT" && <span className="org-online-dot" title="Present Today" />}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="org-card-title" title={node.full_name}>
              {node.full_name}
            </div>
            <div className="org-card-code">{node.employee_code || `#${node.id}`}</div>
          </div>
        </div>

        <div className="org-card-badges">
          <span
            className="org-badge org-badge-role"
            style={{ background: roleTheme.bg, color: roleTheme.color, borderColor: roleTheme.border }}
          >
            {node.designation || roleTheme.label}
          </span>
          {node.department_name && (
            <span className="org-badge org-badge-dept">
              <Building2 size={10} /> {node.department_name}
            </span>
          )}
        </div>

        {/* Footer with Subordinates & Expand Button */}
        <div className="org-card-footer">
          <span>
            {hasChildren ? (
              <strong style={{ color: "#0f172a" }}>
                👥 {node.children.length} direct {node.totalReports > node.children.length ? `(${node.totalReports} total)` : ""}
              </strong>
            ) : (
              <span style={{ color: "#94a3b8" }}>Individual Contributor</span>
            )}
          </span>

          {hasChildren && (
            <button
              type="button"
              className={`org-expand-btn ${isExpanded ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              title={isExpanded ? "Collapse Subordinates" : "Expand Subordinates"}
            >
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {node.children.length}
            </button>
          )}
        </div>
      </div>

      {/* Children Sub-tree with Connectors */}
      {hasChildren && isExpanded && (
        <>
          <div className="org-parent-connector" />
          <div className="org-children-container" style={{ "--children-count": node.children.length }}>
            {node.children.map((child) => (
              <OrgNode
                key={child.id}
                node={child}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onSelectNode={onSelectNode}
                selectedId={selectedId}
                searchQuery={searchQuery}
                highlightedId={highlightedId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function OrganizationTree() {
  const { user } = useAuth();
  const canEditManager = ["SUPER_ADMIN", "ADMIN", "HR"].includes(user?.role);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [selectedDeptId, setSelectedDeptId] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [hierarchyMode, setHierarchyMode] = useState("REPORTING"); // "REPORTING" | "DEPARTMENT" | "LIST"
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const viewportRef = useRef(null);

  // Quick manager update in drawer
  const [isUpdatingManager, setIsUpdatingManager] = useState(false);
  const [newManagerId, setNewManagerId] = useState("");
  const [savingManager, setSavingManager] = useState(false);

  // 1. Fetch Employees and Departments
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, deptRes] = await Promise.all([
        getEmployees({ limit: 1000 }),
        getDepartments(),
      ]);

      const empList = empRes?.data?.employees || empRes?.employees || [];
      const deptList = deptRes?.data || deptRes || [];

      setEmployees(empList);
      setDepartments(deptList);

      // Default expand top 2 levels
      const initialExpanded = new Set();
      empList.forEach((emp) => {
        if (!emp.reporting_manager_id) {
          initialExpanded.add(emp.id);
        }
      });
      setExpandedIds(initialExpanded);
    } catch (err) {
      console.error("Failed to load organization data:", err);
      toast.error("Could not load organization hierarchy.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Build Reporting Hierarchy Tree
  const { treeRoots, unassignedEmployees, totalManagersCount } = useMemo(() => {
    if (!employees || employees.length === 0) {
      return { treeRoots: [], unassignedEmployees: [], totalManagersCount: 0 };
    }

    // Filter by department if selected
    let filteredList = employees;
    if (selectedDeptId !== "ALL") {
      filteredList = employees.filter((e) => String(e.department_id) === String(selectedDeptId));
    }

    const employeeMap = new Map();
    filteredList.forEach((e) => {
      employeeMap.set(String(e.id), { ...e, children: [] });
    });

    const roots = [];
    const unassigned = [];
    let managersCount = 0;

    // Link subordinates to their managers
    employeeMap.forEach((emp) => {
      const managerId = emp.reporting_manager_id ? String(emp.reporting_manager_id) : null;
      if (managerId && employeeMap.has(managerId) && managerId !== String(emp.id)) {
        employeeMap.get(managerId).children.push(emp);
      } else {
        // Top-level or no manager within current scope
        if (!emp.reporting_manager_id) {
          roots.push(emp);
        } else {
          // Has a manager outside current department filter or inactive
          roots.push(emp);
        }
      }
    });

    // Compute nested counts & count managers
    employeeMap.forEach((emp) => {
      if (emp.children.length > 0) {
        managersCount++;
      }
    });

    roots.forEach((root) => computeSubtreeCount(root));

    // Sort roots: Super Admin & Managers first, then alphabetically
    roots.sort((a, b) => {
      const rank = (role) => {
        const r = String(role).toUpperCase();
        if (r.includes("SUPER_ADMIN")) return 1;
        if (r.includes("ADMIN")) return 2;
        if (r.includes("MANAGER")) return 3;
        if (r.includes("TL") || r.includes("LEAD")) return 4;
        return 5;
      };
      const diff = rank(a.role) - rank(b.role);
      if (diff !== 0) return diff;
      return (a.full_name || "").localeCompare(b.full_name || "");
    });

    return { treeRoots: roots, unassignedEmployees: unassigned, totalManagersCount: managersCount };
  }, [employees, selectedDeptId]);

  // 3. Search and Auto-Expand Path to Matching Node
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setHighlightedId(null);
      return;
    }

    const q = query.toLowerCase().trim();
    const match = employees.find(
      (e) =>
        e.full_name?.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q)
    );

    if (match) {
      setHighlightedId(match.id);
      // Auto-expand all ancestors up to root
      const newExpanded = new Set(expandedIds);
      let curr = match;
      while (curr && curr.reporting_manager_id) {
        newExpanded.add(curr.reporting_manager_id);
        curr = employees.find((e) => String(e.id) === String(curr.reporting_manager_id));
      }
      setExpandedIds(newExpanded);
      setSelectedEmployee(match);
    }
  };

  // 4. Expand / Collapse Toggles
  const handleToggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const all = new Set(employees.map((e) => e.id));
    setExpandedIds(all);
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  // 5. Zoom Handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))));
  const handleResetZoom = () => setZoomLevel(1);

  // 6. Handle Manager Quick Reassign from Drawer
  const handleSaveManager = async () => {
    if (!selectedEmployee) return;
    try {
      setSavingManager(true);
      const managerVal = newManagerId === "NONE" || !newManagerId ? null : Number(newManagerId);

      await updateEmployee(selectedEmployee.id, {
        reporting_manager_id: managerVal,
      });

      toast.success(`Reporting manager updated for ${selectedEmployee.full_name}!`);
      setIsUpdatingManager(false);
      await fetchData();

      // Update drawer selection
      setSelectedEmployee((prev) => ({
        ...prev,
        reporting_manager_id: managerVal,
        reporting_manager_name: employees.find((e) => e.id === managerVal)?.full_name || null,
      }));
    } catch (err) {
      console.error("Failed to update reporting manager:", err);
      toast.error(err?.response?.data?.message || "Failed to update reporting manager.");
    } finally {
      setSavingManager(false);
    }
  };

  return (
    <div className="org-tree-page">
      {/* Header Banner */}
      <div className="org-header-banner">
        <div>
          <div className="org-header-tags">
            <span className="org-tag">
              <Network size={14} /> Organizational Structure
            </span>
            <span
              style={{
                background: "rgba(16, 185, 129, 0.2)",
                color: "#34d399",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid rgba(52, 211, 153, 0.3)",
              }}
            >
              <ShieldCheck size={14} /> Live Hierarchy Flow
            </span>
          </div>

          <h1 className="org-header-title">Company Employee Hierarchy & Reporting Tree</h1>
          <p className="org-header-sub">
            Interactive organization chart showing direct supervisors, team leaders, and subordinate reporting lines.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={fetchData} className="org-btn" title="Refresh Tree Data">
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Top Stat Summary Cards */}
      <div className="org-stats-grid">
        <div className="org-stat-card">
          <div className="org-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Users size={22} />
          </div>
          <div className="org-stat-info">
            <div className="label">Total Workforce</div>
            <div className="value">{employees.length}</div>
          </div>
        </div>

        <div className="org-stat-card">
          <div className="org-stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
            <UserCheck size={22} />
          </div>
          <div className="org-stat-info">
            <div className="label">Managers & Team Leads</div>
            <div className="value">{totalManagersCount}</div>
          </div>
        </div>

        <div className="org-stat-card">
          <div className="org-stat-icon" style={{ background: "#faf5ff", color: "#9333ea" }}>
            <Building2 size={22} />
          </div>
          <div className="org-stat-info">
            <div className="label">Departments</div>
            <div className="value">{departments.length}</div>
          </div>
        </div>

        <div className="org-stat-card">
          <div className="org-stat-icon" style={{ background: "#fff7ed", color: "#ea580c" }}>
            <FolderTree size={22} />
          </div>
          <div className="org-stat-info">
            <div className="label">Top-Level Root Leaders</div>
            <div className="value">{treeRoots.length}</div>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="org-toolbar">
        {/* Live Search */}
        <div className="org-search-box">
          <Search
            size={17}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
          />
          <input
            type="text"
            placeholder="Search employee name, code, or designation..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="org-search-input"
          />
          {searchQuery && (
            <X
              size={15}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "#94a3b8",
              }}
              onClick={() => handleSearch("")}
            />
          )}
        </div>

        {/* Department Filter */}
        <select
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          className="org-filter-select"
        >
          <option value="ALL">🏢 All Departments ({employees.length})</option>
          {departments.map((dept) => {
            const count = employees.filter((e) => String(e.department_id) === String(dept.id)).length;
            return (
              <option key={dept.id} value={dept.id}>
                {dept.department_name} ({count})
              </option>
            );
          })}
        </select>

        {/* View Mode Toggle */}
        <div className="org-btn-group">
          <button
            onClick={() => setHierarchyMode("REPORTING")}
            className={`org-btn ${hierarchyMode === "REPORTING" ? "org-btn-primary" : ""}`}
            title="Tree view showing reporting relationships"
          >
            <Network size={15} /> Org Chart
          </button>
          <button
            onClick={() => setHierarchyMode("LIST")}
            className={`org-btn ${hierarchyMode === "LIST" ? "org-btn-primary" : ""}`}
            title="Directory list view"
          >
            <ListFilter size={15} /> Directory
          </button>
        </div>

        {/* Expand / Collapse All */}
        {hierarchyMode === "REPORTING" && (
          <div className="org-btn-group">
            <button onClick={handleExpandAll} className="org-btn" title="Expand All Nodes">
              Expand All
            </button>
            <button onClick={handleCollapseAll} className="org-btn" title="Collapse to Roots">
              Collapse All
            </button>
          </div>
        )}

        {/* Zoom Controls */}
        {hierarchyMode === "REPORTING" && (
          <div className="org-btn-group">
            <button onClick={handleZoomOut} className="org-btn" title="Zoom Out (-10%)">
              <ZoomOut size={15} />
            </button>
            <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#475569", minWidth: "42px", textAlign: "center" }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button onClick={handleZoomIn} className="org-btn" title="Zoom In (+10%)">
              <ZoomIn size={15} />
            </button>
            <button onClick={handleResetZoom} className="org-btn" title="Reset Zoom to 100%">
              <RotateCcw size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main Viewport */}
      {loading ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "80px 20px",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <RefreshCw size={36} className="spin" style={{ margin: "0 auto 16px auto", color: "#2563eb" }} />
          <h3 style={{ margin: "0 0 6px 0", color: "#0f172a" }}>Building Organization Hierarchy...</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>Mapping reporting managers, teams, and departments.</p>
        </div>
      ) : treeRoots.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "60px 20px",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <AlertCircle size={40} style={{ margin: "0 auto 12px auto", color: "#94a3b8" }} />
          <h3 style={{ margin: "0 0 6px 0", color: "#0f172a" }}>No Employees Found</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            {selectedDeptId !== "ALL"
              ? "No active employees are mapped to the selected department."
              : "No employee records exist yet."}
          </p>
        </div>
      ) : hierarchyMode === "REPORTING" ? (
        /* VISUAL ORG CHART TREE */
        <div className="org-viewport-container" ref={viewportRef}>
          <div
            className="org-viewport-content"
            style={{
              transform: `scale(${zoomLevel})`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", gap: "50px", flexWrap: "wrap" }}>
              {treeRoots.map((root) => (
                <div key={root.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <OrgNode
                    node={root}
                    expandedIds={expandedIds}
                    onToggleExpand={handleToggleExpand}
                    onSelectNode={(node) => {
                      setSelectedEmployee(node);
                      setIsUpdatingManager(false);
                      setNewManagerId(node.reporting_manager_id || "");
                    }}
                    selectedId={selectedEmployee?.id}
                    searchQuery={searchQuery}
                    highlightedId={highlightedId}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* DIRECTORY FLAT LIST TABLE */
        <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table className="org-directory-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role & Designation</th>
                <th>Department</th>
                <th>Reports To (Manager)</th>
                <th>Direct Team Size</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees
                .filter((emp) => {
                  if (selectedDeptId !== "ALL" && String(emp.department_id) !== String(selectedDeptId)) return false;
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    const matchName = emp.full_name?.toLowerCase().includes(q);
                    const matchCode = emp.employee_code?.toLowerCase().includes(q);
                    const matchDesig = emp.designation?.toLowerCase().includes(q);
                    return matchName || matchCode || matchDesig;
                  }
                  return true;
                })
                .map((emp) => {
                  const roleTheme = getRoleTheme(emp.role);
                  const directReports = employees.filter((e) => String(e.reporting_manager_id) === String(emp.id));

                  return (
                    <tr
                      key={emp.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setIsUpdatingManager(false);
                        setNewManagerId(emp.reporting_manager_id || "");
                      }}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            className="org-avatar"
                            style={{
                              width: "36px",
                              height: "36px",
                              fontSize: "13px",
                              background: roleTheme.avatarBg,
                            }}
                          >
                            {getInitials(emp.full_name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", color: "#0f172a" }}>{emp.full_name}</div>
                            <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "600" }}>
                              {emp.employee_code || `#${emp.id}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="org-badge"
                          style={{ background: roleTheme.bg, color: roleTheme.color, borderColor: roleTheme.border }}
                        >
                          {emp.designation || emp.role}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: "600", color: "#334155" }}>{emp.department_name || "General"}</div>
                      </td>
                      <td>
                        {emp.reporting_manager_name ? (
                          <span style={{ fontWeight: "600", color: "#0f172a" }}>
                            👔 {emp.reporting_manager_name}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic" }}>
                            Direct to Leadership (Root)
                          </span>
                        )}
                      </td>
                      <td>
                        {directReports.length > 0 ? (
                          <span
                            style={{
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "3px 8px",
                              borderRadius: "10px",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            👥 {directReports.length} Members
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>--</span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "11.5px",
                            fontWeight: "700",
                            padding: "3px 8px",
                            borderRadius: "10px",
                            background: emp.today_attendance_status === "PRESENT" ? "#dcfce7" : "#fee2e2",
                            color: emp.today_attendance_status === "PRESENT" ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {emp.today_attendance_status === "PRESENT" ? "Present" : "Not In"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over Quick Employee Details Drawer */}
      {selectedEmployee && (
        <div className="org-drawer-overlay" onClick={() => setSelectedEmployee(null)}>
          <div className="org-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="org-drawer-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  className="org-avatar"
                  style={{
                    width: "48px",
                    height: "48px",
                    fontSize: "17px",
                    background: getRoleTheme(selectedEmployee.role).avatarBg,
                  }}
                >
                  {getInitials(selectedEmployee.full_name)}
                </div>
                <div>
                  <h3 style={{ margin: "0 0 2px 0", fontSize: "17px", fontWeight: "700", color: "#0f172a" }}>
                    {selectedEmployee.full_name}
                  </h3>
                  <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600" }}>
                    {selectedEmployee.employee_code || `#${selectedEmployee.id}`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="org-drawer-body">
              {/* Designation & Role */}
              <div className="org-drawer-section">
                <div className="org-drawer-section-title">Designation & Department</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <span
                    className="org-badge"
                    style={{
                      background: getRoleTheme(selectedEmployee.role).bg,
                      color: getRoleTheme(selectedEmployee.role).color,
                      borderColor: getRoleTheme(selectedEmployee.role).border,
                    }}
                  >
                    {selectedEmployee.designation || selectedEmployee.role}
                  </span>
                  <span className="org-badge org-badge-dept">
                    <Building2 size={11} /> {selectedEmployee.department_name || "General"}
                  </span>
                  <span
                    className="org-badge"
                    style={{
                      background: selectedEmployee.today_attendance_status === "PRESENT" ? "#dcfce7" : "#fee2e2",
                      color: selectedEmployee.today_attendance_status === "PRESENT" ? "#15803d" : "#b91c1c",
                    }}
                  >
                    {selectedEmployee.today_attendance_status === "PRESENT" ? "● Present Today" : "○ Not Checked In"}
                  </span>
                </div>
              </div>

              {/* Direct Reporting Manager Section */}
              <div className="org-drawer-section" style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div className="org-drawer-section-title" style={{ margin: 0 }}>
                    Reporting Manager
                  </div>
                  {canEditManager && !isUpdatingManager && (
                    <button
                      onClick={() => setIsUpdatingManager(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Edit2 size={12} /> Change
                    </button>
                  )}
                </div>

                {!isUpdatingManager ? (
                  <div>
                    {selectedEmployee.reporting_manager_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          className="org-avatar"
                          style={{ width: "34px", height: "34px", fontSize: "12px", background: "#3b82f6" }}
                        >
                          {getInitials(selectedEmployee.reporting_manager_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                            {selectedEmployee.reporting_manager_name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            Direct Supervisor
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: "#64748b", fontSize: "13px" }}>
                        ⚡ Top-Level Leadership (Reports directly to Board / Super Admin)
                      </div>
                    )}
                  </div>
                ) : (
                  /* Reassign Manager Dropdown */
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <select
                      value={newManagerId}
                      onChange={(e) => setNewManagerId(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        background: "#fff",
                      }}
                    >
                      <option value="NONE">⚡ None (Direct to Leadership / Root)</option>
                      {employees
                        .filter((e) => e.id !== selectedEmployee.id)
                        .map((mgr) => (
                          <option key={mgr.id} value={mgr.id}>
                            {mgr.full_name} ({mgr.designation || mgr.role} - {mgr.department_name || "General"})
                          </option>
                        ))}
                    </select>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleSaveManager}
                        disabled={savingManager}
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Save size={12} /> {savingManager ? "Saving..." : "Save Manager"}
                      </button>
                      <button
                        onClick={() => setIsUpdatingManager(false)}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Subordinates List */}
              <div className="org-drawer-section">
                <div className="org-drawer-section-title">
                  Direct Reports ({employees.filter((e) => String(e.reporting_manager_id) === String(selectedEmployee.id)).length})
                </div>

                {employees.filter((e) => String(e.reporting_manager_id) === String(selectedEmployee.id)).length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
                    No direct reports assigned to this employee.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {employees
                      .filter((e) => String(e.reporting_manager_id) === String(selectedEmployee.id))
                      .map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSelectedEmployee(sub);
                            setNewManagerId(sub.reporting_manager_id || "");
                            setIsUpdatingManager(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              className="org-avatar"
                              style={{ width: "30px", height: "30px", fontSize: "11px", background: "#059669" }}
                            >
                              {getInitials(sub.full_name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>
                                {sub.full_name}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                {sub.designation || sub.role} • {sub.department_name}
                              </div>
                            </div>
                          </div>
                          <ArrowRight size={14} style={{ color: "#94a3b8" }} />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="org-drawer-section">
                <div className="org-drawer-section-title">Contact & Profile</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                  {selectedEmployee.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
                      <Mail size={15} style={{ color: "#2563eb" }} />
                      <a href={`mailto:${selectedEmployee.email}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                        {selectedEmployee.email}
                      </a>
                    </div>
                  )}

                  {selectedEmployee.mobile && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#334155" }}>
                      <Phone size={15} style={{ color: "#16a34a" }} />
                      <a href={`tel:${selectedEmployee.mobile}`} style={{ color: "#334155", textDecoration: "none" }}>
                        {selectedEmployee.mobile}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
