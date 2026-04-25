const TOKENS = [
  { id: 'solana', symbol: 'SOL', name: 'Solana', logoUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', logoUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', logoUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', logoUrl: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', logoUrl: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', logoUrl: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', logoUrl: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
  { id: 'sui', symbol: 'SUI', name: 'Sui', logoUrl: 'https://assets.coingecko.com/coins/images/26375/large/sui_asset.jpeg' }
];

const SWAP_TARGETS = [
  { id: 'fiat-usd', symbol: 'USD', name: 'US Dollar', type: 'fiat' },
  { id: 'fiat-aud', symbol: 'AUD', name: 'Australian Dollar', type: 'fiat' },
  ...TOKENS.map((token) => ({ ...token, type: 'token' }))
];

const TOKENS_BY_ID = Object.fromEntries(TOKENS.map((token) => [token.id, token]));
const SWAP_TARGETS_BY_ID = Object.fromEntries(SWAP_TARGETS.map((asset) => [asset.id, asset]));
const STORAGE_KEY = 'shadow-wallet-state';
const PRICE_KEY = 'shadow-wallet-prices';
const REFRESH_MS = 60_000;

const dom = {
  totalBalance: document.getElementById('totalBalance'),
  totalChangeUsd: document.getElementById('totalChangeUsd'),
  totalChangePct: document.getElementById('totalChangePct'),
  syncLabel: document.getElementById('syncLabel'),
  assetsSubtitle: document.getElementById('assetsSubtitle'),
  accountSwitcherButton: document.getElementById('accountSwitcherButton'),
  accountEmoji: document.getElementById('accountEmoji'),
  accountName: document.getElementById('accountName'),
  tokenList: document.getElementById('tokenList'),
  activityList: document.getElementById('activityList'),
  modalRoot: document.getElementById('modalRoot'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  modalTitle: document.getElementById('modalTitle'),
  modalSubtitle: document.getElementById('modalSubtitle'),
  closeModalButton: document.getElementById('closeModalButton'),
  buyBackButton: document.getElementById('buyBackButton'),
  sheetToast: document.getElementById('sheetToast'),
  accountView: document.getElementById('accountView'),
  accountList: document.getElementById('accountList'),
  createAccountForm: document.getElementById('createAccountForm'),
  accountNameInput: document.getElementById('accountNameInput'),
  accountEmojiInput: document.getElementById('accountEmojiInput'),
  buyFlow: document.getElementById('buyFlow'),
  buyPickerView: document.getElementById('buyPickerView'),
  buyDetailForm: document.getElementById('buyDetailForm'),
  buySearchInput: document.getElementById('buySearchInput'),
  featuredTokenGrid: document.getElementById('featuredTokenGrid'),
  buyTokenList: document.getElementById('buyTokenList'),
  buyTokenHero: document.getElementById('buyTokenHero'),
  buyAccountChip: document.getElementById('buyAccountChip'),
  buyUnitPills: document.getElementById('buyUnitPills'),
  buyAmountInput: document.getElementById('buyAmountInput'),
  buyQuote: document.getElementById('buyQuote'),
  buyReceive: document.getElementById('buyReceive'),
  buyCancelButton: document.getElementById('buyCancelButton'),
  swapForm: document.getElementById('swapForm'),
  swapPickerView: document.getElementById('swapPickerView'),
  swapDetailView: document.getElementById('swapDetailView'),
  swapSearchInput: document.getElementById('swapSearchInput'),
  swapFromList: document.getElementById('swapFromList'),
  swapToList: document.getElementById('swapToList'),
  swapHero: document.getElementById('swapHero'),
  swapAccountChip: document.getElementById('swapAccountChip'),
  swapFromLabel: document.getElementById('swapFromLabel'),
  swapToLabel: document.getElementById('swapToLabel'),
  swapAmountInput: document.getElementById('swapAmountInput'),
  swapReceiveLabel: document.getElementById('swapReceiveLabel'),
  swapAvailable: document.getElementById('swapAvailable'),
  sendForm: document.getElementById('sendForm'),
  sendHero: document.getElementById('sendHero'),
  sendAccountChip: document.getElementById('sendAccountChip'),
  sendAddressInput: document.getElementById('sendAddressInput'),
  openAddressBookButton: document.getElementById('openAddressBookButton'),
  sendTokenSelect: document.getElementById('sendTokenSelect'),
  sendAmountInput: document.getElementById('sendAmountInput'),
  sendPreviewLabel: document.getElementById('sendPreviewLabel'),
  sendAvailable: document.getElementById('sendAvailable'),
  receiveView: document.getElementById('receiveView'),
  receiveHero: document.getElementById('receiveHero'),
  receiveAddressButton: document.getElementById('receiveAddressButton'),
  qrCode: document.getElementById('qrCode'),
  marketView: document.getElementById('marketView'),
  marketList: document.getElementById('marketList'),
  addressBookView: document.getElementById('addressBookView'),
  addressBookList: document.getElementById('addressBookList'),
  refreshPricesButton: document.getElementById('refreshPricesButton'),
  settingsButton: document.getElementById('settingsButton'),
  settingsView: document.getElementById('settingsView'),
  wipeAccountsButton: document.getElementById('wipeAccountsButton'),
  copyAddressButton: document.getElementById('copyAddressButton'),
  openMarketsButton: document.getElementById('openMarketsButton')
};

const state = {
  wallet: null,
  prices: {},
  modal: null,
  syncStatus: 'Waiting for price sync',
  buyView: 'picker',
  selectedBuyTokenId: 'ethereum',
  buyUnit: 'usd',
  swapView: 'picker',
  selectedSwapFromId: null,
  selectedSwapToId: 'fiat-usd',
  addressBookContext: null,
  modalCloseTimer: null
};

function randomString(length) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

function createAddress() {
  return `Shadow${randomString(36)}`;
}

function createDefaultWallet() {
  const address = createAddress();
  const wallet = {
    accounts: [
      {
        id: `acct-${randomString(8)}`,
        name: 'Account 1',
        emoji: '🌘',
        address,
        qrPayload: address,
        fiatBalances: { usd: 0, aud: 0 },
        holdings: [],
        activity: []
      }
    ],
    currentAccountId: null,
    lastSynced: null
  };
  wallet.currentAccountId = wallet.accounts[0].id;
  return wallet;
}

function migrateWalletShape(rawWallet) {
  if (!rawWallet) {
    const nextWallet = createDefaultWallet();
    nextWallet.currentAccountId = nextWallet.accounts[0].id;
    return nextWallet;
  }

  if (Array.isArray(rawWallet.accounts) && rawWallet.accounts.length) {
    return {
      ...rawWallet,
      currentAccountId: rawWallet.currentAccountId || rawWallet.accounts[0].id
    };
  }

  const address = rawWallet.address || createAddress();
  return {
    accounts: [
      {
        id: `acct-${randomString(8)}`,
        name: 'Account 1',
        emoji: '🌘',
        address,
        qrPayload: rawWallet.qrPayload || address,
        fiatBalances: { usd: 0, aud: 0 },
        holdings: rawWallet.holdings || [],
        activity: rawWallet.activity || [],
      }
    ],
    currentAccountId: null,
    lastSynced: rawWallet.lastSynced || null
  };
}

function getCurrentAccount() {
  return (
    state.wallet.accounts.find((account) => account.id === state.wallet.currentAccountId) ||
    state.wallet.accounts[0]
  );
}

function ensureAccountBalances(account) {
  account.fiatBalances = {
    usd: account.fiatBalances?.usd || 0,
    aud: account.fiatBalances?.aud || 0,
  };
}

function getAccountById(accountId) {
  return state.wallet.accounts.find((account) => account.id === accountId) || null;
}

function getAddressBookEntries() {
  const current = getCurrentAccount();
  return state.wallet.accounts.filter((account) => account.id !== current.id);
}

function storageGet(key) {
  if (globalThis.chrome?.storage?.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => resolve(result[key]));
    });
  }
  return Promise.resolve(JSON.parse(localStorage.getItem(key) || 'null'));
}

function storageSet(values) {
  if (globalThis.chrome?.storage?.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set(values, resolve);
    });
  }
  Object.entries(values).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });
  return Promise.resolve();
}

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value >= 1 ? 2 : 4
  }).format(value);
}

function formatAud(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value >= 1 ? 2 : 4
  }).format(value);
}

function formatAmount(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  }).format(value);
}

function formatChange(value) {
  if (value == null) {
    return '--';
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function renderTokenVisual(token, className) {
  const safeName = escapeHtml(token.name);
  const initials = escapeHtml(token.symbol.slice(0, 4));
  return `
    <img class="${className}" src="${token.logoUrl}" alt="${safeName}" loading="lazy"
      onerror="this.replaceWith(createTokenBadge('${initials}', '${className.replace('logo', 'badge')}'))" />
  `;
}

function createTokenBadge(label, className = 'token-badge') {
  const badge = document.createElement('div');
  badge.className = className;
  badge.textContent = label;
  return badge;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function relativeSyncLabel(timestamp) {
  if (!timestamp) {
    return 'Waiting for price sync';
  }
  const diff = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const seconds = Math.round(diff / 1000);
  if (seconds < 10) return 'Synced just now';
  if (seconds < 60) return `Synced ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `Synced ${minutes}m ago`;
}

function sanitizeDecimal(value) {
  return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function animateIn(node, className) {
  if (!node) {
    return;
  }
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

function getHolding(tokenId) {
  return getCurrentAccount().holdings.find((holding) => holding.tokenId === tokenId) || null;
}

function getHoldingAmount(tokenId) {
  return getHolding(tokenId)?.amount || 0;
}

function getFiatBalance(currency) {
  const account = getCurrentAccount();
  ensureAccountBalances(account);
  return account.fiatBalances[currency] || 0;
}

function updateHolding(tokenId, delta) {
  const current = getHoldingAmount(tokenId);
  const next = current + delta;
  const account = getCurrentAccount();
  account.holdings = account.holdings
    .filter((holding) => holding.tokenId !== tokenId)
    .concat(next > 0 ? [{ tokenId, amount: next }] : []);
}

function updateFiatBalance(currency, delta) {
  const account = getCurrentAccount();
  ensureAccountBalances(account);
  account.fiatBalances[currency] = Math.max(0, (account.fiatBalances[currency] || 0) + delta);
}

function getAudPerUsd() {
  const pricedToken = Object.values(state.prices).find((price) => price?.usd && price?.aud);
  if (!pricedToken) {
    return 1.55;
  }
  return pricedToken.aud / pricedToken.usd;
}

function getAssetUsdPrice(assetId) {
  if (assetId === 'fiat-usd') {
    return 1;
  }
  if (assetId === 'fiat-aud') {
    return 1 / getAudPerUsd();
  }
  return state.prices[assetId]?.usd || 0;
}

function getPortfolioRows() {
  const tokenRows = getCurrentAccount().holdings
    .map((holding) => {
      const token = TOKENS_BY_ID[holding.tokenId];
      const price = state.prices[holding.tokenId];
      const usdValue = holding.amount * (price?.usd || 0);
      return {
        holding,
        token,
        usdValue,
        change24h: price?.change24h ?? null
      };
    })
  const fiatRows = [];
  const usdBalance = getFiatBalance('usd');
  const audBalance = getFiatBalance('aud');

  if (usdBalance > 0) {
    fiatRows.push({
      holding: { amount: usdBalance },
      token: { id: 'fiat-usd', symbol: 'USD', name: 'US Dollar', logoUrl: '' },
      usdValue: usdBalance,
      change24h: null,
      isFiat: true,
    });
  }

  if (audBalance > 0) {
    fiatRows.push({
      holding: { amount: audBalance },
      token: { id: 'fiat-aud', symbol: 'AUD', name: 'Australian Dollar', logoUrl: '' },
      usdValue: audBalance / getAudPerUsd(),
      change24h: null,
      isFiat: true,
    });
  }

  return [...tokenRows, ...fiatRows].sort((a, b) => b.usdValue - a.usdValue);
}

function getPortfolioSummary() {
  const rows = getPortfolioRows();
  const totalBalance = rows.reduce((sum, row) => sum + row.usdValue, 0);
  const totalChangeUsd = rows.reduce((sum, row) => {
    if (row.change24h == null) return sum;
    return sum + row.usdValue * (row.change24h / 100);
  }, 0);
  return {
    rows,
    totalBalance,
    totalChangeUsd,
    totalChangePct: totalBalance > 0 ? (totalChangeUsd / totalBalance) * 100 : 0
  };
}

function pushActivity(type, tokenId, amount, extra = {}) {
  const price = state.prices[tokenId]?.usd || 0;
  const account = getCurrentAccount();
  account.activity.unshift({
    id: `${Date.now()}-${randomString(6)}`,
    type,
    tokenId,
    amount,
    usdValue: amount * price,
    createdAt: new Date().toISOString(),
    ...extra
  });
  account.activity = account.activity.slice(0, 20);
}

function render() {
  const summary = getPortfolioSummary();
  const current = getCurrentAccount();
  dom.totalBalance.textContent = formatUsd(summary.totalBalance);
  dom.totalChangeUsd.textContent = summary.totalBalance === 0 ? '$0.00' : formatUsd(summary.totalChangeUsd);
  dom.totalChangeUsd.className = `balance-change ${summary.totalChangeUsd >= 0 ? 'positive' : 'negative'}`;
  dom.totalChangePct.textContent = summary.totalBalance === 0 ? '0.00%' : formatChange(summary.totalChangePct);
  dom.totalChangePct.className = `change-pill ${summary.totalChangePct >= 0 ? 'positive' : 'negative'}`;
  dom.syncLabel.textContent = state.syncStatus || relativeSyncLabel(state.wallet.lastSynced);
  dom.assetsSubtitle.textContent = `${current.holdings.length} holding${current.holdings.length === 1 ? '' : 's'}`;
  dom.accountEmoji.textContent = current.emoji || '🌘';
  dom.accountName.textContent = current.name || 'Account';

  renderTokens(summary.rows);
  renderActivity();
  renderMarketList();
  renderBuyPicker();
  renderAccounts();
  renderAddressBook();
  renderSwapPicker();
  updateFormOptions();
  updateBuyQuote();
  updateSwapQuote();
  renderReceiveAddress();
  renderFlowHeroes();
}

function getFilteredBuyTokens() {
  const query = dom.buySearchInput.value.trim().toLowerCase();
  if (!query) {
    return TOKENS;
  }
  return TOKENS.filter((token) =>
    token.name.toLowerCase().includes(query) || token.symbol.toLowerCase().includes(query),
  );
}

function renderTokens(rows) {
  if (!rows.length) {
    dom.tokenList.innerHTML = '<div class="empty">Your wallet is ready. Add an asset to start tracking balances and live prices.</div>';
    return;
  }

  dom.tokenList.innerHTML = rows.map((row) => `
    <article class="token-row">
      <div class="token-main">
        ${renderTokenVisual(row.token, 'token-logo')}
        <div>
          <div class="token-name">${escapeHtml(row.token.name)}</div>
          <div class="token-meta">${formatAmount(row.holding.amount)} ${row.token.symbol}</div>
        </div>
      </div>
      <div class="token-values">
        <div class="token-price">${formatUsd(row.usdValue)}</div>
        <div class="${row.change24h != null && row.change24h >= 0 ? 'positive' : 'negative'}">${formatChange(row.change24h)}</div>
      </div>
    </article>
  `).join('');
}

function renderActivity() {
  const activity = getCurrentAccount().activity;
  if (!activity.length) {
    dom.activityList.innerHTML = '<div class="empty">Activity will appear here as you buy, swap, and send assets.</div>';
    return;
  }

  dom.activityList.innerHTML = activity.map((item) => {
    const token = TOKENS_BY_ID[item.tokenId];
    const label = item.type === 'buy' ? 'Bought' : item.type === 'swap' ? 'Swapped' : 'Sent';
    const meta = item.type === 'send' && item.to ? `${formatAmount(item.amount)} ${token.symbol} to ${item.to.slice(0, 6)}...${item.to.slice(-4)}` : `${formatAmount(item.amount)} ${token.symbol}`;
    return `
      <article class="activity-item">
        <div class="activity-main">
          <div class="action-icon">
            <svg viewBox="0 0 24 24"><path d="M4 7h12"/><path d="m12 3 4 4-4 4"/><path d="M20 17H8"/><path d="m12 13-4 4 4 4"/></svg>
          </div>
          <div>
            <div class="activity-title">${label}</div>
            <div class="activity-meta">${meta}</div>
          </div>
        </div>
        <div class="activity-values">
          <div class="activity-value">${formatUsd(item.usdValue)}</div>
          <div class="activity-meta">${new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
        </div>
      </article>
    `;
  }).join('');
}

function renderAccounts() {
  const currentId = getCurrentAccount().id;
  dom.accountList.innerHTML = state.wallet.accounts.map((account) => `
    <button class="account-row ${account.id === currentId ? 'active' : ''}" type="button" data-account-id="${account.id}">
      <div class="account-main">
        <div class="account-emoji">${escapeHtml(account.emoji || '🌘')}</div>
        <div>
          <div class="market-name">${escapeHtml(account.name)}</div>
          <div class="market-meta">${account.address.slice(0, 8)}...${account.address.slice(-6)}</div>
        </div>
      </div>
      <div class="market-price">${formatUsd(
        account.holdings.reduce((sum, holding) => sum + holding.amount * (state.prices[holding.tokenId]?.usd || 0), 0)
        + (account.fiatBalances?.usd || 0)
        + ((account.fiatBalances?.aud || 0) / getAudPerUsd())
      )}</div>
    </button>
  `).join('');
}

function renderAddressBook() {
  const entries = getAddressBookEntries();
  dom.addressBookList.innerHTML = entries.length
    ? entries.map((account) => `
      <button class="market-item address-book-item" type="button" data-address-account-id="${account.id}">
        <div class="market-main">
          <div class="account-emoji">${escapeHtml(account.emoji || '🌘')}</div>
          <div>
            <div class="market-name">${escapeHtml(account.name)}</div>
            <div class="market-meta">${account.address}</div>
          </div>
        </div>
      </button>
    `).join('')
    : '<div class="empty">Create another account and it will appear here automatically.</div>';
}

function renderMarketList() {
  dom.marketList.innerHTML = TOKENS.map((token) => {
    const price = state.prices[token.id]?.usd || 0;
    const change = state.prices[token.id]?.change24h ?? null;
    return `
      <button class="market-item" data-token-id="${token.id}">
        <div class="market-main">
          ${renderTokenVisual(token, 'market-logo')}
          <div>
            <div class="market-name">${escapeHtml(token.name)}</div>
            <div class="market-meta">${token.symbol}</div>
          </div>
        </div>
        <div class="market-values">
          <div class="market-price">${formatUsd(price)}</div>
          <div class="${change != null && change >= 0 ? 'positive' : 'negative'}">${formatChange(change)}</div>
        </div>
      </button>
    `;
  }).join('');
}

function renderBuyPicker() {
  const featuredIds = ['solana', 'usd-coin'];
  const filtered = getFilteredBuyTokens();
  const featured = filtered.filter((token) => featuredIds.includes(token.id));
  const popular = filtered.filter((token) => !featuredIds.includes(token.id));

  dom.featuredTokenGrid.innerHTML = featured.length
    ? featured.map((token) => `
      <button class="featured-card" data-buy-token-id="${token.id}">
        ${renderTokenVisual(token, 'market-logo')}
        <div>
          <div class="featured-name">${escapeHtml(token.name)}</div>
          <div class="featured-symbol">${token.symbol}</div>
        </div>
      </button>
    `).join('')
    : '<div class="empty">No matching starter assets.</div>';

  dom.buyTokenList.innerHTML = popular.length
    ? popular.map((token) => {
      const price = state.prices[token.id]?.usd || 0;
      return `
        <button class="market-item" data-buy-token-id="${token.id}">
          <div class="market-main">
            ${renderTokenVisual(token, 'market-logo')}
            <div>
              <div class="market-name">${escapeHtml(token.name)}</div>
              <div class="market-meta">${token.symbol}</div>
            </div>
          </div>
          <div class="market-values">
            <div class="market-price">${formatUsd(price)}</div>
          </div>
        </button>
      `;
    }).join('')
    : '<div class="empty">No assets match your search.</div>';
}

function getSwapOwnedAssets() {
  const current = getCurrentAccount();
  const tokenAssets = current.holdings
    .filter((holding) => holding.amount > 0)
    .map((holding) => ({
      id: holding.tokenId,
      symbol: TOKENS_BY_ID[holding.tokenId].symbol,
      name: TOKENS_BY_ID[holding.tokenId].name,
      logoUrl: TOKENS_BY_ID[holding.tokenId].logoUrl,
      type: 'token',
      amount: holding.amount,
    }));

  const fiatAssets = [];
  if (getFiatBalance('usd') > 0) {
    fiatAssets.push({ id: 'fiat-usd', symbol: 'USD', name: 'US Dollar', logoUrl: '', type: 'fiat', amount: getFiatBalance('usd') });
  }
  if (getFiatBalance('aud') > 0) {
    fiatAssets.push({ id: 'fiat-aud', symbol: 'AUD', name: 'Australian Dollar', logoUrl: '', type: 'fiat', amount: getFiatBalance('aud') });
  }

  return [...tokenAssets, ...fiatAssets];
}

function getFilteredSwapTargets() {
  const query = dom.swapSearchInput.value.trim().toLowerCase();
  const base = SWAP_TARGETS.filter((asset) => asset.id !== state.selectedSwapFromId);
  if (!query) {
    return base;
  }
  return base.filter((asset) =>
    asset.name.toLowerCase().includes(query) || asset.symbol.toLowerCase().includes(query),
  );
}

function renderSwapPicker() {
  const owned = getSwapOwnedAssets();
  if (!state.selectedSwapFromId && owned.length) {
    state.selectedSwapFromId = owned[0].id;
  }

  dom.swapFromList.innerHTML = owned.length
    ? owned.map((asset) => `
      <button class="market-item ${asset.id === state.selectedSwapFromId ? 'selected-asset' : ''}" type="button" data-swap-from-id="${asset.id}">
        <div class="market-main">
          ${asset.type === 'fiat' ? '<div class="market-badge">' + escapeHtml(asset.symbol) + '</div>' : renderTokenVisual(asset, 'market-logo')}
          <div>
            <div class="market-name">${escapeHtml(asset.name)}</div>
            <div class="market-meta">${formatAmount(asset.amount)} ${asset.symbol}</div>
          </div>
        </div>
      </button>
    `).join('')
    : '<div class="empty">Add an asset first so there is something to swap from.</div>';

  const targets = getFilteredSwapTargets();
  dom.swapToList.innerHTML = targets.length
    ? targets.map((asset) => `
      <button class="market-item ${asset.id === state.selectedSwapToId ? 'selected-asset' : ''}" type="button" data-swap-to-id="${asset.id}">
        <div class="market-main">
          ${asset.type === 'fiat' ? '<div class="market-badge">' + escapeHtml(asset.symbol) + '</div>' : renderTokenVisual(asset, 'market-logo')}
          <div>
            <div class="market-name">${escapeHtml(asset.name)}</div>
            <div class="market-meta">${asset.symbol}</div>
          </div>
        </div>
        <div class="market-values">
          <div class="market-price">${asset.type === 'fiat' ? (asset.id === 'fiat-aud' ? formatAud(1) : formatUsd(1)) : formatUsd(state.prices[asset.id]?.usd || 0)}</div>
        </div>
      </button>
    `).join('')
    : '<div class="empty">No swap targets match your search.</div>';
}

function updateFormOptions() {
  const owned = getCurrentAccount().holdings.map((holding) => TOKENS_BY_ID[holding.tokenId]);
  const ownedOptions = owned.length
    ? owned.map((token) => `<option value="${token.id}">${token.name} (${token.symbol})</option>`).join('')
    : '<option value="">No assets available</option>';

  dom.sendTokenSelect.innerHTML = ownedOptions;
  updateSendAvailability();
}

function updateBuyQuote() {
  const tokenId = state.selectedBuyTokenId || TOKENS[0].id;
  const tokenPrice = state.prices[tokenId];
  const solPrice = state.prices.solana;
  const unit = state.buyUnit || 'usd';
  const token = TOKENS_BY_ID[tokenId];

  dom.buyUnitPills.querySelectorAll('[data-unit]').forEach((button) => {
    button.classList.toggle('active', button.dataset.unit === unit);
  });

  dom.buyTokenHero.innerHTML = `
    ${renderTokenVisual(token, 'token-logo')}
    <div class="buy-token-title">Buy ${escapeHtml(token.symbol)}</div>
    <div class="buy-token-subtitle">${escapeHtml(token.name)}</div>
  `;
  dom.buyAccountChip.textContent = `${getCurrentAccount().name} (${getCurrentAccount().address.slice(0, 6)}...${getCurrentAccount().address.slice(-4)})`;

  if (!tokenPrice) {
    dom.buyQuote.textContent = 'Unavailable';
    dom.buyReceive.textContent = `~0 ${token.symbol}`;
    return;
  }

  if (unit === 'aud') {
    dom.buyQuote.textContent = `${formatAud(tokenPrice.aud || 0)} / ${TOKENS_BY_ID[tokenId].symbol}`;
  } else if (unit === 'sol') {
    const tokenInSol = solPrice?.usd ? tokenPrice.usd / solPrice.usd : 0;
    dom.buyQuote.textContent = `${formatAmount(tokenInSol)} SOL / ${TOKENS_BY_ID[tokenId].symbol}`;
  } else {
    dom.buyQuote.textContent = `${formatUsd(tokenPrice.usd || 0)} / ${TOKENS_BY_ID[tokenId].symbol}`;
  }

  const amountValue = Number(dom.buyAmountInput.value);
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    dom.buyReceive.textContent = `~0 ${token.symbol}`;
    return;
  }

  let receiveAmount = 0;
  if (unit === 'aud') {
    receiveAmount = (tokenPrice.aud || 0) > 0 ? amountValue / tokenPrice.aud : 0;
  } else if (unit === 'sol') {
    if (solPrice?.usd && tokenPrice.usd) {
      receiveAmount = (amountValue * solPrice.usd) / tokenPrice.usd;
    }
  } else {
    receiveAmount = (tokenPrice.usd || 0) > 0 ? amountValue / tokenPrice.usd : 0;
  }

  dom.buyReceive.textContent = `~${formatAmount(receiveAmount)} ${token.symbol}`;
}

function updateSwapQuote() {
  const fromId = state.selectedSwapFromId;
  const toId = state.selectedSwapToId;
  if (!fromId || !toId) {
    dom.swapAvailable.textContent = 'Available 0';
    dom.swapReceiveLabel.textContent = '~0';
    return;
  }
  const fromAsset = SWAP_TARGETS_BY_ID[fromId];
  const toAsset = SWAP_TARGETS_BY_ID[toId];
  dom.swapFromLabel.textContent = `From: ${fromAsset.name} (${fromAsset.symbol})`;
  dom.swapToLabel.textContent = `To: ${toAsset.name} (${toAsset.symbol})`;
  const available = fromId === 'fiat-usd'
    ? getFiatBalance('usd')
    : fromId === 'fiat-aud'
      ? getFiatBalance('aud')
      : getHoldingAmount(fromId);
  dom.swapAvailable.textContent = `Available ${formatAmount(available)} ${fromAsset.symbol}`;

  const amount = Number(dom.swapAmountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    dom.swapReceiveLabel.textContent = `~0 ${toAsset.symbol}`;
    return;
  }

  const fromUsd = getAssetUsdPrice(fromId);
  const toUsd = getAssetUsdPrice(toId);
  const receive = fromUsd && toUsd ? (amount * fromUsd) / toUsd : 0;
  dom.swapReceiveLabel.textContent = `~${formatAmount(receive)} ${toAsset.symbol}`;
}

function updateSendAvailability() {
  const tokenId = dom.sendTokenSelect.value;
  if (!tokenId) {
    dom.sendAvailable.textContent = 'Available 0';
    dom.sendPreviewLabel.textContent = 'Ready to send';
    return;
  }
  const symbol = TOKENS_BY_ID[tokenId].symbol;
  dom.sendAvailable.textContent = `Available ${formatAmount(getHoldingAmount(tokenId))} ${symbol}`;
  const amount = Number(dom.sendAmountInput.value);
  dom.sendPreviewLabel.textContent = Number.isFinite(amount) && amount > 0 ? `Sending ~${formatAmount(amount)} ${symbol}` : 'Ready to send';
}

function renderFlowHeroes() {
  const current = getCurrentAccount();
  const swapAsset = SWAP_TARGETS_BY_ID[state.selectedSwapToId || state.selectedSwapFromId || state.selectedBuyTokenId];
  const sendToken = TOKENS_BY_ID[dom.sendTokenSelect.value || state.selectedBuyTokenId];

  if (swapAsset) {
    dom.swapHero.innerHTML = `
      ${swapAsset.type === 'fiat' ? '<div class="token-badge">' + escapeHtml(swapAsset.symbol) + '</div>' : renderTokenVisual(swapAsset, 'token-logo')}
      <div class="buy-token-title">Swap</div>
      <div class="buy-token-subtitle">${escapeHtml((SWAP_TARGETS_BY_ID[state.selectedSwapFromId]?.symbol || 'Choose') + ' to ' + swapAsset.symbol)}</div>
    `;
  }

  if (sendToken) {
    dom.sendHero.innerHTML = `
      ${renderTokenVisual(sendToken, 'token-logo')}
      <div class="buy-token-title">Send ${escapeHtml(sendToken.symbol)}</div>
      <div class="buy-token-subtitle">${escapeHtml(sendToken.name)}</div>
    `;
  }

  dom.swapAccountChip.textContent = `${current.name} (${current.address.slice(0, 6)}...${current.address.slice(-4)})`;
  dom.sendAccountChip.textContent = `${current.name} (${current.address.slice(0, 6)}...${current.address.slice(-4)})`;
  dom.receiveHero.innerHTML = `
    <div class="account-emoji">${escapeHtml(current.emoji || '🌘')}</div>
    <div class="buy-token-title">Receive</div>
    <div class="buy-token-subtitle">${escapeHtml(current.name)}</div>
  `;
}

function renderReceiveAddress() {
  dom.receiveAddressButton.textContent = getCurrentAccount().address;
}

function openModal(type) {
  state.modal = type;
  if (state.modalCloseTimer) {
    clearTimeout(state.modalCloseTimer);
    state.modalCloseTimer = null;
  }
  dom.modalRoot.classList.remove('hidden');
  requestAnimationFrame(() => {
    dom.modalRoot.classList.add('is-open');
  });
  dom.sheetToast.classList.add('hidden');
  dom.buyBackButton.classList.add('hidden');
  [dom.accountView, dom.settingsView, dom.buyFlow, dom.swapForm, dom.sendForm, dom.receiveView, dom.marketView, dom.addressBookView].forEach((node) => node.classList.add('hidden'));

  if (type === 'accounts') {
    dom.modalTitle.textContent = 'Accounts';
    dom.modalSubtitle.textContent = 'Switch wallets or create a new one.';
    dom.accountView.classList.remove('hidden');
    animateIn(dom.accountView, 'view-enter-up');
  } else if (type === 'settings') {
    dom.modalTitle.textContent = 'Settings';
    dom.modalSubtitle.textContent = 'Manage local Shadow wallet data.';
    dom.settingsView.classList.remove('hidden');
    animateIn(dom.settingsView, 'view-enter-up');
  } else if (type === 'buy') {
    state.buyView = 'picker';
    dom.modalTitle.textContent = 'Buy';
    dom.modalSubtitle.textContent = 'Choose an asset to add to your wallet.';
    dom.buyFlow.classList.remove('hidden');
    dom.buyPickerView.classList.remove('hidden');
    dom.buyDetailForm.classList.add('hidden');
    animateIn(dom.buyPickerView, 'view-enter-up');
  } else if (type === 'swap') {
    state.swapView = 'picker';
    dom.modalTitle.textContent = 'Swap';
    dom.modalSubtitle.textContent = 'Choose what you want to swap from and to.';
    dom.swapForm.classList.remove('hidden');
    animateIn(dom.swapForm, 'view-enter-up');
  } else if (type === 'send') {
    dom.modalTitle.textContent = 'Send assets';
    dom.modalSubtitle.textContent = 'Move assets to another wallet address.';
    dom.sendForm.classList.remove('hidden');
    animateIn(dom.sendForm, 'view-enter-up');
  } else if (type === 'receive') {
    dom.modalTitle.textContent = 'Receive assets';
    dom.modalSubtitle.textContent = 'Share your wallet address or scan the QR code.';
    dom.receiveView.classList.remove('hidden');
    animateIn(dom.receiveView, 'view-enter-up');
    drawQrCode();
  } else if (type === 'markets') {
    dom.modalTitle.textContent = 'Markets';
    dom.modalSubtitle.textContent = 'Track supported assets and open buy flow quickly.';
    dom.marketView.classList.remove('hidden');
    animateIn(dom.marketView, 'view-enter-up');
  } else if (type === 'addressBook') {
    dom.modalTitle.textContent = 'Address book';
    dom.modalSubtitle.textContent = 'Other Shadow accounts appear here automatically.';
    dom.addressBookView.classList.remove('hidden');
    animateIn(dom.addressBookView, 'view-enter-up');
  }
}

function closeModal() {
  state.modal = null;
  dom.modalRoot.classList.remove('is-open');
  state.modalCloseTimer = setTimeout(() => {
    dom.modalRoot.classList.add('hidden');
    state.modalCloseTimer = null;
  }, 260);
}

function showToast(message) {
  dom.sheetToast.textContent = message;
  dom.sheetToast.classList.remove('hidden');
}

function drawQrCode() {
  dom.qrCode.innerHTML = '';
  new QRCode(dom.qrCode, {
    text: getCurrentAccount().qrPayload,
    width: 212,
    height: 212,
    colorDark: '#111111',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

async function saveState() {
  await storageSet({
    [STORAGE_KEY]: state.wallet,
    [PRICE_KEY]: state.prices
  });
}

async function syncPrices({ silent = false } = {}) {
  try {
    const ids = TOKENS.map((token) => token.id).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,aud&include_24hr_change=true`,
      { headers: { accept: 'application/json' } }
    );
    if (!response.ok) {
      throw new Error(`Price request failed: ${response.status}`);
    }

    const payload = await response.json();
    TOKENS.forEach((token) => {
      state.prices[token.id] = {
        usd: payload[token.id]?.usd || 0,
        aud: payload[token.id]?.aud || 0,
        change24h: typeof payload[token.id]?.usd_24h_change === 'number' ? payload[token.id].usd_24h_change : null
      };
    });
    state.wallet.lastSynced = new Date().toISOString();
    state.syncStatus = relativeSyncLabel(state.wallet.lastSynced);
    await saveState();
    render();
    if (!silent) {
      showToast('Live prices updated.');
    }
  } catch (error) {
    state.syncStatus = state.wallet.lastSynced
      ? `${relativeSyncLabel(state.wallet.lastSynced)} - live price sync paused`
      : 'Price sync unavailable';
    render();
    if (!silent) {
      showToast('Unable to refresh prices right now.');
    }
  }
}

async function initialize() {
  const [wallet, prices] = await Promise.all([
    storageGet(STORAGE_KEY),
    storageGet(PRICE_KEY)
  ]);

  state.wallet = migrateWalletShape(wallet || createDefaultWallet());
  state.wallet.currentAccountId = state.wallet.currentAccountId || state.wallet.accounts[0].id;
  state.prices = prices || {};
  state.syncStatus = relativeSyncLabel(state.wallet.lastSynced);

  render();
  await saveState();
  await syncPrices({ silent: true });
  setInterval(() => {
    syncPrices({ silent: true });
  }, REFRESH_MS);
}

function openBuyDetail(tokenId) {
  state.selectedBuyTokenId = tokenId;
  state.buyView = 'detail';
  dom.modalTitle.textContent = `Buy ${TOKENS_BY_ID[tokenId].symbol}`;
  dom.modalSubtitle.textContent = 'Choose an amount and confirm instantly.';
  dom.buyBackButton.classList.remove('hidden');
  dom.buyPickerView.classList.add('hidden');
  dom.buyDetailForm.classList.remove('hidden');
  animateIn(dom.buyDetailForm, 'view-enter-side');
  dom.buyAmountInput.focus();
  updateBuyQuote();
}

function showBuyPicker() {
  state.buyView = 'picker';
  dom.modalTitle.textContent = 'Buy';
  dom.modalSubtitle.textContent = 'Choose an asset to add to your wallet.';
  dom.buyBackButton.classList.add('hidden');
  dom.buyPickerView.classList.remove('hidden');
  dom.buyDetailForm.classList.add('hidden');
  animateIn(dom.buyPickerView, 'view-enter-up');
}

function onBuySubmit(event) {
  event.preventDefault();
  const tokenId = state.selectedBuyTokenId;
  const amountInput = Number(dom.buyAmountInput.value);
  const unit = state.buyUnit || 'usd';
  const tokenPrice = state.prices[tokenId];
  const solPrice = state.prices.solana;

  if (!tokenId || !Number.isFinite(amountInput) || amountInput <= 0) {
    showToast('Enter a valid amount.');
    return;
  }

  if (!tokenPrice?.usd) {
    showToast('Price unavailable for this asset right now.');
    return;
  }

  let tokenAmount = 0;
  if (unit === 'aud') {
    if (!tokenPrice.aud) {
      showToast('AUD pricing is unavailable right now.');
      return;
    }
    tokenAmount = amountInput / tokenPrice.aud;
  } else if (unit === 'sol') {
    if (!solPrice?.usd) {
      showToast('SOL pricing is unavailable right now.');
      return;
    }
    tokenAmount = (amountInput * solPrice.usd) / tokenPrice.usd;
  } else {
    tokenAmount = amountInput / tokenPrice.usd;
  }

  if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
    showToast('Unable to calculate the asset amount.');
    return;
  }

  updateHolding(tokenId, tokenAmount);
  pushActivity('buy', tokenId, tokenAmount, { sourceUnit: unit, sourceAmount: amountInput });
  dom.buyAmountInput.value = '';
  saveState().then(render);
  showToast(`${formatAmount(tokenAmount)} ${TOKENS_BY_ID[tokenId].symbol} added.`);
}

function onSwapSubmit(event) {
  event.preventDefault();
  const fromId = state.selectedSwapFromId;
  const toId = state.selectedSwapToId;
  const amount = Number(dom.swapAmountInput.value);
  if (!fromId || !toId) {
    showToast('Choose both swap assets.');
    return;
  }
  const available = fromId === 'fiat-usd'
    ? getFiatBalance('usd')
    : fromId === 'fiat-aud'
      ? getFiatBalance('aud')
      : getHoldingAmount(fromId);
  if (fromId === toId) {
    showToast('Choose a different asset to receive.');
    return;
  }
  if (!fromId) {
    showToast('Add an asset first.');
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast('Enter a valid amount.');
    return;
  }
  if (amount > available) {
    showToast(`Only ${formatAmount(available)} ${SWAP_TARGETS_BY_ID[fromId].symbol} available.`);
    return;
  }

  const fromUsd = getAssetUsdPrice(fromId);
  const toUsd = getAssetUsdPrice(toId);
  if (!fromUsd || !toUsd) {
    showToast('Swap pricing is unavailable right now.');
    return;
  }

  const receiveAmount = (amount * fromUsd) / toUsd;

  if (fromId === 'fiat-usd') {
    updateFiatBalance('usd', -amount);
  } else if (fromId === 'fiat-aud') {
    updateFiatBalance('aud', -amount);
  } else {
    updateHolding(fromId, -amount);
  }

  if (toId === 'fiat-usd') {
    updateFiatBalance('usd', receiveAmount);
  } else if (toId === 'fiat-aud') {
    updateFiatBalance('aud', receiveAmount);
  } else {
    updateHolding(toId, receiveAmount);
  }

  pushActivity('swap', fromId, amount, { toAssetId: toId, receiveAmount });
  dom.swapAmountInput.value = '';
  saveState().then(render);
  showToast(`${formatAmount(amount)} ${SWAP_TARGETS_BY_ID[fromId].symbol} swapped to ${formatAmount(receiveAmount)} ${SWAP_TARGETS_BY_ID[toId].symbol}.`);
}

function onSendSubmit(event) {
  event.preventDefault();
  const tokenId = dom.sendTokenSelect.value;
  const address = dom.sendAddressInput.value.trim();
  const amount = Number(dom.sendAmountInput.value);
  const available = getHoldingAmount(tokenId);
  if (!address) {
    showToast('Enter a wallet address.');
    return;
  }
  if (!tokenId) {
    showToast('Add an asset first.');
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast('Enter a valid amount.');
    return;
  }
  if (amount > available) {
    showToast(`Only ${formatAmount(available)} ${TOKENS_BY_ID[tokenId].symbol} available.`);
    return;
  }

  updateHolding(tokenId, -amount);
  pushActivity('send', tokenId, amount, { to: address });
  dom.sendAddressInput.value = '';
  dom.sendAmountInput.value = '';
  saveState().then(render);
  showToast(`${formatAmount(amount)} ${TOKENS_BY_ID[tokenId].symbol} sent.`);
}

async function copyAddress() {
  try {
    await navigator.clipboard.writeText(getCurrentAccount().address);
    showToast('Wallet address copied.');
  } catch {
    showToast('Unable to copy address.');
  }
}

function createAccount(event) {
  event.preventDefault();
  const name = dom.accountNameInput.value.trim() || `Account ${state.wallet.accounts.length + 1}`;
  const emoji = dom.accountEmojiInput.value.trim() || '🌘';
  const address = createAddress();
  const account = {
    id: `acct-${randomString(8)}`,
    name,
    emoji,
    address,
    qrPayload: address,
    holdings: [],
    activity: []
  };
  state.wallet.accounts.push(account);
  state.wallet.currentAccountId = account.id;
  dom.accountNameInput.value = '';
  dom.accountEmojiInput.value = '';
  saveState().then(render);
  showToast(`${name} created.`);
}

function wipeAllAccounts() {
  state.wallet = createDefaultWallet();
  state.syncStatus = relativeSyncLabel(state.wallet.lastSynced);
  state.buyView = 'picker';
  state.selectedBuyTokenId = 'ethereum';
  state.buyUnit = 'usd';
  state.swapView = 'picker';
  state.selectedSwapFromId = null;
  state.selectedSwapToId = 'fiat-usd';
  state.addressBookContext = null;
  dom.buyAmountInput.value = '';
  dom.swapAmountInput.value = '';
  dom.sendAmountInput.value = '';
  dom.sendAddressInput.value = '';
  dom.buySearchInput.value = '';
  dom.swapSearchInput.value = '';
  saveState().then(() => {
    render();
    closeModal();
    showToast('All accounts wiped.');
  });
}

document.querySelectorAll('[data-modal]').forEach((button) => {
  button.addEventListener('click', () => openModal(button.dataset.modal));
});

dom.accountSwitcherButton.addEventListener('click', () => openModal('accounts'));
dom.settingsButton.addEventListener('click', () => openModal('settings'));
dom.modalBackdrop.addEventListener('click', closeModal);
dom.closeModalButton.addEventListener('click', closeModal);
dom.buyBackButton.addEventListener('click', showBuyPicker);
dom.createAccountForm.addEventListener('submit', createAccount);
dom.wipeAccountsButton.addEventListener('click', wipeAllAccounts);
dom.buyDetailForm.addEventListener('submit', onBuySubmit);
dom.swapForm.addEventListener('submit', onSwapSubmit);
dom.sendForm.addEventListener('submit', onSendSubmit);
dom.buyCancelButton.addEventListener('click', showBuyPicker);
dom.sendTokenSelect.addEventListener('change', () => {
  updateSendAvailability();
  renderFlowHeroes();
});
dom.buySearchInput.addEventListener('input', renderBuyPicker);
dom.swapSearchInput.addEventListener('input', renderSwapPicker);
dom.buyUnitPills.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }
  const button = event.target.closest('[data-unit]');
  if (!button) {
    return;
  }
  state.buyUnit = button.dataset.unit;
  updateBuyQuote();
});
dom.buyAmountInput.addEventListener('input', () => {
  dom.buyAmountInput.value = sanitizeDecimal(dom.buyAmountInput.value);
  updateBuyQuote();
});
dom.swapAmountInput.addEventListener('input', () => {
  dom.swapAmountInput.value = sanitizeDecimal(dom.swapAmountInput.value);
  updateSwapQuote();
});
dom.sendAmountInput.addEventListener('input', () => {
  dom.sendAmountInput.value = sanitizeDecimal(dom.sendAmountInput.value);
  updateSendAvailability();
});
dom.receiveAddressButton.addEventListener('click', copyAddress);
dom.copyAddressButton.addEventListener('click', copyAddress);
dom.refreshPricesButton.addEventListener('click', () => syncPrices());
dom.openMarketsButton.addEventListener('click', () => openModal('markets'));
dom.openAddressBookButton.addEventListener('click', () => {
  state.addressBookContext = 'send';
  openModal('addressBook');
});
dom.accountList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('[data-account-id]');
  if (!button) return;
  state.wallet.currentAccountId = button.dataset.accountId;
  saveState().then(render);
  closeModal();
});
dom.marketList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }
  const button = event.target.closest('[data-token-id]');
  if (!button) return;
  openModal('buy');
  openBuyDetail(button.dataset.tokenId);
});
dom.addressBookList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('[data-address-account-id]');
  if (!button) return;
  const account = getAccountById(button.dataset.addressAccountId);
  if (!account) return;
  dom.sendAddressInput.value = account.address;
  updateSendAvailability();
  openModal('send');
});
dom.featuredTokenGrid.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }
  const button = event.target.closest('[data-buy-token-id]');
  if (!button) return;
  openBuyDetail(button.dataset.buyTokenId);
});
dom.swapFromList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('[data-swap-from-id]');
  if (!button) return;
  state.selectedSwapFromId = button.dataset.swapFromId;
  if (state.selectedSwapToId === state.selectedSwapFromId) {
    state.selectedSwapToId = SWAP_TARGETS.find((asset) => asset.id !== state.selectedSwapFromId)?.id || 'fiat-usd';
  }
  renderSwapPicker();
  updateSwapQuote();
  renderFlowHeroes();
});
dom.swapToList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('[data-swap-to-id]');
  if (!button) return;
  state.selectedSwapToId = button.dataset.swapToId;
  renderSwapPicker();
  updateSwapQuote();
  renderFlowHeroes();
});
dom.buyTokenList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }
  const button = event.target.closest('[data-buy-token-id]');
  if (!button) return;
  openBuyDetail(button.dataset.buyTokenId);
});
document.querySelectorAll('.quick-chip').forEach((button) => {
  button.addEventListener('click', () => {
    const value = button.dataset.amount || '0';
    state.buyUnit = 'usd';
    dom.buyAmountInput.value = value;
    updateBuyQuote();
  });
});

initialize();
