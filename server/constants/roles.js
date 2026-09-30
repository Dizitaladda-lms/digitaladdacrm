const ROLES = Object.freeze({
    // The existing Admin workspace is now the operational Manager workspace.
    ADMIN: "MANAGER",
    SUPER_ADMIN: "SUPER_ADMIN",
    COUNSELLOR: "COUNSELLOR",
    HR: "HR",
    TL: "TL",
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
