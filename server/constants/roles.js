const ROLES = Object.freeze({
    // The existing Admin workspace is now the operational Manager workspace.
    ADMIN: "MANAGER",
    SUPER_ADMIN: "SUPER_ADMIN",
    SALES_HEAD: "SALES_HEAD",
    COUNSELLOR: "COUNSELLOR",
    HR: "HR",
    DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
    MANAGER: "MANAGER",
    TL: "TL",
    SUB_TL: "SUB_TL",
    EMPLOYEE: "EMPLOYEE",
    TRAINER: "TRAINER",
    INTERN: "INTERN",
});

export const isValidRole = (role) => {
    if (!role) return false;
    const normalized = String(role).toUpperCase();
    return Object.values(ROLES).includes(normalized);
};

export default ROLES;
