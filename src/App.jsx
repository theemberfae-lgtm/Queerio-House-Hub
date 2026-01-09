import React, { useState, useEffect } from 'react';
import { Home, DollarSign, ShoppingCart, Bell, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yrgasnkcwawhijkvqfqs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ2Fzbmtjd2F3aGlqa3ZxZnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4OTIxNzQsImV4cCI6MjA4MjQ2ODE3NH0.cTmDo1w-u63jn9-PopQaC_WXAfgViDH81Anmay_q50o'
);

const App = () => {
  const [activeTab, setActiveTab] = useState('tasks');
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
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Home className="text-purple-600" />
            Queerio House Hub
          </h1>
          <p className="text-gray-600">Elle, Ember, Eva & Illari's Home</p>
        </div>

        {activeTab === 'bills' && <Bills bills={bills} setBills={setBills} saveData={saveData} addActivity={addActivity} />}
        {activeTab === 'items' && <Items items={items} setItems={setItems} saveData={saveData} addActivity={addActivity} colors={colors} selectedItem={selectedItem} setSelectedItem={setSelectedItem} />}
        {activeTab === 'tasks' && <Tasks monthlyChores={monthlyChores} setMonthlyChores={setMonthlyChores} oneOffTasks={oneOffTasks} setOneOffTasks={setOneOffTasks} saveData={saveData} addActivity={addActivity} colors={colors} roommates={roommates} showForm={showForm} setShowForm={setShowForm} selectedItem={selectedItem} setSelectedItem={setSelectedItem} currentMonth={currentMonth} choreHistory={choreHistory} setChoreHistory={setChoreHistory} />}
        {activeTab === 'events' && <Events events={events} setEvents={setEvents} saveData={saveData} addActivity={addActivity} showForm={showForm} setShowForm={setShowForm} />}
        {activeTab === 'activity' && <Activity activity={activity} />}

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg flex justify-center">
          <div className="flex justify-center items-center gap-12 px-8 py-4">
            {[
              { id: 'bills', icon: DollarSign, label: 'Bills' },
              { id: 'items', icon: ShoppingCart, label: 'Items' },
              { id: 'tasks', icon: CheckCircle, label: 'Tasks' },
              { id: 'events', icon: Home, label: 'Events' },
              { id: 'activity', icon: Bell, label: 'Activity' }
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
  const [show, setShow] = useState(false);
  const [cat, setCat] = useState('');
  const [amt, setAmt] = useState('');
  const [due, setDue] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('monthly');

  const add = () => {
    if (!cat || !due) return;
    const newBill = { 
      id: Date.now(), 
      category: cat, 
      amount: amt ? parseFloat(amt) : null, 
      dueDate: due, 
      paid: false,
      recurring: recurring,
      recurrenceType: recurring ? recurrenceType : null
    };
    const updated = [...bills, newBill];
    setBills(updated);
    saveData({ bills: updated });
    const amountText = amt ? `: $${amt}` : ' (amount TBD)';
    const recurringText = recurring ? ` (recurring ${recurrenceType})` : '';
    addActivity(`New ${cat} bill added${amountText}${recurringText}`);
    setCat(''); 
    setAmt(''); 
    setDue(''); 
    setRecurring(false); 
    setRecurrenceType('monthly');
    setShow(false);
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
    const bill = bills.find(b => b.id === id);
    const updated = bills.map(b => b.id === id ? { ...b, paid: true, paidDate: new Date().toISOString() } : b);
    
    // If recurring, create a new unpaid bill based on recurrence type
    if (bill.recurring && bill.recurrenceType) {
      const nextDueDate = calculateNextDueDate(bill.dueDate, bill.recurrenceType);
      const newBill = {
        id: Date.now(),
        category: bill.category,
        amount: bill.amount,
        dueDate: nextDueDate,
        paid: false,
        recurring: true,
        recurrenceType: bill.recurrenceType
      };
      updated.push(newBill);
    }
    
    setBills(updated);
    saveData({ bills: updated });
  };

  const del = (id) => {
    const updated = bills.filter(b => b.id !== id);
    setBills(updated);
    saveData({ bills: updated });
  };

  const unpaidBills = bills.filter(b => !b.paid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const paidBills = bills.filter(b => b.paid).sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));

  return (
    <div className="bg-white rounded-lg shadow-lg px-20 py-12">
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Bills & Expenses</h2>
        <button onClick={() => setShow(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">+ Add Bill</button>
      </div>

      {show && (
        <div className="mb-6 p-6 bg-purple-50 rounded-lg">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full p-3 border rounded mb-3">
            <option value="">Select category...</option>
            {['Rent', 'Internet', 'PG&E', 'Waste Management', 'Water', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input 
            type="number" 
            value={amt} 
            onChange={(e) => setAmt(e.target.value)} 
            placeholder="Amount (optional)" 
            className="w-full p-3 border rounded mb-3" 
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

          <div className="flex gap-2">
            <button onClick={add} className="flex-1 bg-purple-600 text-white p-3 rounded hover:bg-purple-700">Add</button>
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
            {unpaidBills.map(b => (
              <div key={b.id} className="p-6 rounded-lg border-2 bg-gray-50 border-gray-200">
                <div className="flex justify-between items-start">
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
                    {b.amount !== null && <p className="text-xl font-bold text-purple-600 mb-2">${b.amount}</p>}
                    {b.amount === null && <p className="text-sm text-gray-500 mb-2">Amount TBD</p>}
                    <div className="space-x-2">
                      <button onClick={() => markPaid(b.id)} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">Mark Paid</button>
                      <button onClick={() => del(b.id)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                    {b.amount !== null && <p className="text-xl font-bold text-gray-600">${b.amount}</p>}
                    <button onClick={() => del(b.id)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 mt-2">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {bills.length === 0 && (
        <p className="text-center text-gray-500 py-8">No bills yet. Add one to get started!</p>
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
    const updated = monthlyChores.map(c => c.id === choreId ? { ...c, rotation: [] } : c);
    setMonthlyChores(updated);
    saveData({ monthlyChores: updated });
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">Monthly Chores</h2>
            <p className="text-sm text-gray-600">{currentMonth}</p>
          </div>
          <button onClick={() => { 
            const cleared = monthlyChores.map(c => ({ ...c, rotation: [] }));
            setMonthlyChores(cleared);
            saveData({ monthlyChores: cleared });
            addActivity('Chores cleared for ' + currentMonth);
          }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            Clear All
          </button>
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
};

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
  const recentActivity = activity.slice(0, 20);

  return (
    <div className="bg-white rounded-lg shadow-lg px-20 py-12">
      <h2 className="text-2xl font-bold mb-4">Activity</h2>
      {recentActivity.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {recentActivity.map(a => (
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

export default App;