
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AuthMode = "signin" | "signup" | "reset";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        toast.success("Signed in successfully!");
        navigate("/");
      } else if (mode === "signup") {
        if (password !== confirmPassword) {
          toast.error("Passwords don't match");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        
        toast.success("Signed up successfully! Please check your email for verification.");
        setMode("signin");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });

        if (error) throw error;
        
        toast.success("Password reset link sent to your email.");
        setMode("signin");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <div className="h-12 w-12 flex items-center justify-center bg-crm-blue text-white rounded-xl">
              <span className="font-bold text-sm">CRM</span>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-center mb-6">
              {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              
              {mode !== "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required={mode !== "reset"}
                  />
                </div>
              )}
              
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}
              
              <Button
                type="submit"
                className="w-full bg-crm-blue hover:bg-crm-blue/90"
                disabled={loading}
              >
                {loading ? "Processing..." : 
                  mode === "signin" ? "Sign In" : 
                  mode === "signup" ? "Sign Up" : 
                  "Send Reset Link"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm">
              {mode === "signin" ? (
                <>
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="text-crm-blue hover:underline font-medium"
                    >
                      Sign Up
                    </button>
                  </p>
                  <p className="mt-2">
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-crm-blue hover:underline font-medium"
                    >
                      Forgot Password?
                    </button>
                  </p>
                </>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-crm-blue hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
