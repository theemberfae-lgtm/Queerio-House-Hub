import React from 'react';
import { useAuth } from './AuthContext';
import { DollarSign, ShoppingCart, Calendar } from 'lucide-react';

const PersonalDashboard = ({ bills, items, events, oneOffTasks }) => {
  const { profile } = useAuth();

  if (!profile) return null;

// Calculate what this user owes
  const unpaidBills = bills.filter(b => !b.paid);
  let totalOwed = 0;
  let totalPaid = 0;
  const myBills = [];

  unpaidBills.forEach(bill => {
    if (bill.splits && bill.splits[profile.id]) {
      const percentage = parseFloat(bill.splits[profile.id]);
      const amountOwed = (bill.amount * percentage) / 100;
      
      // Check if I've paid my share
      const myPayment = bill.payments?.[profile.id];
      const iPaid = myPayment?.paid || false;
      
      if (!iPaid) {
        totalOwed += amountOwed;
      } else {
        totalPaid += amountOwed;
      }
      
      myBills.push({
        ...bill,
        myShare: amountOwed,
        myPercentage: percentage,
        iPaid: iPaid,
        paidDate: myPayment?.paidDate
      });
    }
  });

  // Check if it's my turn to buy any items
  const myTurnItems = items.filter(item => {
    const nextIndex = (item.currentIndex + 1) % item.rotation.length;
    const nextPerson = item.rotation[nextIndex];
    return nextPerson === profile.name;
  });

  // Get my upcoming tasks
  const myTasks = oneOffTasks.filter(
    t => !t.completed && t.assignedTo === profile.name
  );

  // Get upcoming events
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="bg-white rounded-lg shadow-lg px-20 py-12">
        <h2 className="text-2xl font-bold mb-6">Welcome back, {profile.name}! 👋</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Owed */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="text-purple-600" size={24} />
              <h3 className="font-semibold text-gray-700">You Owe</h3>
            </div>
            <p className="text-3xl font-bold text-purple-600">${totalOwed.toFixed(2)}</p>
            <p className="text-sm text-gray-600 mt-1">{myBills.length} unpaid bills</p>
          </div>

          {/* Items to Buy */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="text-blue-600" size={24} />
              <h3 className="font-semibold text-gray-700">Your Turn</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">{myTurnItems.length}</p>
            <p className="text-sm text-gray-600 mt-1">items to buy</p>
          </div>

          {/* Tasks */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-green-600" size={24} />
              <h3 className="font-semibold text-gray-700">Your Tasks</h3>
            </div>
            <p className="text-3xl font-bold text-green-600">{myTasks.length}</p>
            <p className="text-sm text-gray-600 mt-1">pending tasks</p>
          </div>
        </div>
      </div>

     {/* My Bills Breakdown */}
      {myBills.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg px-20 py-12">
          <h3 className="text-xl font-bold mb-4">Your Bills</h3>
          <div className="space-y-3">
            {myBills.map(bill => (
              <div key={bill.id} className={`p-4 rounded-lg border-l-4 ${bill.iPaid ? 'bg-green-50 border-green-500' : 'bg-purple-50 border-purple-500'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{bill.category}</h4>
                      {bill.iPaid && (
                        <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded">✓ Paid</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Due: {new Date(bill.dueDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Your share: {bill.myPercentage.toFixed(1)}% of ${bill.amount}
                    </p>
                    {bill.iPaid && bill.paidDate && (
                      <p className="text-xs text-green-600 mt-1">
                        Paid on {new Date(bill.paidDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <p className={`text-xl font-bold ${bill.iPaid ? 'text-green-600' : 'text-purple-600'}`}>
                    ${bill.myShare.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items I Need to Buy */}
      {myTurnItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg px-20 py-12">
          <h3 className="text-xl font-bold mb-4">Your Turn to Buy</h3>
          <div className="space-y-2">
            {myTurnItems.map(item => (
              <div key={item.id} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-gray-600">Next up in the rotation</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Tasks */}
      {myTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg px-20 py-12">
          <h3 className="text-xl font-bold mb-4">Your Tasks</h3>
          <div className="space-y-2">
            {myTasks.map(task => (
              <div key={task.id} className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <p className="font-semibold">{task.title}</p>
                {task.dueDate && (
                  <p className="text-sm text-gray-600">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg px-20 py-12">
          <h3 className="text-xl font-bold mb-4">Upcoming Events</h3>
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <div key={event.id} className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold">{event.title}</p>
                <p className="text-sm text-gray-600">
                  {new Date(event.date).toLocaleDateString()}
                  {event.time && ` at ${event.time}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalDashboard;