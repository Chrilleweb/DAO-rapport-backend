const rateLimits = {}; // In-memory storage for rate limiting data

const rateLimiter = (socket, eventName, limit, timeWindow) => {
    const userId = socket.user.userId; // Unik bruger-ID
    if (!rateLimits[userId]) rateLimits[userId] = {}; // Initialiser brugerens data
    const now = Date.now();
  
    if (!rateLimits[userId][eventName]) rateLimits[userId][eventName] = []; // Initialiser event data
    rateLimits[userId][eventName] = rateLimits[userId][eventName].filter(
      (timestamp) => now - timestamp < timeWindow // Fjern gamle timestamps
    );
  
    if (rateLimits[userId][eventName].length >= limit) {
        const errorMessage = `Rate limit reached: User ${userId} attempted too many ${eventName} events.`;
        console.error(errorMessage); // Log fejlen
        socket.emit("rate limit error", { message: "For mange forespørgsler. Prøv igen senere." });
        return false;
      }
  
    rateLimits[userId][eventName].push(now); // Tilføj nyt timestamp
    return true; // Tillad eventet
  };
  
  export default rateLimiter;
  
