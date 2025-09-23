import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Heart, Eye, EyeOff, User, Users, Stethoscope } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, createAnonymousSession, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
    preferredRole: '' as 'patient' | 'peer' | 'counselor' | ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const loginData = {
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
        ...(formData.preferredRole && { preferredRole: formData.preferredRole })
      };
      await login(loginData);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleAnonymousLogin = async () => {
    setError('');
    
    try {
      await createAnonymousSession();
      navigate('/chatbot');
    } catch (err: any) {
      setError(err.message || 'Anonymous session creation failed.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      preferredRole: value as 'patient' | 'peer' | 'counselor'
    }));
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'patient':
        return <User className="h-4 w-4" />;
      case 'peer':
        return <Users className="h-4 w-4" />;
      case 'counselor':
        return <Stethoscope className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'patient':
        return 'Seeking support and mental health resources';
      case 'peer':
        return 'Providing peer support to others';
      case 'counselor':
        return 'Professional mental health counselor';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Calmify</h1>
          </div>
          <p className="text-muted-foreground">
            Your safe space for mental health support
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to continue your journey to better mental health
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">I am logging in as</Label>
                <Select 
                  value={formData.preferredRole} 
                  onValueChange={handleRoleChange}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Patient</div>
                          <div className="text-xs text-muted-foreground">
                            Seeking support and mental health resources
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="peer">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Peer Supporter</div>
                          <div className="text-xs text-muted-foreground">
                            Providing peer support to others
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="counselor">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Counselor</div>
                          <div className="text-xs text-muted-foreground">
                            Professional mental health counselor
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.preferredRole && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getRoleIcon(formData.preferredRole)}
                    <span>{getRoleDescription(formData.preferredRole)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="rounded border-border"
                  disabled={isLoading}
                />
                <Label htmlFor="rememberMe" className="text-sm">
                  Remember me
                </Label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={handleAnonymousLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating session...
                  </>
                ) : (
                  'Continue Anonymously'
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </Link>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                <Link 
                  to="/forgot-password" 
                  className="hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Emergency Resources */}
        <div className="mt-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <h3 className="font-semibold text-destructive mb-2">
            Crisis Support
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            If you're in immediate danger or having thoughts of self-harm:
          </p>
          <div className="space-y-1 text-sm">
            <p><strong>Emergency:</strong> 911</p>
            <p><strong>Crisis Hotline:</strong> 988</p>
            <p><strong>Crisis Text:</strong> Text HOME to 741741</p>
          </div>
        </div>
      </div>
    </div>
  );
}