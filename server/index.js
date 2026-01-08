import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import connectdb from "./src/config/db.js";
import http from "http";
import { Server as IOServer } from "socket.io";
import { setIO } from "./src/utils/socket.util.js";
import { refreshPermissionCache } from './src/utils/permissionCache.js'

const PORT = process.env.PORT || 5100;

// Connect to MongoDB, then start HTTP server with Socket.IO
connectdb()
  .then(() => {
    // warm-up permission cache to avoid DB hits on first requests
    refreshPermissionCache().catch((e) => console.warn('Permission cache warmup failed', e))
    
    const server = http.createServer(app);

    const io = new IOServer(server, {
      cors: {
        origin: (process.env.CORS_ORIGINS || "*").split(",").map(s => s.trim()).filter(Boolean) || "*",
        methods: ["GET", "POST"],
      },
    });

    // expose io to controllers
    setIO(io);

    server.listen(PORT, () => {
      console.log(`🚀 Server (with sockets) is running on :${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`❌ Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  });
