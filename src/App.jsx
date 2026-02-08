import React, { useState, useEffect } from 'react';
import { Home, DollarSign, ShoppingCart, Bell, CheckCircle, Users, User, Settings, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, supabase } from './AuthContext';
import Login from './Login';
import Signup from './Signup';
import AdminUsers from './AdminUsers';
import AdminSettings from './AdminSettings';
import PersonalDashboard from './PersonalDashboard';
import UserProfile from './UserProfile';
import RoommatesDirectory from './RoommatesDirectory';
import AdminProfileEditor from './AdminProfileEditor';

const App = () => {
  const { profile, signOut, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bills, setBills] = useState([]);
  const [householdMembers, setHouseholdMembers] = useState([]);
  
  const [items, setItems] = useState([
    { 
      id: 'handsoap', 
      name: 'Hand Soap', 
      rotation: ['Eva', 'Elle', 'Illari', 'Ember'], 
      currentIndex: 2,
      lastPurchase: { person: 'Illari', date: new Date().toISOString() },
      skippedThisRound: []
    },
    { 
      id: 'dishsoap', 
      name: 'Dish Soap', 
      rotation: ['Eva', 'Ember', 'Elle', 'Illari'], 
      currentIndex: 0,
      lastPurchase: { person: 'Eva', date: new Date().toISOString() },
      skippedThisRound: []
    },
    { 
      id: 'toiletpaper', 
      name: 'Toilet Paper', 
      rotation: ['Eva', 'Illari', 'Elle', 'Ember'], 
      currentIndex: 3,
      lastPurchase: { person: 'Ember', date: new Date().toISOString() },
      skippedThisRound: []
    },
    { 
      id: 'papertowels', 
      name: 'Paper Towels', 
      rotation: ['Elle', 'Eva', 'Illari', 'Ember'], 
      currentIndex: 2,
      lastPurchase: { person: 'Illari', date: new Date().toISOString() },
      skippedThisRound: []
    },
    { 
      id: 'trashbags', 
      name: 'Trash Bags', 
      rotation: ['Illari', 'Ember', 'Eva', 'Elle'], 
      currentIndex: 1,
      lastPurchase: { person: 'Ember', date: new Date().toISOString() },
      skippedThisRound: []
    },
    { 
      id: 'laundry', 
      name: 'Laundry Detergent', 
      rotation: ['Ember', 'Eva', 'Elle'], 
      currentIndex: 0,
      lastPurchase: { person: 'Ember', date: new Date().toISOString() },
      skippedThisRound: []
    }
  ]);
  
  const [monthlyChores, setMonthlyChores] = useState([
    { id: 'frontyard', name: 'Clean Front Yard', rotation: [], currentIndex: 0 },
    { id: 'backyard', name: 'Clean Backyard', rotation: [], currentIndex: 0 },
    { id: 'kitchen', name: 'Clean Kitchen', rotation: [], currentIndex: 0 },
    { id: 'bathroom', name: 'Clean Bathroom', rotation: [], currentIndex: 0 },
    { id: 'livingroom', name: 'Clean Living Room', rotation: [], currentIndex: 0 },
    { id: 'sweep', name: 'Sweep Floors', rotation: [], currentIndex: 0 },
    { id: 'steammop', name: 'Steam Mop Floors', rotation: [], currentIndex: 0 },
    { id: 'dealers', name: "Dealer's Choice", rotation: [], currentIndex: 0 }
  ]);
  
  const [oneOffTasks, setOneOffTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [activity, setActivity] = useState([]);
  const [showForm, setShowForm] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentMonth, setCurrentMonth] = useState('January 2026');
  const [choreHistory, setChoreHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const roommates = ['Elle', 'Ember', 'Eva', 'Illari'];
  const colors = { 
    Ember: 'bg-orange-200 text-orange-800', 
    Eva: 'bg-green-200 text-green-800', 
    Elle: 'bg-blue-200 text-blue-800', 
    Illari: 'bg-purple-200 text-purple-800' 
  };

  useEffect(() => {
    loadData();
    loadHouseholdMembers();
    
    const channel = supabase
      .channel('household_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'household_data' },
        () => loadData()
      )
      .subscribe();

    // Also listen for profile changes to update header
    const profileChannel = supabase
      .channel('profile_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => loadHouseholdMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(profileChannel);
    };
  }, []);

  const loadHouseholdMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .order('name');
      
      if (!error && data) {
        setHouseholdMembers(data.map(p => p.name));
      }
    } catch (e) {
      console.error('Failed to load household members:', e);
    }
  };

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('household_data')
        .select('*')
        .eq('key', 'app_data')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading data:', error);
        setLoaded(true);
        return;
      }

      if (data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setBills(parsed.bills || []);
        
        const loadedItems = (parsed.items || items).map(item => ({
          ...item,
          lastPurchase: item.lastPurchase || null,
          skippedThisRound: item.skippedThisRound || []
        }));
        setItems(loadedItems);
        
        setMonthlyChores(parsed.monthlyChores || monthlyChores);
        setOneOffTasks(parsed.oneOffTasks || []);
        setEvents(parsed.events || []);
        setActivity(parsed.activity || []);
        setCurrentMonth(parsed.currentMonth || 'January 2026');
        setChoreHistory(parsed.choreHistory || []);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    setLoaded(true);
  };

  const saveData = async (updates = {}) => {
    const data = { bills, items, monthlyChores, oneOffTasks, events, activity, currentMonth, choreHistory, ...updates };
    
    try {
      const { error } = await supabase
        .from('household_data')
        .upsert({ 
          key: 'app_data', 
          value: JSON.stringify(data)
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('Error saving data:', error);
      }
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  };

  const addActivity = (msg) => {
    const newActivity = [{ id: Date.now(), msg, time: new Date().toISOString() }, ...activity];
    setActivity(newActivity);
    saveData({ activity: newActivity });
  };

  const forceReload = () => {
    console.log('Admin made changes, reloading data...');
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex justify-center" style={{paddingBottom: '144px'}}>
      <div className="w-full max-w-6xl px-4 md:px-16 py-4 md:py-8">
        {/* ✅ FIXED: Header with overflow handling */}
        <div className="bg-white rounded-lg shadow-lg  mb-8" style={{padding: '3rem', overflow: 'hidden'}}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div className="text-center md:text-left" style={{minWidth: 0, flex: 1}}>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center justify-center md:justify-start gap-2" style={{flexWrap: 'wrap'}}>
                <Home className="text-purple-600" style={{flexShrink: 0}} />
                <span style={{wordBreak: 'break-word'}}>Queerio House Hub</span>
              </h1>
              <p className="text-gray-600 text-sm md:text-base" style={{wordBreak: 'break-word'}}>
                {householdMembers.length > 0 
                  ? `${householdMembers.join(', ')}${householdMembers.length === 1 ? "'s" : "'"} Home`
                  : "Loading..."}
              </p>
            </div>
            <div className="flex items-center gap-4" style={{flexShrink: 0}}>
              <div className="text-right" style={{flexShrink: 0}}>
                <p className="font-semibold text-sm" style={{wordBreak: 'break-word'}}>{profile?.name}</p>
                {isAdmin && (
                  <span 
                    className="text-xs bg-purple-100 text-purple-700 rounded"
                    style={{
                      padding: '2px 12px',
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                      marginTop: '4px'
                    }}
                  >
                    Admin
                  </span>
                )}
              </div>
              <button 
                onClick={() => signOut()} 
                className="bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                style={{
                  padding: '8px 24px',
                  minWidth: '100px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' && <PersonalDashboard bills={bills} items={items} events={events} oneOffTasks={oneOffTasks} />}
        {activeTab === 'profile' && <UserProfile />}
        {activeTab === 'roommates' && <RoommatesDirectory />}
        {activeTab === 'bills' && <Bills bills={bills} setBills={setBills} saveData={saveData} addActivity={addActivity} />}
        {activeTab === 'items' && <Items items={items} setItems={setItems} saveData={saveData} addActivity={addActivity} colors={colors} selectedItem={selectedItem} setSelectedItem={setSelectedItem} />}
        {activeTab === 'tasks' && <Tasks monthlyChores={monthlyChores} setMonthlyChores={setMonthlyChores} oneOffTasks={oneOffTasks} setOneOffTasks={setOneOffTasks} saveData={saveData} addActivity={addActivity} colors={colors} roommates={roommates} showForm={showForm} setShowForm={setShowForm} selectedItem={selectedItem} setSelectedItem={setSelectedItem} currentMonth={currentMonth} choreHistory={choreHistory} setChoreHistory={setChoreHistory} />}
        {activeTab === 'events' && <Events events={events} setEvents={setEvents} saveData={saveData} addActivity={addActivity} showForm={showForm} setShowForm={setShowForm} />}
        {activeTab === 'admin' && <AdminUsers />}
        {activeTab === 'admin-profiles' && <AdminProfileEditor />}
        {activeTab === 'settings' && <AdminSettings onDataChange={forceReload} />}

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg overflow-x-auto">
          <div className="flex justify-start md:justify-center items-center gap-2 md:gap-8 px-2 md:px-8 py-2 md:py-4 min-w-max md:min-w-0">
            {[
              { id: 'dashboard', icon: User, label: 'Dashboard' },
              { id: 'bills', icon: DollarSign, label: 'Bills' },
              { id: 'items', icon: ShoppingCart, label: 'Items' },
              { id: 'tasks', icon: CheckCircle, label: 'Tasks' },
              { id: 'events', icon: Home, label: 'Events' },
              { id: 'roommates', icon: Users, label: 'Roommates' },
              { id: 'profile', icon: Settings, label: 'Profile' },
              ...(isAdmin ? [
                { id: 'admin', icon: Users, label: 'Admin' },
                { id: 'admin-profiles', icon: User, label: 'Edit Profiles' },
                { id: 'settings', icon: Settings, label: 'Settings' }
              ] : [])
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`flex flex-col items-center justify-center rounded-lg ${
                  activeTab === tab.id ? 'text-purple-600 bg-purple-50' : 'text-gray-600'
                }`}
                style={{
                  padding: '8px 16px',
                  minWidth: '80px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <tab.icon size={20} style={{flexShrink: 0}} />
                <span className="text-[10px] md:text-xs mt-1 text-center" style={{lineHeight: '1.2'}}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Bills = ({ bills, setBills, saveData, addActivity }) => {
  const { supabase, isAdmin } = useAuth();
  const [show, setShow] = useState(false);
  const [cat, setCat] = useState('');
  const [amt, setAmt] = useState('');
  const [due, setDue] = useState('');
  const [splitMode, setSplitMode] = useState('percent');
  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('monthly');
  const [users, setUsers] = useState([]);
  const [splits, setSplits] = useState({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name');
    
    if (!error && data) {
      setUsers(data);
      const equalSplit = (100 / data.length).toFixed(2);
      const initialSplits = {};
      data.forEach(user => {
        initialSplits[user.id] = equalSplit;
      });
      setSplits(initialSplits);
    }
  };

  const updateSplit = (userId, value) => {
    setSplits(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  const getTotalSplit = () => {
    return Object.values(splits).reduce((sum, val) => sum + parseFloat(val || 0), 0);
  };

  const add = async () => {
    if (!cat || !due) return;
    if (!amt) {
      alert('Please enter an amount for split bills');
      return;
    }
    
    const totalSplit = getTotalSplit();
    if (Math.abs(totalSplit - 100) > 0.01) {
      alert(`Splits must total 100%. Currently: ${totalSplit.toFixed(2)}%`);
      return;
    }

    const billId = Date.now();
    const payments = {};
    Object.keys(splits).forEach(userId => {
      payments[userId] = {
        paid: false,
        paidDate: null
      };
    });
    
    const newBill = { 
      id: billId, 
      category: cat, 
      amount: parseFloat(amt), 
      dueDate: due, 
      paid: false,
      recurring: recurring,
      recurrenceType: recurring ? recurrenceType : null,
      splits: splits,
      payments: payments
    };
    
    const updated = [...bills, newBill];
    setBills(updated);
    saveData({ bills: updated });
    
    const recurringText = recurring ? ` (recurring ${recurrenceType})` : '';
    addActivity(`New ${cat} bill added: $${amt}${recurringText}`);
    
    setCat(''); 
    setAmt(''); 
    setDue(''); 
    setRecurring(false); 
    setRecurrenceType('monthly');
    
    const equalSplit = (100 / users.length).toFixed(2);
    const resetSplits = {};
    users.forEach(user => {
      resetSplits[user.id] = equalSplit;
    });
    setSplits(resetSplits);
    
    setShow(false);
  };

  const markUserPaid = (billId, userId) => {
    if (!isAdmin) return;
    
    const bill = bills.find(b => b.id === billId);
    const userName = getUserName(userId);
    
    const updated = bills.map(b => {
      if (b.id === billId) {
        const newPayments = { ...b.payments };
        newPayments[userId] = {
          paid: true,
          paidDate: new Date().toISOString()
        };
        
        const allPaid = Object.values(newPayments).every(p => p.paid);
        
        return {
          ...b,
          payments: newPayments,
          paid: allPaid,
          paidDate: allPaid ? new Date().toISOString() : b.paidDate
        };
      }
      return b;
    });
    
    setBills(updated);
    saveData({ bills: updated });
    addActivity(`${userName} paid their share of ${bill.category}`);
  };

  const calculateNextDueDate = (currentDueDate, recurrenceType) => {
    const nextDate = new Date(currentDueDate);
    
    switch(recurrenceType) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'semiannually':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate.toISOString().split('T')[0];
  };

  const getRecurrenceLabel = (type) => {
    const labels = {
      'weekly': 'Weekly',
      'biweekly': 'Bi-weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'semiannually': 'Semi-annually',
      'yearly': 'Yearly'
    };
    return labels[type] || type;
  };

  const markPaid = (id) => {
    if (!isAdmin) return;
    
    const bill = bills.find(b => b.id === id);
    const updated = bills.map(b => b.id === id ? { ...b, paid: true, paidDate: new Date().toISOString() } : b);
    
    if (bill.recurring && bill.recurrenceType) {
      const nextDueDate = calculateNextDueDate(bill.dueDate, bill.recurrenceType);
      const newBill = {
        id: Date.now(),
        category: bill.category,
        amount: bill.amount,
        dueDate: nextDueDate,
        paid: false,
        recurring: true,
        recurrenceType: bill.recurrenceType,
        splits: bill.splits
      };
      updated.push(newBill);
    }
    
    setBills(updated);
    saveData({ bills: updated });
    addActivity(`${bill.category} bill marked as paid`);
  };

  const del = (id) => {
    if (!isAdmin) return;
    const updated = bills.filter(b => b.id !== id);
    setBills(updated);
    saveData({ bills: updated });
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  const unpaidBills = bills.filter(b => !b.paid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const paidBills = bills.filter(b => b.paid).sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));

  return (
    <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Bills & Expenses</h2>
        {isAdmin && (
          <button onClick={() => setShow(true)} className="px-5 md:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm md:text-base whitespace-nowrap flex-shrink-0 min-w-[110px]">+ Add Bill</button>
        )}
      </div>

      {show && isAdmin && (
        <div className="mb-6 p-4 md:p-6 bg-purple-50 rounded-lg">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full p-3 border rounded mb-3 text-sm md:text-base">
            <option value="">Select category...</option>
            {['Rent', 'Internet', 'PG&E', 'Waste Management', 'Water', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input 
            type="number" 
            value={amt} 
            onChange={(e) => setAmt(e.target.value)} 
            placeholder="Total amount" 
            className="w-full p-3 border rounded mb-3 text-sm md:text-base" 
            required
          />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full p-3 border rounded mb-3 text-sm md:text-base" />
          
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={recurring} 
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Recurring bill</span>
          </label>

          {recurring && (
            <select 
              value={recurrenceType} 
              onChange={(e) => setRecurrenceType(e.target.value)} 
              className="w-full p-3 border rounded mb-4 text-sm md:text-base"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly (every 2 weeks)</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (every 3 months)</option>
              <option value="semiannually">Semi-annually (every 6 months)</option>
              <option value="yearly">Yearly</option>
            </select>
          )}

          <div className="mt-4 p-4 bg-white rounded-lg border-2 border-purple-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm md:text-base">Split Between Roommates:</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMode('percent')}
                  className={`px-3 py-1 text-xs md:text-sm rounded whitespace-nowrap min-w-[50px] ${splitMode === 'percent' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                >
                  By %
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('amount')}
                  className={`px-3 py-1 text-xs md:text-sm rounded whitespace-nowrap min-w-[50px] ${splitMode === 'amount' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                >
                  By $
                </button>
              </div>
            </div>

            {splitMode === 'percent' ? (
              <>
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm md:text-base">{user.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={splits[user.id] || 0}
                        onChange={(e) => updateSplit(user.id, e.target.value)}
                        className="w-16 md:w-20 p-2 border rounded text-right text-sm"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <span className="text-xs md:text-sm">%</span>
                      {amt && (
                        <span className="text-xs md:text-sm text-gray-600 ml-2">
                          (${((parseFloat(amt) * parseFloat(splits[user.id] || 0)) / 100).toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t flex justify-between font-bold text-sm md:text-base">
                  <span>Total:</span>
                  <span className={getTotalSplit() === 100 ? 'text-green-600' : 'text-red-600'}>
                    {getTotalSplit().toFixed(2)}% {getTotalSplit() !== 100 && '(Must be 100%)'}
                  </span>
                </div>
              </>
            ) : (
              <>
                {users.map(user => {
                  const userAmount = amt ? ((parseFloat(amt) * parseFloat(splits[user.id] || 0)) / 100).toFixed(2) : '0.00';
                  return (
                    <div key={user.id} className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm md:text-base">{user.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs md:text-sm">$</span>
                        <input
                          type="number"
                          value={userAmount}
                          onChange={(e) => {
                            const dollarAmount = parseFloat(e.target.value) || 0;
                            const totalAmount = parseFloat(amt) || 1;
                            const percentage = (dollarAmount / totalAmount) * 100;
                            updateSplit(user.id, percentage.toFixed(2));
                          }}
                          className="w-20 md:w-24 p-2 border rounded text-right text-sm"
                          min="0"
                          max={amt || 0}
                          step="0.01"
                          disabled={!amt}
                        />
                        {amt && (
                          <span className="text-xs md:text-sm text-gray-600 ml-2">
                            ({splits[user.id]}%)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 pt-3 border-t flex justify-between font-bold text-sm md:text-base">
                  <span>Total:</span>
                  <span className={amt && Math.abs((parseFloat(amt) * getTotalSplit() / 100) - parseFloat(amt)) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                    ${amt ? ((parseFloat(amt) * getTotalSplit()) / 100).toFixed(2) : '0.00'} 
                    {amt && Math.abs((parseFloat(amt) * getTotalSplit() / 100) - parseFloat(amt)) >= 0.01 && ` (Must be $${amt})`}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={add} className="flex-1 bg-purple-600 text-white px-5 py-3 rounded hover:bg-purple-700 text-sm md:text-base whitespace-nowrap min-w-[100px]">Add Bill</button>
            <button onClick={() => { 
              setShow(false); 
              setCat(''); 
              setAmt(''); 
              setDue(''); 
              setRecurring(false); 
              setRecurrenceType('monthly');
            }} className="bg-gray-300 px-5 py-3 rounded hover:bg-gray-400 text-sm md:text-base whitespace-nowrap min-w-[80px] flex-shrink-0">Cancel</button>
          </div>
        </div>
      )}

      {unpaidBills.length > 0 && (
        <>
          <h3 className="text-base md:text-lg font-semibold mb-3 text-gray-700">Unpaid Bills</h3>
          <div className="space-y-3 mb-6">
            {unpaidBills.map(b => {
              if (!b.payments && b.splits) {
                b.payments = {};
                Object.keys(b.splits).forEach(userId => {
                  b.payments[userId] = { paid: false, paidDate: null };
                });
              }
              
              return (
                <div key={b.id} className="rounded-lg border-2 bg-gray-50 border-gray-200" style={{padding: '1.5rem', overflow: 'hidden'}}>
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-3">
                    <div style={{flex: 1, minWidth: 0}}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base md:text-lg" style={{wordBreak: 'break-word'}}>{b.category}</h3>
                        {b.recurring && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap">
                            {getRecurrenceLabel(b.recurrenceType)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">Due: {new Date(b.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right" style={{flexShrink: 0}}>
                      <p className="text-lg md:text-xl font-bold text-purple-600 mb-2">${b.amount}</p>
                      {isAdmin && (
                        <button onClick={() => del(b.id)} className="px-4 py-1 bg-red-500 text-white text-xs md:text-sm rounded hover:bg-red-600 whitespace-nowrap flex-shrink-0 min-w-[70px]">Delete</button>
                      )}
                    </div>
                  </div>
                  
                  {b.splits && b.payments && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-xs md:text-sm font-semibold text-gray-700 mb-2">Payment Status:</p>
                      <div className="space-y-2">
                        {Object.entries(b.splits).map(([userId, percentage]) => {
                          const userPayment = b.payments[userId] || { paid: false, paidDate: null };
                          const userAmount = ((b.amount * percentage) / 100).toFixed(2);
                          
                          return (
                            <div key={userId} className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-2 rounded ${userPayment.paid ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'}`} style={{padding: '0.75rem'}}>
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${userPayment.paid ? 'bg-green-500' : 'bg-gray-300'}`}>
                                  {userPayment.paid && <span className="text-white text-xs">✓</span>}
                                </div>
                                <div>
                                  <span className="font-medium text-sm md:text-base" style={{wordBreak: 'break-word'}}>{getUserName(userId)}</span>
                                  <span className="text-xs md:text-sm text-gray-600 ml-2">
                                    ({percentage}% = ${userAmount})
                                  </span>
                                </div>
                              </div>
                              {isAdmin && !userPayment.paid && (
                                <button
                                  onClick={() => markUserPaid(b.id, userId)}
                                  className="px-4 py-1 bg-green-600 text-white text-xs md:text-sm rounded hover:bg-green-700 w-full md:w-auto whitespace-nowrap min-w-[90px]"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {userPayment.paid && (
                                <span className="text-xs text-green-600">
                                  Paid {new Date(userPayment.paidDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {paidBills.length > 0 && (
        <>
          <h3 className="text-base md:text-lg font-semibold mb-3 text-gray-700">Paid Bills</h3>
          <div className="space-y-3">
            {paidBills.map(b => (
              <div key={b.id} className="rounded-lg border-2 bg-green-50 border-green-300" style={{padding: '1.5rem', overflow: 'hidden'}}>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div style={{flex: 1, minWidth: 0}}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm md:text-base" style={{wordBreak: 'break-word'}}>{b.category}</h3>
                      <span className="text-xs bg-green-200 px-2 py-1 rounded whitespace-nowrap">Paid</span>
                      {b.recurring && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap">
                          {getRecurrenceLabel(b.recurrenceType)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-gray-600">Paid on: {new Date(b.paidDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right" style={{flexShrink: 0}}>
                    <p className="text-lg md:text-xl font-bold text-gray-600">${b.amount}</p>
                    {isAdmin && (
                      <button onClick={() => del(b.id)} className="px-4 py-1 bg-red-500 text-white text-xs md:text-sm rounded hover:bg-red-600 mt-2 whitespace-nowrap min-w-[70px]">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {bills.length === 0 && (
        <p className="text-center text-gray-500 py-8 text-sm md:text-base">No bills yet. {isAdmin && 'Add one to get started!'}</p>
      )}
    </div>
  );
};

// ============================================
// ITEMS COMPONENT - WITH PROPER PADDING
// ============================================
// Replace your existing Items component with this

const Items = ({ items, setItems, saveData, addActivity, colors, selectedItem, setSelectedItem }) => {
  const { profile, isAdmin } = useAuth();

  const purchase = (itemId, person) => {
    const item = items.find(i => i.id === itemId);
    const currentPerson = item.rotation[item.currentIndex];
    
    const isEarlyPurchase = person !== currentPerson;
    
    if (isEarlyPurchase) {
      const updated = items.map(i => {
        if (i.id === itemId) {
          return {
            ...i,
            lastPurchase: { person, date: new Date().toISOString() },
            skippedThisRound: [...i.skippedThisRound, person]
          };
        }
        return i;
      });
      
      setItems(updated);
      saveData({ items: updated });
      addActivity(`${person} purchased ${item.name} EARLY (will skip next turn)`);
    } else {
      const idx = item.rotation.indexOf(person);
      const updated = items.map(i => {
        if (i.id === itemId) {
          return {
            ...i,
            currentIndex: idx,
            lastPurchase: { person, date: new Date().toISOString() },
            skippedThisRound: []
          };
        }
        return i;
      });
      
      setItems(updated);
      saveData({ items: updated });
      addActivity(`${person} purchased ${item.name}`);
    }
    
    setSelectedItem(null);
  };

  const getNextPerson = (item) => {
    const availableRotation = item.rotation.filter(name => !item.skippedThisRound.includes(name));
    if (availableRotation.length === 0) return item.rotation[0];
    
    const currentInAvailable = availableRotation.indexOf(item.rotation[item.currentIndex]);
    const nextIndex = (currentInAvailable + 1) % availableRotation.length;
    return availableRotation[nextIndex];
  };

  const quickMarkMyPurchase = (itemId) => {
    purchase(itemId, profile.name);
  };

  if (selectedItem) {
    return (
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <h2 className="text-xl md:text-2xl font-bold mb-4">Mark Item as Purchased</h2>
        <p className="text-center mb-6 text-sm md:text-base">
          Who purchased <span className="font-bold text-purple-600">{selectedItem.name}</span>?
        </p>
        <div className="space-y-2 max-w-xs mx-auto">
          {selectedItem.rotation.map(p => (
            <button 
              key={p} 
              onClick={() => purchase(selectedItem.id, p)} 
              className={`w-full rounded-lg text-white text-sm md:text-base whitespace-nowrap min-h-[48px] flex items-center justify-center ${
                colors[p].replace('text-', 'bg-').replace('200', '500')
              }`}
              style={{padding: '12px 20px'}}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <button 
            onClick={() => setSelectedItem(null)} 
            className="w-full bg-gray-400 text-white rounded text-sm md:text-base whitespace-nowrap min-h-[44px] flex items-center justify-center"
            style={{padding: '10px 20px'}}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
      <h2 className="text-xl md:text-2xl font-bold mb-4">Household Items</h2>
      
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg" style={{padding: '1rem', overflow: 'hidden'}}>
        <p className="text-sm text-gray-700" style={{wordBreak: 'break-word'}}>
          💡 <strong>How it works:</strong> Use "I Bought This" to quickly mark your purchase, 
          or "Mark Purchased" to select who bought it (admin only).
        </p>
      </div>
      
      <div className="space-y-4">
        {items.map(item => {
          const curr = item.rotation[item.currentIndex];
          const next = getNextPerson(item);
          const isMyTurn = next === profile.name;
          
          return (
            <div key={item.id} className="bg-gray-50 rounded-lg border-2 border-gray-200" style={{padding: '1.5rem', overflow: 'hidden'}}>
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-3">
                <div className="flex-1 w-full" style={{minWidth: 0}}>
                  <h3 className="font-bold text-base md:text-lg mb-3" style={{wordBreak: 'break-word'}}>{item.name}</h3>
                  
                  {isMyTurn && (
                    <div className="mb-3 bg-green-50 border-2 border-green-300 rounded" style={{padding: '0.75rem'}}>
                      <p className="text-sm font-semibold text-green-800">
                        ⭐ Your turn to buy this!
                      </p>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Rotation Order:</p>
                    <div className="flex flex-wrap items-center gap-2" style={{overflow: 'visible'}}>
                      {item.rotation.map((person, idx) => {
                        const isCurrent = idx === item.currentIndex;
                        const isSkipped = item.skippedThisRound.includes(person);
                        
                        return (
                          <React.Fragment key={person}>
                            <div 
                              className={`rounded text-xs md:text-sm ${
                                isCurrent 
                                  ? `${colors[person]} font-bold border-2 border-purple-500`
                                  : isSkipped
                                  ? 'bg-gray-300 text-gray-500 line-through'
                                  : colors[person]
                              }`}
                              style={{
                                padding: '4px 12px',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                                overflow: 'hidden'
                              }}
                            >
                              {person}
                              {isCurrent && ' ⭐'}
                              {isSkipped && ' (skipped)'}
                            </div>
                            {idx < item.rotation.length - 1 && (
                              <span className="text-gray-400" style={{flexShrink: 0}}>→</span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                  
                  {item.lastPurchase && (
                    <p className="text-xs md:text-sm mb-1" style={{wordBreak: 'break-word'}}>
                      Last purchased: <span 
                        className={`rounded ${colors[item.lastPurchase.person]}`}
                        style={{
                          padding: '2px 8px',
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}
                      >
                        {item.lastPurchase.person}
                      </span> on {new Date(item.lastPurchase.date).toLocaleDateString()}
                    </p>
                  )}
                  
                  <p className="text-xs md:text-sm" style={{wordBreak: 'break-word'}}>
                    Next up: <span 
                      className={`rounded ${colors[next]}`}
                      style={{
                        padding: '2px 8px',
                        whiteSpace: 'nowrap',
                        display: 'inline-block'
                      }}
                    >{next}</span>
                  </p>
                  
                  {item.skippedThisRound.length > 0 && (
                    <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded" style={{padding: '0.75rem'}}>
                      <p className="text-xs text-yellow-800" style={{wordBreak: 'break-word'}}>
                        <strong>Skipping this round:</strong> {item.skippedThisRound.join(', ')} (bought early)
                      </p>
                    </div>
                  )}
                </div>
                
                {/* ✅ UPDATED: Better padding on both buttons */}
                <div className="flex flex-col gap-3" style={{flexShrink: 0}}>
                  <button 
                    onClick={() => quickMarkMyPurchase(item.id)} 
                    className="bg-green-500 text-white rounded-lg hover:bg-green-600 whitespace-nowrap text-sm md:text-base min-w-[160px] font-medium"
                    style={{padding: '12px 20px'}}
                  >
                    ✓ I Bought This
                  </button>
                  
                  {isAdmin && (
                    <button 
                      onClick={() => setSelectedItem(item)} 
                      className="bg-blue-500 text-white rounded-lg hover:bg-blue-600 whitespace-nowrap text-sm md:text-base min-w-[160px] font-medium"
                      style={{padding: '12px 20px'}}
                    >
                      Mark Purchased
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Tasks = ({ 
  monthlyChores, 
  setMonthlyChores, 
  oneOffTasks, 
  setOneOffTasks, 
  saveData, 
  addActivity, 
  colors, 
  roommates, 
  showForm, 
  setShowForm, 
  selectedItem, 
  setSelectedItem, 
  currentMonth, 
  choreHistory, 
  setChoreHistory 
}) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const assignChore = (choreId, person) => {
    const updated = monthlyChores.map(c => 
      c.id === choreId ? { ...c, rotation: [person] } : c
    );
    setMonthlyChores(updated);
    saveData({ monthlyChores: updated });
    addActivity(`${person} assigned to ${monthlyChores.find(c => c.id === choreId).name}`);
  };

  const spinWheelForPerson = (person) => {
    const canEvaDoIt = (choreId) => ['frontyard', 'livingroom', 'sweep', 'steammop', 'dealers'].includes(choreId);
    
    let availableChores = monthlyChores.filter(c => {
      if (c.rotation.length > 0 && c.rotation[0]) return false;
      if (person === 'Eva' && !canEvaDoIt(c.id)) return false;
      if (person !== 'Eva' && (c.id === 'sweep' || c.id === 'steammop')) return false;
      return true;
    });

    if (availableChores.length === 0) return;

    const randomChore = availableChores[Math.floor(Math.random() * availableChores.length)];
    assignChore(randomChore.id, person);
    addActivity(`${person} got ${randomChore.name} via spin!`);
  };

  const getPersonChores = (person) => {
    return monthlyChores.filter(c => c.rotation.length > 0 && c.rotation[0] === person);
  };

  const getAvailableChoresFor = (person) => {
    return monthlyChores.filter(c => {
      const isAssigned = c.rotation.length > 0 && c.rotation[0];
      if (isAssigned) return false;
      if (person !== 'Eva' && (c.id === 'sweep' || c.id === 'steammop')) return false;
      return true;
    });
  };

  const completeMonthly = (choreId) => {
    const chore = monthlyChores.find(c => c.id === choreId);
    const person = chore.rotation[0];
    
    const completedChore = {
      id: Date.now(),
      name: chore.name,
      assignedTo: person,
      month: currentMonth,
      completedDate: new Date().toISOString()
    };
    
    const newHistory = [...choreHistory, completedChore];
    const updated = monthlyChores.map(c => c.id === choreId ? { ...c, rotation: [] } : c);
    
    setMonthlyChores(updated);
    setChoreHistory(newHistory);
    saveData({ monthlyChores: updated, choreHistory: newHistory });
    addActivity(`${person} completed ${chore.name}`);
    setSelectedItem(null);
  };

  const addTask = () => {
    if (!title || !assignee) return;
    const newTask = { 
      id: Date.now(), 
      title, 
      assignedTo: assignee, 
      dueDate: due, 
      completed: false 
    };
    const updated = [...oneOffTasks, newTask];
    setOneOffTasks(updated);
    saveData({ oneOffTasks: updated });
    addActivity(`New task: ${title} assigned to ${assignee}`);
    setTitle(''); 
    setAssignee(''); 
    setDue(''); 
    setShowForm(null);
  };

  const toggle = (id) => {
    const updated = oneOffTasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setOneOffTasks(updated);
    saveData({ oneOffTasks: updated });
  };

  const del = (id) => {
    const updated = oneOffTasks.filter(t => t.id !== id);
    setOneOffTasks(updated);
    saveData({ oneOffTasks: updated });
  };

  if (selectedItem) {
    return (
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <h2 className="text-xl md:text-2xl font-bold mb-4">Mark Chore Complete</h2>
        <p className="text-center mb-6 text-sm md:text-base">
          Complete <span className="font-bold text-purple-600">{selectedItem.name}</span>?
        </p>
        <div className="flex gap-2 justify-center">
          <button 
            onClick={() => completeMonthly(selectedItem.id)} 
            className="px-6 py-2 bg-green-500 text-white rounded-lg text-sm md:text-base whitespace-nowrap min-w-[130px]"
          >
            Yes, Complete
          </button>
          <button 
            onClick={() => setSelectedItem(null)} 
            className="px-6 py-2 bg-gray-400 text-white rounded-lg text-sm md:text-base whitespace-nowrap min-w-[80px]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (showHistory) {
    const historyByMonth = choreHistory.reduce((acc, chore) => {
      if (!acc[chore.month]) {
        acc[chore.month] = [];
      }
      acc[chore.month].push(chore);
      return acc;
    }, {});

    const months = Object.keys(historyByMonth).sort().reverse();

    return (
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Chore History</h2>
          <button
            onClick={() => setShowHistory(false)}
            className="px-5 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm md:text-base whitespace-nowrap min-w-[130px]"
          >
            Back to Current
          </button>
        </div>

        {months.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm md:text-base">No history yet.</p>
        ) : (
          <div className="space-y-6">
            {months.map(month => (
              <div key={month} className="border rounded-lg bg-gray-50" style={{padding: '1.5rem', overflow: 'hidden'}}>
                <h3 className="text-lg md:text-xl font-bold mb-4">{month}</h3>
                <div className="space-y-2">
                  {historyByMonth[month].map((chore, idx) => (
                    <div 
                      key={idx} 
                      className={`rounded flex justify-between items-center ${
                        colors[chore.assignedTo] || 'bg-white'
                      }`}
                      style={{padding: '0.75rem', overflow: 'hidden'}}
                    >
                      <span className="font-medium text-sm md:text-base" style={{wordBreak: 'break-word'}}>{chore.name}</span>
                      <span className="font-semibold text-sm md:text-base" style={{whiteSpace: 'nowrap', marginLeft: '0.5rem'}}>{chore.assignedTo}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Monthly Chores</h2>
            <p className="text-xs md:text-sm text-gray-600">{currentMonth}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm md:text-base whitespace-nowrap min-w-[110px]"
            >
              View History
            </button>
            <button 
              onClick={() => { 
                const cleared = monthlyChores.map(c => ({ ...c, rotation: [] }));
                setMonthlyChores(cleared);
                saveData({ monthlyChores: cleared });
                addActivity('Chores cleared for ' + currentMonth);
              }} 
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm md:text-base whitespace-nowrap min-w-[90px]"
            >
              Clear All
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          {roommates.map(person => {
            const personChores = getPersonChores(person);
            const availableChores = getAvailableChoresFor(person);
            return (
              <div key={person} className="bg-gray-50 rounded-lg border-2 border-gray-200" style={{padding: '1rem', overflow: 'hidden'}}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-3">
                  <h3 
                    className={`text-lg md:text-xl font-bold rounded ${colors[person]}`}
                    style={{
                      padding: '4px 12px',
                      whiteSpace: 'nowrap',
                      display: 'inline-block'
                    }}
                  >
                    {person}
                  </h3>
                  <div className="flex gap-2">
                    {personChores.length < 2 && availableChores.length > 0 && (
                      <>
                        <select 
                          onChange={(e) => { 
                            if (e.target.value) {
                              assignChore(e.target.value, person);
                              e.target.value = '';
                            }
                          }}
                          className="px-3 py-2 border-2 border-green-500 bg-white text-gray-800 text-xs md:text-sm rounded cursor-pointer min-w-[110px]"
                        >
                          <option value="" className="bg-white text-gray-800">Pick Chore</option>
                          {availableChores.map(chore => (
                            <option key={chore.id} value={chore.id} className="bg-white text-gray-800">
                              {chore.name}
                            </option>
                          ))}
                        </select>
                        <button 
                          onClick={() => spinWheelForPerson(person)} 
                          className="px-4 py-2 bg-purple-500 text-white text-xs md:text-sm rounded hover:bg-purple-600 whitespace-nowrap min-w-[60px]"
                        >
                          Spin
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {personChores.length === 0 ? (
                    <p className="text-gray-500 text-xs md:text-sm">No chores assigned (need 2)</p>
                  ) : (
                    personChores.map(chore => (
                      <div key={chore.id} className="flex flex-col md:flex-row justify-between items-center gap-2 bg-white rounded" style={{padding: '0.75rem'}}>
                        <span className="font-medium text-sm md:text-base" style={{wordBreak: 'break-word'}}>{chore.name}</span>
                        <button 
                          onClick={() => setSelectedItem(chore)} 
                          className="w-full md:w-auto px-4 py-1 bg-green-500 text-white text-xs md:text-sm rounded hover:bg-green-600 whitespace-nowrap min-w-[90px]"
                        >
                          Complete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold">One-Time Tasks</h2>
          <button 
            onClick={() => setShowForm('task')} 
            className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm md:text-base whitespace-nowrap min-w-[100px]"
          >
            + Add Task
          </button>
        </div>

        {showForm === 'task' && (
          <div className="mb-4 p-4 bg-purple-50 rounded-lg">
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Task" 
              className="w-full p-2 border rounded mb-2 text-sm md:text-base" 
            />
            <select 
              value={assignee} 
              onChange={(e) => setAssignee(e.target.value)} 
              className="w-full p-2 border rounded mb-2 text-sm md:text-base"
            >
              <option value="">Assign to...</option>
              {roommates.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input 
              type="date" 
              value={due} 
              onChange={(e) => setDue(e.target.value)} 
              className="w-full p-2 border rounded mb-2 text-sm md:text-base" 
            />
            <div className="flex gap-2">
              <button 
                onClick={addTask} 
                className="flex-1 bg-purple-600 text-white px-5 py-2 rounded text-sm md:text-base whitespace-nowrap min-w-[70px]"
              >
                Add
              </button>
              <button 
                onClick={() => setShowForm(null)} 
                className="bg-gray-300 px-5 py-2 rounded text-sm md:text-base whitespace-nowrap min-w-[70px] flex-shrink-0"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {oneOffTasks.map(t => (
            <div 
              key={t.id} 
              className={`rounded-lg border-2 ${
                t.completed ? 'bg-green-50 border-green-300' : 'bg-gray-50'
              }`}
              style={{padding: '1rem', overflow: 'hidden'}}
            >
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2" style={{flex: 1, minWidth: 0}}>
                  <button 
                    onClick={() => toggle(t.id)} 
                    className="text-xl md:text-2xl"
                    style={{flexShrink: 0}}
                  >
                    {t.completed ? '✓' : '○'}
                  </button>
                  <div style={{minWidth: 0}}>
                    <h3 
                      className={`font-semibold text-sm md:text-base ${t.completed ? 'line-through' : ''}`}
                      style={{wordBreak: 'break-word'}}
                    >
                      {t.title}
                    </h3>
                    <p className="text-xs md:text-sm" style={{wordBreak: 'break-word'}}>{t.assignedTo}</p>
                  </div>
                </div>
                <button 
                  onClick={() => del(t.id)} 
                  className="text-red-500 text-sm md:text-base px-2 py-1 hover:bg-red-50 rounded min-w-[60px]"
                  style={{flexShrink: 0}}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
// ============================================
// COMPLETE EVENTS COMPONENT - CALENDAR VERSION
// ============================================
// COPY EVERYTHING from "const Events" to the final "};" (before const Activity)

const Events = ({ events, setEvents, saveData, addActivity, showForm, setShowForm }) => {
  const { profile, isAdmin } = useAuth();
  
  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Get today at midnight
  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  // Check if date is in the past
  const isPastDate = (dateString) => {
    const eventDate = new Date(dateString);
    const today = getToday();
    return eventDate < today;
  };

  // Format date nicely
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calendar helpers
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getLastDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = getFirstDayOfMonth(currentMonth);
    const lastDay = getLastDayOfMonth(currentMonth);
    
    const days = [];
    
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }
    
    return days;
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateString = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateString);
  };

  // Check if date is today
  const isToday = (date) => {
    if (!date) return false;
    const today = getToday();
    return date.toDateString() === today.toDateString();
  };

  // Navigation
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Add event
  const add = () => {
    if (!title || !date) {
      alert('Please enter event title and date');
      return;
    }
    
    const newEvent = { 
      id: Date.now(),
      title, 
      date, 
      time: time || '', 
      description: desc || '', 
      link: link || '',
      createdBy: profile.id,
      createdByName: profile.name,
      isBirthday: false
    };
    
    const updated = [...events, newEvent];
    setEvents(updated);
    saveData({ events: updated });
    addActivity(`${profile.name} added event: ${title}`);
    
    setTitle(''); 
    setDate(''); 
    setTime(''); 
    setDesc(''); 
    setLink(''); 
    setShowForm(null);
  };

  // Delete event
  const del = (id, eventCreatorId, isBirthday) => {
    if (isBirthday) {
      alert('Birthday events cannot be deleted. Change your birthday in your profile to update it.');
      return;
    }
    
    const canDelete = isAdmin || eventCreatorId === profile.id;
    
    if (!canDelete) {
      alert('You can only delete events you created. Ask an admin for help!');
      return;
    }
    
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    saveData({ events: updated });
    addActivity(`${profile.name} deleted an event`);
  };

  // Filter upcoming events
  const upcomingEvents = events
    .filter(e => !isPastDate(e.date))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-6">
      {/* Calendar Section */}
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="text-purple-600" />
            Events Calendar
          </h2>
          <button 
            onClick={() => setShowForm('event')} 
            className="bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm md:text-base whitespace-nowrap flex-shrink-0 font-medium"
            style={{padding: '12px 24px'}}
          >
            + Add Event
          </button>
        </div>

        {/* Add Event Form */}
        {showForm === 'event' && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <h3 className="font-semibold mb-3">Create New Event</h3>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Event title" 
              className="w-full p-2 border rounded mb-2 text-sm md:text-base" 
            />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full p-2 border rounded mb-2 text-sm md:text-base" 
            />
            <input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)} 
              className="w-full p-2 border rounded mb-2 text-sm md:text-base" 
            />
            <textarea 
              value={desc} 
              onChange={(e) => setDesc(e.target.value)} 
              placeholder="Description (optional)" 
              className="w-full p-2 border rounded mb-2 text-sm md:text-base" 
              rows="2" 
            />
            <input 
              type="url" 
              value={link} 
              onChange={(e) => setLink(e.target.value)} 
              placeholder="Link (optional)" 
              className="w-full p-2 border rounded mb-2 text-sm md:text-base" 
            />
            <div className="flex gap-2">
              <button 
                onClick={add} 
                className="flex-1 bg-purple-600 text-white px-5 py-2 rounded hover:bg-purple-700 text-sm md:text-base"
              >
                Add Event
              </button>
              <button 
                onClick={() => setShowForm(null)} 
                className="bg-gray-300 px-5 py-2 rounded hover:bg-gray-400 text-sm md:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Previous month"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center">
            <h3 className="text-xl font-bold">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={goToToday}
              className="text-sm text-purple-600 hover:underline"
            >
              Go to Today
            </button>
          </div>
          
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Next month"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-purple-50 border-b-2 border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-semibold text-sm">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {generateCalendarDays().map((day, index) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const isTodayDate = day ? isToday(day) : false;
              
              return (
                <div
                  key={index}
                  className={`min-h-[80px] border-b border-r border-gray-200 p-1 ${
                    !day ? 'bg-gray-50' : isTodayDate ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => day && setSelectedDate(day)}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-semibold mb-1 ${
                        isTodayDate ? 'text-blue-600' : 'text-gray-700'
                      }`}>
                        {day.getDate()}
                        {isTodayDate && <span className="ml-1 text-xs">(Today)</span>}
                      </div>
                      
                      {dayEvents.length > 0 && (
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className={`text-xs truncate rounded px-1 ${
                                event.isBirthday 
                                  ? 'bg-pink-200 text-pink-800' 
                                  : 'bg-purple-200 text-purple-800'
                              }`}
                              title={event.title}
                            >
                              {event.isBirthday ? '🎂' : '•'} {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <h3 className="text-xl font-bold mb-4">Upcoming Events</h3>
        
        {upcomingEvents.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No upcoming events</p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map(e => {
              const canDelete = isAdmin || e.createdBy === profile.id;
              
              return (
                <div 
                  key={e.id} 
                  className={`rounded-lg border-2 ${
                    e.isBirthday 
                      ? 'bg-pink-50 border-pink-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  style={{padding: '1rem', overflow: 'hidden'}}
                >
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1" style={{minWidth: 0}}>
                      <h3 className="font-bold text-sm md:text-base mb-1" style={{wordBreak: 'break-word'}}>
                        {e.title}
                      </h3>
                      
                      <p className="text-xs md:text-sm text-gray-600 mb-1">
                        📅 {formatDate(e.date)}
                        {e.time && ` at ${e.time}`}
                      </p>
                      
                      <p className="text-xs text-purple-600">
                        {e.isBirthday ? '🎂 Birthday Event' : `Created by: ${e.createdByName || 'Unknown'}`}
                      </p>
                      
                      {e.description && (
                        <p className="text-xs md:text-sm mt-2" style={{wordBreak: 'break-word'}}>
                          {e.description}
                        </p>
                      )}
                      
                      {e.link && (
                        <a 
                          href={e.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs md:text-sm text-blue-600 underline"
                          style={{wordBreak: 'break-all'}}
                        >
                          Link
                        </a>
                      )}
                    </div>
                    
                    {!e.isBirthday && canDelete && (
                      <button 
                        onClick={() => del(e.id, e.createdBy, e.isBirthday)} 
                        className="text-red-500 text-sm md:text-base self-start md:self-center px-3 py-1 hover:bg-red-50 rounded whitespace-nowrap"
                        style={{flexShrink: 0}}
                      >
                        Delete
                      </button>
                    )}
                    
                    {!e.isBirthday && !canDelete && (
                      <div className="text-gray-400 text-xs self-start md:self-center px-3 py-1">
                        🔒
                      </div>
                    )}
                    
                    {e.isBirthday && (
                      <div className="text-pink-600 text-xs self-start md:self-center px-3 py-1">
                        ℹ️ Auto-generated
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// HOW THIS WORKS - PLAIN ENGLISH
// ============================================
/*
CALENDAR VIEW:
- Shows a visual month-by-month calendar
- Each day shows events happening on that date
- Today is highlighted in blue
- Birthday events show with a 🎂 emoji
- Click arrows to navigate between months
- Click "Go to Today" to jump to current month

DATE AWARENESS:
- Automatically filters out past events from the "Upcoming Events" list
- Only shows events from today forward
- Past events are completely hidden (not just grayed out)

BIRTHDAY EVENTS:
- Automatically created when users save their birthday in their profile
- Cannot be deleted (must edit birthday in profile to change)
- Show up with a pink background and 🎂 emoji
- Marked as "Auto-generated"

USER PERMISSIONS:
- Everyone can add regular events
- Users can only delete their own events
- Admins can delete anyone's events (except birthdays)
- Birthday events cannot be deleted by anyone
*/

const Activity = ({ activity }) => {
  const { profile, isAdmin } = useAuth();
  
  const getFilteredActivity = () => {
    if (isAdmin) {
      return activity;
    }
    
    return activity.filter(a => {
      const msg = a.msg.toLowerCase();
      const userName = profile?.name?.toLowerCase() || '';
      
      if (msg.includes(userName)) {
        return true;
      }
      
      if (msg.includes('new event')) {
        return true;
      }
      
      if (msg.includes('bill')) {
        return true;
      }
      
      if (msg.includes('purchased') && !msg.includes(userName)) {
        return false;
      }
      
      return false;
    });
  };
  
  const filteredActivity = getFilteredActivity().slice(0, 20);

  return (
    <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <h2 className="text-xl md:text-2xl font-bold">Activity</h2>
        {!isAdmin && (
          <span className="text-xs md:text-sm text-gray-500">Showing your activity</span>
        )}
      </div>
      {filteredActivity.length === 0 ? (
        <p className="text-center text-gray-500 py-8 text-sm md:text-base">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {filteredActivity.map(a => (
            <div key={a.id} className="bg-purple-50 rounded-lg border-l-4 border-purple-500" style={{padding: '1rem', overflow: 'hidden'}}>
              <p className="font-medium text-sm md:text-base" style={{wordBreak: 'break-word'}}>{a.msg}</p>
              <p className="text-xs md:text-sm text-gray-500">
                {new Date(a.time).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-xl md:text-2xl font-bold text-purple-600">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

const AppWrapper = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppWrapper;
