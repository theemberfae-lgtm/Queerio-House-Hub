// ============================================
// COMPLETE USER PROFILE WITH PRONOUNS & PRIVACY
// ============================================
// Features:
// - Edit name, birthday, pronouns, color
// - Privacy toggles for email and birthday visibility
// - Auto-creates birthday event ONLY if show_birthday is true
// - Sound and animation preferences

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Save, Waves, User, Calendar, Palette, Eye, EyeOff } from 'lucide-react';

const UserProfile = () => {
  const { supabase, profile, updateProfile } = useAuth();
  
  // ========================================
  // STATE VARIABLES
  // ========================================
  
  // Personal information
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [pronouns, setPronouns] = useState('');        // NEW!
  const [color, setColor] = useState('');
  
  // Privacy settings
  const [showEmail, setShowEmail] = useState(true);     // NEW!
  const [showBirthday, setShowBirthday] = useState(true); // NEW!
  
  // Preferences
  const [animationLevel, setAnimationLevel] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  useEffect(() => {
    loadPreferences();
  }, [profile]);

  // ========================================
  // LOAD USER DATA
  // ========================================
  const loadPreferences = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
      
      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }
      
      if (data) {
        // Personal info
        setName(data.name || '');
        setBirthday(data.birthday || '');
        setPronouns(data.pronouns || '');          // NEW!
        setColor(data.color || 'purple');
        
        // Privacy settings - default to true if not set
        setShowEmail(data.show_email !== false);    // NEW!
        setShowBirthday(data.show_birthday !== false); // NEW!
        
        // Preferences
        if (data.preferences) {
          const prefs = typeof data.preferences === 'string' 
            ? JSON.parse(data.preferences) 
            : data.preferences;
          
          setAnimationLevel(prefs.animationLevel || 'medium');
          
          applyAnimationLevel(prefs.animationLevel || 'medium');
        }
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
  };

  // ========================================
  // AUTO-CREATE/UPDATE/DELETE BIRTHDAY EVENT
  // ========================================
  const manageBirthdayEvent = async (userBirthday, userName, shouldShow) => {
    try {
      // Get current household data
      const { data: currentData } = await supabase
        .from('household_data')
        .select('*')
        .eq('key', 'app_data')
        .single();
      
      if (!currentData?.value) return;
      
      const parsed = typeof currentData.value === 'string' 
        ? JSON.parse(currentData.value) 
        : currentData.value;
      
      const events = parsed.events || [];
      const birthdayEventId = `birthday-${profile.id}`;
      
      // If user doesn't want to show birthday, DELETE the event
      if (!shouldShow) {
        const updatedEvents = events.filter(e => e.id !== birthdayEventId);
        
        const updatedData = {
          ...parsed,
          events: updatedEvents
        };
        
        await supabase
          .from('household_data')
          .upsert({
            key: 'app_data',
            value: JSON.stringify(updatedData)
          }, {
            onConflict: 'key'
          });
        
        console.log('Birthday event removed (privacy setting)');
        return;
      }
      
      // If they want to show it AND they have a birthday, CREATE/UPDATE event
      if (!userBirthday || !userName) {
        return;
      }
      
      const existingBirthdayEvent = events.find(e => e.id === birthdayEventId);
      
      // Calculate next birthday
      const [year, month, day] = userBirthday.split('-');
      const currentYear = new Date().getFullYear();
      const nextBirthday = `${currentYear}-${month}-${day}`;
      
      const birthdayThisYear = new Date(nextBirthday);
      const today = new Date();
      let displayDate = nextBirthday;
      
      // If birthday passed this year, show next year's
      if (birthdayThisYear < today) {
        displayDate = `${currentYear + 1}-${month}-${day}`;
      }
      
      const birthdayEvent = {
        id: birthdayEventId,
        title: `🎂 ${userName}'s Birthday`,
        date: displayDate,
        time: '',
        description: `${userName} was born on this day!`,
        link: '',
        createdBy: profile.id,
        createdByName: userName,
        isBirthday: true,
        recurring: true,
        recurrenceType: 'yearly'
      };
      
      let updatedEvents;
      if (existingBirthdayEvent) {
        // Update existing
        updatedEvents = events.map(e => 
          e.id === birthdayEventId ? birthdayEvent : e
        );
      } else {
        // Add new
        updatedEvents = [...events, birthdayEvent];
      }
      
      const updatedData = {
        ...parsed,
        events: updatedEvents
      };
      
      await supabase
        .from('household_data')
        .upsert({
          key: 'app_data',
          value: JSON.stringify(updatedData)
        }, {
          onConflict: 'key'
        });
      
      console.log('Birthday event created/updated');
    } catch (e) {
      console.error('Failed to manage birthday event:', e);
    }
  };

  // ========================================
  // SAVE ALL CHANGES
  // ========================================
  const savePreferences = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    
    const preferences = {
      animationLevel
    };
    
    try {
      // Save everything to database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name: name,
          birthday: birthday,
          pronouns: pronouns,           // NEW!
          color: color,
          show_email: showEmail,        // NEW!
          show_birthday: showBirthday,  // NEW!
          preferences: JSON.stringify(preferences)
        })
        .eq('id', profile.id);
      
      if (error) {
        throw error;
      }
      
      applyAnimationLevel(animationLevel);
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      
      // Update profile globally
      await updateProfile({ 
        name, 
        birthday, 
        pronouns, 
        color, 
        show_email: showEmail, 
        show_birthday: showBirthday 
      });
      
      // Manage birthday event based on privacy setting
      await manageBirthdayEvent(birthday, name, showBirthday);
      
      showMessage('✅ All changes saved!', 'success');
    } catch (e) {
      console.error('Failed to save:', e);
      showMessage('❌ Failed to save changes', 'error');
    }
    
    setSaving(false);
  };

  // ========================================
  // HELPER FUNCTIONS
  // ========================================
  
  const applyAnimationLevel = (level) => {
    document.body.setAttribute('data-animation-level', level);
    window.userAnimationLevel = level;
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000); // Show for 5 seconds instead of 3
  };

  const colorOptions = [
    { value: 'orange', label: 'Orange', class: 'bg-orange-200 text-orange-800' },
    { value: 'green', label: 'Green', class: 'bg-green-200 text-green-800' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-200 text-blue-800' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-200 text-purple-800' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-200 text-pink-800' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-200 text-yellow-800' },
    { value: 'red', label: 'Red', class: 'bg-red-200 text-red-800' },
    { value: 'teal', label: 'Teal', class: 'bg-teal-200 text-teal-800' }
  ];

  const getColorClass = (colorValue) => {
    const option = colorOptions.find(opt => opt.value === colorValue);
    return option ? option.class : 'bg-gray-200 text-gray-800';
  };

  // ========================================
  // RENDER COMPONENT
  // ========================================
  return (
    <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Your Profile</h2>
      
      {/* Success/Error Messages - More prominent! */}
      {message && (
        <div 
          className={`mb-6 rounded-lg border-2 font-semibold text-center ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-400' 
              : 'bg-red-50 text-red-800 border-red-400'
          }`}
          style={{
            padding: '1.25rem', 
            overflow: 'hidden',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <p className="text-lg" style={{wordBreak: 'break-word'}}>
            {message.text}
          </p>
        </div>
      )}
      
      {/* ========================================
          PERSONAL INFORMATION
          ======================================== */}
      <div className="mb-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200" style={{padding: '1.5rem', overflow: 'hidden'}}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="text-purple-600" size={24} style={{flexShrink: 0}} />
          <span>Personal Information</span>
        </h3>
        
        {/* Name Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            style={{padding: '14px'}}
            placeholder="Your name"
          />
          <p className="text-xs text-gray-600 mt-1">
            This is how your name appears throughout the app
          </p>
        </div>

        {/* Pronouns Input - NEW! */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pronouns
          </label>
          <input
            type="text"
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            style={{padding: '14px'}}
            placeholder="e.g., she/her, he/him, they/them"
          />
          <p className="text-xs text-gray-600 mt-1">
            Optional - helps roommates address you correctly
          </p>
        </div>

        {/* Birthday Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar size={16} className="text-purple-600" />
            Birthday
          </label>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            style={{padding: '14px'}}
          />
          <p className="text-xs text-gray-600 mt-1">
            🎂 {showBirthday 
              ? "Your birthday will appear in the events calendar!" 
              : "Your birthday is private (see privacy settings below)"}
          </p>
        </div>

        {/* Color Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Palette size={16} className="text-purple-600" />
            Your Color
          </label>
          <p className="text-xs text-gray-600 mb-3">
            This color represents you in chores, bills, and item rotations
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {colorOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setColor(option.value)}
                className={`rounded-lg border-2 transition-all ${
                  color === option.value
                    ? 'border-purple-600 ring-2 ring-purple-300'
                    : 'border-gray-300 hover:border-purple-400'
                } ${option.class}`}
                style={{
                  padding: '0.75rem',
                  overflow: 'hidden'
                }}
              >
                <div className="font-semibold text-sm" style={{whiteSpace: 'nowrap'}}>
                  {option.label}
                </div>
                {color === option.value && (
                  <div className="text-xs mt-1">✓ Selected</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* ========================================
          PRIVACY SETTINGS - NEW!
          ======================================== */}
      <div className="mb-8 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200" style={{padding: '1.5rem', overflow: 'hidden'}}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Eye className="text-blue-600" size={24} style={{flexShrink: 0}} />
          <span>Privacy Settings</span>
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Control what information is visible to your roommates
        </p>
        
        {/* Show Email Toggle */}
        <div className="mb-4 bg-white rounded-lg border-2 border-blue-200" style={{padding: '1rem'}}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1" style={{minWidth: 0}}>
              <div className="flex items-center gap-2 mb-1">
                {showEmail ? (
                  <Eye className="text-blue-600" size={20} style={{flexShrink: 0}} />
                ) : (
                  <EyeOff className="text-gray-400" size={20} style={{flexShrink: 0}} />
                )}
                <h4 className="font-semibold text-sm">Show Email to Roommates</h4>
              </div>
              <p className="text-xs text-gray-600">
                {showEmail 
                  ? "Your email is visible to other household members" 
                  : "Your email is hidden from other household members"}
              </p>
            </div>
            
            <button
              onClick={() => setShowEmail(!showEmail)}
              className={`relative rounded-full transition-colors ${
                showEmail ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              style={{
                width: '56px',
                height: '32px',
                flexShrink: 0
              }}
            >
              <div 
                className={`absolute top-1 left-1 bg-white rounded-full transition-transform ${
                  showEmail ? 'transform translate-x-6' : ''
                }`}
                style={{width: '24px', height: '24px'}}
              />
            </button>
          </div>
        </div>
        
        {/* Show Birthday Toggle */}
        <div className="bg-white rounded-lg border-2 border-blue-200" style={{padding: '1rem'}}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1" style={{minWidth: 0}}>
              <div className="flex items-center gap-2 mb-1">
                {showBirthday ? (
                  <Eye className="text-blue-600" size={20} style={{flexShrink: 0}} />
                ) : (
                  <EyeOff className="text-gray-400" size={20} style={{flexShrink: 0}} />
                )}
                <h4 className="font-semibold text-sm">Show Birthday in Calendar</h4>
              </div>
              <p className="text-xs text-gray-600">
                {showBirthday 
                  ? "🎂 Your birthday appears as an event in the shared calendar" 
                  : "🔒 Your birthday is private and won't appear in the calendar"}
              </p>
            </div>
            
            <button
              onClick={() => setShowBirthday(!showBirthday)}
              className={`relative rounded-full transition-colors ${
                showBirthday ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              style={{
                width: '56px',
                height: '32px',
                flexShrink: 0
              }}
            >
              <div 
                className={`absolute top-1 left-1 bg-white rounded-full transition-transform ${
                  showBirthday ? 'transform translate-x-6' : ''
                }`}
                style={{width: '24px', height: '24px'}}
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* Email Display */}
      <div className="mb-8 bg-gray-50 rounded-lg" style={{padding: '1.5rem', overflow: 'hidden'}}>
        <h3 className="text-lg font-semibold mb-4">Account Email</h3>
        <p className="text-gray-600 text-sm mb-2">Your login email:</p>
        <p className="font-semibold" style={{wordBreak: 'break-word'}}>{profile?.email}</p>
        <p className="text-xs text-gray-500 mt-2">
          ℹ️ Email cannot be changed here. Contact your admin if you need to update it.
        </p>
      </div>
      
      {/* ========================================
          APPEARANCE & SOUND - TEMPORARILY HIDDEN
          ======================================== */}
      {/* Commented out for now - can be re-enabled later
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Appearance & Sound</h3>
        
  
        
        <div className="bg-purple-50 rounded-lg border-2 border-purple-200" style={{padding: '1.5rem', overflow: 'hidden'}}>
          <div className="flex items-center gap-2 mb-3">
            <Waves className="text-purple-600" size={24} style={{flexShrink: 0}} />
            <h4 className="font-semibold text-base md:text-lg">Animation Intensity</h4>
          </div>
          <p className="text-xs md:text-sm text-gray-600 mb-4">
            Control animation levels. Lower settings improve performance.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'off', label: 'Off', desc: 'No animations' },
              { value: 'subtle', label: 'Subtle', desc: 'Minimal motion' },
              { value: 'medium', label: 'Medium', desc: 'Balanced' },
              { value: 'full', label: 'Full', desc: 'All effects' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setAnimationLevel(option.value)}
                className={`rounded-lg border-2 transition-all text-left ${
                  animationLevel === option.value
                    ? 'border-purple-600 bg-purple-100'
                    : 'border-gray-300 bg-white hover:border-purple-400'
                }`}
                style={{
                  padding: '1rem',
                  overflow: 'hidden'
                }}
              >
                <div className="font-semibold text-sm md:text-base mb-1" style={{whiteSpace: 'nowrap'}}>{option.label}</div>
                <div className="text-xs text-gray-600" style={{whiteSpace: 'nowrap'}}>{option.desc}</div>
              </button>
            ))}
          </div>
          
          <div className="mt-4 bg-white rounded border" style={{padding: '1rem'}}>
            <p className="text-xs md:text-sm font-semibold mb-2">Preview:</p>
            <div className="relative h-20 bg-gradient-to-b from-cyan-100 to-blue-200 rounded overflow-hidden">
              {animationLevel !== 'off' && (
                <>
                  <div 
                    className={`absolute bottom-0 left-1/4 w-4 h-4 bg-white rounded-full opacity-50 ${
                      animationLevel === 'full' ? 'animate-float-slow' :
                      animationLevel === 'medium' ? 'animate-float-slower' :
                      'animate-float-slowest'
                    }`}
                    style={{ animationDelay: '0s' }}
                  />
                  <div 
                    className={`absolute bottom-0 left-1/2 w-3 h-3 bg-white rounded-full opacity-40 ${
                      animationLevel === 'full' ? 'animate-float-slow' :
                      animationLevel === 'medium' ? 'animate-float-slower' :
                      'animate-float-slowest'
                    }`}
                    style={{ animationDelay: '0.5s' }}
                  />
                  {animationLevel !== 'subtle' && (
                    <div 
                      className={`absolute bottom-0 left-3/4 w-5 h-5 bg-white rounded-full opacity-30 ${
                        animationLevel === 'full' ? 'animate-float-slow' : 'animate-float-slower'
                      }`}
                      style={{ animationDelay: '1s' }}
                    />
                  )}
                  {animationLevel === 'full' && (
                    <>
                      <div className="absolute bottom-0 left-1/3 w-2 h-2 bg-white rounded-full opacity-60 animate-float-slow" style={{ animationDelay: '1.5s' }} />
                      <div className="absolute bottom-0 left-2/3 w-3 h-3 bg-white rounded-full opacity-45 animate-float-slower" style={{ animationDelay: '2s' }} />
                    </>
                  )}
                </>
              )}
              {animationLevel === 'off' && (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  No animations
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      */}
      
      
      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="flex-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold transition-all"
          style={{
            padding: '12px',
            whiteSpace: 'nowrap'
          }}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Saving...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Save className="inline" size={20} />
              Save All Changes
            </span>
          )}
            </>
          )}
        </button>
      </div>
      
      {/* Info Box */}
      <div className="mt-6 bg-yellow-50 border border-yellow-300 rounded-lg" style={{padding: '1rem', overflow: 'hidden'}}>
        <p className="text-xs md:text-sm text-gray-700" style={{wordBreak: 'break-word'}}>
          <strong>💡 Tips:</strong>
          <br />
          • Your settings sync across all devices
          <br />
          • Birthday events only appear if you enable "Show Birthday"
          <br />
          • Privacy settings can be changed anytime
        </p>
      </div>
    </div>
  );
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float-slow {
      0% { transform: translateY(0) scale(1); opacity: 0.5; }
      50% { transform: translateY(-40px) scale(1.1); opacity: 0.7; }
      100% { transform: translateY(-80px) scale(0.8); opacity: 0; }
    }
    @keyframes float-slower {
      0% { transform: translateY(0) scale(1); opacity: 0.4; }
      50% { transform: translateY(-30px) scale(1.05); opacity: 0.6; }
      100% { transform: translateY(-60px) scale(0.9); opacity: 0; }
    }
    @keyframes float-slowest {
      0% { transform: translateY(0) scale(1); opacity: 0.3; }
      50% { transform: translateY(-20px) scale(1.02); opacity: 0.5; }
      100% { transform: translateY(-40px) scale(0.95); opacity: 0; }
    }
    .animate-float-slow { animation: float-slow 3s ease-in-out infinite; }
    .animate-float-slower { animation: float-slower 4s ease-in-out infinite; }
    .animate-float-slowest { animation: float-slowest 5s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}

export default UserProfile;

/*
============================================
HOW THIS WORKS - PLAIN ENGLISH
============================================

NEW FEATURES ADDED:

1. PRONOUNS FIELD
   - Users can enter their pronouns (she/her, he/him, they/them, etc.)
   - Helps roommates address each other correctly
   - Completely optional

2. SHOW EMAIL TOGGLE
   - Controls whether email is visible to other roommates
   - Default: ON (visible)
   - When OFF: Email is private

3. SHOW BIRTHDAY TOGGLE  
   - Controls whether birthday appears in calendar
   - Default: ON (birthday event created)
   - When OFF: No birthday event in calendar
   
HOW BIRTHDAY PRIVACY WORKS:
- If show_birthday is TRUE: Creates/updates birthday event
- If show_birthday is FALSE: Deletes birthday event
- User can toggle anytime - event appears/disappears accordingly

WHAT GETS SAVED:
- name
- birthday (the date itself)
- pronouns
- color
- show_email (boolean)
- show_birthday (boolean)
- preferences (sound & animation)

The manageBirthdayEvent function now:
1. Checks if show_birthday is true
2. If false: Deletes any existing birthday event
3. If true AND birthday exists: Creates/updates event
4. Respects user's privacy choice
*/
