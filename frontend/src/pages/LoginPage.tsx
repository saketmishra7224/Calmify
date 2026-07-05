import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ErrorResponse {
  message: string;
}
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, createAnonymousSession, isLoading, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitHovered, setSubmitHovered] = useState(false);
  const [anonHovered, setAnonHovered] = useState(false);

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
        rememberMe: formData.rememberMe
      };
      await login(loginData);
      navigate('/');
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



  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FAF8F5' }}>
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#A398C9' }} />
          <span className="ml-2" style={{ color: '#6B6B6B' }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FAF8F5' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/calmifylogo.png" alt="Calmify Logo" className="h-12 w-auto object-contain" />
            <h1 className="text-3xl font-heading font-bold" style={{ color: '#3A3A3A' }}>Calmify</h1>
          </div>
          <p style={{ color: '#6B6B6B' }}>
            Your safe space for mental health support
          </p>
        </div>

        <div className="rounded-3xl shadow-lg backdrop-blur-sm p-8" style={{ backgroundColor: 'rgba(255,255,255,0.75)', border: '1px solid rgba(143,174,155,0.12)', backdropFilter: 'blur(10px)' }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-heading font-bold mb-2" style={{ color: '#3A3A3A' }}>Welcome Back</h2>
            <p style={{ color: '#6B6B6B' }}>
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
                <Label htmlFor="email" className="font-medium" style={{ color: '#4A4750' }}>Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="focus:border-[#A398C9] focus:ring-[#A398C9]"
                  style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                />
              </div>



              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium" style={{ color: '#4A4750' }}>Password</Label>
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
                    className="focus:border-[#A398C9] focus:ring-[#A398C9] pr-10"
                    style={{ borderColor: 'rgba(143,174,155,0.15)' }}
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
                      <EyeOff className="h-4 w-4" style={{ color: '#8A8A8A' }} />
                    ) : (
                      <Eye className="h-4 w-4" style={{ color: '#8A8A8A' }} />
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
                  className="rounded text-[#A398C9] focus:ring-[#A398C9]"
                  style={{ borderColor: 'rgba(143,174,155,0.3)' }}
                  disabled={isLoading}
                />
                <Label htmlFor="rememberMe" className="text-sm" style={{ color: '#6B6B6B' }}>
                  Remember me
                </Label>
              </div>
            </div>

            <div className="space-y-4 mt-8">
              <button 
                type="submit" 
                className="w-full px-8 py-4 text-white text-lg font-semibold rounded-full transition-all duration-300 ease-out hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: submitHovered ? '#BAA182' : '#C9B398' }}
                onMouseEnter={() => setSubmitHovered(true)}
                onMouseLeave={() => setSubmitHovered(false)}
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
                  <span className="w-full" style={{ borderTop: '1px solid rgba(143,174,155,0.15)' }} />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2" style={{ backgroundColor: '#FAF8F5', color: '#8A8A8A' }}>
                    Or continue with
                  </span>
                </div>
              </div>

              <button 
                type="button" 
                className="w-full px-8 py-4 font-semibold rounded-full transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: anonHovered ? 'rgba(143,174,155,0.14)' : 'rgba(143,174,155,0.08)',
                  border: '2px solid rgba(143,174,155,0.2)',
                  color: '#4A4750'
                }}
                onMouseEnter={() => setAnonHovered(true)}
                onMouseLeave={() => setAnonHovered(false)}
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

              <div className="text-center text-sm" style={{ color: '#6B6B6B' }}>
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-[#A398C9] hover:text-[#8B7FB8] hover:underline font-medium"
                >
                  Sign up
                </Link>
              </div>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}