// ============================================
// IMPORTS - These are libraries and components we need
// ============================================

// React hooks - these help us manage data and side effects in our app
// useState: lets us store and update data
// useEffect: lets us run code when the component loads or when data changes
import React, { useState, useEffect } from 'react';

// Icons from lucide-react library - these are the little pictures you see in the app
import { Home, DollarSign, ShoppingCart, Bell, CheckCircle, Users, User, Settings } from 'lucide-react';

// Supabase - this is our database service that stores all household data
import { createClient } from '@supabase/supabase-js';

// React Router - helps us navigate between different pages (login, signup, main app)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Custom components we created for authentication and other pages
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Signup from './Signup';
import AdminUsers from './AdminUsers';
import PersonalDashboard from './PersonalDashboard';
import UserProfile from './UserProfile';

// ============================================
// SUPABASE CLIENT SETUP
// ============================================

// SECURITY FIX: Using environment variables instead of hardcoded credentials
// This keeps your database secure - the actual values are in the .env file
// which should NEVER be uploaded to GitHub
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,      // Your Supabase project URL
  import.meta.env.VITE_SUPABASE_ANON_KEY  // Your Supabase anonymous key
);

// ============================================
// MAIN APP COMPONENT
// ============================================

const App = () => {
  // Get authentication info from our AuthContext
  // profile: the current logged-in user's info
  // signOut: function to log out
  // isAdmin: whether this user has admin permissions
  const { profile, signOut, isAdmin } = useAuth();

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // State is data that can change over time. When state changes, 
  // React automatically updates the display to show the new data
  
  // Which tab is currently active (dashboard, bills, items, etc.)
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // All the bills in the system
  const [bills, setBills] = useState([]);
  
  // Household items that rotate who buys them (soap, toilet paper, etc.)
  // Each item has: id, name, rotation (list of roommates), currentIndex (who bought it last)
  const [items, setItems] = useState([
    { id: 'handsoap', name: 'Hand Soap', rotation: ['Eva', 'Elle', 'Illari', 'Ember'], currentIndex: 2 },
    { id: 'dishsoap', name: 'Dish Soap', rotation: ['Eva', 'Ember', 'Elle', 'Illari'], currentIndex: 0 },
    { id: 'toiletpaper', name: 'Toilet Paper', rotation: ['Eva', 'Illari', 'Elle', 'Ember'], currentIndex: 3 },
    { id: 'papertowels', name: 'Paper Towels', rotation: ['Elle', 'Eva', 'Illari', 'Ember'], currentIndex: 2 },
    { id: 'trashbags', name: 'Trash Bags', rotation: ['Illari', 'Ember', 'Eva', 'Elle'], currentIndex: 1 },
    { id: 'laundry', name: 'Laundry Detergent', rotation: ['Ember', 'Eva', 'Elle'], currentIndex: 0 }
  ]);
  
  // Monthly chores that get assigned to roommates
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
  
  // One-time tasks (not recurring)
  const [oneOffTasks, setOneOffTasks] = useState([]);
  
  // Upcoming events (like parties, maintenance appointments, etc.)
  const [events, setEvents] = useState([]);
  
  // Activity feed - shows recent actions in the house
  const [activity, setActivity] = useState([]);
  
  // Controls whether forms are visible (for adding new bills, tasks, events)
  const [showForm, setShowForm] = useState(null);
  
  // When marking an item as purchased or chore as complete, this stores which one
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Current month for chore tracking
  const [currentMonth, setCurrentMonth] = useState('January 2026');
  
  // History of completed chores
  const [choreHistory, setChoreHistory] = useState([]);
  
  // Tracks whether we've finished loading data from the database
  const [loaded, setLoaded] = useState(false);

  // ============================================
  // CONSTANTS
  // ============================================
  
  // List of all roommates
  const roommates = ['Elle', 'Ember', 'Eva', 'Illari'];
  
  // Color scheme for each roommate - used for visual identification
  // These are Tailwind CSS classes that set background and text colors
  const colors = { 
    Ember: 'bg-orange-200 text-orange-800', 
    Eva: 'bg-green-200 text-green-800', 
    Elle: 'bg-blue-200 text-blue-800', 
    Illari: 'bg-purple-200 text-purple-800' 
  };

  // ============================================
  // DATA LOADING AND REAL-TIME SYNC
  // ============================================
  
  // useEffect runs code when the component first loads
  // This loads our data from Supabase and sets up real-time updates
  useEffect(() => {
    // Load initial data
    loadData();
    
    // Subscribe to real-time changes in the database
    // This means if someone else updates data, we'll see it instantly
    const channel = supabase
      .channel('household_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'household_data' },
        () => loadData()  // Reload data when any change happens
      )
      .subscribe();

    // Cleanup function - runs when component unmounts
    // This prevents memory leaks by unsubscribing from the channel
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);  // Empty array means this only runs once when component loads

  /**
   * Loads all household data from Supabase database
   * This function fetches the stored JSON blob that contains all our app data
   */
  const loadData = async () => {
    try {
      // Query Supabase for our data
      const { data, error } = await supabase
        .from('household_data')          // Table name
        .select('*')                      // Get all columns
        .eq('key', 'app_data')           // Where key equals 'app_data'
        .single();                        // We expect only one row

      // If there's an error (except "not found"), log it
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading data:', error);
        setLoaded(true);
        return;
      }

      // If we found data, parse it and update our state
      if (data && data.value) {
        // Parse JSON if it's a string, otherwise use as-is
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        
        // Update each piece of state with the loaded data
        // The || provides fallback to default values if data is missing
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
    // Mark that we've finished loading
    setLoaded(true);
  };

  /**
   * Saves all household data to Supabase database
   * @param {Object} updates - Optional updates to merge with current data
   * 
   * WHY WE DO THIS: We store everything in one big JSON object for simplicity.
   * For a bigger app, you'd want separate tables, but for a household app this works fine.
   */
  const saveData = async (updates = {}) => {
    // Combine current state with any updates
    const data = { 
      bills, 
      items, 
      monthlyChores, 
      oneOffTasks, 
      events, 
      activity, 
      currentMonth, 
      choreHistory, 
      ...updates  // Spread operator merges updates into the data object
    };
    
    try {
      // Upsert = "update or insert" - creates if doesn't exist, updates if it does
      const { error } = await supabase
        .from('household_data')
        .upsert({ 
          key: 'app_data',                   // This is our unique identifier
          value: JSON.stringify(data)         // Convert object to JSON string
        }, {
          onConflict: 'key'                   // If key exists, update it
        });

      if (error) {
        console.error('Error saving data:', error);
      }
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  };

  /**
   * Adds a new activity to the activity feed
   * @param {string} msg - The message to display in the feed
   * 
   * Activities are things like "Elle paid rent" or "Ember bought hand soap"
   */
  const addActivity = (msg) => {
    // Create new activity object with unique ID and timestamp
    const newActivity = [
      { 
        id: Date.now(),                    // Unique ID using current timestamp
        msg,                                // The message
        time: new Date().toISOString()     // ISO format timestamp
      }, 
      ...activity                           // Spread operator adds new item to beginning
    ];
    setActivity(newActivity);
    saveData({ activity: newActivity });
  };

  // ============================================
  // RENDER THE APP
  // ============================================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 pb-20 flex justify-center">
      <div className="w-full max-w-6xl px-16 py-8">
        {/* HEADER */}
        <div className="bg-white rounded-lg shadow-lg px-16 py-12 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Home className="text-purple-600" />
                Queerio House Hub
              </h1>
              <p className="text-gray-600">Elle, Ember, Eva & Illari's Home</p>
            </div>
            {/* User info and logout button */}
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

        {/* MAIN CONTENT - Shows different components based on active tab */}
        {activeTab === 'dashboard' && <PersonalDashboard bills={bills} items={items} events={events} oneOffTasks={oneOffTasks} />}
        {activeTab === 'profile' && <UserProfile />}
        {activeTab === 'bills' && <Bills bills={bills} setBills={setBills} saveData={saveData} addActivity={addActivity} />}
        {activeTab === 'items' && <Items items={items} setItems={setItems} saveData={saveData} addActivity={addActivity} colors={colors} selectedItem={selectedItem} setSelectedItem={setSelectedItem} />}
        {activeTab === 'tasks' && <Tasks monthlyChores={monthlyChores} setMonthlyChores={setMonthlyChores} oneOffTasks={oneOffTasks} setOneOffTasks={setOneOffTasks} saveData={saveData} addActivity={addActivity} colors={colors} roommates={roommates} showForm={showForm} setShowForm={setShowForm} selectedItem={selectedItem} setSelectedItem={setSelectedItem} currentMonth={currentMonth} choreHistory={choreHistory} setChoreHistory={setChoreHistory} />}
        {activeTab === 'events' && <Events events={events} setEvents={setEvents} saveData={saveData} addActivity={addActivity} showForm={showForm} setShowForm={setShowForm} />}
        {activeTab === 'admin' && <AdminUsers />}

        {/* BOTTOM NAVIGATION */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg flex justify-center">
          <div className="flex justify-center items-center gap-12 px-8 py-4">
            {/* Create array of tab objects and map through them */}
            {[
              { id: 'dashboard', icon: User, label: 'Dashboard' },
              { id: 'bills', icon: DollarSign, label: 'Bills' },
              { id: 'items', icon: ShoppingCart, label: 'Items' },
              { id: 'tasks', icon: CheckCircle, label: 'Tasks' },
              { id: 'events', icon: Home, label: 'Events' },
              { id: 'profile', icon: Settings, label: 'Profile' },
              // Conditionally add Admin tab only if user is admin
              ...(isAdmin ? [{ id: 'admin', icon: Users, label: 'Admin' }] : [])
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`flex flex-col items-center px-6 py-3 rounded-lg ${
                  activeTab === tab.id ? 'text-purple-600 bg-purple-50' : 'text-gray-600'
                }`}
              >
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

// ============================================
// BILLS COMPONENT
// ============================================
// Manages household bills with splits between roommates

const Bills = ({ bills, setBills, saveData, addActivity }) => {
  const { supabase, isAdmin } = useAuth();
  
  // Form state
  const [show, setShow] = useState(false);          // Show/hide add bill form
  const [cat, setCat] = useState('');                // Bill category (Rent, Internet, etc.)
  const [amt, setAmt] = useState('');                // Total amount
  const [due, setDue] = useState('');                // Due date
  const [splitMode, setSplitMode] = useState('percent'); // How to split: 'percent' or 'amount'
  const [recurring, setRecurring] = useState(false); // Is this a recurring bill?
  const [recurrenceType, setRecurrenceType] = useState('monthly'); // How often it recurs
  const [users, setUsers] = useState([]);            // List of all users
  const [splits, setSplits] = useState({});          // How bill is split between users

  // Load users from database when component mounts
  useEffect(() => {
    loadUsers();
  }, []);

  /**
   * Loads all users from the profiles table
   * Also initializes equal splits for each user
   */
  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email')
      .order('name');
    
    if (!error && data) {
      setUsers(data);
      // Calculate equal split percentage for each user
      const equalSplit = (100 / data.length).toFixed(2);
      const initialSplits = {};
      data.forEach(user => {
        initialSplits[user.id] = equalSplit;
      });
      setSplits(initialSplits);
    }
  };

  /**
   * Updates a specific user's split percentage or amount
   */
  const updateSplit = (userId, value) => {
    setSplits(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  /**
   * Calculates total of all split percentages
   * Should equal 100% for a valid bill
   */
  const getTotalSplit = () => {
    return Object.values(splits).reduce((sum, val) => sum + parseFloat(val || 0), 0);
  };

  /**
   * Adds a new bill to the system
   * Validates that splits add up to 100%
   */
  const add = async () => {
    // Validation
    if (!cat || !due) return;
    if (!amt) {
      alert('Please enter an amount for split bills');
      return;
    }
    
    const totalSplit = getTotalSplit();
    if (Math.abs(totalSplit - 100) > 0.01) {  // Allow for tiny rounding errors
      alert(`Splits must total 100%. Currently: ${totalSplit.toFixed(2)}%`);
      return;
    }

    const billId = Date.now();
    
    // Initialize payment tracking for each user
    // This lets us track who has paid their share individually
    const payments = {};
    Object.keys(splits).forEach(userId => {
      payments[userId] = {
        paid: false,          // Has this user paid?
        paidDate: null        // When did they pay?
      };
    });
    
    const newBill = { 
      id: billId, 
      category: cat, 
      amount: parseFloat(amt), 
      dueDate: due, 
      paid: false,                 // Bill is fully paid when ALL users have paid
      recurring: recurring,
      recurrenceType: recurring ? recurrenceType : null,
      splits: splits,              // Percentage each user owes
      payments: payments           // Track individual payments
    };
    
    const updated = [...bills, newBill];
    setBills(updated);
    saveData({ bills: updated });
    
    const recurringText = recurring ? ` (recurring ${recurrenceType})` : '';
    addActivity(`New ${cat} bill added: $${amt}${recurringText}`);
    
    // Reset form
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

  /**
   * Marks a specific user's share of a bill as paid
   * @param {number} billId - The bill to update
   * @param {string} userId - Which user paid
   */
  const markUserPaid = (billId, userId) => {
    if (!isAdmin) return;  // Only admins can mark payments
    
    const bill = bills.find(b => b.id === billId);
    const userName = getUserName(userId);
    
    const updated = bills.map(b => {
      if (b.id === billId) {
        // Update this user's payment status
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

  /**
   * Calculates the next due date for a recurring bill
   * @param {string} currentDueDate - Current due date
   * @param {string} recurrenceType - How often it recurs (weekly, monthly, etc.)
   * @returns {string} Next due date in YYYY-MM-DD format
   */
  const calculateNextDueDate = (currentDueDate, recurrenceType) => {
    const nextDate = new Date(currentDueDate);
    
    // Add appropriate amount of time based on recurrence type
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

  /**
   * Gets human-readable label for recurrence type
   */
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

  /**
   * Marks entire bill as paid (legacy function, not used much now)
   * If bill is recurring, creates a new unpaid bill for next period
   */
  const markPaid = (id) => {
    if (!isAdmin) return;
    
    const bill = bills.find(b => b.id === id);
    const updated = bills.map(b => 
      b.id === id ? { ...b, paid: true, paidDate: new Date().toISOString() } : b
    );
    
    // If recurring, create next bill
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

  /**
   * Deletes a bill (admin only)
   */
  const del = (id) => {
    if (!isAdmin) return;
    const updated = bills.filter(b => b.id !== id);
    setBills(updated);
    saveData({ bills: updated });
  };

  /**
   * Gets user's display name from their ID
   */
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  // Split bills into unpaid and paid
  const unpaidBills = bills.filter(b => !b.paid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const paidBills = bills.filter(b => b.paid).sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));

  // ============================================
  // RENDER BILLS COMPONENT
  // ============================================

  return (
    <div className="bg-white rounded-lg shadow-lg px-20 py-12">
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Bills & Expenses</h2>
        {isAdmin && (
          <button onClick={() => setShow(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            + Add Bill
          </button>
        )}
      </div>

      {/* ADD BILL FORM (only visible when show is true) */}
      {show && isAdmin && (
        <div className="mb-6 p-6 bg-purple-50 rounded-lg">
          {/* Category dropdown */}
          <select 
            value={cat} 
            onChange={(e) => setCat(e.target.value)} 
            className="w-full p-3 border rounded mb-3"
          >
            <option value="">Select category...</option>
            {['Rent', 'Internet', 'PG&E', 'Waste Management', 'Water', 'Other'].map(c => 
              <option key={c} value={c}>{c}</option>
            )}
          </select>
          
          {/* Amount input */}
          <input 
            type="number" 
            value={amt} 
            onChange={(e) => setAmt(e.target.value)} 
            placeholder="Total amount" 
            className="w-full p-3 border rounded mb-3" 
            required
          />
          
          {/* Due date */}
          <input 
            type="date" 
            value={due} 
            onChange={(e) => setDue(e.target.value)} 
            className="w-full p-3 border rounded mb-3" 
          />
          
          {/* Recurring checkbox */}
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={recurring} 
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Recurring bill</span>
          </label>

          {/* Recurrence type (only show if recurring is checked) */}
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

          {/* SPLIT SECTION - Choose between percentage or dollar amount */}
          <div className="mt-4 p-4 bg-white rounded-lg border-2 border-purple-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Split Between Roommates:</h3>
              {/* Toggle buttons for split mode */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMode('percent')}
                  className={`px-3 py-1 text-sm rounded ${
                    splitMode === 'percent' ? 'bg-purple-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  By %
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('amount')}
                  className={`px-3 py-1 text-sm rounded ${
                    splitMode === 'amount' ? 'bg-purple-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  By $
                </button>
              </div>
            </div>

            {splitMode === 'percent' ? (
              // SPLIT BY PERCENTAGE
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
                      {/* Show dollar amount in parentheses */}
                      {amt && (
                        <span className="text-sm text-gray-600 ml-2">
                          (${((parseFloat(amt) * parseFloat(splits[user.id] || 0)) / 100).toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {/* Total validation */}
                <div className="mt-3 pt-3 border-t flex justify-between font-bold">
                  <span>Total:</span>
                  <span className={getTotalSplit() === 100 ? 'text-green-600' : 'text-red-600'}>
                    {getTotalSplit().toFixed(2)}% {getTotalSplit() !== 100 && '(Must be 100%)'}
                  </span>
                </div>
              </>
            ) : (
              // SPLIT BY DOLLAR AMOUNT
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
                            // When user enters dollar amount, calculate percentage
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
                        {/* Show percentage in parentheses */}
                        {amt && (
                          <span className="text-sm text-gray-600 ml-2">
                            ({splits[user.id]}%)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Total validation */}
                <div className="mt-3 pt-3 border-t flex justify-between font-bold">
                  <span>Total:</span>
                  <span className={
                    amt && Math.abs((parseFloat(amt) * getTotalSplit() / 100) - parseFloat(amt)) < 0.01 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }>
                    ${amt ? ((parseFloat(amt) * getTotalSplit()) / 100).toFixed(2) : '0.00'} 
                    {amt && Math.abs((parseFloat(amt) * getTotalSplit() / 100) - parseFloat(amt)) >= 0.01 && 
                      ` (Must be $${amt})`
                    }
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Form buttons */}
          <div className="flex gap-2 mt-4">
            <button 
              onClick={add} 
              className="flex-1 bg-purple-600 text-white p-3 rounded hover:bg-purple-700"
            >
              Add Bill
            </button>
            <button 
              onClick={() => { 
                setShow(false); 
                setCat(''); 
                setAmt(''); 
                setDue(''); 
                setRecurring(false); 
                setRecurrenceType('monthly');
              }} 
              className="bg-gray-300 p-3 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* UNPAID BILLS LIST */}
      {unpaidBills.length > 0 && (
        <>
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Unpaid Bills</h3>
          <div className="space-y-3 mb-6">
            {unpaidBills.map(b => {
              // Initialize payments if they don't exist (for old bills created before this feature)
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
                      <p className="text-sm text-gray-600 mt-1">
                        Due: {new Date(b.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-600 mb-2">${b.amount}</p>
                      {isAdmin && (
                        <button 
                          onClick={() => del(b.id)} 
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Individual Payment Status for each user */}
                  {b.splits && b.payments && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Payment Status:</p>
                      <div className="space-y-2">
                        {Object.entries(b.splits).map(([userId, percentage]) => {
                          const userPayment = b.payments[userId] || { paid: false, paidDate: null };
                          const userAmount = ((b.amount * percentage) / 100).toFixed(2);
                          
                          return (
                            <div 
                              key={userId} 
                              className={`flex justify-between items-center p-3 rounded ${
                                userPayment.paid 
                                  ? 'bg-green-50 border border-green-200' 
                                  : 'bg-white border border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Checkbox indicator */}
                                <div className={`w-5 h-5 rounded flex items-center justify-center ${
                                  userPayment.paid ? 'bg-green-500' : 'bg-gray-300'
                                }`}>
                                  {userPayment.paid && <span className="text-white text-xs">✓</span>}
                                </div>
                                <div>
                                  <span className="font-medium">{getUserName(userId)}</span>
                                  <span className="text-sm text-gray-600 ml-2">
                                    ({percentage}% = ${userAmount})
                                  </span>
                                </div>
                              </div>
                              {/* Mark Paid button (only show if not paid and user is admin) */}
                              {isAdmin && !userPayment.paid && (
                                <button
                                  onClick={() => markUserPaid(b.id, userId)}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {/* Show paid date if already paid */}
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

      {/* PAID BILLS LIST */}
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
                    <p className="text-sm text-gray-600">
                      Paid on: {new Date(b.paidDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-600">${b.amount}</p>
                    {isAdmin && (
                      <button 
                        onClick={() => del(b.id)} 
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 mt-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {bills.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No bills yet. {isAdmin && 'Add one to get started!'}
        </p>
      )}
    </div>
  );
};

// ============================================
// ITEMS COMPONENT
// ============================================
// Tracks household items (soap, toilet paper, etc.) and who's turn it is to buy

const Items = ({ items, setItems, saveData, addActivity, colors, selectedItem, setSelectedItem }) => {
  
  /**
   * Marks an item as purchased by a specific person
   * Updates the rotation to show who bought it
   */
  const purchase = (itemId, person) => {
    const item = items.find(i => i.id === itemId);
    const idx = item.rotation.indexOf(person);  // Find person's index in rotation
    const updated = items.map(i => 
      i.id === itemId ? { ...i, currentIndex: idx } : i
    );
    setItems(updated);
    saveData({ items: updated });
    addActivity(`${person} purchased ${item.name}`);
    setSelectedItem(null);  // Close the selection modal
  };

  // If an item is selected, show the "who purchased" screen
  if (selectedItem) {
    return (
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <h2 className="text-2xl font-bold mb-4">Mark Item as Purchased</h2>
        <p className="text-center mb-6">
          Who purchased <span className="font-bold text-purple-600">{selectedItem.name}</span>?
        </p>
        <div className="space-y-2 max-w-xs mx-auto">
          {/* Button for each person in the rotation */}
          {selectedItem.rotation.map(p => (
            <button 
              key={p} 
              onClick={() => purchase(selectedItem.id, p)} 
              className={`w-full px-4 py-2 rounded-lg text-white ${
                colors[p].replace('text-', 'bg-').replace('200', '500')
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setSelectedItem(null)} 
          className="mt-4 w-full bg-gray-400 text-white p-2 rounded"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Main items list view
  return (
    <div className="bg-white rounded-lg shadow-lg px-20 py-12">
      <h2 className="text-2xl font-bold mb-4">Household Items</h2>
      <div className="space-y-3">
        {items.map(item => {
          // Calculate who bought last and who's next
          const curr = item.rotation[item.currentIndex];
          const next = item.rotation[(item.currentIndex + 1) % item.rotation.length];
          return (
            <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                  <p className="text-sm mb-1">
                    Last purchased: <span className={`px-2 py-0.5 rounded ${colors[curr]}`}>{curr}</span>
                  </p>
                  <p className="text-sm">
                    Next up: <span className={`px-2 py-0.5 rounded ${colors[next]}`}>{next}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedItem(item)} 
                  className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 whitespace-nowrap"
                >
                  Mark Purchased
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// TASKS COMPONENT
// ============================================
// Manages monthly chores and one-time tasks

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
  // Form state for one-time tasks
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  /**
   * Assigns a specific chore to a specific person
   */
  const assignChore = (choreId, person) => {
    const updated = monthlyChores.map(c => 
      c.id === choreId ? { ...c, rotation: [person] } : c
    );
    setMonthlyChores(updated);
    saveData({ monthlyChores: updated });
    addActivity(`${person} assigned to ${monthlyChores.find(c => c.id === choreId).name}`);
  };

  /**
   * "Spin the wheel" - randomly assigns an available chore to a person
   * Has special rules (Eva can't do certain chores, only Eva can do floors)
   */
  const spinWheelForPerson = (person) => {
    // Special function to check if Eva can do a particular chore
    const canEvaDoIt = (choreId) => 
      ['frontyard', 'livingroom', 'sweep', 'steammop', 'dealers'].includes(choreId);
    
    // Filter available chores based on person and special rules
    let availableChores = monthlyChores.filter(c => {
      // Skip if already assigned
      if (c.rotation.length > 0 && c.rotation[0]) return false;
      // Eva can only do certain chores
      if (person === 'Eva' && !canEvaDoIt(c.id)) return false;
      // Only Eva can do floor chores
      if (person !== 'Eva' && (c.id === 'sweep' || c.id === 'steammop')) return false;
      return true;
    });

    if (availableChores.length === 0) return;

    // Pick a random chore from available ones
    const randomChore = availableChores[Math.floor(Math.random() * availableChores.length)];
    assignChore(randomChore.id, person);
    addActivity(`${person} got ${randomChore.name} via spin!`);
  };

  /**
   * Gets all chores currently assigned to a person
   */
  const getPersonChores = (person) => {
    return monthlyChores.filter(c => c.rotation.length > 0 && c.rotation[0] === person);
  };

  /**
   * Gets chores that are still available for a person to take
   */
  const getAvailableChoresFor = (person) => {
    return monthlyChores.filter(c => {
      const isAssigned = c.rotation.length > 0 && c.rotation[0];
      if (isAssigned) return false;
      // Only Eva can do floor chores
      if (person !== 'Eva' && (c.id === 'sweep' || c.id === 'steammop')) return false;
      return true;
    });
  };

  /**
   * Marks a monthly chore as complete
   * Saves it to history and clears it from current assignments
   */
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
    
    // Clear from current rotation (reset to empty)
    const updated = monthlyChores.map(c => 
      c.id === choreId ? { ...c, rotation: [] } : c
    );
    setMonthlyChores(updated);
    setChoreHistory(newHistory);
    saveData({ monthlyChores: updated, choreHistory: newHistory });
    addActivity(`${person} completed ${chore.name}`);
    setSelectedItem(null);
  };

  /**
   * Adds a new one-time task
   */
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

  /**
   * Toggles a task's completion status
   */
  const toggle = (id) => {
    const updated = oneOffTasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setOneOffTasks(updated);
    saveData({ oneOffTasks: updated });
  };

  /**
   * Deletes a task
   */
  const del = (id) => {
    const updated = oneOffTasks.filter(t => t.id !== id);
    setOneOffTasks(updated);
    saveData({ oneOffTasks: updated });
  };

  // If confirming a chore completion, show confirmation screen
  if (selectedItem) {
    return (
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <h2 className="text-2xl font-bold mb-4">Mark Chore Complete</h2>
        <p className="text-center mb-6">
          Complete <span className="font-bold text-purple-600">{selectedItem.name}</span>?
        </p>
        <div className="flex gap-2 justify-center">
          <button 
            onClick={() => completeMonthly(selectedItem.id)} 
            className="px-6 py-2 bg-green-500 text-white rounded-lg"
          >
            Yes, Complete
          </button>
          <button 
            onClick={() => setSelectedItem(null)} 
            className="px-6 py-2 bg-gray-400 text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // If showing history, render history view
  if (showHistory) {
    // Group history entries by month
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
          <p className="text-center text-gray-500 py-8">
            No history yet. Clear chores to save them to history.
          </p>
        ) : (
          <div className="space-y-6">
            {months.map(month => (
              <div key={month} className="border rounded-lg p-6 bg-gray-50">
                <h3 className="text-xl font-bold mb-4">{month}</h3>
                <div className="space-y-2">
                  {historyByMonth[month].map((chore, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded flex justify-between items-center ${
                        colors[chore.assignedTo] || 'bg-white'
                      }`}
                    >
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

  // Main tasks view
  return (
    <div className="space-y-6">
      {/* MONTHLY CHORES SECTION */}
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">Monthly Chores</h2>
            <p className="text-sm text-gray-600">{currentMonth}</p>
          </div>
          <div className="flex gap-2">
            {/* BUG FIX: Moved "View History" text inside button */}
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Clear All
            </button>
          </div>
        </div>
        
        {/* Show chores grouped by person */}
        <div className="space-y-4">
          {roommates.map(person => {
            const personChores = getPersonChores(person);
            const availableChores = getAvailableChoresFor(person);
            return (
              <div key={person} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className={`text-xl font-bold px-3 py-1 rounded ${colors[person]}`}>
                    {person}
                  </h3>
                  <div className="flex gap-2">
                    {/* Only show assignment options if person has < 2 chores and there are available chores */}
                    {personChores.length < 2 && availableChores.length > 0 && (
                      <>
                        {/* Manual chore picker */}
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
                        {/* Random spin button */}
                        <button 
                          onClick={() => spinWheelForPerson(person)} 
                          className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
                        >
                          Spin
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* List person's assigned chores */}
                <div className="space-y-2">
                  {personChores.length === 0 ? (
                    <p className="text-gray-500 text-sm">No chores assigned (need 2)</p>
                  ) : (
                    personChores.map(chore => (
                      <div key={chore.id} className="flex justify-between items-center bg-white p-3 rounded">
                        <span className="font-medium">{chore.name}</span>
                        <button 
                          onClick={() => setSelectedItem(chore)} 
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
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

      {/* ONE-TIME TASKS SECTION */}
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <div className="flex justify-between mb-4">
          <h2 className="text-2xl font-bold">One-Time Tasks</h2>
          <button 
            onClick={() => setShowForm('task')} 
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            + Add Task
          </button>
        </div>

        {/* Add task form */}
        {showForm === 'task' && (
          <div className="mb-4 p-4 bg-purple-50 rounded-lg">
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Task" 
              className="w-full p-2 border rounded mb-2" 
            />
            <select 
              value={assignee} 
              onChange={(e) => setAssignee(e.target.value)} 
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">Assign to...</option>
              {roommates.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input 
              type="date" 
              value={due} 
              onChange={(e) => setDue(e.target.value)} 
              className="w-full p-2 border rounded mb-2" 
            />
            <div className="flex gap-2">
              <button 
                onClick={addTask} 
                className="flex-1 bg-purple-600 text-white p-2 rounded"
              >
                Add
              </button>
              <button 
                onClick={() => setShowForm(null)} 
                className="bg-gray-300 p-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tasks list */}
        <div className="space-y-2">
          {oneOffTasks.map(t => (
            <div 
              key={t.id} 
              className={`p-4 rounded-lg border-2 ${
                t.completed ? 'bg-green-50 border-green-300' : 'bg-gray-50'
              }`}
            >
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  {/* Checkbox */}
                  <button 
                    onClick={() => toggle(t.id)} 
                    className="text-2xl"
                  >
                    {t.completed ? '✓' : '○'}
                  </button>
                  <div>
                    <h3 className={`font-semibold ${t.completed ? 'line-through' : ''}`}>
                      {t.title}
                    </h3>
                    <p className="text-sm">{t.assignedTo}</p>
                  </div>
                </div>
                <button 
                  onClick={() => del(t.id)} 
                  className="text-red-500"
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
// EVENTS COMPONENT
// ============================================
// Manages household events and calendar

const Events = ({ events, setEvents, saveData, addActivity, showForm, setShowForm }) => {
  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [desc, setDesc] = useState('');
  const [link, setLink] = useState('');

  /**
   * Adds a new event
   */
  const add = () => {
    if (!title || !date) return;
    const newEvent = { 
      id: Date.now(), 
      title, 
      date, 
      time, 
      description: desc, 
      link 
    };
    const updated = [...events, newEvent];
    setEvents(updated);
    saveData({ events: updated });
    addActivity(`New event: ${title}`);
    setTitle(''); 
    setDate(''); 
    setTime(''); 
    setDesc(''); 
    setLink(''); 
    setShowForm(null);
  };

  /**
   * Deletes an event
   */
  const del = (id) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    saveData({ events: updated });
  };

  // Filter to only show upcoming events
  const upcoming = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="bg-white rounded-lg shadow-lg px-20 py-12">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Events</h2>
        <button 
          onClick={() => setShowForm('event')} 
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          + Add Event
        </button>
      </div>

      {/* Add event form */}
      {showForm === 'event' && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg">
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Event title" 
            className="w-full p-2 border rounded mb-2" 
          />
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="w-full p-2 border rounded mb-2" 
          />
          <input 
            type="time" 
            value={time} 
            onChange={(e) => setTime(e.target.value)} 
            className="w-full p-2 border rounded mb-2" 
          />
          <textarea 
            value={desc} 
            onChange={(e) => setDesc(e.target.value)} 
            placeholder="Description" 
            className="w-full p-2 border rounded mb-2" 
            rows="2" 
          />
          <input 
            type="url" 
            value={link} 
            onChange={(e) => setLink(e.target.value)} 
            placeholder="Link (optional)" 
            className="w-full p-2 border rounded mb-2" 
          />
          <div className="flex gap-2">
            <button 
              onClick={add} 
              className="flex-1 bg-purple-600 text-white p-2 rounded"
            >
              Add
            </button>
            <button 
              onClick={() => setShowForm(null)} 
              className="bg-gray-300 p-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="space-y-3">
        {upcoming.map(e => (
          <div key={e.id} className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold">{e.title}</h3>
                <p className="text-sm">
                  {new Date(e.date).toLocaleDateString()}
                  {e.time && ` at ${e.time}`}
                </p>
                {e.description && <p className="text-sm mt-1">{e.description}</p>}
                {e.link && (
                  <a 
                    href={e.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-blue-600 underline"
                  >
                    Link
                  </a>
                )}
              </div>
              <button 
                onClick={() => del(e.id)} 
                className="text-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// ACTIVITY FEED COMPONENT
// ============================================
// Shows recent actions in the household

const Activity = ({ activity }) => {
  const { profile, isAdmin } = useAuth();
  
  /**
   * Filters activity based on whether user is admin
   * Regular users only see activity relevant to them
   */
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
  
  const filteredActivity = getFilteredActivity().slice(0, 20);  // Show last 20 items

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
              <p className="text-sm text-gray-500">
                {new Date(a.time).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================
// Ensures users must be logged in to access the app

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-2xl font-bold text-purple-600">Loading...</div>
      </div>
    );
  }
  
  // If not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" />;
  }

  // If logged in, show the protected content
  return children;
};

// ============================================
// APP WRAPPER COMPONENT
// ============================================
// Sets up routing and authentication for the entire app

const AppWrapper = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* Protected route - requires authentication */}
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

// Export the app wrapper as the default export
export default AppWrapper;
