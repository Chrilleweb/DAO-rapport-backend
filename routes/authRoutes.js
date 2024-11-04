import { Router } from "express";
import { authenticateToken } from "../middleware/jwtToken.js";
import { authorizeAdmin } from "../middleware/authorizeAdmin.js";
import { signup_post, change_password_post } from "../controllers/usersController.js";
import { checkDefaultPassword } from "../middleware/checkDefaultPassword.js";
import { get_all_users, reset_password_post, delete_user_post, update_role_post } from "../controllers/adminController.js";

const router = Router();

router.use(authenticateToken);

//GET requests
router.get("/all-users", authorizeAdmin, get_all_users);

router.get("/signup", authorizeAdmin, (req, res) => {
    res.status(200).json({ message: "Signup page" });
  });

router.get("/reset-password", authorizeAdmin, (req, res) => {
    res.status(200).json({ message: "Reset password page" });
  });

router.get("/change-password", checkDefaultPassword, (req, res) => {
    res.status(200).json({ message: "Change password page" });
  });

//POST requests
router.post("/delete-user", authorizeAdmin, delete_user_post);
router.post("/signup", authorizeAdmin, signup_post);
router.post("/change-password", change_password_post);
router.post("/reset-password", authorizeAdmin, reset_password_post);
router.post("/update-role", authorizeAdmin, update_role_post);

export default router;
