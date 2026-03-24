const DEMO_TRANSACTIONS = [
{ amount: "9500.00", category: "salary", description: "Incasare Salariu", isExpense: false, dateOffset: -20 },
{ amount: "120.50", category: "food", description: "Mega Image", isExpense: true, dateOffset: -19 },
{ amount: "45.00", category: "transport", description: "Uber Rides", isExpense: true, dateOffset: -18 },
{ amount: "350.00", category: "utilities", description: "Factura Enel Energie", isExpense: true, dateOffset: -17 },
{ amount: "210.00", category: "food", description: "Kaufland", isExpense: true, dateOffset: -16 },
{ amount: "450.00", category: "shopping", description: "eMAG", isExpense: true, dateOffset: -15 },
{ amount: "1500.00", category: "housing", description: "Plata Chirie", isExpense: true, dateOffset: -14 },
{ amount: "65.00", category: "health", description: "Farmacia Tei", isExpense: true, dateOffset: -13 },
{ amount: "85.00", category: "food", description: "Glovo", isExpense: true, dateOffset: -12 },
{ amount: "1200.00", category: "shopping", description: "Altex Romania", isExpense: true, dateOffset: -10 },
{ amount: "185.00", category: "utilities", description: "Digi RCS-RDS", isExpense: true, dateOffset: -9 },
{ amount: "55.00", category: "entertainment", description: "Netflix", isExpense: true, dateOffset: -8 },
{ amount: "30.00", category: "entertainment", description: "Spotify", isExpense: true, dateOffset: -8 },
{ amount: "180.00", category: "food", description: "Restaurant La Mama", isExpense: true, dateOffset: -5 },
{ amount: "75.00", category: "transport", description: "Bolt", isExpense: true, dateOffset: -3 },
{ amount: "200.00", category: "other", description: "Retragere Bancomat", isExpense: true, dateOffset: -2 },
{ amount: "550.00", category: "transfer", description: "Transfer Revolut", isExpense: true, dateOffset: -1 },
{ amount: "150.00", category: "food", description: "Lidl", isExpense: true, dateOffset: -1 },
{ amount: "320.00", category: "shopping", description: "Zara", isExpense: true, dateOffset: 0 }];






function applyPerfectDemoData(transactions, accounts, bankName) {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();


  const generatedTxs = DEMO_TRANSACTIONS.map((t, idx) => {
    const txDate = new Date();
    txDate.setDate(txDate.getDate() + t.dateOffset);


    if (txDate.getTime() < currentMonthStart) {
      txDate.setMonth(now.getMonth());
      txDate.setFullYear(now.getFullYear());
      txDate.setDate(Math.max(1, txDate.getDate() % 28));
    }

    const txDateStr = txDate.toISOString().split('T')[0];

    return {
      transactionId: `demo_${bankName}_${idx}_${Date.now()}`,
      canonicalId: `demo_${bankName}_${idx}_${Date.now()}`,
      bookingDate: txDateStr,
      valueDate: txDateStr,
      transactionAmount: {
        amount: t.isExpense ? `-${t.amount}` : t.amount,
        currency: "RON"
      },
      creditDebitIndicator: t.isExpense ? "DBIT" : "CRDT",
      remittanceInformationUnstructured: t.description,
      merchantNormalized: t.description,
      category: t.category,
      sourceLabel: "synced",
      payloadHash: `demo_${idx}`,
      lastUpdatedAt: new Date().toISOString()
    };
  });



  const allTxs = [...transactions, ...generatedTxs];


  let totalIncome = 0;
  let totalExpenses = 0;

  for (const tx of allTxs) {

    const txDate = new Date(tx.bookingDate || tx.valueDate).getTime();
    if (txDate >= currentMonthStart && txDate <= now.getTime()) {
      const amt = parseFloat(tx.transactionAmount?.amount || tx.amount || 0);
      if (amt > 0) totalIncome += amt;else
      totalExpenses += Math.abs(amt);
    }
  }


  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpenses = Math.round(totalExpenses * 100) / 100;

  let perfectBalance = totalIncome - totalExpenses;


  if (perfectBalance < 3500) {
    const compensationNeeded = Math.round((3500 - perfectBalance) * 100) / 100;


    const txDateStr = new Date().toISOString().split('T')[0];
    const compensationTx = {
      transactionId: `demo_bonus_${bankName}_${Date.now()}`,
      canonicalId: `demo_bonus_${bankName}_${Date.now()}`,
      bookingDate: txDateStr,
      valueDate: txDateStr,
      transactionAmount: {
        amount: String(compensationNeeded),
        currency: "RON"
      },
      creditDebitIndicator: "CRDT",
      remittanceInformationUnstructured: "Bonus Anual Performanta",
      merchantNormalized: "Bonus Anual Performanta",
      category: "income",
      sourceLabel: "synced",
      payloadHash: `demo_bonus_${Date.now()}`,
      lastUpdatedAt: new Date().toISOString()
    };

    allTxs.push(compensationTx);
    totalIncome += compensationNeeded;
    perfectBalance += compensationNeeded;
  }


  perfectBalance = perfectBalance.toFixed(2);


  const updatedAccounts = accounts.map((acc) => {
    return {
      ...acc,
      balances: [
      {
        balanceType: "interimAvailable",
        balanceAmount: {
          amount: perfectBalance,
          currency: "RON"
        }
      }]

    };
  });

  return { transactions: allTxs, accounts: updatedAccounts };
}

module.exports = { applyPerfectDemoData };