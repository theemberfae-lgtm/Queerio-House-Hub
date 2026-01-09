import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Mail, UserPlus, Trash2, Users } from 'lucide-react';

const AdminUsers = () => {
  const { supabase, isAdmin } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadInvites();
      loadUsers();
    }
  }, [isAdmin]);

  const loadInvites = async () => {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setInvites(data);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setUsers(data);
    }
  };

const sendInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Generate unique token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create invite in database
      const { error: inviteError } = await supabase
        .from('invites')
        .insert({
          email: inviteEmail,
          token: token,
          invited_by: user.id
        });

      if (inviteError) throw inviteError;

      // Create invite link
      const inviteLink = `${window.location.origin}/signup?token=${token}&email=${encodeURIComponent(inviteEmail)}`;
      
      // Send email via our API
      const emailResponse = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          inviteLink: inviteLink
        })
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      setMessage(`✅ Invite sent to ${inviteEmail}! They should receive the email shortly.`);
      setInviteEmail('');
      loadInvites();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvite = async (id) => {
    const { error } = await supabase
      .from('invites')
      .delete()
      .eq('id', id);

    if (!error) {
      loadInvites();
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user?')) return;

    // Delete from profiles
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (!error) {
      loadUsers();
    }
  };

  const copyInviteLink = (token, email) => {
    const inviteLink = `${window.location.origin}/signup?token=${token}&email=${encodeURIComponent(email)}`;
    navigator.clipboard.writeText(inviteLink);
    setMessage('Invite link copied to clipboard!');
    setTimeout(() => setMessage(''), 3000);
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <p className="text-center text-gray-600">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Send Invite */}
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <UserPlus className="text-purple-600" />
          Invite Roommate
        </h2>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={sendInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roommate's Email
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="roommate@email.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Sending email...' : 'Send Invite Email'}
          </button>
        </form>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg px-20 py-12">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Mail className="text-blue-600" />
            Pending Invites
          </h3>
          <div className="space-y-3">
            {invites.filter(i => !i.used).map(invite => (
              <div key={invite.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-sm text-gray-600">
                    Sent: {new Date(invite.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyInviteLink(invite.token, invite.email)}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => deleteInvite(invite.id)}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Users */}
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Users className="text-green-600" />
          Current Users
        </h3>
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                {user.role === 'admin' && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mt-1 inline-block">
                    Admin
                  </span>
                )}
              </div>
              {user.role !== 'admin' && (
                <button
                  onClick={() => deleteUser(user.id)}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;