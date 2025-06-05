// server/auth.ts - Complete OAuth handler (no redirects)

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage.js";
import { User as SelectUser, insertUserSchema } from "../shared/schema.js";
import { z } from "zod";
import { hashPassword, comparePasswords } from "./utils/passwordUtils.js";
import { supabase as supabaseServer } from "./lib/supabaseServer.js";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Extend the user schema for registration
const registerUserSchema = insertUserSchema
  .extend({
    confirmPassword: z.string().optional(),
  })
  .refine((data: z.infer<typeof insertUserSchema> & { confirmPassword?: string }) => 
    !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "ficnest-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: app.get("env") === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
      httpOnly: true,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "emailOrUsername",
        passwordField: "password"
      },
      async (emailOrUsername, password, done) => {
        try {
          // First try to find by email
          let user = await storage.getUserByEmail(emailOrUsername);
          
          // If not found by email, try username
          if (!user) {
            user = await storage.getUserByUsername(emailOrUsername);
          }
          
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid credentials" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
      try {
        // Validate request body
        const validatedData = registerUserSchema.parse(req.body);
        
        // Check if user already exists
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser) {
          return res.status(400).json({ message: "Email already in use" });
        }
        
        // Check if username already exists
        const existingUsername = await storage.getUserByUsername(validatedData.username);
        if (existingUsername) {
          return res.status(400).json({ message: "Username already taken" });
        }
        
        // Create user - ALWAYS set isAuthor to false regardless of input
        const user = await storage.createUser({
          email: validatedData.email,
          username: validatedData.username,
          password: await hashPassword(validatedData.password),
          isAuthor: false, // All new accounts are now readers by default
        });

        // Log user in
        req.login(user, (err) => {
          if (err) return next(err);
          // Return user without password
          const { password, ...userWithoutPassword } = user;
          res.status(201).json(userWithoutPassword);
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Validation error", 
            errors: error.errors 
          });
        }
        next(error);
      }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Invalid credentials" 
        });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        console.log("User logged in successfully:", userWithoutPassword);
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err: Error | null) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Direct OAuth callback - serve HTML page that handles the callback in the browser
  app.get("/auth/callback", async (req, res) => {
    // Determine the correct redirect URL based on environment
    const baseUrl = req.get('host')?.includes('localhost') 
      ? 'http://localhost:5000' 
      : `https://${req.get('host')}`;
      
    const callbackPage = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authenticating...</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
          }
          .card {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
          }
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top: 4px solid #3498db;
            width: 40px;
            height: 40px;
            margin: 1rem auto;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .message {
            margin-top: 1rem;
          }
          .error {
            color: #e74c3c;
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Processing Authentication</h2>
          <div class="spinner"></div>
          <p class="message">Please wait...</p>
          <p class="error" id="error" style="display:none;"></p>
        </div>

        <script>
          async function handleAuth() {
            try {
              const hashParams = {};
              if (window.location.hash) {
                window.location.hash.substring(1).split('&').forEach(param => {
                  const [key, value] = param.split('=');
                  hashParams[key] = decodeURIComponent(value);
                });
              }

              const response = await fetch('${baseUrl}/api/auth/callback', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  access_token: hashParams.access_token,
                  refresh_token: hashParams.refresh_token,
                  provider: 'google',
                  hash: window.location.hash
                }),
                credentials: 'include'
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Authentication failed');
              }

              document.querySelector('.message').textContent = 'Authentication successful! Redirecting...';
              
              setTimeout(() => {
                window.location.href = '/';
              }, 1000);
            } catch (error) {
              const errorElement = document.getElementById('error');
              errorElement.textContent = error.message || 'Authentication failed';
              errorElement.style.display = 'block';
              document.querySelector('.message').textContent = 'Authentication failed. Redirecting to login...';
              document.querySelector('.spinner').style.display = 'none';
              
              setTimeout(() => {
                window.location.href = '/';
              }, 3000);
            }
          }

          window.onload = handleAuth;
        </script>
      </body>
      </html>
    `;
    
    res.send(callbackPage);
  });

  // API endpoint for the client-side callback to communicate with the server
  app.post("/api/auth/callback", async (req, res) => {
    try {
      console.log("=== AUTH CALLBACK DEBUG ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("Request headers:", JSON.stringify(req.headers, null, 2));
      
      const { access_token, refresh_token, provider, hash } = req.body;
      
      if (!access_token) {
        console.error("No access_token provided");
        return res.status(400).json({ message: "No access token provided" });
      }

      // Get user from Supabase
      console.log("Getting user from Supabase...");
      const { data, error } = await supabaseServer.auth.getUser(access_token);
      
      if (error) {
        console.error("Supabase auth error:", error);
        return res.status(401).json({ message: "Invalid access token", error: error.message });
      }

      const supabaseUser = data.user;
      if (!supabaseUser || !supabaseUser.email) {
        console.error("No user data received from Supabase");
        return res.status(400).json({ message: "Could not retrieve user information" });
      }

      console.log("Supabase user:", supabaseUser.id, supabaseUser.email);

      // Check for existing auth mapping
      console.log("Checking for existing auth mapping...");
      let existingMapping;
      try {
        existingMapping = await storage.findAuthMappingBySupabaseUid(supabaseUser.id);
        console.log("Existing mapping:", existingMapping);
      } catch (err) {
        console.error("Error finding auth mapping:", err);
        return res.status(500).json({ message: "Database error checking auth mapping" });
      }

      let localUser;
      
      if (existingMapping) {
        console.log("Found existing mapping, getting user...");
        try {
          localUser = await storage.getUser(existingMapping.localUserId);
        } catch (err) {
          console.error("Error fetching mapped user:", err);
          return res.status(500).json({ message: "Error fetching user data" });
        }
      } else {
        // Check if user exists by email
        console.log("Checking for user by email...");
        try {
          localUser = await storage.getUserByEmail(supabaseUser.email);
          console.log("User by email:", localUser ? "found" : "not found");
        } catch (err) {
          console.error("Error looking up user by email:", err);
          return res.status(500).json({ message: "Database error checking email" });
        }
        
        if (!localUser) {
          // Create new user
          console.log("Creating new user...");
          try {
            const hashedPassword = await hashPassword(Math.random().toString(36).substring(2));
            const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const username = `Reader${randomSuffix}`;
            
            console.log("Creating user with username:", username);
            
            localUser = await storage.createUser({
              email: supabaseUser.email,
              username,
              password: hashedPassword,
              isAuthor: false,
            });
            
            console.log("Created new user:", localUser.id);
          } catch (err) {
            console.error("Error creating user:", err);
            return res.status(500).json({ 
              message: "Error creating user account", 
              error: err instanceof Error ? err.message : "Unknown error"
            });
          }
        }
        
        // Create auth mapping
        console.log("Creating auth mapping...");
        try {
          await storage.createAuthMapping({
            supabaseUid: supabaseUser.id,
            localUserId: localUser.id
          });
          console.log("Auth mapping created successfully");
        } catch (err) {
          console.error("Error creating auth mapping:", err);
          // Continue anyway as we have the user
        }
      }

      if (!localUser) {
        console.error("No local user found or created");
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Logging in user:", localUser.id);
      
      // Log the user in with Passport
      req.login(localUser, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login error" });
        }
        
        // Return the user info (without password)
        const { password, ...userInfo } = localUser;
        console.log("User logged in successfully:", userInfo.id);
        return res.status(200).json(userInfo);
      });
      
    } catch (error: any) {
      console.error("Unexpected error in auth callback:", error);
      res.status(500).json({ 
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Endpoint to get current user info (requires authentication)
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      // Return user without password
      const { password, ...userWithoutPassword } = req.user;
      console.log("Returning authenticated user:", userWithoutPassword);
      res.json(userWithoutPassword);
    } else {
      // User is not authenticated, return 401
      console.log("User not authenticated for /api/user");
      res.status(401).json({ message: "Unauthorized" });
    }
  });
}