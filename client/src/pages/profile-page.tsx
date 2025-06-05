import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, refetchUser } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Mutation for changing username
  const changeUsernameMutation = useMutation({
    mutationFn: async () => {
      if (!newUsername.trim()) {
        throw new Error("Username cannot be empty");
      }
      const res = await apiRequest("PUT", "/api/users/me/username", { username: newUsername });
      return res.json();
    },
    onSuccess: () => {
      setNewUsername("");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Refresh user data after successful username change
      toast({
        title: "Username Updated",
        description: "Your username has been successfully updated.",
      });
      if (refetchUser) {
        refetchUser();
      }
    },
    onError: (error: any) => {
      // Improved error handling to show specific message for username already taken
      const errorMessage = error.message || "Failed to change username.";
      
      // Check if the error contains the specific "already taken" message
      const isUsernameTaken = errorMessage.includes("Username already taken") || 
                            errorMessage.includes("409");
      
      toast({
        title: isUsernameTaken ? "Username Not Available" : "Error",
        description: isUsernameTaken 
          ? "This username is already taken. Please choose a different one." 
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation for changing password
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      setIsChangingPassword(true);
      
      // Client-side validation
      if (!currentPassword) {
        throw new Error("Current password is required.");
      }
      
      if (!newPassword) {
        throw new Error("New password is required.");
      }
      
      if (newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters.");
      }
      
      if (newPassword !== confirmNewPassword) {
        throw new Error("New passwords do not match.");
      }
      
      try {
        const res = await apiRequest("PUT", "/api/users/me/password", { 
          currentPassword, 
          newPassword 
        });
        
        return res.json();
      } catch (error) {
        console.error("Password change error:", error);
        throw error;
      } finally {
        setIsChangingPassword(false);
      }
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      });
    },
  });

  const handleUsernameChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername.trim() && newUsername !== user?.username) {
      changeUsernameMutation.mutate();
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    changePasswordMutation.mutate();
  };

  // If not logged in, show login message
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please log in to view your profile.</p>
            <Button onClick={() => navigate("/auth")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarFallback className="bg-primary text-white text-2xl">
              {user.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <CardTitle>{user.username || 'User'}</CardTitle>
          <p className="text-sm text-gray-500">
            {user.isAuthor ? "Author" : "Reader"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <h3 className="text-lg font-medium mb-2 text-gray-900">Account Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Username</p>
                  <p className="text-gray-900">{user.username || 'User'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account Type</p>
                  <p className="text-gray-900">{user.isAuthor ? "Author" : "Reader"}</p>
                </div>
              </div>
            </div>
            
            {/* Change Username Section */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium mb-3 text-gray-900">Change Username</h3>
              <form onSubmit={handleUsernameChange} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="New Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={changeUsernameMutation.isPending}
                />
                <Button 
                  type="submit" 
                  disabled={changeUsernameMutation.isPending || !newUsername.trim()}
                >
                  {changeUsernameMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : "Change"}
                </Button>
              </form>
            </div>

            {/* Change Password Section */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium mb-3 text-gray-900">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <Label htmlFor="current-password" className="text-gray-900">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isChangingPassword}
                  />
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isChangingPassword}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={isChangingPassword}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : "Change Password"}
                </Button>
              </form>
            </div>

            {user.isAuthor && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button 
                  className="w-full" 
                  onClick={() => navigate("/author/dashboard")}
                >
                  Go to Author Dashboard
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}