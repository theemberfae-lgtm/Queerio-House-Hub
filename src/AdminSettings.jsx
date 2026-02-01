// ADMIN SETTINGS - UPDATED WITH BETTER CARD PADDING
// All cards now have proper padding and overflow handling

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Save, Plus, Trash2, Edit2, X, Download, Upload, AlertTriangle } from 'lucide-react';

const AdminSettings = ({ onDataChange }) => {
  const { supabase, profile } = useAuth();
  
  const [activeSection, setActiveSection] = useState('items');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [items, setItems] = useState([]);
  const [roommates, setRoommates] = useState([]);
  const [billCategories, setBillCategories] = useState([]);
  const [chores, setChores] = useState([]);
  const [currentMonth, setCurrentMonth] = useState('');
  
  const [newItem, setNewItem] = useState({ name: '', rotation: [] });
  const [newRoommate, setNewRoommate] = useState({ name: '', color: '' });
  const [newBillCategory, setNewBillCategory] = useState('');
  const [newChore, setNewChore] = useState('');
  
  const [editingItem, setEditingItem] = useState(null);
  const [editingRoommate, setEditingRoommate] = useState(null);
  const [editingRoommateColor, setEditingRoommateColor] = useState(null);

  const getColorClass = (colorValue) => {
    const colorMap = {
      orange: 'bg-orange-200 text-orange-800',
      green: 'bg-green-200 text-green-800',
      blue: 'bg-blue-200 text-blue-800',
      purple: 'bg-purple-200 text-purple-800',
      pink: 'bg-pink-200 text-pink-800',
      yellow: 'bg-yellow-200 text-yellow-800',
      red: 'bg-red-200 text-red-800',
      teal: 'bg-teal-200 text-teal-800',
      gray: 'bg-gray-200 text-gray-800'
    };
    return colorMap[colorValue] || 'bg-gray-200 text-gray-800';
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('household_data')
        .select('*')
        .eq('key', 'app_data')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading data:', error);
        return;
      }

      if (data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        
        setItems(parsed.items || []);
        
        // Auto-generate current month instead of manual entry
        const now = new Date();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
        const autoMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        setCurrentMonth(parsed.currentMonth || autoMonth);
        
        const roommateNames = [...new Set(parsed.items?.flatMap(item => item.rotation) || [])];
        const roommateData = roommateNames.map(name => ({
          name,
          color: getColorForRoommate(name)
        }));
        setRoommates(roommateData);
        
        const existingCategories = [...new Set(parsed.bills?.map(b => b.category) || [])];
        setBillCategories(existingCategories.length > 0 ? existingCategories : 
          ['Rent', 'Internet', 'PG&E', 'Waste Management', 'Water', 'Other']);
        
        setChores(parsed.monthlyChores || []);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    setLoading(false);
  };

  const getColorForRoommate = (name) => {
    const colors = {
      Ember: 'orange',
      Eva: 'green',
      Elle: 'blue',
      Illari: 'purple'
    };
    return colors[name] || 'gray';
  };

  const saveData = async (updates = {}) => {
    setSaving(true);
    
    try {
      const { data: currentData } = await supabase
        .from('household_data')
        .select('*')
        .eq('key', 'app_data')
        .single();
      
      const parsed = currentData?.value ? 
        (typeof currentData.value === 'string' ? JSON.parse(currentData.value) : currentData.value) : {};
      
      const updatedData = {
        ...parsed,
        items,
        currentMonth,
        ...updates
      };
      
      if (updates.monthlyChores) {
        updatedData.monthlyChores = updates.monthlyChores;
      }
      
      const { error } = await supabase
        .from('household_data')
        .upsert({
          key: 'app_data',
          value: JSON.stringify(updatedData)
        }, {
          onConflict: 'key'
        });

      if (error) {
        throw error;
      }
      
      showMessage('✅ Changes saved successfully!', 'success');
      if (onDataChange) {
        setTimeout(() => onDataChange(), 500);
      }
    } catch (e) {
      console.error('Failed to save data:', e);
      showMessage('❌ Failed to save changes', 'error');
    }
    
    setSaving(false);
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const addItem = async () => {
    if (!newItem.name || newItem.rotation.length === 0) {
      showMessage('❌ Please enter item name and select at least one roommate', 'error');
      return;
    }
    
    const item = {
      id: newItem.name.toLowerCase().replace(/\s+/g, ''),
      name: newItem.name,
      rotation: newItem.rotation,
      currentIndex: 0,
      lastPurchase: null,
      skippedThisRound: []
    };
    
    const { data: currentData } = await supabase
      .from('household_data')
      .select('*')
      .eq('key', 'app_data')
      .single();
    
    const parsed = currentData?.value ? 
      (typeof currentData.value === 'string' ? JSON.parse(currentData.value) : currentData.value) : {};
    
    const updated = [...(parsed.items || []), item];
    setItems(updated);
    
    await saveData({ ...parsed, items: updated });
    
    setNewItem({ name: '', rotation: [] });
  };

  const removeItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    const updated = items.filter(i => i.id !== itemId);
    setItems(updated);
    await saveData({ items: updated });
  };

  const updateItemRotation = async (itemId, newRotation) => {
    const updated = items.map(i => 
      i.id === itemId ? { ...i, rotation: newRotation } : i
    );
    setItems(updated);
    await saveData({ items: updated });
    setEditingItem(null);
  };

  const toggleRoommateInNewItem = (roommateName) => {
    const current = newItem.rotation;
    const updated = current.includes(roommateName)
      ? current.filter(n => n !== roommateName)
      : [...current, roommateName];
    setNewItem({ ...newItem, rotation: updated });
  };

  const addRoommate = async () => {
    if (!newRoommate.name || !newRoommate.color) {
      showMessage('❌ Please enter name and select a color', 'error');
      return;
    }
    
    if (roommates.some(r => r.name === newRoommate.name)) {
      showMessage('❌ Roommate with this name already exists', 'error');
      return;
    }
    
    const updated = [...roommates, newRoommate];
    setRoommates(updated);
    
    showMessage('✅ Roommate added! They will appear in rotation options.', 'success');
    setNewRoommate({ name: '', color: '' });
    
    if (onDataChange) {
      setTimeout(() => onDataChange(), 500);
    }
  };

  const removeRoommate = async (roommateName) => {
    if (!confirm(`Remove ${roommateName}? This will remove them from all item rotations!`)) return;
    
    const updatedRoommates = roommates.filter(r => r.name !== roommateName);
    setRoommates(updatedRoommates);
    
    const updatedItems = items.map(item => ({
      ...item,
      rotation: item.rotation.filter(name => name !== roommateName),
      currentIndex: Math.min(item.currentIndex, item.rotation.filter(name => name !== roommateName).length - 1)
    }));
    setItems(updatedItems);
    
    await saveData({ items: updatedItems });
    showMessage(`✅ ${roommateName} removed from all rotations`, 'success');
  };

  const updateRoommateName = async (oldName, newName) => {
    if (!newName) return;
    
    const updatedRoommates = roommates.map(r => 
      r.name === oldName ? { ...r, name: newName } : r
    );
    setRoommates(updatedRoommates);
    
    const updatedItems = items.map(item => ({
      ...item,
      rotation: item.rotation.map(name => name === oldName ? newName : name)
    }));
    setItems(updatedItems);
    
    await saveData({ items: updatedItems });
    setEditingRoommate(null);
    showMessage('✅ Roommate name updated everywhere', 'success');
  };

  const updateRoommateColor = async (roommateName, newColor) => {
    if (!newColor) return;
    
    const updatedRoommates = roommates.map(r => 
      r.name === roommateName ? { ...r, color: newColor } : r
    );
    setRoommates(updatedRoommates);
    
    setEditingRoommateColor(null);
    showMessage('✅ Roommate color updated', 'success');
    
    if (onDataChange) {
      setTimeout(() => onDataChange(), 500);
    }
  };

  const addBillCategory = async () => {
    if (!newBillCategory) {
      showMessage('❌ Please enter a category name', 'error');
      return;
    }
    
    if (billCategories.includes(newBillCategory)) {
      showMessage('❌ Category already exists', 'error');
      return;
    }
    
    const updated = [...billCategories, newBillCategory];
    setBillCategories(updated);
    
    const { data: currentData } = await supabase
      .from('household_data')
      .select('*')
      .eq('key', 'app_data')
      .single();
    
    const parsed = currentData?.value ? 
      (typeof currentData.value === 'string' ? JSON.parse(currentData.value) : currentData.value) : {};
    
    await saveData({ ...parsed, billCategories: updated });
    
    showMessage('✅ Bill category added', 'success');
    setNewBillCategory('');
  };

  const removeBillCategory = async (category) => {
    if (!confirm(`Remove "${category}" category?`)) return;
    
    const updated = billCategories.filter(c => c !== category);
    setBillCategories(updated);
    showMessage('✅ Bill category removed', 'success');
  };

  const addChore = async () => {
    if (!newChore) {
      showMessage('❌ Please enter a chore name', 'error');
      return;
    }
    
    const chore = {
      id: newChore.toLowerCase().replace(/\s+/g, ''),
      name: newChore,
      rotation: [],
      currentIndex: 0
    };
    
    const updated = [...chores, chore];
    setChores(updated);
    await saveData({ monthlyChores: updated });
    setNewChore('');
  };

  const removeChore = async (choreId) => {
    if (!confirm('Remove this chore?')) return;
    
    const updated = chores.filter(c => c.id !== choreId);
    setChores(updated);
    await saveData({ monthlyChores: updated });
  };

  const updateMonth = async (newMonth) => {
    setCurrentMonth(newMonth);
    await saveData({ currentMonth: newMonth });
    showMessage('✅ Month updated', 'success');
  };

  const exportData = async () => {
    try {
      const { data } = await supabase
        .from('household_data')
        .select('*')
        .eq('key', 'app_data')
        .single();
      
      const parsed = data?.value ? 
        (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : {};
      
      const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `household-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      showMessage('✅ Data exported successfully', 'success');
    } catch (e) {
      showMessage('❌ Failed to export data', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <p className="text-center text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Admin Settings</h2>
      
      {/* ✅ FIXED: Messages */}
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
      
      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
        {[
          { id: 'items', label: 'Household Items' },
          { id: 'roommates', label: 'Roommates' },
          { id: 'bills', label: 'Bill Categories' },
          { id: 'chores', label: 'Chores' },
          { id: 'system', label: 'System' }
        ].map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`rounded-lg text-sm md:text-base ${
              activeSection === section.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={{
              padding: '8px 16px',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content'
            }}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* HOUSEHOLD ITEMS SECTION */}
      {activeSection === 'items' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Manage Household Items</h3>
          
          {/* ✅ FIXED: Add New Item Card */}
          <div className="bg-purple-50 rounded-lg mb-6" style={{padding: '1.5rem', overflow: 'hidden'}}>
            <h4 className="font-semibold mb-3">Add New Item</h4>
            <input
              type="text"
              placeholder="Item name (e.g., Hand Soap)"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full border rounded mb-3"
              style={{padding: '14px'}}
            />
            
            <p className="text-sm text-gray-600 mb-2">Select roommates in rotation order:</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {roommates.map(roommate => (
                <button
                  key={roommate.name}
                  onClick={() => toggleRoommateInNewItem(roommate.name)}
                  className={`rounded ${
                    newItem.rotation.includes(roommate.name)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  style={{
                    padding: '4px 12px',
                    whiteSpace: 'nowrap',
                    minWidth: 'fit-content'
                  }}
                >
                  {roommate.name}
                  {newItem.rotation.includes(roommate.name) && 
                    ` (${newItem.rotation.indexOf(roommate.name) + 1})`
                  }
                </button>
              ))}
            </div>
            
            <button
              onClick={addItem}
              disabled={saving}
              className="w-full bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
              style={{padding: '8px', whiteSpace: 'nowrap'}}
            >
              <Plus className="inline mr-2" size={16} />
              Add Item
            </button>
          </div>
          
          {/* ✅ FIXED: Item Cards */}
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-gray-50 rounded-lg" style={{padding: '1.5rem', overflow: 'hidden'}}>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-2">
                  <div style={{flex: 1, minWidth: 0}}>
                    <h4 className="font-bold text-lg" style={{wordBreak: 'break-word'}}>{item.name}</h4>
                    <p className="text-sm text-gray-600" style={{wordBreak: 'break-word'}}>
                      Rotation: {item.rotation.join(' → ')}
                    </p>
                  </div>
                  <div className="flex gap-2" style={{flexShrink: 0}}>
                    <button
                      onClick={() => setEditingItem(item.id)}
                      className="bg-blue-500 text-white rounded hover:bg-blue-600"
                      style={{padding: '8px', whiteSpace: 'nowrap'}}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="bg-red-500 text-white rounded hover:bg-red-600"
                      style={{padding: '8px', whiteSpace: 'nowrap'}}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {editingItem === item.id && (
                  <div className="mt-3 bg-white border-2 border-blue-300 rounded" style={{padding: '1rem'}}>
                    <p className="text-sm font-semibold mb-2">Edit rotation order:</p>
                    <p className="text-xs text-gray-600 mb-2">Click roommates in desired order</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {roommates.map(roommate => {
                        return (
                          <button
                            key={roommate.name}
                            onClick={() => {
                              const current = item.rotation;
                              if (current.includes(roommate.name)) {
                                updateItemRotation(item.id, current.filter(n => n !== roommate.name));
                              } else {
                                updateItemRotation(item.id, [...current, roommate.name]);
                              }
                            }}
                            className={`rounded ${
                              item.rotation.includes(roommate.name)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                            style={{padding: '4px 12px', whiteSpace: 'nowrap'}}
                          >
                            {roommate.name}
                            {item.rotation.includes(roommate.name) && 
                              ` (${item.rotation.indexOf(roommate.name) + 1})`
                            }
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="w-full bg-gray-300 text-gray-700 rounded"
                      style={{padding: '8px', whiteSpace: 'nowrap'}}
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROOMMATES SECTION */}
      {activeSection === 'roommates' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Manage Roommates</h3>
          
          {/* ✅ FIXED: Add Roommate Card */}
          <div className="bg-purple-50 rounded-lg mb-6" style={{padding: '1.5rem', overflow: 'hidden'}}>
            <h4 className="font-semibold mb-3">Add New Roommate</h4>
            <input
              type="text"
              placeholder="Name"
              value={newRoommate.name}
              onChange={(e) => setNewRoommate({ ...newRoommate, name: e.target.value })}
              className="w-full border rounded mb-3"
              style={{padding: '14px'}}
            />
            
            <select
              value={newRoommate.color}
              onChange={(e) => setNewRoommate({ ...newRoommate, color: e.target.value })}
              className="w-full border rounded mb-3"
              style={{padding: '14px'}}
            >
              <option value="">Select color...</option>
              <option value="orange">Orange</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="purple">Purple</option>
              <option value="pink">Pink</option>
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
              <option value="teal">Teal</option>
            </select>
            
            <button
              onClick={addRoommate}
              className="w-full bg-purple-600 text-white rounded hover:bg-purple-700"
              style={{padding: '8px', whiteSpace: 'nowrap'}}
            >
              <Plus className="inline mr-2" size={16} />
              Add Roommate
            </button>
          </div>
          
          {/* ✅ FIXED: Roommate Cards */}
          <div className="space-y-3">
            {roommates.map(roommate => (
              <div key={roommate.name} className="bg-gray-50 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3" style={{padding: '1.5rem', overflow: 'hidden'}}>
                {editingRoommate === roommate.name ? (
                  <div className="flex-1 flex gap-2" style={{minWidth: 0}}>
                    <input
                      type="text"
                      defaultValue={roommate.name}
                      onBlur={(e) => updateRoommateName(roommate.name, e.target.value)}
                      className="flex-1 border rounded"
                      style={{padding: '14px'}}
                      autoFocus
                    />
                    <button
                      onClick={() => setEditingRoommate(null)}
                      className="bg-gray-300 rounded"
                      style={{padding: '8px 12px', flexShrink: 0}}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{flex: 1, minWidth: 0}}>
                      <span className="font-bold" style={{wordBreak: 'break-word'}}>{roommate.name}</span>
                      <span 
                        className={`rounded text-xs ${getColorClass(roommate.color)}`}
                        style={{
                          padding: '4px 8px',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          marginLeft: '1.5rem'
                        }}
                      >
                        {roommate.color}
                      </span>
                    </div>
                    <div className="flex gap-2" style={{flexShrink: 0}}>
                      <button
                        onClick={() => setEditingRoommate(roommate.name)}
                        className="bg-blue-500 text-white rounded hover:bg-blue-600"
                        style={{padding: '8px'}}
                        title="Edit name"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setEditingRoommateColor(roommate.name)}
                        className="bg-purple-500 text-white rounded hover:bg-purple-600"
                        style={{padding: '8px', fontSize: '16px'}}
                        title="Edit color"
                      >
                        🎨
                      </button>
                      <button
                        onClick={() => removeRoommate(roommate.name)}
                        className="bg-red-500 text-white rounded hover:bg-red-600"
                        style={{padding: '8px'}}
                        title="Remove roommate"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
                
                {/* ✅ NEW: Color Picker Interface */}
                {editingRoommateColor === roommate.name && (
                  <div className="w-full mt-3 bg-white rounded border-2 border-purple-300" style={{padding: '1rem'}}>
                    <p className="text-sm font-semibold mb-3">Select Color:</p>
                    <div className="flex flex-wrap gap-2">
                      {['orange', 'green', 'blue', 'purple', 'pink', 'yellow', 'red', 'teal', 'gray'].map(color => (
                        <button
                          key={color}
                          onClick={() => updateRoommateColor(roommate.name, color)}
                          className={`rounded ${getColorClass(color)}`}
                          style={{
                            padding: '8px 16px',
                            whiteSpace: 'nowrap',
                            border: roommate.color === color ? '3px solid black' : 'none',
                            fontWeight: roommate.color === color ? 'bold' : 'normal'
                          }}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setEditingRoommateColor(null)}
                      className="mt-3 w-full bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      style={{padding: '8px'}}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BILL CATEGORIES SECTION */}
      {activeSection === 'bills' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Manage Bill Categories</h3>
          
          {/* ✅ FIXED: Add Category Card */}
          <div className="bg-purple-50 rounded-lg mb-6" style={{padding: '1.5rem', overflow: 'hidden'}}>
            <h4 className="font-semibold mb-3">Add New Category</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Category name"
                value={newBillCategory}
                onChange={(e) => setNewBillCategory(e.target.value)}
                className="flex-1 border rounded"
                style={{padding: '14px'}}
              />
              <button
                onClick={addBillCategory}
                className="bg-purple-600 text-white rounded hover:bg-purple-700"
                style={{padding: '8px 16px', whiteSpace: 'nowrap', flexShrink: 0}}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          {/* ✅ FIXED: Category Cards */}
          <div className="space-y-2">
            {billCategories.map(category => (
              <div key={category} className="bg-gray-50 rounded-lg flex justify-between items-center gap-4" style={{padding: '1rem', overflow: 'hidden'}}>
                <span className="font-semibold" style={{wordBreak: 'break-word', flex: 1, minWidth: 0}}>{category}</span>
                <button
                  onClick={() => removeBillCategory(category)}
                  className="bg-red-500 text-white rounded hover:bg-red-600"
                  style={{padding: '8px', flexShrink: 0}}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHORES SECTION */}
      {activeSection === 'chores' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Manage Chores</h3>
          
          {/* ✅ UPDATED: Auto-Generated Month */}
          <div className="bg-blue-50 rounded-lg mb-6" style={{padding: '1.5rem', overflow: 'hidden'}}>
            <h4 className="font-semibold mb-3">Current Month</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white border-2 border-blue-300 rounded-lg" style={{padding: '14px'}}>
                <p className="text-xl font-bold text-blue-800">{currentMonth}</p>
              </div>
              <button
                onClick={() => {
                  const now = new Date();
                  now.setMonth(now.getMonth() + 1);
                  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                      'July', 'August', 'September', 'October', 'November', 'December'];
                  const nextMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
                  updateMonth(nextMonth);
                }}
                className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap font-medium"
                style={{padding: '14px 20px'}}
              >
                Next Month →
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Month auto-generates based on current date. Click "Next Month" to advance manually.
            </p>
          </div>
          
          {/* ✅ FIXED: Add Chore Card */}
          <div className="bg-purple-50 rounded-lg mb-6" style={{padding: '1.5rem', overflow: 'hidden'}}>
            <h4 className="font-semibold mb-3">Add New Chore</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Chore name"
                value={newChore}
                onChange={(e) => setNewChore(e.target.value)}
                className="flex-1 border rounded"
                style={{padding: '14px'}}
              />
              <button
                onClick={addChore}
                className="bg-purple-600 text-white rounded hover:bg-purple-700"
                style={{padding: '8px 16px', whiteSpace: 'nowrap', flexShrink: 0}}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          {/* ✅ FIXED: Chore Cards */}
          <div className="space-y-2">
            {chores.map(chore => (
              <div key={chore.id} className="bg-gray-50 rounded-lg flex justify-between items-center gap-4" style={{padding: '1rem', overflow: 'hidden'}}>
                <span className="font-semibold" style={{wordBreak: 'break-word', flex: 1, minWidth: 0}}>{chore.name}</span>
                <button
                  onClick={() => removeChore(chore.id)}
                  className="bg-red-500 text-white rounded hover:bg-red-600"
                  style={{padding: '8px', flexShrink: 0}}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SYSTEM SECTION */}
      {activeSection === 'system' && (
        <div>
          <h3 className="text-xl font-semibold mb-4">System Settings</h3>
          
          {/* ✅ FIXED: Export Card */}
          <div className="bg-green-50 rounded-lg mb-4" style={{padding: '1.5rem', overflow: 'hidden'}}>
            <h4 className="font-semibold mb-2">Export Data (Backup)</h4>
            <p className="text-sm text-gray-600 mb-3" style={{wordBreak: 'break-word'}}>
              Download all your household data as a JSON file for backup purposes.
            </p>
            <button
              onClick={exportData}
              className="w-full bg-green-600 text-white rounded hover:bg-green-700"
              style={{padding: '8px', whiteSpace: 'nowrap'}}
            >
              <Download className="inline mr-2" size={16} />
              Export Data
            </button>
          </div>
          
          {/* ✅ FIXED: Danger Zone Card */}
          <div className="bg-red-50 rounded-lg border-2 border-red-300" style={{padding: '1.5rem', overflow: 'hidden'}}>
            <h4 className="font-semibold mb-2 text-red-800 flex items-center gap-2">
              <AlertTriangle size={20} style={{flexShrink: 0}} />
              <span>Danger Zone</span>
            </h4>
            <p className="text-sm text-gray-600 mb-3" style={{wordBreak: 'break-word'}}>
              These actions cannot be undone. Make sure to export your data first!
            </p>
            <p className="text-sm text-gray-700 mt-2" style={{wordBreak: 'break-word'}}>
              For data reset or import functions, please contact your developer.
            </p>
          </div>
        </div>
      )}

      {saving && (
        <div 
          className="fixed bg-purple-600 text-white rounded-lg shadow-lg"
          style={{
            bottom: '16px',
            right: '16px',
            padding: '8px 16px',
            whiteSpace: 'nowrap'
          }}
        >
          Saving...
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
