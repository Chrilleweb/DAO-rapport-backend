import User from "../models/user.model.js";
import bcrypt from "bcrypt";

export const get_all_users = async (req, res) => {
  try {
    const users = await User.findAll();
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const reset_password_post = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the default password
    const defaultPassword = "dao365";
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // Update user's password
    await User.updatePassword(userId, hashedPassword);

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const delete_user_post = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find user by userId and delete
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.deleteUser(userId);

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const update_role_post = async (req, res) => {
  try {
    const { userId, role } = req.body;

    // Find user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user's role
    await User.updateRole(userId, role);

    return res.status(200).json({ message: "Role updated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};