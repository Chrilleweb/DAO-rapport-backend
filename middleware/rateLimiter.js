import ratelimiter from "express-rate-limit";

const limiter = ratelimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests
  handler: (req, res) => {
    res.status(429).json({ message: "For mange forespørgsler, prøv igen senere" });
  }
});

export default limiter;
