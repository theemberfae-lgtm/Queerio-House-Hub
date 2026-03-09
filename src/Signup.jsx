import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home } from 'lucide-react';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');
  const inviteEmail = searchParams.get('email');
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp, completeInviteSignup, user, supabase } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!inviteToken || !inviteEmail) {
      setError('Invalid invite link. Please use the link from your invitation email.');
    }
  }, [inviteToken, inviteEmail]);

  // True if they arrived via Supabase magic link email (already logged in)
  const isAlreadyAuthenticated = !!user;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!inviteToken || !inviteEmail) {
      setError('Invalid invite link');
      return;
    }

    // Always require password — they need it to log in again in the future!
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isAlreadyAuthenticated) {
        // MAGIC LINK FLOW: Already logged in via Supabase invite email.
        // We still need to:
        // 1. Set their password so they can log in normally next time
        // 2. Create their profile row in our database
        
        // Step 1: Set the password on their existing auth account
        const { error: passwordError } = await supabase.auth.updateUser({ 
          password: password 
        });
        if (passwordError) throw passwordError;

        // Step 2: Create their profile and mark invite as used
        await completeInviteSignup(user.id, inviteEmail, name, inviteToken);
      } else {
        // MANUAL FLOW: Got the link copy-pasted, not via email.
        // Create both auth account and profile from scratch.
        await signUp(inviteEmail, password, name, inviteToken);
      }

      // Either way, send them home!
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Home className="text-purple-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">Queerio House Hub</h1>
          </div>
          <p className="text-gray-600">Create your account</p>
          {inviteEmail && (
            <p className="text-sm text-purple-600 mt-2">
              Invited as: {inviteEmail}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name — always shown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          {/* Email — always shown, locked to invite email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={inviteEmail || ''}
              disabled
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
          </div>

          {/* Password — always shown so they can log in again later! */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !inviteToken || !inviteEmail}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Setting up your account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-purple-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
