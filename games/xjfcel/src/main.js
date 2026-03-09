import './style.css'

import packageJson from '../package.json'

(function() {
    const LANG = {
        zh: {
            title: "空当接龙 - 经典版",
            headerTitle: "空当接龙",
            buttons: {
                stats: "统计",
                select: "选局",
                new: "新游戏",
                hint: "提示",
                undo: "撤销"
            },
            status: {
                game: "游戏",
                left: "剩余纸牌"
            },
            about: {
                title: "关于",
                header: "一款基于JavaScript的经典空当接龙游戏",
                version: `v${packageJson.version} by XHBL`,
                email: "newxhbl@hotmail.com"
            },
            newGameTitle: "新游戏",
            confirmNewGameMessage: "游戏正在进行，要开始新的一局吗？",
            replayCurrentGame: "重玩本局",
            selectGameTitle: "选局",
            selectGameMessage: "选择 1 - 1000000 之间的游戏编号:",
            errorTitle: "错误",
            invalidSeedMessage: "请输入 1 到 1000000 之间的有效数字。",
            ok: "确定",
            cancel: "取消",
            yes: "是",
            no: "否",
            close: "关闭",
            winTitle: "恭喜",
            winMessage: "恭喜你获胜了！\n再玩新的一局吗？",
            noMovesTitle: "无路可走",
            noMovesMessage: "当前已无路可走。\n您可以撤销上一步或开始新游戏。",
            stats: {
                title: "统计信息",
                played: "已玩游戏",
                won: "已胜游戏",
                rate: "获胜率",
                maxWin: "最多连胜",
                maxLose: "最多连败",
                current: "当前连局",
                reset: "重置",
                confirmReset: "确定要重置所有统计数据吗？",
                winStreakTag: "连胜",
                loseStreakTag: "连败"
            },
            invalidMove: {
                fromFound: "不能从回收区移动牌",
                stackInvalid: "只能移动颜色交替、点数递减的牌序列",
                tooManyCards: "移动的牌数超过限制",
                colorRankMismatch: "目标位置需要颜色交替且点数递减",
                freeOccupied: "该中转空当区已有牌",
                freeSingleOnly: "中转空当只能放置单张牌",
                foundSuitMismatch: "回收区只能放同花色的牌",
                foundRankMismatch: "回收区需要从A开始按顺序放置",
                foundSingleOnly: "回收区只能放置单张牌",
                notLastCard: "只能移动列末尾的牌",
                noFreeSlot: "没有可用的中转空当"
            }
        },
        en: {
            title: "FreeCell - Classic Version",
            headerTitle: "FreeCell",
            buttons: {
                stats: "Stats",
                select: "Select",
                new: "New",
                hint: "Hint",
                undo: "Undo"
            },
            status: {
                game: "Game",
                left: "Cards left"
            },
            about: {
                title: "About",
                header: "A JavaScript-based classic FreeCell game",
                version: `v${packageJson.version} by XHBL`,
                email: "newxhbl@hotmail.com"
            },
            newGameTitle: "New Game",
            confirmNewGameMessage: "A game is in progress. Start a new game?",
            replayCurrentGame: "Replay this game",
            selectGameTitle: "Select Game",
            selectGameMessage: "Enter a game number between 1 - 1,000,000:",
            errorTitle: "Error",
            invalidSeedMessage: "Please enter a valid number between 1 and 1,000,000.",
            ok: "OK",
            cancel: "Cancel",
            yes: "Yes",
            no: "No",
            close: "Close",
            winTitle: "Congratulations",
            winMessage: "You Win!\nPlay a new game?",
            noMovesTitle: "No Moves Left",
            noMovesMessage: "No more moves available.\nYou can undo or start a new game.",
            stats: {
                title: "Statistics",
                played: "Games Played",
                won: "Games Won",
                rate: "Win Percentage",
                maxWin: "Longest Win Streak",
                maxLose: "Longest Lose Streak",
                current: "Current Streak",
                reset: "Reset",
                confirmReset: "Are you sure you want to reset all statistics?",
                winStreakTag: "Wins",
                loseStreakTag: "Losses"
            },
            invalidMove: {
                fromFound: "Cannot move cards from foundation",
                stackInvalid: "Can only move alternating color, descending sequence",
                tooManyCards: "Too many cards to move",
                colorRankMismatch: "Target requires alternating color and descending rank",
                freeOccupied: "Free cell is already occupied",
                freeSingleOnly: "Free cell can only hold one card",
                foundSuitMismatch: "Foundation requires matching suit",
                foundRankMismatch: "Foundation requires ascending rank from Ace",
                foundSingleOnly: "Foundation can only accept one card",
                notLastCard: "Can only move the last card in column",
                noFreeSlot: "No available free cell"
            }
        }
    };
    const STORAGE_KEY = 'xjfcel-savegame';
    const STATS_KEY = 'xjfcel-stats';
    const LANG_KEY = 'xjfcel-lang';

    function detectLanguage() {
        const stored = localStorage.getItem(LANG_KEY);
        if (stored) return stored;
        const browserLang = navigator.language || navigator.userLanguage || '';
        return browserLang.includes('zh') ? 'zh' : 'en';
    }
    let currentLang = detectLanguage();

    function t(key, params = {}) {
        let text = key.split('.').reduce((obj, k) => obj && obj[k], LANG[currentLang]);
        if (text === undefined) return key;
        if (typeof text === 'string') {
            for (const [param, value] of Object.entries(params)) {
                text = text.replace(`{${param}}`, value);
            }
        }
        return text;
    }

    function updateUIText() {
        document.title = t('title');
        document.getElementById('game-title').textContent = t('headerTitle');
        document.getElementById('langToggle').textContent = currentLang === 'zh' ? '中' : 'EN';
        
        document.getElementById('stats-btn').textContent = t('buttons.stats');
        document.getElementById('select-game-btn').textContent = t('buttons.select');
        document.getElementById('new-game-btn').textContent = t('buttons.new');
        document.getElementById('hint-btn').textContent = t('buttons.hint');
        document.getElementById('undo-btn').textContent = t('buttons.undo');

        try { updateStatusBar(); } catch (e) {}
    }

    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem(LANG_KEY, lang);
        updateUIText();
    }

    let gameStats = {
        played: 0,
        won: 0,
        winStreak: 0,
        maxWinStreak: 0,
        maxLoseStreak: 0
    };

    function loadStats() {
        const s = localStorage.getItem(STATS_KEY);
        if (s) {
            try {
                const parsed = JSON.parse(s);
                Object.assign(gameStats, parsed);
            } catch(e) {}
        }
    }

    function saveStats() {
        localStorage.setItem(STATS_KEY, JSON.stringify(gameStats));
    }

    function updateStatsOnWin() {
        gameStats.played++;
        gameStats.won++;
        if (gameStats.winStreak > 0) {
            gameStats.winStreak++;
        } else {
            gameStats.winStreak = 1;
        }
        if (gameStats.winStreak > gameStats.maxWinStreak) {
            gameStats.maxWinStreak = gameStats.winStreak;
        }
        saveStats();
    }

    function checkAbandonment() {
        if (game.hasMoved && !game.isWon) {
            gameStats.played++;
            if (gameStats.winStreak < 0) {
                gameStats.winStreak--;
            } else {
                gameStats.winStreak = -1;
            }
            if (Math.abs(gameStats.winStreak) > gameStats.maxLoseStreak) {
                gameStats.maxLoseStreak = Math.abs(gameStats.winStreak);
            }
            saveStats();
        }
    }

    function saveGameState() {
        if (game.isWon) {
            clearSavedGame();
            return;
        }
        const state = {
            seed: game.seed,
            free: game.free,
            found: game.found,
            cols: game.cols,
            history: game.history,
            score: game.score,
            isWon: game.isWon,
            hasMoved: game.hasMoved
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function clearSavedGame() {
        localStorage.removeItem(STORAGE_KEY);
    }

    function loadAndInitialize() {
        updateUIText();
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const state = JSON.parse(savedData);
                if (state.isWon) {
                    clearSavedGame();
                    return newRandomGame(true);
                }
                Object.assign(game, state);
                if (state.hasMoved === undefined && game.history.length > 0) {
                    game.hasMoved = true;
                }
                updateAndRender();
            } catch (e) {
                newRandomGame(true);
            }
        } else {
            newRandomGame(true);
        }
    }

    function showMessageBox(options) {
        const { title = t('title'), message, type = 'info', buttons = 'ok', checkbox = null, callback } = options;
        const overlay = document.getElementById('msgbox-overlay');
        const iconEl = document.getElementById('msgbox-icon');
        const textEl = document.getElementById('msgbox-text');
        const btnsEl = document.getElementById('msgbox-buttons');
        const closeBtn = document.getElementById('msgbox-close');
        const titleEl = document.querySelector('#msgbox-overlay .title-bar .title span');

        document.querySelector('.msgbox-window').classList.remove('stats-mode');

        if (titleEl) titleEl.textContent = title;
        textEl.innerHTML = message;

        if (checkbox && checkbox.text) {
            textEl.innerHTML += `<div style="margin-top: 10px;"><label style="cursor: pointer; display: flex; align-items: center;"><input type="checkbox" id="msgbox-checkbox" style="margin: 0 6px 0 0;"><span>${checkbox.text}</span></label></div>`;
        }

        iconEl.style.display = 'block';

        let iconChar = '';
        if (type === 'question') iconChar = '❓';
        else if (type === 'error') iconChar = '❌';
        else if (type === 'win') iconChar = '🚩';
        else iconChar = 'ℹ️';
        iconEl.textContent = iconChar;

        btnsEl.innerHTML = '';
        const createBtn = (text, val) => {
            const btn = document.createElement('button');
            btn.className = 'msgbox-btn';
            btn.textContent = text;
            btn.onclick = () => {
                overlay.style.display = 'none';
                if (callback) {
                    const checkboxEl = document.getElementById('msgbox-checkbox');
                    const checkboxChecked = checkboxEl ? checkboxEl.checked : false;
                    callback({ confirmed: val, checkboxChecked: checkboxChecked });
                }
            };
            return btn;
        };

        if (buttons === 'yes-no') {
            btnsEl.appendChild(createBtn(t('yes'), true));
            btnsEl.appendChild(createBtn(t('no'), false));
        } else {
            btnsEl.appendChild(createBtn(t('ok'), true));
        }

        closeBtn.onclick = () => {
            overlay.style.display = 'none';
            if (callback) callback({ confirmed: false, checkboxChecked: false });
        };
        overlay.style.display = 'block';
    }

    function showInputBox(options) {
        const { title, message, defaultValue = '', callback } = options;
        const overlay = document.getElementById('msgbox-overlay');
        const iconEl = document.getElementById('msgbox-icon');
        const textEl = document.getElementById('msgbox-text');
        const btnsEl = document.getElementById('msgbox-buttons');
        const closeBtn = document.getElementById('msgbox-close');
        const titleEl = document.querySelector('#msgbox-overlay .title-bar .title span');

        document.querySelector('.msgbox-window').classList.remove('stats-mode');

        if (titleEl) titleEl.textContent = title;
        
        textEl.innerHTML = `${message}<br><input type="number" id="msgbox-input" value="${defaultValue}" style="width: 100%; margin-top: 10px; padding: 4px; border: 1px solid #808080; -webkit-user-select: text; user-select: text;">`;
        
        iconEl.textContent = '';
        iconEl.style.display = 'none';
        btnsEl.innerHTML = '';
        const createBtn = (text, val, isDefault) => {
            const btn = document.createElement('button');
            btn.className = 'msgbox-btn';
            btn.textContent = text;
            btn.onclick = () => {
                const input = document.getElementById('msgbox-input');
                const value = val ? input.value : null;
                overlay.style.display = 'none';
                if (callback) callback(value);
            };
            if (isDefault) {
                setTimeout(() => btn.focus(), 100);
            }
            return btn;
        };

        const okBtn = createBtn(t('ok'), true, false);
        const cancelBtn = createBtn(t('cancel'), false, false);
        
        btnsEl.appendChild(okBtn);
        btnsEl.appendChild(cancelBtn);

        const inputEl = document.getElementById('msgbox-input');
        inputEl.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                okBtn.click();
            } else if (e.key === 'Escape') {
                cancelBtn.click();
            }
        };
        setTimeout(() => {
            inputEl.focus();
            inputEl.select();
        }, 50);

        closeBtn.onclick = () => {
            overlay.style.display = 'none';
            if (callback) callback(null);
        };
        overlay.style.display = 'block';
    }

    function showAbout() {
        const about = t('about');
        const emailLink = `<a href="mailto:${about.email}?subject=[xjfcel]: Inquiry" target="_blank">${about.email}</a>`;
        const message = `${about.header}\n\n${about.version}\n${emailLink}`;
        showMessageBox({ title: about.title, message: message, type: 'info', buttons: 'ok' });
    }

    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r);
            this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r);
            this.lineTo(x, y + r);
            this.quadraticCurveTo(x, y, x + r, y);
            this.closePath();
            return this;
        };
    }

    class MSRand {
        constructor(seed) { this.seed = seed; }
        next() { this.seed = (this.seed * 214013 + 2531011) & 0xFFFFFFFF; return (this.seed >>> 16) & 0x7FFF; }
    }

    const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
    const SYMBOLS = { 'hearts':'♥', 'diamonds':'♦', 'clubs':'♣', 'spades':'♠' };
    
    const faceImages = {};
    ['j', 'q', 'k'].forEach(k => {
        const img = new Image();
        img.src = `./pkp_${k}.svg`;
        faceImages[k] = img;
    });

    function getCardPosition(pos, cardIndex) {
        let x = 0, y = 0;
        if (pos.type === 'free') {
            x = layout.freeSlotsPos[pos.idx].x;
            y = layout.freeSlotsPos[pos.idx].y;
        } else if (pos.type === 'found') {
            x = layout.foundSlotsPos[pos.idx].x;
            y = layout.foundSlotsPos[pos.idx].y;
        } else if (pos.type === 'cols') {
            x = layout.colsXPos[pos.idx];
            const colY = layout.paddingY + layout.cardH + layout.rowGap;
            y = colY + cardIndex * layout.stackYOffset;
        }
        return { x, y };
    }

    async function animateMove(cards, from, to) {
        const duration = 150;
        const canvas = document.getElementById('canvas');
        const flyers = [];

        let startIdx = 0;
        if (from.type === 'cols') startIdx = game.cols[from.idx].length - cards.length;

        let destIdx = 0;
        if (to.type === 'cols') destIdx = game.cols[to.idx].length;

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const startPos = getCardPosition(from, startIdx + i);
            
            const el = createCardEl(card, { type: 'animation' });
            el.style.width = `${layout.cardW}px`;
            el.style.height = `${layout.cardH}px`;
            
            let fontSize = Math.max(10, Math.floor(layout.stackYOffset * 0.90));
            const paddingX = (window.innerWidth <= 600 || window.innerHeight <= 500) ? 4 : 8;
            if (fontSize * 2.2 > layout.cardW - paddingX) {
                fontSize = Math.floor((layout.cardW - paddingX) / 2.2);
            }
            el.style.fontSize = `${fontSize}px`;
            const suitL = el.querySelector('.suit-l');
            if (suitL) {
                suitL.style.fontSize = `${Math.max(20, Math.floor(layout.cardW * 0.9))}px`;
            }

            el.style.position = 'absolute';
            el.style.left = `${startPos.x}px`;
            el.style.top = `${startPos.y}px`;
            el.style.zIndex = 1000 + i;
            el.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out`;
            el.style.pointerEvents = 'none';
            el.classList.add('selected');

            const originalEl = document.querySelector(`.card[data-id="${card.id}"]`);
            if (originalEl) originalEl.style.visibility = 'hidden';

            canvas.appendChild(el);
            flyers.push({ el, index: i });
        }

        if (flyers.length > 0) flyers[0].el.getBoundingClientRect();

        flyers.forEach(({ el, index }) => {
            const destPos = getCardPosition(to, destIdx + index);
            el.style.left = `${destPos.x}px`;
            el.style.top = `${destPos.y}px`;
        });

        await new Promise(r => setTimeout(r, duration));
        flyers.forEach(f => f.el.remove());
    }

    function updateStatusBar() {
        document.getElementById('game-info').innerText = `${t('status.game')}: #${game.seed}`;
        const cardsOnBoard = game.cols.reduce((sum, col) => sum + col.length, 0) + game.free.filter(Boolean).length;
        document.getElementById('cards-left-info').innerText = `${t('status.left')}: ${cardsOnBoard}`;
    }

    class FreeCellLogic {
        constructor() { 
            this.reset(Math.floor(Math.random() * 1000000) + 1); 
            this.score = 0;
            this.isWon = false;
            this.history = [];
        }

        reset(seed) {
            this.seed = seed;
            this.free = Array(4).fill(null);
            this.found = [0, 0, 0, 0];
            this.cols = Array.from({length: 8}, () => []);
            this.isWon = false;
            this.history = [];
            this.score = 0;
            this.hasMoved = false;
            let deck = [];
            for (let r = 13; r >= 1; r--) {
                for (let s = 3; s >= 0; s--) {
                    let suit = SUITS[s];
                    deck.push({ suit: suit, rank: r, isRed: (suit === 'hearts' || suit === 'diamonds'), id: suit + r });
                }
            }
            const rng = new MSRand(seed);
            for (let i = 0; i < 52; i++) {
                let j = 51 - (rng.next() % (52 - i));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            deck.forEach((card, i) => this.cols[i % 8].push(card));
        }

        getMaxMovable(toEmptyCol) {
            const freeCells = this.free.filter(c => !c).length;
            let emptyCols = this.cols.filter(c => c.length === 0).length;
            if (toEmptyCol) emptyCols--;
            return (freeCells + 1) * Math.pow(2, Math.max(0, emptyCols));
        }

        getHints() {
            const hints = [];
            
            for (let c = 0; c < 8; c++) {
                if (this.cols[c].length > 0) {
                    let card = this.cols[c][this.cols[c].length - 1];
                    let suitIdx = SUITS.indexOf(card.suit);
                    if (card.rank === this.found[suitIdx] + 1) {
                        hints.push({ src: { type: 'cols', idx: c, card }, dest: { type: 'found', idx: suitIdx }, score: 100 });
                    }
                }
            }
            for (let f = 0; f < 4; f++) {
                if (this.free[f]) {
                    let card = this.free[f];
                    let suitIdx = SUITS.indexOf(card.suit);
                    if (card.rank === this.found[suitIdx] + 1) {
                        hints.push({ src: { type: 'free', idx: f, card }, dest: { type: 'found', idx: suitIdx }, score: 100 });
                    }
                }
            }

            for (let f = 0; f < 4; f++) {
                if (this.free[f]) {
                    let card = this.free[f];
                    for (let c = 0; c < 8; c++) {
                        if (this.cols[c].length > 0) {
                            let top = this.cols[c][this.cols[c].length - 1];
                            if (top.isRed !== card.isRed && top.rank === card.rank + 1) {
                                hints.push({ src: { type: 'free', idx: f, card }, dest: { type: 'cols', idx: c }, score: 50 });
                            }
                        } else if (this.getMaxMovable(true) >= 1) {
                             hints.push({ src: { type: 'free', idx: f, card }, dest: { type: 'cols', idx: c }, score: 20 });
                        }
                    }
                }
            }
            for (let c1 = 0; c1 < 8; c1++) {
                if (this.cols[c1].length === 0) continue;
                let col = this.cols[c1];
                
                let card = col[col.length - 1];
                
                let validLen = 1;
                for (let k = col.length - 2; k >= 0; k--) {
                    if (col[k].isRed !== col[k+1].isRed && col[k].rank === col[k+1].rank + 1) validLen++;
                    else break;
                }

                for (let j = 0; j < validLen; j++) {
                    let idx = col.length - validLen + j;
                    let cardToMove = col[idx];
                    let cardsToMove = col.slice(idx);
                    for (let c2 = 0; c2 < 8; c2++) {
                        if (c1 === c2) continue;
                        let valid = false;
                        let score = 0;

                        if (this.cols[c2].length > 0) {
                            let top = this.cols[c2][this.cols[c2].length - 1];
                            if (top.isRed !== cardToMove.isRed && top.rank === cardToMove.rank + 1) {
                                valid = true;
                                score = 40 + cardsToMove.length; // 优先移动长序列
                            }
                        } else if (idx > 0) {
                            valid = true; // 移动到空列 (不移动整列到空列)
                            score = 30;
                        }

                        if (valid && cardsToMove.length <= this.getMaxMovable(this.cols[c2].length === 0)) {
                            hints.push({ src: { type: 'cols', idx: c1, card: cardToMove }, dest: { type: 'cols', idx: c2 }, score: score });
                        }
                    }
                }
            }

            const emptyFreeIndices = this.free.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
            if (emptyFreeIndices.length > 0) {
                for (let c = 0; c < 8; c++) {
                    if (this.cols[c].length > 0) {
                        let card = this.cols[c][this.cols[c].length - 1];
                        hints.push({ src: { type: 'cols', idx: c, card }, dest: { type: 'free', idx: emptyFreeIndices[0] }, score: 10 });
                    }
                }
            }

            hints.sort((a, b) => b.score - a.score);
            return hints;
        }

        async move(cards, from, to, animate = true) {
            if (!this.hasMoved) {
                this.hasMoved = true;
            }

            this.history.push(JSON.stringify({
                free: this.free.map(f => f ? {...f} : null),
                found: [...this.found],
                cols: this.cols.map(col => col.map(c => ({...c}))),
                score: this.score
            }));
            if (this.history.length > 100) this.history.shift();

            if (animate) {
                await animateMove(cards, from, to);
            }

            if (from.type === 'cols') {
                this.cols[from.idx].splice(-cards.length);
            } else if (from.type === 'free') {
                this.free[from.idx] = null;
            }

            if (to.type === 'cols') {
                this.cols[to.idx].push(...cards);
            } else if (to.type === 'free') {
                this.free[to.idx] = cards[0];
            } else if (to.type === 'found') {
                this.found[to.idx] = cards[0].rank;
                this.score += 10;
            }

            renderContent();
            await this.autoCollect();
            this.checkWin();
            saveGameState();

            if (!this.isWon && this.getHints().length === 0) {
                showMessageBox({
                    title: t('noMovesTitle'),
                    message: t('noMovesMessage'),
                    type: 'error',
                    buttons: 'ok'
                });
            }
        }

        async autoCollect() {
            const candidates = [
                ...this.free.map((c, i) => c ? { card: c, pos: { type: 'free', idx: i } } : null),
                ...this.cols.map((col, i) => col.length > 0 ? { card: col[col.length-1], pos: { type: 'cols', idx: i } } : null)
            ].filter(Boolean);

            for (let { card, pos } of candidates) {
                const suitIdx = SUITS.indexOf(card.suit);

                if (card.rank === this.found[suitIdx] + 1) {
                    
                    let isSafeToMove = false;

                    if (card.rank <= 2) {
                        isSafeToMove = true;
                    } else {
                        const rankToCompare = card.rank - 1;
                        const oppositeColorIndices = card.isRed ? [0, 3] : [1, 2];

                        if (this.found[oppositeColorIndices[0]] >= rankToCompare && 
                            this.found[oppositeColorIndices[1]] >= rankToCompare) {
                            isSafeToMove = true;
                        }
                    }

                    if (isSafeToMove) {
                        await this.move([card], pos, { type: 'found', idx: suitIdx }, true);
                        return;
                    }
                }
            }
        }

        checkWin() {
            if (this.isWon) return;
            if (this.found.every(r => r === 13)) {
                this.isWon = true;
                handleGameWin();
            }
        }

        undo() {
            if (this.history.length === 0) return;
            let prev = JSON.parse(this.history.pop());
            this.free = prev.free.map(f => f ? {...f} : null);
            this.found = [...prev.found];
            this.cols = prev.cols.map(col => col.map(c => ({...c})));
            this.score = prev.score;
            renderContent();
            saveGameState();
        }
    }

    const game = new FreeCellLogic();
    let drag = null;
    let selection = null;
    let currentHints = [];
    let currentHintIndex = 0;
    let lastTapTime = 0;
    const DOUBLE_TAP_DELAY = 300;
    const DRAG_THRESHOLD = 5;
    let layout = {
        cardW: 71, cardH: 96, paddingX: 10, paddingY: 10, colGap: 10, rowGap: 20, statusBarH: 0,
        stackYOffset: 25, topBarH: 0, bottomBarH: 0, canvasW: 0, canvasH: 0,
        freeSlotsPos: [], foundSlotsPos: [], colsXPos: []
    };

    function calculateLayout() {
        const vw = document.documentElement.clientWidth;
        const vh = window.innerHeight;
        const pageContainer = document.querySelector('.page-container');
        const topBar = document.querySelector('.top-info');
        const bottomBar = document.querySelector('.bottom-controls');
        const statusBar = document.querySelector('.status-bar');

        const isLandscapeWide = (vw / vh >= 2) && (vh < 500);
        pageContainer.classList.toggle('landscape-wide', isLandscapeWide);

        layout.topBarH = topBar.offsetHeight;
        layout.statusBarH = statusBar.offsetHeight;
        const sidebarWrapper = document.querySelector('.sidebar-wrapper');
        layout.bottomBarH = sidebarWrapper.offsetHeight;
        const bottomBarWidth = isLandscapeWide ? sidebarWrapper.offsetWidth : 0;
        
        const canvasVpHeight = Math.max(400, vh);
        
        const canvasVpWidth = vw;

        let mode = 'pc';
        if (vw < 480) mode = 'phone';
        else if (vw < 800) mode = 'tablet';

        const basePaddingX = { phone: 1, tablet: 10, pc: 40 }[mode];
        const baseColGap = { phone: 1, tablet: 8, pc: 16 }[mode];
        const cardAspectRatio = 96 / 71;
        
        let vMode = 'pc';
        if (canvasVpHeight < 500) vMode = 'phone';
        else if (canvasVpHeight < 700) vMode = 'tablet';
        const basePaddingY = 5;
        
        const gapValues = { phone: 10, tablet: 15, pc: 20 };
        const baseRowGap = Math.min(gapValues[mode], gapValues[vMode]);

        const availableW = Math.max(320, isLandscapeWide ? canvasVpWidth - bottomBarWidth : canvasVpWidth);
        let cardW_width = (availableW - (2 * basePaddingX) - (7 * baseColGap)) / 8;

        const availableH = canvasVpHeight - layout.topBarH - (isLandscapeWide ? 0 : (layout.bottomBarH + layout.statusBarH));
        const verticalFixedSpace = basePaddingY + baseRowGap + basePaddingY;

        const STACK_OFFSET_RATIO = 0.32;
        const cardHeightFactor = 2 + (12 * STACK_OFFSET_RATIO);
        
        let cardH_height = (availableH - verticalFixedSpace) / cardHeightFactor;
        if (cardH_height <= 0) { cardH_height = 50; }
        let cardW_height = cardH_height / cardAspectRatio;

        let cardW = Math.min(cardW_width, cardW_height);
        cardW = Math.max(30, cardW);

        let cardH = cardW * cardAspectRatio;
 
        layout.cardW = Math.floor(cardW);
        layout.cardH = Math.floor(cardH);
        layout.stackYOffset = Math.floor(layout.cardH * STACK_OFFSET_RATIO);

        const totalWidth = 8 * layout.cardW + 7 * baseColGap;
        const gameAreaWidth = totalWidth + 2 * basePaddingX;
        const containerWidth = isLandscapeWide ? gameAreaWidth + bottomBarWidth : gameAreaWidth;
        pageContainer.style.width = `${containerWidth}px`;

        topBar.style.paddingLeft = `${basePaddingX}px`;
        topBar.style.paddingRight = `${basePaddingX}px`;
        statusBar.style.paddingLeft = `${basePaddingX}px`;
        statusBar.style.paddingRight = `${basePaddingX}px`;
        if (!isLandscapeWide) {
            bottomBar.style.paddingLeft = `${basePaddingX}px`;
            bottomBar.style.paddingRight = `${basePaddingX}px`;
        } else {
            bottomBar.style.paddingLeft = '';
            bottomBar.style.paddingRight = '';
            statusBar.style.paddingLeft = '';
            statusBar.style.paddingRight = '';
        }

        layout.paddingX = basePaddingX;
        layout.paddingY = basePaddingY;
        layout.colGap = baseColGap;
        layout.rowGap = baseRowGap;

        for (let i = 0; i < 4; i++) {
            layout.freeSlotsPos[i] = { x: layout.paddingX + i * (layout.cardW + layout.colGap), y: layout.paddingY };
            layout.foundSlotsPos[i] = { x: layout.paddingX + totalWidth - (4 - i) * layout.cardW - (3 - i) * layout.colGap, y: layout.paddingY };
        }
        for (let i = 0; i < 8; i++) {
            layout.colsXPos[i] = layout.paddingX + i * (layout.cardW + layout.colGap);
        }
    }

    function renderContent() {
        const freeGroup = document.getElementById('free-group');
        const foundGroup = document.getElementById('found-group');
        freeGroup.innerHTML = '';
        foundGroup.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            freeGroup.appendChild(document.createElement('div')).className = 'slot';
            foundGroup.appendChild(document.createElement('div')).className = 'slot';
        }

        const bgIconSize = Math.floor(layout.cardH * 0.66);
        document.documentElement.style.setProperty('--bg-icon-size', `${bgIconSize}px`);

        const gridWidth = 8 * layout.cardW + 7 * layout.colGap;
        document.getElementById('bg-slots').style.cssText = `left:${layout.paddingX}px; top:${layout.paddingY}px; width:${gridWidth}px;`;
        freeGroup.style.gap = `${layout.colGap}px`;
        foundGroup.style.gap = `${layout.colGap}px`;
        
        document.querySelectorAll('.slot').forEach(slot => {
            slot.style.width = `${layout.cardW}px`;
            slot.style.height = `${layout.cardH}px`;
        });

        document.querySelectorAll('.card').forEach(el => el.remove());

        const canvas = document.getElementById('canvas');

        const createAndPlaceCard = (card, pos, x, y, isDraggable) => {
            let el = createCardEl(card, pos);
            el.style.width = `${layout.cardW}px`;
            el.style.height = `${layout.cardH}px`;
            
            let fontSize = Math.max(10, Math.floor(layout.stackYOffset * 0.90));
            const paddingX = (window.innerWidth <= 600 || window.innerHeight <= 500) ? 4 : 8;
            if (fontSize * 2.2 > layout.cardW - paddingX) {
                fontSize = Math.floor((layout.cardW - paddingX) / 2.2);
            }
            el.style.fontSize = `${fontSize}px`;
            const suitL = el.querySelector('.suit-l');
            if (suitL) {
                suitL.style.fontSize = `${Math.max(20, Math.floor(layout.cardW * 0.9))}px`;
            }
            
            canvas.appendChild(el);
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.posData = pos;
            if (isDraggable) el.classList.add('draggable');
        };

        game.free.forEach((c, i) => {
            if (c) createAndPlaceCard(c, {type:'free', idx:i}, layout.freeSlotsPos[i].x, layout.freeSlotsPos[i].y, true);
        });

        game.found.forEach((r, i) => {
            if (r > 0) {
                let card = { suit: SUITS[i], rank: r, isRed: (i===1||i===2), id: SUITS[i]+r };
                createAndPlaceCard(card, {type:'found', idx:i}, layout.foundSlotsPos[i].x, layout.foundSlotsPos[i].y, false);
            }
        });

        const colY = layout.paddingY + layout.cardH + layout.rowGap;
        game.cols.forEach((col, i) => {
            let draggableStartIndex = col.length - 1;
            for (let k = col.length - 2; k >= 0; k--) {
                if (col[k].isRed !== col[k+1].isRed && col[k].rank === col[k+1].rank + 1) {
                    draggableStartIndex = k;
                } else {
                    break;
                }
            }
            col.forEach((c, j) => {
                const isDraggable = j >= draggableStartIndex;
                createAndPlaceCard(c, {type:'cols', idx:i, cardIdx:j}, layout.colsXPos[i], colY + j * layout.stackYOffset, isDraggable);
            });
        });

        updateStatusBar();

        document.getElementById('undo-btn').disabled = game.history.length === 0 || game.isWon;
        document.getElementById('hint-btn').disabled = game.isWon;

        const maxCardsInCol = Math.max(13, ...game.cols.map(c => c.length));
        const requiredCanvasHeight = colY + layout.cardH + ((maxCardsInCol - 1) * layout.stackYOffset) + layout.paddingY;

        canvas.style.minHeight = `${requiredCanvasHeight}px`;
        canvas.style.height = '';
    }

    function updateAndRender() {
        calculateLayout();
        renderContent();
    }

    function clearSelection() {
        if (!selection) return;
        selection.els.forEach(el => el.classList.remove('selected'));
        selection = null;
    }

    function clearHint() {
        document.querySelectorAll('.hint-glow').forEach(el => el.classList.remove('hint-glow'));
        document.querySelectorAll('.col-hint-box').forEach(el => el.remove());
        currentHints = [];
        currentHintIndex = 0;
    }

    let invalidTipElement = null;
    let invalidTipTimeout = null;
    let invalidTipLock = false;

    function showInvalidMoveTip(messageKey) {
        if (invalidTipElement) {
            invalidTipElement.remove();
        }
        if (invalidTipTimeout) {
            clearTimeout(invalidTipTimeout);
        }

        const tip = document.createElement('div');
        tip.className = 'invalid-move-tip';
        tip.innerHTML = `<span class="tip-icon">⚠</span><span class="tip-text">${t('invalidMove.' + messageKey)}</span>`;
        
        const bottomBar = document.querySelector('.bottom-controls');
        bottomBar.insertAdjacentElement('beforebegin', tip);
        
        invalidTipElement = tip;
        
        requestAnimationFrame(() => {
            tip.classList.add('visible');
        });
        
        invalidTipTimeout = setTimeout(() => {
            hideInvalidMoveTip();
        }, 3000);

        invalidTipLock = true;
        setTimeout(() => { invalidTipLock = false; }, 100);
    }

    function hideInvalidMoveTip() {
        if (invalidTipElement) {
            invalidTipElement.classList.remove('visible');
            setTimeout(() => {
                if (invalidTipElement) {
                    invalidTipElement.remove();
                    invalidTipElement = null;
                }
            }, 200);
        }
        if (invalidTipTimeout) {
            clearTimeout(invalidTipTimeout);
            invalidTipTimeout = null;
        }
    }

    function handleGlobalInteraction(e) {
        if (invalidTipElement && !invalidTipLock && !(e.target instanceof Element && e.target.closest('.invalid-move-tip'))) {
            if (e.type === 'mousedown' && e.button === 2) {
                // 右键点击不关闭提示
            } else {
                hideInvalidMoveTip();
            }
        }
        if (currentHints.length === 0) return;
        if (e.target instanceof Element && e.target.closest('#hint-btn')) return;
        clearHint();
    }
    window.addEventListener('mousedown', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction, { passive: true });

    function showHint() {
        document.querySelectorAll('.hint-glow').forEach(el => el.classList.remove('hint-glow'));
        document.querySelectorAll('.col-hint-box').forEach(el => el.remove());

        if (currentHints.length === 0) {
            currentHints = game.getHints();
            currentHintIndex = 0;
        }

        if (currentHints.length === 0) return;

        const hint = currentHints[currentHintIndex];
        currentHintIndex = (currentHintIndex + 1) % currentHints.length;

        if (hint.src.type === 'cols') {
            const col = game.cols[hint.src.idx];
            const startIdx = col.findIndex(c => c.id === hint.src.card.id);
            if (startIdx !== -1) {
                for (let i = startIdx; i < col.length; i++) {
                    const el = document.querySelector(`.card[data-id="${col[i].id}"]`);
                    if (el) el.classList.add('hint-glow');
                }
            }
        } else {
            let srcEl = document.querySelector(`.card[data-id="${hint.src.card.id}"]`);
            if (srcEl) srcEl.classList.add('hint-glow');
        }

        let destEl;
        if (hint.dest.type === 'found') {
            destEl = document.getElementById('found-group').children[hint.dest.idx];
            destEl.classList.add('hint-glow');
        } else if (hint.dest.type === 'free') {
            destEl = document.getElementById('free-group').children[hint.dest.idx];
            destEl.classList.add('hint-glow');
        } else if (hint.dest.type === 'cols') {
            const col = game.cols[hint.dest.idx];
            if (col.length > 0) {
                const card = col[col.length - 1];
                destEl = document.querySelector(`.card[data-id="${card.id}"]`);
                destEl.classList.add('hint-glow');
            } else {
                const x = layout.colsXPos[hint.dest.idx];
                const y = layout.paddingY + layout.cardH + layout.rowGap;
                const hintBox = document.createElement('div');
                hintBox.className = 'col-hint-box';
                hintBox.style.left = x + 'px';
                hintBox.style.top = y + 'px';
                hintBox.style.width = layout.cardW + 'px';
                hintBox.style.height = layout.cardH + 'px';
                document.getElementById('canvas').appendChild(hintBox);
            }
        }
    }

    function handleCardClick(card, pos) {
        if (selection) {
            if (selection.els.some(el => el.dataset.id === card.id)) {
                clearSelection();
                return;
            }

            const { cards: selectedCards, from: selectedFrom } = selection;

            if (pos.type === 'free') {
                if (selectedCards.length !== 1) {
                    showInvalidMoveTip('freeSingleOnly');
                } else if (game.free[pos.idx]) {
                    showInvalidMoveTip('freeOccupied');
                } else {
                    game.move(selectedCards, selectedFrom, { type: 'free', idx: pos.idx });
                }
                clearSelection();
                return;
            }

            if (pos.type === 'found') {
                if (selectedCards.length !== 1) {
                    showInvalidMoveTip('foundSingleOnly');
                } else {
                    const suitIdx = SUITS.indexOf(selectedCards[0].suit);
                    if (pos.idx !== suitIdx) {
                        showInvalidMoveTip('foundSuitMismatch');
                    } else if (selectedCards[0].rank !== game.found[suitIdx] + 1) {
                        showInvalidMoveTip('foundRankMismatch');
                    } else {
                        game.move(selectedCards, selectedFrom, { type: 'found', idx: suitIdx });
                    }
                }
                clearSelection();
                return;
            }

            const dest = { type: 'cols', idx: pos.idx };
            const targetCol = game.cols[dest.idx];

            if (targetCol.length > 0 && targetCol[targetCol.length - 1].id === card.id) {
                const maxMovable = game.getMaxMovable(false);
                if (selectedCards.length <= maxMovable) {
                    let top = targetCol[targetCol.length - 1];
                    if (top.isRed !== selectedCards[0].isRed && top.rank === selectedCards[0].rank + 1) {
                        game.move(selectedCards, selectedFrom, dest);
                        clearSelection();
                        return;
                    } else {
                        showInvalidMoveTip('colorRankMismatch');
                    }
                } else {
                    showInvalidMoveTip('tooManyCards');
                }
            }
            clearSelection();
            return;
        }

        if (pos.type === 'found') {
            if (selection) {
                const { cards: selectedCards } = selection;
                if (selectedCards.length !== 1) {
                    showInvalidMoveTip('foundSingleOnly');
                } else {
                    const suitIdx = SUITS.indexOf(selectedCards[0].suit);
                    if (pos.idx !== suitIdx) {
                        showInvalidMoveTip('foundSuitMismatch');
                    } else if (selectedCards[0].rank !== game.found[suitIdx] + 1) {
                        showInvalidMoveTip('foundRankMismatch');
                    }
                }
                clearSelection();
            }
            return;
        }

        let cardsToSelect = [];
        let elementsToSelect = [];

        if (pos.type === 'cols') {
            const col = game.cols[pos.idx];
            const idx = col.findIndex(c => c.id === card.id);
            const potentialStack = col.slice(idx);
            
            let isStackValid = true;
            for (let i = 0; i < potentialStack.length - 1; i++) {
                if (potentialStack[i].isRed === potentialStack[i+1].isRed || potentialStack[i].rank !== potentialStack[i+1].rank + 1) {
                    isStackValid = false;
                    break;
                }
            }

            if (!isStackValid && pos.cardIdx !== col.length - 1) {
                return;
            }
            cardsToSelect = isStackValid ? potentialStack : [card];

            const maxMovable = game.getMaxMovable(false);
            if (cardsToSelect.length > maxMovable) return;

            elementsToSelect = cardsToSelect.map(c => document.querySelector(`.card[data-id="${c.id}"]`));
        } else {
            cardsToSelect = [card];
            elementsToSelect = [document.querySelector(`.card[data-id="${card.id}"]`)];
        }

        if (cardsToSelect.length > 0) {
            selection = { cards: cardsToSelect, from: pos, els: elementsToSelect };
            elementsToSelect.forEach(el => el.classList.add('selected'));
        }
    }

    function createCardEl(card, pos) {
        const div = document.createElement('div');
        div.className = `card ${card.isRed ? 'red' : 'black'}`;
        div.dataset.id = card.id;
        div.dataset.type = pos.type;
        const rank = card.rank === 1 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank;
        
        if (card.rank > 10) {
            const f = card.rank === 11 ? 'j' : card.rank === 12 ? 'q' : 'k';
            div.innerHTML = `<img src="./pkp_${f}.svg" class="face-img" alt="${f}">` +
                            `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div></div>`;
        } else {
            div.innerHTML = `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div><div class="suit-l">${SYMBOLS[card.suit]}</div></div>`;
        }
        
        div.onmousedown = (e) => {
            if (e.button === 0) startDrag(e, card, div.posData);
            if (e.button === 2) quickMove(card, div.posData);
        };
        div.ontouchstart = (e) => {
            if (e.touches.length > 1) return;
            startTouchDrag(e, card, div.posData);
        };
        div.ondblclick = () => quickMove(card, div.posData);
        return div;
    }

    function startDrag(e, card, pos) {
        if (pos.type === 'found') {
            handleCardClick(card, pos);
            return;
        }
        let cards = [card], els = [];
        if (pos.type === 'cols') {
            const col = game.cols[pos.idx];
            const idx = col.findIndex(c => c.id === card.id);
            for (let i = idx; i < col.length - 1; i++) {
                if (col[i].isRed === col[i+1].isRed || col[i].rank !== col[i+1].rank + 1) return;
            }
            cards = col.slice(idx);
            els = cards.map(c => document.querySelector(`.card[data-id="${c.id}"]`));
        } else {
            els = [e.currentTarget];
        }

        const canvasRect = document.getElementById('canvas').getBoundingClientRect();
        drag = {
            cards, from: pos, els,
            ox: e.clientX - els[0].getBoundingClientRect().left,
            oy: e.clientY - els[0].getBoundingClientRect().top,
            moved: false,
            startX: e.clientX,
            startY: e.clientY
        };

        const moveHandler = (me) => {
            const dx = Math.abs(me.clientX - drag.startX);
            const dy = Math.abs(me.clientY - drag.startY);

            if (!drag.moved && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
                drag.moved = true;
                clearSelection();
                els.forEach(el => el.classList.add('selected'));
            }
            if (drag.moved) {
                els.forEach((el, i) => {
                    el.classList.add('dragging');
                    el.style.left = (me.clientX - canvasRect.left - drag.ox) + 'px';
                    el.style.top = (me.clientY - canvasRect.top - drag.oy + i * layout.stackYOffset) + 'px';
                });
            }
        };

        const upHandler = (ue) => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);

            if (!drag) return;

            if (drag.moved) {
                finishDrag(ue);
            } else {
                handleCardClick(drag.cards[0], drag.from);
                drag = null;
            }
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    function startTouchDrag(e, card, pos) {
        if (pos.type === 'found') return;
        
        let cards = [card], els = [];

        if (pos.type === 'cols') {
            const col = game.cols[pos.idx];
            const idx = col.findIndex(c => c.id === card.id);
            for (let i = idx; i < col.length - 1; i++) {
                if (col[i].isRed === col[i+1].isRed || col[i].rank !== col[i+1].rank + 1) return;
            }
            cards = col.slice(idx);
            els = cards.map(c => document.querySelector(`.card[data-id="${c.id}"]`));
        } else {
            els = [e.currentTarget];
        }

        const touch = e.touches[0];
        const canvasRect = document.getElementById('canvas').getBoundingClientRect();
        
        drag = {
            cards, from: pos, els,
            ox: touch.clientX - els[0].getBoundingClientRect().left,
            oy: touch.clientY - els[0].getBoundingClientRect().top,
            moved: false,
            startX: touch.clientX,
            startY: touch.clientY
        };

        const touchMoveHandler = (te) => {
            const t = te.touches[0];
            const dx = Math.abs(t.clientX - drag.startX);
            const dy = Math.abs(t.clientY - drag.startY);

            if (!drag.moved && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
                drag.moved = true;
                clearSelection();
                els.forEach(el => el.classList.add('selected'));
            }

            if (drag.moved) {
                if (te.cancelable) te.preventDefault();
                els.forEach((el, i) => {
                    el.classList.add('dragging');
                    el.style.left = (t.clientX - canvasRect.left - drag.ox) + 'px';
                    el.style.top = (t.clientY - canvasRect.top - drag.oy + i * layout.stackYOffset) + 'px';
                });
            }
        };

        const touchEndHandler = (te) => {
            if (te.cancelable) te.preventDefault();
            document.removeEventListener('touchmove', touchMoveHandler);
            document.removeEventListener('touchend', touchEndHandler);
            document.removeEventListener('touchcancel', touchCancelHandler);

            if (!drag) return;

            if (drag.moved) {
                const t = te.changedTouches[0];
                finishDrag({ clientX: t.clientX, clientY: t.clientY });
            } else {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTapTime;
                
                if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0) {
                    quickMove(card, pos);
                    lastTapTime = 0;
                } else {
                    handleCardClick(card, pos);
                    lastTapTime = currentTime;
                }
                drag = null;
            }
        };

        const touchCancelHandler = (te) => {
            document.removeEventListener('touchmove', touchMoveHandler);
            document.removeEventListener('touchend', touchEndHandler);
            document.removeEventListener('touchcancel', touchCancelHandler);
            
            if (drag) {
                renderContent();
                drag = null;
            }
        };

        document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        document.addEventListener('touchend', touchEndHandler);
        document.addEventListener('touchcancel', touchCancelHandler);
    }

    function findDestFromCoords(clientX, clientY) {
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        let dest = null;

        const topRowYEnd = layout.paddingY + layout.cardH;
        if (mouseY < topRowYEnd) {
            for (let i = 0; i < 4; i++) {
                const pos = layout.freeSlotsPos[i];
                if (mouseX >= pos.x && mouseX <= pos.x + layout.cardW) {
                    dest = { type: 'free', idx: i };
                    break;
                }
            }
            if (!dest) {
                for (let i = 0; i < 4; i++) {
                    const pos = layout.foundSlotsPos[i];
                    if (mouseX >= pos.x && mouseX <= pos.x + layout.cardW) {
                        dest = { type: 'found', idx: i };
                        break;
                    }
                }
            }
        } else {
            for (let i = 0; i < 8; i++) {
                const x = layout.colsXPos[i];
                if (mouseX >= x && mouseX < x + layout.cardW) {
                    dest = { type: 'cols', idx: i };
                    break;
                }
            }
        }
        return dest;
    }

    function finishDrag(e) {
        const { cards, from, els, moved, ox, oy } = drag;
        els.forEach(el => el.classList.remove('selected'));
        els.forEach(el => el.classList.remove('dragging'));

        if (!moved) {
            handleCardClick(cards[0], from);
            drag = null;
            return;
        }

        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        const cardLeft = mouseX - ox;
        const cardTop = mouseY - oy;
        const cardCenterX = cardLeft + layout.cardW / 2;
        const cardCenterY = cardTop + layout.cardH / 2;

        let dest = null;
        let invalidReason = null;
        
        const topRowYEnd = layout.paddingY + layout.cardH;
        
        if (cardCenterY >= layout.paddingY && cardCenterY <= topRowYEnd) {
            for (let i = 0; i < 4; i++) {
                if (from.type === 'free' && from.idx === i) continue;
                const pos = layout.freeSlotsPos[i];
                if (cardCenterX >= pos.x && cardCenterX <= pos.x + layout.cardW) {
                    dest = { type: 'free', idx: i };
                    break;
                }
            }
            if (!dest) {
                for (let i = 0; i < 4; i++) {
                    if (from.type === 'found' && from.idx === i) continue;
                    const pos = layout.foundSlotsPos[i];
                    if (cardCenterX >= pos.x && cardCenterX <= pos.x + layout.cardW) {
                        dest = { type: 'found', idx: i };
                        break;
                    }
                }
            }
        }

        if (!dest) {
            if (cardCenterY >= layout.paddingY + layout.cardH + layout.rowGap) {
                for (let i = 0; i < 8; i++) {
                    if (from.type === 'cols' && from.idx === i) continue;
                    const x = layout.colsXPos[i];
                    if (cardCenterX >= x && cardCenterX < x + layout.cardW) {
                        dest = { type: 'cols', idx: i };
                        break;
                    }
                }
            }
        }

        if (dest) {
            let valid = false;
            
            if (dest.type === 'cols') {
                const col = game.cols[dest.idx];
                const maxMovable = game.getMaxMovable(col.length === 0);
                if (cards.length > maxMovable) {
                    invalidReason = 'tooManyCards';
                } else {
                    if (col.length === 0) {
                        valid = true;
                    } else {
                        let top = col[col.length-1];
                        if (top.isRed !== cards[0].isRed && top.rank === cards[0].rank + 1) {
                            valid = true;
                        } else {
                            invalidReason = 'colorRankMismatch';
                        }
                    }
                }
            } else if (dest.type === 'free') {
                if (cards.length !== 1) {
                    invalidReason = 'freeSingleOnly';
                } else if (game.free[dest.idx]) {
                    invalidReason = 'freeOccupied';
                } else {
                    valid = true;
                }
            } else if (dest.type === 'found') {
                if (cards.length !== 1) {
                    invalidReason = 'foundSingleOnly';
                } else {
                    let suitIdx = SUITS.indexOf(cards[0].suit);
                    if (dest.idx !== suitIdx) {
                        invalidReason = 'foundSuitMismatch';
                    } else if (cards[0].rank !== game.found[suitIdx] + 1) {
                        invalidReason = 'foundRankMismatch';
                    } else {
                        valid = true;
                    }
                }
            }

            if (valid) {
                game.move(cards, from, dest, false);
            } else if (invalidReason) {
                showInvalidMoveTip(invalidReason);
                renderContent();
            } else {
                renderContent();
            }
        } else {
            renderContent();
        }
        drag = null;
    }

    function quickMove(card, pos) {
        clearSelection();
        if (pos.type === 'found') return;
        if (pos.type === 'cols' && game.cols[pos.idx][game.cols[pos.idx].length-1].id !== card.id) {
            showInvalidMoveTip('notLastCard');
            return;
        }

        let suitIdx = SUITS.indexOf(card.suit);
        if (card.rank === game.found[suitIdx] + 1) {
            game.move([card], pos, { type: 'found', idx: suitIdx });
        } else {
            let emptyFree = game.free.indexOf(null);
            if (emptyFree !== -1) {
                game.move([card], pos, { type: 'free', idx: emptyFree });
            } else {
                showInvalidMoveTip('noFreeSlot');
            }
        }
    }

    let isAnimating = false;

    async function animateDeal() {
        if (isAnimating) return;
        isAnimating = true;

        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        
        const startX = (window.innerWidth / 2) - (layout.cardW / 2) - rect.left;
        const startY = window.innerHeight - rect.top - layout.cardH - 40;

        const dealingOrder = [];
        let maxLen = 0;
        game.cols.forEach(c => maxLen = Math.max(maxLen, c.length));
        
        for (let r = 0; r < maxLen; r++) {
            for (let c = 0; c < 8; c++) {
                if (game.cols[c][r]) {
                    const card = game.cols[c][r];
                    const el = document.querySelector(`.card[data-id="${card.id}"]`);
                    if (el) {
                        dealingOrder.push({ 
                            el, 
                            targetLeft: el.style.left, 
                            targetTop: el.style.top 
                        });
                    }
                }
            }
        }

        document.body.style.pointerEvents = 'none';

        dealingOrder.forEach(({ el }, i) => {
            el.style.transition = 'none';
            el.style.left = `${startX}px`;
            el.style.top = `${startY}px`;
            el.style.zIndex = 100 + i;
        });

        canvas.offsetHeight;

        const delay = 15;
        const duration = 250;
        
        const promises = dealingOrder.map((item, i) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    item.el.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out`;
                    item.el.style.left = item.targetLeft;
                    item.el.style.top = item.targetTop;
                    
                    setTimeout(() => {
                        item.el.style.zIndex = ''; 
                        resolve();
                    }, duration);
                }, i * delay);
            });
        });

        await Promise.all(promises);
        
        isAnimating = false;
        document.body.style.pointerEvents = '';
    }

    async function startNewGame(seed) {
        checkAbandonment();
        game.reset(seed);
        saveGameState();
        updateAndRender();
        const container = document.querySelector('.page-container');
        if (container) container.scrollTop = 0;
        await animateDeal();
    }

    function newRandomGame(force = false) {
        const _start = () => startNewGame(Math.floor(Math.random() * 1000000) + 1);

        if (!force && !game.isWon && game.hasMoved) {
            showMessageBox({
                title: t('newGameTitle'),
                message: t('confirmNewGameMessage'),
                type: 'question',
                buttons: 'yes-no',
                checkbox: { text: t('replayCurrentGame') },
                callback: (result) => {
                    if (result.confirmed) {
                        if (result.checkboxChecked) {
                            startNewGame(game.seed);
                        } else {
                            _start();
                        }
                    }
                }
            });
        } else {
            _start();
        }
    }

    function selectGame() {
        showInputBox({
            title: t('selectGameTitle'),
            message: t('selectGameMessage'),
            defaultValue: game.seed,
            callback: (seed) => {
                if (seed !== null) {
                    let numSeed = parseInt(seed);
                    if (!isNaN(numSeed) && numSeed >= 1 && numSeed <= 1000000) {
                        startNewGame(numSeed);
                    } else {
                        showMessageBox({
                            title: t('errorTitle'),
                            message: t('invalidSeedMessage'),
                            type: 'error'
                        });
                    }
                }
            }
        });
    }
    
    function handleGameWin() {
        document.getElementById('undo-btn').disabled = true;
        document.getElementById('hint-btn').disabled = true;
        updateStatsOnWin();
        clearSavedGame();
        
        const stopAnim = startVictoryDemo();
        
        showMessageBox({
            title: t('winTitle'),
            message: t('winMessage'),
            type: 'win',
            buttons: 'yes-no',
            callback: (result) => {
                stopAnim();
                if (result.confirmed) {
                    newRandomGame(true);
                }
            }
        });
    }

    function startVictoryDemo() {
        document.querySelectorAll('.card').forEach(c => c.style.display = 'none');
        return victoryAnimation();
    }

    function victoryAnimation() {
        let animFrameId;
        const vCanvas = document.getElementById('victory-canvas');
        const ctx = vCanvas.getContext('2d');
        vCanvas.style.display = 'block';
        
        const resizeCanvas = () => {
            vCanvas.width = window.innerWidth;
            vCanvas.height = window.innerHeight;
        };
        resizeCanvas();

        const cards = [];
        const foundSlotsEls = document.getElementById('found-group').children;

        for (let r = 13; r >= 1; r--) {
            for (let s = 0; s < 4; s++) {
                const rect = foundSlotsEls[s].getBoundingClientRect();
                cards.push({
                    rank: r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : r,
                    suit: SYMBOLS[SUITS[s]],
                    isRed: s === 1 || s === 2,
                    x: rect.left,
                    y: rect.top,
                    vx: (Math.random() - 0.5) * 10,
                    vy: Math.random() * -10,
                    active: false,
                    resting: false
                });
            }
        }

        let currentCardIndex = 0;
        const gravity = 0.8;
        const bounce = -0.7;

        function drawCard(c) {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(c.x, c.y, layout.cardW, layout.cardH, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = c.isRed ? '#ff0000' : '#000000';
            
            let fontSize = Math.max(10, Math.floor(layout.stackYOffset * 0.90));
            const paddingX = (window.innerWidth <= 600 || window.innerHeight <= 500) ? 4 : 8;
            if (fontSize * 2.2 > layout.cardW - paddingX) {
                fontSize = Math.floor((layout.cardW - paddingX) / 2.2);
            }

            ctx.font = `bold ${fontSize}px "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(c.rank, c.x + 4, c.y + 2);

            ctx.font = `${fontSize * 0.9}px "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText(c.suit, c.x + layout.cardW - 4, c.y + 4);

            const isFace = ['J', 'Q', 'K'].includes(c.rank);
            const f = isFace ? c.rank.toString().toLowerCase() : null;
            if (isFace && faceImages[f] && faceImages[f].complete && faceImages[f].naturalWidth > 0) {
                const img = faceImages[f];
                const iH = layout.cardW * (img.naturalHeight / img.naturalWidth);
                ctx.drawImage(img, c.x, c.y + layout.cardH - iH, layout.cardW, iH);
            } else {
                const bigSuitSize = Math.max(20, Math.floor(layout.cardW * 0.9));
                ctx.font = `${bigSuitSize}px "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'alphabetic';
                ctx.globalAlpha = 0.8;
                ctx.fillText(c.suit, c.x + layout.cardW / 2, c.y + layout.cardH - 5);
                ctx.globalAlpha = 1.0;
            }
        }

        function animate() {
            if (vCanvas.width !== window.innerWidth || vCanvas.height !== window.innerHeight) {
                resizeCanvas();
            }

            if (currentCardIndex < cards.length && Math.random() > 0.8) {
                cards[currentCardIndex].active = true;
                currentCardIndex++;
            }

            ctx.clearRect(0, 0, vCanvas.width, vCanvas.height);
            const floorY = vCanvas.height
            
            for (let i = cards.length - 1; i >= 0; i--) {
                if (!cards[i].active) {
                    drawCard(cards[i]);
                }
            }

            cards.forEach(c => {
                if (!c.active) return;
                drawCard(c);
                c.x += c.vx;
                
                if (c.resting) {
                    if (c.y + layout.cardH < floorY - 2) c.resting = false;
                }
                
                if (!c.resting) {
                    c.vy += gravity;
                    c.y += c.vy;
                }

                if (c.y + layout.cardH > floorY) {
                    c.y = floorY - layout.cardH;
                    c.vy *= bounce;
                    
                    if (Math.abs(c.vy) < gravity * 3) {
                        c.resting = true;
                        c.vy = 0;
                    }
                }
                if (c.x < 0 || c.x + layout.cardW > vCanvas.width) {
                    c.vx *= -1;
                }
            });

            animFrameId = requestAnimationFrame(animate);
        }
        animate();

        return () => {
            if (animFrameId) cancelAnimationFrame(animFrameId);
            vCanvas.style.display = 'none';
            document.querySelectorAll('.card').forEach(c => c.style.display = '');
        };
    }

    function showStats() {
        const winRate = gameStats.played > 0 ? ((gameStats.won / gameStats.played) * 100).toFixed(1) : 0;
        const currentStreak = gameStats.winStreak;
        
        let streakText = '0';
        if (currentStreak > 0) {
            streakText = `${currentStreak} ${t('stats.winStreakTag')}`;
        } else if (currentStreak < 0) {
            streakText = `${Math.abs(currentStreak)} ${t('stats.loseStreakTag')}`;
        }
        
        const msg = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; text-align: left; font-size: 14px;">
                <div>${t('stats.played')}:</div><div style="text-align:right; font-weight:bold;">${gameStats.played}</div>
                <div>${t('stats.won')}:</div><div style="text-align:right; font-weight:bold;">${gameStats.won}</div>
                <div>${t('stats.rate')}:</div><div style="text-align:right; font-weight:bold;">${winRate}%</div>
                <div style="grid-column: span 2; height: 1px; background: #ccc; margin: 3px 0;"></div>
                <div>${t('stats.maxWin')}:</div><div style="text-align:right; font-weight:bold;">${gameStats.maxWinStreak}</div>
                <div>${t('stats.maxLose')}:</div><div style="text-align:right; font-weight:bold;">${gameStats.maxLoseStreak}</div>
                <div>${t('stats.current')}:</div><div style="text-align:right; font-weight:bold; color: ${currentStreak > 0 ? 'green' : (currentStreak < 0 ? 'red' : 'black')}">${streakText}</div>
            </div>
        `;

        const overlay = document.getElementById('msgbox-overlay');
        const titleEl = document.querySelector('#msgbox-overlay .title-bar .title span');
        const textEl = document.getElementById('msgbox-text');
        const btnsEl = document.getElementById('msgbox-buttons');
        const iconEl = document.getElementById('msgbox-icon');
        const closeBtn = document.getElementById('msgbox-close');

        document.querySelector('.msgbox-window').classList.add('stats-mode');

        titleEl.textContent = t('stats.title');
        textEl.innerHTML = msg;
        iconEl.style.display = 'none';

        btnsEl.innerHTML = '';
        
        const createBtn = (text, onClick) => {
            const btn = document.createElement('button');
            btn.className = 'msgbox-btn';
            btn.textContent = text;
            btn.onclick = onClick;
            return btn;
        };

        btnsEl.appendChild(createBtn(t('close'), () => { overlay.style.display = 'none'; }));
        btnsEl.appendChild(createBtn(t('stats.reset'), () => {
            if (confirm(t('stats.confirmReset'))) {
                gameStats = { played: 0, won: 0, winStreak: 0, maxWinStreak: 0, maxLoseStreak: 0 };
                saveStats();
                showStats();
            }
        }));

        closeBtn.onclick = () => { overlay.style.display = 'none'; };
        overlay.style.display = 'block';
    }

    window.oncontextmenu = (e) => e.preventDefault();

    document.getElementById('new-game-btn').onclick = () => { clearHint(); newRandomGame(); };
    document.getElementById('select-game-btn').onclick = () => { clearHint(); selectGame(); };
    document.getElementById('undo-btn').onclick = () => { if(game.isWon) return; clearHint(); game.undo(); };
    document.getElementById('hint-btn').onclick = showHint;
    document.getElementById('stats-btn').onclick = showStats;
    document.getElementById('aboutLink').onclick = (e) => { e.preventDefault(); clearHint(); showAbout(); };
    document.getElementById('langToggle').onclick = () => { clearHint(); setLanguage(currentLang === 'zh' ? 'en' : 'zh'); };

    document.getElementById('canvas').addEventListener('click', e => {
        if (e.target.closest('.card')) return;
        
        if (!selection) return;
        
        clearHint();

        const dest = findDestFromCoords(e.clientX, e.clientY);

        if (dest) {
            const isDestEmpty = (dest.type === 'free' && !game.free[dest.idx]) || (dest.type === 'cols' && game.cols[dest.idx].length === 0);
            
            if (isDestEmpty || dest.type === 'found') {
                const { cards, from } = selection;
                let valid = false;
                let invalidReason = null;
                
                if (dest.type === 'cols') {
                    const maxMovable = game.getMaxMovable(true);
                    if (cards.length <= maxMovable) {
                        valid = true;
                    } else {
                        invalidReason = 'tooManyCards';
                    }
                } else if (dest.type === 'free') {
                    if (cards.length === 1) {
                        valid = true;
                    } else {
                        invalidReason = 'freeSingleOnly';
                    }
                } else if (dest.type === 'found') {
                    if (cards.length !== 1) {
                        invalidReason = 'foundSingleOnly';
                    } else {
                        let suitIdx = SUITS.indexOf(cards[0].suit);
                        if (dest.idx !== suitIdx) {
                            invalidReason = 'foundSuitMismatch';
                        } else if (cards[0].rank !== game.found[suitIdx] + 1) {
                            invalidReason = 'foundRankMismatch';
                        } else {
                            valid = true;
                        }
                    }
                }

                if (valid) {
                    game.move(cards, from, dest);
                } else if (invalidReason) {
                    showInvalidMoveTip(invalidReason);
                }
            }
        }
        clearSelection();
    });

    const handleResize = () => {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            updateAndRender();
        }, 250);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    document.body.addEventListener('touchstart', () => {}, { passive: true });

    window.startVictoryDemo = startVictoryDemo;

    loadStats();
    loadAndInitialize();
})();
