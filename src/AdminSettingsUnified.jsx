import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Mail, UserPlus, Trash2, Users, Edit2, Save, X, AlertTriangle, User } from 'lucide-react';

const AdminSettingsUnified = ({ onDataChange }) => {
  const { supabase, isAdmin, profile } = useAuth();
  
  // Section navigation
  const [activeSection, setActiveSection] = useState('invites');
  
  // Invites & Users state
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Profile editing state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  
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
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('invites')
        .insert([
          {
            email: inviteEmail.toLowerCase(),
            token: token,
            invited_by: user.id,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      setMessage('Invite sent successfully! Share this link: ' + window.location.origin + '/signup?token=' + token);
      setInviteEmail('');
      loadInvites();
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteInvite = async (id) => {
    if (!confirm('Delete this invite?')) return;
    
    const { error } = await supabase
      .from('invites')
      .delete()
      .eq('id', id);
    
    if (!error) {
      loadInvites();
      setMessage('Invite deleted');
    }
  };

  const deleteUser = async (userId) => {
    if (userId === profile.id) {
      alert('Cannot delete your own account');
      return;
    }
    
    if (!confirm('Delete this user? This will also delete their auth account.')) return;

    try {
      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Delete auth user (requires admin)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('Auth deletion error:', authError);
        setMessage('Profile deleted, but auth account may need manual deletion');
      } else {
        setMessage('User deleted successfully');
      }

      loadUsers();
      if (onDataChange) onDataChange();
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  };

  const startEditUser = (user) => {
    setEditingUser(user.id);
    setEditForm({
      name: user.name || '',
      is_admin: user.is_admin || false
    });
  };

  const saveUserEdit = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          is_admin: editForm.is_admin
        })
        .eq('id', userId);

      if (error) throw error;

      setMessage('Profile updated successfully');
      setEditingUser(null);
      loadUsers();
      if (onDataChange) onDataChange();
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
  };
  const deleteProfile = async (userId) => {
  if (!isAdmin) {
    alert('Admin only');
    return;
  }
  
  // Don't allow deleting yourself
  if (userId === profile.id) {
    alert("You can't delete your own account! Ask another admin.");
    return;
  }
  
  const userToDelete = users.find(u => u.id === userId);
  const userName = userToDelete.name || userToDelete.email;
  
  const confirmMessage = `Are you sure you want to delete ${userName}?\n\nThis will automatically:\n✓ Remove from all item rotations\n✓ Clear chore assignments\n✓ Remove from bill splits\n✓ Delete their profile\n\nThis cannot be undone!`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    // ============================================
    // AUTO-CLEANUP: Remove from all household data
    // ============================================
    
    // Load current household data
    const { data: householdData, error: loadError } = await supabase
      .from('household_data')
      .select('*')
      .eq('key', 'app_data')
      .single();
    
    if (loadError && loadError.code !== 'PGRST116') {
      throw loadError;
    }
    
    if (householdData && householdData.value) {
      const data = typeof householdData.value === 'string' 
        ? JSON.parse(householdData.value) 
        : householdData.value;
      
      let changesMade = false;
      
      // 1. CLEAN UP ITEMS - Remove from rotations
      if (data.items) {
        data.items = data.items.map(item => {
          const originalRotation = [...item.rotation];
          
          // Remove user from rotation
          item.rotation = item.rotation.filter(id => {
            // Remove if it matches userId OR the old name
            return id !== userId && id !== userName;
          });
          
          // If rotation was modified
          if (originalRotation.length !== item.rotation.length) {
            changesMade = true;
            
            // Adjust currentIndex if needed
            if (item.currentIndex >= item.rotation.length && item.rotation.length > 0) {
              item.currentIndex = 0;
            }
            
            // Remove from skippedThisRound
            if (item.skippedThisRound) {
              item.skippedThisRound = item.skippedThisRound.filter(id => 
                id !== userId && id !== userName
              );
            }
          }
          
          return item;
        });
      }
      
      // 2. CLEAN UP MONTHLY CHORES - Clear assignments
      if (data.monthlyChores) {
        data.monthlyChores = data.monthlyChores.map(chore => {
          if (chore.rotation && chore.rotation.length > 0) {
            const assignedTo = chore.rotation[0];
            
            // If this user is assigned, clear it
            if (assignedTo === userId || assignedTo === userName) {
              chore.rotation = [];
              chore.currentIndex = 0;
              changesMade = true;
            }
          }
          return chore;
        });
      }
      
      // 3. CLEAN UP ONE-OFF TASKS - Remove assigned tasks
      if (data.oneOffTasks) {
        const originalLength = data.oneOffTasks.length;
        data.oneOffTasks = data.oneOffTasks.filter(task => 
          task.assignedTo !== userId && task.assignedTo !== userName
        );
        
        if (data.oneOffTasks.length !== originalLength) {
          changesMade = true;
        }
      }
      
      // 4. CLEAN UP BILLS - Remove from splits
      if (data.bills) {
        data.bills = data.bills.map(bill => {
          if (bill.splits && bill.splits[userId]) {
            // Remove user from splits
            delete bill.splits[userId];
            
            // Remove from payments
            if (bill.payments && bill.payments[userId]) {
              delete bill.payments[userId];
            }
            
            changesMade = true;
          }
          return bill;
        });
      }
      
      // 5. CLEAN UP EVENTS - Remove user-created events
      if (data.events) {
        const originalLength = data.events.length;
        data.events = data.events.filter(event => 
          event.createdBy !== userId && !event.isBirthday
        );
        
        if (data.events.length !== originalLength) {
          changesMade = true;
        }
      }
      
      // 6. CLEAN UP CHORE HISTORY
      if (data.choreHistory) {
        data.choreHistory = data.choreHistory.map(chore => {
          if (chore.userId === userId) {
            return { ...chore, userId: null }; // Keep history but unlink user
          }
          return chore;
        });
      }
      
      // Save cleaned data back to database
      if (changesMade) {
        const { error: saveError } = await supabase
          .from('household_data')
          .upsert({
            key: 'app_data',
            value: JSON.stringify(data)
          }, {
            onConflict: 'key'
          });
        
        if (saveError) throw saveError;
      }
    }
    
    // ============================================
    // DELETE THE PROFILE
    // ============================================
    
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (deleteError) throw deleteError;
    
    // Success!
    alert(`✓ ${userName} deleted successfully!\n\nCleaned up:\n- Item rotations\n- Chore assignments\n- Bill splits\n- Events`);
    
    // Reload data
    loadUsers();
    if (onDataChange) {
      onDataChange(); // Trigger app-wide reload
    }
    
  } catch (error) {
    console.error('Error deleting profile:', error);
    alert('Failed to delete profile: ' + error.message);
  }
};

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem'}}>
        <p className="text-center text-gray-600">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
      <h2 className="text-xl md:text-2xl font-bold mb-6">Admin Settings</h2>

      {/* Section Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveSection('invites')}
          className={`rounded-lg font-semibold text-sm md:text-base whitespace-nowrap ${
            activeSection === 'invites' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          style={{padding: '8px 16px'}}
        >
          📨 Invites & Users
        </button>
        <button
          onClick={() => setActiveSection('profiles')}
          className={`rounded-lg font-semibold text-sm md:text-base whitespace-nowrap ${
            activeSection === 'profiles' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          style={{padding: '8px 16px'}}
        >
          👤 Edit Profiles
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-4 rounded-lg ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`} style={{padding: '12px'}}>
          {message}
        </div>
      )}

      {/* SECTION 1: INVITES & USERS */}
      {activeSection === 'invites' && (
        <div className="space-y-6">
          {/* Invite Form */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg" style={{padding: '1.5rem'}}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserPlus size={20} />
              Invite New Roommate
            </h3>
            <form onSubmit={sendInvite} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm md:text-base"
                  style={{padding: '10px'}}
                  placeholder="roommate@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm md:text-base"
                style={{padding: '12px'}}
              >
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          </div>

          {/* Pending Invites */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg" style={{padding: '1.5rem'}}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Mail size={20} />
              Pending Invites ({invites.length})
            </h3>
            
            {invites.length === 0 ? (
              <p className="text-gray-500 text-center text-sm">No pending invites</p>
            ) : (
              <div className="space-y-2">
                {invites.map(invite => (
                  <div
                    key={invite.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white rounded-lg border border-gray-200"
                    style={{padding: '12px'}}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm md:text-base">{invite.email}</p>
                      <p className="text-xs text-gray-500">
                        Sent {new Date(invite.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteInvite(invite.id)}
                      className="bg-red-500 text-white rounded hover:bg-red-600 text-xs md:text-sm whitespace-nowrap"
                      style={{padding: '6px 12px'}}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Users */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg" style={{padding: '1.5rem'}}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users size={20} />
              Current Users ({users.length})
            </h3>
            
            <div className="space-y-2">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white rounded-lg border border-gray-200"
                  style={{padding: '12px'}}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm md:text-base">{user.name || user.email}</p>
                      {user.is_admin && (
                        <span className="text-xs bg-purple-100 text-purple-700 rounded" style={{padding: '2px 8px'}}>
                          Admin
                        </span>
                      )}
                      {user.id === profile.id && (
                        <span className="text-xs bg-blue-100 text-blue-700 rounded" style={{padding: '2px 8px'}}>
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  
                  {user.id !== profile.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveSection('profiles')}
                        className="bg-blue-500 text-white rounded hover:bg-blue-600 text-xs md:text-sm whitespace-nowrap"
                        style={{padding: '6px 12px'}}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="bg-red-500 text-white rounded hover:bg-red-600 text-xs md:text-sm whitespace-nowrap"
                        style={{padding: '6px 12px'}}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: EDIT PROFILES */}
      {activeSection === 'profiles' && (
        <div className="space-y-6">
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg" style={{padding: '1.5rem'}}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User size={20} />
              Edit User Profiles
            </h3>
            
            <div className="space-y-3">
              {users.map(user => (
                <div
                  key={user.id}
                  className="bg-white rounded-lg border-2 border-gray-200"
                  style={{padding: '1rem'}}
                >
                  {editingUser === user.id ? (
                    // EDIT MODE
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          className="w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                          style={{padding: '10px'}}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`admin-${user.id}`}
                          checked={editForm.is_admin}
                          onChange={(e) => setEditForm({...editForm, is_admin: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`admin-${user.id}`} className="text-sm font-medium text-gray-700">
                          Admin privileges
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => saveUserEdit(user.id)}
                          className="flex-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm md:text-base"
                          style={{padding: '10px'}}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold text-sm md:text-base"
                          style={{padding: '10px 20px'}}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // VIEW MODE
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-base md:text-lg">{user.name || 'No name set'}</p>
                          {user.is_admin && (
                            <span className="text-xs bg-purple-100 text-purple-700 rounded" style={{padding: '4px 12px'}}>
                              Admin
                            </span>
                          )}
                          {user.id === profile.id && (
                            <span className="text-xs bg-blue-100 text-blue-700 rounded" style={{padding: '4px 12px'}}>
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => startEditUser(user)}
                        className="bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-sm md:text-base whitespace-nowrap"
                        style={{padding: '8px 16px'}}
                      >
                        Edit Profile
                      </button>
                      <button
  onClick={() => deleteProfile(user.id)}
  className="bg-red-500 text-white rounded hover:bg-red-600"
  style={{padding: '6px 12px'}}
>
  Delete
</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsUnified;
