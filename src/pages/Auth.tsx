
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type AuthMode = "signin" | "signup" | "reset";

const authSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const resetSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(mode === "reset" ? resetSchema : authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof authSchema>) => {
    setIsLoading(true);
    
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        
        if (error) throw error;
        
        navigate("/");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });
        
        if (error) throw error;
        
        toast({
          title: "Success!",
          description: "Please check your email for a confirmation link.",
        });
        
        setMode("signin");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        
        if (error) throw error;
        
        toast({
          title: "Password reset email sent",
          description: "Please check your email for a password reset link.",
        });
        
        setMode("signin");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {mode === "signin" ? "Sign In" : mode === "signup" ? "Sign Up" : "Reset Password"}
          </CardTitle>
          <CardDescription>
            {mode === "signin" 
              ? "Enter your credentials to access your account" 
              : mode === "signup" 
                ? "Create a new account to get started" 
                : "Enter your email to receive a reset link"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {mode !== "reset" && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? "Processing..." : mode === "signin" ? "Sign In" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center text-sm">
            {mode === "signin" ? (
              <>
                <p className="text-muted-foreground mb-2">
                  Don't have an account?{" "}
                  <Button variant="link" className="p-0" onClick={() => setMode("signup")}>
                    Sign up
                  </Button>
                </p>
                <Button variant="link" className="p-0" onClick={() => setMode("reset")}>
                  Forgot password?
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Button variant="link" className="p-0" onClick={() => setMode("signin")}>
                  Sign in
                </Button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
