const ROLES = Object.freeze({
    // The existing Admin workspace is now the operational Manager workspace.
    ADMIN: "MANAGER",
    SUPER_ADMIN: "SUPER_ADMIN",
    COUNSELLOR: "COUNSELLOR",
});

export const isValidRole = (role) => {
    return Object.values(ROLES).includes(role);
};

export default ROLES;
