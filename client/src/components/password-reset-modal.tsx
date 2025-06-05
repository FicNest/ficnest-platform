// client/src/components/password-reset-modal.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Password reset form schema
const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface PasswordResetModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordResetModal({ isOpen, onOpenChange }: PasswordResetModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      setIsLoading(true);
      setIsSuccess(false);
      
      console.log("Submitting password reset for:", values.email);
      
      const response = await apiRequest("POST", "/api/reset-password", {
        email: values.email,
      });
      
      const result = await response.json();
      
      setSuccessMessage(result.message);
      setIsSuccess(true);
      
      toast({
        title: "Password Reset",
        description: "Your password has been reset to password@123. Please log in and change it from your profile.",
        variant: "default",
      });
      
      // Reset form
      form.reset();
      
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      toast({
        title: "Password Reset Failed",
        description: error.message || "An error occurred while resetting your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setSuccessMessage("");
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Reset Password
          </DialogTitle>
        </DialogHeader>

        {isSuccess ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                {successMessage}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong> For your security, please:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Log in with your email and the temporary password: <code className="bg-muted px-1 rounded">password@123</code></li>
                <li>• Go to your Profile page immediately</li>
                <li>• Change your password to something secure</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll reset your password to a temporary one.
                </p>
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your email address" 
                        type="email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}