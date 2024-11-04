import User from "../models/user.model.js";
import bcrypt from "bcrypt";

export const checkDefaultPassword = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Find user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if current password is the default password
    const isDefaultPassword = await bcrypt.compare("dao365", user.password);
    if (!isDefaultPassword) {
      return res
        .status(403)
        .json({
          message:
            "You already have changed your password, you will get redirected",
        });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
