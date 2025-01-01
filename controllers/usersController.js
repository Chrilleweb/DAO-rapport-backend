import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import zxcvbn from "zxcvbn";

export const signup_post = async (req, res) => {
  try {
    const { firstname, lastname, email } = req.body;

    // if any of the fields are empty
    if (!firstname || !lastname || !email) {
      return res.status(400).json({ message: "Udfyld alle felter" });
    }

    // Validate firstname and lastname for invalid characters
    if (!/^[\p{L}\s'-]+$/u.test(firstname) || !/^[\p{L}\s'-]+$/u.test(lastname)) {
      return res.status(400).json({ message: "Ugyldigt navn" });
    }


    // Check if email is valid
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Ugyldig email" });
    }

    // Check if the email is taken
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ message: "Email er allerede i brug" });
    }

    // Hash the password
    const defaultPassword = "dao365";
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const userRole = "user";

    // Create a new user
    const newUser = {
      firstname,
      lastname,
      email,
      password: hashedPassword,
      role: userRole,
    };
    await User.create(newUser);

    return res.status(201).json({ message: "Bruger blev oprettet" });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login_post = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if any of the fields are empty
    if (!email || !password) {
      return res.status(400).json({ message: "Udfyld alle felter" });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Forkert email eller adgangskode" });
    }

    // Find the user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Forkert email eller adgangskode" });
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Forkert email eller adgangskode" });
    }

    // Create and sign a JWT using the secret key from environment variable
    const token = jwt.sign(
      {
        userId: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10h" }
    );

    // Set the token in an HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.COOKIE_SAMESITE,
      domain: process.env.COOKIE_DOMAIN,
      path: "/",
      maxAge: 10 * 60 * 60 * 1000, // 10 hours
    });

    const isDefaultPassword = await bcrypt.compare("dao365", user.password);
    if (isDefaultPassword) {
      res.cookie("requiresPasswordChange", "true", {
        httpOnly: true,
        secure: true,
        sameSite: process.env.COOKIE_SAMESITE,
        domain: process.env.COOKIE_DOMAIN,
        path: "/",
      }); // HttpOnly cookie for security -  '/' can only be accessed by the server
      return res.status(202).json({ message: "Please change your password" });
    }

    return res.status(200).json({
      message: "Login successful!",
      userId: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const change_password_post = async (req, res) => {
  try {
    if (!req.cookies.requiresPasswordChange) {
      return res
        .status(403)
        .json({ message: "Du har allerede skiftet adgangskode" });
    }
    const { newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    const passwordStrength = zxcvbn(newPassword);
    if (passwordStrength.score < 2) {
      return res.status(400).json({ message: "Adgagskode er for svagt" });
    }

    if (!newPassword || newPassword.length < 8 || newPassword.length > 20) {
      return res.status(400).json({
        message: "Adganskode skal være mellem 8 og 20 tegn",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Adgangskoderne er ikke ens" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.updatePassword(userId, hashedPassword);

    res.clearCookie("requiresPasswordChange", {
      httpOnly: true,
        secure: true,
        sameSite: process.env.COOKIE_SAMESITE,
        domain: process.env.COOKIE_DOMAIN,
        path: "/",
    });
    return res.status(200).json({ message: "Adganskode er blevet ændret" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout_get = (req, res) => {
  // Clear the token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: process.env.COOKIE_SAMESITE,
    domain: process.env.COOKIE_DOMAIN,
    path: "/",
  });

  // Clear the requiresPasswordChange cookie
  res.clearCookie("requiresPasswordChange", {
    httpOnly: true,
    secure: true,
    sameSite: process.env.COOKIE_SAMESITE,
    domain: process.env.COOKIE_DOMAIN,
    path: "/",
  });

  return res.status(200).json({ message: "Logged out successfully" });
};
