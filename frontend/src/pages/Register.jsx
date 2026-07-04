import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BarChart3, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating account...');

    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await axios.post(`${baseURL}/auth/register`, {
        name,
        email,
        password,
        role: 'staff' // defaults to staff
      });

      if (response.data?.success) {
        toast.success('Account created successfully! Please sign in.', { id: toastId });
        navigate('/login');
      } else {
        throw new Error(response.data?.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errMsg = error.response?.data?.error || error.message || 'An error occurred during registration.';
      setValidationError(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Left panel - Branding and showcase (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-slate text-slate-300 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Top brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center text-white shadow-md">
            <BarChart3 size={24} />
          </div>
          <span className="font-extrabold text-white text-xl tracking-tight">StockFlow</span>
        </div>

        {/* Center content */}
        <div className="my-auto space-y-6 relative z-10 max-w-md">
          <Badge variant="green" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-1 px-3">
            v2.1 Stable Release
          </Badge>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
            Create your staff profile.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Join your company's warehouse management ledger. Register as staff to log movements, update product files, and check low-stock levels.
          </p>

          {/* Quick list specs */}
          <div className="space-y-3 pt-4 text-sm font-medium text-slate-300">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
              <span>Individual action logs tracked to your email</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
              <span>Collaborative inventory counts</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
              <span>Secure credential hashing</span>
            </div>
          </div>
        </div>

        {/* Bottom footer */}
        <div className="relative z-10 text-xs text-slate-500 flex justify-between items-center">
          <span>© 2026 StockFlow Systems Inc.</span>
          <span className="bg-slate-800 border border-slate-700/50 rounded px-2.5 py-1">Local Node</span>
        </div>
      </div>

      {/* Right panel - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          
          {/* Mobile-only branding */}
          <div className="flex flex-col items-center lg:hidden mb-8">
            <div className="w-11 h-11 bg-brand-accent rounded-lg flex items-center justify-center text-white mb-2 shadow-md">
              <BarChart3 size={24} />
            </div>
            <h2 className="text-xl font-extrabold text-brand-textMain">StockFlow</h2>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-brand-textMain">
              Create your account
            </h2>
            <p className="text-sm text-brand-textMuted mt-1.5">
              Get started with StockFlow inventory manager.
            </p>
          </div>

          {/* Card Wrapper */}
          <Card className="shadow-subtle border border-brand-border py-7 px-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Validation alert */}
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-md font-medium">
                  {validationError}
                </div>
              )}

              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textLight">
                    <User size={16} />
                  </div>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain placeholder-brand-textLight focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textLight">
                    <Mail size={16} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain placeholder-brand-textLight focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textLight">
                    <Lock size={16} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-9 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain placeholder-brand-textLight focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-textLight hover:text-brand-textMain"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-textLight">
                    <Lock size={16} />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 bg-white border border-brand-border rounded-md text-sm text-brand-textMain placeholder-brand-textLight focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full py-2.5 mt-4 transition-all duration-200 hover:scale-[1.01]"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-brand-textMuted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-accent hover:underline">
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
