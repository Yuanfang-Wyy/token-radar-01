// Token Radar's page: renders window.RADAR (written by main.ts from the same board the
// gate reads), so the page and board.json can never disagree. No network, no framework.
//
// Deep links, for screenshots and sharing: #detail=<slug> opens a protocol,
// #filter=watchlist shows the watchlist, #filter=category:<name> filters by category,
// #tab=live or #tab=model opens that view.
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D || !Array.isArray(D.rows)) {
    document.getElementById('rows').innerHTML =
      '<tr><td colspan="8">No radar data found. Run main.ts to write data.js.</td></tr>';
    return;
  }

  var SHIPPED = { gw: D.model.growth_weight, cb: D.model.chain_bonus };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function moneyFull(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function pct(v) {
    if (v === null || v === undefined) return '<span class="flat">&mdash;</span>';
    var cls = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
    var sign = v > 0 ? '+' : '';
    return '<span class="' + cls + '">' + sign + v.toFixed(1) + '%</span>';
  }
  function ageText(days) {
    if (days === null || days === undefined) return 'n/a';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return days + 'd';
  }

  /* ---- header stats and source line ---- */
  var totalImplied = D.rows.reduce(function (s, r) { return s + r.implied_value_usd; }, 0);
  $('stats').innerHTML =
    '<div><dt>Protocols scanned</dt><dd>' + D.rows.length + ' pre-token</dd></div>' +
    '<div><dt>Watchlist</dt><dd>' + D.watchlist_size + '</dd></div>' +
    '<div><dt>Early finds</dt><dd>' + D.early_size + '</dd></div>' +
    '<div><dt>Total implied value</dt><dd>' + money(totalImplied) + '</dd></div>';
  $('source').textContent =
    'Snapshot: ' + D.source + ' &middot; as of ' + D.as_of + ' &middot; watchlist floor ' +
    money(D.floor_usd) + ' TVL. Model ' + D.model_version + '.';

  /* ---- filter controls ---- */
  var cats = [];
  D.rows.forEach(function (r) { if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category); });
  cats.sort();
  $('cat').innerHTML = '<option value="">All categories</option>' +
    cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
  var chains = [];
  D.rows.forEach(function (r) {
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  chains.sort();
  $('chain').innerHTML = '<option value="">All chains</option>' +
    chains.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');

  /* ---- sandbox: re-rank from the same snapshot figures ---- */
  var sandbox = { gw: SHIPPED.gw, cb: SHIPPED.cb };
  function impliedWith(r, gw, cb) {
    var growth = 1 + ((r.growth_pct == null ? 0 : r.growth_pct) / 100) * gw;
    var extra = Math.min(Math.max(r.chains.length - 1, 0), 5);
    var chain = 1 + cb * extra;
    return Math.max(1, Math.round(r.tvl_usd * r.category_multiple * growth * r.maturity_multiplier * chain));
  }
  function currentRows() {
    if (sandbox.gw === SHIPPED.gw && sandbox.cb === SHIPPED.cb) return D.rows;
    return D.rows.map(function (r) {
      var copy = {};
      for (var k in r) copy[k] = r[k];
      copy.implied_value_usd = impliedWith(r, sandbox.gw, sandbox.cb);
      return copy;
    }).sort(function (a, b) {
      return b.implied_value_usd - a.implied_value_usd ||
        (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
    }).map(function (r, i) {
      var copy = {};
      for (var k in r) copy[k] = r[k];
      copy.rank = i + 1;
      return copy;
    });
  }

  /* ---- board ---- */
  var selectedSlug = null;
  function filtered() {
    var q = $('q').value.trim().toLowerCase();
    var cat = $('cat').value;
    var chain = $('chain').value;
    var watch = $('watch').checked;
    var sort = $('sort').value;
    var rows = currentRows().filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      if (cat && r.category !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (watch && !r.watchlist) return false;
      return true;
    });
    var by = {
      implied: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      growth: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
      age: function (a, b) { return (b.age_days || 0) - (a.age_days || 0); },
      name: function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; },
    }[sort];
    rows.sort(by);
    return rows;
  }

  function renderBoard() {
    var rows = filtered();
    var sandboxed = sandbox.gw !== SHIPPED.gw || sandbox.cb !== SHIPPED.cb;
    $('count').textContent = 'Showing ' + rows.length + ' of ' + D.rows.length + ' ranked protocols' +
      (sandboxed ? ' · sandbox model active (growth ' + sandbox.gw.toFixed(2) +
        ', chain bonus ' + Math.round(sandbox.cb * 100) + '%) — Reset to shipped model in How the model works' : '');
    $('rows').innerHTML = rows.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"' + (r.slug === selectedSlug ? ' class="selected"' : '') + '>' +
        '<td>' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span>' +
        (r.watchlist ? '<span class="badge">Watchlist</span>' : '') +
        '<br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 2).join(', ')) + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num"><strong>' + money(r.implied_value_usd) + '</strong></td>' +
        '</tr>';
    }).join('') || '<tr><td colspan="8">Nothing matches these filters.</td></tr>';
  }

  function compsFor(category) {
    return D.live.filter(function (l) { return l.category === category; }).slice(0, 3);
  }

  function renderDetail(slug) {
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    var box = $('detail');
    if (!r) { box.hidden = true; box.innerHTML = ''; selectedSlug = null; return; }
    selectedSlug = slug;
    var comps = compsFor(r.category);
    var steps = (r.farm_steps || []).map(function (s) {
      var m = s.match(/ Cost: (.*)\. Time: (.*)\.$/);
      var text = m ? s.slice(0, m.index) : s;
      var meta = m ? 'Cost: ' + m[1] + ' · Time: ' + m[2] : '';
      return '<li>' + esc(text) + (meta ? '<span class="meta">' + esc(meta) + '</span>' : '') + '</li>';
    }).join('');
    box.innerHTML =
      '<button type="button" class="close" id="detail-close">Close</button>' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="sub">Rank #' + r.rank + ' · ' + esc(r.category || 'Uncategorized') + ' · ' +
      esc(r.chains.join(', ') || 'no chain listed') + ' · TVL ' + moneyFull(r.tvl_usd) +
      ' · listed ' + esc(r.listed_at || 'date unknown') +
      (r.watchlist ? ' · on the snapshot watchlist' : ' · early find below the watchlist floor') + '</p>' +
      '<div class="breakdown">' +
      '<div class="factor"><div class="k">TVL</div><div class="v">' + money(r.tvl_usd) + '</div><div class="d">sealed snapshot</div></div>' +
      '<div class="factor"><div class="k">Category multiple</div><div class="v">&times;' + r.category_multiple.toFixed(3) + '</div><div class="d">' + (r.comparables >= 3 ? r.comparables + ' live comparables in ' + esc(r.category || 'this category') : 'market median — only ' + r.comparables + ' live comparable' + (r.comparables === 1 ? '' : 's') + ' in ' + esc(r.category || 'this category')) + '</div></div>' +
      '<div class="factor"><div class="k">Growth</div><div class="v">&times;' + r.growth_multiplier.toFixed(2) + '</div><div class="d">' + (r.change_7d === null ? '7d change unreported' : '7d TVL ' + (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</div></div>' +
      '<div class="factor"><div class="k">Maturity</div><div class="v">&times;' + r.maturity_multiplier.toFixed(2) + '</div><div class="d">' + (r.age_days === null ? 'age unknown, 365 days assumed' : ageText(r.age_days) + ' with no token') + '</div></div>' +
      '<div class="factor"><div class="k">Chains</div><div class="v">&times;' + r.chain_multiplier.toFixed(2) + '</div><div class="d">' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + '</div></div>' +
      '<div class="factor total"><div class="k">Implied value</div><div class="v">' + money(r.implied_value_usd) + '</div><div class="d">' + moneyFull(r.implied_value_usd) + '</div></div>' +
      '</div>' +
      '<h3>How to farm it</h3>' +
      '<ol class="steps">' + steps + '</ol>' +
      (comps.length ? '<h3>Live comparables in ' + esc(r.category || 'this category') + '</h3><p>' +
        comps.map(function (l) {
          return esc(l.name) + ' — market cap ' + money(l.mcap_usd || 0) + ' on ' + money(l.tvl_usd) +
            ' TVL (' + (l.mcap_tvl === null ? 'n/a' : l.mcap_tvl.toFixed(2)) + '&times;)';
        }).join(' · ') + '. These already trade, so they are the calibration, never a farm target.</p>' : '') +
      '<p class="hint">Implied value is what a token would be worth if this record stayed as it is. ' +
      'It does not say whether or when a token is issued.</p>';
    box.hidden = false;
    $('detail-close').addEventListener('click', function () { renderDetail(null); renderBoard(); });
  }

  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (!tr) return;
    renderDetail(tr.getAttribute('data-slug'));
    renderBoard();
    $('detail').scrollIntoView({ block: 'nearest' });
  });
  ['q', 'cat', 'chain', 'sort', 'watch'].forEach(function (id) {
    $(id).addEventListener('input', renderBoard);
    $(id).addEventListener('change', renderBoard);
  });

  /* ---- live tokens ---- */
  $('live-rows').innerHTML = D.live.map(function (l) {
    return '<tr><td><span class="name">' + esc(l.name) + '</span><br><span class="slug">' + esc(l.slug) + '</span></td>' +
      '<td>' + esc(l.category || '—') + '</td>' +
      '<td>' + esc(l.chains.slice(0, 3).join(', ')) + '</td>' +
      '<td class="num">' + money(l.tvl_usd) + '</td>' +
      '<td class="num">' + money(l.mcap_usd || 0) + '</td>' +
      '<td class="num">' + (l.mcap_tvl === null ? '—' : l.mcap_tvl.toFixed(2) + '&times;') + '</td></tr>';
  }).join('');

  /* ---- methodology: multiples table ---- */
  $('mult-rows').innerHTML = D.multiples.map(function (m) {
    return '<tr><td>' + esc(m.category) + '</td>' +
      '<td class="num">' + m.live_count + '</td>' +
      '<td class="num">' + (m.median_mcap_tvl === null ? '—' : m.median_mcap_tvl.toFixed(3) + '&times;') + '</td>' +
      '<td class="num"><strong>&times;' + m.multiple.toFixed(3) + '</strong></td></tr>';
  }).join('') +
  '<tr><td><strong>Whole market (fallback)</strong></td><td class="num">' + D.live.length +
  '+</td><td class="num">' + D.overall_median_mcap_tvl.toFixed(3) + '&times;</td>' +
  '<td class="num"><strong>&times;' + D.overall_median_mcap_tvl.toFixed(3) + '</strong></td></tr>';

  /* ---- sandbox controls ---- */
  $('gw').addEventListener('input', function () {
    sandbox.gw = parseFloat($('gw').value);
    $('gw-out').textContent = sandbox.gw.toFixed(2);
    renderBoard();
  });
  $('cb').addEventListener('input', function () {
    sandbox.cb = parseFloat($('cb').value);
    $('cb-out').textContent = Math.round(sandbox.cb * 100) + '%';
    renderBoard();
  });
  $('reset').addEventListener('click', function () {
    sandbox.gw = SHIPPED.gw; sandbox.cb = SHIPPED.cb;
    $('gw').value = String(SHIPPED.gw); $('cb').value = String(SHIPPED.cb);
    $('gw-out').textContent = SHIPPED.gw.toFixed(2);
    $('cb-out').textContent = Math.round(SHIPPED.cb * 100) + '%';
    renderBoard();
  });

  /* ---- tabs ---- */
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (b) {
      var on = b.getAttribute('data-tab') === name;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + name; });
  }
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
  });

  /* ---- deep links ---- */
  function applyHash() {
    var h = window.location.hash.slice(1);
    if (!h) return;
    var parts = h.split('&');
    parts.forEach(function (part) {
      var kv = part.split('=');
      var key = decodeURIComponent(kv[0] || '');
      var val = decodeURIComponent(kv[1] || '');
      if (key === 'tab' && (val === 'live' || val === 'model' || val === 'board')) showTab(val);
      if (key === 'filter' && val === 'watchlist') { $('watch').checked = true; }
      if (key === 'filter' && val.indexOf('category:') === 0) {
        $('cat').value = val.slice('category:'.length);
      }
      if (key === 'detail' && val) { renderDetail(val); }
    });
    renderBoard();
    if (parts.some(function (p) { return p.indexOf('detail=') === 0; })) {
      $('detail').scrollIntoView();
    }
  }

  renderBoard();
  applyHash();
})();
