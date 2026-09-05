// ==UserScript==
// @name         Pixiv Novel → EPUB
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Converts a Pixiv novel or entire series into a beautiful vertical Japanese EPUB with cover, synopsis, author avatar, and tate-chu-yoko typography.
// @author       GolyBidoof
// @match        https://www.pixiv.net/novel/show.php?id=*
// @icon         https://www.pixiv.net/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_addStyle
// @connect      www.pixiv.net
// @connect      i.pximg.net
// @connect      s.pximg.net
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

/*
 * Pixiv Novel → EPUB
 * ---------------------------------------------------------------
 * Author     : GolyBidoof — https://github.com/GolyBidoof
 * Built with : DeepSeek V4 Flash (DeepSeek Harness coding agent)
 * Readers    : ッツ Ebook Reader (TTSu)  https://reader.ttsu.app
 *              (source: https://github.com/ttu-ttu/ebook-reader)
 * ---------------------------------------------------------------
 */

(function () {
    'use strict';

    // -----------------------------------------------------------------
    // UI Styling & Theme
    // -----------------------------------------------------------------
    function addStyle(css) {
        if (typeof GM_addStyle === 'function') {
            try { GM_addStyle(css); return; } catch (_) {}
        }
        const tag = document.createElement('style');
        tag.textContent = css;
        (document.head || document.documentElement).appendChild(tag);
    }

    const font = document.createElement('link');
    font.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap';
    font.rel = 'stylesheet';
    document.head.appendChild(font);

    addStyle(`
        #pixiv-epub-wrap {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            color: #0f172a;
            user-select: none;
        }
        #pixiv-epub-wrap * { box-sizing: border-box; }

        /* Floating Trigger Pill */
        #pixiv-epub-btn {
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 999px;
            padding: 9px 18px;
            font: 600 13px/1.2 'Outfit', sans-serif;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(2, 132, 199, 0.35);
            display: flex;
            align-items: center;
            gap: 8px;
            margin-left: auto;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        #pixiv-epub-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 28px rgba(2, 132, 199, 0.45);
        }
        #pixiv-epub-btn:focus-visible {
            outline: 2px solid #0f172a;
            outline-offset: 2px;
        }
        #pixiv-epub-btn .caret {
            width: 0; height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 5px solid #fff;
            transition: transform 0.2s ease;
        }
        #pixiv-epub-wrap.open #pixiv-epub-btn .caret { transform: rotate(180deg); }

        /* Main Panel */
        #pixiv-epub-panel {
            display: none;
            margin-top: 10px;
            width: 330px;
            max-width: calc(100vw - 32px);
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 12px 36px rgba(15, 23, 42, 0.15), 0 2px 6px rgba(15, 23, 42, 0.04);
            overflow: hidden;
            flex-direction: column;
        }
        #pixiv-epub-wrap.open #pixiv-epub-panel { display: flex; }
        #pixiv-epub-panel.collapsed .panel-body { display: none; }

        /* Panel Header */
        .panel-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #ffffff;
            border-bottom: 1px solid #f1f5f9;
            cursor: grab;
        }
        .panel-head:active { cursor: grabbing; }
        .panel-title {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .panel-head-controls { display: flex; gap: 4px; }
        .panel-ctrl-btn {
            background: transparent;
            border: none;
            color: #64748b;
            font-size: 16px;
            width: 26px;
            height: 26px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s, color 0.15s;
        }
        .panel-ctrl-btn:hover { background: #f1f5f9; color: #0f172a; }
        .panel-ctrl-btn:focus-visible { outline: 2px solid #0284c7; }

        /* Body Content */
        .panel-body {
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            user-select: text;
            max-height: 80vh;
            overflow-y: auto;
        }

        /* Series Metadata Box */
        .series-info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .series-info-box .series-tag {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #0284c7;
        }
        .series-info-box .series-name {
            font-weight: 700;
            font-size: 13px;
            color: #0f172a;
            line-height: 1.35;
        }
        .series-info-box .series-sub {
            font-size: 11px;
            font-weight: 500;
            color: #64748b;
        }

        /* Option Tile Groups */
        .option-section-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            margin-bottom: 6px;
        }
        .radio-tile-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .radio-tile {
            position: relative;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #ffffff;
            cursor: pointer;
            transition: border-color 0.15s, background 0.15s;
        }
        .radio-tile:hover {
            border-color: #cbd5e1;
            background: #f8fafc;
        }
        .radio-tile input[type="radio"] {
            margin-top: 3px;
            accent-color: #0284c7;
        }
        .radio-tile input[type="radio"]:focus-visible {
            outline: 2px solid #0284c7;
            outline-offset: 2px;
        }
        .radio-tile-body {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }
        .radio-tile-title {
            font-size: 12px;
            font-weight: 600;
            color: #1e293b;
        }
        .radio-tile-desc {
            font-size: 10px;
            color: #64748b;
        }

        /* Chapter Index List */
        #pixiv-epub-chapters {
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            border-radius: 10px;
            padding: 6px 8px;
            max-height: 140px;
            overflow-y: auto;
        }
        #pixiv-epub-chapters .chap-row {
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 11px;
            padding: 4px 6px;
            border-radius: 6px;
        }
        #pixiv-epub-chapters .chap-row.chap-current {
            background: #e0f2fe;
            font-weight: 700;
        }
        #pixiv-epub-chapters .chap-row.chap-unavailable {
            opacity: 0.55;
        }
        #pixiv-epub-chapters .chap-row.chap-unavailable .chap-title {
            color: #475569;
        }
        #pixiv-epub-chapters .chap-badge {
            font-size: 10px;
            color: #b91c1c;
            border: 1px solid #fca5a5;
            border-radius: 999px;
            padding: 0 6px;
            white-space: nowrap;
        }
        #pixiv-epub-chapters .chap-num {
            color: #64748b;
            min-width: 20px;
            text-align: right;
            font-variant-numeric: tabular-nums;
            font-weight: 600;
        }
        #pixiv-epub-chapters .chap-title {
            color: #0284c7;
            text-decoration: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
        }
        #pixiv-epub-chapters .chap-title:hover { text-decoration: underline; }
        #pixiv-epub-chapters .empty { color: #94a3b8; font-style: italic; font-size: 11px; text-align: center; }
        #pixiv-epub-chapters .empty.loading::after {
            content: '';
            display: inline-block;
            width: 10px; height: 10px;
            margin-left: 6px;
            border: 2px solid #cbd5e1;
            border-top-color: #0284c7;
            border-radius: 50%;
            vertical-align: -1px;
            animation: pixiv-epub-spin 0.8s linear infinite;
        }
        @keyframes pixiv-epub-spin { to { transform: rotate(360deg); } }

        /* Progress Bar */
        #pixiv-epub-prog-wrap {
            display: none;
            flex-direction: column;
            gap: 4px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 8px 10px;
        }
        .prog-meta {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: 600;
            color: #334155;
        }
        .prog-track {
            height: 6px;
            background: #e2e8f0;
            border-radius: 999px;
            overflow: hidden;
        }
        .prog-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #0284c7, #38bdf8);
            border-radius: 999px;
            transition: width 0.2s ease;
        }

        /* Action Buttons */
        #pixiv-epub-dl {
            width: 100%;
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #fff;
            border: 0;
            border-radius: 12px;
            padding: 11px;
            font: 600 13px/1 'Outfit', sans-serif;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);
            transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s;
        }
        #pixiv-epub-dl:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(2, 132, 199, 0.4);
        }
        #pixiv-epub-dl:disabled { opacity: 0.55; cursor: wait; }
        #pixiv-epub-dl:focus-visible { outline: 2px solid #0f172a; outline-offset: 2px; }

        /* Status Line */
        #pixiv-epub-status {
            display: none;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 500;
            color: #334155;
            line-height: 1.4;
            word-break: break-all;
        }
        #pixiv-epub-status.busy { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
        #pixiv-epub-status.ok { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
        #pixiv-epub-status.error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
    `);

    // -----------------------------------------------------------------
    // UI Construction
    // -----------------------------------------------------------------
    const wrap = document.createElement('div');
    wrap.id = 'pixiv-epub-wrap';
    document.body.appendChild(wrap);

    const btn = document.createElement('button');
    btn.id = 'pixiv-epub-btn';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'pixiv-epub-panel');
    btn.innerHTML = '<span>📖 Save as EPUB</span><span class="caret" aria-hidden="true"></span>';
    wrap.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'pixiv-epub-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'pixiv-epub-heading');
    panel.innerHTML = `
        <div class="panel-head">
            <h2 class="panel-title" id="pixiv-epub-heading">📖 Pixiv Novel → EPUB</h2>
            <div class="panel-head-controls">
                <button type="button" class="panel-ctrl-btn" id="pixiv-epub-min" aria-label="Minimize panel">–</button>
                <button type="button" class="panel-ctrl-btn" id="pixiv-epub-close" aria-label="Close panel">×</button>
            </div>
        </div>
        <div class="panel-body">
            <div class="series-info-box" id="pixiv-epub-series" style="display:none">
                <span class="series-tag">Series Volume</span>
                <div class="series-name"></div>
                <div class="series-sub"></div>
            </div>

            <div id="pixiv-epub-scope-row">
                <div class="option-section-title">Download Scope</div>
                <div class="radio-tile-group">
                    <label class="radio-tile">
                        <input type="radio" name="pixiv-epub-scope" value="series" checked />
                        <div class="radio-tile-body">
                            <span class="radio-tile-title">Entire Series</span>
                            <span class="radio-tile-desc">Collect all chapters starting from chapter 1</span>
                        </div>
                    </label>
                    <label class="radio-tile">
                        <input type="radio" name="pixiv-epub-scope" value="single" />
                        <div class="radio-tile-body">
                            <span class="radio-tile-title">Current Chapter Only</span>
                            <span class="radio-tile-desc">Download standalone volume of this chapter</span>
                        </div>
                    </label>
                </div>
            </div>

            <div id="pixiv-epub-output-row">
                <div class="option-section-title">Output Format</div>
                <div class="radio-tile-group">
                    <label class="radio-tile">
                        <input type="radio" name="pixiv-epub-output" value="merged" checked />
                        <div class="radio-tile-body">
                            <span class="radio-tile-title">Single Merged Book</span>
                            <span class="radio-tile-desc">All chapters merged with vertical Table of Contents</span>
                        </div>
                    </label>
                    <label class="radio-tile">
                        <input type="radio" name="pixiv-epub-output" value="separate" />
                        <div class="radio-tile-body">
                            <span class="radio-tile-title">Separate EPUBs</span>
                            <span class="radio-tile-desc">One individual EPUB file for each chapter</span>
                        </div>
                    </label>
                </div>
            </div>

            <div id="pixiv-epub-chapters-box">
                <div class="option-section-title">Chapter Manifest</div>
                <div id="pixiv-epub-chapters"><div class="empty">Loading series structure…</div></div>
            </div>

            <div id="pixiv-epub-prog-wrap">
                <div class="prog-meta">
                    <span id="pixiv-epub-prog-label">Processing…</span>
                    <span id="pixiv-epub-prog-rate">0%</span>
                </div>
                <div class="prog-track">
                    <div class="prog-fill" id="pixiv-epub-prog-fill" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>

            <button id="pixiv-epub-dl" type="button">⬇ Start EPUB Generation</button>
            <div id="pixiv-epub-status" role="status" aria-live="polite"></div>
        </div>
    `;
    wrap.appendChild(panel);

    const status = panel.querySelector('#pixiv-epub-status');
    const progWrap = panel.querySelector('#pixiv-epub-prog-wrap');
    const progLabel = panel.querySelector('#pixiv-epub-prog-label');
    const progRate = panel.querySelector('#pixiv-epub-prog-rate');
    const progFill = panel.querySelector('#pixiv-epub-prog-fill');
    const minBtn = panel.querySelector('#pixiv-epub-min');
    const closeBtn = panel.querySelector('#pixiv-epub-close');

    function setStatus(msg, mode = 'busy') {
        if (!msg) { status.style.display = 'none'; return; }
        status.textContent = msg;
        status.className = mode;
        status.style.display = 'block';
    }

    function setProgress(pct, label = '') {
        progWrap.style.display = 'flex';
        const p = Math.max(0, Math.min(100, Math.round(pct)));
        progFill.style.width = p + '%';
        progFill.setAttribute('aria-valuenow', String(p));
        progRate.textContent = p + '%';
        if (label) progLabel.textContent = label;
    }

    function hideProgress() {
        progWrap.style.display = 'none';
    }

    function setBusy(busy) {
        btn.disabled = busy;
        const dl = panel.querySelector('#pixiv-epub-dl');
        dl.disabled = busy;
        dl.textContent = busy ? 'Processing…' : '⬇ Start EPUB Generation';
    }

    function showSeriesInfo(info) {
        const el = panel.querySelector('#pixiv-epub-series');
        if (!info) { el.style.display = 'none'; return; }
        el.style.display = 'flex';
        el.querySelector('.series-name').textContent = info.title || '';
        const parts = [];
        if (info.total) parts.push(info.total + ' total chapters');
        if (info.order) parts.push('current: #' + info.order);
        el.querySelector('.series-sub').textContent = parts.join(' · ');
    }

    function showChapterList(chapters, currentIndex, totalHint) {
        const box = panel.querySelector('#pixiv-epub-chapters');
        if (!chapters) {
            // Loading state — don't claim "standalone" while we're still fetching.
            box.innerHTML = totalHint
                ? `<div class="empty loading">Loading chapters… (${escapeXML(String(totalHint))} total)</div>`
                : '<div class="empty loading">Loading chapters…</div>';
            return;
        }
        if (chapters.length === 0) {
            box.innerHTML = '<div class="empty">Standalone novel (no external chapters).</div>';
            return;
        }
        const loaded = chapters.length;
        const counter = totalHint && totalHint > loaded
            ? `<div class="empty loading">${loaded} / ${escapeXML(String(totalHint))} chapters loaded…</div>`
            : '';
        const rows = chapters.map((c, i) => {
            const cur = i === currentIndex ? ' chap-current' : '';
            const num = c.order != null ? c.order : i + 1;
            const title = escapeXML(c.title || '');
            if (c.available === false) {
                // Unavailable chapter: muted, no link.
                return `<div class="chap-row${cur} chap-unavailable"><span class="chap-num">#${num}</span><span class="chap-title">${title}</span><span class="chap-badge">unavailable</span></div>`;
            }
            const url = c.id ? `https://www.pixiv.net/novel/show.php?id=${encodeURIComponent(c.id)}` : '#';
            return `<div class="chap-row${cur}"><span class="chap-num">#${num}</span><a class="chap-title" href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></div>`;
        }).join('');
        box.innerHTML = rows + counter;
    }

    btn.addEventListener('click', () => {
        const isOpen = wrap.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(isOpen));
    });

    minBtn.addEventListener('click', () => {
        const isMin = panel.classList.toggle('collapsed');
        minBtn.textContent = isMin ? '+' : '–';
    });

    closeBtn.addEventListener('click', () => {
        wrap.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && wrap.classList.contains('open')) {
            panel.classList.toggle('collapsed');
            minBtn.textContent = panel.classList.contains('collapsed') ? '+' : '–';
        }
    });

    // Header dragging
    const head = panel.querySelector('.panel-head');
    let dragging = false;
    let dragPos = { x: 0, y: 0 };
    head.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        dragging = true;
        dragPos.x = e.clientX - wrap.offsetLeft;
        dragPos.y = e.clientY - wrap.offsetTop;
    });
    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        wrap.style.left = (e.clientX - dragPos.x) + 'px';
        wrap.style.top = (e.clientY - dragPos.y) + 'px';
        wrap.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    panel.querySelector('#pixiv-epub-dl').addEventListener('click', () => {
        setBusy(true);
        setStatus('Initializing generator…', 'busy');
        run().catch(err => {
            console.error('[pixiv-epub] Error:', err);
            setStatus('Error: ' + (err && err.message ? err.message : String(err)), 'error');
            setBusy(false);
            hideProgress();
        });
    });

    function setSeriesUI(isSeries) {
        const scopeRow = panel.querySelector('#pixiv-epub-scope-row');
        const outRow = panel.querySelector('#pixiv-epub-output-row');
        const chapBox = panel.querySelector('#pixiv-epub-chapters-box');
        if (isSeries) {
            scopeRow.style.display = '';
            outRow.style.display = '';
            chapBox.style.display = '';
        } else {
            scopeRow.style.display = 'none';
            outRow.style.display = 'none';
            // Keep the chapter box visible so a single-chapter story shows
            // "1 chapter — standalone" rather than nothing.
            chapBox.style.display = '';
        }
    }

    async function primeSeriesInfo() {
        try {
            const m = location.search.match(/id=(\d+)/);
            if (!m) return;
            // Fast path: show a loading state immediately, never "standalone".
            showChapterList(null);          // "Loading chapters…"
            const data = await gmFetch('https://www.pixiv.net/ajax/novel/' + m[1]);
            const b = data && data.body;
            const snd = b && b.seriesNavData;
            if (!snd || !snd.seriesId) {
                // Confirmed standalone novel — show it as a 1-chapter story.
                showSeriesInfo({
                    title: b.title || '',
                    total: 1,
                    order: 1,
                });
                showChapterList([{
                    id: b.id,
                    order: 1,
                    title: b.title || '',
                    available: true,
                }], 0, 1);
                setSeriesUI(false);
                return;
            }

            // Show series meta (title + total) right away — one cheap fetch —
            // then progressively populate the chapter list.
            const meta = await fetchSeriesMeta(snd.seriesId);
            const total = (meta && meta.total) || 0;
            showSeriesInfo({
                title: (meta && meta.title) || snd.title || '',
                total,
                order: snd.order || 0,
            });
            setSeriesUI(true);
            showChapterList(null, -1, total);   // "Loading chapters… (N total)"

            // Progressive chapter tree: update as entries come in.
            const entries = await collectSeries(b, (partial) => {
                if (!Array.isArray(partial)) return;
                showChapterList(partial.map(n => ({
                    id: n.id,
                    order: n.order || 0,
                    title: n.title || '',
                    available: n.available !== false && n.fetchable !== false,
                })), partial.findIndex(n => String(n.id) === String(m[1])), total);
            });
            const finalEntries = Array.isArray(entries) ? entries : (entries && entries.entries) || [];
            showChapterList(finalEntries.map(n => ({
                id: n.id,
                order: n.order || 0,
                title: n.title || '',
                available: n.available !== false && n.fetchable !== false,
            })), finalEntries.findIndex(n => String(n.id) === String(m[1])), total);
        } catch (e) {
            console.warn('[pixiv-epub] Series pre-fetch:', e);
            showSeriesInfo(null);
            showChapterList([]);
        }
    }
    primeSeriesInfo();

    // -----------------------------------------------------------------
    // SPA navigation handling: re-preload when the novel id changes
    // without a full page reload (pixiv uses pushState).
    // -----------------------------------------------------------------
    let lastNavId = currentNovelId();
    function currentNovelId() {
        const m = location.search.match(/[?&]id=(\d+)/);
        return m ? m[1] : null;
    }

    function onNavigated() {
        const id = currentNovelId();
        if (id === lastNavId) return;
        lastNavId = id;
        // Reset UI to a neutral state, then re-preload for the new page.
        setBusy(false);
        setStatus('', false);
        hideProgress && hideProgress();
        showSeriesInfo(null);
        showChapterList(null);
        primeSeriesInfo();
    }

    // Pixiv uses History API for client-side navigation.
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
        const r = origPush.apply(this, args);
        setTimeout(onNavigated, 0);
        return r;
    };
    history.replaceState = function (...args) {
        const r = origReplace.apply(this, args);
        setTimeout(onNavigated, 0);
        return r;
    };
    window.addEventListener('popstate', onNavigated);

    // Belt-and-braces: also poll the URL in case some navigation path
    // (e.g. link click interceptors) bypasses the History API hooks.
    let lastCheckedUrl = location.href;
    setInterval(() => {
        if (location.href !== lastCheckedUrl) {
            lastCheckedUrl = location.href;
            onNavigated();
        }
    }, 800);

    // -----------------------------------------------------------------
    // Networking
    // -----------------------------------------------------------------
    function gmFetch(url, opts = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: opts.method || 'GET',
                url,
                headers: Object.assign({
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'https://www.pixiv.net/'
                }, opts.headers || {}),
                responseType: opts.responseType || 'json',
                onload: r => {
                    if (r.status >= 200 && r.status < 300) resolve(r.response);
                    else reject(new Error('HTTP ' + r.status + ' fetching ' + url));
                },
                onerror: e => reject(new Error('Network error: ' + (e.error || 'Check connectivity')))
            });
        });
    }

    function gmFetchBlob(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: { 'Referer': 'https://www.pixiv.net/' },
                responseType: 'arraybuffer',
                onload: r => {
                    if (r.status >= 200 && r.status < 300) {
                        resolve(new Blob([r.response], { type: r.responseHeaders.match(/content-type:\s*([^\r\n;]+)/i)?.[1] || 'application/octet-stream' }));
                    } else reject(new Error('HTTP ' + r.status + ' fetching asset'));
                },
                onerror: e => reject(new Error('Network error fetching asset: ' + (e.error || 'failed')))
            });
        });
    }

    async function fetchNovel(id) {
        const data = await gmFetch('https://www.pixiv.net/ajax/novel/' + id);
        if (!data || !data.body) throw new Error('Empty novel payload received from Pixiv API');
        const body = data.body;
        body._blocks = normalizeBlocks(body);
        return body;
    }

    function cleanInlineMarkup(t) {
        return String(t || '')
            .replace(/\[b:([^\]]*)\]/g, '$1')
            .replace(/\[(?:newpage|chapter:[^\]]*|jump:[^\]]*|rev:[^\]]*|uploadimage:\d+|pixivimage:\d+)\]/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\u3000/g, ' ')
            .replace(/^\s+|\s+$/g, '');
    }

    function parseMarkupString(str, images) {
        const blocks = [];
        let textAcc = '';
        const flush = () => {
            const lines = textAcc.split(/\r?\n+/);
            textAcc = '';
            for (const line of lines) {
                const t = cleanInlineMarkup(line);
                if (t) blocks.push({ type: 'text', text: t });
            }
        };
        const tokenRe = /\[(newpage|chapter:[^\]]*|uploadimage:\d+|pixivimage:\d+)\]/g;
        let m;
        let last = 0;
        while ((m = tokenRe.exec(String(str || ''))) !== null) {
            textAcc += m.input.slice(last, m.index);
            const tok = m[1];
            if (tok === 'newpage') {
                flush();
                blocks.push({ type: 'new_page' });
            } else if (tok.startsWith('chapter:')) {
                flush();
                const title = cleanInlineMarkup(tok.slice('chapter:'.length));
                if (title) blocks.push({ type: 'chapter', text: title });
            } else {
                flush();
                const idx = parseInt(tok.split(':')[1], 10);
                const meta = (images || [])[idx];
                if (meta) {
                    blocks.push({
                        type: 'image',
                        urls: meta.urls || { original: meta.originalUrl || meta.url || '' },
                        uuid: meta.uuid,
                    });
                }
            }
            last = m.index + m[0].length;
        }
        textAcc += String(str || '').slice(last);
        flush();
        return blocks;
    }

    function normalizeBlocks(novel) {
        if (Array.isArray(novel.content)) {
            const blocks = [];
            for (const b of novel.content) {
                if (!b) continue;
                if (b.type === 'image') {
                    blocks.push({
                        type: 'image',
                        urls: b.urls || { original: b.originalUrl || b.url || '' },
                        uuid: b.uuid,
                    });
                } else if (b.type === 'text') {
                    const t = String(b.text || '');
                    if (t.includes('[newpage]') || t.includes('[chapter:') ||
                        t.includes('[uploadimage:') || t.includes('[pixivimage:')) {
                        blocks.push(...parseMarkupString(t, novel.images || []));
                    } else {
                        const clean = cleanInlineMarkup(t);
                        if (clean) blocks.push({ type: 'text', text: clean });
                    }
                } else if (b.type === 'new_page' || b.type === 'jump_page') {
                    blocks.push({ type: 'new_page' });
                } else if (typeof b.text === 'string') {
                    const clean = cleanInlineMarkup(b.text);
                    if (clean) blocks.push({ type: 'text', text: clean });
                }
            }
            return blocks;
        }
        if (typeof novel.content === 'string') return parseMarkupString(novel.content, novel.images || []);
        if (typeof novel.text === 'string') return parseMarkupString(novel.text, novel.images || []);
        return [];
    }

    async function fetchCover(url) {
        if (!url) return null;
        let full = url;
        if (full.startsWith('//')) full = 'https:' + full;
        else if (full.startsWith('/')) full = 'https://www.pixiv.net' + full;
        return await gmFetchBlob(full);
    }

    // -----------------------------------------------------------------
    // Vertical Japanese Typography Formatters
    // -----------------------------------------------------------------
    function escapeXML(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Applies Tate-chū-yoko (縦中横) to 1-2 digit numbers and double exclamation/question marks,
     * ensuring authentic published Japanese novel appearance in vertical e-readers.
     */
    function formatVerticalText(text) {
        const escaped = escapeXML(text);
        let formatted = escaped.replace(/([!?！？]{2})/g, '<span class="tcy">$1</span>');
        formatted = formatted.replace(/(^|[^\d])(\d{1,2})(?=[^\d]|$)/g, '$1<span class="tcy">$2</span>');
        return formatted;
    }

    function buildNavXHTML(novel, pageCount) {
        const items = [
            `<li><a href="front.xhtml">前付・あらすじ</a></li>`,
        ];
        for (let i = 1; i <= pageCount; i++) {
            items.push(`<li><a href="chap_${i}.xhtml">本文（${i}）</a></li>`);
        }
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${novel.language || 'ja'}">
<head>
<meta charset="utf-8" />
<title>目次</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body class="vrl toc-page">
<h1 class="toc-heading">目次</h1>
<nav epub:type="toc" id="toc"><ol>${items.join('')}</ol></nav>
</body>
</html>`;
    }

    function buildCoverXHTML(novel, coverHref) {
        if (coverHref) {
            return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${novel.language || 'ja'}">
<head>
<meta charset="utf-8" />
<title>${escapeXML(novel.title)} — 表紙</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body class="cover">
<img class="cover-art" src="${coverHref}" alt="表紙" />
</body>
</html>`;
        }

        // Japanese Bunkobon-style Typographic Cover Fallback
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${novel.language || 'ja'}">
<head>
<meta charset="utf-8" />
<title>${escapeXML(novel.title)} — 表紙</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body class="cover-fallback">
<div class="cover-frame">
  <div class="cover-inner-border">
    <div class="cover-content">
      <h1 class="cover-title">${formatVerticalText(novel.title)}</h1>
      <p class="cover-author">${formatVerticalText(novel.userName || novel.author || '')} 著</p>
    </div>
    <div class="cover-footer">PIXIV NOVEL ARCHIVE</div>
  </div>
</div>
</body>
</html>`;
    }

    function buildFrontXHTML(novel, avatarHref) {
        const avatarImg = avatarHref
            ? `<div class="avatar-wrap"><img class="avatar" src="${avatarHref}" alt="" /></div>`
            : '';
        const author = escapeXML(novel.userName || novel.author || '');
        // Link the author name to their pixiv profile when we have a userId.
        const authorLink = novel.userId
            ? `<a class="author-link" href="https://www.pixiv.net/en/users/${encodeURIComponent(novel.userId)}">${author}</a>`
            : author;
        const viewOnPixiv = novel.id
            ? `<p class="source"><a href="https://www.pixiv.net/novel/show.php?id=${encodeURIComponent(novel.id)}">pixiv 小説 #${escapeXML(novel.id)} を開く</a></p>`
            : `<p class="source">pixiv 小説 #${escapeXML(novel.id || '')}</p>`;
        // Pixiv descriptions contain HTML (e.g. <br />). Escape the text
        // first for safety, then restore only <br> and <p> tags.
        const descEscaped = escapeXML(String(novel.description || ''))
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean)
            .join('<br/>');
        const descHtml = descEscaped
            .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
            .replace(/&lt;p&gt;/gi, '<p>')
            .replace(/&lt;\/p&gt;/gi, '</p>')
            .replace(/&lt;\/?(?!br|p)[a-z][^&]*&gt;/gi, ''); // strip any other tag
        const descLines = `<p>${descHtml}</p>`;
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${novel.language || 'ja'}">
<head>
<meta charset="utf-8" />
<title>${escapeXML(novel.title)} — 前付</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body class="front">
<section class="titleblock">
  <h1>${escapeXML(novel.title)}</h1>
  <div class="credit">
    ${avatarImg}
    <p class="author">作：${authorLink}</p>
    ${viewOnPixiv}
  </div>
</section>
<section class="synopsis">
  <h2>あらすじ</h2>
  ${descLines}
</section>
</body>
</html>`;
    }

    function buildMergedFront(meta, avatarHref) {
        const avatarImg = avatarHref ? `<div class="avatar-wrap"><img class="avatar" src="${avatarHref}" alt="" /></div>` : '';
        const author = escapeXML(meta.authorName || '');
        // Link the author name to their pixiv profile when we have a userId.
        const authorLink = meta.userId
            ? `<a class="author-link" href="https://www.pixiv.net/en/users/${encodeURIComponent(meta.userId)}">${author}</a>`
            : author;
        const viewOnPixiv = meta.id
            ? `<p class="source"><a href="https://www.pixiv.net/novel/series/${encodeURIComponent(meta.id)}">pixiv シリーズ #${escapeXML(String(meta.id))} を開く</a></p>`
            : `<p class="source">pixiv 小説シリーズ #${escapeXML(String(meta.id || ''))}</p>`;
        const descEscaped = escapeXML(String(meta.desc || ''))
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean)
            .join('<br/>');
        const descHtml = descEscaped
            .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
            .replace(/&lt;p&gt;/gi, '<p>')
            .replace(/&lt;\/p&gt;/gi, '</p>')
            .replace(/&lt;\/?(?!br|p)[a-z][^&]*&gt;/gi, ''); // strip any other tag
        const descLines = `<p>${descHtml}</p>`;
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${meta.lang || 'ja'}">
<head>
<meta charset="utf-8" />
<title>${escapeXML(meta.title)} — 前付</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body class="front">
<section class="titleblock">
  <h1>${escapeXML(meta.title)}</h1>
  <div class="credit">
    ${avatarImg}
    <p class="author">作：${authorLink}</p>
    ${viewOnPixiv}
  </div>
</section>
<section class="synopsis">
  <h2>シリーズ紹介・あらすじ</h2>
  ${descLines}
</section>
</body>
</html>`;
    }

    function buildMergedNav(meta, navChapters) {
        const items = navChapters
            .map(c => {
                const num = c.order != null ? c.order : c.sec;
                const ext = c.pixivUrl
                    ? ` <a class="toc-ext" href="${escapeXML(c.pixivUrl)}">（pixiv）</a>`
                    : '';
                if (c.unavailable) {
                    // Unavailable chapter: still numbered, no link, marked.
                    return `<li class="toc-unavailable"><span class="toc-num">${formatVerticalText(num)}</span> <span class="toc-title">${escapeXML(c.title)}</span> <span class="toc-badge">（未収録）</span>${ext}</li>`;
                }
                return `<li><a href="${c.href}#sec-title-${c.sec}">${formatVerticalText(num)} ${escapeXML(c.title)}</a>${ext}</li>`;
            })
            .join('');
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${meta.lang || 'ja'}">
<head>
<meta charset="utf-8" />
<title>目次</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body class="vrl toc-page">
<h1 class="toc-heading">目次</h1>
<nav epub:type="toc" id="toc"><ol>${items}</ol></nav>
</body>
</html>`;
    }

    function buildTocXHTML(meta, chapters) {
        const items = chapters.map((c, i) => {
            const num = c.order != null ? c.order : i + 1;
            const ext = c.pixivUrl
                ? ` <a class="toc-ext" href="${escapeXML(c.pixivUrl)}">（pixiv）</a>`
                : '';
            if (c.unavailable) {
                return `<li class="toc-unavailable"><span class="toc-num">${formatVerticalText(num)}</span> <span class="toc-title">${escapeXML(c.title || '')}</span> <span class="toc-badge">（未収録）</span>${ext}</li>`;
            }
            const href = `${c.href}#sec-title-${c.sec != null ? c.sec : i + 1}`;
            return `<li><a href="${href}">${formatVerticalText(num)} ${escapeXML(c.title || '')}</a>${ext}</li>`;
        }).join('');
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${meta.lang || 'ja'}">
<head>
<meta charset="utf-8" />
<title>目次</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body class="vrl toc-page">
<h1 class="toc-heading">目次</h1>
<nav epub:type="toc" id="toc"><ol>${items}</ol></nav>
</body>
</html>`;
    }

    function buildMergedOPF(meta, allHrefs, cover, avatar, imgFiles) {
        const items = [
            '<item id="css" href="style.css" media-type="text/css" />',
            '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />',
            '<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" />',
            '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml" />',
            '<item id="front" href="front.xhtml" media-type="application/xhtml+xml" />',
        ];
        if (cover && cover.href) {
            items.push(`<item id="cover-img" href="${cover.href}" media-type="${cover.media}" properties="cover-image" />`);
        }
        if (avatar) {
            items.push(`<item id="author-img" href="${avatar.href}" media-type="image/jpeg" />`);
        }
        allHrefs.forEach((href, i) => {
            items.push(`<item id="doc_${i + 1}" href="${href}" media-type="application/xhtml+xml" />`);
        });
        (imgFiles || []).forEach((f, i) => {
            const ext = (f.name.match(/\.([a-z0-9]+)$/i) || [])[1] || 'jpg';
            const media = ext === 'png' ? 'image/png'
                        : ext === 'gif' ? 'image/gif'
                        : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            items.push(`<item id="img_${i + 1}" href="${f.name.slice('OEBPS/'.length)}" media-type="${media}" />`);
        });

        const spine = [
            '<itemref idref="cover" linear="yes" />',
            '<itemref idref="front" linear="yes" />',
            '<itemref idref="toc" linear="yes" />',
            '<itemref idref="nav" linear="no" />',
        ];
        for (let i = 0; i < allHrefs.length; i++) spine.push(`<itemref idref="doc_${i + 1}" />`);

        const now = new Date();
        const date = now.toISOString().split('T')[0];
        return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${meta.lang || 'ja'}" dir="rtl">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">urn:uuid:${uuidFromId('series-' + (meta.id || 'pixiv'))}</dc:identifier>
<dc:title>${escapeXML(meta.title)}</dc:title>
<dc:creator>${escapeXML(meta.authorName || '')}</dc:creator>
<dc:language>${meta.lang || 'ja'}</dc:language>
<dc:description>${escapeXML((meta.desc || '').slice(0, 2000))}</dc:description>
<dc:date>${date}</dc:date>
<meta property="dcterms:modified">${now.toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
</metadata>
<manifest>${items.join('')}</manifest>
<spine page-progression-direction="rtl">${spine.join('')}</spine>
</package>`;
    }

    // -----------------------------------------------------------------
    // Internal EPUB Stylesheet (JLReq vertical standard)
    // -----------------------------------------------------------------
    function buildCSS() {
        return `
@namespace epub "http://www.idpf.org/2007/ops";

/* Modern Vertical Japanese Typography */
html, body {
    margin: 0;
    padding: 0;
}

body.vrl {
    writing-mode: vertical-rl;
    -webkit-writing-mode: vertical-rl;
    -epub-writing-mode: vertical-rl;
    text-orientation: mixed;
    direction: ltr;
    font-family: "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif CJK JP", "Source Han Serif", serif;
    font-size: 1.02em;
    line-height: 1.95;
    padding: 2.2em 1.8em;
    color: #1e1a17;
    background-color: #fdfdfc;
    word-break: normal;
    line-break: strict;
}

/* Tate-chū-yoko (Horizontal text in vertical flow) */
.tcy {
    -webkit-text-combine: horizontal;
    -epub-text-combine: horizontal;
    text-combine-upright: all;
    padding: 0 0.08em;
}

/* Paragraphs */
body.vrl p {
    margin: 0 0.4em 0.8em 0;
    text-indent: 1em;
    orphans: 1;
    widows: 1;
}

body.vrl h1, body.vrl h2 {
    margin: 0 0.5em 1.4em 0;
    text-indent: 0;
}

body.vrl h2.chapter-title {
    font-size: 1.35em;
    letter-spacing: 0.18em;
    color: #110e0c;
    font-weight: 700;
    border-inline-end: 2.5px solid #a89f91;
    padding-inline-end: 0.4em;
    margin: 0 0.8em 1.6em 0;
}

body.vrl hr.page-break {
    border: 0;
    border-inline-start: 1px dashed #b8ad9e;
    block-size: 3.5em;
    margin: 0 1.2em;
}

body.vrl figure.inline {
    margin: 0 0.8em 1.2em 0;
    text-align: center;
}
body.vrl figure.inline img {
    max-inline-size: 85vh;
    max-block-size: 92%;
    height: auto;
    border-radius: 4px;
}

/* Cover Image Artwork */
body.cover {
    margin: 0;
    padding: 0;
    text-align: center;
}
body.cover img.cover-art {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    margin: 0 auto;
}

/* Typographic Japanese Cover Fallback */
body.cover-fallback {
    margin: 0;
    padding: 0;
    height: 100vh;
    background: #faf8f5;
    display: flex;
    align-items: center;
    justify-content: center;
}
.cover-frame {
    box-sizing: border-box;
    width: 88%;
    height: 90%;
    border: 3px double #2b2520;
    padding: 12px;
    display: flex;
    flex-direction: column;
}
.cover-inner-border {
    border: 1px solid #8c8073;
    height: 100%;
    box-sizing: border-box;
    padding: 3em 1.5em;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}
.cover-content {
    writing-mode: vertical-rl;
    -webkit-writing-mode: vertical-rl;
    height: 80%;
    margin: 0 auto;
}
.cover-title {
    font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
    font-size: 1.8em;
    letter-spacing: 0.22em;
    color: #1a1614;
    margin: 0 0 0 1.2em;
    line-height: 1.4;
}
.cover-author {
    font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
    font-size: 1.1em;
    letter-spacing: 0.16em;
    color: #4a4037;
    margin: 0;
}
.cover-footer {
    text-align: center;
    font-size: 0.72em;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: #9c9185;
}

/* Front Matter & Synopsis */
body.front {
    font-family: "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif CJK JP", serif;
    padding: 2.8em 2em;
    line-height: 1.85;
    color: #2b2520;
    background-color: #fdfdfc;
}
body.front .titleblock {
    text-align: center;
    padding-bottom: 2em;
    border-bottom: 1px solid #e5e0da;
    margin-bottom: 2.2em;
}
body.front h1 {
    font-size: 1.65em;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin: 0 0 0.8em 0;
    color: #1a1614;
}
body.front .credit {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}
body.front .avatar-wrap {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 2px solid #ded6ca;
    overflow: hidden;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
}
body.front .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
body.front p.author {
    font-size: 1.05em;
    font-weight: 600;
    margin: 0.4em 0 0.1em;
    color: #2b2520;
}
body.front .author-link {
    color: #0284c7;
    text-decoration: none;
    border-bottom: 1px dotted #0284c7;
}
body.front .author-link:hover { text-decoration: underline; }
body.front p.source {
    font-size: 0.8em;
    color: #857a70;
    margin: 0;
}
body.front p.source a {
    color: #0284c7;
    text-decoration: none;
    border-bottom: 1px dotted #0284c7;
}
body.front p.source a:hover { text-decoration: underline; }
body.front .synopsis {
    background: #fbf9f6;
    border: 1px solid #ece6de;
    border-radius: 10px;
    padding: 1.5em 1.8em;
}
body.front .synopsis h2 {
    font-size: 1.15em;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #3b322a;
    margin: 0 0 0.8em 0;
    border-bottom: 1px solid #ded6ca;
    padding-bottom: 0.4em;
}
body.front .synopsis p {
    text-indent: 1em;
    margin: 0.6em 0;
    font-size: 0.95em;
    color: #383029;
}

/* Vertical Table of Contents */
body.vrl.toc-page {
    padding: 2.5em 2.2em;
}
body.vrl.toc-page h1.toc-heading {
    font-size: 1.4em;
    letter-spacing: 0.25em;
    color: #2b2520;
    margin: 0 0.8em 1.6em 0;
    border-inline-end: 2.5px solid #8c8071;
    padding-inline-end: 0.4em;
}
body.vrl nav#toc ol {
    list-style: none;
    padding: 0;
    margin: 0;
}
body.vrl nav#toc li {
    display: block;
    margin: 0 0 0 1.8em;
    line-height: 1.85;
}
body.vrl nav#toc li a {
    text-decoration: none;
    color: #2b2520;
    display: block;
}
body.vrl nav#toc li a:hover {
    color: #0284c7;
}
/* External (pixiv) link next to a TOC entry */
body.vrl nav#toc .toc-ext {
    font-size: 0.78em;
    color: #0284c7;
    text-decoration: none;
    border-bottom: 1px dotted #0284c7;
    margin-inline-start: 0.5em;
}
body.vrl nav#toc .toc-ext:hover { text-decoration: underline; }
/* Chapter page footer link back to pixiv */
body.vrl .chapter-source {
    margin-top: 2.5em;
    font-size: 0.85em;
}
body.vrl .chapter-source a {
    color: #0284c7;
    text-decoration: none;
    border-bottom: 1px dotted #0284c7;
}
body.vrl .chapter-source a:hover { text-decoration: underline; }
/* Unavailable chapter entries: muted, non-link, with a badge */
body.vrl nav#toc li.toc-unavailable {
    color: #9a938b;
}
body.vrl nav#toc li.toc-unavailable .toc-badge {
    font-size: 0.85em;
    color: #b03a2e;
}
/* Unavailable chapter placeholder page */
body.vrl .unavailable {
    margin-top: 2em;
}
body.vrl .unavailable .unavailable-msg {
    font-size: 1.15em;
    color: #b03a2e;
}
body.vrl .unavailable .unavailable-sub {
    color: #6b655d;
    font-size: 0.95em;
}
        `.trim();
    }

    // -----------------------------------------------------------------
    // Packaging & ZIP Building
    // -----------------------------------------------------------------
    async function makeZip(files) {
        const crc32 = await crc32Table();
        const encoder = new TextEncoder();

        let canRawDeflate = false;
        if (typeof CompressionStream !== 'undefined') {
            try { new CompressionStream('deflate-raw'); canRawDeflate = true; } catch (_) {}
        }

        const entries = [];
        for (const f of files) {
            let raw;
            if (f.name === 'mimetype') {
                raw = encoder.encode(f.content);
            } else if (f.content instanceof Blob) {
                raw = new Uint8Array(await f.content.arrayBuffer());
            } else {
                raw = encoder.encode(f.content);
            }

            const crc = crc32.compute(raw);
            let data = raw;
            let method = 0;
            if (f.name !== 'mimetype' && canRawDeflate && raw.byteLength > 64) {
                const deflated = await rawDeflate(raw);
                if (deflated && deflated.byteLength < raw.byteLength) {
                    data = deflated;
                    method = 8;
                }
            }

            const header = new DataView(new ArrayBuffer(30));
            header.setUint32(0, 0x04034b50, true);
            header.setUint16(4, 20, true);
            header.setUint16(6, 0x0800, true);
            header.setUint16(8, method, true);
            header.setUint16(10, 0, true);
            header.setUint16(12, 0, true);
            header.setUint32(14, crc, true);
            header.setUint32(18, data.byteLength, true);
            header.setUint32(22, raw.byteLength, true);
            header.setUint16(26, f.name.length, true);
            header.setUint16(28, 0, true);

            entries.push({
                header: new Uint8Array(header.buffer),
                name: encoder.encode(f.name),
                data,
                rawLen: raw.byteLength,
                method,
                crc,
            });
        }

        const parts = [];
        const central = [];
        let offset = 0;
        for (const e of entries) {
            const localPart = concat(e.header, e.name, e.data);
            parts.push(localPart);
            central.push({ offset, e });
            offset += localPart.byteLength;
        }

        for (const { e, offset: off } of central) {
            const cd = new DataView(new ArrayBuffer(46));
            cd.setUint32(0, 0x02014b50, true);
            cd.setUint16(4, 20, true);
            cd.setUint16(6, 20, true);
            cd.setUint16(8, 0x0800, true);
            cd.setUint16(10, e.method, true);
            cd.setUint16(12, 0, true);
            cd.setUint16(14, 0, true);
            cd.setUint32(16, e.crc, true);
            cd.setUint32(20, e.data.byteLength, true);
            cd.setUint32(24, e.rawLen, true);
            cd.setUint16(28, e.name.byteLength, true);
            cd.setUint16(30, 0, true);
            cd.setUint16(32, 0, true);
            cd.setUint16(34, 0, true);
            cd.setUint16(36, 0, true);
            cd.setUint32(38, 0, true);
            cd.setUint32(42, off, true);
            parts.push(new Uint8Array(cd.buffer), e.name);
        }

        const centralStart = offset;
        let centralSize = 0;
        for (const { e } of central) centralSize += 46 + e.name.byteLength;

        const eocd = new DataView(new ArrayBuffer(22));
        eocd.setUint32(0, 0x06054b50, true);
        eocd.setUint16(4, 0, true);
        eocd.setUint16(6, 0, true);
        eocd.setUint16(8, central.length, true);
        eocd.setUint16(10, central.length, true);
        eocd.setUint32(12, centralSize, true);
        eocd.setUint32(16, centralStart, true);
        eocd.setUint16(20, 0, true);
        parts.push(new Uint8Array(eocd.buffer));

        return new Blob(parts, { type: 'application/epub+zip' });
    }

    async function rawDeflate(raw) {
        try {
            const s = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
            return new Uint8Array(await new Response(s).arrayBuffer());
        } catch (_) { return null; }
    }

    function concat(...arrs) {
        const total = arrs.reduce((n, a) => n + a.byteLength, 0);
        const out = new Uint8Array(total);
        let off = 0;
        for (const a of arrs) { out.set(a, off); off += a.byteLength; }
        return out;
    }

    async function crc32Table() {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            table[n] = c >>> 0;
        }
        return {
            compute(data) {
                let c = 0xffffffff;
                for (let i = 0; i < data.byteLength; i++) {
                    c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
                }
                return (c ^ 0xffffffff) >>> 0;
            }
        };
    }

    function uuidFromId(seed) {
        let h = 2166136261 >>> 0;
        for (const c of String(seed)) {
            h ^= c.codePointAt(0);
            h = Math.imul(h, 16777619) >>> 0;
        }
        const hex = h.toString(16).padStart(8, '0').repeat(2) + '0'.repeat(16);
        const s = (hex.slice(0, 12) + '4' + hex.slice(13, 16) + 'a' + hex.slice(17)).toLowerCase();
        return s.slice(0, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16) + '-' +
               s.slice(16, 20) + '-' + s.slice(20, 32);
    }

    function buildOPF(novel, fileCount, coverHref, coverMedia, imageHrefs, avatarHref) {
        const items = [
            '<item id="css" href="style.css" media-type="text/css" />',
            '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />',
            '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml" />',
            '<item id="front" href="front.xhtml" media-type="application/xhtml+xml" />',
        ];
        if (coverHref) {
            items.push(`<item id="cover-img" href="${coverHref}" media-type="${coverMedia}" properties="cover-image" />`);
        }
        if (avatarHref) {
            const ext = (avatarHref.match(/\.([a-z0-9]+)$/i) || [])[1] || 'jpg';
            const media = ext === 'png' ? 'image/png'
                        : ext === 'gif' ? 'image/gif'
                        : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            items.push(`<item id="author-img" href="${avatarHref}" media-type="${media}" />`);
        }
        for (let i = 1; i <= fileCount; i++) {
            items.push(`<item id="chap_${i}" href="chap_${i}.xhtml" media-type="application/xhtml+xml" />`);
        }
        (imageHrefs || []).forEach((href, idx) => {
            const ext = (href.match(/\.([a-z0-9]+)$/i) || [])[1] || 'jpg';
            const media = ext === 'png' ? 'image/png'
                        : ext === 'gif' ? 'image/gif'
                        : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            items.push(`<item id="img_${idx + 1}" href="${href}" media-type="${media}" />`);
        });

        const spine = [
            '<itemref idref="cover" linear="yes" />',
            '<itemref idref="front" linear="yes" />',
            '<itemref idref="nav" linear="no" />',
        ];
        for (let i = 1; i <= fileCount; i++) spine.push(`<itemref idref="chap_${i}" />`);

        const now = new Date();
        const date = now.toISOString().split('T')[0];
        return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${novel.language || 'ja'}" dir="rtl">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">urn:uuid:${uuidFromId(novel.id || 'pixiv')}</dc:identifier>
<dc:title>${escapeXML(novel.title)}</dc:title>
<dc:creator>${escapeXML(novel.userName || novel.author || '')}</dc:creator>
<dc:language>${novel.language || 'ja'}</dc:language>
<dc:description>${escapeXML((novel.description || '').slice(0, 2000))}</dc:description>
<dc:date>${date}</dc:date>
<meta property="dcterms:modified">${now.toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
</metadata>
<manifest>${items.join('')}</manifest>
<spine page-progression-direction="rtl">${spine.join('')}</spine>
</package>`;
    }

    function buildContainer() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;
    }

    async function collectSeries(startNovel, onProgress) {
        const snd = startNovel.seriesNavData;
        if (!snd || !snd.seriesId) {
            return {
                series: null,
                novels: [startNovel],
                entries: [{
                    novel: startNovel,
                    title: startNovel.title || '',
                    available: true,
                    fetchable: true,
                    order: 1,
                    id: startNovel.id,
                }],
            };
        }

        // Fetch one chapter by id; tolerate failures for unavailable chapters
        // by returning a placeholder so the chain can keep going.
        async function fetchOrPlaceholder(id, orderHint, available, titleHint) {
            try {
                const n = await fetchNovel(id);
                const ns = n.seriesNavData || {};
                return {
                    novel: n,
                    title: n.title || titleHint || '',
                    available: available !== false,
                    fetchable: true,
                    order: ns.order || orderHint || 0,
                    id,
                };
            } catch (e) {
                console.warn('[pixiv-epub] chapter fetch failed (unavailable):', id, e);
                return {
                    novel: null,
                    title: titleHint || '',
                    available: available !== false,
                    fetchable: false,
                    order: orderHint || 0,
                    id,
                };
            }
        }

        const seen = new Set([String(startNovel.id)]);
        const back = [];
        let cur = startNovel;
        let guard = 0;
        while (cur && cur.seriesNavData && cur.seriesNavData.prev && cur.seriesNavData.prev.id && guard++ < 500) {
            const pid = String(cur.seriesNavData.prev.id);
            if (seen.has(pid)) break;
            seen.add(pid);
            const ent = await fetchOrPlaceholder(
                pid, cur.seriesNavData.prev.order, cur.seriesNavData.prev.available, cur.seriesNavData.prev.title);
            back.push(ent);
            if (onProgress) onProgress(back.slice().reverse().concat([{ id: startNovel.id }]));
            if (!ent.fetchable) break; // cannot continue past a missing chapter
            cur = ent.novel;
        }
        back.reverse();

        const entries = back.concat([{
            novel: startNovel,
            title: startNovel.title || '',
            available: snd.available !== false,
            fetchable: true,
            order: snd.order || 0,
            id: startNovel.id,
        }]);
        if (onProgress) onProgress(entries.slice());
        cur = startNovel;
        guard = 0;
        while (cur && cur.seriesNavData && cur.seriesNavData.next && cur.seriesNavData.next.id && guard++ < 500) {
            const nid = String(cur.seriesNavData.next.id);
            if (seen.has(nid)) break;
            seen.add(nid);
            const ent = await fetchOrPlaceholder(
                nid, cur.seriesNavData.next.order, cur.seriesNavData.next.available, cur.seriesNavData.next.title);
            entries.push(ent);
            if (onProgress) onProgress(entries.slice());
            if (!ent.fetchable) break; // cannot continue past a missing chapter
            cur = ent.novel;
        }

        return {
            series: {
                id: snd.seriesId,
                title: snd.title || '',
                order: snd.order || 0,
                total: entries.length,
            },
            entries,                  // [{novel?, title, available, fetchable, order, id}]
            novels: entries.filter(e => e.novel).map(e => e.novel),
        };
    }

    async function fetchSeriesMeta(seriesId) {
        try {
            const d = await gmFetch('https://www.pixiv.net/ajax/novel/series/' + seriesId);
            const b = d && d.body;
            if (!b) return null;
            const cu = (b.cover && b.cover.urls) || {};
            return {
                id: b.id,
                title: b.title || '',
                caption: b.caption || '',
                total: b.total,
                coverUrl: cu['1200x1200'] || cu.master || cu.original || cu['240mw'] || '',
                userName: b.userName || '',
                userId: b.userId || '',
                profileImageUrl: b.profileImageUrl || '',
            };
        } catch (e) {
            console.warn('[pixiv-epub] Series meta:', e);
            return null;
        }
    }

    async function rewriteImageBlocks(blocks, ctx) {
        const out = [];
        for (const b of blocks || []) {
            if (!b || b.type !== 'image') { out.push(b); continue; }
            const orig = b.urls && b.urls.original;
            if (!orig) { out.push({ type: 'image' }); continue; }
            let local = ctx.urlToLocal.get(orig);
            if (!local) {
                try {
                    const blob = await fetchCover(orig);
                    if (blob && blob.size > 0) {
                        const ext = (orig.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || 'jpg').toLowerCase();
                        ctx.counter++;
                        local = `images/img_${ctx.counter}.${ext}`;
                        ctx.urlToLocal.set(orig, local);
                        ctx.files.push({ name: 'OEBPS/' + local, content: blob });
                    }
                } catch (e) {
                    console.warn('[pixiv-epub] Image fetch:', orig, e);
                }
            }
            out.push(local ? { ...b, _localSrc: local } : { type: 'image' });
        }
        return out;
    }

    function splitChunk(blocks) {
        const pages = [[]];
        for (const b of blocks || []) {
            if (b && (b.type === 'new_page' || b.type === 'jump_page')) {
                pages.push([]);
            } else {
                pages[pages.length - 1].push(b);
            }
        }
        const MAX = 120;
        const out = [];
        for (const p of pages) {
            if (p.length === 0) continue;
            if (p.length <= MAX) { out.push(p); continue; }
            for (let i = 0; i < p.length; i += MAX) out.push(p.slice(i, i + MAX));
        }
        if (out.length === 0) out.push([]);
        return out;
    }

    function blocksToXHTMLV2(pageBlocks) {
        const out = [];
        for (const b of pageBlocks || []) {
            if (!b) continue;
            if (b.type === 'text') {
                const t = String(b.text || '').trim();
                if (t) out.push(`<p>${formatVerticalText(t)}</p>`);
            } else if (b.type === 'chapter') {
                const t = String(b.text || '').trim();
                if (t) out.push(`<h2 class="chapter-title">${formatVerticalText(t)}</h2>`);
            } else if (b.type === 'new_page' || b.type === 'jump_page') {
                out.push('<hr class="page-break" />');
            } else if (b.type === 'image') {
                if (b._localSrc) {
                    out.push(`<figure class="inline"><img src="${b._localSrc}" alt="" /></figure>`);
                }
            }
        }
        return out.join('\n');
    }

    function chapterXHTML(title, pageBlocks, index, total, lang, opts) {
        const o = opts || {};
        const head = title ? `<h2 class="chapter-title" id="sec-title-${index}">${formatVerticalText(title)}</h2>` : '';
        let body = blocksToXHTMLV2(pageBlocks || []);
        if (o.unavailable) {
            // Unavailable chapter placeholder.
            body = `<div class="unavailable">
<p class="unavailable-msg">この章は現在利用できません。</p>
<p class="unavailable-sub">Chapter ${escapeXML(String(o.order || index))}${o.id ? ' (ID: ' + escapeXML(String(o.id)) + ')' : ''} は pixiv 上で閲覧できないため、収録していません。</p>
</div>`;
        }
        // External link to the chapter on pixiv (when available).
        const extLink = o.pixivUrl
            ? `<p class="chapter-source"><a href="${escapeXML(o.pixivUrl)}">pixiv でこの章を読む</a></p>`
            : '';
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang || 'ja'}">
<head>
<meta charset="utf-8" />
<title>${escapeXML(title || '')} — Page ${index} / ${total}</title>
<link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body class="vrl" style="writing-mode: vertical-rl;">
${head}
${body}
${extLink}
</body>
</html>`;
    }

    async function resolveCover(url) {
        if (!url) return { href: null, media: null, blob: null };
        try {
            const blob = await fetchCover(url);
            if (!blob || blob.size === 0) return { href: null, media: null, blob: null };
            const ext = (url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || 'jpg').toLowerCase();
            const href = 'cover.' + (ext === 'jpeg' ? 'jpg' : ext);
            const media = ext === 'png' ? 'image/png'
                        : ext === 'gif' ? 'image/gif'
                        : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            return { href, media, blob };
        } catch (e) {
            console.warn('[pixiv-epub] Cover fetch:', e);
            return { href: null, media: null, blob: null };
        }
    }

    async function resolveAvatar(userId) {
        if (!userId) return null;
        try {
            const u = await gmFetch('https://www.pixiv.net/ajax/user/' + userId);
            const avUrl = u && u.body && (u.body.image || u.body.imageBig || '');
            if (!avUrl) return null;
            const blob = await fetchCover(avUrl);
            if (!blob || blob.size === 0) return null;
            const ext = (avUrl.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || 'jpg').toLowerCase();
            return { href: 'author.' + (ext === 'jpeg' ? 'jpg' : ext), blob };
        } catch (e) {
            console.warn('[pixiv-epub] Avatar fetch:', e);
            return null;
        }
    }

    // -----------------------------------------------------------------
    // Book Assembler
    // -----------------------------------------------------------------
    async function buildSingleEpub(novel, overrides) {
        const title = (overrides && overrides.title) || novel.title;
        const desc = (overrides && overrides.desc) || novel.description || '';
        const blocks = (overrides && overrides.blocks) || novel._blocks || [];
        const imgFiles = (overrides && overrides.imgFiles) || [];
        const coverUrl = (overrides && overrides.coverUrl) || novel.coverUrl || novel.imageUrl || novel.url || novel.cover || '';

        const meta = { ...novel, title, description: desc };
        const cover = await resolveCover(coverUrl);
        const avatar = await resolveAvatar(meta.userId);

        const pages = splitChunk(blocks);
        const fileCount = pages.length;
        const files = [
            { name: 'mimetype', content: 'application/epub+zip' },
            { name: 'META-INF/container.xml', content: buildContainer() },
            { name: 'OEBPS/content.opf', content: buildOPF(meta, fileCount, cover.href, cover.media, imgFiles.map(f => f.name.slice('OEBPS/'.length)), avatar ? avatar.href : null) },
            { name: 'OEBPS/nav.xhtml', content: buildNavXHTML(meta, fileCount) },
            { name: 'OEBPS/cover.xhtml', content: buildCoverXHTML(meta, cover.href) },
            { name: 'OEBPS/front.xhtml', content: buildFrontXHTML(meta, avatar ? avatar.href : null) },
            { name: 'OEBPS/style.css', content: buildCSS() },
        ];
        if (cover.blob) files.push({ name: 'OEBPS/' + cover.href, content: cover.blob });
        if (avatar) files.push({ name: 'OEBPS/' + avatar.href, content: avatar.blob });
        for (const f of imgFiles) files.push(f);

        for (let i = 0; i < fileCount; i++) {
            files.push({
                name: `OEBPS/chap_${i + 1}.xhtml`,
                content: chapterXHTML(title, pages[i], i + 1, fileCount, meta.language || 'ja', {
                    pixivUrl: `https://www.pixiv.net/novel/show.php?id=${encodeURIComponent(novel.id || '')}`,
                }),
            });
        }
        return makeZip(files);
    }

    async function buildMergedEpub(meta, chapters, imgFiles, startNovel) {
        const cover = await resolveCover(meta.coverUrl || startNovel.coverUrl || '');
        const avatar = await resolveAvatar(meta.userId || startNovel.userId);

        const allHrefs = [];
        const navChapters = [];
        const bodyFiles = [];
        chapters.forEach((ch, ci) => {
            const title = ch.title || `${meta.title} 第${ch.order}話`;
            const pixivUrl = ch.id ? `https://www.pixiv.net/novel/show.php?id=${encodeURIComponent(ch.id)}` : '';
            if (ch.available === false || !ch.blocks) {
                // Unavailable chapter: still numbered in the TOC, but with a
                // placeholder page instead of content, and no link target.
                const href = `chap_${ci + 1}.xhtml`;
                allHrefs.push(href);
                const sec = allHrefs.length;
                navChapters.push({ href, title, sec, order: ch.order, current: !!ch.current, unavailable: true, pixivUrl });
                bodyFiles.push({
                    name: 'OEBPS/' + href,
                    content: chapterXHTML(title, [], sec, 0, meta.lang || 'ja', {
                        unavailable: true,
                        id: ch.id,
                        seriesTitle: meta.title,
                        pixivUrl,
                    }),
                });
                return;
            }
            const pages = splitChunk(ch.blocks);
            pages.forEach((pb, pi) => {
                const href = pages.length === 1 ? `chap_${ci + 1}.xhtml` : `chap_${ci + 1}_${pi + 1}.xhtml`;
                allHrefs.push(href);
                const sec = allHrefs.length;
                if (pi === 0) navChapters.push({ href, title, sec, order: ch.order, current: !!ch.current, pixivUrl });
                bodyFiles.push({
                    name: 'OEBPS/' + href,
                    content: chapterXHTML(title, pb, sec, 0, meta.lang || 'ja', { pixivUrl }),
                });
            });
        });

        const files = [
            { name: 'mimetype', content: 'application/epub+zip' },
            { name: 'META-INF/container.xml', content: buildContainer() },
            { name: 'OEBPS/content.opf', content: buildMergedOPF(meta, allHrefs, cover, avatar, imgFiles) },
            { name: 'OEBPS/nav.xhtml', content: buildMergedNav(meta, navChapters) },
            { name: 'OEBPS/toc.xhtml', content: buildTocXHTML(meta, navChapters) },
            { name: 'OEBPS/cover.xhtml', content: buildCoverXHTML({ title: meta.title, userName: meta.authorName, language: meta.lang }, cover.href) },
            { name: 'OEBPS/front.xhtml', content: buildMergedFront(meta, avatar ? avatar.href : null) },
            { name: 'OEBPS/style.css', content: buildCSS() },
        ];
        if (cover.blob) files.push({ name: 'OEBPS/' + cover.href, content: cover.blob });
        if (avatar) files.push({ name: 'OEBPS/' + avatar.href, content: avatar.blob });
        for (const f of imgFiles) files.push(f);
        for (const f of bodyFiles) files.push(f);
        return makeZip(files);
    }

    // -----------------------------------------------------------------
    // Execution Orchestrator
    // -----------------------------------------------------------------
    async function run() {
        const m = location.search.match(/id=(\d+)/);
        if (!m) throw new Error('No valid novel ID found in the current page URL.');
        const id = m[1];
        const opts = readOptions();

        setStatus('Retrieving novel #' + id + '…', 'busy');
        setProgress(10, 'Fetching novel payload');
        const startNovel = await fetchNovel(id);
        const { series, entries } = await collectSeries(startNovel);
        const isSeries = !!series && entries.length > 1;
        const wantSeries = isSeries && opts.scope === 'series';

        if (!wantSeries) {
            setStatus('Compiling vertical Japanese EPUB…', 'busy');
            setProgress(60, 'Assembling pages & typography');
            const blob = await buildSingleEpub(startNovel);
            setProgress(90, 'Preparing archive');
            const safeTitle = (startNovel.title || 'pixiv-novel-' + id).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120);
            const filename = `${safeTitle} (pixiv ${id}).epub`;
            triggerDownload(blob, filename);
            setProgress(100, 'Complete');
            setStatus('Saved: ' + filename, 'ok');
            setBusy(false);
            return;
        }

        // Series Mode
        setStatus(`Gathering all ${entries.length} series chapters…`, 'busy');
        const ctx = { counter: 0, files: [], urlToLocal: new Map() };
        const chapters = [];
        for (let i = 0; i < entries.length; i++) {
            const ent = entries[i];
            const pct = 15 + Math.round((i / entries.length) * 45);
            setProgress(pct, `Chapter ${i + 1}/${entries.length}: asset fetching`);
            if (!ent.fetchable || !ent.novel) {
                // Unavailable chapter — placeholder only.
                chapters.push({
                    id: ent.id || '',
                    title: ent.title || `第${ent.order || i + 1}話`,
                    order: ent.order || i + 1,
                    blocks: null,
                    lang: 'ja',
                    current: false,
                    available: false,
                });
                continue;
            }
            const n = ent.novel;
            setStatus(`Fetching images & text (${i + 1}/${entries.length})…`, 'busy');
            const blocks = await rewriteImageBlocks(n._blocks || [], ctx);
            chapters.push({
                id: n.id,
                title: n.title || '',
                order: ent.order || (n.seriesNavData && n.seriesNavData.order) || i + 1,
                blocks,
                lang: n.language || 'ja',
                current: String(n.id) === String(id),
                available: ent.available !== false,
            });
        }

        const smeta = await fetchSeriesMeta(series.id);
        const meta = {
            id: (smeta && smeta.id) || series.id,
            title: (smeta && smeta.title) || series.title || startNovel.title,
            desc: (smeta && smeta.caption) || startNovel.description || '',
            authorName: (smeta && smeta.userName) || startNovel.userName || '',
            userId: (smeta && smeta.userId) || startNovel.userId || '',
            coverUrl: (smeta && smeta.coverUrl) || startNovel.coverUrl || '',
            lang: startNovel.language || 'ja',
        };

        if (opts.output === 'separate') {
            for (let i = 0; i < chapters.length; i++) {
                const ch = chapters[i];
                const pct = 60 + Math.round((i / chapters.length) * 35);
                setProgress(pct, `Packaging chapter ${i + 1} of ${chapters.length}`);
                setStatus(`Generating EPUB for chapter ${i + 1}…`, 'busy');
                const chTitle = ch.title || `${meta.title} 第${ch.order}話`;
                const blob = await buildSingleEpub(startNovel, {
                    title: chTitle,
                    desc: startNovel.description || meta.desc,
                    blocks: ch.blocks,
                    imgFiles: ctx.files,
                    coverUrl: meta.coverUrl,
                });
                const safe = chTitle.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120);
                triggerDownload(blob, `${safe} (pixiv ${ch.id}).epub`);
            }
            setProgress(100, 'Complete');
            setStatus(`Successfully created ${chapters.length} EPUB volumes!`, 'ok');
            setBusy(false);
            return;
        }

        // Single Merged Book Mode
        setStatus('Compiling merged Japanese omnibus volume…', 'busy');
        setProgress(75, 'Constructing vertical omnibus');
        const blob = await buildMergedEpub(meta, chapters, ctx.files, startNovel);
        setProgress(95, 'Writing ZIP container');
        const safeTitle = meta.title.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120);
        const filename = `${safeTitle} (pixiv series ${series.id}).epub`;
        triggerDownload(blob, filename);
        setProgress(100, 'Complete');
        setStatus('Saved: ' + filename, 'ok');
        setBusy(false);
    }

    function triggerDownload(blob, filename) {
        if (typeof GM_download !== 'undefined' && GM_download) {
            try {
                const url = URL.createObjectURL(blob);
                GM_download({ url, name: filename, onload: () => URL.revokeObjectURL(url), onerror: () => fallback() });
                return;
            } catch (e) {}
        }
        fallback();

        function fallback() {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        }
    }

    // Automated test hook
    window.__PIXIV_EPUB_TEST__ = {
        setOptions: (o) => { _testOptions = o || null; },
        simulateNavigation: (id) => {
            // Update location.search + href to mimic a pushState navigation,
            // then run the same handler the History hook would.
            try {
                location.search = '?id=' + id;
                location.href = 'https://www.pixiv.net/novel/show.php?id=' + id;
            } catch (_) { /* location may be read-only in tests */ }
            onNavigated();
        },
    };
    let _testOptions = null;
    function readOptions() {
        if (_testOptions) return _testOptions;
        const scope = (panel.querySelector('input[name="pixiv-epub-scope"]:checked') || {}).value || 'single';
        const output = (panel.querySelector('input[name="pixiv-epub-output"]:checked') || {}).value || 'merged';
        return { scope, output };
    }

})();
