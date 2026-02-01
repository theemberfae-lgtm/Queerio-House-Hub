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
import { Save, Volume2, VolumeX, Waves, User, Calendar, Palette, Eye, EyeOff } from 'lucide-react';

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
  const [soundEnabled, setSoundEnabled] = useState(false);
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
          
          setSoundEnabled(prefs.soundEnabled || false);
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
      soundEnabled,
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

  // ========================================
  // AQUARIUM SOUND EFFECTS
  // ========================================
  // Creates realistic underwater sounds using the Web Audio API
  // Each sound is built from scratch using oscillators and filters
  
  const playSound = (soundName) => {
    // Don't play if user has sounds turned off
    if (!soundEnabled) return;
    
    // Create audio context (the "sound engine" for making sounds)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    switch(soundName) {
      // ========================================
      // BUBBLE POP - Sounds like a bubble popping
      // ========================================
      case 'bubble':
        // Create the main sound generator
        const bubbleOsc = audioContext.createOscillator();
        // Create volume control
        const bubbleGain = audioContext.createGain();
        // Create a filter to make it sound more "watery"
        const bubbleFilter = audioContext.createBiquadFilter();
        
        // Set the type of wave (sine = smooth, round tone)
        bubbleOsc.type = 'sine';
        
        // Start at a high pitch (1200 Hz) and quickly drop to low (300 Hz)
        // This creates the "pop" effect
        bubbleOsc.frequency.setValueAtTime(1200, audioContext.currentTime);
        bubbleOsc.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.15);
        
        // Set up the filter to cut high frequencies (makes it sound underwater)
        bubbleFilter.type = 'lowpass';
        bubbleFilter.frequency.value = 800;
        bubbleFilter.Q.value = 1;
        
        // Start medium volume, fade to silent
        bubbleGain.gain.setValueAtTime(0.25, audioContext.currentTime);
        bubbleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        // Connect everything: oscillator -> filter -> volume -> speakers
        bubbleOsc.connect(bubbleFilter);
        bubbleFilter.connect(bubbleGain);
        bubbleGain.connect(audioContext.destination);
        
        // Play the sound
        bubbleOsc.start();
        bubbleOsc.stop(audioContext.currentTime + 0.15);
        break;
        
      // ========================================
      // SUCCESS - Sounds like gentle water chimes
      // ========================================
      case 'success':
        // This plays 3 tones in sequence, like water droplets
        const playWaterDrop = (freq, startTime, duration) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const filter = audioContext.createBiquadFilter();
          
          // Use triangle wave for a softer, more water-like tone
          osc.type = 'triangle';
          osc.frequency.value = freq;
          
          // Filter makes it sound more aquatic
          filter.type = 'lowpass';
          filter.frequency.value = 1500;
          
          // Gentle fade in and out
          gain.gain.setValueAtTime(0.15, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(audioContext.destination);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        
        // Play 3 water drops at ascending pitches (sounds cheerful!)
        playWaterDrop(523.25, audioContext.currentTime, 0.15);        // C note
        playWaterDrop(659.25, audioContext.currentTime + 0.12, 0.15); // E note
        playWaterDrop(783.99, audioContext.currentTime + 0.24, 0.25); // G note
        break;
        
      // ========================================
      // CLICK - Sounds like a gentle water splash
      // ========================================
      case 'click':
        // Create white noise (sounds like rushing water/splash)
        const bufferSize = audioContext.sampleRate * 0.1; // 0.1 seconds of sound
        const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        
        // Fill with random values (this IS the noise)
        for (let i = 0; i < bufferSize; i++) {
          noiseData[i] = Math.random() * 2 - 1;
        }
        
        // Create player for the noise
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        // Filter to make it sound like water (not harsh static)
        const splashFilter = audioContext.createBiquadFilter();
        splashFilter.type = 'bandpass';  // Only allow middle frequencies through
        splashFilter.frequency.value = 1000;
        splashFilter.Q.value = 1;
        
        // Volume control - start medium, fade quickly
        const splashGain = audioContext.createGain();
        splashGain.gain.setValueAtTime(0.15, audioContext.currentTime);
        splashGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
        
        // Connect: noise -> filter -> volume -> speakers
        noiseSource.connect(splashFilter);
        splashFilter.connect(splashGain);
        splashGain.connect(audioContext.destination);
        
        // Play the splash
        noiseSource.start();
        noiseSource.stop(audioContext.currentTime + 0.1);
        break;
        
      // ========================================
      // FISH SWIM - Gentle whoosh sound
      // ========================================
      case 'swim':
        // Create a swooping sound like a fish swimming by
        const swimOsc = audioContext.createOscillator();
        const swimGain = audioContext.createGain();
        const swimFilter = audioContext.createBiquadFilter();
        
        // Triangle wave for smooth sound
        swimOsc.type = 'triangle';
        
        // Frequency swoops down (like a fish passing by)
        swimOsc.frequency.setValueAtTime(400, audioContext.currentTime);
        swimOsc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
        
        // Heavy filtering for underwater effect
        swimFilter.type = 'lowpass';
        swimFilter.frequency.value = 600;
        swimFilter.Q.value = 2;
        
        // Gentle volume fade
        swimGain.gain.setValueAtTime(0.1, audioContext.currentTime);
        swimGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        swimOsc.connect(swimFilter);
        swimFilter.connect(swimGain);
        swimGain.connect(audioContext.destination);
        
        swimOsc.start();
        swimOsc.stop(audioContext.currentTime + 0.2);
        break;
    }
  };

  useEffect(() => {
    window.playUserSound = playSound;
  }, [soundEnabled]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
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
      
      {/* Messages */}
      {message && (
        <div 
          className={`mb-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
          style={{padding: '1rem', overflow: 'hidden'}}
        >
          <p style={{wordBreak: 'break-word'}}>{message.text}</p>
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
          APPEARANCE & SOUND
          ======================================== */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Appearance & Sound</h3>
        
        {/* Sound Effects Toggle */}
        <div className="mb-6 bg-blue-50 rounded-lg border-2 border-blue-200" style={{padding: '1.5rem', overflow: 'hidden'}}>
          <div className="flex items-start justify-between mb-3 gap-4">
            <div className="flex-1" style={{minWidth: 0}}>
              <div className="flex items-center gap-2 mb-2">
                {soundEnabled ? (
                  <Volume2 className="text-blue-600" size={24} style={{flexShrink: 0}} />
                ) : (
                  <VolumeX className="text-gray-400" size={24} style={{flexShrink: 0}} />
                )}
                <h4 className="font-semibold text-base md:text-lg">Sound Effects</h4>
              </div>
              <p className="text-xs md:text-sm text-gray-600">
                Play sounds when you interact with the app
              </p>
            </div>
            
            <button
              onClick={() => {
                const newValue = !soundEnabled;
                setSoundEnabled(newValue);
                if (newValue) {
                  setTimeout(() => playSound('bubble'), 100);
                }
              }}
              className={`relative rounded-full transition-colors ${
                soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              style={{
                width: '56px',
                height: '32px',
                flexShrink: 0
              }}
            >
              <div 
                className={`absolute top-1 left-1 bg-white rounded-full transition-transform ${
                  soundEnabled ? 'transform translate-x-6' : ''
                }`}
                style={{width: '24px', height: '24px'}}
              />
            </button>
          </div>
          
          {soundEnabled && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-600 mb-2">Test the aquarium sounds:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => playSound('bubble')}
                  className="bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                  style={{
                    padding: '8px 12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🫧 Bubble Pop
                </button>
                <button
                  onClick={() => playSound('success')}
                  className="bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                  style={{
                    padding: '8px 12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  💧 Water Drops
                </button>
                <button
                  onClick={() => playSound('click')}
                  className="bg-cyan-500 text-white rounded hover:bg-cyan-600 text-xs"
                  style={{
                    padding: '8px 12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  💦 Splash
                </button>
                <button
                  onClick={() => playSound('swim')}
                  className="bg-purple-500 text-white rounded hover:bg-purple-600 text-xs"
                  style={{
                    padding: '8px 12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🐠 Fish Swim
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Animation Level Selector */}
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
      
      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="flex-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold"
          style={{
            padding: '12px',
            whiteSpace: 'nowrap'
          }}
        >
          {saving ? (
            'Saving...'
          ) : (
            <>
              <Save className="inline mr-2" size={20} />
              Save All Changes
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
