
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Check, Loader2 } from "lucide-react";

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      if (hashParams.get('access_token')) {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          if (data.user) {
            toast({
              title: "Successfully signed in",
              description: `Welcome${data.user.user_metadata.name ? ', ' + data.user.user_metadata.name : ''}!`,
            });
            navigate("/settings");  // Updated to redirect to /settings
          }
        } catch (error) {
          console.error("Error handling OAuth callback:", error);
        }
      }
    };

    handleAuthCallback();
  }, [location, navigate]);

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
        
        navigate("/settings");  // Updated to redirect to /settings
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // Get the current URL to construct proper redirect
      const origin = window.location.origin;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/settings`,  // Updated to redirect to /settings
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        console.error("Google signin error:", error);
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Google sign-in failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An error occurred with Google sign in. Please try again.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const features = [
    "Unlimited calling",
    "10 line power dialer",
    "Unlimited bulk SMS",
    "Pull title leads",
    "All in one marketing",
    "Conversational AI dialer",
    "Bulk Voice mail campaigns",
    "AI backend automations"
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-lg text-center mb-6">
        <h1 className="text-4xl font-bold text-white mb-2 enhanced-glow-text">
          {mode === "signup" ? "Try free for 7 days!" : "Welcome Back!"}
        </h1>
        {mode === "signup" && (
          <>
            <p className="text-lg text-blue-300 mb-6">
              No credit card required
            </p>
            <div className="flex flex-col items-center justify-center mb-6">
              <ul className="grid grid-cols-2 gap-x-8 gap-y-3 text-left mx-auto">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center text-white">
                    <Check className="h-5 w-5 mr-2 text-blue-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
      
      <Card className="w-full max-w-md bg-gray-800 border border-blue-500 shadow-[0_0_20px_rgba(66,153,225,0.5)] rounded-2xl overflow-hidden">
        <CardHeader className="text-center border-b border-gray-700">
          <CardTitle className="text-2xl font-bold text-white">
            {mode === "signin" ? "Sign In" : mode === "signup" ? "Sign Up" : "Reset Password"}
          </CardTitle>
          <CardDescription className="text-blue-300">
            {mode === "signin" 
              ? "Enter your credentials to access your account" 
              : mode === "signup" 
                ? "Create a new account to get started" 
                : "Enter your email to receive a reset link"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="email@example.com" 
                        {...field} 
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              {mode !== "reset" && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              )}
              
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-300 shadow-[0_0_10px_rgba(66,153,225,0.3)] hover:shadow-[0_0_15px_rgba(66,153,225,0.5)]" 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : mode === "signin" ? "Sign In" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4">
            <div className="relative flex items-center justify-center">
              <Separator className="absolute w-full bg-gray-600" />
              <span className="relative bg-gray-800 px-2 text-xs text-gray-400">OR</span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full mt-4 flex items-center justify-center gap-2 bg-transparent border border-gray-600 text-white hover:bg-gray-700 rounded-xl transition-all duration-300"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>{googleLoading ? "Connecting..." : "Continue with Google"}</span>
          </Button>
          
          <div className="mt-6 text-center text-sm">
            {mode === "signin" ? (
              <>
                <p className="text-gray-400 mb-2">
                  Don't have an account?{" "}
                  <Button variant="link" className="p-0 text-blue-400 hover:text-blue-300" onClick={() => setMode("signup")}>
                    Sign up
                  </Button>
                </p>
                <Button variant="link" className="p-0 text-blue-400 hover:text-blue-300" onClick={() => setMode("reset")}>
                  Forgot password?
                </Button>
              </>
            ) : (
              <p className="text-gray-400">
                Already have an account?{" "}
                <Button variant="link" className="p-0 text-blue-400 hover:text-blue-300" onClick={() => setMode("signin")}>
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
