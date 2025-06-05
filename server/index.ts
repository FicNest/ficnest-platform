// Force Node.js to ignore SSL certificate issues in production
// This must be the VERY FIRST thing, before any imports
if (process.env.NODE_ENV === 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { db, pool } from "./db.js";
import { sql } from "drizzle-orm";

// Simple log function since we can't import from vite.js
const log = (message: string) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
};

const app = express();

// Increase JSON payload limit to 10MB for novel content
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Middleware for logging API requests and responses
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Test database connection before starting the server
  try {
    const result = await db.execute(sql`SELECT 1 as connection_test`);
    log("✅ Database connection to Supabase successful");
  } catch (error) {
    log("❌ Database connection failed");
    console.error("Database connection error:", error);
    // Don't exit immediately, allow the server to start even with DB issues
    // This is optional - you can uncomment the next line if you want to fail fast
    // process.exit(1);
  }

  // Register all application routes
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
        
    log(`ERROR: ${status} - ${message}`);
        
    // Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === "production";
    const responseBody = {
      message: isProduction && status === 500 ? "Internal Server Error" : message,
      ...(isProduction ? {} : { stack: err.stack })
    };

    res.status(status).json(responseBody);
        
    // Don't throw the error again as it will crash the server
    // Just log it instead
    console.error(err);
  });

  // Setup Vite for development or serve static files in production
  if (process.env.NODE_ENV === "development") {
    try {
      // Only import Vite in development
      const viteModule = await import("./vite.js");
      await viteModule.setupVite(app, server);
      log("Vite setup completed for development");
    } catch (error: any) {
      log(`Vite setup failed, continuing without it: ${error.message}`);
    }
  } else {
    // In production, serve static files from dist/public
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    
    // Get current directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Serve static files from dist/public
    const staticPath = path.join(__dirname, "..", "dist", "public");
    log(`Serving static files from: ${staticPath}`);
    
    app.use(express.static(staticPath, {
      maxAge: '1d', // Cache static assets for 1 day
      etag: true
    }));
    
    // API routes are handled by registerRoutes
    // For all other routes, serve index.html (SPA fallback)
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        res.status(404).json({ message: "API endpoint not found" });
      } else {
        const indexPath = path.join(staticPath, "index.html");
        res.sendFile(indexPath, (err) => {
          if (err) {
            log(`Error serving index.html: ${err.message}`);
            res.status(200).json({ 
              message: "FicNest API is running", 
              status: "healthy",
              note: "Frontend files not found - check build output",
              staticPath: staticPath,
              environment: process.env.NODE_ENV || 'production'
            });
          }
        });
      }
    });
    
    log("Production mode: serving static files and SPA fallback");
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
    
  // Determine host based on platform - Windows needs localhost instead of 0.0.0.0
  const isWindows = process.platform === 'win32';
  const host = isWindows ? "localhost" : "0.0.0.0";
    
  // Remove reusePort option for Windows compatibility
  const options = isWindows 
    ? { port, host }
    : { port, host, reusePort: true };
      
  server.listen(options, () => {
    log(`🚀 FicNest server running on port ${port} (host: ${host})`);
    log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
    
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      log('Server closed');
      pool.end().then(() => {
        log('Database pool closed');
        process.exit(0);
      });
    });
  });
})().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});