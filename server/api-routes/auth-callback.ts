// server/api-routes/auth-callback.ts
import { Request, Response } from "express";
import { storage } from "../storage.js";
import { randomBytes } from "crypto";
import { hashPassword } from "../utils/passwordUtils.js";

export async function handleAuthCallback(req: Request, res: Response) {
  try {
    console.log("Processing POST /api/auth/callback");
    
    const supabaseUser = req.body.user;
    const access_token = req.body.access_token;

    if (!supabaseUser) {
      console.error('No Supabase user data in request body');
      return res.status(400).json({ message: "Missing user data" });
    }

    console.log('Got Supabase user:', supabaseUser.id, supabaseUser.email);

    // Check if we have a mapping for this Supabase user
    let user;
    let existingMapping;
    
    try {
      existingMapping = await storage.findAuthMappingBySupabaseUid(supabaseUser.id);
      console.log('Auth mapping lookup result:', existingMapping);
    } catch (err) {
      console.error('Error finding auth mapping:', err);
      return res.status(500).json({ message: "Database error" });
    }

    if (existingMapping) {
      // Mapping exists, get the local user
      try {
        user = await storage.getUser(existingMapping.localUserId);
        console.log('Found local user via mapping:', user?.id);
      } catch (err) {
        console.error('Error fetching mapped user:', err);
        return res.status(500).json({ message: "Error fetching user" });
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
    } else {
      // No mapping exists, check if we have a user with this email
      try {
        user = await storage.getUserByEmail(supabaseUser.email);
        console.log('Email user lookup result:', user?.id);
      } catch (err) {
        console.error('Error looking up user by email:', err);
        return res.status(500).json({ message: "Database error" });
      }

      if (!user) {
        // Create a new user with this email
        console.log('Creating new user for email:', supabaseUser.email);
        const hashedPassword = await hashPassword(randomBytes(16).toString('hex'));
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const username = `Reader${randomSuffix}`;

        try {
          user = await storage.createUser({
            email: supabaseUser.email,
            username,
            password: hashedPassword,
            isAuthor: false,
          });
          console.log('Created new user:', user.id);
        } catch (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ message: "Error creating user" });
        }
      }

      // Create a mapping between Supabase UID and our user ID
      try {
        await storage.createAuthMapping({
          supabaseUid: supabaseUser.id,
          localUserId: user.id
        });
        console.log('Created auth mapping for:', supabaseUser.id, user.id);
      } catch (err) {
        console.error('Error creating auth mapping:', err);
        // Continue anyway as we have the user
      }
    }

    // Log the user in
    req.login(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: "Login error" });
      }

      // Return the user info (without password)
      const { password, ...userInfo } = user;
      console.log('User logged in successfully:', userInfo.id);
      return res.status(200).json(userInfo);
    });

  } catch (error: any) {
    console.error('Unexpected error in auth callback:', error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}