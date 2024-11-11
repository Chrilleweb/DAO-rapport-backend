import express from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import apiRoutes from "./routes/apiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import openaiRoutes from "./routes/openaiRoutes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import checkIP from "./middleware/checkIp.js";
import http from "http";
import socketSetup from "./lib/socket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
socketSetup(server);

// Trust the first proxy
app.set("trust proxy", 1);

// middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], // allows resources to be loaded from the same origin
        scriptSrc: ["'self'", process.env.FRONTEND_URL], // allows scripts to be loaded from the same origin
        styleSrc: ["'self'", process.env.FRONTEND_URL], // allows styles to be loaded from the same origin
        connectSrc: ["'self'", process.env.FRONTEND_URL], // allows data to be loaded from the same origin
      },
    },
    referrerPolicy: { policy: "no-referrer" }, // hides the Referer header from third-party websites
  })
);

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

const corsOptions = {
  origin: process.env.FRONTEND_URL, // URL'en til din SvelteKit frontend
  methods: ["GET", "POST", "PUT", "DELETE"], // Tilladte metoder
  credentials: true, // Tillader cookies og HTTP-autentificering
  optionsSuccessStatus: 200 // For ældre browsere
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Check if the client IP is allowed
app.use(checkIP);

// routes
app.use(apiRoutes);
app.use("/auth", authRoutes);
app.use("/reports", reportRoutes);
app.use('/api/openai', openaiRoutes);

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default server;
