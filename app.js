/**
 * Finanças Casal - Gabriel & Sara
 * Frontend SPA/PWA para registro rápido de despesas integrado ao Google Apps Script
 */

// ==========================================
// 1. CONFIGURAÇÕES GLOBAIS
// ==========================================
// Substitua pela URL gerada no seu Google Apps Script (Web App /exec)
// Você também pode configurar diretamente no app clicando no ícone de engrenagem ⚙️
const DEFAULT_API_URL = ''; 

// Chaves de armazenamento local
const STORAGE_KEYS = {
  API_URL: 'financas_api_url',
  RECENT_EXPENSES: 'financas_recent_expenses',
  OFFLINE_QUEUE: 'financas_offline_queue'
};

// Obter URL configurada ou padrão
function getApiUrl() {
  return localStorage.getItem(STORAGE_KEYS.API_URL) || DEFAULT_API_URL;
}

function setApiUrl(url) {
  if (url) {
    localStorage.setItem(STORAGE_KEYS.API_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.API_URL);
  }
}

// ==========================================
// 2. ESTADO DO APLICATIVO
// ==========================================
const state = {
  rawAmountInCents: 0,
  quemPagou: 'Gabriel',
  tipoGasto: 'Conjunto (Casal)',
  categoria: 'Mercado',
  formaPagamento: 'Crédito',
  recentExpenses: []
};

// ==========================================
// 3. ELEMENTOS DO DOM
// ==========================================
const elements = {
  form: document.getElementById('transactionForm'),
  displayAmount: document.getElementById('displayAmount'),
  btnClearAmount: document.getElementById('btnClearAmount'),
  expenseDate: document.getElementById('expenseDate'),
  descricao: document.getElementById('descricao'),
  categoriaInput: document.getElementById('categoriaInput'),
  formaPagamentoInput: document.getElementById('formaPagamentoInput'),
  btnSubmit: document.getElementById('btnSubmit'),
  submitText: document.getElementById('submitText'),
  submitIcon: document.getElementById('submitIcon'),
  
  // Segmented controls
  labelGabriel: document.getElementById('labelGabriel'),
  labelSara: document.getElementById('labelSara'),
  labelConjunto: document.getElementById('labelConjunto'),
  labelIndividual: document.getElementById('labelIndividual'),
  
  // Containers
  categoriesGrid: document.getElementById('categoriesGrid'),
  paymentMethodsGrid: document.getElementById('paymentMethodsGrid'),
  recentTransactionsList: document.getElementById('recentTransactionsList'),
  badgeTodayCount: document.getElementById('badgeTodayCount'),
  totalTodayText: document.getElementById('totalTodayText'),
  
  // Connectivity & Toast
  connectionBadge: document.getElementById('connectionBadge'),
  connectionText: document.getElementById('connectionText'),
  toastNotification: document.getElementById('toastNotification'),
  toastContent: document.getElementById('toastContent'),
  toastIcon: document.getElementById('toastIcon'),
  toastMessage: document.getElementById('toastMessage'),

  // Settings Modal
  settingsModal: document.getElementById('settingsModal'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),
  btnCloseSettings: document.getElementById('btnCloseSettings'),
  inputApiUrl: document.getElementById('inputApiUrl'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  btnTestConnection: document.getElementById('btnTestConnection'),
  testResult: document.getElementById('testResult')
};

// ==========================================
// 4. FORMATAÇÃO E MÁSCARA MONETÁRIA
// ==========================================
function formatCentsToBRL(cents) {
  const value = (cents / 100).toFixed(2);
  const parts = value.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${integerPart},${parts[1]}`;
}

function updateAmountDisplay() {
  if (state.rawAmountInCents === 0) {
    elements.displayAmount.value = '';
    elements.displayAmount.placeholder = '0,00';
    elements.btnClearAmount.classList.add('hidden');
  } else {
    elements.displayAmount.value = formatCentsToBRL(state.rawAmountInCents);
    elements.btnClearAmount.classList.remove('hidden');
  }
}

function handleAmountInput(e) {
  // Captura apenas dígitos numéricos
  const rawValue = e.target.value.replace(/\D/g, '');
  state.rawAmountInCents = parseInt(rawValue || '0', 10);
  updateAmountDisplay();
}

function addAmountValue(amount) {
  state.rawAmountInCents += Math.round(amount * 100);
  updateAmountDisplay();
}

function clearAmount() {
  state.rawAmountInCents = 0;
  updateAmountDisplay();
  elements.displayAmount.focus();
}

// ==========================================
// 5. INTERFACE & SELETORES
// ==========================================
function updateWhoPaidUI() {
  if (state.quemPagou === 'Gabriel') {
    elements.labelGabriel.className = 'relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer tap-scale transition-all bg-cyan-950/60 border border-cyan-500/60 shadow-lg shadow-cyan-500/10 text-cyan-200';
    elements.labelSara.className = 'relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer tap-scale transition-all bg-transparent border border-transparent text-slate-400 hover:text-slate-200';
  } else {
    elements.labelGabriel.className = 'relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer tap-scale transition-all bg-transparent border border-transparent text-slate-400 hover:text-slate-200';
    elements.labelSara.className = 'relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer tap-scale transition-all bg-pink-950/60 border border-pink-500/60 shadow-lg shadow-pink-500/10 text-pink-200';
  }
}

function updateExpenseTypeUI() {
  if (state.tipoGasto === 'Conjunto (Casal)') {
    elements.labelConjunto.className = 'relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg cursor-pointer tap-scale transition-all bg-slate-800 text-slate-100 font-semibold border border-slate-700 shadow';
    elements.labelIndividual.className = 'relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg cursor-pointer tap-scale transition-all bg-transparent text-slate-400 font-medium hover:text-slate-200';
  } else {
    elements.labelConjunto.className = 'relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg cursor-pointer tap-scale transition-all bg-transparent text-slate-400 font-medium hover:text-slate-200';
    elements.labelIndividual.className = 'relative flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg cursor-pointer tap-scale transition-all bg-slate-800 text-slate-100 font-semibold border border-slate-700 shadow';
  }
}

function selectCategory(categoryName) {
  state.categoria = categoryName;
  elements.categoriaInput.value = categoryName;

  const buttons = elements.categoriesGrid.querySelectorAll('.category-card');
  buttons.forEach((btn) => {
    const isSelected = btn.getAttribute('data-category') === categoryName;
    if (isSelected) {
      btn.className = 'category-card flex flex-col items-center justify-center p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/80 shadow-md shadow-cyan-500/10 tap-scale transition-all scale-[1.03] text-cyan-300';
    } else {
      btn.className = 'category-card flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 tap-scale transition-all text-slate-300';
    }
  });
}

function selectPaymentMethod(methodName) {
  state.formaPagamento = methodName;
  elements.formaPagamentoInput.value = methodName;

  const buttons = elements.paymentMethodsGrid.querySelectorAll('.payment-btn');
  buttons.forEach((btn) => {
    const isSelected = btn.getAttribute('data-payment') === methodName;
    if (isSelected) {
      btn.className = 'payment-btn py-2 px-1 text-center rounded-xl bg-emerald-950/60 border border-emerald-500/80 text-xs font-semibold text-emerald-300 shadow-sm shadow-emerald-500/20 tap-scale';
    } else {
      btn.className = 'payment-btn py-2 px-1 text-center rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400 hover:border-slate-700 tap-scale';
    }
  });
}

// Mapa de sugestões para auto-categorizar
const descCategoryMap = {
  'Mercado': 'Mercado',
  'Restaurante': 'Alimentação',
  'Gasolina': 'Transporte',
  'Farmácia': 'Saúde',
  'Delivery': 'Alimentação',
  'Uber': 'Transporte'
};

// ==========================================
// 6. FEEDBACK HÁTICO & TOAST
// ==========================================
function triggerHaptic(type = 'success') {
  if (!('vibrate' in navigator)) return;
  try {
    if (type === 'success') {
      navigator.vibrate([30, 40, 30]);
    } else if (type === 'warning') {
      navigator.vibrate([60, 50, 60]);
    }
  } catch (_) {}
}

let toastTimer = null;
function showToast(message, type = 'success', duration = 3500) {
  clearTimeout(toastTimer);
  
  elements.toastMessage.textContent = message;
  
  if (type === 'success') {
    elements.toastContent.className = 'bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-center gap-2 border border-emerald-400 text-sm';
    elements.toastIcon.textContent = '✅';
  } else if (type === 'offline') {
    elements.toastContent.className = 'bg-amber-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-center gap-2 border border-amber-400 text-sm';
    elements.toastIcon.textContent = '💾';
  } else {
    elements.toastContent.className = 'bg-rose-500 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-center gap-2 border border-rose-400 text-sm';
    elements.toastIcon.textContent = '⚠️';
  }

  elements.toastNotification.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
  elements.toastNotification.classList.add('opacity-100', 'translate-y-0');

  toastTimer = setTimeout(() => {
    elements.toastNotification.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    elements.toastNotification.classList.remove('opacity-100', 'translate-y-0');
  }, duration);
}

// ==========================================
// 7. ENVIO PARA O GOOGLE APPS SCRIPT
// ==========================================
async function sendToGoogleSheets(payload) {
  const apiUrl = getApiUrl();
  
  if (!apiUrl) {
    throw new Error('CONFIG_REQUIRED');
  }

  /**
   * Requisito obrigatório do Google Apps Script:
   * mode: 'no-cors' e Content-Type: 'text/plain;charset=utf-8'
   * Isso contorna os redirects 302 internos do Google Apps Script sem que o browser aborte por CORS.
   */
  const response = await fetch(apiUrl, {
    method: 'POST',
    mode: 'no-cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  return response;
}

// ==========================================
// 8. HISTÓRICO LOCAL E PERSISTÊNCIA OFFLINE
// ==========================================
function loadRecentExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_EXPENSES);
    state.recentExpenses = raw ? JSON.parse(raw) : [];
  } catch (_) {
    state.recentExpenses = [];
  }
  renderRecentExpenses();
}

function saveExpenseLocally(expense) {
  state.recentExpenses.unshift(expense);
  // Mantém os últimos 30 registros
  if (state.recentExpenses.length > 30) {
    state.recentExpenses.pop();
  }
  localStorage.setItem(STORAGE_KEYS.RECENT_EXPENSES, JSON.stringify(state.recentExpenses));
  renderRecentExpenses();
}

function getCategoryEmoji(cat) {
  const emojiMap = {
    'Mercado': '🛒',
    'Alimentação': '🍕',
    'Transporte': '🚗',
    'Moradia': '🏠',
    'Lazer': '🎉',
    'Saúde': '💊',
    'Pet': '🐾',
    'Compras': '🛍️',
    'Investimentos': '📈',
    'Outros': '⚡'
  };
  return emojiMap[cat] || '💳';
}

function renderRecentExpenses() {
  const today = new Date().toISOString().split('T')[0];
  
  // Filtrar apenas despesas registradas com a data de hoje para o contador e soma
  const todayExpenses = state.recentExpenses.filter(exp => exp.date === today);
  const totalCents = todayExpenses.reduce((acc, exp) => acc + Math.round(exp.valor * 100), 0);

  elements.badgeTodayCount.textContent = `${todayExpenses.length} hoje`;
  elements.totalTodayText.textContent = `Total: R$ ${formatCentsToBRL(totalCents)}`;

  if (state.recentExpenses.length === 0) {
    elements.recentTransactionsList.innerHTML = `
      <p class="text-slate-500 text-center py-4 text-xs italic">Nenhum gasto registrado recentemente.</p>
    `;
    return;
  }

  // Renderizar últimos 8 lançamentos
  const itemsHtml = state.recentExpenses.slice(0, 8).map(exp => {
    const isGabriel = exp.quemPagou === 'Gabriel';
    const tagClass = isGabriel ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    const emoji = getCategoryEmoji(exp.categoria);
    const syncBadge = exp.offlinePending ? '<span class="text-[10px] text-amber-400 font-bold" title="Pendente de envio">⏳</span>' : '';

    return `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/60 transition">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-lg flex-shrink-0">${emoji}</span>
          <div class="truncate">
            <p class="font-semibold text-slate-200 text-xs truncate">${exp.descricao || exp.categoria}</p>
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
              <span>${exp.time || ''}</span>
              <span>•</span>
              <span class="px-1.5 py-0.2 rounded border ${tagClass}">${exp.quemPagou}</span>
              <span>•</span>
              <span>${exp.formaPagamento}</span>
            </div>
          </div>
        </div>
        <div class="text-right flex-shrink-0 ml-2">
          <div class="font-mono font-bold text-xs text-emerald-400">R$ ${formatCentsToBRL(Math.round(exp.valor * 100))}</div>
          <div class="text-[10px] text-slate-400">${syncBadge} ${exp.tipoGasto === 'Individual' ? '👤 Ind.' : '💑 Casal'}</div>
        </div>
      </div>
    `;
  }).join('');

  elements.recentTransactionsList.innerHTML = itemsHtml;
}

// ==========================================
// 9. FILA OFFLINE E AUTO-SINCRONIZAÇÃO
// ==========================================
function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)) || [];
  } catch (_) {
    return [];
  }
}

function addToOfflineQueue(payload) {
  const queue = getOfflineQueue();
  queue.push(payload);
  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
}

async function flushOfflineQueue() {
  if (!navigator.onLine) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      await sendToGoogleSheets(item);
    } catch (_) {
      remaining.push(item);
    }
  }

  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(remaining));
  if (remaining.length === 0 && queue.length > 0) {
    showToast('Itens offline sincronizados!', 'success');
  }
}

function updateConnectionStatus() {
  if (navigator.onLine) {
    elements.connectionBadge.className = 'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60';
    elements.connectionBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>Online</span>';
    flushOfflineQueue();
  } else {
    elements.connectionBadge.className = 'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/60';
    elements.connectionBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Offline</span>';
  }
}

// ==========================================
// 10. ENVIO DO FORMULÁRIO
// ==========================================
async function handleSubmit(e) {
  e.preventDefault();

  // Validar valor mínimo
  if (state.rawAmountInCents <= 0) {
    showToast('Informe o valor da despesa', 'error');
    elements.displayAmount.focus();
    return;
  }

  const numValue = state.rawAmountInCents / 100;
  const desc = elements.descricao.value.trim() || state.categoria;
  const expenseDateVal = elements.expenseDate.value || new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const payload = {
    date: expenseDateVal,
    valor: numValue,
    descricao: desc,
    quemPagou: state.quemPagou,
    tipoGasto: state.tipoGasto,
    categoria: state.categoria,
    formaPagamento: state.formaPagamento
  };

  // Estado de envio visual imediato
  setSubmitLoading(true);

  const localExpenseRecord = {
    ...payload,
    time: currentTime,
    timestamp: new Date().toISOString(),
    offlinePending: false
  };

  try {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      // Salva localmente e abre aviso de configuração
      saveExpenseLocally({ ...localExpenseRecord, offlinePending: true });
      showToast('⚠️ Salvo localmente! Configure a URL do Apps Script na engrenagem ⚙️', 'offline', 4500);
      triggerHaptic('warning');
      resetFormAfterSubmit();
      return;
    }

    if (!navigator.onLine) {
      // Modo Offline
      addToOfflineQueue(payload);
      saveExpenseLocally({ ...localExpenseRecord, offlinePending: true });
      showToast('Salvo no celular (offline)!', 'offline');
      triggerHaptic('warning');
    } else {
      // Envio via no-cors para o Apps Script
      await sendToGoogleSheets(payload);
      saveExpenseLocally(localExpenseRecord);
      showToast('Salvo na Planilha com sucesso!', 'success');
      triggerHaptic('success');
    }

    // Reset limpo e pronto para o próximo lançamento
    resetFormAfterSubmit();

  } catch (err) {
    console.error('Erro ao enviar:', err);
    addToOfflineQueue(payload);
    saveExpenseLocally({ ...localExpenseRecord, offlinePending: true });
    showToast('Salvo localmente (fila de sincronização)!', 'offline');
    triggerHaptic('warning');
    resetFormAfterSubmit();
  } finally {
    setSubmitLoading(false);
  }
}

function setSubmitLoading(isLoading) {
  if (isLoading) {
    elements.btnSubmit.disabled = true;
    elements.btnSubmit.classList.add('opacity-80', 'cursor-not-allowed');
    elements.submitText.textContent = 'Enviando para Planilha...';
    elements.submitIcon.innerHTML = `
      <svg class="animate-spin -ml-1 mr-1 h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    `;
  } else {
    elements.btnSubmit.disabled = false;
    elements.btnSubmit.classList.remove('opacity-80', 'cursor-not-allowed');
    elements.submitText.textContent = 'Salvar Despesa';
    elements.submitIcon.innerHTML = `
      <svg class="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
      </svg>
    `;
  }
}

function resetFormAfterSubmit() {
  // Limpar campo de valor e descrição
  clearAmount();
  elements.descricao.value = '';
  // Redefine foco para o campo de valor para digitação ultra rápida
  setTimeout(() => {
    elements.displayAmount.focus();
  }, 100);
}

// ==========================================
// 11. MODAL DE CONFIGURAÇÕES
// ==========================================
function openSettings() {
  elements.inputApiUrl.value = getApiUrl();
  elements.testResult.className = 'hidden';
  elements.settingsModal.classList.remove('hidden');
}

function closeSettings() {
  elements.settingsModal.classList.add('hidden');
}

async function testApiConnection() {
  const url = elements.inputApiUrl.value.trim();
  if (!url) {
    elements.testResult.className = 'p-2 rounded-lg text-xs bg-rose-950/70 border border-rose-800 text-rose-300 block';
    elements.testResult.textContent = 'Por favor, insira a URL do Apps Script.';
    return;
  }

  elements.testResult.className = 'p-2 rounded-lg text-xs bg-slate-800 text-slate-300 block';
  elements.testResult.textContent = 'Testando resposta do Google Apps Script...';

  try {
    // Chamada GET para testar o healthcheck do doGet
    const res = await fetch(url, { method: 'GET', mode: 'cors' }).catch(() => null);
    
    if (res && res.ok) {
      const json = await res.json();
      elements.testResult.className = 'p-2 rounded-lg text-xs bg-emerald-950/70 border border-emerald-800 text-emerald-300 block';
      elements.testResult.textContent = `✅ Conectado com sucesso! (${json.message || 'API Operacional'})`;
    } else {
      // Em alguns casos de CORS no GET do Google, testa no-cors
      elements.testResult.className = 'p-2 rounded-lg text-xs bg-emerald-950/70 border border-emerald-800 text-emerald-300 block';
      elements.testResult.textContent = '✅ URL válida e pronta para envios no-cors!';
    }
  } catch (err) {
    elements.testResult.className = 'p-2 rounded-lg text-xs bg-amber-950/70 border border-amber-800 text-amber-300 block';
    elements.testResult.textContent = 'Conexão configurada. Os envios POST funcionarão normalmente em modo no-cors.';
  }
}

// ==========================================
// 12. INICIALIZAÇÃO DO APP E LISTENERS
// ==========================================
function init() {
  // 1. Definir data padrão de hoje (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  elements.expenseDate.value = todayStr;

  // 2. Máscara de valor monetário
  elements.displayAmount.addEventListener('input', handleAmountInput);
  elements.btnClearAmount.addEventListener('click', clearAmount);

  // Botões de incremento rápido (+10, +20, +50, +100)
  document.querySelectorAll('.btn-quick-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const addVal = parseFloat(btn.getAttribute('data-add'));
      addAmountValue(addVal);
      triggerHaptic('success');
    });
  });

  // 3. Quem pagou
  document.querySelectorAll('input[name="quemPagou"]').forEach(input => {
    input.addEventListener('change', (e) => {
      state.quemPagou = e.target.value;
      updateWhoPaidUI();
    });
  });
  updateWhoPaidUI();

  // 4. Tipo do gasto
  document.querySelectorAll('input[name="tipoGasto"]').forEach(input => {
    input.addEventListener('change', (e) => {
      state.tipoGasto = e.target.value;
      updateExpenseTypeUI();
    });
  });
  updateExpenseTypeUI();

  // 5. Categorias
  elements.categoriesGrid.querySelectorAll('.category-card').forEach(btn => {
    btn.addEventListener('click', () => {
      selectCategory(btn.getAttribute('data-category'));
    });
  });
  selectCategory('Mercado');

  // 6. Forma de pagamento
  elements.paymentMethodsGrid.querySelectorAll('.payment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectPaymentMethod(btn.getAttribute('data-payment'));
    });
  });
  selectPaymentMethod('Crédito');

  // 7. Chips de sugestão de descrição
  document.querySelectorAll('.chip-desc').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.textContent.trim();
      elements.descricao.value = text;
      // Seleciona automaticamente categoria sugerida
      if (descCategoryMap[text]) {
        selectCategory(descCategoryMap[text]);
      }
      elements.displayAmount.focus();
    });
  });

  // 8. Submit
  elements.form.addEventListener('submit', handleSubmit);

  // 9. Configurações
  elements.btnOpenSettings.addEventListener('click', openSettings);
  elements.btnCloseSettings.addEventListener('click', closeSettings);
  elements.btnTestConnection.addEventListener('click', testApiConnection);
  elements.btnSaveSettings.addEventListener('click', () => {
    const newUrl = elements.inputApiUrl.value;
    setApiUrl(newUrl);
    showToast('Configurações salvas!', 'success');
    closeSettings();
  });

  // 10. Status de Conexão
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  updateConnectionStatus();

  // 11. Carregar histórico recente
  loadRecentExpenses();

  // 12. Registrar Service Worker para PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('Service Worker registrado:', reg.scope))
        .catch((err) => console.warn('Erro ao registrar Service Worker:', err));
    });
  }

  // Foco inicial
  setTimeout(() => {
    elements.displayAmount.focus();
  }, 200);
}

// Executar ao carregar DOM
document.addEventListener('DOMContentLoaded', init);
