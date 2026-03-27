
// ========== 空当接龙 FreeCell 经典版主入口 ========== 
// 本文件为核心 JS 逻辑，涵盖算法、动画、布局、交互、兼容性等关键实现。
// 主要模块：多语言、存档、统计、核心算法、动画、布局自适应、交互、提示、胜利动画等。
// 兼容移动端与桌面端，支持响应式布局和触摸操作。

import './style.css'

import packageJson from '../package.json'

// 导入 SVG 资源 - 独立文件方案
import pkp_jc from '@common/images/pkp_jc.svg'
import pkp_jd from '@common/images/pkp_jd.svg'
import pkp_jh from '@common/images/pkp_jh.svg'
import pkp_js from '@common/images/pkp_js.svg'

import pkp_qc from '@common/images/pkp_qc.svg'
import pkp_qd from '@common/images/pkp_qd.svg'
import pkp_qh from '@common/images/pkp_qh.svg'
import pkp_qs from '@common/images/pkp_qs.svg'

import pkp_kc from '@common/images/pkp_kc.svg'
import pkp_kd from '@common/images/pkp_kd.svg'
import pkp_kh from '@common/images/pkp_kh.svg'
import pkp_ks from '@common/images/pkp_ks.svg'

// 创建映射对象用于动态获取图片路径
const faceImageSrcs = {
    // J牌
    'j-clubs': pkp_jc,
    'j-diamonds': pkp_jd,
    'j-hearts': pkp_jh,
    'j-spades': pkp_js,
    // Q牌
    'q-clubs': pkp_qc,
    'q-diamonds': pkp_qd,
    'q-hearts': pkp_qh,
    'q-spades': pkp_qs,
    // K牌
    'k-clubs': pkp_kc,
    'k-diamonds': pkp_kd,
    'k-hearts': pkp_kh,
    'k-spades': pkp_ks
};

// ========== 声音管理系统 ==========
// 导入音频资源
import carddealUrl from '@common/audio/pka_carddeal.mp3'
import cardselsetUrl from '@common/audio/pka_cardselset.mp3'
import hintnomoveUrl from '@common/audio/pka_hintnomove.mp3'
import hintshownUrl from '@common/audio/pka_hintshown.mp3'
import illegalmoveUrl from '@common/audio/pka_illegalmove.mp3'
import liftoffUrl from '@common/audio/pka_liftoff.mp3'
import tofoundUrl from '@common/audio/pka_tofound.mp3'
import undoUrl from '@common/audio/pka_undo.mp3'
import winUrl from '@common/audio/pka_win.mp3'

// 声音管理器
class SoundManager {
    constructor() {
        this.sounds = {
            carddeal: new Audio(carddealUrl),
            cardselset: new Audio(cardselsetUrl),
            hintnomove: new Audio(hintnomoveUrl),
            hintshown: new Audio(hintshownUrl),
            illegalmove: new Audio(illegalmoveUrl),
            liftoff: new Audio(liftoffUrl),
            tofound: new Audio(tofoundUrl),
            undo: new Audio(undoUrl),
            win: new Audio(winUrl)
        };
        this.enabled = true;
        this.loadSettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('xjfcel-sound');
        if (saved !== null) {
            this.enabled = saved === 'true';
        }
    }

    saveSettings() {
        localStorage.setItem('xjfcel-sound', this.enabled.toString());
    }

    toggle() {
        this.enabled = !this.enabled;
        this.saveSettings();
        return this.enabled;
    }

    play(soundName) {
        if (!this.enabled) return;
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => {
                // 忽略自动播放限制错误
            });
        }
    }
}

const soundManager = new SoundManager();

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
            winTitle: "游戏胜利",
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
            winTitle: "Game Won",
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

        // 尝试更新状态栏（使用 try-catch 防止在 game 对象初始化前调用报错）
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

    // ---------- 工具函数：Canvas圆角矩形 (修复瀑布动画) ----------
    // 兼容性处理：部分浏览器不支持 roundRect，需手动扩展 CanvasRenderingContext2D 原型。
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

    // ---------- 伪随机数生成器 (Windows FreeCell 算法) ----------
    // 采用微软经典 FreeCell 洗牌算法，保证与 Windows 版局面一致。
    class MSRand {
        constructor(seed) { this.seed = seed; }
        next() { this.seed = (this.seed * 214013 + 2531011) & 0xFFFFFFFF; return (this.seed >>> 16) & 0x7FFF; }
    }

    const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
    const SYMBOLS = { 'hearts':'♥', 'diamonds':'♦', 'clubs':'♣', 'spades':'♠' };
    
    const faceImages = {};
    // 为每个脸牌和花色创建Image对象
    ['j', 'q', 'k'].forEach(k => {
        const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
        suits.forEach(suit => {
            const suitKey = `${k}-${suit}`;
            const img = new Image();
            img.src = faceImageSrcs[suitKey];
            faceImages[suitKey] = img;
        });
    });

    // 动画辅助函数
    // getCardPosition：根据牌位置类型和索引，计算牌在画布上的精确坐标。
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

    /**
     * animateMove - 执行飞牌动画，将一组牌从起点平滑移动到目标位置。
     * @param {Array} cards - 需要移动的牌对象数组
     * @param {Object} from - 起始位置描述
     * @param {Object} to - 目标位置描述
     * @returns {Promise} 动画完成后 resolve
     * 细节：动态计算字体、隐藏原牌、动画结束后移除临时元素。
     */
    async function animateMove(cards, from, to) {
        // 移动开始时，确保清除任何现有的手动选择状态，防止逻辑冲突
        if (typeof clearSelection === 'function') clearSelection();
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
            
            // 动态计算字体大小：利用叠牌留空区域(30%高度)
            // 兼容不同屏幕尺寸，防止溢出。
            let fontSize = Math.max(10, Math.floor(layout.stackYOffset * 0.90));
            // 留出少量padding
            const paddingX = (window.innerWidth <= 600 || window.innerHeight <= 500) ? 4 : 8;
            // 防止宽度溢出 (假设最大宽度为 "10" + 花色 + 间距)
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
            // 隐藏原始卡牌，避免"分身"效果
            if (originalEl) originalEl.style.visibility = 'hidden';

            canvas.appendChild(el);
            flyers.push({ el, index: i });
        }

        // 强制浏览器重排
        if (flyers.length > 0) flyers[0].el.getBoundingClientRect();

        flyers.forEach(({ el, index }) => {
            const destPos = getCardPosition(to, destIdx + index);
            el.style.left = `${destPos.x}px`;
            el.style.top = `${destPos.y}px`;
        });

        await new Promise(r => setTimeout(r, duration));
        flyers.forEach(f => f.el.remove());
    }

    // updateStatusBar：刷新状态栏，显示当前局号和剩余牌数。
    function updateStatusBar() {
        document.getElementById('game-info').innerText = `${t('status.game')}: #${game.seed}`;
        const cardsOnBoard = game.cols.reduce((sum, col) => sum + col.length, 0) + game.free.filter(Boolean).length;
        document.getElementById('cards-left-info').innerText = `${t('status.left')}: ${cardsOnBoard}`;
    }

    // ---------- 核心游戏逻辑类 ----------
    // FreeCellLogic：封装所有游戏状态、操作、算法与历史记录。
    class FreeCellLogic {
        constructor() { 
            this.reset(Math.floor(Math.random() * 1000000) + 1); 
            this.score = 0;
            this.isWon = false;
            this.history = [];
        }

        /**
         * reset - 初始化/重置牌局。
         * @param {number} seed - 局号（伪随机种子）
         * 采用微软洗牌算法，生成 52 张牌并分配到 8 列。
         * 支持任意局号复现。
         */
        reset(seed) {
            // Microsoft FreeCell 算法：初始化顺序为 K黑,K红,K方,K梅... (51 -> 0)
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

        /**
         * getMaxMovable - 计算当前可一次性移动的最大牌数。
         * @param {boolean} toEmptyCol - 是否目标为新空列
         * 公式：(空中转区数+1) * 2^空列数
         * 用于判断多牌移动是否合法。
         */
        getMaxMovable(toEmptyCol) {
            const freeCells = this.free.filter(c => !c).length;
            let emptyCols = this.cols.filter(c => c.length === 0).length;
            if (toEmptyCol) emptyCols--;
            return (freeCells + 1) * Math.pow(2, Math.max(0, emptyCols));
        }

        /**
         * getHints - 智能提示算法。
         * 返回所有可行的移动建议，按优先级排序。
         * 优先级：回收区 > 叠牌区 > 中转区。
         * 支持多步提示和高亮。
         */
        getHints() {
            const hints = [];
            
            // 1. 优先检查能否移入回收区 (Found)
            // 检查每列顶部是否有可直接回收的牌。
            for (let c = 0; c < 8; c++) {
                if (this.cols[c].length > 0) {
                    let card = this.cols[c][this.cols[c].length - 1];
                    let suitIdx = SUITS.indexOf(card.suit);
                    if (card.rank === this.found[suitIdx] + 1) {
                        hints.push({ src: { type: 'cols', idx: c, card }, dest: { type: 'found', idx: suitIdx }, score: 100 });
                    }
                }
            }
            // 中转区
            // 2. 检查能否移动到叠牌区 (Tableau)
            // 2.1 从中转区 (Free) 移动
            // 检查中转区顶部牌能否回收或叠放。
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
            // 牌列
            for (let c1 = 0; c1 < 8; c1++) {
                if (this.cols[c1].length === 0) continue;
                let col = this.cols[c1];
                
                let card = col[col.length - 1];
                
                let validLen = 1;
                // 检查移动单张牌
                // 检查当前列顶部连续可移动序列（颜色交替且点数递减）。
                for (let k = col.length - 2; k >= 0; k--) {
                    if (col[k].isRed !== col[k+1].isRed && col[k].rank === col[k+1].rank + 1) validLen++;
                    else break;
                }

                // 检查移动有效序列
                // 从最深的可移动牌开始尝试
                // 2.2 从其他列移动 (尝试移动最长有效序列)
                // 支持多牌连移，优先长序列。
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
                // 3. 检查能否移动到中转区 (Cols -> Free)
                for (let c = 0; c < 8; c++) {
                    if (this.cols[c].length > 0) {
                        let card = this.cols[c][this.cols[c].length - 1];
                        // 建议移动到第一个可用的空闲位
                        hints.push({ src: { type: 'cols', idx: c, card }, dest: { type: 'free', idx: emptyFreeIndices[0] }, score: 10 });
                    }
                }
            }

            // 按分数降序排序
            hints.sort((a, b) => b.score - a.score);
            return hints;
        }

        /**
         * move - 执行一次移动（含动画、历史记录、胜负判定、提示等）。
         * @param {Array} cards - 移动的牌
         * @param {Object} from - 起点
         * @param {Object} to - 终点
         * @param {boolean} animate - 是否播放动画
         */
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
                // 播放飞牌动画
                await animateMove(cards, from, to);
            }

            if (from.type === 'cols') {
                this.cols[from.idx].splice(-cards.length);
            } else if (from.type === 'free') {
                this.free[from.idx] = null;
            }

            if (to.type === 'cols') {
                this.cols[to.idx].push(...cards);
                // 播放放置音效
                soundManager.play('cardselset');
            } else if (to.type === 'free') {
                this.free[to.idx] = cards[0];
                // 播放放置音效
                soundManager.play('cardselset');
            } else if (to.type === 'found') {
                this.found[to.idx] = cards[0].rank;
                this.score += 10;
                // 播放到foundation音效
                soundManager.play('tofound');
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

        /**
         * autoCollect - 自动收集可安全回收的牌。
         * 实现 N-1 规则，确保只有安全牌才自动回收。
         * 每次只收集一张，递归调用。
         */
        async autoCollect() {
            const candidates = [
                ...this.free.map((c, i) => c ? { card: c, pos: { type: 'free', idx: i } } : null),
                ...this.cols.map((col, i) => col.length > 0 ? { card: col[col.length-1], pos: { type: 'cols', idx: i } } : null)
            ].filter(Boolean);

            for (let { card, pos } of candidates) {
                const suitIdx = SUITS.indexOf(card.suit);

                // 基础检查: 这张牌是否是其回收单元的下一张?
                if (card.rank === this.found[suitIdx] + 1) {
                    // 安全检查 (N-1 Rule):
                    let isSafeToMove = false;

                    if (card.rank <= 2) {
                        // 规则 1: A 和 2 永远是安全的
                        isSafeToMove = true;
                    } else {
                        const rankToCompare = card.rank - 1;
                        // 黑桃/梅花 vs 红桃/方块
                        const oppositeColorIndices = card.isRed ? [0, 3] : [1, 2];

                        if (this.found[oppositeColorIndices[0]] >= rankToCompare && 
                            this.found[oppositeColorIndices[1]] >= rankToCompare) {
                            // 规则 2: 对于 3 及以上的牌 (N)，检查所有点数为 N-1 且颜色相反的牌是否已回收
                            isSafeToMove = true;
                        }
                    }

                    if (isSafeToMove) {
                        await this.move([card], pos, { type: 'found', idx: suitIdx }, true);
                        return; // 每次只移动一张最安全的牌，然后重新开始检查
                    }
                }
            }
        }

        // checkWin：判断是否胜利，全部回收即胜利。
        checkWin() {
            if (this.isWon) return;
            if (this.found.every(r => r === 13)) {
                this.isWon = true;
                handleGameWin();
            }
        }

        // undo：撤销一步操作，恢复历史状态。
        undo() {
            if (this.history.length === 0) return;
            // 播放撤销音效
            soundManager.play('undo');
            clearSelection(); // 撤销时清除选中高亮
            clearHint();      // 撤销时清除提示高亮
            let prev = JSON.parse(this.history.pop());
            this.free = prev.free.map(f => f ? {...f} : null);
            this.found = [...prev.found];
            this.cols = prev.cols.map(col => col.map(c => ({...c})));
            this.score = prev.score;
            renderContent();
            saveGameState();
        }
    }

    // ---------- 核心游戏逻辑 ----------
    // 实例化主游戏对象，管理所有状态。
    const game = new FreeCellLogic();
    let drag = null; // 当前拖拽状态
    let selection = null; // 当前选中牌组
    let currentHints = []; // 当前提示列表
    let currentHintIndex = 0; // 当前提示索引
    let lastTapTime = 0; // 用于检测双击
    let lastTapCardId = null; // 用于确保双击的是同一张牌
    const DOUBLE_TAP_DELAY = 300; // 双击判定时间间隔(ms)
    const DRAG_THRESHOLD = 5; // 拖拽阈值，鼠标移动超过此像素才算拖拽
    // 支持移动端双击、拖拽手势。
    // layout：全局布局参数，支持响应式自适应。
    let layout = {
        cardW: 71, cardH: 96, paddingX: 10, paddingY: 10, colGap: 10, rowGap: 20, statusBarH: 0,
        stackYOffset: 25, topBarH: 0, bottomBarH: 0, canvasW: 0, canvasH: 0,
        freeSlotsPos: [], foundSlotsPos: [], colsXPos: []
    };

    /**
     * calculateLayout - 动态计算并设置所有布局参数。
     * 支持横竖屏、宽窄屏、侧边栏、按钮栏等多种场景。
     * 保证所有元素自适应且对齐。
     */
    function calculateLayout() {
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;
        const pageContainer = document.querySelector('.page-container');
        const topBar = document.querySelector('.top-info');
        const bottomBar = document.querySelector('.bottom-controls');
        const statusBar = document.querySelector('.status-bar');

        const isLandscapeWide = (vw / vh >= 2) && (vh < 500);
        pageContainer.classList.toggle('landscape-wide', isLandscapeWide);
        
        // 强制重排，确保CSS样式已应用
        void bottomBar.offsetHeight;
        
        layout.topBarH = topBar.offsetHeight;
        layout.statusBarH = statusBar.offsetHeight;
        const sidebarWrapper = document.querySelector('.sidebar-wrapper');
        layout.bottomBarH = sidebarWrapper.offsetHeight;
        const bottomBarWidth = isLandscapeWide ? sidebarWrapper.offsetWidth : 0; // 侧边栏固定宽度108px，竖屏时不占用水平空间
        
        const canvasVpHeight = Math.max(400, vh);
        
        const canvasVpWidth = vw;

        let mode = 'pc';
        if (vw <= 640) mode = 'phone';
        else if (vw <= 1024) mode = 'tablet';

        // 切换布局模式
        const basePaddingX = { phone: 1, tablet: 10, pc: 40 }[mode];
        const baseColGap = { phone: 1, tablet: 8, pc: 16 }[mode]; // 窄屏下缩小列间距
        const cardAspectRatio = 96 / 71;
        
        let vMode = 'pc';
        if (canvasVpHeight <= 600) vMode = 'phone';
        else if (canvasVpHeight <= 1000) vMode = 'tablet';
        const basePaddingY = 5;
        
        const gapValues = { phone: 10, tablet: 15, pc: 20 };
        const baseRowGap = Math.min(gapValues[mode], gapValues[vMode]);

        // 1. 根据宽度计算牌宽
        const availableW = Math.max(320, isLandscapeWide ? canvasVpWidth - bottomBarWidth : canvasVpWidth);
        let cardW_width = (availableW - (2 * basePaddingX) - (7 * baseColGap)) / 8;

        // 2. 根据高度计算牌宽
        // 这里的核心逻辑是：计算出在给定的垂直空间里，能容纳一个完整游戏布局（上层加13张叠牌）的最大牌张尺寸。
        // 保证无论屏幕多小都能完整显示。

        // 2.1. 计算可用于游戏画布的总垂直空间 (availableH)
        // 在竖屏模式下，需要减去状态栏和按钮栏的高度
        // 兼容移动端和横屏侧栏。
        const availableH = canvasVpHeight - layout.topBarH - (isLandscapeWide ? 0 : (layout.bottomBarH + layout.statusBarH));
        const verticalFixedSpace = basePaddingY + baseRowGap + basePaddingY;

        // 动态计算STACK_OFFSET_RATIO
        let STACK_OFFSET_RATIO;
        if (canvasVpHeight < 500) {
            STACK_OFFSET_RATIO = 0.24;
        } else if (canvasVpHeight < 600) {
            // 500-600之间线性插值：0.24 -> 0.32
            STACK_OFFSET_RATIO = 0.24 + (0.32 - 0.24) * (canvasVpHeight - 500) / (600 - 500);
        } else {
            STACK_OFFSET_RATIO = 0.32;
        }

        const cardHeightFactor = 2 + (12 * STACK_OFFSET_RATIO);
        
        // 2.2. 计算出在当前高度限制下的卡牌高度
        let cardH_height = (availableH - verticalFixedSpace) / cardHeightFactor;
        // 增加一个健壮性检查，如果计算出的高度为负或无效，则回退到一个安全值
        if (cardH_height <= 0) { cardH_height = 50; }
        let cardW_height = cardH_height / cardAspectRatio;

        let cardW = Math.min(cardW_width, cardW_height);
        // 取较小值以适应屏幕，同时保证最小宽度
        cardW = Math.max(30, cardW); // 防止过小
        // 兼容极小屏幕。

        let cardH = cardW * cardAspectRatio;
 
        layout.cardW = Math.floor(cardW);
        layout.cardH = Math.floor(cardH);
        layout.stackYOffset = Math.floor(layout.cardH * STACK_OFFSET_RATIO);

        const totalWidth = 8 * layout.cardW + 7 * baseColGap;
        const gameAreaWidth = totalWidth + 2 * basePaddingX;
        const containerWidth = isLandscapeWide ? gameAreaWidth + bottomBarWidth : gameAreaWidth;
        pageContainer.style.width = `${containerWidth}px`;

        // 核心对齐修复：动态设置上下栏的内边距，使其与游戏区的内边距(basePaddingX)保持一致
        topBar.style.paddingLeft = `${basePaddingX}px`;
        if (isLandscapeWide) {
            topBar.style.paddingRight = '4px';
        } else {
            topBar.style.paddingRight = `${basePaddingX}px`;
        }
        if (!isLandscapeWide) {
            statusBar.style.paddingLeft = `${basePaddingX}px`;
            statusBar.style.paddingRight = `${basePaddingX}px`;
        } else {
            statusBar.style.paddingLeft = '0px';
            statusBar.style.paddingRight = '0px';
        }
        if (!isLandscapeWide) {
            bottomBar.style.paddingLeft = `${basePaddingX}px`;
            bottomBar.style.paddingRight = `${basePaddingX}px`;
        } else {
            bottomBar.style.paddingLeft = '';
            bottomBar.style.paddingRight = '';
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
            // 计算该列从哪里开始是有效的拖拽序列（符合颜色交替且点数递减）
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

        // 更新撤销按钮状态
        document.getElementById('undo-btn').disabled = game.history.length === 0 || game.isWon;
        document.getElementById('hint-btn').disabled = game.isWon;

        // 修复：基于最坏情况（13张牌）计算画布的最小高度，确保从一开始就有足够的滚动空间
        // 同时考虑当前牌局的实际高度（如果超过13张），防止长牌列被截断
        // 兼容超长牌列。
        const maxCardsInCol = Math.max(13, ...game.cols.map(c => c.length));
        const requiredCanvasHeight = colY + layout.cardH + ((maxCardsInCol - 1) * layout.stackYOffset) + layout.paddingY;

        canvas.style.minHeight = `${requiredCanvasHeight}px`;
        // .game-canvas 使用 flex-grow 属性来拉伸到视口底部
        canvas.style.height = '';
    }

    // updateAndRender：重新计算布局并渲染所有内容。
    function updateAndRender() {
        calculateLayout();
        renderContent();
    }

    // clearSelection：清除当前选中状态。
    function clearSelection() {
        if (!selection) return;
        selection.els.forEach(el => el.classList.remove('selected'));
        selection = null;
    }

    // clearHint：清除当前提示高亮。
    function clearHint() {
        document.querySelectorAll('.hint-glow').forEach(el => el.classList.remove('hint-glow'));
        document.querySelectorAll('.col-hint-box').forEach(el => el.remove());
        currentHints = [];
        currentHintIndex = 0;
    }

    // invalidTipElement/invalidTipTimeout/invalidTipLock：用于管理无效操作提示。
    let invalidTipElement = null;
    let invalidTipTimeout = null;
    let invalidTipLock = false;

    /**
     * showInvalidMoveTip - 显示无效操作提示。
     * @param {string} messageKey - 多语言 key
     * 支持自动消失和多次触发。
     */
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
        
        // 播放无效移动音效
        soundManager.play('illegalmove');
        
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

    // hideInvalidMoveTip：隐藏无效操作提示。
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

    // 全局交互监听：任何非"提示"按钮的操作都清除提示，同时处理无效移动提示的关闭
    // 兼容右键、触摸、点击等多种交互。
    function handleGlobalInteraction(e) {
        // 处理无效移动提示的关闭
        if (invalidTipElement && !invalidTipLock && !(e.target instanceof Element && e.target.closest('.invalid-move-tip'))) {
            if (e.type === 'mousedown' && e.button === 2) {
                // 右键点击不关闭提示
            } else {
                hideInvalidMoveTip();
            }
        }
        // 处理提示高亮的清除
        if (currentHints.length === 0) return; // 优化：只有在提示开启时才尝试清除
        if (e.target instanceof Element && e.target.closest('#hint-btn')) return;
        clearHint();
    }
    window.addEventListener('mousedown', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction, { passive: true });

    /**
     * showHint - 显示智能提示并高亮可移动牌。
     * 支持循环多步提示。
     */
    function showHint() {
        // 仅清除视觉效果，不清除 currentHints 数据，以便循环显示
        document.querySelectorAll('.hint-glow').forEach(el => el.classList.remove('hint-glow'));
        document.querySelectorAll('.col-hint-box').forEach(el => el.remove());

        if (currentHints.length === 0) {
            currentHints = game.getHints();
            currentHintIndex = 0;
        }

        if (currentHints.length === 0) {
            // 无可用提示时播放音效
            soundManager.play('hintnomove');
            return;
        }
        
        // 播放提示显示音效
        soundManager.play('hintshown');

        const hint = currentHints[currentHintIndex];
        currentHintIndex = (currentHintIndex + 1) % currentHints.length;

        // 高亮源牌
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

        // 高亮目标
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
                // 空列高亮
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
        // 移除定时消失，提示将一直保留直到用户操作
    }

    /**
     * handleCardClick - 处理牌点击/放置/选择等所有交互。
     * 支持多牌连选、取消、放置、规则校验。
     */
    function handleCardClick(card, pos) {
        if (selection) {
            // 如果有牌被选中...

            // Case 1: 用户点击了当前已选中牌列中的任意一张牌，意图是取消选择。
            if (selection.els.some(el => el.dataset.id === card.id)) {
                clearSelection();
                return;
            }

            // Case 2: 用户点击了另一张牌，意图是"放置"。
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

            // 检查目标是否是牌垛的最后一张，以及移动规则是否满足
            if (targetCol.length > 0 && targetCol[targetCol.length - 1].id === card.id) {
                const maxMovable = game.getMaxMovable(false);
                if (selectedCards.length <= maxMovable) {
                    let top = targetCol[targetCol.length - 1];
                    if (top.isRed !== selectedCards[0].isRed && top.rank === selectedCards[0].rank + 1) {
                        // 移动有效！执行移动并清除选择。
                        game.move(selectedCards, selectedFrom, dest);
                        clearSelection();
                        return; // 操作完成
                    } else {
                        showInvalidMoveTip('colorRankMismatch');
                    }
                } else {
                    showInvalidMoveTip('tooManyCards');
                }
            }
            // Case 3: “放置”尝试无效。根据您的反馈，现在只取消选择，不再重新选择。
            clearSelection();
            return; // 关键：在这里返回，阻止代码继续执行到下方的“选择逻辑”部分。
        }

        // --- 选择逻辑 ---
        // 如果之前没有选择，或"重新选择"时，会执行到这里。
        // 支持多牌连选和规则校验。
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

            // 如果点击的不是一个有效的牌垛，则只允许选择最后一张牌
            if (!isStackValid && pos.cardIdx !== col.length - 1) return;
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
            // 播放选中音效
            soundManager.play('cardselset');
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
            // 直接使用花色特定的SVG文件
            const suitKey = `${f}-${card.suit}`;
            const imgSrc = faceImageSrcs[suitKey];
            div.innerHTML = `<img src="${imgSrc}" class="face-img" alt="${f}">` +
                            `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div></div>`;
        } else {
            div.innerHTML = `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div><div class="suit-l">${SYMBOLS[card.suit]}</div></div>`;
        }
        
        div.onmousedown = (e) => {
            if (e.button === 0) startDrag(e, card, div.posData);
            if (e.button === 2) quickMove(card, div.posData);
        };
        // 添加触摸事件监听
        div.ontouchstart = (e) => {
            if (e.touches.length > 1) return; // 忽略多指触控
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
            // 记录鼠标按下时的初始位置
            startX: e.clientX,
            startY: e.clientY
        };

        const moveHandler = (me) => {
            // 计算鼠标移动距离
            const dx = Math.abs(me.clientX - drag.startX);
            const dy = Math.abs(me.clientY - drag.startY);

            if (!drag.moved && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
                drag.moved = true;
                // 播放拖拽音效
                soundManager.play('liftoff');
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

    /**
     * startTouchDrag - 专门处理触摸拖拽的逻辑。
     * 兼容单击、双击、拖拽手势。
     * 解决了移动端滚动与拖拽的冲突。
     */
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
                // 播放拖拽音效
                soundManager.play('liftoff');
                clearSelection();
                els.forEach(el => el.classList.add('selected'));
            }

            if (drag.moved) {
                // 拖拽时必须阻止滚动
                if (te.cancelable) te.preventDefault();
                els.forEach((el, i) => {
                    el.classList.add('dragging');
                    el.style.left = (t.clientX - canvasRect.left - drag.ox) + 'px';
                    el.style.top = (t.clientY - canvasRect.top - drag.oy + i * layout.stackYOffset) + 'px';
                });
            }
        };

        const touchEndHandler = (te) => {
            // 阻止鼠标模拟事件，防止触发点击穿透
            if (te.cancelable) te.preventDefault();
            document.removeEventListener('touchmove', touchMoveHandler);
            document.removeEventListener('touchend', touchEndHandler);
            document.removeEventListener('touchcancel', touchCancelHandler);

            if (!drag) return;

            if (drag.moved) {
                // 拖拽结束
                const t = te.changedTouches[0];
                finishDrag({ clientX: t.clientX, clientY: t.clientY });
            } else {
                // 点击 (Tap)
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTapTime;
                
                // 只有在指定时间内连续点击同一张牌才判定为双击
                if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0 && lastTapCardId === card.id) {
                    // 双击
                    quickMove(card, pos);
                    lastTapTime = 0;
                    lastTapCardId = null;
                } else {
                    // 单击
                    handleCardClick(card, pos);
                    lastTapTime = currentTime;
                    lastTapCardId = card.id;
                }
                drag = null;
            }
        };

        const touchCancelHandler = (te) => {
            document.removeEventListener('touchmove', touchMoveHandler);
            document.removeEventListener('touchend', touchEndHandler);
            document.removeEventListener('touchcancel', touchCancelHandler);
            
            if (drag) {
                renderContent(); // 重置视图，取消拖拽状态
                drag = null;
            }
        };

        document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        document.addEventListener('touchend', touchEndHandler);
        document.addEventListener('touchcancel', touchCancelHandler);
    }

    /**
     * findDestFromCoords - 根据鼠标/触摸坐标查找目标放置区。
     * @param {number} clientX - 屏幕 X 坐标
     * @param {number} clientY - 屏幕 Y 坐标
     */
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

    /**
     * finishDrag - 拖拽结束时的处理函数。
     * 判断目标位置，校验移动合法性，执行移动或弹回。
     * @param {Event} e - 鼠标/触摸事件对象
     */
    function finishDrag(e) {
        const { cards, from, els, moved, ox, oy } = drag;
        els.forEach(el => el.classList.remove('selected'));
        els.forEach(el => el.classList.remove('dragging'));

        if (!moved) {
            // 这是点击，不是拖拽
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

    /**
     * quickMove - 快速移动（双击或右键）。
     * @param {Object} card - 牌对象
     * @param {Object} pos - 牌的位置
     */
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

    /**
     * animateDeal - 执行发牌动画。
     * 所有牌从屏幕底部飞到各自位置。
     */
    async function animateDeal() {
        if (isAnimating) return;
        isAnimating = true;

        // 播放发牌音效
        const dealSound = soundManager.sounds.carddeal;
        if (soundManager.enabled && dealSound) {
            dealSound.currentTime = 0;
            dealSound.play().catch(e => {});
        }

        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        
        // 计算发牌起始点：屏幕底部中央
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

        // 禁用交互
        document.body.style.pointerEvents = 'none';

        dealingOrder.forEach(({ el }, i) => {
            el.style.transition = 'none';
            el.style.left = `${startX}px`;
            el.style.top = `${startY}px`;
            el.style.zIndex = 100 + i; // 确保飞行的牌在上面
        });

        canvas.offsetHeight;

        // 每张牌的间隔 (ms)
        const delay = 30;
        const duration = 250;
        
        const promises = dealingOrder.map((item, i) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    item.el.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out`;
                    item.el.style.left = item.targetLeft;
                    item.el.style.top = item.targetTop;
                    
                    setTimeout(() => {
                        // 动画结束后恢复 z-index (可选，或者就留着)
                        item.el.style.zIndex = ''; 
                        resolve();
                    }, duration);
                }, i * delay);
            });
        });

        await Promise.all(promises);
        
        // 停止发牌音效
        if (dealSound) {
            dealSound.pause();
            dealSound.currentTime = 0;
        }
        
        isAnimating = false;
        // 恢复交互
        document.body.style.pointerEvents = '';
    }

    async function startNewGame(seed) {
        checkAbandonment(); // 检查上一局是否中途放弃
        game.reset(seed);
        saveGameState(); // 保存新牌局的初始状态
        updateAndRender();
        // 滚动到顶部，确保能看到发牌动画
        const container = document.querySelector('.page-container');
        if (container) container.scrollTop = 0;
        await animateDeal();
    }

    function newRandomGame(force = false) {
        const _start = () => startNewGame(Math.floor(Math.random() * 1000000) + 1); // “新游戏”按钮功能：开始一个随机牌局

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
        // “选局”按钮功能：弹出对话框让用户选择牌局
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
        updateStatsOnWin(); // 更新获胜统计
        clearSavedGame(); // 游戏获胜后，清除本地存档
        
        // 播放胜利音效
        const winSound = soundManager.sounds.win;
        if (soundManager.enabled && winSound) {
            winSound.currentTime = 0;
            winSound.play().catch(e => {});
        }
        
        const stopAnim = startVictoryDemo();
        
        showMessageBox({
            title: t('winTitle'),
            message: t('winMessage'),
            type: 'win',
            buttons: 'yes-no',
            callback: (result) => {
                // 停止胜利音效
                if (winSound) {
                    winSound.pause();
                    winSound.currentTime = 0;
                }
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

    /**
     * victoryAnimation - 胜利时的瀑布流动画。
     * 使用 Canvas 2D 实现物理模拟（重力、反弹）。
     */
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
            // 绘制卡牌基础样式
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(c.x, c.y, layout.cardW, layout.cardH, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = c.isRed ? '#ff0000' : '#000000';
            
            // 计算字体大小，保持与 createCardEl 逻辑一致
            let fontSize = Math.max(10, Math.floor(layout.stackYOffset * 0.90));
            const paddingX = (window.innerWidth <= 600 || window.innerHeight <= 500) ? 4 : 8;
            if (fontSize * 2.2 > layout.cardW - paddingX) {
                fontSize = Math.floor((layout.cardW - paddingX) / 2.2);
            }

            ctx.font = `bold ${fontSize}px "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif`;
            // 左上角点数
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(c.rank, c.x + 4, c.y + 2);

            ctx.font = `${fontSize * 0.9}px "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif`;
            // 右上角小花色
            ctx.textAlign = 'right';
            ctx.fillText(c.suit, c.x + layout.cardW - 4, c.y + 4);

            // 底部大花色或SVG图案
            const isFace = ['J', 'Q', 'K'].includes(c.rank);
            const f = isFace ? c.rank.toString().toLowerCase() : null;
            if (isFace && f) {
                // 直接使用花色特定的Image对象
                const suitKey = `${f}-${SUITS[c.suitIndex]}`;
                const img = faceImages[suitKey];

                if (img && img.complete && img.naturalWidth > 0) {
                    const iH = layout.cardW * (img.naturalHeight / img.naturalWidth);
                    ctx.drawImage(img, c.x, c.y + layout.cardH - iH, layout.cardW, iH);
                } else {
                    // 图像未加载完成，回退到花色符号
                    const bigSuitSize = Math.max(20, Math.floor(layout.cardW * 0.9));
                    ctx.font = `${bigSuitSize}px "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'alphabetic';
                    ctx.globalAlpha = 0.8;
                    ctx.fillText(c.suit, c.x + layout.cardW / 2, c.y + layout.cardH - 5);
                    ctx.globalAlpha = 1.0;
                }
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
            // 动态调整画布大小以适应移动端地址栏变化
            if (vCanvas.width !== window.innerWidth || vCanvas.height !== window.innerHeight) {
                resizeCanvas();
            }

            if (currentCardIndex < cards.length && Math.random() > 0.8) {
                // 随机激活卡牌下落
                cards[currentCardIndex].active = true;
                currentCardIndex++;
            }

            ctx.clearRect(0, 0, vCanvas.width, vCanvas.height);
            const floorY = vCanvas.height
            
            for (let i = cards.length - 1; i >= 0; i--) {
                // 绘制静止在收牌区的牌 (从底层的A绘制到顶层的K，确保遮挡关系正确)
                if (!cards[i].active) {
                    drawCard(cards[i]);
                }
            }

            cards.forEach(c => {
                if (!c.active) return;
                drawCard(c);
                c.x += c.vx;
                
                if (c.resting) {
                    // 如果窗口变高导致卡牌悬空，恢复重力
                    if (c.y + layout.cardH < floorY - 2) c.resting = false;
                }
                
                if (!c.resting) {
                    c.vy += gravity;
                    c.y += c.vy;
                }

                if (c.y + layout.cardH > floorY) {
                    c.y = floorY - layout.cardH;
                    c.vy *= bounce;
                    
                    // 当反弹速度很小时，停止垂直运动，防止在底部抖动或穿模
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

        // 返回清理函数
        return () => {
            if (animFrameId) cancelAnimationFrame(animFrameId);
            vCanvas.style.display = 'none';
            document.querySelectorAll('.card').forEach(c => c.style.display = '');
        };
    }

    /**
     * showStats - 显示统计信息对话框。
     */
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
        iconEl.style.display = 'none'; // 统计界面隐藏图标以节省空间

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
                saveStats(); // 刷新显示
                showStats();
            }
        }));

        closeBtn.onclick = () => { overlay.style.display = 'none'; };
        overlay.style.display = 'block';
    }

    // 禁用右键菜单
    window.oncontextmenu = (e) => e.preventDefault();

    document.getElementById('new-game-btn').onclick = () => { clearHint(); newRandomGame(); };
    document.getElementById('select-game-btn').onclick = () => { clearHint(); selectGame(); };
    document.getElementById('undo-btn').onclick = () => { if(game.isWon) return; clearHint(); game.undo(); };
    document.getElementById('hint-btn').onclick = showHint;
    document.getElementById('stats-btn').onclick = showStats;
    document.getElementById('aboutLink').onclick = (e) => { e.preventDefault(); clearHint(); showAbout(); };
    document.getElementById('langToggle').onclick = () => { clearHint(); setLanguage(currentLang === 'zh' ? 'en' : 'zh'); };
    
    // 声音开关按钮
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.textContent = soundManager.enabled ? '🔊' : '🔇';
        soundToggle.onclick = () => {
            const enabled = soundManager.toggle();
            soundToggle.textContent = enabled ? '🔊' : '🔇';
        };
    }

    // 处理在空白区域的点击（用于放置选中的牌）
    document.getElementById('canvas').addEventListener('click', e => {
        // 如果点击在牌上，什么都不做。牌自己的处理器会处理它。
        if (e.target.closest('.card')) return;
        
        // 如果什么都没选中，点击空白处什么都不做。
        if (!selection) return;
        
        // 点击空白处清除提示（通常由全局监听器处理，但如果逻辑改变最好明确处理）
        clearHint();

        const dest = findDestFromCoords(e.clientX, e.clientY);

        if (dest) {
            const isDestEmpty = (dest.type === 'free' && !game.free[dest.idx]) || (dest.type === 'cols' && game.cols[dest.idx].length === 0);
            
            // 检查目标是否为空（中转区和牌列）
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
        // 使用稍长的延迟让浏览器在方向改变后稳定下来
        window.resizeTimer = setTimeout(() => {
            updateAndRender();
        }, 300);
    };

    // 监听窗口大小和方向变化，重新布局。
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // 解决iOS下 :active 伪类无效的问题
    document.body.addEventListener('touchstart', () => {}, { passive: true });

    window.startVictoryDemo = startVictoryDemo; // 保留用于调试

    loadStats();
    loadAndInitialize();
})();
