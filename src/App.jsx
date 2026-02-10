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
  
  // Edit bill state
  const [editingBill, setEditingBill] = useState(null);
  const [editCat, setEditCat] = useState('');
  const [editAmt, setEditAmt] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editSplits, setEditSplits] = useState({});
  const [editSplitMode, setEditSplitMode] = useState('percent');
  const [editRecurring, setEditRecurring] = useState(false);
  const [editRecurrenceType, setEditRecurrenceType] = useState('monthly');

  // Credit management state
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [pendingCredits, setPendingCredits] = useState([]);
  const [creditDecisions, setCreditDecisions] = useState({});

  // User payment tracking state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

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
        paidDate: null,
        paymentHistory: [],
        totalPaid: 0,
        amountPaid: 0
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

  const startEditBill = (bill) => {
    setEditingBill(bill.id);
    setEditCat(bill.category);
    setEditAmt(bill.amount.toString());
    setEditDue(bill.dueDate);
    setEditSplits(bill.splits || {});
    
    // Detect if using percent or dollar splits
    const firstSplit = Object.values(bill.splits || {})[0];
    const isPercent = firstSplit && firstSplit <= 100;
    setEditSplitMode(isPercent ? 'percent' : 'dollar');
    
    setEditRecurring(bill.recurring || false);
    setEditRecurrenceType(bill.recurrenceType || 'monthly');
  };

  const cancelEdit = () => {
    setEditingBill(null);
    setEditCat('');
    setEditAmt('');
    setEditDue('');
    setEditSplits({});
    setEditSplitMode('percent');
    setEditRecurring(false);
    setEditRecurrenceType('monthly');
  };

  const updateBill = () => {
    if (!editCat || !editAmt || !editDue) {
      alert('Please fill all fields');
      return;
    }

    // Filter out users with no split (unchecked users)
    const activeSplits = {};
    Object.keys(editSplits).forEach(userId => {
      const value = parseFloat(editSplits[userId] || 0);
      if (value > 0) {
        activeSplits[userId] = value;
      }
    });

    if (Object.keys(activeSplits).length === 0) {
      alert('At least one person must be assigned to pay this bill');
      return;
    }

    // Validate splits based on mode
    if (editSplitMode === 'percent') {
      const totalSplit = Object.values(activeSplits).reduce((sum, val) => sum + parseFloat(val), 0);
      if (Math.abs(totalSplit - 100) > 0.01) {
        alert(`Splits must total 100%. Currently: ${totalSplit.toFixed(2)}%`);
        return;
      }
    } else {
      // Dollar mode
      const totalSplit = Object.values(activeSplits).reduce((sum, val) => sum + parseFloat(val), 0);
      if (Math.abs(totalSplit - parseFloat(editAmt)) > 0.01) {
        alert(`Splits must total $${editAmt}. Currently: $${totalSplit.toFixed(2)}`);
        return;
      }
    }

    const updated = bills.map(bill => {
      if (bill.id === editingBill) {
        // Calculate new amounts owed
        const newAmountsOwed = {};
        Object.keys(activeSplits).forEach(userId => {
          const splitValue = activeSplits[userId];
          if (editSplitMode === 'percent') {
            newAmountsOwed[userId] = (parseFloat(editAmt) * splitValue) / 100;
          } else {
            newAmountsOwed[userId] = splitValue;
          }
        });

        // Create new payments object preserving existing payments
        const newPayments = {};
        let hasOverpayments = false;
        let overpaymentDetails = [];
        
        Object.keys(activeSplits).forEach(userId => {
          const existingPayment = bill.payments?.[userId];
          const newAmountOwed = newAmountsOwed[userId];
          
          if (existingPayment && existingPayment.paid) {
            // User has already paid - check if amount matches
            const amountPaid = existingPayment.amountPaid || 0;
            
            if (amountPaid > newAmountOwed + 0.01) {
              // Overpayment - user paid more than new amount owed
              hasOverpayments = true;
              const overpayment = amountPaid - newAmountOwed;
              overpaymentDetails.push({
                userName: getUserName(userId),
                overpayment: overpayment
              });
              
              // Keep the payment marked as paid with original amount
              newPayments[userId] = {
                ...existingPayment,
                overpayment: overpayment  // Track the overpayment
              };
            } else {
              // Payment is fine or underpaid (they'll need to pay more)
              newPayments[userId] = existingPayment;
            }
          } else {
            // User hasn't paid yet or wasn't in original bill
            newPayments[userId] = { 
              paid: false, 
              paidDate: null,
              amountPaid: 0
            };
          }
        });

        // Show credit management modal if there are overpayments
        if (hasOverpayments) {
          // Store pending credits and show modal
          const creditsWithUserIds = overpaymentDetails.map((detail, index) => {
            const userId = Object.keys(activeSplits).find(uid => getUserName(uid) === detail.userName);
            return {
              userId: userId,
              userName: detail.userName,
              overpayment: detail.overpayment
            };
          });
          
          setPendingCredits(creditsWithUserIds);
          
          // Initialize credit decisions
          const initialDecisions = {};
          creditsWithUserIds.forEach(credit => {
            initialDecisions[credit.userId] = {
              action: 'credit', // 'credit' or 'refund'
              applyTo: 'account' // 'account' or specific bill category
            };
          });
          setCreditDecisions(initialDecisions);
          
          // Store the pending update to apply after credit decisions
          window.pendingBillUpdate = {
            billId: editingBill,
            updates: {
              category: editCat,
              amount: parseFloat(editAmt),
              dueDate: editDue,
              splits: activeSplits,
              payments: newPayments,
              recurring: editRecurring,
              recurrenceType: editRecurring ? editRecurrenceType : null
            }
          };
          
          setShowCreditModal(true);
          return; // Don't save yet - wait for credit decisions
        }

        return {
          ...bill,
          category: editCat,
          amount: parseFloat(editAmt),
          dueDate: editDue,
          splits: activeSplits,
          payments: newPayments,
          recurring: editRecurring,
          recurrenceType: editRecurring ? editRecurrenceType : null
        };
      }
      return bill;
    });

    setBills(updated);
    saveData({ bills: updated });
    addActivity(`${editCat} bill updated`);
    cancelEdit();
  };

  const applyCreditDecisions = () => {
    // Apply the bill update with credit decisions
    const pendingUpdate = window.pendingBillUpdate;
    if (!pendingUpdate) return;
    
    const updated = bills.map(bill => {
      if (bill.id === pendingUpdate.billId) {
        const newPayments = { ...pendingUpdate.updates.payments };
        
        // Apply credit decisions to payments
        Object.keys(creditDecisions).forEach(userId => {
          const decision = creditDecisions[userId];
          if (newPayments[userId]) {
            newPayments[userId] = {
              ...newPayments[userId],
              creditAction: decision.action, // 'credit' or 'refund'
              creditAppliedTo: decision.action === 'credit' ? decision.applyTo : null
            };
          }
        });
        
        return {
          ...bill,
          ...pendingUpdate.updates,
          payments: newPayments
        };
      }
      return bill;
    });
    
    setBills(updated);
    saveData({ bills: updated });
    
    // Log activity
    const creditSummary = Object.entries(creditDecisions)
      .map(([userId, decision]) => {
        const userName = getUserName(userId);
        if (decision.action === 'refund') {
          return `${userName}: Refund issued`;
        } else {
          return `${userName}: Credit to ${decision.applyTo}`;
        }
      })
      .join(', ');
    
    addActivity(`${pendingUpdate.updates.category} bill updated with credit adjustments: ${creditSummary}`);
    
    // Clean up
    setShowCreditModal(false);
    setPendingCredits([]);
    setCreditDecisions({});
    window.pendingBillUpdate = null;
    cancelEdit();
  };

  const markUserPaid = (billId, userId) => {
    if (!isAdmin) return;
    
    const bill = bills.find(b => b.id === billId);
    const userName = getUserName(userId);
    
    // Get today's date in local timezone (not UTC)
    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Calculate amount this user is paying
    const userSplit = bill.splits[userId];
    let amountPaid;
    if (userSplit <= 100) {
      // Percentage split
      amountPaid = (bill.amount * userSplit) / 100;
    } else {
      // Dollar split
      amountPaid = userSplit;
    }
    
    const updated = bills.map(b => {
      if (b.id === billId) {
        const newPayments = { ...b.payments };
        newPayments[userId] = {
          paid: true,
          paidDate: localDate,
          amountPaid: amountPaid  // Store actual dollar amount paid
        };
        
        const allPaid = Object.values(newPayments).every(p => p.paid);
        
        return {
          ...b,
          payments: newPayments,
          paid: allPaid,
          paidDate: allPaid ? localDate : b.paidDate
        };
      }
      return b;
    });
    
    setBills(updated);
    saveData({ bills: updated });
    addActivity(`${userName} paid their share of ${bill.category} ($${amountPaid.toFixed(2)})`);
  };

  const unmarkUserPaid = (billId, userId) => {
    if (!isAdmin) return;
    
    const bill = bills.find(b => b.id === billId);
    const userName = getUserName(userId);
    
    const updated = bills.map(b => {
      if (b.id === billId) {
        const newPayments = { ...b.payments };
        newPayments[userId] = {
          paid: false,
          paidDate: null
        };
        
        return {
          ...b,
          payments: newPayments,
          paid: false  // If any payment is unmarked, bill is not fully paid
        };
      }
      return b;
    });
    
    setBills(updated);
    saveData({ bills: updated });
    addActivity(`${userName}'s payment for ${bill.category} was unmarked`);
  };

  // User payment tracking functions
  const openPaymentModal = (billId, userId, bill) => {
    const userSplit = bill.splits[userId];
    let amountOwed;
    if (userSplit <= 100) {
      amountOwed = (bill.amount * userSplit) / 100;
    } else {
      amountOwed = userSplit;
    }

    setPaymentModalData({
      billId,
      userId,
      billName: bill.category,
      amountOwed,
      currentPayments: bill.payments?.[userId]?.paymentHistory || []
    });
    setShowPaymentModal(true);
  };

  const addUserPayment = (amount, date, note) => {
    const { billId, userId } = paymentModalData;
    const { profile } = useAuth();
    
    // Only allow users to add their own payments
    if (profile.id !== userId) {
      alert('You can only add payments for yourself');
      return;
    }

    const updated = bills.map(bill => {
      if (bill.id === billId) {
        const userPayment = bill.payments?.[userId] || { 
          paymentHistory: [],
          totalPaid: 0 
        };
        
        const newPayment = {
          id: Date.now(),
          amount: parseFloat(amount),
          date: date,
          note: note || '',
          addedBy: userId,
          addedAt: new Date().toISOString()
        };

        const newHistory = [...(userPayment.paymentHistory || []), newPayment];
        const newTotalPaid = newHistory.reduce((sum, p) => sum + p.amount, 0);
        
        // Calculate amount owed
        const userSplit = bill.splits[userId];
        let amountOwed;
        if (userSplit <= 100) {
          amountOwed = (bill.amount * userSplit) / 100;
        } else {
          amountOwed = userSplit;
        }

        const newPayments = { ...bill.payments };
        newPayments[userId] = {
          ...userPayment,
          paymentHistory: newHistory,
          totalPaid: newTotalPaid,
          paid: newTotalPaid >= amountOwed - 0.01,  // Consider paid if within 1 cent
          paidDate: newTotalPaid >= amountOwed - 0.01 ? date : null,
          amountPaid: newTotalPaid
        };

        // Check if all users have paid
        const allPaid = Object.keys(bill.splits).every(uid => 
          newPayments[uid]?.paid === true
        );

        return {
          ...bill,
          payments: newPayments,
          paid: allPaid,
          paidDate: allPaid ? date : bill.paidDate
        };
      }
      return bill;
    });

    setBills(updated);
    saveData({ bills: updated });
    addActivity(`Payment of $${amount} added for ${paymentModalData.billName}`);
    
    // Update modal data to show new payment
    const updatedBill = updated.find(b => b.id === billId);
    setPaymentModalData({
      ...paymentModalData,
      currentPayments: updatedBill.payments[userId].paymentHistory
    });
  };

  const deleteUserPayment = (paymentId) => {
    const { billId, userId } = paymentModalData;
    const { profile } = useAuth();
    
    // Only allow users to delete their own payments (or admin)
    if (profile.id !== userId && !isAdmin) {
      alert('You can only delete your own payments');
      return;
    }

    const updated = bills.map(bill => {
      if (bill.id === billId) {
        const userPayment = bill.payments[userId];
        const newHistory = userPayment.paymentHistory.filter(p => p.id !== paymentId);
        const newTotalPaid = newHistory.reduce((sum, p) => sum + p.amount, 0);
        
        // Calculate amount owed
        const userSplit = bill.splits[userId];
        let amountOwed;
        if (userSplit <= 100) {
          amountOwed = (bill.amount * userSplit) / 100;
        } else {
          amountOwed = userSplit;
        }

        const newPayments = { ...bill.payments };
        newPayments[userId] = {
          ...userPayment,
          paymentHistory: newHistory,
          totalPaid: newTotalPaid,
          paid: newTotalPaid >= amountOwed - 0.01,
          paidDate: newTotalPaid >= amountOwed - 0.01 ? (newHistory.length > 0 ? newHistory[newHistory.length - 1].date : null) : null,
          amountPaid: newTotalPaid
        };

        // Check if all users have paid
        const allPaid = Object.keys(bill.splits).every(uid => 
          newPayments[uid]?.paid === true
        );

        return {
          ...bill,
          payments: newPayments,
          paid: allPaid
        };
      }
      return bill;
    });

    setBills(updated);
    saveData({ bills: updated });
    addActivity(`Payment deleted for ${paymentModalData.billName}`);
    
    // Update modal data
    const updatedBill = updated.find(b => b.id === billId);
    setPaymentModalData({
      ...paymentModalData,
      currentPayments: updatedBill.payments[userId]?.paymentHistory || []
    });
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

  // Helper to format paid date - handles both ISO timestamps and YYYY-MM-DD formats
  const formatPaidDate = (paidDate) => {
    if (!paidDate) return 'Invalid Date';
    
    // If it already has a 'T' in it, it's an ISO timestamp - just use the date part
    if (paidDate.includes('T')) {
      const dateOnly = paidDate.split('T')[0];
      return new Date(dateOnly + 'T00:00:00').toLocaleDateString();
    }
    
    // Otherwise it's YYYY-MM-DD format, add time to make it local
    return new Date(paidDate + 'T00:00:00').toLocaleDateString();
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

      {/* Credit Management Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{padding: '1rem'}}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{padding: '2rem'}}>
            <h2 className="text-2xl font-bold text-purple-600 mb-4">💰 Credit Management</h2>
            
            <p className="text-gray-700 mb-6">
              The following users have overpaid due to your changes. Please decide how to handle each credit:
            </p>
            
            <div className="space-y-6">
              {pendingCredits.map(credit => (
                <div key={credit.userId} className="border-2 border-purple-200 rounded-lg" style={{padding: '1.5rem', overflow: 'hidden'}}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{credit.userName}</h3>
                      <p className="text-2xl font-bold text-green-600">${credit.overpayment.toFixed(2)} credit</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Action Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">What would you like to do?</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 border-2 rounded cursor-pointer hover:bg-purple-50" style={{
                          borderColor: creditDecisions[credit.userId]?.action === 'credit' ? '#9333ea' : '#e5e7eb',
                          backgroundColor: creditDecisions[credit.userId]?.action === 'credit' ? '#faf5ff' : 'white'
                        }}>
                          <input
                            type="radio"
                            name={`action-${credit.userId}`}
                            checked={creditDecisions[credit.userId]?.action === 'credit'}
                            onChange={() => setCreditDecisions({
                              ...creditDecisions,
                              [credit.userId]: { ...creditDecisions[credit.userId], action: 'credit' }
                            })}
                            className="w-4 h-4"
                          />
                          <div>
                            <p className="font-semibold">Apply as Credit</p>
                            <p className="text-sm text-gray-600">Keep on their account for future bills</p>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3 p-3 border-2 rounded cursor-pointer hover:bg-purple-50" style={{
                          borderColor: creditDecisions[credit.userId]?.action === 'refund' ? '#9333ea' : '#e5e7eb',
                          backgroundColor: creditDecisions[credit.userId]?.action === 'refund' ? '#faf5ff' : 'white'
                        }}>
                          <input
                            type="radio"
                            name={`action-${credit.userId}`}
                            checked={creditDecisions[credit.userId]?.action === 'refund'}
                            onChange={() => setCreditDecisions({
                              ...creditDecisions,
                              [credit.userId]: { ...creditDecisions[credit.userId], action: 'refund' }
                            })}
                            className="w-4 h-4"
                          />
                          <div>
                            <p className="font-semibold">Issue Refund</p>
                            <p className="text-sm text-gray-600">Pay them back the overpayment</p>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    {/* Apply To Selection (only if credit) */}
                    {creditDecisions[credit.userId]?.action === 'credit' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Where to apply credit?</label>
                        <select
                          value={creditDecisions[credit.userId]?.applyTo || 'account'}
                          onChange={(e) => setCreditDecisions({
                            ...creditDecisions,
                            [credit.userId]: { ...creditDecisions[credit.userId], applyTo: e.target.value }
                          })}
                          className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                          style={{padding: '14px'}}
                        >
                          <option value="account">General Account Credit</option>
                          <option value="rent">Next Rent Bill</option>
                          <option value="utilities">Next Utilities Bill</option>
                          <option value="internet">Next Internet Bill</option>
                          <option value="groceries">Next Groceries Bill</option>
                          <option value="other">Other (specify in notes)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={applyCreditDecisions}
                className="flex-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                style={{padding: '14px'}}
              >
                Apply Decisions & Save Bill
              </button>
              <button
                onClick={() => {
                  setShowCreditModal(false);
                  setPendingCredits([]);
                  setCreditDecisions({});
                  window.pendingBillUpdate = null;
                }}
                className="bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                style={{padding: '14px 24px'}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Payment Tracking Modal */}
      {showPaymentModal && paymentModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{padding: '1rem'}}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{padding: '2rem'}}>
            <h2 className="text-2xl font-bold text-purple-600 mb-2">💸 Payment Tracker</h2>
            <h3 className="text-lg text-gray-700 mb-4">{paymentModalData.billName}</h3>
            
            {/* Amount Summary */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg mb-6" style={{padding: '1.5rem'}}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Amount You Owe:</p>
                  <p className="text-2xl font-bold text-purple-600">${paymentModalData.amountOwed.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Paid So Far:</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${paymentModalData.currentPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-300">
                <p className="text-sm text-gray-600">Remaining Balance:</p>
                <p className={`text-xl font-bold ${
                  paymentModalData.amountOwed - paymentModalData.currentPayments.reduce((sum, p) => sum + p.amount, 0) <= 0.01 
                    ? 'text-green-600' 
                    : 'text-orange-600'
                }`}>
                  ${Math.max(0, paymentModalData.amountOwed - paymentModalData.currentPayments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Add New Payment Form */}
            {!editingPayment && (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg mb-6" style={{padding: '1.5rem'}}>
                <h4 className="font-semibold text-gray-700 mb-3">Add Payment</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                      <input
                        type="number"
                        id="payment-amount"
                        className="w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        style={{padding: '10px'}}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        id="payment-date"
                        className="w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        style={{padding: '10px'}}
                        defaultValue={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                    <input
                      type="text"
                      id="payment-note"
                      className="w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      style={{padding: '10px'}}
                      placeholder="e.g., Venmo, Cash, Check #123"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const amount = document.getElementById('payment-amount').value;
                      const date = document.getElementById('payment-date').value;
                      const note = document.getElementById('payment-note').value;
                      
                      if (!amount || parseFloat(amount) <= 0) {
                        alert('Please enter a valid amount');
                        return;
                      }
                      
                      addUserPayment(amount, date, note);
                      
                      // Clear form
                      document.getElementById('payment-amount').value = '';
                      document.getElementById('payment-note').value = '';
                    }}
                    className="w-full bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                    style={{padding: '12px'}}
                  >
                    ➕ Add Payment
                  </button>
                </div>
              </div>
            )}

            {/* Edit Payment Form */}
            {editingPayment && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg mb-6" style={{padding: '1.5rem'}}>
                <h4 className="font-semibold text-blue-700 mb-3">Edit Payment</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                      <input
                        type="number"
                        id="edit-payment-amount"
                        defaultValue={editingPayment.amount}
                        className="w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        style={{padding: '10px'}}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        id="edit-payment-date"
                        defaultValue={editingPayment.date}
                        className="w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        style={{padding: '10px'}}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                    <input
                      type="text"
                      id="edit-payment-note"
                      defaultValue={editingPayment.note}
                      className="w-full border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      style={{padding: '10px'}}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const amount = document.getElementById('edit-payment-amount').value;
                        const date = document.getElementById('edit-payment-date').value;
                        const note = document.getElementById('edit-payment-note').value;
                        
                        if (!amount || parseFloat(amount) <= 0) {
                          alert('Please enter a valid amount');
                          return;
                        }
                        
                        // Delete old payment and add updated one
                        deleteUserPayment(editingPayment.id);
                        addUserPayment(amount, date, note);
                        setEditingPayment(null);
                      }}
                      className="flex-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                      style={{padding: '12px'}}
                    >
                      💾 Save Changes
                    </button>
                    <button
                      onClick={() => setEditingPayment(null)}
                      className="bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      style={{padding: '12px 24px'}}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment History */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 mb-3">Payment History</h4>
              {paymentModalData.currentPayments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {paymentModalData.currentPayments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between bg-white border-2 border-gray-200 rounded-lg" style={{padding: '1rem'}}>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">${payment.amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(payment.date + 'T00:00:00').toLocaleDateString()}
                        </p>
                        {payment.note && (
                          <p className="text-xs text-gray-500 italic mt-1">{payment.note}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingPayment(payment)}
                          className="bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                          style={{padding: '6px 12px'}}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this payment?')) {
                              deleteUserPayment(payment.id);
                            }
                          }}
                          className="bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                          style={{padding: '6px 12px'}}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setPaymentModalData(null);
                setEditingPayment(null);
              }}
              className="w-full bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
              style={{padding: '14px'}}
            >
              Close
            </button>
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
                  b.payments[userId] = { 
                    paid: false, 
                    paidDate: null,
                    paymentHistory: [],
                    totalPaid: 0,
                    amountPaid: 0
                  };
                });
              }
              
              return (
                <div key={b.id} className="rounded-lg border-2 bg-gray-50 border-gray-200" style={{padding: '1.5rem', overflow: 'hidden'}}>
                  {editingBill === b.id ? (
                    // EDIT MODE
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-purple-600 mb-4">Edit Bill</h3>
                      
                      {/* Show existing payments warning */}
                      {b.payments && Object.values(b.payments).some(p => p.paid) && (
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg" style={{padding: '1rem'}}>
                          <p className="font-semibold text-yellow-800 mb-2">⚠️ Existing Payments:</p>
                          <div className="space-y-1 text-sm">
                            {Object.entries(b.payments).map(([userId, payment]) => {
                              if (payment.paid) {
                                const userName = getUserName(userId);
                                const amountPaid = payment.amountPaid || 0;
                                return (
                                  <p key={userId} className="text-yellow-700">
                                    • {userName} paid ${amountPaid.toFixed(2)} on {formatPaidDate(payment.paidDate)}
                                  </p>
                                );
                              }
                              return null;
                            })}
                          </div>
                          <p className="text-xs text-yellow-600 mt-2 italic">
                            Changes may create overpayments or underpayments. Review carefully!
                          </p>
                        </div>
                      )}
                      
                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <input
                          type="text"
                          value={editCat}
                          onChange={(e) => setEditCat(e.target.value)}
                          className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                          style={{padding: '14px'}}
                        />
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                        <input
                          type="number"
                          value={editAmt}
                          onChange={(e) => setEditAmt(e.target.value)}
                          className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                          style={{padding: '14px'}}
                          step="0.01"
                          min="0"
                        />
                      </div>

                      {/* Due Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={editDue}
                          onChange={(e) => setEditDue(e.target.value)}
                          className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                          style={{padding: '14px'}}
                        />
                      </div>

                      {/* Recurring */}
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editRecurring}
                            onChange={(e) => setEditRecurring(e.target.checked)}
                          />
                          <span className="text-sm font-medium text-gray-700">Recurring Bill</span>
                        </label>
                        {editRecurring && (
                          <select
                            value={editRecurrenceType}
                            onChange={(e) => setEditRecurrenceType(e.target.value)}
                            className="mt-2 w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                            style={{padding: '14px'}}
                          >
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        )}
                      </div>

                      {/* Split Type Selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Split Type</label>
                        <select
                          value={editSplitMode}
                          onChange={(e) => setEditSplitMode(e.target.value)}
                          className="w-full border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                          style={{padding: '14px'}}
                        >
                          <option value="percent">Percentage Split</option>
                          <option value="dollar">Dollar Amount Split</option>
                        </select>
                      </div>

                      {/* Splits */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {editSplitMode === 'percent' ? 'Split Percentages' : 'Split Amounts'}
                        </label>
                        <div className="space-y-2">
                          {users.map(user => {
                            // Check if user is in editSplits (not just if value > 0)
                            const isIncluded = editSplits.hasOwnProperty(user.id) && editSplits[user.id] !== null && editSplits[user.id] !== undefined;
                            const currentValue = editSplits[user.id] || '0';
                            
                            return (
                              <div key={user.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Add user with reasonable default
                                      const defaultValue = editSplitMode === 'percent' ? '25' : '50';
                                      setEditSplits({ ...editSplits, [user.id]: defaultValue });
                                    } else {
                                      // Remove user completely
                                      const newSplits = { ...editSplits };
                                      delete newSplits[user.id];
                                      setEditSplits(newSplits);
                                    }
                                  }}
                                  className="flex-shrink-0"
                                />
                                <span className="w-32 text-sm">{user.name}</span>
                                <input
                                  type="number"
                                  value={currentValue}
                                  onChange={(e) => setEditSplits({ ...editSplits, [user.id]: e.target.value })}
                                  disabled={!isIncluded}
                                  className="flex-1 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
                                  style={{padding: '8px'}}
                                  placeholder="0"
                                  step="0.01"
                                />
                                <span className="text-sm text-gray-600 w-8">
                                  {editSplitMode === 'percent' ? '%' : '$'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          {editSplitMode === 'percent' ? (
                            <>Total: {Object.values(editSplits).reduce((sum, val) => sum + parseFloat(val || 0), 0).toFixed(2)}%</>
                          ) : (
                            <>Total: ${Object.values(editSplits).reduce((sum, val) => sum + parseFloat(val || 0), 0).toFixed(2)} {editAmt && `(Must be $${editAmt})`}</>
                          )}
                        </p>
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={updateBill}
                          className="flex-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                          style={{padding: '12px'}}
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          style={{padding: '12px 16px'}}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // NORMAL VIEW
                    <><div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-3">
                    <div style={{flex: 1, minWidth: 0}}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base md:text-lg" style={{wordBreak: 'break-word'}}>{b.category}</h3>
                        {b.recurring && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap">
                            {getRecurrenceLabel(b.recurrenceType)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">Due: {new Date(b.dueDate + 'T00:00:00').toLocaleDateString()}</p>
                    </div>
                    <div className="text-right" style={{flexShrink: 0}}>
                      <p className="text-lg md:text-xl font-bold text-purple-600 mb-2">${b.amount}</p>
                      {isAdmin && !b.paid && (
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => startEditBill(b)} 
                            className="bg-blue-500 text-white text-xs md:text-sm rounded hover:bg-blue-600 whitespace-nowrap flex-shrink-0"
                            style={{padding: '8px 16px'}}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => del(b.id)} 
                            className="bg-red-500 text-white text-xs md:text-sm rounded hover:bg-red-600 whitespace-nowrap flex-shrink-0"
                            style={{padding: '8px 16px'}}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                      {isAdmin && b.paid && (
                        <span className="text-sm text-green-600 font-semibold">✓ Fully Paid</span>
                      )}
                    </div>
                  </div>
                  
                  {b.splits && b.payments && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-xs md:text-sm font-semibold text-gray-700 mb-2">Payment Status:</p>
                      <div className="space-y-2">
                        {Object.entries(b.splits).map(([userId, splitValue]) => {
                          const userPayment = b.payments[userId] || { paid: false, paidDate: null, amountPaid: 0 };
                          
                          // Calculate amount owed based on split type
                          let userAmount;
                          if (splitValue <= 100) {
                            // Percentage split
                            userAmount = (b.amount * splitValue) / 100;
                          } else {
                            // Dollar split
                            userAmount = splitValue;
                          }
                          
                          // Check for overpayment
                          const amountPaid = userPayment.amountPaid || 0;
                          const hasOverpayment = userPayment.paid && amountPaid > userAmount + 0.01;
                          const overpaymentAmount = hasOverpayment ? amountPaid - userAmount : 0;
                          
                          return (
                            <div key={userId} className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-2 rounded ${userPayment.paid ? (hasOverpayment ? 'bg-yellow-50 border border-yellow-300' : 'bg-green-50 border border-green-200') : 'bg-white border border-gray-200'}`} style={{padding: '0.75rem'}}>
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${userPayment.paid ? (hasOverpayment ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-300'}`}>
                                  {userPayment.paid && <span className="text-white text-xs">{hasOverpayment ? '!' : '✓'}</span>}
                                </div>
                                <div>
                                  <span className="font-medium text-sm md:text-base" style={{wordBreak: 'break-word'}}>{getUserName(userId)}</span>
                                  <span className="text-xs md:text-sm text-gray-600 ml-2">
                                    {splitValue <= 100 ? `(${splitValue}% = $${userAmount.toFixed(2)})` : `($${splitValue.toFixed(2)})`}
                                  </span>
                                  {/* Show partial payment progress */}
                                  {!userPayment.paid && userPayment.totalPaid > 0 && (
                                    <div className="mt-1">
                                      <span className="text-xs text-blue-600 font-semibold">
                                        Partial: ${userPayment.totalPaid.toFixed(2)} of ${userAmount.toFixed(2)}
                                      </span>
                                      <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                                        <div 
                                          className="h-2 bg-blue-500 rounded-full"
                                          style={{width: `${Math.min(100, (userPayment.totalPaid / userAmount) * 100)}%`}}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                  {hasOverpayment && (
                                    <div className="ml-2">
                                      <span className="text-xs text-yellow-700 font-semibold">
                                        +${overpaymentAmount.toFixed(2)} credit
                                      </span>
                                      {userPayment.creditAction && (
                                        <span className="text-xs text-purple-600 ml-2">
                                          ({userPayment.creditAction === 'refund' ? '💰 Refund issued' : `📝 Applied to ${userPayment.creditAppliedTo}`})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {!userPayment.paid && (
                                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                  {isAdmin && (
                                    <button
                                      onClick={() => markUserPaid(b.id, userId)}
                                      className="bg-green-600 text-white text-xs md:text-sm rounded hover:bg-green-700 whitespace-nowrap"
                                      style={{padding: '8px 16px'}}
                                    >
                                      ✓ Mark Paid
                                    </button>
                                  )}
                                  {profile && profile.id === userId && (
                                    <button
                                      onClick={() => openPaymentModal(b.id, userId, b)}
                                      className="bg-blue-600 text-white text-xs md:text-sm rounded hover:bg-blue-700 whitespace-nowrap"
                                      style={{padding: '8px 16px'}}
                                    >
                                      💸 Track Payment
                                    </button>
                                  )}
                                </div>
                              )}
                              {userPayment.paid && (
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                                  {userPayment.paymentHistory && userPayment.paymentHistory.length > 0 ? (
                                    <div className="flex flex-col">
                                      <span className="text-xs text-green-600 font-semibold">
                                        ✓ Paid in {userPayment.paymentHistory.length} payment{userPayment.paymentHistory.length > 1 ? 's' : ''}
                                      </span>
                                      {profile && profile.id === userId && (
                                        <button
                                          onClick={() => openPaymentModal(b.id, userId, b)}
                                          className="text-xs text-blue-600 hover:underline mt-1"
                                        >
                                          View payments
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-green-600">
                                      Paid {formatPaidDate(userPayment.paidDate)}
                                    </span>
                                  )}
                                  {isAdmin && (
                                    <button
                                      onClick={() => unmarkUserPaid(b.id, userId)}
                                      className="bg-gray-400 text-white text-xs rounded hover:bg-gray-500 whitespace-nowrap"
                                      style={{padding: '8px 16px'}}
                                    >
                                      Undo
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  </>
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
                    <p className="text-xs md:text-sm text-gray-600">Paid on: {formatPaidDate(b.paidDate)}</p>
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
                      </span> on {new Date(item.lastPurchase.date + 'T00:00:00').toLocaleDateString()}
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
    // Append T00:00:00 to treat as local time, not UTC (prevents day-shift bug)
    const date = new Date(dateString + 'T00:00:00');
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
