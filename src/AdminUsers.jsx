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
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const { data: { user } } = await supabase.auth.getUser();

      const { error: inviteError } = await supabase
        .from('invites')
        .insert({
          email: inviteEmail,
          token: token,
          invited_by: user.id
        });

      if (inviteError) throw inviteError;

      const inviteLink = `${window.location.origin}/signup?token=${token}&email=${encodeURIComponent(inviteEmail)}`;
      
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
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem'}}>
        <p className="text-center text-gray-600">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ✅ FIXED: Send Invite Section - MORE padding on TOP and LEFT */}
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{marginBottom: '2rem'}}>
          <UserPlus className="text-purple-600" style={{flexShrink: 0}} />
          <span style={{wordBreak: 'break-word'}}>Invite Roommate</span>
        </h2>

        {message && (
          <div 
            className={`rounded-lg ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
            style={{padding: '1rem', overflow: 'hidden', marginBottom: '1.5rem'}}
          >
            <p style={{wordBreak: 'break-word'}}>{message}</p>
          </div>
        )}

        <form onSubmit={sendInvite} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700" style={{marginBottom: '0.75rem'}}>
              Roommate's Email
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="roommate@email.com"
              style={{padding: '0.75rem'}}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            style={{
              padding: '0.75rem',
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? 'Sending email...' : 'Send Invite Email'}
          </button>
        </form>
      </div>

      {/* ✅ FIXED: Pending Invites - MORE padding on TOP and LEFT */}
      {invites.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
          <h3 className="text-xl font-bold flex items-center gap-2" style={{marginBottom: '1.5rem'}}>
            <Mail className="text-blue-600" style={{flexShrink: 0}} />
            <span style={{wordBreak: 'break-word'}}>Pending Invites</span>
          </h3>
          <div className="space-y-4">
            {invites.filter(i => !i.used).map(invite => (
              <div 
                key={invite.id} 
                className="bg-gray-50 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                style={{padding: '1.5rem', overflow: 'hidden'}}
              >
                <div style={{flex: 1, minWidth: 0}}>
                  <p className="font-medium" style={{wordBreak: 'break-word', marginBottom: '0.5rem'}}>{invite.email}</p>
                  <p className="text-sm text-gray-600">
                    Sent: {new Date(invite.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2" style={{flexShrink: 0}}>
                  <button
                    onClick={() => copyInviteLink(invite.token, invite.email)}
                    className="bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    style={{
                      padding: '0.5rem 1rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => deleteInvite(invite.id)}
                    className="bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    style={{
                      padding: '0.5rem 0.75rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ FIXED: Current Users - MORE padding on TOP and LEFT */}
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <h3 className="text-xl font-bold flex items-center gap-2" style={{marginBottom: '1.5rem'}}>
          <Users className="text-green-600" style={{flexShrink: 0}} />
          <span style={{wordBreak: 'break-word'}}>Current Users</span>
        </h3>
        <div className="space-y-4">
          {users.map(user => (
            <div 
              key={user.id} 
              className="bg-gray-50 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              style={{padding: '1.5rem', overflow: 'hidden'}}
            >
              <div style={{flex: 1, minWidth: 0}}>
                <p className="font-medium" style={{wordBreak: 'break-word', marginBottom: '0.5rem'}}>{user.name}</p>
                <p className="text-sm text-gray-600" style={{wordBreak: 'break-word', marginBottom: '0.5rem'}}>{user.email}</p>
                {user.role === 'admin' && (
                  <span 
                    className="text-xs bg-purple-100 text-purple-700 rounded inline-block"
                    style={{
                      padding: '0.25rem 0.5rem',
                      whiteSpace: 'nowrap',
                      marginTop: '0.25rem'
                    }}
                  >
                    Admin
                  </span>
                )}
              </div>
              {user.role !== 'admin' && (
                <button
                  onClick={() => deleteUser(user.id)}
                  className="bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  style={{
                    padding: '0.5rem 1rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
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
