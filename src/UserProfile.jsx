import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { User, Mail, Calendar, MessageSquare, Eye, EyeOff } from 'lucide-react';

const UserProfile = () => {
  const { profile, updateProfile, supabase } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [birthday, setBirthday] = useState('');
  const [showEmail, setShowEmail] = useState(true);
  const [showBirthday, setShowBirthday] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPronouns(profile.pronouns || '');
      setBirthday(profile.birthday || '');
      setShowEmail(profile.show_email !== false); // default true
      setShowBirthday(profile.show_birthday !== false); // default true
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      await updateProfile({
        name,
        pronouns,
        birthday: birthday || null,
        show_email: showEmail,
        show_birthday: showBirthday
      });

      setMessage('✅ Profile updated successfully!');
      setEditing(false);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setName(profile.name || '');
    setPronouns(profile.pronouns || '');
    setBirthday(profile.birthday || '');
    setShowEmail(profile.show_email !== false);
    setShowBirthday(profile.show_birthday !== false);
    setEditing(false);
    setMessage('');
  };

  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <p className="text-center text-gray-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg px-20 py-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Profile Settings</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <User size={18} />
            Name
          </label>
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Your name"
              required
            />
          ) : (
            <p className="text-lg font-semibold">{profile.name}</p>
          )}
        </div>

        {/* Email (read-only, with privacy toggle) */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Mail size={18} />
            Email
          </label>
          <div className="flex items-center gap-4">
            <p className="text-gray-700">{profile.email}</p>
            {editing && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEmail}
                  onChange={(e) => setShowEmail(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  {showEmail ? <Eye size={16} /> : <EyeOff size={16} />}
                  {showEmail ? 'Visible to others' : 'Hidden from others'}
                </span>
              </label>
            )}
            {!editing && !profile.show_email && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Hidden</span>
            )}
          </div>
        </div>

        {/* Pronouns */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MessageSquare size={18} />
            Pronouns <span className="text-xs text-gray-500">(optional)</span>
          </label>
          {editing ? (
            <input
              type="text"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., she/her, he/him, they/them"
            />
          ) : (
            <p className="text-gray-700">{profile.pronouns || 'Not set'}</p>
          )}
        </div>

        {/* Birthday */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar size={18} />
            Birthday <span className="text-xs text-gray-500">(optional)</span>
          </label>
          {editing ? (
            <>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 mb-2"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBirthday}
                  onChange={(e) => setShowBirthday(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  {showBirthday ? <Eye size={16} /> : <EyeOff size={16} />}
                  {showBirthday ? 'Visible to others' : 'Hidden from others'}
                </span>
              </label>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {profile.birthday ? (
                <>
                  <p className="text-gray-700">{new Date(profile.birthday).toLocaleDateString()}</p>
                  {!profile.show_birthday && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Hidden</span>
                  )}
                </>
              ) : (
                <p className="text-gray-500">Not set</p>
              )}
            </div>
          )}
        </div>

        {/* Role (read-only) */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Role
          </label>
          <span className={`inline-block px-3 py-1 rounded text-sm ${profile.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
            {profile.role === 'admin' ? 'Admin' : 'User'}
          </span>
        </div>
      </div>

      {editing && (
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-8 pt-6 border-t">
        <p className="text-sm text-gray-500">
          <strong>Privacy Note:</strong> Hidden information is not visible to other roommates but can always be seen by admins.
        </p>
      </div>
    </div>
  );
};

export default UserProfile;