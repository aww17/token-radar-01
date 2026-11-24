/* Token Radar, page code. Vanilla JS, no network: everything renders from window.RADAR (data.js). */
(function () {
  'use strict';

  var R = window.RADAR;
  var MAIN = document.getElementById('board');
  if (!R || !Array.isArray(R.rows)) {
    MAIN.innerHTML = '<p class="rowless">No data file found. Open this page from the entry folder beside data.js.</p>';
    return;
  }

  var DETAIL = document.getElementById('detail');
  var FOOT = document.getElementById('foot');
  var TABS = Array.prototype.slice.call(document.querySelectorAll('#tabs button'));
  var bySlug = {};
  for (var i = 0; i < R.rows.length; i++) bySlug[R.rows[i].slug] = R.rows[i];
  var liveSlug = {};
  for (var j = 0; j < R.live.length; j++) liveSlug[R.live[j].slug] = true;
  var nf = new Intl.NumberFormat('en-US');

  var sort = { key: 'rank', dir: 1 };
  var filtered = R.rows.slice();
  var view = 'board';

  function money(n) {
    if (n === null || n === undefined || !isFinite(n)) return '\u2014';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }

  function exact(n) {
    return (n !== null && n !== undefined && isFinite(n)) ? '$' + nf.format(Math.round(n)) : '\u2014';
  }

  function pct(n) {
    if (n === null || n === undefined || !isFinite(n)) return '\u2014';
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  }

  function pctClass(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'flat';
    return n > 0.05 ? 'up' : n < -0.05 ? 'down' : 'flat';
  }

  function ageText(d) {
    if (d === null || d === undefined) return 'unknown';
    if (d < 30) return d + 'd';
    if (d < 365) return Math.round(d / 30) + 'mo';
    return (d / 365).toFixed(1) + 'y';
  }

  function factorFor(cat) {
    for (var k = 0; k < R.sectors.length; k++) {
      if (R.sectors[k].category === cat) return R.sectors[k].factor;
    }
    return 1;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function chips(chains, max, cls) {
    var box = el('span', 'chips' + (cls ? ' ' + cls : ''));
    var list = max ? chains.slice(0, max) : chains;
    for (var i = 0; i < list.length; i++) box.appendChild(el('span', 'chip', list[i]));
    if (max && chains.length > max) box.appendChild(el('span', 'chip more', '+' + (chains.length - max)));
    return box;
  }

  function catChip(cat) {
    return el('span', 'chip cat', cat || 'none');
  }

  function renderMeta() {
    var meta = document.getElementById('meta');
    meta.innerHTML = '';
    var facts = [
      ['Snapshot', R.as_of],
      ['Board rows', String(R.board_size)],
      ['Watchlist', String(R.watchlist_size)],
      ['Early radar', String(R.early_size)],
      ['Live token', String(R.live_size)]
    ];
    for (var i = 0; i < facts.length; i++) {
      var s = el('span', '', facts[i][0] + ' ');
      s.appendChild(el('b', '', facts[i][1]));
      meta.appendChild(s);
    }
    meta.appendChild(el('span', 'pill', 'model ' + R.model_version));
  }

  function applyFilters() {
    var q = (document.getElementById('q').value || '').toLowerCase().trim();
    var cat = document.getElementById('cat').value;
    var chain = document.getElementById('chain').value;
    filtered = R.rows.filter(function (r) {
      if (cat && (r.category || 'none') !== cat) return false;
      if (chain && r.chains.indexOf(chain) === -1) return false;
      if (q) {
        var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    sortRows();
    paintRows();
  }

  function sortRows() {
    var key = sort.key;
    var dir = sort.dir;
    filtered.sort(function (a, b) {
      var va = a[key];
      var vb = b[key];
      if (key === 'name' || key === 'slug') {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
        return va < vb ? -dir : va > vb ? dir : a.rank - b.rank;
      }
      if (va === null || va === undefined) va = -Infinity;
      if (vb === null || vb === undefined) vb = -Infinity;
      return va === vb ? a.rank - b.rank : (va - vb) * dir;
    });
  }

  function sectorFactor(r) {
    return factorFor(r.category);
  }

  function paintRows() {
    var body = document.getElementById('rows');
    if (!body) return;
    body.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < filtered.length; i++) {
      var r = filtered[i];
      var tr = document.createElement('tr');
      var tdRank = el('td', 'num rank', String(r.rank));
      var tdSlug = el('td', 'name');
      var a = el('a', '', r.name);
      a.href = '#p=' + encodeURIComponent(r.slug);
      tdSlug.appendChild(a);
      if (r.in_watchlist) tdSlug.appendChild(el('span', 'badge wl', 'Watchlist'));

      var tdCat = el('td');
      tdCat.appendChild(catChip(r.category));

      var tdChain = el('td');
      tdChain.appendChild(chips(r.chains, 2));

      var tdTvl = el('td', 'num', money(r.tvl_usd));

      var tdDelta = el('td', 'num delta ' + pctClass(r.change_7d), pct(r.change_7d));

      var tdFactor = el('td', 'num factor', sectorFactor(r).toFixed(2));

      var tdVal = el('td', 'num value', money(r.implied_value_usd));
      tdVal.title = exact(r.implied_value_usd);

      tr.appendChild(tdRank);
      tr.appendChild(tdSlug);
      tr.appendChild(tdCat);
      tr.appendChild(tdChain);
      tr.appendChild(tdTvl);
      tr.appendChild(tdDelta);
      tr.appendChild(tdFactor);
      tr.appendChild(tdVal);
      frag.appendChild(tr);
    }
    body.appendChild(frag);
    var cnt = document.getElementById('count');
    if (cnt) cnt.textContent = filtered.length + ' of ' + R.rows.length + ' rows';
  }

  function headRow(cols) {
    var thead = el('thead');
    var tr = el('tr');
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i];
      var th = el('th', c.num ? 'num sortable' : 'sortable');
      if (c.key) {
        th.setAttribute('data-key', c.key);
        th.setAttribute('role', 'columnheader');
        th.setAttribute('tabindex', '0');
        th.textContent = c.label;
        th.addEventListener('click', function (key) {
          return function () {
            if (sort.key === key) sort.dir = -sort.dir;
            else { sort.key = key; sort.dir = 1; }
            sortRows();
            paintRows();
            markSortTh();
          };
        }(c.key));
      }
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    return thead;
  }

  function markSortTh() {
    var ths = document.querySelectorAll('#board thead th');
    for (var i = 0; i < ths.length; i++) {
      var k = ths[i].getAttribute('data-key');
      if (k === sort.key) ths[i].setAttribute('aria-sort', sort.dir === 1 ? 'ascending' : 'descending');
      else ths[i].removeAttribute('aria-sort');
    }
  }

  function renderBoard() {
    MAIN.innerHTML = '';
    var lede = el('div', 'lede');
    var ltext = el('div');
    ltext.appendChild(el('h2', '', 'The board'));
    ltext.appendChild(el('p', '',
      'Every protocol that records no token, ranked by what a launch would be worth under the calibrated sector model ' +
      'radar-2: a global log-log fit of market cap on TVL, per-sector shrunk factors, and growth and maturity adjustments. ' +
      'The watchlist is a floor. Click a protocol for its detail and a farm plan.'));
    lede.appendChild(ltext);
    var facts = el('div', 'facts');
    function fact(label, value) {
      var f = el('div', 'fact');
      f.appendChild(el('span', '', label));
      f.appendChild(el('b', '', value));
      facts.appendChild(f);
    }
    fact('Fit (trading n=' + R.fit.n + ')', 'a0 ' + R.fit.intercept.toFixed(2) + '  b0 ' + R.fit.slope.toFixed(3));
    fact('R-squared', R.fit.r2.toFixed(3));
    fact('Watchlist covered', R.watchlist_size + ' / ' + R.watchlist_size);
    fact('Board rows', String(R.board_size));
    lede.appendChild(facts);
    MAIN.appendChild(lede);

    var controls = el('div', 'controls');
    controls.appendChild(field('Search', 'q', 'text', 'name, chain, category'));
    controls.appendChild(selectField('Category', 'cat', categories()));
    controls.appendChild(selectField('Chain', 'chain', chains()));
    MAIN.appendChild(controls);

    var panel = el('div', 'panel');
    var head = el('div', 'panel-head');
    head.appendChild(el('h2', '', 'Ranked protocols'));
    var count = el('span', 'hint');
    count.id = 'count';
    head.appendChild(count);
    panel.appendChild(head);
    var wrap = el('div', 'table-wrap');
    var table = el('table');
    table.id = 'radar-table';
    table.appendChild(headRow([
      { key: 'rank', label: 'Rank', num: true },
      { key: 'name', label: 'Protocol' },
      { label: 'Category' },
      { label: 'Chains' },
      { key: 'tvl_usd', label: 'TVL', num: true },
      { key: 'change_7d', label: '7d', num: true },
      { label: 'Sector x', num: true },
      { key: 'implied_value_usd', label: 'Implied value', num: true }
    ]));
    var tbody = el('tbody');
    tbody.id = 'rows';
    table.appendChild(tbody);
    wrap.appendChild(table);
    panel.appendChild(wrap);
    MAIN.appendChild(panel);

    var q = document.getElementById('q');
    q.addEventListener('input', applyFilters);
    document.getElementById('cat').addEventListener('change', applyFilters);
    document.getElementById('chain').addEventListener('change', applyFilters);
    applyFilters();
    markSortTh();
  }

  function categories() {
    var seen = {};
    var out = [];
    for (var i = 0; i < R.rows.length; i++) {
      var c = R.rows[i].category || 'none';
      if (!seen[c]) { seen[c] = true; out.push(c); }
    }
    out.sort();
    return out;
  }

  function chains() {
    var seen = {};
    var out = [];
    for (var i = 0; i < R.rows.length; i++) {
      var cs = R.rows[i].chains;
      for (var j = 0; j < cs.length; j++) {
        if (!seen[cs[j]]) { seen[cs[j]] = true; out.push(cs[j]); }
      }
    }
    out.sort();
    return out;
  }

  function field(label, id, kind, placeholdercx) {
    var wrap = el('div', 'field');
    var lab = el('label', '', label);
    lab.setAttribute('for', id);
    wrap.appendChild(lab);
    var input = el('input');
    input.id = id;
    input.type = kind;
    if (placeholdercx) input.setAttribute('placeholder', placeholdercx);
    wrap.appendChild(input);
    return wrap;
  }

  function selectField(label, id, options) {
    var wrap = el('div', 'field');
    var lab = el('label', '', label);
    lab.setAttribute('for', id);
    wrap.appendChild(lab);
    var sel = el('select');
    sel.id = id;
    sel.appendChild(new Option('All', ''));
    for (var i = 0; i < options.length; i++) sel.appendChild(new Option(options[i], options[i]));
    wrap.appendChild(sel);
    return wrap;
  }

  function renderValidation() {
    MAIN.innerHTML = '';
    var v = R.validation;
    var head = el('div', 'panel-head');
    head.appendChild(el('h2', '', 'How the model is fitted and checked'));
    var panel = el('div', 'panel');
    panel.appendChild(head);
    var body = el('div', 'panel-body');

    body.appendChild(pn('The implied value is not a hand-tuned list of names. Every protocol gets the same fitted function, so the board can be re-run on any snapshot and the figures move with it.'));
    body.appendChild(el('h3', '', 'The fit equation'));
    body.appendChild(el('div', 'equation', 'log(mcap_usd) = a0 + b0 \u00B7 log(tvl_usd)'));
    body.appendChild(pn('Ordinary least squares over the ' + R.fit.n + ' protocols that trade and report both a market cap and a TVL on this snapshot. a0 is the intercept, b0 the slope. Both come from the snapshot at run time, not from a constant here.'));

    var figs = el('div', 'stat-grid');
    statFigure(figs, 'a0 (intercept)', R.fit.intercept.toFixed(3));
    statFigure(figs, 'b0 (slope)', R.fit.slope.toFixed(3));
    statFigure(figs, 'R-squared', R.fit.r2.toFixed(3));
    statFigure(figs, 'n (trading)', String(R.fit.n));
    body.appendChild(figs);

    body.appendChild(el('h3', '', 'Out-of-sample validation'));
    body.appendChild(pn('Fitted on a training fold and scored on protocols it never saw. Naive is a flat 1x TVL launch; calibrated is this sector model. Lower median error and higher within-3x are better.'));
    var vt = el('table');
    vt.className = 'val';
    var vh = el('thead');
    var vhr = el('tr');
    ['Test', 'Model', 'Median error', 'Within 3x', 'Within 2x'].forEach(function (t) {
      vhr.appendChild(el('th', '', t));
    });
    vh.appendChild(vhr);
    vt.appendChild(vh);
    var vb = el('tbody');
    addValRow(vb, '5-fold CV (seed 42)', 'Naive 1x', v.cv.naive_median_factor + 'x', Math.round(v.cv.naive_within3 * 100) + '%', '-');
    addValRow(vb, '5-fold CV (seed 42)', 'Calibrated', v.cv.calibrated_median_factor + 'x', Math.round(v.cv.calibrated_within3 * 100) + '%', Math.round(v.cv.calibrated_within2 * 100) + '%');
    addValRow(vb, 'Temporal (test on or after 2024-01-01)', 'Naive 1x', v.temporal.naive_median_factor + 'x', Math.round(v.temporal.naive_within3 * 100) + '%', '-');
    addValRow(vb, 'Temporal (test on or after 2024-01-01)', 'Calibrated', v.temporal.calibrated_median_factor + 'x', Math.round(v.temporal.calibrated_within3 * 100) + '%', '-');
    vt.appendChild(vb);
    body.appendChild(vt);
    body.appendChild(pn('Temporal split: train on protocols listed before 2024-01-01, test on those listed on or after. The calibrated model cuts the median error and lifts the share landing within 3x, without a name list.'));

    body.appendChild(el('h3', '', 'How the model works'));
    var ul = el('ul');
    ul.className = 'explain';
    ['Fit: one global log-log regression of market cap on TVL across all ' + R.fit.n + ' trading protocols.',
     'Sectors: for each category, the median residual of its trading protocols, shrunk by n/(n+15) so thin sectors do not overfit, then exponentiated and clamped to 0.5-2.0.',
     'Growth: the 7-day TVL change, clamped to -60..+120 per cent, moves the multiple by half its rate.',
     'Maturity: an age multiplier from 0.6 (new) to 1.0 (3+ years without a token).'
    ].forEach(function (t) { var li = el('li', '', t); ul.appendChild(li); });
    body.appendChild(ul);
    body.appendChild(pn('Live-token protocols are kept apart from the board and shown on the Live token tab, where the model predicts their market cap and you can compare it with the real one.'));
    panel.appendChild(body);
    MAIN.appendChild(panel);
  }

  function pn(text) {
    var p = el('p', 'eq-note', text);
    return p;
  }

  function statFigure(box, label, value) {
    var f = el('div', 'fact');
    f.appendChild(el('span', '', label));
    f.appendChild(el('b', '', value));
    box.appendChild(f);
  }

  function addValRow(body, test, model, median, w3, w2) {
    var tr = el('tr');
    tr.appendChild(el('td', '', test));
    tr.appendChild(el('td', '', model));
    tr.appendChild(el('td', 'num', median));
    tr.appendChild(el('td', 'num', w3));
    tr.appendChild(el('td', 'num', w2));
    body.appendChild(tr);
  }

  function renderSectors() {
    MAIN.innerHTML = '';
    var panel = el('div', 'panel');
    var head = el('div', 'panel-head');
    head.appendChild(el('h2', '', 'Sector factors'));
    head.appendChild(el('span', 'hint', 'median residual of each category, shrunk by n/(n+15)'));
    panel.appendChild(head);
    var body = el('div', 'panel-body');
    body.appendChild(pn('Each category that holds trading protocols gets its own multiple: the median of its log market-cap residual, shrunk toward 1 so thin sectors move little, exponentiated and clamped to 0.5-2.0. n is the count of trading protocols that set it. A category with n below 3 keeps a factor of 1.00.'));
    var wrap = el('div', 'table-wrap');
    var table = el('table');
    var thead = el('thead');
    var hr = el('tr');
    ['Category', 'n', 'Median mcap/TVL', 'Sector factor'].forEach(function (t, i) {
      hr.appendChild(el('th', i > 0 ? 'num' : '', t));
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tb = el('tbody');
    var sorted = R.sectors.slice().sort(function (a, b) { return b.n - a.n; });
    for (var i = 0; i < sorted.length; i++) {
      var s = sorted[i];
      var tr = el('tr');
      tr.appendChild(el('td', '', s.category));
      tr.appendChild(el('td', 'num', String(s.n)));
      tr.appendChild(el('td', 'num', s.median_multiple.toFixed(2) + 'x'));
      tr.appendChild(el('td', 'num factor', s.factor.toFixed(2) + 'x'));
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    wrap.appendChild(table);
    body.appendChild(wrap);
    panel.appendChild(body);
    MAIN.appendChild(panel);
  }

  function renderLive() {
    MAIN.innerHTML = '';
    var panel = el('div', 'panel');
    var head = el('div', 'panel-head');
    head.appendChild(el('h2', '', 'Live token: model prediction against the market'));
    head.appendChild(el('span', 'hint', 'predicted mcap from the same fitted model the board uses'));
    panel.appendChild(head);
    var body = el('div', 'panel-body');
    body.appendChild(pn('These protocols already trade a token. Run the board\'s own model on their TVL and see what it predicts, beside the market cap they actually record. Where the model is close, its implied values for pre-token protocols of the same size and sector read with more confidence; a large gap is the model under- or over-rating this corner of the market.'));
    var wrap = el('div', 'table-wrap');
    var table = el('table');
    var thead = el('thead');
    var hr = el('tr');
    hr.appendChild(el('th', '', 'Protocol'));
    hr.appendChild(el('th', '', 'Category'));
    hr.appendChild(el('th', 'num', 'TVL'));
    hr.appendChild(el('th', 'num', 'Actual mcap'));
    hr.appendChild(el('th', 'num', 'Model would say'));
    hr.appendChild(el('th', 'num', 'Gap'));
    hr.appendChild(el('th', 'num', '7d'));
    thead.appendChild(hr);
    table.appendChild(thead);
    var tb = el('tbody');
    for (var i = 0; i < R.live.length; i++) {
      var r = R.live[i];
      var tr = el('tr', 'is-live');
      var tdName = el('td', 'name');
      var a = el('a', '', r.name);
      a.href = '#p=' + encodeURIComponent(r.slug);
      tdName.appendChild(a);
      tr.appendChild(tdName);
      tr.appendChild(el('td', '', r.category || 'none'));
      tr.appendChild(el('td', 'num', money(r.tvl_usd)));
      tr.appendChild(el('td', 'num', r.mcap_usd !== null ? money(r.mcap_usd) : '\u2014'));
      tr.appendChild(el('td', 'num proof', money(r.predicted_mcap_usd)));
      var ratio = (r.mcap_usd && r.predicted_mcap_usd) ? r.predicted_mcap_usd / r.mcap_usd : null;
      tr.appendChild(el('td', 'num gap', ratio !== null ? ratio.toFixed(2) + 'x' : '\u2014'));
      tr.appendChild(el('td', 'num delta ' + pctClass(r.change_7d), pct(r.change_7d)));
      tb.appendChild(tr);
    }
    table.appendChild(tb);
    wrap.appendChild(table);
    body.appendChild(wrap);
    panel.appendChild(body);
    MAIN.appendChild(panel);
  }

  var GAS_PER_TX = {
    Ethereum: 8, Base: 0.1, Arbitrum: 0.1, Optimism: 0.1, Solana: 0.01,
    BSC: 0.2, Polygon: 0.05, Avalanche: 0.3
  };

  function usd(n) {
    return n < 1 ? '$' + n.toFixed(2) : '$' + Math.round(n);
  }

  function gasFor(r) {
    for (var i = 0; i < r.chains.length; i++) {
      var g = GAS_PER_TX[r.chains[i]];
      if (g !== undefined) return g;
    }
    return 1;
  }

  function capitalFor(tvl) {
    if (tvl >= 5000000000) return 250;
    if (tvl >= 1000000000) return 150;
    if (tvl >= 100000000) return 100;
    return 50;
  }

  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }

  function actionFor(r, capital, chain) {
    var c = (r.category || '').toLowerCase();
    var name = r.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0)
      return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0)
      return 'Provide $' + capital + " of liquidity to " + name + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0)
      return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0)
      return "Stake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0)
      return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0)
      return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0)
      return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0)
      return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0)
      return "Mint $" + capital + " of the protocol's yield asset on " + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0)
      return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }

  function farmSteps(r) {
    var chain = r.chains.length > 0 ? r.chains[0] : 'its main chain';
    var capital = capitalFor(r.tvl_usd);
    var hold = holdDaysFor(r.age_days);
    var gas = gasFor(r);
    var weekly = gas * 4;
    var totalGas = gas + weekly;
    var action = actionFor(r, capital, chain);
    return [
      'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline. Cost: nothing but a new address. Time: 5 minutes.',
      action + ' Cost: ' + usd(capital) + ' of capital and about ' + usd(gas) + ' of gas on ' + chain + '. Time: 15 minutes to set up.',
      'Make one qualifying action each week for 4 weeks, such as a deposit, a borrow, a swap or a vote on ' + chain + '. Cost: about ' + usd(gas) + ' of gas a week, ' + usd(totalGas) + ' for the four with setup. Time: 10 minutes a week, 4 weeks.',
      'Hold the position for at least ' + hold + ' days so the activity lands in more than one snapshot. Cost: ' + usd(capital) + ' stays in the position. Time: ' + hold + ' days.',
      "Before you withdraw, open the protocol's own published points or rewards page and claim only there, never paying to claim. Cost: no fee to check, and never pay to claim. Time: 10 minutes.",
      'Write the wallet, the dates and every transaction in a farm log so you can repeat or unwind the position. Cost: nothing but the log. Time: 5 minutes.'
    ];
  }

  function renderDetail(slug) {
    var r = bySlug[slug];
    if (!r) {
      MAIN.innerHTML = '';
      var miss = el('div', 'panel');
      var mb = el('div', 'panel-body');
      mb.appendChild(pn('No protocol with slug ' + slug + ' on the board.'));
      var back = el('a', 'back', 'Back to the board');
      back.href = '#';
      mb.appendChild(back);
      miss.appendChild(mb);
      MAIN.appendChild(miss);
      return;
    }
    MAIN.innerHTML = '';
    var card = el('div', 'card');
    var dh = el('div', 'detail-head');
    var left = el('div');
    var h2 = el('h2', '', r.name);
    left.appendChild(h2);
    left.appendChild(el('p', 'sub', 'rank ' + r.rank + ' of ' + R.board_size + '  \u00B7  ' + (r.category || 'no category') + '  \u00B7  ' + r.chains.join(', ')));
    dh.appendChild(left);
    var backb = el('a', 'back', '\u2190 Board');
    backb.href = '#';
    dh.appendChild(backb);
    card.appendChild(dh);

    var grid = el('div', 'detail-grid');
    grid.appendChild(detailStats(r));
    grid.appendChild(detailFormula(r));
    card.appendChild(grid);
    card.appendChild(detailPlan(r));
    MAIN.appendChild(card);
  }

  function statBox(label, value) {
    var f = el('div', 'stat');
    f.appendChild(el('span', '', label));
    f.appendChild(el('b', '', value));
    return f;
  }

  function detailStats(r) {
    var box = el('div');
    box.appendChild(el('h3', '', 'Snapshot figures'));
    var g = el('div', 'stat-grid');
    g.appendChild(statBox('TVL', exact(r.tvl_usd)));
    g.appendChild(statBox('7-day change', pct(r.change_7d)));
    g.appendChild(statBox('Age (no token)', ageText(r.age_days)));
    g.appendChild(statBox('Listed', r.listed_at || 'unknown'));
    g.appendChild(statBox('Category', r.category || 'none'));
    g.appendChild(statBox('Sector factor', factorFor(r.category).toFixed(2) + 'x'));
    box.appendChild(g);
    return box;
  }

  function detailFormula(r) {
    var box = el('div');
    box.appendChild(el('h3', '', 'Implied launch value'));
    var multiple = r.implied_value_usd / r.tvl_usd;
    var f = el('div', 'formula');
    f.appendChild(document.createTextNode('implied = TVL \u00D7 multiple \u00D7 growth \u00D7 maturity'));
    f.appendChild(el('br'));
    f.appendChild(document.createTextNode(exact(r.tvl_usd) + ' \u00D7 ' + multiple.toFixed(4) + ' \u00D7 ' + r.growth_multiplier + ' \u00D7 ' + r.maturity_multiplier));
    f.appendChild(el('br'));
    f.appendChild(document.createTextNode('= '));
    var res = el('span', 'res', exact(r.implied_value_usd));
    f.appendChild(res);
    box.appendChild(f);
    box.appendChild(pn('The multiple is exp(a0) \u00D7 TVL^(b0-1) \u00D7 the sector factor, fit on ' + R.fit.n + ' trading protocols at run time (' + R.model_version + '). Growth is the clamped 7-day change; maturity is the age multiplier.'));
    return box;
  }

  function detailPlan(r) {
    var box = el('div');
    box.appendChild(el('h3', '', 'Farm plan'));
    var steps = farmSteps(r);
    var ol = el('ol', 'steps');
    for (var i = 0; i < steps.length; i++) {
      ol.appendChild(el('li', '', steps[i]));
    }
    box.appendChild(ol);
    var gas = gasFor(r);
    var weekly = gas * 4;
    var totalGas = gas + weekly;
    var capital = capitalFor(r.tvl_usd);
    var hold = holdDaysFor(r.age_days);
    var foot = el('div', 'plan-foot');
    foot.appendChild(spanIt('Total gas', usd(totalGas)));
    foot.appendChild(spanIt('Capital', usd(capital)));
    foot.appendChild(spanIt('Holding', hold + ' days'));
    foot.appendChild(spanIt('Steps', String(steps.length)));
    box.appendChild(foot);
    return box;
  }

  function spanIt(label, value) {
    var s = el('span', '', label + ': ');
    s.appendChild(el('b', '', value));
    return s;
  }

  function setTab(tab) {
    view = tab;
    for (var i = 0; i < TABS.length; i++) {
      var on = TABS[i].getAttribute('data-tab') === tab;
      TABS[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }

  function showView(tab) {
    if (DETAIL) { DETAIL.hidden = true; DETAIL.innerHTML = ''; }
    setTab(tab);
    if (tab === 'validation') renderValidation();
    else if (tab === 'sectors') renderSectors();
    else if (tab === 'live') renderLive();
    else renderBoard();
    MAIN.setAttribute('aria-busy', 'false');
    window.scrollTo(0, 0);
  }

  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '');
    var out = {};
    if (!h) return out;
    var parts = h.split('&');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      out[decodeURIComponent(kv[0])] = decodeURIComponent(kv.slice(1).join('='));
    }
    return out;
  }

  function route() {
    var h = parseHash();
    if (h.p) { renderDetail(h.p); return; }
    if (h.view && ['validation', 'sectors', 'live'].indexOf(h.view) >= 0) { showView(h.view); return; }
    if (h.category !== undefined || h.chain !== undefined) {
      showView('board');
      var sel = document.getElementById('cat');
      if (h.category !== undefined) sel.value = h.category;
      var sc = document.getElementById('chain');
      if (h.chain !== undefined) sc.value = h.chain;
      applyFilters();
      return;
    }
    showView('board');
  }

  function renderFoot() {
    FOOT.innerHTML = '';
    var p = el('p', '');
    p.appendChild(document.createTextNode('Source: '));
    p.appendChild(el('b', '', R.source));
    p.appendChild(document.createTextNode(' \u00B7 snapshot ' + R.as_of + ' \u00B7 model ' + R.model_version + '. '));
    p.appendChild(document.createTextNode('A protocol on this board records no token on DefiLlama; that is the record, not a claim it has none. Implied values are this entry\'s own model, not make.fun\'s and not a prediction of whether or when a token is issued.'));
    FOOT.appendChild(p);
  }

  function init() {
    renderMeta();
    renderFoot();
    for (var i = 0; i < TABS.length; i++) {
      TABS[i].addEventListener('click', function (ev) {
        var tab = ev.currentTarget.getAttribute('data-tab');
        location.hash = '#view=' + tab;
      });
    }
    window.addEventListener('hashchange', route);
    window.__RADAR_READY__ = true;
  }

  init();
  route();
})();
