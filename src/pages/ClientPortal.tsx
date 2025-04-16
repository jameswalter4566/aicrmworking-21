
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ClientPortal = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simple authentication - username: user1, password: password
    setTimeout(() => {
      if (username === "user1" && password === "password") {
        // Store login state in localStorage
        localStorage.setItem("clientPortalLoggedIn", "true");
        localStorage.setItem("clientPortalUser", username);
        
        // Navigate to the dashboard
        navigate("/client-dashboard");
        toast.success("Login successful!");
      } else {
        toast.error("Invalid credentials. Please try again.");
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1773&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <Card className="w-full max-w-md rounded-xl shadow-lg">
        <CardHeader className="text-center pb-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl">
          <CardTitle className="text-2xl font-bold text-white">Mortgage Client Portal</CardTitle>
          <CardDescription className="text-blue-100">
            Access your mortgage information securely
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-gray-500">
            Please contact your loan officer if you have trouble logging in.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ClientPortal;
