// ============================================
// ADMIN PROFILE EDITOR
// ============================================
// Allows admins to edit roommate profile information
// Can edit: name, birthday, pronouns, color
// Cannot edit: privacy settings (show_email, show_birthday)
// Admin-only feature

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Edit2, Save, X, User, Calendar, Palette } from 'lucide-react';

const AdminProfileEditor = () => {
  const { supabase, profile } = useAuth();
  const [roommates, setRoommates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // ========================================
  // LOAD ROOMMATES
  // ========================================
  useEffect(() => {
    loadRoommates();
  }, []);

  const loadRoommates = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading roommates:', error);
        return;
      }

      setRoommates(data || []);
    } catch (e) {
      console.error('Failed to load roommates:', e);
    }
  };

  // ========================================
  // EDIT FUNCTIONS
  // ========================================
  const startEditing = (roommate) => {
    setEditingId(roommate.id);
    setEditForm({
      name: roommate.name || '',
      birthday: roommate.birthday || '',
      pronouns: roommate.pronouns || '',
      color: roommate.color || 'purple',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveProfile = async (roommateId) => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          birthday: editForm.birthday,
          pronouns: editForm.pronouns,
          color: editForm.color,
        })
        .eq('id', roommateId);

      if (error) throw error;

      // Reload roommates to show updated data
      await loadRoommates();

      showMessage('✅ Profile updated successfully!', 'success');
      setEditingId(null);
      setEditForm({});
    } catch (e) {
      console.error('Failed to save profile:', e);
      showMessage('❌ Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  const colorOptions = [
    { value: 'orange', label: 'Orange', class: 'bg-orange-200 text-orange-800' },
    { value: 'green', label: 'Green', class: 'bg-green-200 text-green-800' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-200 text-blue-800' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-200 text-purple-800' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-200 text-pink-800' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-200 text-yellow-800' },
    { value: 'red', label: 'Red', class: 'bg-red-200 text-red-800' },
    { value: 'teal', label: 'Teal', class: 'bg-teal-200 text-teal-800' },
  ];

  const getColorClass = (colorValue) => {
    const option = colorOptions.find((opt) => opt.value === colorValue);
    return option ? option.class : 'bg-gray-200 text-gray-800';
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Edit2 className="text-purple-600" size={28} />
          <h3 className="text-xl md:text-2xl font-bold">Edit Roommate Profiles</h3>
        </div>
        <p className="text-sm text-gray-600">
          Update profile information for any household member
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Note: You cannot change privacy settings (email/birthday visibility) - only the user can control those
        </p>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div
          className={`mb-4 rounded-lg border-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-400'
              : 'bg-red-50 text-red-800 border-red-400'
          }`}
          style={{padding: '1.25rem', overflow: 'hidden'}}
        >
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      {/* Roommates List */}
      <div className="space-y-4">
        {roommates.map((roommate) => (
          <div
            key={roommate.id}
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200"
            style={{padding: '1.5rem', overflow: 'hidden'}}
          >
            {editingId === roommate.id ? (
              // EDITING MODE
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    style={{padding: '14px'}}
                    placeholder="Name"
                  />
                </div>

                {/* Pronouns */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pronouns
                  </label>
                  <input
                    type="text"
                    value={editForm.pronouns}
                    onChange={(e) =>
                      setEditForm({ ...editForm, pronouns: e.target.value })
                    }
                    className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    style={{padding: '14px'}}
                    placeholder="e.g., she/her, he/him, they/them"
                  />
                </div>

                {/* Birthday */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birthday
                  </label>
                  <input
                    type="date"
                    value={editForm.birthday}
                    onChange={(e) =>
                      setEditForm({ ...editForm, birthday: e.target.value })
                    }
                    className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    style={{padding: '14px'}}
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        onClick={() =>
                          setEditForm({ ...editForm, color: colorOption.value })
                        }
                        className={`rounded-lg border-2 text-xs font-semibold transition-all ${
                          editForm.color === colorOption.value
                            ? `${getColorClass(colorOption.value)} border-gray-600`
                            : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                        style={{padding: '8px'}}
                      >
                        {colorOption.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => saveProfile(roommate.id)}
                    disabled={saving}
                    className="flex-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2"
                    style={{padding: '12px'}}
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100"
                    style={{padding: '12px 16px'}}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              // VIEW MODE
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-bold text-gray-800">
                      {roommate.name}
                    </h4>
                    {roommate.id === profile?.id && (
                      <span 
                        className="text-xs bg-blue-100 text-blue-700 rounded font-semibold"
                        style={{padding: '6px 12px', whiteSpace: 'nowrap'}}
                      >
                        You
                      </span>
                    )}
                    {roommate.role === 'admin' && (
                      <span 
                        className="text-xs bg-purple-100 text-purple-700 rounded font-semibold"
                        style={{padding: '6px 12px', whiteSpace: 'nowrap'}}
                      >
                        Admin
                      </span>
                    )}
                    {roommate.color && (
                      <span
                        className={`text-xs rounded font-semibold ${getColorClass(
                          roommate.color
                        )}`}
                        style={{padding: '6px 12px', whiteSpace: 'nowrap'}}
                      >
                        {roommate.color}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    {roommate.pronouns && (
                      <p className="italic">{roommate.pronouns}</p>
                    )}
                    {roommate.email && (
                      <p className="flex items-center gap-1">
                        <span className="font-medium">Email:</span> {roommate.email}
                      </p>
                    )}
                    {roommate.birthday && (
                      <p className="flex items-center gap-1">
                        <Calendar size={14} className="inline" />
                        <span className="font-medium">Birthday:</span>{' '}
                        {new Date(roommate.birthday + 'T00:00:00').toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => startEditing(roommate)}
                  className="ml-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-semibold"
                  style={{padding: '8px 16px', whiteSpace: 'nowrap'}}
                >
                  <Edit2 size={16} />
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {roommates.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No roommates to edit</p>
        </div>
      )}
    </div>
  );
};

export default AdminProfileEditor;
