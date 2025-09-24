import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ErrorResponse {
  message: string;
}
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Heart, Eye, EyeOff, User, Users, Stethoscope } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, createAnonymousSession, isLoading, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
    preferredRole: '' as 'patient' | 'peer' | 'counselor' | ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Redirect if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

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
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as ErrorResponse;
      setError(error.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleAnonymousLogin = async () => {
    setError('');
    
    try {
      await createAnonymousSession();
      navigate('/chatbot');
    } catch (err: unknown) {
      const error = err as ErrorResponse;
      setError(error.message || 'Anonymous session creation failed.');
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

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#2BD4BD] rounded-lg flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Calmify</h1>
          </div>
          <p className="text-gray-600">
            Your safe space for mental health support
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">
              Sign in to continue your journey to better mental health
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="border-gray-200 focus:border-[#2BD4BD] focus:ring-[#2BD4BD]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-700 font-medium">I am logging in as</Label>
                <Select 
                  value={formData.preferredRole} 
                  onValueChange={handleRoleChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="border-gray-200 focus:border-[#2BD4BD] focus:ring-[#2BD4BD]">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Patient</div>
                          <div className="text-xs text-gray-500">
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
                          <div className="text-xs text-gray-500">
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
                          <div className="text-xs text-gray-500">
                            Professional mental health counselor
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.preferredRole && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {getRoleIcon(formData.preferredRole)}
                    <span>{getRoleDescription(formData.preferredRole)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
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
                    className="border-gray-200 focus:border-[#2BD4BD] focus:ring-[#2BD4BD] pr-10"
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
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
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
                  className="rounded border-gray-300 text-[#2BD4BD] focus:ring-[#2BD4BD]"
                  disabled={isLoading}
                />
                <Label htmlFor="rememberMe" className="text-sm text-gray-600">
                  Remember me
                </Label>
              </div>
            </div>

            <div className="space-y-4 mt-8">
              <button 
                type="submit" 
                className="w-full px-8 py-4 bg-[#2BD4BD] text-white text-lg font-semibold rounded-xl hover:bg-[#25C1AB] transition-all hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <button 
                type="button" 
                className="w-full px-8 py-4 bg-gray-50 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAnonymousLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating session...
                  </div>
                ) : (
                  'Continue Anonymously'
                )}
              </button>

              <div className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-[#2BD4BD] hover:text-[#25C1AB] hover:underline font-medium"
                >
                  Sign up
                </Link>
              </div>

              <div className="text-center text-xs text-gray-500">
                <Link 
                  to="/forgot-password" 
                  className="hover:text-gray-700 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}