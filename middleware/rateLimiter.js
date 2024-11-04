import ratelimiter from "express-rate-limit";

const limiter = ratelimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  handler: (req, res) => {
    res.status(429).json({ message: "Too many requests, please try again later" });
  }
});

export default limiter;
