import jwt from "jsonwebtoken";

export const checkAuthRedirect = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.status(302).json({ message: "Already logged in" });
    } catch {
      return next();
    }
  } else {
    return next();
  }
};
