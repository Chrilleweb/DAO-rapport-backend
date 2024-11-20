import jwt from "jsonwebtoken";
import cookie from "cookie";

const authenticateSocket = (socket, next) => {
  // Hent cookies fra socket handshake headers
  const cookies = socket.handshake.headers.cookie;

  if (!cookies) {
    const err = new Error("Unauthorized");
    err.data = { content: "Cookies mangler. Adgang nægtet." };
    return next(err);
  }

  // Parse cookies og find token
  const parsedCookies = cookie.parse(cookies);
  const token = parsedCookies.token; 

  if (!token) {
    const err = new Error("Unauthorized");
    err.data = { content: "Token mangler. Adgang nægtet." };
    return next(err);
  }

  // Verificér token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      const error = new Error("Forbidden");
      error.data = { content: "Token er ugyldig. Adgang nægtet." };
      return next(error);
    }

    // Gem brugeroplysninger i socket-objektet for senere brug
    socket.user = user;
    next();
  });
};

export default authenticateSocket;
