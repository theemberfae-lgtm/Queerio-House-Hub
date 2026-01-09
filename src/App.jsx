import React, { useState, useEffect } from 'react';
import { Home, DollarSign, ShoppingCart, Bell, CheckCircle, Users, User, Settings } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Signup from './Signup';
import AdminUsers from './AdminUsers';
import PersonalDashboard from './PersonalDashboard';
import UserProfile from './UserProfile';

const supabase = createClient(
  'https://yrgasnkcwawhijkvqfqs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ2Fzbmtjd2F3aGlqa3ZxZnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4OTIxNzQsImV4cCI6MjA4MjQ2ODE3NH0.cTmDo1w-u63jn9-PopQaC_WXAfgViDH81Anmay_q50o'
);

const App = () => {
  const { profile, signOut, isAdmin } = useAuth();
const [activeTab, setActiveTab] = useState('dashboard'); // changed from 'tasks'
  const [bills, setBills] = useState([]);
  const [items, setItems] = useState([
    { id: 'handsoap', name: 'Hand Soap', rotation: ['Eva', 'Elle', 'Illari', 'Ember'], currentIndex: 2 },
    { id: 'dishsoap', name: 'Dish Soap', rotation: ['Eva', 'Ember', 'Elle', 'Illari'], currentIndex: 0 },
    { id: 'toiletpaper', name: 'Toilet Paper', rotation: ['Eva', 'Illari', 'Elle', 'Ember'], currentIndex: 3 },
    { id: 'papertowels', name: 'Paper Towels', rotation: ['Elle', 'Eva', 'Illari', 'Ember'], currentIndex: 2 },
    { id: 'trashbags', name: 'Trash Bags', rotation: ['Illari', 'Ember', 'Eva', 'Elle'], currentIndex: 1 },
    { id: 'laundry', name: 'Laundry Detergent', rotation: ['Ember', 'Eva', 'Elle'], currentIndex: 0 }
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
  const colors = { Ember: 'bg-orange-200 text-orange-800', Eva: 'bg-green-200 text-green-800', Elle: 'bg-blue-200 text-blue-800', Illari: 'bg-purple-200 text-purple-800' };

  // Load data from Supabase on mount
  useEffect(() => {
    loadData();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('household_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'household_data' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        setLoaded(true);
        return;
      }

      if (data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setBills(parsed.bills || []);
        setItems(parsed.items || items);
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

return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 pb-20 flex justify-center">
      <div className="w-full max-w-6xl px-16 py-8">
        <div className="bg-white rounded-lg shadow-lg px-16 py-12 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Home className="text-purple-600" />
                Queerio House Hub
              </h1>
              <p className="text-gray-600">Elle, Ember, Eva & Illari's Home</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">{profile?.name}</p>
                {isAdmin && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Admin</span>}
              </div>
              <button 
                onClick={() => signOut()} 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' && <PersonalDashboard bills={bills} items={items} events={events} oneOffTasks={oneOffTasks} />}
        {activeTab === 'profile' && <UserProfile />}
        {activeTab === 'bills' && <Bills bills={bills} setBills={setBills} saveData={saveData} addActivity={addActivity} />}
        {activeTab === 'items' && <Items items={items} setItems={setItems} saveData={saveData} addActivity={addActivity} colors={colors} selectedItem={selectedItem} setSelectedItem={setSelectedItem} />}
        {activeTab === 'tasks' && <Tasks monthlyChores={monthlyChores} setMonthlyChores={setMonthlyChores} oneOffTasks={oneOffTasks} setOneOffTasks={setOneOffTasks} saveData={saveData} addActivity={addActivity} colors={colors} roommates={roommates} showForm={showForm} setShowForm={setShowForm} selectedItem={selectedItem} setSelectedItem={setSelectedItem} currentMonth={currentMonth} choreHistory={choreHistory} setChoreHistory={setChoreHistory} />}
        {activeTab === 'events' && <Events events={events} setEvents={setEvents} saveData={saveData} addActivity={addActivity} showForm={showForm} setShowForm={setShowForm} />}
        {activeTab === 'admin' && <AdminUsers />}

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg flex justify-center">
          <div className="flex justify-center items-center gap-12 px-8 py-4">
{[
  { id: 'dashboard', icon: User, label: 'Dashboard' },
  { id: 'bills', icon: DollarSign, label: 'Bills' },
  { id: 'items', icon: ShoppingCart, label: 'Items' },
  { id: 'tasks', icon: CheckCircle, label: 'Tasks' },
  { id: 'events', icon: Home, label: 'Events' },
  { id: 'profile', icon: Settings, label: 'Profile' },
  ...(isAdmin ? [{ id: 'admin', icon: Users, label: 'Admin' }] : [])
].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center px-6 py-3 rounded-lg ${activeTab === tab.id ? 'text-purple-600 bg-purple-50' : 'text-gray-600'}`}>
                <tab.icon size={24} />
                <span className="text-xs mt-1">{tab.label}</span>
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
  const [splitMode, setSplitMode] = useState('percent'); // 'percent' or 'amount'
  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('monthly');
  const [users, setUsers] = useState([]);
  const [splits, setSplits] = useState({});

  // Load users on mount
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
      // Initialize equal splits
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
    
    // Initialize payment tracking for each user
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
      paid: false, // Bill is paid when ALL users have paid
      recurring: recurring,
      recurrenceType: recurring ? recurrenceType : null,
      splits: splits,
      payments: payments // Track individual payments
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
    
    // Reset to equal splits
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
        
        // Check if all users have paid
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
    
    // If recurring, create a new unpaid bill
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
        splits: bill.splits // Carry over the same splits
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
    <div className="bg-white rounded-lg shadow-lg px-20 py-12">
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Bills & Expenses</h2>
        {isAdmin && (
          <button onClick={() => setShow(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">+ Add Bill</button>
        )}
      </div>

      {show && isAdmin && (
        <div className="mb-6 p-6 bg-purple-50 rounded-lg">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full p-3 border rounded mb-3">
            <option value="">Select category...</option>
            {['Rent', 'Internet', 'PG&E', 'Waste Management', 'Water', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input 
            type="number" 
            value={amt} 
            onChange={(e) => setAmt(e.target.value)} 
            placeholder="Total amount" 
            className="w-full p-3 border rounded mb-3" 
            required
          />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full p-3 border rounded mb-3" />
          
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
              className="w-full p-3 border rounded mb-4"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly (every 2 weeks)</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (every 3 months)</option>
              <option value="semiannually">Semi-annually (every 6 months)</option>
              <option value="yearly">Yearly</option>
            </select>
          )}

          {/* Split Percentages */}
         {/* Split by Amount or Percent */}
          <div className="mt-4 p-4 bg-white rounded-lg border-2 border-purple-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Split Between Roommates:</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMode('percent')}
                  className={`px-3 py-1 text-sm rounded ${splitMode === 'percent' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                >
                  By %
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('amount')}
                  className={`px-3 py-1 text-sm rounded ${splitMode === 'amount' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                >
                  By $
                </button>
              </div>
            </div>

            {splitMode === 'percent' ? (
              // Split by Percentage
              <>
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between mb-2">
                    <span className="font-medium">{user.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={splits[user.id] || 0}
                        onChange={(e) => updateSplit(user.id, e.target.value)}
                        className="w-20 p-2 border rounded text-right"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <span className="text-sm">%</span>
                      {amt && (
                        <span className="text-sm text-gray-600 ml-2">
                          (${((parseFloat(amt) * parseFloat(splits[user.id] || 0)) / 100).toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t flex justify-between font-bold">
                  <span>Total:</span>
                  <span className={getTotalSplit() === 100 ? 'text-green-600' : 'text-red-600'}>
                    {getTotalSplit().toFixed(2)}% {getTotalSplit() !== 100 && '(Must be 100%)'}
                  </span>
                </div>
              </>
            ) : (
              // Split by Dollar Amount
              <>
                {users.map(user => {
                  const userAmount = amt ? ((parseFloat(amt) * parseFloat(splits[user.id] || 0)) / 100).toFixed(2) : '0.00';
                  return (
                    <div key={user.id} className="flex items-center justify-between mb-2">
                      <span className="font-medium">{user.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">$</span>
                        <input
                          type="number"
                          value={userAmount}
                          onChange={(e) => {
                            // Calculate percentage from dollar amount
                            const dollarAmount = parseFloat(e.target.value) || 0;
                            const totalAmount = parseFloat(amt) || 1;
                            const percentage = (dollarAmount / totalAmount) * 100;
                            updateSplit(user.id, percentage.toFixed(2));
                          }}
                          className="w-24 p-2 border rounded text-right"
                          min="0"
                          max={amt || 0}
                          step="0.01"
                          disabled={!amt}
                        />
                        {amt && (
                          <span className="text-sm text-gray-600 ml-2">
                            ({splits[user.id]}%)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="mt-3 pt-3 border-t flex justify-between font-bold">
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
            <button onClick={add} className="flex-1 bg-purple-600 text-white p-3 rounded hover:bg-purple-700">Add Bill</button>
            <button onClick={() => { 
              setShow(false); 
              setCat(''); 
              setAmt(''); 
              setDue(''); 
              setRecurring(false); 
              setRecurrenceType('monthly');
            }} className="bg-gray-300 p-3 rounded hover:bg-gray-400">Cancel</button>
          </div>
        </div>
      )}

{unpaidBills.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Unpaid Bills</h3>
          <div className="space-y-3 mb-6">
            {unpaidBills.map(b => {
              // Initialize payments if they don't exist (for old bills)
              if (!b.payments && b.splits) {
                b.payments = {};
                Object.keys(b.splits).forEach(userId => {
                  b.payments[userId] = { paid: false, paidDate: null };
                });
              }
              
              return (
                <div key={b.id} className="p-6 rounded-lg border-2 bg-gray-50 border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{b.category}</h3>
                        {b.recurring && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {getRecurrenceLabel(b.recurrenceType)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Due: {new Date(b.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-600 mb-2">${b.amount}</p>
                      {isAdmin && (
                        <button onClick={() => del(b.id)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Delete</button>
                      )}
                    </div>
                  </div>
                  
                  {/* Individual Payment Status */}
                  {b.splits && b.payments && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Payment Status:</p>
                      <div className="space-y-2">
                        {Object.entries(b.splits).map(([userId, percentage]) => {
                          const userPayment = b.payments[userId] || { paid: false, paidDate: null };
                          const userAmount = ((b.amount * percentage) / 100).toFixed(2);
                          
                          return (
                            <div key={userId} className={`flex justify-between items-center p-3 rounded ${userPayment.paid ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'}`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded flex items-center justify-center ${userPayment.paid ? 'bg-green-500' : 'bg-gray-300'}`}>
                                  {userPayment.paid && <span className="text-white text-xs">✓</span>}
                                </div>
                                <div>
                                  <span className="font-medium">{getUserName(userId)}</span>
                                  <span className="text-sm text-gray-600 ml-2">
                                    ({percentage}% = ${userAmount})
                                  </span>
                                </div>
                              </div>
                              {isAdmin && !userPayment.paid && (
                                <button
                                  onClick={() => markUserPaid(b.id, userId)}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
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
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Paid Bills</h3>
          <div className="space-y-3">
            {paidBills.map(b => (
              <div key={b.id} className="p-6 rounded-lg border-2 bg-green-50 border-green-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{b.category}</h3>
                      <span className="text-xs bg-green-200 px-2 py-1 rounded">Paid</span>
                      {b.recurring && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {getRecurrenceLabel(b.recurrenceType)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">Paid on: {new Date(b.paidDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-600">${b.amount}</p>
                    {isAdmin && (
                      <button onClick={() => del(b.id)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 mt-2">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {bills.length === 0 && (
        <p className="text-center text-gray-500 py-8">No bills yet. {isAdmin && 'Add one to get started!'}</p>
      )}
    </div>
  );
};

const Items = ({ items, setItems, saveData, addActivity, colors, selectedItem, setSelectedItem }) => {
  const purchase = (itemId, person) => {
    const item = items.find(i => i.id === itemId);
    const idx = item.rotation.indexOf(person);
    const updated = items.map(i => i.id === itemId ? { ...i, currentIndex: idx } : i);
    setItems(updated);
    saveData({ items: updated });
    addActivity(`${person} purchased ${item.name}`);
    setSelectedItem(null);
  };

  if (selectedItem) {
    return (
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <h2 className="text-2xl font-bold mb-4">Mark Item as Purchased</h2>
        <p className="text-center mb-6">Who purchased <span className="font-bold text-purple-600">{selectedItem.name}</span>?</p>
        <div className="space-y-2 max-w-xs mx-auto">
          {selectedItem.rotation.map(p => (
            <button key={p} onClick={() => purchase(selectedItem.id, p)} className={`w-full px-4 py-2 rounded-lg text-white ${colors[p].replace('text-', 'bg-').replace('200', '500')}`}>{p}</button>
          ))}
        </div>
        <button onClick={() => setSelectedItem(null)} className="mt-4 w-full bg-gray-400 text-white p-2 rounded">Cancel</button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg px-20 py-12">
      <h2 className="text-2xl font-bold mb-4">Household Items</h2>
      <div className="space-y-3">
        {items.map(item => {
          const curr = item.rotation[item.currentIndex];
          const next = item.rotation[(item.currentIndex + 1) % item.rotation.length];
          return (
            <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                  <p className="text-sm mb-1">Last purchased: <span className={`px-2 py-0.5 rounded ${colors[curr]}`}>{curr}</span></p>
                  <p className="text-sm">Next up: <span className={`px-2 py-0.5 rounded ${colors[next]}`}>{next}</span></p>
                </div>
                <button onClick={() => setSelectedItem(item)} className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 whitespace-nowrap">Mark Purchased</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Tasks = ({ monthlyChores, setMonthlyChores, oneOffTasks, setOneOffTasks, saveData, addActivity, colors, roommates, showForm, setShowForm, selectedItem, setSelectedItem, currentMonth, choreHistory, setChoreHistory }) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');
  const [showHistory, setShowHistory] = useState(false);  // ADD THIS LINE

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
    
    // Save to history
    const completedChore = {
      id: Date.now(),
      name: chore.name,
      assignedTo: person,
      month: currentMonth,
      completedDate: new Date().toISOString()
    };
    
    const newHistory = [...choreHistory, completedChore];
    
    // Clear from current rotation
    const updated = monthlyChores.map(c => c.id === choreId ? { ...c, rotation: [] } : c);
    setMonthlyChores(updated);
    setChoreHistory(newHistory);
    saveData({ monthlyChores: updated, choreHistory: newHistory });
    addActivity(`${person} completed ${chore.name}`);
    setSelectedItem(null);
  };

  const addTask = () => {
    if (!title || !assignee) return;
    const newTask = { id: Date.now(), title, assignedTo: assignee, dueDate: due, completed: false };
    const updated = [...oneOffTasks, newTask];
    setOneOffTasks(updated);
    saveData({ oneOffTasks: updated });
    addActivity(`New task: ${title} assigned to ${assignee}`);
    setTitle(''); setAssignee(''); setDue(''); setShowForm(null);
  };

  const toggle = (id) => {
    const updated = oneOffTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
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
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <h2 className="text-2xl font-bold mb-4">Mark Chore Complete</h2>
        <p className="text-center mb-6">Complete <span className="font-bold text-purple-600">{selectedItem.name}</span>?</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => completeMonthly(selectedItem.id)} className="px-6 py-2 bg-green-500 text-white rounded-lg">Yes, Complete</button>
          <button onClick={() => setSelectedItem(null)} className="px-6 py-2 bg-gray-400 text-white rounded-lg">Cancel</button>
        </div>
      </div>
    );
  }

  if (showHistory) {
    // Group history by month
    const historyByMonth = choreHistory.reduce((acc, chore) => {
      if (!acc[chore.month]) {
        acc[chore.month] = [];
      }
      acc[chore.month].push(chore);
      return acc;
    }, {});

    const months = Object.keys(historyByMonth).sort().reverse();

    return (
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Chore History</h2>
          <button
            onClick={() => setShowHistory(false)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Back to Current
          </button>
        </div>

        {months.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No history yet. Clear chores to save them to history.</p>
        ) : (
          <div className="space-y-6">
            {months.map(month => (
              <div key={month} className="border rounded-lg p-6 bg-gray-50">
                <h3 className="text-xl font-bold mb-4">{month}</h3>
                <div className="space-y-2">
                  {historyByMonth[month].map((chore, idx) => (
                    <div key={idx} className={`p-3 rounded flex justify-between items-center ${colors[chore.assignedTo] || 'bg-white'}`}>
                      <span className="font-medium">{chore.name}</span>
                      <span className="font-semibold">{chore.assignedTo}</span>
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
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">Monthly Chores</h2>
            <p className="text-sm text-gray-600">{currentMonth}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              View History
<button onClick={() => { 
  const cleared = monthlyChores.map(c => ({ ...c, rotation: [] }));
  setMonthlyChores(cleared);
  saveData({ monthlyChores: cleared });
  addActivity('Chores cleared for ' + currentMonth);
}} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
  Clear All
</button>
          </div>
        </div>
        <div className="space-y-4">
          {roommates.map(person => {
            const personChores = getPersonChores(person);
            const availableChores = getAvailableChoresFor(person);
            return (
              <div key={person} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`text-xl font-bold px-3 py-1 rounded ${colors[person]}`}>{person}</h3>
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
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 cursor-pointer"
                        >
                          <option value="">Pick Chore</option>
                          {availableChores.map(chore => (
                            <option key={chore.id} value={chore.id}>{chore.name}</option>
                          ))}
                        </select>
                        <button onClick={() => spinWheelForPerson(person)} className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600">
                          Spin
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {personChores.length === 0 ? (
                    <p className="text-gray-500 text-sm">No chores assigned (need 2)</p>
                  ) : (
                    personChores.map(chore => (
                      <div key={chore.id} className="flex justify-between items-center bg-white p-3 rounded">
                        <span className="font-medium">{chore.name}</span>
                        <button onClick={() => setSelectedItem(chore)} className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">
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

      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <div className="flex justify-between mb-4">
          <h2 className="text-2xl font-bold">One-Time Tasks</h2>
          <button onClick={() => setShowForm('task')} className="px-4 py-2 bg-purple-600 text-white rounded-lg">+ Add Task</button>
        </div>

        {showForm === 'task' && (
          <div className="mb-4 p-4 bg-purple-50 rounded-lg">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task" className="w-full p-2 border rounded mb-2" />
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full p-2 border rounded mb-2">
              <option value="">Assign to...</option>
              {roommates.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full p-2 border rounded mb-2" />
            <div className="flex gap-2">
              <button onClick={addTask} className="flex-1 bg-purple-600 text-white p-2 rounded">Add</button>
              <button onClick={() => setShowForm(null)} className="bg-gray-300 p-2 rounded">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {oneOffTasks.map(t => (
            <div key={t.id} className={`p-4 rounded-lg border-2 ${t.completed ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggle(t.id)} className="text-2xl">{t.completed ? '✓' : '○'}</button>
                  <div>
                    <h3 className={`font-semibold ${t.completed ? 'line-through' : ''}`}>{t.title}</h3>
                    <p className="text-sm">{t.assignedTo}</p>
                  </div>
                </div>
                <button onClick={() => del(t.id)} className="text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

const Events = ({ events, setEvents, saveData, addActivity, showForm, setShowForm }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');

  const add = () => {
    if (!title || !date) return;
    const newEvent = { id: Date.now(), title, date, time, description: desc, link };
    const updated = [...events, newEvent];
    setEvents(updated);
    saveData({ events: updated });
    addActivity(`New event: ${title}`);
    setTitle(''); setDate(''); setTime(''); setDesc(''); setLink(''); setShowForm(null);
  };

  const del = (id) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    saveData({ events: updated });
  };

  const upcoming = events.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="bg-white rounded-lg shadow-lg px-20 py-12">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Events</h2>
        <button onClick={() => setShowForm('event')} className="px-4 py-2 bg-purple-600 text-white rounded-lg">+ Add Event</button>
      </div>

      {showForm === 'event' && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="w-full p-2 border rounded mb-2" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border rounded mb-2" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full p-2 border rounded mb-2" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="w-full p-2 border rounded mb-2" rows="2" />
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (optional)" className="w-full p-2 border rounded mb-2" />
          <div className="flex gap-2">
            <button onClick={add} className="flex-1 bg-purple-600 text-white p-2 rounded">Add</button>
            <button onClick={() => setShowForm(null)} className="bg-gray-300 p-2 rounded">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {upcoming.map(e => (
          <div key={e.id} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold">{e.title}</h3>
                <p className="text-sm">{new Date(e.date).toLocaleDateString()}{e.time && `
at ${e.time}`}</p>
                {e.description && <p className="text-sm mt-1">{e.description}</p>}
                {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">Link</a>}
              </div>
              <button onClick={() => del(e.id)} className="text-red-500">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Activity = ({ activity }) => {
  const { profile, isAdmin } = useAuth();
  
  // Filter activity based on user
  const getFilteredActivity = () => {
    if (isAdmin) {
      // Admin sees everything
      return activity;
    }
    
    // Regular users see only relevant activity
    return activity.filter(a => {
      const msg = a.msg.toLowerCase();
      const userName = profile?.name?.toLowerCase() || '';
      
      // Show if message mentions this user's name
      if (msg.includes(userName)) {
        return true;
      }
      
      // Show new events (everyone should know)
      if (msg.includes('new event')) {
        return true;
      }
      
      // Show bill-related activity
      if (msg.includes('bill')) {
        return true;
      }
      
      // Hide other people's item purchases unless it affects rotation
      if (msg.includes('purchased') && !msg.includes(userName)) {
        return false;
      }
      
      return false;
    });
  };
  
  const filteredActivity = getFilteredActivity().slice(0, 20);

  return (
    <div className="bg-white rounded-lg shadow-lg px-20 py-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Activity</h2>
        {!isAdmin && (
          <span className="text-sm text-gray-500">Showing your activity</span>
        )}
      </div>
      {filteredActivity.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {filteredActivity.map(a => (
            <div key={a.id} className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <p className="font-medium">{a.msg}</p>
              <p className="text-sm text-gray-500">{new Date(a.time).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Add this AFTER your existing App component, REPLACE the export default App line

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-2xl font-bold text-purple-600">Loading...</div>
      </div>
    );
  }
};
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