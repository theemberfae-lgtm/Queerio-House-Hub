// ============================================
// ROOMMATES DIRECTORY
// ============================================
// Shows all household members with their profile info
// Respects privacy settings (show_email, show_birthday)
// Available to all users (not just admin)

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Users, Mail, Calendar, User as UserIcon } from 'lucide-react';

const RoommatesDirectory = () => {
  const { supabase, profile } = useAuth();
  const [roommates, setRoommates] = useState([]);
  const [loading, setLoading] = useState(true);

  // ========================================
  // LOAD ROOMMATES
  // ========================================
  useEffect(() => {
    loadRoommates();
    
    // Listen for profile changes
    const channel = supabase
      .channel('profile_changes_directory')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => loadRoommates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  const getColorClass = (color) => {
    const colorMap = {
      orange: 'bg-orange-200 text-orange-800 border-orange-400',
      green: 'bg-green-200 text-green-800 border-green-400',
      blue: 'bg-blue-200 text-blue-800 border-blue-400',
      purple: 'bg-purple-200 text-purple-800 border-purple-400',
      pink: 'bg-pink-200 text-pink-800 border-pink-400',
      yellow: 'bg-yellow-200 text-yellow-800 border-yellow-400',
      red: 'bg-red-200 text-red-800 border-red-400',
      teal: 'bg-teal-200 text-teal-800 border-teal-400',
    };
    return colorMap[color] || 'bg-gray-200 text-gray-800 border-gray-400';
  };

  const formatBirthday = (birthday) => {
    if (!birthday) return null;
    const date = new Date(birthday + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  // ========================================
  // RENDER
  // ========================================
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <p className="text-gray-600">Loading roommates...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="text-purple-600" size={32} />
          <h2 className="text-2xl md:text-3xl font-bold">Roommates</h2>
        </div>
        <p className="text-gray-600">Your household members</p>
      </div>

      {/* Roommates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roommates.map((roommate) => (
          <div
            key={roommate.id}
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200"
            style={{padding: '1.5rem', overflow: 'hidden'}}
          >
            {/* Name and Color Badge */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-gray-800">
                    {roommate.name}
                  </h3>
                  {roommate.id === profile?.id && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                  {roommate.role === 'admin' && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      Admin
                    </span>
                  )}
                </div>

                {/* Pronouns */}
                {roommate.pronouns && (
                  <p className="text-sm text-gray-600 italic mb-3">
                    {roommate.pronouns}
                  </p>
                )}
              </div>

              {/* Color Badge */}
              {roommate.color && (
                <div
                  className={`px-3 py-1 rounded-full border-2 text-xs font-semibold ${getColorClass(
                    roommate.color
                  )}`}
                >
                  {roommate.color}
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              {/* Email - only show if they allow it */}
              {roommate.show_email !== false && roommate.email && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail size={16} className="text-purple-600 flex-shrink-0" />
                  <span className="break-all">{roommate.email}</span>
                </div>
              )}

              {/* Birthday - only show if they allow it */}
              {roommate.show_birthday !== false && roommate.birthday && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar size={16} className="text-purple-600 flex-shrink-0" />
                  <span>Birthday: {formatBirthday(roommate.birthday)}</span>
                </div>
              )}

              {/* Privacy note if info is hidden */}
              {(roommate.show_email === false || roommate.show_birthday === false) && (
                <p className="text-xs text-gray-500 italic mt-2">
                  Some info hidden by privacy settings
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* No roommates message */}
      {roommates.length === 0 && (
        <div className="text-center py-12">
          <UserIcon className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No roommates yet</p>
        </div>
      )}
    </div>
  );
};

export default RoommatesDirectory;
