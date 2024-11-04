import { Router } from "express";
import { login_post, logout_get } from "../controllers/usersController.js";
import limiter from "../middleware/rateLimiter.js";

const router = Router();

// GET requests
router.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the API" });
});

router.get("/login", (req, res) => {
  res.status(200).json({ message: "Login page" });
});
router.get("/logout", logout_get);

// POST requests
router.post("/login", limiter, login_post);


export default router;
