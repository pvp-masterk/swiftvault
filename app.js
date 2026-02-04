// --- UNIQUE MODAL SYSTEM (Replaces Prompt/Alert) ---
const Modal = {
    overlay: document.getElementById('modal-overlay'),
    title: document.getElementById('modal-title'),
    content: document.getElementById('modal-content'),
    actions: document.getElementById('modal-actions'),
    
    open({ title, formFields, onConfirm, confirmText = 'Save' }) {
        this.title.innerText = title;
        this.content.innerHTML = '';
        this.actions.innerHTML = '';

        // Generate Form Inputs Dynamically
        const inputs = {};
        if (formFields) {
            formFields.forEach(field => {
                const group = document.createElement('div');
                group.className = 'form-group';
                
                const label = document.createElement('label');
                label.className = 'form-label';
                label.innerText = field.label;
                
                let input;
                if(field.type === 'textarea') {
                    input = document.createElement('textarea');
                    input.rows = 3;
                } else {
                    input = document.createElement('input');
                    input.type = field.type || 'text';
                }
                input.className = 'form-input';
                if(field.value) input.value = field.value;
                if(field.placeholder) input.placeholder = field.placeholder;
                
                group.appendChild(label);
                group.appendChild(input);
                this.content.appendChild(group);
                inputs[field.name] = input;
            });
        }

        // Buttons
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.innerText = 'Cancel';
        cancelBtn.onclick = () => this.close();

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-primary';
        saveBtn.innerText = confirmText;
        saveBtn.onclick = () => {
            const data = {};
            for (let key in inputs) data[key] = inputs[key].value;
            if(onConfirm) onConfirm(data);
            this.close();
        };

        this.actions.append(cancelBtn, saveBtn);

        this.overlay.style.display = 'flex';
        // Small delay for CSS transition
        setTimeout(() => this.overlay.classList.add('open'), 10);
    },

    confirm(message, onYes) {
        this.title.innerText = 'Confirmation';
        this.content.innerHTML = `<p>${message}</p>`;
        this.actions.innerHTML = '';

        const noBtn = document.createElement('button');
        noBtn.className = 'btn-secondary';
        noBtn.innerText = 'No';
        noBtn.onclick = () => this.close();

        const yesBtn = document.createElement('button');
        yesBtn.className = 'btn-danger';
        yesBtn.innerText = 'Yes';
        yesBtn.onclick = () => { onYes(); this.close(); };

        this.actions.append(noBtn, yesBtn);
        this.overlay.style.display = 'flex';
        setTimeout(() => this.overlay.classList.add('open'), 10);
    },

    close() {
        this.overlay.classList.remove('open');
        setTimeout(() => { this.overlay.style.display = 'none'; }, 300);
    }
};

// --- DATA STORE ---
const DB = {
    data: JSON.parse(localStorage.getItem('swiftEcoV2')) || {
        profile: { ign: 'Steve', balance: 0 },
        transactions: [],
        shops: [],
        intel: [],
        notes: []
    },
    save() {
        localStorage.setItem('swiftEcoV2', JSON.stringify(this.data));
        App.render();
    }
};

// --- APP LOGIC ---
const App = {
    chartInstance: null,

    init() {
        this.setupNav();
        this.render();
    },

    setupNav() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.target).classList.add('active');
            });
        });
    },

    // --- RENDERERS ---
    render() {
        this.renderStats();
        this.renderTransactions();
        this.renderShops();
        this.renderIntel();
        this.renderNotes();
        this.updateChart();
    },

    renderStats() {
        const bal = DB.data.profile.balance;
        const shopVal = DB.data.shops.reduce((acc, s) => acc + (s.price * s.stock), 0);
        const profits = DB.data.transactions.reduce((acc, t) => acc + t.amount, 0);

        document.getElementById('dash-balance').innerText = `$${bal.toLocaleString()}`;
        document.getElementById('dash-networth').innerText = `$${(bal + shopVal).toLocaleString()}`;
        document.getElementById('dash-profit').innerText = `${profits > 0 ? '+' : ''}$${profits.toLocaleString()}`;
        document.getElementById('dash-profit').className = `money ${profits >= 0 ? 'text-success' : 'text-danger'}`;
        
        document.getElementById('mini-ign').innerText = DB.data.profile.ign;
        document.getElementById('mini-avatar').innerText = DB.data.profile.ign[0].toUpperCase();
        document.getElementById('mini-bal').innerText = `$${bal.toLocaleString()}`;
    },

    renderTransactions() {
        const list = document.getElementById('tx-list');
        list.innerHTML = DB.data.transactions.slice().reverse().slice(0, 6).map(t => `
            <li>
                <div class="tx-desc">
                    <span style="font-weight:600">${t.desc}</span>
                    <span class="tx-date">${t.date}</span>
                </div>
                <div class="money ${t.amount >= 0 ? 'text-success' : 'text-danger'}">
                    ${t.amount > 0 ? '+' : ''}$${t.amount.toLocaleString()}
                </div>
            </li>
        `).join('') || '<div style="text-align:center; color:#64748b; padding:20px;">No recent activity</div>';
    },

    renderShops() {
        const container = document.getElementById('shop-list');
        container.innerHTML = DB.data.shops.map(s => {
            const profit = s.price - s.cost;
            const margin = Math.round((profit / s.cost) * 100) || 0;
            const isLowStock = s.stock < 5;
            
            return `
            <div class="card">
                <div class="shop-card-header">
                    <h3 style="font-size:1.1rem; color:white;">${s.item}</h3>
                    <span class="stock-badge ${isLowStock ? 'low' : 'ok'}">${s.stock} Left</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; font-size:0.9rem;">
                    <div style="color:#94a3b8">Buy: <span class="money">$${s.cost}</span></div>
                    <div style="color:#94a3b8">Sell: <span class="money text-success">$${s.price}</span></div>
                </div>
                <div style="font-size:0.85rem; color:#64748b; margin-bottom:15px;">
                    Margin: <span class="${margin > 20 ? 'text-success' : 'text-warning'}">${margin}%</span>
                </div>
                <div class="shop-actions">
                    <button onclick="App.quickSell(${s.id})" class="btn-sell" title="Sell 1 Unit"><i class="fa-solid fa-coins"></i> Sell 1</button>
                    <button onclick="App.editShop(${s.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="App.deleteShop(${s.id})" title="Delete" style="color:#ef4444; border-color:#ef4444;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    },

    renderIntel() {
        document.getElementById('intel-list').innerHTML = DB.data.intel.map(i => `
            <div class="card">
                <div style="display:flex; justify-content:space-between;">
                    <h3 style="color:white"><i class="fa-solid fa-user-secret"></i> ${i.name}</h3>
                    <button onclick="App.deleteIntel(${i.id})" style="background:none; border:none; color:#ef4444; cursor:pointer"><i class="fa-solid fa-times"></i></button>
                </div>
                <div style="background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; margin:10px 0; font-family:monospace; font-size:0.85rem; color:var(--accent);">
                    XYZ: ${i.coords || 'Unknown'}
                </div>
                <p style="color:#94a3b8; font-size:0.9rem;">${i.notes}</p>
            </div>
        `).join('');
    },

    renderNotes() {
        document.getElementById('wiki-list').innerHTML = DB.data.notes.map(n => `
            <div class="card" style="padding:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <h4 style="color:white">${n.title}</h4>
                    <i class="fa-solid fa-trash" style="color:#ef4444; cursor:pointer; font-size:0.8rem;" onclick="App.deleteNote(${n.id})"></i>
                </div>
                <p style="color:#94a3b8; font-size:0.9rem;">${n.body}</p>
            </div>
        `).join('');
    },

    updateChart() {
        const ctx = document.getElementById('balanceChart').getContext('2d');
        
        // Construct visual history
        let runningBalance = 0; // In a real app, calculate from initial, here we mimic
        // Simple mock history for aesthetics if empty
        const labels = DB.data.transactions.length ? DB.data.transactions.map(t => t.date.slice(5)) : ['Start'];
        const data = [];
        
        // Reverse engineer balance history
        let current = DB.data.profile.balance;
        const txs = [...DB.data.transactions].reverse(); // Oldest first
        // This is a simplified chart logic
        if(txs.length === 0) {
             data.push(0);
        } else {
            // Very rough estimation for visual flair
            let tempBal = current;
            const revData = [];
            for(let i = DB.data.transactions.length - 1; i >= 0; i--) {
                revData.push(tempBal);
                tempBal -= DB.data.transactions[i].amount;
            }
            revData.push(tempBal); // Initial
            data.push(...revData.reverse());
            if(labels.length < data.length) labels.unshift('Start');
        }

        if (this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Balance',
                    data: data,
                    borderColor: '#6366f1',
                    backgroundColor: (context) => {
                        const bg = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
                        bg.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
                        bg.addColorStop(1, 'rgba(99, 102, 241, 0)');
                        return bg;
                    },
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b' } },
                    y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' } }
                }
            }
        });
    },

    // --- ACTIONS (Using Modal) ---
    openTransactionModal() {
        Modal.open({
            title: 'Log Transaction',
            formFields: [
                { name: 'desc', label: 'Description (e.g. Sold Diamonds)', placeholder: 'Item/Reason' },
                { name: 'amount', label: 'Amount (+ for Income, - for Expense)', type: 'number', placeholder: '5000' }
            ],
            onConfirm: (res) => {
                if(!res.desc || !res.amount) return;
                const amt = parseFloat(res.amount);
                DB.data.transactions.push({
                    id: Date.now(),
                    date: new Date().toISOString().split('T')[0],
                    desc: res.desc,
                    amount: amt
                });
                DB.data.profile.balance += amt;
                DB.save();
            }
        });
    },

    openShopModal() {
        Modal.open({
            title: 'New Shop Listing',
            formFields: [
                { name: 'item', label: 'Item Name' },
                { name: 'cost', label: 'Sourcing Cost ($)', type: 'number' },
                { name: 'price', label: 'Selling Price ($)', type: 'number' },
                { name: 'stock', label: 'Initial Stock', type: 'number' }
            ],
            onConfirm: (res) => {
                if(!res.item) return;
                DB.data.shops.push({
                    id: Date.now(),
                    item: res.item,
                    cost: parseFloat(res.cost) || 0,
                    price: parseFloat(res.price) || 0,
                    stock: parseInt(res.stock) || 0
                });
                DB.save();
            }
        });
    },

    editShop(id) {
        const item = DB.data.shops.find(s => s.id === id);
        Modal.open({
            title: `Edit ${item.item}`,
            formFields: [
                { name: 'price', label: 'New Price', type: 'number', value: item.price },
                { name: 'stock', label: 'Update Stock', type: 'number', value: item.stock }
            ],
            onConfirm: (res) => {
                item.price = parseFloat(res.price);
                item.stock = parseInt(res.stock);
                DB.save();
            }
        });
    },

    quickSell(id) {
        const item = DB.data.shops.find(s => s.id === id);
        if(item.stock <= 0) {
            Modal.confirm("Stock is empty. Restock first?", () => this.editShop(id));
            return;
        }
        
        // Auto create transaction and decrement stock
        item.stock--;
        const profit = item.price - item.cost;
        DB.data.transactions.push({
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            desc: `Sold 1x ${item.item}`,
            amount: item.price
        });
        DB.data.profile.balance += item.price;
        DB.save();
    },

    deleteShop(id) {
        Modal.confirm("Delete this listing permanently?", () => {
            DB.data.shops = DB.data.shops.filter(s => s.id !== id);
            DB.save();
        });
    },

    openIntelModal() {
        Modal.open({
            title: 'Add Intelligence',
            formFields: [
                { name: 'name', label: 'Player Name' },
                { name: 'coords', label: 'Location (X Y Z)', placeholder: '100 64 -200' },
                { name: 'notes', label: 'Notes', type: 'textarea' }
            ],
            onConfirm: (res) => {
                DB.data.intel.push({ id: Date.now(), ...res });
                DB.save();
            }
        });
    },

    deleteIntel(id) {
        DB.data.intel = DB.data.intel.filter(i => i.id !== id);
        DB.save();
    },

    openNoteModal() {
        Modal.open({
            title: 'New Note',
            formFields: [
                { name: 'title', label: 'Title' },
                { name: 'body', label: 'Content', type: 'textarea' }
            ],
            onConfirm: (res) => {
                DB.data.notes.push({ id: Date.now(), ...res });
                DB.save();
            }
        });
    },

    deleteNote(id) {
        DB.data.notes = DB.data.notes.filter(n => n.id !== id);
        DB.save();
    },

    // Risk Calc
    loadRiskPreset(val) {
        document.getElementById('risk-gear').value = val;
    },

    calcRisk() {
        const gear = parseFloat(document.getElementById('risk-gear').value) || 0;
        const reward = parseFloat(document.getElementById('risk-reward').value) || 0;
        const resultDiv = document.getElementById('risk-result');
        
        if(gear === 0) {
            resultDiv.innerText = "Enter gear cost first.";
            resultDiv.style.display = 'block';
            return;
        }

        const ratio = reward / gear;
        resultDiv.style.display = 'block';

        if(ratio > 2.5) {
            resultDiv.style.background = 'rgba(16, 185, 129, 0.2)';
            resultDiv.style.color = '#10b981';
            resultDiv.innerHTML = `<i class="fa-solid fa-check"></i> GREAT RISK (ROI: ${ratio.toFixed(1)}x)`;
        } else if (ratio > 1) {
             resultDiv.style.background = 'rgba(245, 158, 11, 0.2)';
             resultDiv.style.color = '#f59e0b';
             resultDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> MODERATE (ROI: ${ratio.toFixed(1)}x)`;
        } else {
             resultDiv.style.background = 'rgba(239, 68, 68, 0.2)';
             resultDiv.style.color = '#ef4444';
             resultDiv.innerHTML = `<i class="fa-solid fa-skull"></i> BAD IDEA (ROI: ${ratio.toFixed(1)}x)`;
        }
    },

    clearHistory() {
        Modal.confirm("Clear all transaction history?", () => {
            DB.data.transactions = [];
            DB.save();
        });
    }
};

// Start
App.init();
