// --- 1. Data Service (Supabase + LocalStorage Hybrid) ---
const LOCAL_STORAGE_KEY = 'budget_db_v3';
let supabaseClient = null;
let useSupabase = false;

// Default Data with "Agentic" examples
const defaultMonthData = {
    income: { projected: [], actual: [] },
    expenses: [
        { id: 'cat_housing', name: 'Housing', items: [] },
        { id: 'cat_food', name: 'Food', items: [] },
        { id: 'cat_transport', name: 'Transport', items: [] }
    ]
};

// State
let db = {};
let currentDateKey = '2025-12';
let currentTheme = localStorage.getItem('theme') || 'dark';

// --- Initialization ---

async function init() {
    setupDateSelectors();
    setupTheme();
    setupAgent();
    await initDataService();

    // Load Key
    const m = document.getElementById('month-select').value;
    const y = document.getElementById('year-select').value;
    currentDateKey = `${y}-${m}`;

    await loadDataForCurrentDate();
    updateUI();
}

async function initDataService() {
    const sbUrl = localStorage.getItem('sb_url');
    const sbKey = localStorage.getItem('sb_key');

    if (sbUrl && sbKey) {
        try {
            // @ts-ignore
            supabaseClient = supabase.createClient(sbUrl, sbKey);
            useSupabase = true;

            // Auth Check
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) {
                // Redirect if not logged in
                window.location.href = 'auth.html';
                return;
            } else {
                // Update Profile UI
                document.querySelector('.user-info .name').innerText = session.user.user_metadata.full_name || session.user.email;
                document.querySelector('.user-info .role').innerText = 'Admin (Connected)';

                // Add Logout
                const pf = document.querySelector('.user-profile');
                pf.onclick = async () => {
                    if (confirm("Logout?")) {
                        await supabaseClient.auth.signOut();
                        window.location.href = 'auth.html';
                    }
                };
            }

            console.log('Supabase Connected');
            showToast('Connected to Cloud Storage');
        } catch (e) {
            console.error('Supabase Init Error', e);
            useSupabase = false;
        }
    } else {
        // No keys? Warn or redirect? For now, allow local mode but maybe suggest auth
        console.warn('Running in Local Mode (No Supabase Keys)');
    }

    if (!useSupabase) {
        // Load local
        db = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};

        // Mock User
        document.querySelector('.user-info .name').innerText = 'Local User';
        document.querySelector('.user-profile').onclick = openSettings; // Keep settings open for local users
    }
}

async function loadDataForCurrentDate() {
    if (useSupabase) {
        // Fetch from 'budget_logs' table where date_key = currentDateKey
        // Note: For this to work, User needs a table `budget_logs` with columns: date_key (text), data (jsonb)
        // We will TRY to fetch. If it doesn't exist, we might fail.
        // For robustness, we will try to Upsert only if we have data.
        const { data, error } = await supabaseClient
            .from('budget_logs')
            .select('data')
            .eq('date_key', currentDateKey)
            .single();

        if (data && data.data) {
            db[currentDateKey] = data.data;
        } else {
            // New month or no data yet
            if (!db[currentDateKey]) {
                db[currentDateKey] = JSON.parse(JSON.stringify(defaultMonthData));
            }
        }
    } else {
        if (!db[currentDateKey]) {
            db[currentDateKey] = JSON.parse(JSON.stringify(defaultMonthData));
            saveData();
        }
    }
}

async function saveData() {
    if (useSupabase) {
        // Cloud Save
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            console.error("Save failed: No active session");
            return;
        }

        // We use an 'upsert' pattern.
        // Must include user_id to match the UNIQUE(user_id, date_key) constraint
        const payload = {
            date_key: currentDateKey,
            data: db[currentDateKey],
            user_id: session.user.id
        };

        // Debug Log
        console.log("Attempting Cloud Save...", payload);

        const { data, error } = await supabaseClient
            .from('budget_logs')
            .upsert(payload, { onConflict: 'user_id, date_key' })
            .select();

        if (error) {
            console.error('CRITICAL CLOUD SAVE ERROR:', error);
            showToast(`Save Failed: ${error.message || error.details}`, 'error');
        } else {
            console.log("Cloud Save Success:", data);
        }
    } else {
        // Local Save
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    }
}

function getData() {
    return db[currentDateKey];
}

// --- Agentic Capabilities ---

function setupAgent() {
    // Initial commands helper or greeting logic
}

function toggleAgent() {
    const w = document.getElementById('agent-widget');
    const icon = document.getElementById('agent-toggle-icon');
    w.classList.toggle('closed');
    if (w.classList.contains('closed')) icon.className = "ph ph-caret-up";
    else icon.className = "ph ph-caret-down";
}

function handleChatInput(e) {
    if (e.key === 'Enter') sendChat();
}

function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    addMessage(msg, 'user');
    input.value = '';

    // "AI" Processing (Rule-based Agent)
    setTimeout(() => {
        processAgentCommand(msg.toLowerCase());
    }, 600);
}

function addMessage(text, sender) {
    const c = document.getElementById('chat-messages');
    const d = document.createElement('div');
    d.className = `message ${sender}`;
    d.innerText = text;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
}

function processAgentCommand(cmd) {
    const data = getData();
    let response = "I'm sorry, I didn't quite catch that.";

    // 1. Navigation
    if (cmd.includes('expense') && cmd.includes('show')) {
        switchTab('expenses');
        response = "I've opened the Expenses tab for you.";
    }
    else if (cmd.includes('income') && cmd.includes('show')) {
        switchTab('income');
        response = "Here is your Income Manager.";
    }
    else if (cmd.includes('dashboard') || cmd.includes('home')) {
        switchTab('dashboard');
        response = "Back to the Dashboard.";
    }

    // 2. Analysis & Advice
    else if (cmd.includes('advice') || cmd.includes('analyze') || cmd.includes('how are we doing') || cmd.includes('invest')) {
        response = generateFinancialAdvice(data);
    }

    // 3. Data Queries
    else if (cmd.includes('balance')) {
        const inc = data.income.actual.reduce((a, b) => a + b.amount, 0);
        let exp = 0;
        data.expenses.forEach(c => c.items.forEach(i => exp += i.actual));
        const bal = inc - exp;
        response = `Your actual balance for this month is ${formatCurrency(bal)}.`;
    }
    else if (cmd.includes('total income')) {
        const val = data.income.actual.reduce((a, b) => a + b.amount, 0);
        response = `You have earned ${formatCurrency(val)} so far this month.`;
    }

    else if (cmd.includes('hello') || cmd.includes('hi')) {
        response = "Hello! I am your Mic3 Financial Advisor. Ask me for 'advice' to analyze your budget health.";
    }

    addMessage(response, 'bot');
}

function generateFinancialAdvice(data) {
    // 1. Calculate Metrics
    const projIncome = data.income.projected.reduce((a, b) => a + b.amount, 0);
    const actIncome = data.income.actual.reduce((a, b) => a + b.amount, 0);

    let projExp = 0;
    let actExp = 0;
    data.expenses.forEach(cat => {
        cat.items.forEach(i => {
            projExp += i.projected;
            actExp += i.actual;
        });
    });

    const actBalance = actIncome - actExp;
    const incomeVar = actIncome - projIncome;
    const savingsRate = actIncome > 0 ? (actBalance / actIncome) * 100 : 0;

    let advice = [];

    // 2. Income Analysis
    if (actIncome < projIncome) {
        advice.push(`⚠️ **Income Alert**: You are trailing your projected income by ${formatCurrency(Math.abs(incomeVar))}. If this persists, avoid big discretionary spends.`);
    } else if (actIncome > projIncome) {
        advice.push(`✅ **Income Strong**: You exceeded your income target by ${formatCurrency(incomeVar)}. Great job!`);
    }

    // 3. Expense Analysis
    if (actExp > projExp) {
        const over = actExp - projExp;
        advice.push(`🚨 **Overspending**: Expenses are ${formatCurrency(over)} higher than planned. Review your 'Housing' or 'Transport' categories immediately.`);
    } else {
        advice.push(`👍 **Spending Control**: You are under your expense budget by ${formatCurrency(projExp - actExp)}.`);
    }

    // 4. Investment Recommendation
    if (actBalance > 0) {
        if (savingsRate > 20) {
            advice.push(`🚀 **Investment Opportunity**: You have a strong surplus of ${formatCurrency(actBalance)} (${savingsRate.toFixed(1)}% savings rate).`);
            advice.push(`Given your healthy margin, Mic3 is in a **Safe Position** to invest. Consider allocating 50% (${formatCurrency(actBalance * 0.5)}) to a high-yield fund or business expansion.`);
        } else {
            advice.push(`💰 **Positive Balance**: You have a surplus of ${formatCurrency(actBalance)}. Focus on building an emergency fund before aggressive investing.`);
        }
    } else {
        advice.push(`🛑 **Critical Deficit**: You are currently spending more than you earn (${formatCurrency(actBalance)}). Investment is NOT recommended. Focus on cutting costs to stabilize.`);
    }

    return advice.join('<br><br>');
}


// --- Main UI Logic (Preserved from previous step but integrated with new data service) ---

function setupDateSelectors() {
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');

    // Months
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    months.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = String(i + 1).padStart(2, '0');
        opt.innerText = m;
        if ((i + 1) === 12) opt.selected = true;
        monthSelect.appendChild(opt);
    });

    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 5; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = y;
        if (y === 2025) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    const updateKey = async () => {
        currentDateKey = `${yearSelect.value}-${monthSelect.value}`;
        await loadDataForCurrentDate();
        updateUI();
    };

    monthSelect.addEventListener('change', updateKey);
    yearSelect.addEventListener('change', updateKey);
}

function updateUI() {
    renderDashboard();
    renderIncomeView();
    renderExpensesView();
}

function renderDashboard() {
    const data = getData();
    const totalProjIncome = data.income.projected.reduce((sum, item) => sum + item.amount, 0);
    const totalActualIncome = data.income.actual.reduce((sum, item) => sum + item.amount, 0);

    let totalProjExpense = 0;
    let totalActualExpense = 0;

    data.expenses.forEach(cat => {
        cat.items.forEach(item => {
            totalProjExpense += item.projected;
            totalActualExpense += item.actual;
        });
    });

    const projBalance = totalProjIncome - totalProjExpense;
    const actualBalance = totalActualIncome - totalActualExpense;
    const balanceDiff = actualBalance - projBalance;

    document.getElementById('summary-proj-balance').innerText = formatCurrency(projBalance);
    document.getElementById('summary-actual-balance').innerText = formatCurrency(actualBalance);
    const diffEl = document.getElementById('summary-diff');
    diffEl.innerText = formatCurrency(balanceDiff);

    const diffCard = document.querySelector('.difference-card');
    if (balanceDiff >= 0) {
        diffCard.classList.remove('negative');
        document.getElementById('summary-diff-icon').innerHTML = '<i class="ph ph-trend-up"></i>';
    } else {
        diffCard.classList.add('negative');
        document.getElementById('summary-diff-icon').innerHTML = '<i class="ph ph-trend-down"></i>';
    }

    document.getElementById('dash-proj-income').innerText = formatCurrency(totalProjIncome);
    document.getElementById('dash-actual-income').innerText = formatCurrency(totalActualIncome);
    document.getElementById('dash-proj-expense').innerText = formatCurrency(totalProjExpense);
    document.getElementById('dash-actual-expense').innerText = formatCurrency(totalActualExpense);

    updateMainChart(totalActualIncome, totalActualExpense, totalProjIncome, totalProjExpense);
}

function renderIncomeView() {
    const data = getData();
    const renderRows = (items, typeId) => {
        return items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td class="text-right">${formatCurrency(item.amount)}</td>
                <td class="text-right" style="width: 100px;">
                    <button class="btn-sm edit-btn" onclick="openModal('income', '${typeId}', null, ${item.id})"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn-sm delete-btn" onclick="deleteItem('income_${typeId}', ${item.id})"><i class="ph ph-trash"></i></button>
                </td>
            </tr>
        `).join('');
    };

    document.querySelector('#table-income-projected tbody').innerHTML = renderRows(data.income.projected, 'projected');
    document.querySelector('#table-income-actual tbody').innerHTML = renderRows(data.income.actual, 'actual');

    const totalProj = data.income.projected.reduce((a, b) => a + b.amount, 0);
    const totalAct = data.income.actual.reduce((a, b) => a + b.amount, 0);
    document.getElementById('total-income-projected').innerText = formatCurrency(totalProj);
    document.getElementById('total-income-actual').innerText = formatCurrency(totalAct);
}

function renderExpensesView() {
    const data = getData();
    const container = document.getElementById('expense-categories-container');
    container.innerHTML = '';

    data.expenses.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'expense-category-card';
        let catProj = 0; let catAct = 0;
        let rows = '';
        cat.items.forEach(item => {
            catProj += item.projected; catAct += item.actual;
            const diff = item.projected - item.actual; // Positive means under budget (Check logic vs spreadsheet)
            // Spreadsheet says: Projected 8500, Actual 0 -> Diff 8500 (Positive/Green Arrow). So Projected - Actual.

            let icon = ''; let diffClass = 'diff-neutral';
            if (diff > 0) { icon = '<i class="ph ph-arrow-up"></i>'; diffClass = 'diff-positive'; }
            if (diff < 0) { icon = '<i class="ph ph-arrow-down"></i>'; diffClass = 'diff-negative'; }

            rows += `
                <tr>
                    <td>${item.name}</td>
                    <td class="text-right">${formatCurrency(item.projected)}</td>
                    <td class="text-right">${formatCurrency(item.actual)}</td>
                    <td class="text-right ${diffClass}">${icon} ${formatCurrency(Math.abs(diff))}</td>
                    <td class="text-right" style="width: 100px;">
                        <button class="btn-sm edit-btn" onclick="openModal('expense_item', null, '${cat.id}', ${item.id})"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn-sm delete-btn" onclick="deleteExpenseItem('${cat.id}', ${item.id})"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        card.innerHTML = `
            <div class="cat-header">
                <h3>${cat.name}</h3>
                <button class="btn-icon" onclick="openModal('expense_item', null, '${cat.id}')"><i class="ph ph-plus"></i></button>
            </div>
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="text-right">Projected</th>
                        <th class="text-right">Actual</th>
                        <th class="text-right">Diff</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                     <tr>
                        <th>Total</th>
                        <th class="text-right">${formatCurrency(catProj)}</th>
                        <th class="text-right">${formatCurrency(catAct)}</th>
                        <th class="text-right">${formatCurrency(catProj - catAct)}</th>
                        <th></th>
                    </tr>
                </tfoot>
            </table>
        `;
        container.appendChild(card);
    });
}

function formatCurrency(val) {
    return 'Ksh ' + val.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Settings
function openSettings() {
    document.getElementById('settings-url').value = localStorage.getItem('sb_url') || '';
    document.getElementById('settings-key').value = localStorage.getItem('sb_key') || '';
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

async function saveSettings() {
    const url = document.getElementById('settings-url').value;
    const key = document.getElementById('settings-key').value;
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    closeSettings();
    showToast('Settings Saved. Reloading...');
    setTimeout(() => location.reload(), 1000);
}

function setupTheme() {
    document.body.setAttribute('data-theme', currentTheme);
    document.getElementById('theme-toggle').addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        updateUI(); // For Chart
    });
}

// Modal & Edit Logic (Same as before, preserved)
const modal = document.getElementById('universal-modal');
const form = document.getElementById('universal-form');
let editContext = null;

function openModal(type, subtype = null, catId = null, itemId = null) {
    editContext = itemId ? { type, subtype, catId, itemId } : null;
    form.reset();
    document.getElementById('form-type').value = type;
    document.getElementById('form-subtype').value = subtype || catId;
    const titleEl = document.getElementById('modal-title');
    const nameInput = document.getElementById('form-name');
    const amountInput = document.getElementById('form-amount');
    removeSecondaryInput();

    if (itemId) {
        titleEl.innerText = 'Edit Item';
        const data = getData();
        let item;
        if (type === 'income') {
            item = data.income[subtype].find(i => i.id === itemId);
            if (item) { nameInput.value = item.name; amountInput.value = item.amount; }
        } else if (type === 'expense_item') {
            const cat = data.expenses.find(c => c.id === catId);
            item = cat.items.find(i => i.id === itemId);
            if (item) {
                nameInput.value = item.name;
                amountInput.value = item.projected;
                addSecondaryInput(item.actual);
            }
        }
    } else {
        if (type === 'income') titleEl.innerText = `Add ${subtype} Income`;
        else if (type === 'expense_item') titleEl.innerText = 'Add Expense Item';
    }
    modal.classList.remove('hidden');
}

function addSecondaryInput(val) {
    let grp = document.getElementById('form-group-actual');
    if (!grp) {
        grp = document.createElement('div');
        grp.id = 'form-group-actual';
        grp.className = 'form-group';
        grp.innerHTML = '<label>Actual Cost</label><input type="number" id="form-actual-amount" placeholder="0.00">';
        document.getElementById('form-amount').parentElement.after(grp);
    }
    document.getElementById('form-actual-amount').value = val;
}
function removeSecondaryInput() {
    const grp = document.getElementById('form-group-actual');
    if (grp) grp.remove();
}
function closeModal() { modal.classList.add('hidden'); editContext = null; removeSecondaryInput(); }

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('form-type').value;
    const subtype = document.getElementById('form-subtype').value;
    const name = document.getElementById('form-name').value;
    const amount = parseFloat(document.getElementById('form-amount').value);
    const data = getData();

    if (editContext) {
        if (type === 'income') {
            const item = data.income[editContext.subtype].find(i => i.id === editContext.itemId);
            if (item) { item.name = name; item.amount = amount; }
        } else if (type === 'expense_item') {
            const cat = data.expenses.find(c => c.id === editContext.catId);
            const item = cat.items.find(i => i.id === editContext.itemId);
            if (item) {
                item.name = name; item.projected = amount;
                const actInp = document.getElementById('form-actual-amount');
                if (actInp) item.actual = parseFloat(actInp.value) || 0;
            }
        }
    } else {
        if (type === 'income') data.income[subtype].push({ id: Date.now(), name, amount });
        else if (type === 'expense_item') {
            const cat = data.expenses.find(c => c.id === subtype);
            if (cat) cat.items.push({ id: Date.now(), name, projected: amount, actual: 0 });
        }
    }

    await saveData();
    closeModal();
    updateUI();
    showToast('Saved successfully');
});

// --- Optimization & Robustness ---

function deleteItem(type, id) {
    // Immediate feedback - no blocking confirm
    // We can implement "Undo" later if needed, but for speed, direct delete is better.
    // If we want safety, we can use a custom modal, but user complained about slowness.
    if (!confirm('Are you sure you want to delete this item?')) return;

    const data = getData();
    // Ensure ID is compared safely (handle string/number mismatch)
    const safeId = Number(id);

    if (type.includes('projected')) {
        data.income.projected = data.income.projected.filter(i => i.id !== safeId);
    } else {
        data.income.actual = data.income.actual.filter(i => i.id !== safeId);
    }

    updateUI(); // Immediate UI update
    saveData(); // Background save
    showToast('Item deleted');
}

function deleteExpenseItem(catId, itemId) {
    if (!confirm('Delete this expense?')) return;

    const data = getData();
    const safeId = Number(itemId);
    const cat = data.expenses.find(c => c.id === catId);

    if (cat) {
        cat.items = cat.items.filter(i => i.id !== safeId);
        updateUI();
        saveData();
        showToast('Expense deleted');
    }
}

function addCategory() {
    const name = prompt("Category Name:");
    if (name) {
        getData().expenses.push({ id: 'cat_' + Date.now(), name, items: [] });
        saveData();
        updateUI();
    }
}

function switchTab(t) {
    document.querySelectorAll('.view-section').forEach(e => e.classList.add('hidden'));
    document.getElementById('view-' + t).classList.remove('hidden');
}

function showToast(m, t = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${t}`;
    el.innerHTML = `<i class="ph ph-check-circle"></i> ${m}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

let chartInstance;
function updateMainChart(actInc, actExp, projInc, projExp) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const isDark = currentTheme === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Optimization: Update data instead of destroying if exists
    if (chartInstance) {
        chartInstance.data.datasets[0].data = [projInc, projExp];
        chartInstance.data.datasets[1].data = [actInc, actExp];
        chartInstance.options.scales.y.grid.color = gridColor;
        chartInstance.options.scales.x.ticks.color = textColor;
        chartInstance.options.scales.y.ticks.color = textColor;
        chartInstance.update();
    } else {
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expenses'],
                datasets: [
                    { label: 'Projected', data: [projInc, projExp], backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderWidth: 0, borderRadius: 4 },
                    { label: 'Actual', data: [actInc, actExp], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0, borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 }, // Smooth animation
                scales: {
                    y: { grid: { color: gridColor }, ticks: { color: textColor } },
                    x: { grid: { display: false }, ticks: { color: textColor } }
                },
                plugins: { legend: { labels: { color: textColor } } }
            }
        });
    }
}

init();
