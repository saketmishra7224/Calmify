import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, EyeOff, Info } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient' as 'patient' | 'peer',
    profile: {
      firstName: '',
      lastName: '',
      age: '',
      preferredName: '',
      phoneNumber: '',
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      }
    },
    agreedToTerms: false,
    agreedToPrivacy: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitHovered, setSubmitHovered] = useState(false);

  // Redirect if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!formData.agreedToTerms || !formData.agreedToPrivacy) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        profile: {
          firstName: formData.profile.firstName,
          lastName: formData.profile.lastName,
          age: formData.profile.age ? parseInt(formData.profile.age) : undefined,
          preferredName: formData.profile.preferredName || undefined,
          phoneNumber: formData.profile.phoneNumber || undefined,
          emergencyContact: formData.profile.emergencyContact.name ? {
            name: formData.profile.emergencyContact.name,
            relationship: formData.profile.emergencyContact.relationship,
            phone: formData.profile.emergencyContact.phone
          } : undefined
        },
        agreedToTerms: formData.agreedToTerms,
        agreedToPrivacy: formData.agreedToPrivacy
      };

      await register(userData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child, grandchild] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: grandchild ? {
            ...(prev[parent as keyof typeof prev] as any)[child],
            [grandchild]: type === 'checkbox' ? checked : value
          } : (type === 'checkbox' ? checked : value)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleRoleChange = (value: 'patient' | 'peer') => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#A398C9' }} />
          <span className="ml-2" style={{ color: '#6B6B6B' }}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FAF7F2' }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/calmifylogo.png" alt="Calmify Logo" className="h-12 w-auto object-contain" />
            <h1 className="text-3xl font-heading font-bold" style={{ color: '#3A3A3A' }}>Calmify</h1>
          </div>
          <p style={{ color: '#6B6B6B' }}>
            Join our supportive community for mental health
          </p>
        </div>

        <div className="rounded-3xl shadow-lg p-8" style={{ backgroundColor: 'rgba(255,255,255,0.75)', border: '1px solid rgba(143,174,155,0.12)', backdropFilter: 'blur(10px)' }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-heading font-bold mb-2" style={{ color: '#3A3A3A' }}>Create Your Account</h2>
            <p style={{ color: '#6B6B6B' }}>
              Start your journey to better mental health with us
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-heading font-semibold" style={{ color: '#3A3A3A' }}>Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="font-medium" style={{ color: '#4A4A4A' }}>Username *</Label>
                    <Input
                      id="username"
                      name="username"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                      className="focus:border-[#A398C9] focus:ring-[#A398C9]"
                      style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-medium" style={{ color: '#4A4A4A' }}>Email *</Label>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-medium" style={{ color: '#4A4A4A' }}>Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
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
                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-medium" style={{ color: '#4A4A4A' }}>Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
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
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="font-medium" style={{ color: '#4A4A4A' }}>Role *</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={handleRoleChange} 
                    disabled={isLoading}
                  >
                    <SelectTrigger className="focus:border-[#A398C9] focus:ring-[#A398C9]" style={{ borderColor: 'rgba(143,174,155,0.15)' }}>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">
                        <div className="flex flex-col">
                          <span>Patient/Student</span>
                          <span className="text-xs" style={{ color: '#8A8A8A' }}>Seeking mental health support</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="peer">
                        <div className="flex flex-col">
                          <span>Peer Volunteer</span>
                          <span className="text-xs" style={{ color: '#8A8A8A' }}>Trained to provide peer support</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Profile Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-heading font-semibold" style={{ color: '#3A3A3A' }}>Profile Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile.firstName" className="font-medium" style={{ color: '#4A4A4A' }}>First Name</Label>
                    <Input
                      id="profile.firstName"
                      name="profile.firstName"
                      placeholder="Your first name"
                      value={formData.profile.firstName}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="focus:border-[#A398C9] focus:ring-[#A398C9]"
                      style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile.lastName" className="font-medium" style={{ color: '#4A4A4A' }}>Last Name</Label>
                    <Input
                      id="profile.lastName"
                      name="profile.lastName"
                      placeholder="Your last name"
                      value={formData.profile.lastName}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="focus:border-[#A398C9] focus:ring-[#A398C9]"
                      style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile.preferredName" className="font-medium" style={{ color: '#4A4A4A' }}>Preferred Name</Label>
                    <Input
                      id="profile.preferredName"
                      name="profile.preferredName"
                      placeholder="What should we call you?"
                      value={formData.profile.preferredName}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="focus:border-[#A398C9] focus:ring-[#A398C9]"
                      style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile.age" className="font-medium" style={{ color: '#4A4A4A' }}>Age</Label>
                    <Input
                      id="profile.age"
                      name="profile.age"
                      type="number"
                      min="13"
                      max="120"
                      placeholder="Your age"
                      value={formData.profile.age}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="focus:border-[#A398C9] focus:ring-[#A398C9]"
                      style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-heading font-semibold" style={{ color: '#3A3A3A' }}>Emergency Contact</h3>
                  <Info className="h-4 w-4 text-gray-500" />
                </div>
                <p className="text-sm" style={{ color: '#8A8A8A' }}>
                  Optional but recommended for crisis situations
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile.emergencyContact.name" className="font-medium" style={{ color: '#4A4A4A' }}>Contact Name</Label>
                    <Input
                      id="profile.emergencyContact.name"
                      name="profile.emergencyContact.name"
                      placeholder="Emergency contact name"
                      value={formData.profile.emergencyContact.name}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="focus:border-[#A398C9] focus:ring-[#A398C9]"
                      style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile.emergencyContact.relationship" className="font-medium" style={{ color: '#4A4A4A' }}>Relationship</Label>
                    <Input
                      id="profile.emergencyContact.relationship"
                      name="profile.emergencyContact.relationship"
                      placeholder="e.g., Parent, Sibling, Friend"
                      value={formData.profile.emergencyContact.relationship}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="focus:border-[#A398C9] focus:ring-[#A398C9]"
                      style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile.emergencyContact.phone" className="font-medium" style={{ color: '#4A4A4A' }}>Contact Phone</Label>
                  <Input
                    id="profile.emergencyContact.phone"
                    name="profile.emergencyContact.phone"
                    type="tel"
                    placeholder="Emergency contact phone number"
                    value={formData.profile.emergencyContact.phone}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="focus:border-[#A398C9] focus:ring-[#A398C9]"
                    style={{ borderColor: 'rgba(143,174,155,0.15)' }}
                  />
                </div>
              </div>

              {/* Terms and Privacy */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      id="agreedToTerms"
                      name="agreedToTerms"
                      type="checkbox"
                      checked={formData.agreedToTerms}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-[#A398C9] focus:ring-[#A398C9]"
                      disabled={isLoading}
                      required
                    />
                    <Label htmlFor="agreedToTerms" className="text-sm" style={{ color: '#6B6B6B' }}>
                      I agree to the{' '}
                      <Link to="/terms" className="text-[#A398C9] hover:text-[#8B7FB8] hover:underline">
                        Terms of Service
                      </Link>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="agreedToPrivacy"
                      name="agreedToPrivacy"
                      type="checkbox"
                      checked={formData.agreedToPrivacy}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-[#A398C9] focus:ring-[#A398C9]"
                      disabled={isLoading}
                      required
                    />
                    <Label htmlFor="agreedToPrivacy" className="text-sm" style={{ color: '#6B6B6B' }}>
                      I agree to the{' '}
                      <Link to="/privacy" className="text-[#A398C9] hover:text-[#8B7FB8] hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 mt-8">
              <button 
                type="submit" 
                className="w-full px-8 py-4 text-white text-lg font-semibold rounded-full transition-all duration-300 ease-out hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: submitHovered ? '#D57A57' : '#E08E6D' }}
                onMouseEnter={() => setSubmitHovered(true)}
                onMouseLeave={() => setSubmitHovered(false)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>

              <div className="text-center text-sm" style={{ color: '#6B6B6B' }}>
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-[#A398C9] hover:text-[#8B7FB8] hover:underline font-medium"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}