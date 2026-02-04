// --- STATE MANAGEMENT ---
const DEFAULT_DATA = {
    profile: { ign: 'Steve', balance: 50000 },
    transactions: [
        { id: 1, date: '2023-10-01', desc: 'Sold Diamond Stack', amount: 5000 },
        { id: 2, date: '2023-10-02', desc: 'Bought Gear', amount: -2000 }
    ],
    shops: [
        { id: 1, item: 'Netherite Ingot', cost: 1000, price: 1500, stock: 5, notes: 'Sell fast, competition rising' }
    ],
    competitors: [
        { id: 1, name: 'RichGuy123', notes: 'Undercuts on Sundays. Main shop at /warp mall' }
    ],
    wiki: [],
    journal: [],
    settings: { firstSetup: true }
};

let db = JSON.parse(localStorage.getItem('swiftEcoDB')) || JSON.parse(JSON.stringify(DEFAULT_DATA));

// --- CORE FUNCTIONS ---

function saveDB() {
    localStorage.setItem('swiftEcoDB', JSON.stringify(db));
    updateUI();
}

function updateUI() {
    renderDashboard();
    renderShops();
    renderIntel();
    renderSidebar();
}

// --- NAVIGATION ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active from all buttons and views
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        // Activate clicked
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// --- DASHBOARD LOGIC ---
let balanceChartInstance = null;

function renderDashboard() {
    // Calcs
    const currentBal = db.profile.balance;
    const profit = db.transactions.reduce((acc, t) => acc + t.amount, 0);
    const shopValue = db.shops.reduce((acc, s) => acc + (s.price * s.stock), 0);
    const netWorth = currentBal + shopValue;

    document.getElementById('dash-balance').innerText = `$${currentBal.toLocaleString()}`;
    document.getElementById('dash-networth').innerText = `$${netWorth.toLocaleString()}`;
    document.getElementById('dash-profit').innerText = `${profit > 0 ? '+' : ''}$${profit.toLocaleString()}`;
    document.getElementById('dash-profit').className = profit >= 0 ? 'money positive' : 'money negative';

    // Recent TX List
    const txList = document.getElementById('tx-list');
    txList.innerHTML = db.transactions.slice().reverse().slice(0, 5).map(t => `
        <li>
            <span>${t.date} - ${t.desc}</span>
            <span class="${t.amount >= 0 ? 'positive' : 'negative'} money" style="float:right">
                ${t.amount > 0 ? '+' : ''}$${t.amount.toLocaleString()}
            </span>
        </li>
    `).join('');

    renderChart();
}

function renderChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    
    // Simulate history for chart (In a real app, you'd store daily snapshots)
    const labels = db.transactions.map(t => t.date);
    let runBal = db.profile.balance - db.transactions.reduce((a,b)=>a+b.amount,0); // Reverse calc for demo
    const dataPoints = db.transactions.map(t => {
        runBal += t.amount;
        return runBal;
    });

    if(balanceChartInstance) balanceChartInstance.destroy();

    balanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Balance History',
                data: dataPoints,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#334155' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function addTransactionModal() {
    const desc = prompt("Transaction Description:");
    const amount = parseFloat(prompt("Amount (+ for gain, - for cost):"));
    if(desc && !isNaN(amount)) {
        db.transactions.push({
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            desc,
            amount
        });
        db.profile.balance += amount;
        saveDB();
    }
}

// --- SHOP MANAGER ---
function renderShops() {
    const list = document.getElementById('shop-list');
    list.innerHTML = db.shops.map(item => {
        const profit = item.price - item.cost;
        const margin = ((profit / item.cost) * 100).toFixed(1);
        return `
        <div class="card">
            <div style="display:flex; justify-content:space-between;">
                <h3>${item.item}</h3>
                <span class="item-badge" style="color:${item.stock > 0 ? '#4ade80':'#f87171'}">
                    ${item.stock > 0 ? 'In Stock: ' + item.stock : 'OUT OF STOCK'}
                </span>
            </div>
            <p style="color:#94a3b8; font-size:0.9rem; margin:10px 0;">${item.notes}</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                <div>Buy: <span class="money text-white">$${item.cost}</span></div>
                <div>Sell: <span class="money">$${item.price}</span></div>
            </div>
            <div style="border-top:1px solid #334155; padding-top:10px;">
                Profit: <span class="money">+$${profit}</span> 
                <span class="profit-margin">(${margin}%)</span>
            </div>
            <button onclick="deleteShopItem(${item.id})" style="color:#f87171; background:none; border:none; margin-top:10px; cursor:pointer;">Remove</button>
        </div>
        `;
    }).join('');
}

function toggleShopForm() {
    document.getElementById('shop-form').classList.toggle('hidden');
}

function saveShopItem() {
    const name = document.getElementById('shop-item-name').value;
    const cost = parseFloat(document.getElementById('shop-cost').value);
    const price = parseFloat(document.getElementById('shop-price').value);
    const stock = parseInt(document.getElementById('shop-stock').value);
    const notes = document.getElementById('shop-notes').value;

    if(name && !isNaN(price)) {
        db.shops.push({ id: Date.now(), item: name, cost, price, stock, notes });
        document.getElementById('shop-form').classList.add('hidden');
        saveDB();
    }
}

function deleteShopItem(id) {
    if(confirm('Delete item?')) {
        db.shops = db.shops.filter(s => s.id !== id);
        saveDB();
    }
}

// --- MARKET INTEL ---
function renderIntel() {
    const list = document.getElementById('intel-list');
    list.innerHTML = db.competitors.map(c => `
        <div class="card">
            <h3><i class="fa-solid fa-skull"></i> ${c.name}</h3>
            <p>${c.notes}</p>
            <button onclick="removeCompetitor(${c.id})" style="margin-top:10px; color:#f87171; background:none; border:none; cursor:pointer">Stop Tracking</button>
        </div>
    `).join('');
}

function addCompetitor() {
    const name = prompt("Player Name:");
    const notes = prompt("Intel Notes:");
    if(name) {
        db.competitors.push({ id: Date.now(), name, notes });
        saveDB();
    }
}

function removeCompetitor(id) {
    db.competitors = db.competitors.filter(c => c.id !== id);
    saveDB();
}

// --- WIKI & JOURNAL (Simplified) ---
function addWikiNote() {
    const title = prompt("Note Title:");
    const content = prompt("Content (Supports HTML):");
    if(title) {
        const div = document.getElementById('wiki-container');
        div.innerHTML += `<div class="card"><h3>${title}</h3><p>${content}</p></div>`;
        // In real version, save to DB array
    }
}

function addJournalEntry() {
    const log = prompt("What happened today?");
    if(log) {
        const container = document.getElementById('journal-list');
        const date = new Date().toLocaleDateString();
        container.innerHTML = `<div class="card"><h4>${date}</h4><p>${log}</p></div>` + container.innerHTML;
    }
}

// --- RISK CALC ---
function calcRisk() {
    const gear = parseFloat(document.getElementById('risk-gear').value) || 0;
    const reward = parseFloat(document.getElementById('risk-reward').value) || 0;
    const ratio = reward / gear;
    
    const res = document.getElementById('risk-result');
    if(ratio > 3) {
        res.innerText = "Risk Rating: LOW (Go for it!)";
        res.style.color = "#4ade80";
    } else if (ratio > 1) {
        res.innerText = "Risk Rating: MEDIUM (Be careful)";
        res.style.color = "#fbbf24";
    } else {
        res.innerText = "Risk Rating: HIGH (Not worth it)";
        res.style.color = "#f87171";
    }
}

// --- PROFILE ---
function renderSidebar() {
    document.getElementById('mini-ign').innerText = db.profile.ign;
    document.getElementById('mini-bal').innerText = `$${db.profile.balance.toLocaleString()}`;
    document.getElementById('profile-ign').value = db.profile.ign;
}

function updateProfile() {
    db.profile.ign = document.getElementById('profile-ign').value;
    saveDB();
    alert("Profile Saved");
}

// INIT
updateUI();
