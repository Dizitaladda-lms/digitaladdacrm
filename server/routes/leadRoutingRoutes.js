import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import ROLES from "../constants/roles.js";
import {
  createCourse,
  createDomain,
  createRoutingAssignment,
  getRoutingSetup,
  removeRoutingAssignment,
  setEmployeeDomains,
} from "../controllers/leadRoutingController.js";

const router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.ADMIN));
router.get("/", getRoutingSetup);
router.post("/domains", createDomain);
router.post("/courses", createCourse);
router.post("/assignments", createRoutingAssignment);
router.delete("/assignments/:id", removeRoutingAssignment);
router.put("/employee/:id/domains", setEmployeeDomains);
export default router;
