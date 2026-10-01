import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";

import ROLES from "../constants/roles.js";
import PERMISSIONS from "../constants/permissions.js";

const ROLE_PERMISSIONS = Object.freeze({

    [ROLES.SUPER_ADMIN]: [
        ...Object.values(PERMISSIONS),
    ],

    [ROLES.ADMIN]: [
        ...Object.values(PERMISSIONS).filter(p => p !== PERMISSIONS.DELETE_EMPLOYEE && p !== PERMISSIONS.RESTORE_EMPLOYEE),
    ],

    [ROLES.HR]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.CREATE_EMPLOYEE,
        PERMISSIONS.VIEW_EMPLOYEE,
        PERMISSIONS.UPDATE_EMPLOYEE,
        PERMISSIONS.VIEW_DEPARTMENT,
        PERMISSIONS.VIEW_COURSE,
    ],

    [ROLES.TL]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_EMPLOYEE,
        PERMISSIONS.VIEW_DEPARTMENT,
        PERMISSIONS.VIEW_COURSE,
    ],

    [ROLES.TRAINER]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_COURSE,
    ],

    [ROLES.EMPLOYEE]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_COURSE,
    ],

    [ROLES.INTERN]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_COURSE,
    ],

    [ROLES.COUNSELLOR]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_LEAD,
        PERMISSIONS.CREATE_LEAD,
        PERMISSIONS.UPDATE_LEAD,
        PERMISSIONS.VIEW_FOLLOWUP,
        PERMISSIONS.CREATE_FOLLOWUP,
        PERMISSIONS.UPDATE_FOLLOWUP,
        PERMISSIONS.COMPLETE_FOLLOWUP,
        PERMISSIONS.VIEW_COURSE,
    ],
});

const authorize = (...requiredPermissions) => {

    return (req, res, next) => {

        if (!req.user) {

            return next(

                new ApiError(

                    HTTP_STATUS.UNAUTHORIZED,

                    "Authentication required."

                )

            );

        }

        const role = req.user.role;

        const permissions =
            ROLE_PERMISSIONS[role] || [];

        const allowed =
            requiredPermissions.every(permission =>
                permissions.includes(permission)
            );

        if (!allowed) {

            return next(

                new ApiError(

                    HTTP_STATUS.FORBIDDEN,

                    "You do not have permission to perform this action."

                )

            );

        }

        next();

    };

};

export default authorize;
