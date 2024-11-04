import ipRangeCheck from "ip-range-check";

const allowedIPs = process.env.ALLOWED_IPS.split(",");

const checkIP = (req, res, next) => {
  const clientIP = req.headers["x-forwarded-for"] || req.ip || req.socket.remoteAddress;
  const formattedIP = clientIP.startsWith("::ffff:") ? clientIP.split(":").reverse()[0] : clientIP;
  if (allowedIPs.some(range => ipRangeCheck(formattedIP, range))) {
    next();
  } else {
    return res.status(403).json({ message: "Forbidden" });
  }
};

export default checkIP;
