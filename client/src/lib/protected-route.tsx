import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";
import React from "react";

interface ProtectedRouteProps {
  path: string;
  children: React.ReactNode;
}

export function ProtectedRoute({ path, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  
  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }
        
        if (!user) {
          return <Redirect to="/auth" />;
        }
        
        if (!user.isAuthor && path.startsWith('/author')) {
          return (
            <div className="container mx-auto px-4 py-8">
              <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
                <h1 className="text-2xl font-bold mb-4 text-center">Author Access Required</h1>
                <p className="text-gray-600 mb-6 text-center">
                  This section is only available to authors. Please register as an author to access this feature.
                </p>
              </div>
            </div>
          );
        }
        
        return <>{children}</>;
      }}
    </Route>
  );
}