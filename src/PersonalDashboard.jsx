import React from 'react';
import { useAuth } from './AuthContext';
import { DollarSign, ShoppingCart, Calendar } from 'lucide-react';

const PersonalDashboard = ({ bills, items, events, oneOffTasks }) => {
  const { profile } = useAuth();

  if (!profile) return null;

  // Helper to format paid date
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

  // Calculate what this user owes
  const unpaidBills = bills.filter(b => !b.paid);
  let totalOwed = 0;
  let totalPaid = 0;
  let totalCredits = 0;  // Track overpayments/credits
  const myBills = [];

  unpaidBills.forEach(bill => {
    if (bill.splits && bill.splits[profile.id] && bill.amount) {
      const splitValue = parseFloat(bill.splits[profile.id]);
      const billAmount = parseFloat(bill.amount);
      
      // Skip if invalid values
      if (isNaN(splitValue) || isNaN(billAmount)) return;
      
      // Calculate amount owed based on split type
      let amountOwed;
      if (splitValue <= 100) {
        // Percentage split
        amountOwed = (billAmount * splitValue) / 100;
      } else {
        // Dollar split
        amountOwed = splitValue;
      }
      
      const myPayment = bill.payments?.[profile.id];
      const iPaid = myPayment?.paid || false;
      const amountPaid = parseFloat(myPayment?.totalPaid || myPayment?.amountPaid || 0);
      
      if (!iPaid) {
        // Track partial payments
        if (amountPaid > 0) {
          totalPaid += amountPaid;
          totalOwed += Math.max(0, amountOwed - amountPaid);
        } else {
          totalOwed += amountOwed;
        }
      } else {
        totalPaid += amountPaid;
        // Check for overpayment (credit)
        if (amountPaid > amountOwed + 0.01) {
          totalCredits += (amountPaid - amountOwed);
        }
      }
      
      myBills.push({
        ...bill,
        myShare: amountOwed,
        myPercentage: splitValue <= 100 ? splitValue : null,
        myDollarAmount: splitValue > 100 ? splitValue : null,
        iPaid: iPaid,
        paidDate: myPayment?.paidDate,
        amountPaid: amountPaid,
        hasCredit: amountPaid > amountOwed + 0.01,
        creditAmount: Math.max(0, amountPaid - amountOwed)
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
      <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
        <h2 className="text-2xl font-bold mb-6">Welcome back, {profile.name}! 👋</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Owed */}
          <div 
            className={`rounded-lg border-2 ${totalCredits > 0.01 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' : 'bg-gradient-to-br from-cyan-50 to-pink-50 border-cyan-200'}`}
            style={{padding: '1.5rem', overflow: 'hidden'}}
          >
            <div className="flex items-center gap-2 mb-2" style={{overflow: 'hidden'}}>
              <DollarSign className={totalCredits > 0.01 ? 'text-green-600' : 'text-cyan-600'} size={24} style={{flexShrink: 0}} />
              <h3 className="font-semibold text-gray-700" style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {totalCredits > 0.01 ? 'You Have Credit' : 'You Owe'}
              </h3>
            </div>
            {totalCredits > 0.01 ? (
              <>
                <p className="text-3xl font-bold text-green-600" style={{wordBreak: 'break-word'}}>
                  ${totalCredits.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1">Credit from overpayments</p>
              </>
            ) : totalOwed < 0.01 ? (
              <>
                <p className="text-3xl font-bold text-green-600" style={{wordBreak: 'break-word'}}>
                  $0.00
                </p>
                <p className="text-sm text-gray-600 mt-1">All caught up! 🎉</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-cyan-600" style={{wordBreak: 'break-word'}}>
                  ${totalOwed.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1" style={{whiteSpace: 'nowrap'}}>
                  {myBills.filter(b => !b.iPaid).length} unpaid bills
                </p>
              </>
            )}
          </div>

          {/* Items to Buy */}
          <div 
            className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200"
            style={{padding: '1.5rem', overflow: 'hidden'}}
          >
            <div className="flex items-center gap-2 mb-2" style={{overflow: 'hidden'}}>
              <ShoppingCart className="text-blue-600" size={24} style={{flexShrink: 0}} />
              <h3 className="font-semibold text-gray-700" style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>Your Turn</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600" style={{wordBreak: 'break-word'}}>{myTurnItems.length}</p>
            <p className="text-sm text-gray-600 mt-1" style={{whiteSpace: 'nowrap'}}>items to buy</p>
          </div>

          {/* Tasks */}
          <div 
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200"
            style={{padding: '1.5rem', overflow: 'hidden'}}
          >
            <div className="flex items-center gap-2 mb-2" style={{overflow: 'hidden'}}>
              <Calendar className="text-green-600" size={24} style={{flexShrink: 0}} />
              <h3 className="font-semibold text-gray-700" style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>Your Tasks</h3>
            </div>
            <p className="text-3xl font-bold text-green-600" style={{wordBreak: 'break-word'}}>{myTasks.length}</p>
            <p className="text-sm text-gray-600 mt-1" style={{whiteSpace: 'nowrap'}}>pending tasks</p>
          </div>
        </div>
      </div>

      {/* My Bills Breakdown */}
      {myBills.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
          <h3 className="text-xl font-bold mb-4">Your Bills</h3>
          <div className="space-y-3">
            {myBills.map(bill => (
              <div 
                key={bill.id} 
                className={`rounded-lg border-l-4 ${bill.iPaid ? 'bg-green-50 border-green-500' : 'bg-cyan-50 border-cyan-500'}`}
                style={{padding: '1rem', overflow: 'hidden'}}
              >
                <div className="flex justify-between items-start gap-4">
                  <div style={{flex: 1, minWidth: 0}}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold" style={{wordBreak: 'break-word'}}>{bill.category}</h4>
                      {bill.iPaid && (
                        <span 
                          className="text-xs bg-green-200 text-green-700 rounded"
                          style={{padding: '2px 8px', whiteSpace: 'nowrap'}}
                        >
                          ✓ Paid
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600" style={{wordBreak: 'break-word'}}>
                      Due: {new Date(bill.dueDate + 'T00:00:00').toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600" style={{wordBreak: 'break-word'}}>
                      {bill.myPercentage ? (
                        `Your share: ${bill.myPercentage.toFixed(1)}% of $${bill.amount.toFixed(2)}`
                      ) : bill.myDollarAmount ? (
                        `Your share: $${bill.myDollarAmount.toFixed(2)} of $${bill.amount.toFixed(2)}`
                      ) : (
                        `Your share: $${(bill.myShare || 0).toFixed(2)}`
                      )}
                    </p>
                    {bill.iPaid && bill.paidDate && (
                      <p className="text-xs text-green-600 mt-1" style={{wordBreak: 'break-word'}}>
                        Paid on {formatPaidDate(bill.paidDate)}
                      </p>
                    )}
                  </div>
                  <p 
                    className={`text-xl font-bold ${bill.iPaid ? 'text-green-600' : 'text-cyan-600'}`}
                    style={{flexShrink: 0, whiteSpace: 'nowrap'}}
                  >
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
        <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
          <h3 className="text-xl font-bold mb-4">Your Turn to Buy</h3>
          <div className="space-y-2">
            {myTurnItems.map(item => (
              <div 
                key={item.id} 
                className="bg-blue-50 rounded-lg border-l-4 border-blue-500"
                style={{padding: '1rem', overflow: 'hidden'}}
              >
                <p className="font-semibold" style={{wordBreak: 'break-word'}}>{item.name}</p>
                <p className="text-sm text-gray-600">Next up in the rotation</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Tasks */}
      {myTasks.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
          <h3 className="text-xl font-bold mb-4">Your Tasks</h3>
          <div className="space-y-2">
            {myTasks.map(task => (
              <div 
                key={task.id} 
                className="bg-green-50 rounded-lg border-l-4 border-green-500"
                style={{padding: '1rem', overflow: 'hidden'}}
              >
                <p className="font-semibold" style={{wordBreak: 'break-word'}}>{task.title}</p>
                {task.dueDate && (
                  <p className="text-sm text-gray-600" style={{wordBreak: 'break-word'}}>
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
        <div className="bg-white rounded-lg shadow-lg" style={{padding: '3rem', overflow: 'hidden'}}>
          <h3 className="text-xl font-bold mb-4">Upcoming Events</h3>
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <div 
                key={event.id} 
                className="bg-gray-50 rounded-lg"
                style={{padding: '1rem', overflow: 'hidden'}}
              >
                <p className="font-semibold" style={{wordBreak: 'break-word'}}>{event.title}</p>
                <p className="text-sm text-gray-600" style={{wordBreak: 'break-word'}}>
                  {new Date(event.date + 'T00:00:00').toLocaleDateString()}
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
