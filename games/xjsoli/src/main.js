
// ========== 纸牌 Solitaire 经典版主入口 ========== 
// 本文件为核心 JS 逻辑，涵盖算法、动画、布局、交互、兼容性等关键实现。
// 主要模块：多语言、存档、统计、核心算法、动画、布局自适应、交互、提示、胜利动画等。
// 兼容移动端与桌面端，支持响应式布局和触摸操作。

import './style.css'

import packageJson from '../package.json'
import pkpJc from '@common/images/pkp_jc.svg'
import pkpJd from '@common/images/pkp_jd.svg'
import pkpJh from '@common/images/pkp_jh.svg'
import pkpJs from '@common/images/pkp_js.svg'
import pkpQc from '@common/images/pkp_qc.svg'
import pkpQd from '@common/images/pkp_qd.svg'
import pkpQh from '@common/images/pkp_qh.svg'
import pkpQs from '@common/images/pkp_qs.svg'
import pkpKc from '@common/images/pkp_kc.svg'
import pkpKd from '@common/images/pkp_kd.svg'
import pkpKh from '@common/images/pkp_kh.svg'
import pkpKs from '@common/images/pkp_ks.svg'
import pkpBack from '@common/images/pkp_back.svg'

// 音效资源
import carddealUrl from '@common/audio/pka_carddeal.mp3'
import cardselsetUrl from '@common/audio/pka_cardselset.mp3'
import hintnomoveUrl from '@common/audio/pka_hintnomove.mp3'
import hintshownUrl from '@common/audio/pka_hintshown.mp3'
import illegalmoveUrl from '@common/audio/pka_illegalmove.mp3'
import liftoffUrl from '@common/audio/pka_liftoff.mp3'
import tofoundUrl from '@common/audio/pka_tofound.mp3'
import undoUrl from '@common/audio/pka_undo.mp3'
import winUrl from '@common/audio/pka_win.mp3'

(function() {
    // 为 Canvas 添加 roundRect 方法，用于绘制圆角矩形
    // 兼容性处理：部分浏览器不支持 roundRect，需手动扩展 CanvasRenderingContext2D 原型。
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            this.beginPath();
            this.moveTo(x + r, y);
            this.arcTo(x + w, y, x + w, y + h, r);
            this.arcTo(x + w, y + h, x, y + h, r);
            this.arcTo(x, y + h, x, y, r);
            this.arcTo(x, y, x + w, y, r);
            this.closePath();
            return this;
        };
    }

    // ========== 音效管理器 ==========
    class SoundManager {
        constructor() {
            this.sounds = {
                carddeal: new Audio(carddealUrl),      // 发牌
                cardselset: new Audio(cardselsetUrl),  // 选牌/放牌
                hintnomove: new Audio(hintnomoveUrl),  // 无可用提示
                hintshown: new Audio(hintshownUrl),    // 显示提示
                illegalmove: new Audio(illegalmoveUrl),// 非法移动
                liftoff: new Audio(liftoffUrl),        // 拖起牌
                tofound: new Audio(tofoundUrl),        // 放入回收区
                undo: new Audio(undoUrl),              // 撤销
                win: new Audio(winUrl)                 // 胜利
            };
            this.enabled = true;
            this.loadSettings();
        }

        loadSettings() {
            const saved = localStorage.getItem('xjsoli-sound');
            if (saved !== null) {
                this.enabled = saved === 'true';
            }
        }

        saveSettings() {
            localStorage.setItem('xjsoli-sound', this.enabled.toString());
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
                sound.play().catch(e => { /* 忽略自动播放限制错误 */ });
            }
        }
    }
    const soundManager = new SoundManager();

    const LANG = {
        zh: {
            title: "纸牌 - 经典版",
            headerTitle: "纸牌",
            buttons: { stats: "统计", options: "选项", new: "新游戏", hint: "提示", undo: "撤销" },
            status: { game: "游戏", score: "得分", time: "时间" },
            about: {
                title: "关于",
                header: "一款基于JavaScript的经典纸牌游戏",
                version: `v${packageJson.version} by XHBL`,
                email: "newxhbl@hotmail.com"
            },
            newGameTitle: "新游戏",
            confirmNewGameMessage: "游戏正在进行，要开始新的一局吗？",
            replayCurrentGame: "重玩本局",
            ok: "确定", cancel: "取消", yes: "是", no: "否", close: "关闭",
            winTitle: "游戏胜利",
            winMessage: "恭喜你获胜了！",
            winTime: "用时",
            winScore: "得分",
            winNewHighScore: "新最高分",
            winPlayAgain: "再玩新的一局吗？",
            noMovesTitle: "无路可走",
            noMovesMessage: "当前已无路可走。\n您可以撤销上一步或开始新游戏。",
            stats: {
                title: "统计信息", played: "已玩游戏", won: "已胜游戏", rate: "获胜率",
                maxWin: "最多连胜", maxLose: "最多连败", current: "当前连局",
                reset: "重置", confirmReset: "确定要重置所有统计数据吗？", highScores: "高分榜",
                winStreakTag: "连胜", loseStreakTag: "连败"
            },
            options: {
                title: "选项",
                deal: "翻牌",
                draw1: "翻一张牌",
                draw3: "翻三张牌",
                newGameConfirm: "更改此选项将开始新游戏。\n是否继续？"
            },
            invalidMove: {
                stackInvalid: "只能移动颜色交替、点数递减的牌序列",
                colorRankMismatch: "目标位置需要颜色交替且点数递减",
                foundSuitMismatch: "回收区只能放同花色的牌",
                foundRankMismatch: "回收区需要从A开始按顺序放置",
                foundSingleOnly: "回收区只能放置单张牌",
                kingOnly: "只有K能移动到空列"
            }
        },
        en: {
            title: "Solitaire - Classic",
            headerTitle: "Solitaire",
            buttons: { stats: "Stats", options: "Options", new: "New", hint: "Hint", undo: "Undo" },
            status: { game: "Game", score: "Score", time: "Time" },
            about: {
                title: "About",
                header: "A JavaScript-based classic Solitaire game",
                version: `v${packageJson.version} by XHBL`,
                email: "newxhbl@hotmail.com"
            },
            newGameTitle: "New Game",
            confirmNewGameMessage: "A game is in progress. Start a new game?",
            replayCurrentGame: "Replay this game",
            ok: "OK", cancel: "Cancel", yes: "Yes", no: "No", close: "Close",
            winTitle: "Game Won",
            winMessage: "You Win!",
            winTime: "Time",
            winScore: "Score",
            winNewHighScore: "New High Score",
            winPlayAgain: "Play a new game?",
            noMovesTitle: "No Moves Left",
            noMovesMessage: "No more moves available.\nYou can undo or start a new game.",
            stats: {
                title: "Statistics", played: "Games Played", won: "Games Won", rate: "Win Percentage",
                maxWin: "Longest Win Streak", maxLose: "Longest Lose Streak", current: "Current Streak",
                reset: "Reset", confirmReset: "Are you sure you want to reset all statistics?", highScores: "High Scores",
                winStreakTag: "Wins", loseStreakTag: "Losses"
            },
            options: {
                title: "Options",
                deal: "Draw",
                draw1: "Draw one",
                draw3: "Draw three",
                newGameConfirm: "Changing this option will start a new game.\nContinue?"
            },
            invalidMove: {
                stackInvalid: "Can only move alternating color descending sequences",
                colorRankMismatch: "Target requires alternating colors and descending ranks",
                foundSuitMismatch: "Foundation requires matching suit",
                foundRankMismatch: "Foundation requires ascending rank from Ace",
                foundSingleOnly: "Foundation accepts only one card",
                kingOnly: "Only Kings can be moved to empty columns"
            }
        }
    };

    const STORAGE_KEY = 'xjsoli-savegame';
    const STATS_KEY = 'xjsoli-stats';
    const LANG_KEY = 'xjsoli-lang';
    const SETTINGS_KEY = 'xjsoli-settings';

    function detectLanguage() {
        const stored = localStorage.getItem(LANG_KEY);
        if (stored) return stored;
        const browserLang = navigator.language || navigator.userLanguage || '';
        return browserLang.includes('zh') ? 'zh' : 'en';
    }
    let currentLang = detectLanguage();

    function t(key) {
        return key.split('.').reduce((o, k) => o && o[k], LANG[currentLang]) || key;
    }

    function updateUIText() {
        document.title = t('title');
        document.getElementById('game-title').textContent = t('headerTitle');
        document.getElementById('langToggle').textContent = currentLang === 'zh' ? '中' : 'EN';
        document.getElementById('stats-btn').textContent = t('buttons.stats');
        document.getElementById('options-btn').textContent = t('buttons.options');
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

    let gameStats = { played: 0, won: 0, winStreak: 0, maxWinStreak: 0, maxLoseStreak: 0, highScores: [] };

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
        gameStats.winStreak = gameStats.winStreak > 0 ? gameStats.winStreak + 1 : 1;
        gameStats.maxWinStreak = Math.max(gameStats.maxWinStreak, gameStats.winStreak);

        // 更新高分榜
        const now = new Date();
        const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
        gameStats.highScores.push({ score: game.score, date: dateStr });
        gameStats.highScores.sort((a, b) => b.score - a.score);
        if (gameStats.highScores.length > 3) {
            gameStats.highScores.length = 3;
        }

        saveStats();
    }

    function checkAbandonment() {
        if (game.hasMoved && !game.isWon) {
            gameStats.played++;
            gameStats.winStreak = gameStats.winStreak < 0 ? gameStats.winStreak - 1 : -1;
            gameStats.maxLoseStreak = Math.max(gameStats.maxLoseStreak, Math.abs(gameStats.winStreak));
            saveStats();
        }
    }

    let gameSettings = { drawCount: 1, timed: false };

    function loadSettings() {
        try {
            const s = localStorage.getItem(SETTINGS_KEY);
            if (s) Object.assign(gameSettings, JSON.parse(s));
        } catch(e) {}
    }

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(gameSettings));
    }
    loadSettings();

    // ---------- 伪随机数生成器 ----------
    // 采用经典洗牌算法，保证局面可复现。
    class MSRand {
        constructor(seed) { this.seed = seed; }
        next() { this.seed = (this.seed * 214013 + 2531011) & 0xFFFFFFFF; return (this.seed >>> 16) & 0x7FFF; }
    }

    const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
    const SYMBOLS = { 'hearts':'♥', 'diamonds':'♦', 'clubs':'♣', 'spades':'♠' };
    
    // 预加载脸牌图片资源
    const faceImages = {};
    const faceImageSrcs = {
        'jc': pkpJc, 'jd': pkpJd, 'jh': pkpJh, 'js': pkpJs,
        'qc': pkpQc, 'qd': pkpQd, 'qh': pkpQh, 'qs': pkpQs,
        'kc': pkpKc, 'kd': pkpKd, 'kh': pkpKh, 'ks': pkpKs
    };
    Object.keys(faceImageSrcs).forEach(k => {
        const img = new Image();
        img.src = faceImageSrcs[k];
        faceImages[k] = img;
    });

    // 获取脸牌图片键的辅助函数
    function getFaceImageKey(card) {
        if (card.rank <= 10) return null;
        const rankChar = card.rank === 11 ? 'j' : card.rank === 12 ? 'q' : 'k';
        const suitChar = card.suit.charAt(0); // 'c', 'd', 'h', 's'
        return rankChar + suitChar;
    }

    // 预加载牌背图片资源
    const backImage = new Image();
    backImage.src = pkpBack;

    // ---------- 核心游戏逻辑类 ----------
    // SolitaireLogic：封装所有游戏状态、操作、算法与历史记录。
    class SolitaireLogic {
        constructor() { this.reset(1); }
        
        /**
         * reset - 初始化/重置牌局。
         * @param {number} seed - 局号（伪随机种子）
         * 采用经典洗牌算法，生成 52 张牌并分配到 7 列和发牌区。
         * 支持任意局号复现。
         */
        reset(seed) {
            this.seed = seed;
            this.stock = [];
            this.waste = [];
            this.found = [0, 0, 0, 0];
            this.cols = Array.from({length: 7}, () => []);
            this.isWon = false;
            this.score = 0;
            this.history = [];
            this.hasMoved = false;
            this.time = 0;
            this.stockPassCount = 0; // 发牌堆重置次数（用于Draw 3扣分）

            let deck = [];
            for (let s = 0; s < 4; s++) {
                for (let r = 1; r <= 13; r++) {
                    let suit = SUITS[s];
                    deck.push({ suit: suit, rank: r, isRed: (suit === 'hearts' || suit === 'diamonds'), id: suit + r, faceUp: false });
                }
            }
            const rng = new MSRand(seed);
            for (let i = 0; i < 52; i++) {
                let j = 51 - (rng.next() % (52 - i));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }

            // 发牌到叠牌区
            let cardIdx = 0;
            for (let i = 0; i < 7; i++) {
                for (let j = 0; j <= i; j++) {
                    let card = deck[cardIdx++];
                    if (j === i) card.faceUp = true; // 顶牌翻开
                    this.cols[i].push(card);
                }
            }
            // 剩余牌放入发牌区
            while (cardIdx < 52) {
                this.stock.push(deck[cardIdx++]);
            }
        }

        saveState() {
            this.history.push(JSON.stringify({
                stock: this.stock, waste: this.waste, found: [...this.found],
                cols: this.cols, score: this.score, stockPassCount: this.stockPassCount
            }));
            if (this.history.length > 100) this.history.shift();
        }

        undo() {
            if (this.history.length === 0) return;
            clearSelection();
            clearHint();
            soundManager.play('undo');
            let prev = JSON.parse(this.history.pop());
            this.stock = prev.stock;
            this.waste = prev.waste;
            this.found = prev.found;
            this.cols = prev.cols;
            this.score = prev.score;
            this.stockPassCount = prev.stockPassCount || 0;
            renderContent();
            saveGameState();
        }

        async drawStock() {
            this.hasMoved = true;
            // 先保存状态，再翻牌
            this.saveState();
            
            if (this.stock.length === 0) {
                // 将收牌区重置回发牌区
                if (this.waste.length > 0) {
                    // 执行重置动画
                    const cardsToReset = [...this.waste];
                    await animateResetStock(cardsToReset);
                    
                    this.stock = this.waste.reverse().map(c => ({...c, faceUp: false}));
                    this.waste = [];
                    // Draw 3 模式：前3次重置不扣分，第4次起每次扣20分
                    // Draw 1 模式：无论重置多少次均不扣分
                    if (gameSettings.drawCount === 3) {
                        this.stockPassCount++;
                        if (this.stockPassCount > 3) {
                            this.score = Math.max(0, this.score - 20);
                        }
                    }
                }
            } else {
                const count = gameSettings.drawCount === 3 ? 3 : 1;
                const cardsToDraw = this.stock.splice(-count);
                
                // 执行发牌动画
                await animateDrawStock(cardsToDraw);
                
                cardsToDraw.forEach(c => c.faceUp = true);
                this.waste.push(...cardsToDraw);
                soundManager.play('cardselset'); // 翻牌到waste时播放
            }
            renderContent();
            saveGameState();
        }

        /**
         * getHints - 智能提示算法。
         * 返回所有可行的移动建议，按优先级排序。
         * 优先级：回收区 > 叠牌区 > 发牌区。
         * 支持多步提示和高亮。
         */
        getHints() {
            const hints = [];
            // 1. 移动到回收区
            const checkFound = (card, src, cardIdx) => {
                let suitIdx = SUITS.indexOf(card.suit);
                if (card.rank === this.found[suitIdx] + 1) {
                    hints.push({ src: {...src, cardIdx, card}, dest: { type: 'found', idx: suitIdx }, score: 100 });
                }
            };
            if (this.waste.length > 0) checkFound(this.waste[this.waste.length-1], {type: 'waste'}, undefined);
            this.cols.forEach((col, i) => {
                if (col.length > 0) checkFound(col[col.length-1], {type: 'cols', idx: i}, col.length - 1);
            });

            // 2. 移动到叠牌区 (从收牌区或其他牌列)
            const checkTableau = (card, src, isKingMove, cardIdx) => {
                this.cols.forEach((col, i) => {
                    // 不要移动到相同的列
                    if (src.type === 'cols' && src.idx === i) return;
                    // 如果K已经在列底，不要移动到另一个空列（无效移动）
                    if (isKingMove && col.length === 0 && src.type === 'cols' && this.cols[src.idx][0].id === card.id) return;

                    if (col.length === 0) {
                        if (card.rank === 13) hints.push({ src: {...src, cardIdx, card}, dest: { type: 'cols', idx: i }, score: isKingMove ? 20 : 10 });
                    } else {
                        let top = col[col.length-1];
                        if (top.isRed !== card.isRed && top.rank === card.rank + 1) {
                            hints.push({ src: {...src, cardIdx, card}, dest: { type: 'cols', idx: i }, score: 50 });
                        }
                    }
                });
            };

            if (this.waste.length > 0) checkTableau(this.waste[this.waste.length-1], {type: 'waste'}, false, undefined);
            
            this.cols.forEach((col, i) => {
                if (col.length === 0) return;
                // 查找第一张正面朝上的牌
                let firstUp = col.findIndex(c => c.faceUp);
                if (firstUp !== -1) {
                    // 在纸牌游戏中，通常移动尽可能深的一堆牌以释放下层的暗牌
                    let card = col[firstUp];
                    checkTableau(card, {type: 'cols', idx: i}, card.rank === 13, firstUp);
                }
            });

            hints.sort((a, b) => b.score - a.score);

            // 如果没有可移动的牌，且发牌区还有牌或可以重置，则提示点击发牌区
            if (hints.length === 0 && (this.stock.length > 0 || this.waste.length > 0)) {
                hints.push({ src: { type: 'stock' }, score: 0 });
            }
            return hints;
        }

        async move(cards, from, to, animate = true) {
            this.saveState();
            if (!this.hasMoved) this.hasMoved = true;

            // 记录需要翻开的牌（在移除之前）
            let cardToFlip = null;
            if (from.type === 'cols') {
                let col = this.cols[from.idx];
                if (col.length > cards.length && !col[col.length - cards.length - 1].faceUp) {
                    cardToFlip = col[col.length - cards.length - 1];
                }
            }

            // 执行飞牌动画（仅在非拖拽操作时）
            if (animate) {
                await animateMove(cards, from, to);
            }

            // 从源位置移除
            if (from.type === 'waste') this.waste.pop();
            else if (from.type === 'cols') this.cols[from.idx].splice(from.cardIdx, cards.length);
            else if (from.type === 'found') {
                this.found[from.idx]--;
                this.score = Math.max(0, this.score - 15);
            }

            // 添加到目标位置
            if (to.type === 'cols') {
                this.cols[to.idx].push(...cards);
                soundManager.play('cardselset');
            }
            else if (to.type === 'found') {
                this.found[to.idx]++;
                this.score += 10;
                soundManager.play('tofound');
            }

            // 翻牌堆移至列牌区得分
            if (from.type === 'waste' && to.type === 'cols') this.score += 5;

            // 如果需要，翻开下方的牌
            if (cardToFlip) {
                cardToFlip.faceUp = true;
                this.score += 5;
            }

            renderContent();
            
            // 执行翻牌动画
            if (cardToFlip) {
                await animateFlip(cardToFlip.id);
            }
            
            // 自动收牌
            await this.autoCollect();
            
            // 简单的胜利检测
            if (!this.isWon && this.found.every(x => x === 13)) {
                this.isWon = true;
                handleGameWin();
            }
            
            // 死局检测
            if (!this.isWon && this.getHints().length === 0) {
                showMessageBox({
                    title: t('noMovesTitle'),
                    message: t('noMovesMessage'),
                    type: 'error',
                    buttons: 'ok'
                });
            }
            
            saveGameState();
        }

        /**
         * isSafeToAutoCollect - 判断是否可以安全启动自动收牌
         * 条件: stock=0, waste=0, 全翻面
         */
        isSafeToAutoCollect() {
            // 条件1: 发牌区为空
            if (this.stock.length > 0) return false;
            
            // 条件2: 收牌区为空
            if (this.waste.length > 0) return false;
            
            // 条件3: 所有牌都已翻开
            for (const col of this.cols) {
                for (const card of col) {
                    if (!card.faceUp) return false;
                }
            }
            
            return true;
        }

        /**
         * findMovableToFound - 查找可移动到回收区的牌
         * 优先级: 按花色顺序查找
         */
        findMovableToFound() {
            // 遍历所有叠牌区
            for (let i = 0; i < 7; i++) {
                if (this.cols[i].length > 0) {
                    const card = this.cols[i][this.cols[i].length - 1];
                    const suitIdx = SUITS.indexOf(card.suit);
                    
                    // 检查是否可以移到回收区
                    if (card.rank === this.found[suitIdx] + 1) {
                        return {
                            card: card,
                            from: { type: 'cols', idx: i, cardIdx: this.cols[i].length - 1 },
                            to: { type: 'found', idx: suitIdx }
                        };
                    }
                }
            }
            
            return null;  // 没有可移动的牌
        }

        /**
         * autoCollect - 自动收牌
         * 条件: stock=0, waste=0, 全翻面
         * 递归调用,每次移动一张牌
         */
        async autoCollect() {
            // 检查条件
            if (!this.isSafeToAutoCollect()) {
                return;
            }
            
            // 查找可移动到回收区的牌
            const movable = this.findMovableToFound();
            
            if (movable) {
                // 移动牌 (会触发递归)
                await this.move([movable.card], movable.from, movable.to, true);
            }
            // 没有可移动的牌,递归结束
        }
    }

    // ---------- 核心游戏逻辑 ----------
    // 实例化主游戏对象，管理所有状态。
    const game = new SolitaireLogic();
    let layout = { cardW: 71, cardH: 96, paddingX: 10, paddingY: 10, colGap: 10, rowGap: 20 };
    let gameTimer = null;
    let drag = null;
    let selection = null;
    let currentHints = [];
    let currentHintIndex = 0;
    let lastTapTime = 0;
    let lastTapCardId = null;
    const DOUBLE_TAP_DELAY = 300;
    let invalidTipElement = null;
    let invalidTipTimeout = null;
    let invalidTipLock = false;

    // 动画辅助函数：获取卡牌位置
    function getCardPosition(pos, cardIndex) {
        let x = 0, y = 0;
        if (pos.type === 'stock') {
            x = layout.stockPos.x;
            y = layout.stockPos.y;
        } else if (pos.type === 'waste') {
            x = layout.wastePos.x;
            y = layout.wastePos.y;
        } else if (pos.type === 'found') {
            x = layout.foundPos[pos.idx].x;
            y = layout.foundPos[pos.idx].y;
        } else if (pos.type === 'cols') {
            x = layout.colsXPos[pos.idx];
            y = layout.tableauY;
            // 计算该列中该卡牌的Y位置
            const col = game.cols[pos.idx];
            for (let i = 0; i < cardIndex && i < col.length; i++) {
                y += col[i].faceUp ? layout.stackYOffsetUp : layout.stackYOffsetDown;
            }
        }
        return { x, y };
    }

    // 飞牌动画函数
    async function animateMove(cards, from, to) {
        if (typeof clearSelection === 'function') clearSelection();
        const duration = 150;
        const canvas = document.getElementById('canvas');
        const flyers = [];

        // 计算起始索引
        let startIdx = 0;
        if (from.type === 'cols') {
            startIdx = from.cardIdx !== undefined ? from.cardIdx : game.cols[from.idx].length - cards.length;
        } else if (from.type === 'waste') {
            startIdx = game.waste.length - cards.length;
        }

        // 计算目标索引
        let destIdx = 0;
        if (to.type === 'cols') {
            destIdx = game.cols[to.idx].length;
        }

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const startPos = getCardPosition(from, startIdx + i);
            
            // 创建飞牌元素
            const el = createCardEl(card, { type: 'animation' });
            el.style.width = `${layout.cardW}px`;
            el.style.height = `${layout.cardH}px`;
            el.style.position = 'absolute';
            el.style.left = `${startPos.x}px`;
            el.style.top = `${startPos.y}px`;
            el.style.zIndex = 1000 + i;
            el.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out`;
            el.style.pointerEvents = 'none';
            el.classList.add('selected');
            
            // 设置字体大小
            let fontSize = Math.max(10, Math.floor(layout.stackYOffsetUp * 0.90));
            const paddingX = (window.innerWidth <= 600 || window.innerHeight <= 500) ? 4 : 8;
            if (fontSize * 2.2 > layout.cardW - paddingX) {
                fontSize = Math.floor((layout.cardW - paddingX) / 2.2);
            }
            el.style.fontSize = `${fontSize}px`;

            // 隐藏原始卡牌
            const originalEl = document.querySelector(`.card[data-id="${card.id}"]`);
            if (originalEl) originalEl.style.visibility = 'hidden';

            canvas.appendChild(el);
            flyers.push({ el, index: i });
        }

        // 强制浏览器重排
        if (flyers.length > 0) flyers[0].el.getBoundingClientRect();

        // 设置目标位置
        flyers.forEach(({ el, index }) => {
            const destPos = getCardPosition(to, destIdx + index);
            el.style.left = `${destPos.x}px`;
            el.style.top = `${destPos.y}px`;
        });

        await new Promise(r => setTimeout(r, duration));
        flyers.forEach(f => f.el.remove());
    }

    // 翻牌动画函数
    async function animateFlip(cardId) {
        const el = document.querySelector(`.card[data-id="${cardId}"]`);
        if (!el) return;
        
        el.classList.add('flipping');
        await new Promise(r => setTimeout(r, 200));
        el.classList.remove('flipping');
    }

    // 发牌动画函数（翻牌+飞行）
    async function animateDrawStock(cards) {
        const duration = 150;
        const canvas = document.getElementById('canvas');
        const flyers = [];

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const startPos = { x: layout.stockPos.x, y: layout.stockPos.y };
            
            // 创建卡牌元素（初始为背面）
            const el = document.createElement('div');
            el.className = 'card back';
            el.style.width = `${layout.cardW}px`;
            el.style.height = `${layout.cardH}px`;
            el.style.position = 'absolute';
            el.style.left = `${startPos.x}px`;
            el.style.top = `${startPos.y}px`;
            el.style.zIndex = 1000 + i;
            el.style.pointerEvents = 'none';

            canvas.appendChild(el);
            flyers.push({ el, card, index: i });
        }

        // 隐藏发牌堆顶牌
        const stockTopCard = document.querySelector('.card.back');
        if (stockTopCard) stockTopCard.style.visibility = 'hidden';

        // 强制浏览器重排
        if (flyers.length > 0) flyers[0].el.getBoundingClientRect();

        // 翻转动画（从背面翻到正面）
        for (let i = 0; i < flyers.length; i++) {
            const { el, card } = flyers[i];
            
            // 延迟每张牌的动画
            await new Promise(r => setTimeout(r, i * 40));
            
            // 添加翻转动画
            el.classList.add('flipping');
            
            // 在翻转中途（100ms）切换内容
            setTimeout(() => {
                el.classList.remove('back');
                el.classList.add(card.isRed ? 'red' : 'black');
                
                // 设置字体大小
                let fontSize = Math.max(10, Math.floor(layout.stackYOffsetUp * 0.90));
                const paddingX = (window.innerWidth <= 600 || window.innerHeight <= 500) ? 4 : 8;
                if (fontSize * 2.2 > layout.cardW - paddingX) {
                    fontSize = Math.floor((layout.cardW - paddingX) / 2.2);
                }
                el.style.fontSize = `${fontSize}px`;
                
                const rank = card.rank === 1 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank;

                // 脸牌使用图片，普通牌使用花色符号
                if (card.rank > 10) {
                    const f = getFaceImageKey(card);
                    el.innerHTML = `<img src="${faceImageSrcs[f]}" class="face-img" alt="${f}">` +
                                   `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div></div>`;
                } else {
                    const bigSuitSize = Math.max(20, Math.floor(layout.cardW * 0.9));
                    el.innerHTML = `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div><div class="suit-l" style="font-size:${bigSuitSize}px">${SYMBOLS[card.suit]}</div></div>`;
                }
            }, 100);
        }

        // 等待翻转完成
        await new Promise(r => setTimeout(r, 200));

        // 飞行动画到收牌区
        flyers.forEach(({ el, card, index }) => {
            el.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out`;
            
            // 计算目标位置
            let destX, destY;
            if (gameSettings.drawCount === 3) {
                const wasteXOffset = layout.cardW * 0.46;
                // Draw 3 模式：始终显示最后3张，位置固定为 0, 1, 2
                destX = layout.wastePos.x + index * wasteXOffset;
            } else {
                destX = layout.wastePos.x;
            }
            destY = layout.wastePos.y;
            
            el.style.left = `${destX}px`;
            el.style.top = `${destY}px`;
        });

        await new Promise(r => setTimeout(r, duration));
        flyers.forEach(f => f.el.remove());
    }

    // 收牌区重置回发牌堆动画
    async function animateResetStock(cards) {
        const duration = 150;
        const canvas = document.getElementById('canvas');
        const flyers = [];

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            // 计算起始位置（与渲染逻辑一致）
            let startX, startY;
            if (gameSettings.drawCount === 3) {
                // Draw 3 模式：最后3张位置为 0, 1, 2，其他牌位置为 0
                const wasteXOffset = layout.cardW * 0.46;
                const isLastThree = i >= cards.length - 3;
                const displayIndex = isLastThree ? (i - (cards.length - 3)) : 0;
                startX = layout.wastePos.x + displayIndex * wasteXOffset;
            } else {
                // Draw 1 模式：所有牌位置为 0
                startX = layout.wastePos.x;
            }
            startY = layout.wastePos.y;
            
            // 创建卡牌元素
            const el = document.createElement('div');
            el.className = `card ${card.isRed ? 'red' : 'black'}`;
            el.style.width = `${layout.cardW}px`;
            el.style.height = `${layout.cardH}px`;
            el.style.position = 'absolute';
            el.style.left = `${startX}px`;
            el.style.top = `${startY}px`;
            el.style.zIndex = 1000 + i;
            el.style.pointerEvents = 'none';
            
            let fontSize = Math.max(10, Math.floor(layout.stackYOffsetUp * 0.90));
            const paddingX = (window.innerWidth <= 600 || window.innerHeight <= 500) ? 4 : 8;
            if (fontSize * 2.2 > layout.cardW - paddingX) {
                fontSize = Math.floor((layout.cardW - paddingX) / 2.2);
            }
            el.style.fontSize = `${fontSize}px`;
            
            const rank = card.rank === 1 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank;
            const bigSuitSize = Math.max(20, Math.floor(layout.cardW * 0.9));
            el.innerHTML = `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div><div class="suit-l" style="font-size:${bigSuitSize}px">${SYMBOLS[card.suit]}</div></div>`;

            // 隐藏原始卡牌
            const originalEl = document.querySelector(`.card[data-id="${card.id}"]`);
            if (originalEl) originalEl.style.visibility = 'hidden';

            canvas.appendChild(el);
            flyers.push({ el, card, index: i });
        }

        // 强制浏览器重排
        if (flyers.length > 0) flyers[0].el.getBoundingClientRect();

        // 飞行动画到发牌堆
        flyers.forEach(({ el, index }) => {
            el.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out`;
            el.style.left = `${layout.stockPos.x}px`;
            el.style.top = `${layout.stockPos.y}px`;
        });

        await new Promise(r => setTimeout(r, duration));

        // 翻转动画（从正面翻到背面）
        for (let i = flyers.length - 1; i >= 0; i--) {
            const { el } = flyers[i];
            el.classList.add('flipping');
            
            setTimeout(() => {
                el.className = 'card back';
                el.innerHTML = '';
            }, 100);
        }

        await new Promise(r => setTimeout(r, 200));
        flyers.forEach(f => f.el.remove());
    }

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
        
        // 先切换CSS类
        const isLandscapeWide = (vw / vh >= 2) && (vh < 500);
        pageContainer.classList.toggle('landscape-wide', isLandscapeWide);
        
        // 强制重排，确保CSS样式已应用
        void bottomBar.offsetHeight;
        
        // 再获取高度（在切换CSS类之后）
        const topBarH = topBar.offsetHeight;
        const bottomBarH = bottomBar.offsetHeight;
        const statusBarH = statusBar.offsetHeight;

        const canvasVpHeight = Math.max(400, vh);
        const sidebarWrapper = document.querySelector('.sidebar-wrapper');
        const bottomBarWidth = isLandscapeWide ? sidebarWrapper.offsetWidth : 0;

        let mode = 'pc';
        if (vw < 480) mode = 'phone';
        else if (vw < 800) mode = 'tablet';

        const basePaddingX = { phone: 1, tablet: 10, pc: 40 }[mode];
        const baseColGap = { phone: 1, tablet: 8, pc: 16 }[mode];
        
        // 引入高度检测模式 (vMode)，完全对齐 xjfcel 逻辑
        let vMode = 'pc';
        if (canvasVpHeight < 500) vMode = 'phone';
        else if (canvasVpHeight < 700) vMode = 'tablet';

        const basePaddingY = 5;
        const gapValues = { phone: 10, tablet: 15, pc: 20 };
        const baseRowGap = Math.min(gapValues[mode], gapValues[vMode]);

        const cardAspectRatio = 96 / 71;
        
        const availableW = Math.max(320, isLandscapeWide ? vw - bottomBarWidth : vw);
        const cardW_limitX7 = (availableW - (2 * basePaddingX) - (6 * baseColGap)) / 7;
        const cardW_limitX8 = (availableW - (2 * basePaddingX) - (7 * baseColGap)) / 8;

        const availableH = canvasVpHeight - topBarH - (isLandscapeWide ? 0 : (bottomBarH + statusBarH));

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

        const verticalFixedSpace = basePaddingY + baseRowGap + basePaddingY;
        const verticalFactor = 2 + (12 * STACK_OFFSET_RATIO);

        let cardH_height = (availableH - verticalFixedSpace) / verticalFactor;
        if (cardH_height <= 0) cardH_height = 50;
        let cardW_height = cardH_height / cardAspectRatio;

        let cardW = Math.min(cardW_limitX7, cardW_height);
        cardW = Math.max(30, cardW);

        layout.cardW = Math.floor(cardW);
        layout.cardH = Math.floor(cardW * cardAspectRatio);

        // 核心：横向总宽度对齐逻辑。只有在高度受限且宽度足以放下 8 列（空当接龙宽度）时才拉伸间距，避免溢出屏幕
        layout.colGap = baseColGap;
        if (cardW <= cardW_limitX8 && mode !== 'phone') {
            // 补偿公式：(1张牌宽 + 7个标准间距) / 6个间隔
            layout.colGap = Math.floor((layout.cardW + 7 * baseColGap) / 6);
        }

        layout.paddingX = basePaddingX;
        layout.paddingY = basePaddingY;
        layout.rowGap = baseRowGap;
        layout.stackYOffsetUp = Math.floor(layout.cardH * STACK_OFFSET_RATIO);
        layout.stackYOffsetDown = Math.floor(layout.cardH * 0.08);

        const totalWidth = 7 * layout.cardW + 6 * layout.colGap;
        const gameAreaWidth = totalWidth + 2 * basePaddingX;
        const containerW = isLandscapeWide ? gameAreaWidth + bottomBarWidth : gameAreaWidth;
        pageContainer.style.width = `${containerW}px`;

        // 使用缓存的 DOM 引用，避免重复查询
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
        }

        // 计算坐标位置
        // 顶行：发牌区(0), 收牌区(1), 间隙(2), 回收区(3,4,5,6)
        // 标准布局中，发牌/收牌组在左侧，回收组在右侧
        // 使用列索引进行 X 轴对齐
        layout.stockPos = { x: layout.paddingX, y: layout.paddingY };
        // 确保 stock 和 waste 之间至少有 4px 间隔
        const stockWasteGap = Math.max(4, layout.colGap);
        layout.wastePos = { x: layout.paddingX + layout.cardW + stockWasteGap, y: layout.paddingY };
        layout.foundPos = [];
        for(let i=0; i<4; i++) {
            layout.foundPos[i] = { x: layout.paddingX + (i+3) * (layout.cardW + layout.colGap), y: layout.paddingY };
        }
        layout.colsXPos = [];
        for(let i=0; i<7; i++) {
            layout.colsXPos[i] = layout.paddingX + i * (layout.cardW + layout.colGap);
        }
        layout.tableauY = layout.paddingY + layout.cardH + layout.rowGap;
    }

    function renderContent() {
        const colY = layout.tableauY;
        const canvas = document.getElementById('canvas');
        const stockGroup = document.getElementById('stock-waste-group');
        const foundGroup = document.getElementById('found-group');
        
        // 重置槽位视觉效果
        stockGroup.innerHTML = '';
        foundGroup.innerHTML = '';
        
        const bgSlotStyle = `width:${layout.cardW}px; height:${layout.cardH}px;`;

        // 发牌区槽位
        const stockSlot = document.createElement('div');
        stockSlot.className = 'slot' + (game.stock.length === 0 ? ' empty-stock' : '');
        stockSlot.id = 'stock-slot';
        stockSlot.style.cssText = bgSlotStyle;
        if (game.stock.length === 0) {
            stockSlot.style.pointerEvents = 'auto';
            stockSlot.style.cursor = 'pointer';
            stockSlot.onmousedown = (e) => { if (e.button === 0) { clearHint(); game.drawStock(); } };
            stockSlot.ontouchstart = (e) => { if (e.touches.length <= 1) { e.preventDefault(); clearHint(); game.drawStock(); } };
        }
        stockGroup.appendChild(stockSlot);

        // 收牌区槽位
        const wasteSlot = document.createElement('div');
        wasteSlot.className = 'slot';
        wasteSlot.id = 'waste-slot';
        wasteSlot.style.cssText = bgSlotStyle;
        stockGroup.appendChild(wasteSlot);

        stockGroup.style.gap = `${layout.colGap}px`;
        
        // 收牌区槽位
        for(let i=0; i<4; i++) {
            const f = document.createElement('div');
            f.className = 'slot';
            f.style.cssText = bgSlotStyle;
            // 空收牌区槽位可以接收点击，用于放置A
            f.onclick = (e) => { 
                e.stopPropagation();
                if (selection && selection.cards.length === 1) {
                    attemptMove(selection.cards, selection.from, {type:'found', idx:i});
                }
            };
            foundGroup.appendChild(f);
        }
        foundGroup.style.gap = `${layout.colGap}px`;

        // 定位布局分组
        const topRowW = 7 * layout.cardW + 6 * layout.colGap;
        document.getElementById('bg-slots').style.cssText = `left:${layout.paddingX}px; top:${layout.paddingY}px; width:${topRowW}px;`;
        
        // 图标大小
        document.documentElement.style.setProperty('--bg-icon-size', `${Math.floor(layout.cardH * 0.6)}px`);

        // 清除卡牌
        document.querySelectorAll('.card').forEach(el => el.remove());

        // --- 绘制卡牌 ---
        
        // 发牌区（显示所有背牌，堆叠效果）
        if (game.stock.length > 0) {
            // 移动端：堆叠偏移1px，最多3张；PC端：堆叠偏移2px，最多3张
            const isMobile = window.innerWidth <= 600 || window.innerHeight <= 500;
            const stockStackOffset = isMobile ? 1 : 2;
            const maxVisibleStock = Math.min(game.stock.length, 3);
            for (let i = 0; i < maxVisibleStock; i++) {
                const offset = i * stockStackOffset;
                createAndPlaceCard(null, {type:'stock'}, layout.stockPos.x + offset, layout.stockPos.y + offset, false, true);
            }
        }

        // 收牌区（显示所有牌，但只有最后几张可交互）
        if (game.waste.length > 0) {
            if (gameSettings.drawCount === 3) {
                // Draw 3 模式：显示所有牌，最后3张可交互
                const wasteXOffset = layout.cardW * 0.46;
                game.waste.forEach((card, i) => {
                    const isLastThree = i >= game.waste.length - 3;
                    const displayIndex = isLastThree ? (i - (game.waste.length - 3)) : 0;
                    const x = layout.wastePos.x + displayIndex * wasteXOffset;
                    // 非最后3张的牌显示在最左边，半透明
                    createAndPlaceCard(card, {type:'waste', cardIdx: i}, x, layout.wastePos.y, isLastThree, false, !isLastThree);
                });
            } else { // draw 1
                // Draw 1 模式：显示所有牌，最后1张可交互
                game.waste.forEach((card, i) => {
                    const isTop = (i === game.waste.length - 1);
                    createAndPlaceCard(card, {type:'waste', cardIdx: i}, layout.wastePos.x, layout.wastePos.y, isTop, false, !isTop);
                });
            }
        }

        // 收牌区（显示顶牌和下面的牌）
        game.found.forEach((r, i) => {
            if (r > 0) {
                // 显示下面的牌（不可交互）
                if (r > 1) {
                    let cardBelow = { suit: SUITS[i], rank: r - 1, isRed: (SUITS[i]=='hearts'||SUITS[i]=='diamonds'), id: 'found'+i+'_'+(r-1)+'_below', faceUp: true };
                    createAndPlaceCard(cardBelow, {type:'found', idx:i}, layout.foundPos[i].x, layout.foundPos[i].y, false);
                }
                // 显示顶牌（可交互）
                let card = { suit: SUITS[i], rank: r, isRed: (SUITS[i]=='hearts'||SUITS[i]=='diamonds'), id: 'found'+i+'_'+r, faceUp: true };
                createAndPlaceCard(card, {type:'found', idx:i}, layout.foundPos[i].x, layout.foundPos[i].y, true);
            }
        });

        // Tableau
        game.cols.forEach((col, i) => {
            let currentY = colY;
            col.forEach((c, j) => {
                const isDraggable = c.faceUp; 
                createAndPlaceCard(c, {type:'cols', idx:i, cardIdx:j}, layout.colsXPos[i], currentY, isDraggable, !c.faceUp);
                currentY += c.faceUp ? layout.stackYOffsetUp : layout.stackYOffsetDown;
            });
        });

        updateStatusBar();
        
        // 调整画布高度
        let maxColHeight = 0;
        game.cols.forEach(col => {
            if (col.length === 0) return;
            let colHeight = 0;
            for(let i = 0; i < col.length - 1; i++) {
                colHeight += col[i].faceUp ? layout.stackYOffsetUp : layout.stackYOffsetDown;
            }
            colHeight += layout.cardH; // 加上最后一张牌的全高
            if (colHeight > maxColHeight) maxColHeight = colHeight;
        });

        // 确保最少按 13 张牌计算（托底，与 xjfcel 保持一致）
        const maxCardsInCol = Math.max(13, ...game.cols.map(c => c.length));
        const minHeight13Cards = colY + layout.cardH + ((maxCardsInCol - 1) * layout.stackYOffsetUp);
        const minH = colY + Math.max(layout.cardH, maxColHeight);
        canvas.style.minHeight = `${Math.max(minHeight13Cards, minH) + 5}px`;
    }

    function createCardEl(card, pos) {
        const div = document.createElement('div');
        div.className = `card ${card.isRed ? 'red' : 'black'}`;
        div.dataset.id = card.id;
        div.dataset.type = pos.type;
        const rank = card.rank === 1 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank;

        if (card.rank > 10) {
            const f = getFaceImageKey(card);
            div.innerHTML = `<img src="${faceImageSrcs[f]}" class="face-img" alt="${f}">` +
                            `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div></div>`;
        } else {
            const bigSuitSize = Math.max(20, Math.floor(layout.cardW * 0.9));
            div.innerHTML = `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div><div class="suit-l" style="font-size:${bigSuitSize}px">${SYMBOLS[card.suit]}</div></div>`;
        }

        return div;
    }

    function createAndPlaceCard(card, pos, x, y, isDraggable, isBack = false, isInactive = false) {
        const div = document.createElement('div');
        div.style.width = `${layout.cardW}px`;
        div.style.height = `${layout.cardH}px`;
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        div.posData = pos;
        
        if (isBack) {
            div.className = 'card back';
            if (pos.type === 'stock') {
                 // 发牌区点击处理 - 使用 mousedown 以便与提示高亮清除同步
                 div.onmousedown = (e) => { if (e.button === 0) { clearHint(); game.drawStock(); } };
                 div.ontouchstart = (e) => { if (e.touches.length <= 1) { e.preventDefault(); clearHint(); game.drawStock(); } };
            }
        } else {
            div.className = `card ${card.isRed ? 'red' : 'black'}`;
            if (isInactive) div.classList.add('inactive');
            div.dataset.id = card.id;
            
            // 动态计算字体大小：利用叠牌留空区域(32%高度)
            let fontSize = Math.max(10, Math.floor(layout.stackYOffsetUp * 0.90));
            const paddingX = (window.innerWidth <= 600 || window.innerHeight <= 500) ? 4 : 8;
            // 防止宽度溢出 (逻辑完全复刻 xjfcel)
            if (fontSize * 2.2 > layout.cardW - paddingX) {
                fontSize = Math.floor((layout.cardW - paddingX) / 2.2);
            }
            div.style.fontSize = `${fontSize}px`;

            const rank = card.rank === 1 ? 'A' : card.rank === 11 ? 'J' : card.rank === 12 ? 'Q' : card.rank === 13 ? 'K' : card.rank;

            if (card.rank > 10) {
                const f = getFaceImageKey(card);
                div.innerHTML = `<img src="${faceImageSrcs[f]}" class="face-img" alt="${f}">` +
                                `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div></div>`;
            } else {
                const bigSuitSize = Math.max(20, Math.floor(layout.cardW * 0.9));
                div.innerHTML = `<div class="card-inner"><div class="card-header"><span class="rank">${rank}</span><span class="suit-s">${SYMBOLS[card.suit]}</span></div><div class="suit-l" style="font-size:${bigSuitSize}px">${SYMBOLS[card.suit]}</div></div>`;
            }
            
            if (isDraggable) {
                div.classList.add('draggable');
                // 收牌区的牌不支持双击/右键快速移动
                if (pos.type !== 'found') {
                    div.onmousedown = (e) => { if (e.button===0) startDrag(e, card, pos); else if (e.button===2) quickMove(card, pos); };
                    div.ontouchstart = (e) => { if (e.touches.length <= 1) startTouchDrag(e, card, pos); };
                    div.ondblclick = () => quickMove(card, pos);
                } else {
                    div.onmousedown = (e) => { if (e.button===0) startDrag(e, card, pos); };
                    div.ontouchstart = (e) => { if (e.touches.length <= 1) startTouchDrag(e, card, pos); };
                    // 收牌区的牌支持单击选择
                    div.onclick = (e) => { 
                        e.stopPropagation(); 
                        if (skipNextClick) { skipNextClick = false; return; }
                        handleClick(card, pos); 
                    };
                }
            }
        }
        document.getElementById('canvas').appendChild(div);
    }

    // --- 交互逻辑 ---
    let skipNextClick = false;
    
    function startDrag(e, card, pos) {
        // 收牌区的牌需要设置标记，但不阻止拖拽
        if (pos.type === 'found') {
            skipNextClick = true;
        }
        
        // 验证：如果是从列牌区拖动一堆牌，检查牌堆合法性
        let cards = [card], els = [];
        if (pos.type === 'cols') {
            const col = game.cols[pos.idx];
            cards = col.slice(pos.cardIdx);
            // 纸牌规则：牌堆必须颜色交替、点数递减。
            for (let i = 0; i < cards.length - 1; i++) {
                if (cards[i].isRed === cards[i+1].isRed || cards[i].rank !== cards[i+1].rank + 1) return; // 牌堆无效
            }
        }
        
        // 收牌区的牌只能拖单张
        if (pos.type === 'found') {
            cards = [card];
        }
        
        // 查找 DOM 元素
        if (pos.type === 'cols') {
            // 需要选择从此索引向下的所有卡牌
            const allCards = Array.from(document.querySelectorAll('#canvas .card'));
            // 过滤匹配 ID 的牌
            const ids = cards.map(c => c.id);
            els = allCards.filter(el => ids.includes(el.dataset.id));
            // 确保渲染顺序
            els.sort((a,b) => ids.indexOf(a.dataset.id) - ids.indexOf(b.dataset.id));
        } else {
            els = [e.currentTarget];
        }

        const rect = els[0].getBoundingClientRect();
        drag = {
            cards, from: pos, els,
            ox: e.clientX - rect.left, oy: e.clientY - rect.top,
            startX: e.clientX, startY: e.clientY,
            moved: false
        };

        const move = (ev) => {
            if (!drag.moved && (Math.abs(ev.clientX - drag.startX) > 5 || Math.abs(ev.clientY - drag.startY) > 5)) {
                drag.moved = true;
                soundManager.play('liftoff'); // 只在真正拖拽移动时播放
                clearSelection();
                els.forEach(el => { el.classList.add('dragging'); el.classList.add('selected'); });
            }
            if (drag.moved) {
                const canvasRect = document.getElementById('canvas').getBoundingClientRect();
                els.forEach((el, i) => {
                    el.style.left = (ev.clientX - canvasRect.left - drag.ox) + 'px';
                    el.style.top = (ev.clientY - canvasRect.top - drag.oy + i * layout.stackYOffsetUp) + 'px';
                });
            }
        };
        const up = (ev) => {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
            
            // 判断是单击还是拖拽
            if (drag) {
                if (drag.moved) {
                    // 如果移动了，执行拖拽放置逻辑
                    finishDrag(ev);
                } else if (drag.from && drag.from.type === 'found') {
                    // 收牌区的牌，单击时选中/移动
                    handleClick(drag.cards[0], drag.from);
                } else {
                    // 其他区域的牌，单击时选中
                    handleClick(drag.cards[0], drag.from);
                }
            }
            drag = null;
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    }

    /**
     * startTouchDrag - 专门处理触摸拖拽的逻辑。
     * 兼容单击、双击、拖拽手势。
     * 解决了移动端滚动与拖拽的冲突。
     */
    function startTouchDrag(e, card, pos) {
        // 收牌区的牌需要设置标记，但不阻止拖拽
        if (pos.type === 'found') {
            skipNextClick = true;
        }
        
        const t = e.touches[0];
        // 逻辑类似于鼠标操作...
        let cards = [card], els = [];
        if (pos.type === 'cols') {
            const col = game.cols[pos.idx];
            cards = col.slice(pos.cardIdx);
            for (let i = 0; i < cards.length - 1; i++) {
                if (cards[i].isRed === cards[i+1].isRed || cards[i].rank !== cards[i+1].rank + 1) return;
            }
            // 查找元素... 为简洁起见复用逻辑
             const allCards = Array.from(document.querySelectorAll('#canvas .card'));
             const ids = cards.map(c => c.id);
             els = allCards.filter(el => ids.includes(el.dataset.id));
             els.sort((a,b) => ids.indexOf(a.dataset.id) - ids.indexOf(b.dataset.id));
        } else if (pos.type === 'found') {
            // 收牌区的牌只能拖单张
            cards = [card];
            els = [e.currentTarget];
        } else { els = [e.currentTarget]; }

        const rect = els[0].getBoundingClientRect();
        drag = {
            cards, from: pos, els,
            ox: t.clientX - rect.left, oy: t.clientY - rect.top,
            startX: t.clientX, startY: t.clientY, moved: false
        };

        const move = (ev) => {
            const tt = ev.touches[0];
            if (!drag.moved && (Math.abs(tt.clientX - drag.startX) > 5 || Math.abs(tt.clientY - drag.startY) > 5)) {
                drag.moved = true;
                soundManager.play('liftoff'); // 只在真正拖拽移动时播放
                clearSelection();
                els.forEach(el => { el.classList.add('dragging'); el.classList.add('selected'); });
            }
            if (drag.moved) {
                if(ev.cancelable) ev.preventDefault();
                const canvasRect = document.getElementById('canvas').getBoundingClientRect();
                els.forEach((el, i) => {
                    el.style.left = (tt.clientX - canvasRect.left - drag.ox) + 'px';
                    el.style.top = (tt.clientY - canvasRect.top - drag.oy + i * layout.stackYOffsetUp) + 'px';
                });
            }
        };
        const end = (ev) => {
            if (ev.cancelable) ev.preventDefault();
            document.removeEventListener('touchmove', move);
            document.removeEventListener('touchend', end);
            if (drag && drag.moved) {
                const tt = ev.changedTouches[0];
                finishDrag({ clientX: tt.clientX, clientY: tt.clientY });
            } else if (drag) {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTapTime;
                const card = drag.cards[0];
                
                // 收牌区的牌，不处理双击
                if (drag.from.type === 'found') {
                    handleClick(card, drag.from);
                } else if (tapLength < DOUBLE_TAP_DELAY && tapLength > 0 && lastTapCardId === card.id) {
                    quickMove(card, drag.from);
                    lastTapTime = 0;
                    lastTapCardId = null;
                } else {
                    handleClick(card, drag.from);
                    lastTapTime = currentTime;
                    lastTapCardId = card.id;
                }
            }
            drag = null;
        };
        document.addEventListener('touchmove', move, {passive:false});
        document.addEventListener('touchend', end);
    }

    /**
     * finishDrag - 拖拽结束时的处理函数。
     * 判断目标位置，校验移动合法性，执行移动或弹回。
     * @param {Event} e - 鼠标/触摸事件对象
     */
    function finishDrag(e) {
        const { cards, from, els } = drag;
        els.forEach(el => { el.classList.remove('selected'); el.classList.remove('dragging'); });
        
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left - drag.ox + layout.cardW/2;
        const my = e.clientY - rect.top - drag.oy + layout.cardH/2;
        
        let dest = null;
        // 检查收牌区
        for(let i=0; i<4; i++) {
            // 如果是从收牌区拖动，跳过自己所在的槽位
            if (from.type === 'found' && from.idx === i) continue;
            const p = layout.foundPos[i];
            if (mx >= p.x && mx <= p.x+layout.cardW && my >= p.y && my <= p.y+layout.cardH) {
                dest = {type: 'found', idx: i}; break;
            }
        }
        // 检查列牌区
        if (!dest && my > layout.tableauY - 20) {
            for(let i=0; i<7; i++) {
                // 如果是从列牌区拖动，跳过自己所在的列
                if (from.type === 'cols' && from.idx === i) continue;
                const x = layout.colsXPos[i];
                if (mx >= x && mx <= x+layout.cardW) {
                    dest = {type: 'cols', idx: i}; break;
                }
            }
        }

        if (dest) {
            attemptMove(cards, from, dest, false); // 拖拽放牌不需要飞牌动画
        } else {
            renderContent();
        }
    }

    function handleClick(card, pos) {
        if (selection) {
            // Case 1: 用户点击了当前已选中牌列中的任意一张牌，意图是取消选择
            if (selection.cards.some(c => c.id === card.id)) {
                clearSelection();
                return;
            }

            // Case 2: 用户点击了另一张牌，意图是"放置"
            const { cards: selectedCards, from: selectedFrom } = selection;

            if (pos.type === 'found') {
                // 点击收牌区，尝试移动
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

            if (pos.type === 'cols') {
                const targetCol = game.cols[pos.idx];
                
                // 只有当点击的是该列最后一张牌时，才尝试移动
                if (targetCol.length > 0 && targetCol[targetCol.length - 1].id === card.id) {
                    let top = targetCol[targetCol.length - 1];
                    if (top.isRed !== selectedCards[0].isRed && top.rank === selectedCards[0].rank + 1) {
                        game.move(selectedCards, selectedFrom, { type: 'cols', idx: pos.idx });
                    } else {
                        showInvalidMoveTip('colorRankMismatch');
                    }
                }
                // 无论移动是否成功，都清除选择
                clearSelection();
                return;
            }

            // 其他情况，清除选择
            clearSelection();
            return;
        }
        
        // 选择逻辑
        // 只能从收牌区、列牌区（正面朝上）选择
        if (pos.type === 'waste' || pos.type === 'cols' || pos.type === 'found') {
            let cards = [card];
            if (pos.type === 'cols') {
                // 选择牌堆
                const col = game.cols[pos.idx];
                cards = col.slice(pos.cardIdx);
                 // 验证选择的牌堆是否合法
                 for (let i = 0; i < cards.length - 1; i++) {
                    if (cards[i].isRed === cards[i+1].isRed || cards[i].rank !== cards[i+1].rank + 1) return; // 无法选择无效牌堆
                }
            }
            // 收牌区只能选择单张（且必须是顶牌）
            if (pos.type === 'found') {
                const suitIdx = SUITS.indexOf(card.suit);
                if (card.rank !== game.found[suitIdx]) return; // 不是顶牌，不能选择
            }
            selection = { cards, from: pos };
            soundManager.play('cardselset'); // 单击选中时播放
            // 高亮显示
            cards.forEach(c => {
                const el = document.querySelector(`.card[data-id="${c.id}"]`);
                if (el) el.classList.add('selected');
            });
        }
    }

    function autoMoveToFoundation(card, pos) {
        // 尝试自动移动到回收区
        let sIdx = SUITS.indexOf(card.suit);
        if (card.rank === game.found[sIdx] + 1) {
            // 只有当它是牌堆的顶牌时才可以移动
            let isTop = false;
            if (pos.type === 'waste') isTop = true;
            if (pos.type === 'cols' && pos.cardIdx === game.cols[pos.idx].length - 1) isTop = true;
                
            if (isTop) {
                attemptMove([card], pos, {type:'found', idx:sIdx});
            }
        }
    }

    // 处理空位点击（用于将 K 移动到空列，以及收牌区空槽位放牌）
    document.getElementById('canvas').onclick = (e) => {
        // 如果点击的是卡牌，不在这里处理（让卡牌的 onclick 处理）
        if (e.target.closest('.card')) return;
        
        const rect = document.getElementById('canvas').getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        // 记录点击前的 selection 状态
        const hadSelection = !!selection;
        const selectedCards = selection ? selection.cards : null;
        const selectedFrom = selection ? selection.from : null;
        
        // 清除旧的 selection
        if (selection) {
            clearSelection();
        }
        
        // 检查是否点击了收牌区空槽位
        if (hadSelection && selectedCards && selectedCards.length === 1) {
            for (let i = 0; i < 4; i++) {
                const p = layout.foundPos[i];
                if (mx >= p.x && mx <= p.x + layout.cardW && my >= p.y && my <= p.y + layout.cardH) {
                    if (game.found[i] === 0) {
                        attemptMove(selectedCards, selectedFrom, {type:'found', idx:i});
                        return;
                    }
                }
            }
        }
        
        // 检查是否点击了发牌堆空槽位（重置）
        if (mx >= layout.stockPos.x && mx <= layout.stockPos.x + layout.cardW && 
            my >= layout.stockPos.y && my <= layout.stockPos.y + layout.cardH) {
            if (game.stock.length === 0) {
                return; // 忽略发牌堆重置点击
            }
        }
        
        // 检查是否点击了空列
        if (my > layout.tableauY - 20 && hadSelection && selectedCards) {
            for(let i=0; i<7; i++) {
                const x = layout.colsXPos[i];
                if (mx >= x && mx <= x+layout.cardW && game.cols[i].length === 0) {
                    attemptMove(selectedCards, selectedFrom, {type:'cols', idx:i});
                    return;
                }
            }
        }
    };

    function attemptMove(cards, from, to, animate = true) {
        let valid = false;
        let msg = null;
        
        if (to.type === 'found') {
            if (cards.length > 1) msg = 'foundSingleOnly'; // 隐式规则
            else {
                let c = cards[0];
                let sIdx = SUITS.indexOf(c.suit);
                if (to.idx !== sIdx) msg = 'foundSuitMismatch';
                else if (c.rank !== game.found[sIdx] + 1) msg = 'foundRankMismatch';
                else valid = true;
            }
        } else if (to.type === 'cols') {
            const col = game.cols[to.idx];
            if (col.length === 0) {
                if (cards[0].rank === 13) valid = true;
                else msg = 'kingOnly';
            } else {
                const top = col[col.length-1];
                if (top.isRed !== cards[0].isRed && top.rank === cards[0].rank + 1) valid = true;
                else msg = 'colorRankMismatch';
            }
        }

        if (valid) {
            game.move(cards, from, to, animate);
        } else if (msg) {
            showInvalidMoveTip(msg);
            renderContent();
        } else {
            renderContent();
        }
    }

    function quickMove(card, pos) {
        // 无论从哪个区域触发，第一步必须清除"手动选中"状态
        // 这样可以切断 单击(handleClick) 与 双击(quickMove) 之间的状态耦合
        clearSelection();

        // 尝试自动移动到回收区
        let sIdx = SUITS.indexOf(card.suit);
        if (card.rank === game.found[sIdx] + 1) {
            let isTop = false;
            // 修复：确保只移动收牌区最顶上的一张牌
            if (pos.type === 'waste' && game.waste.length > 0 && card.id === game.waste[game.waste.length - 1].id) {
                isTop = true;
            }
            if (pos.type === 'cols' && pos.cardIdx === game.cols[pos.idx].length - 1) isTop = true;
            
            if (isTop) {
                attemptMove([card], pos, {type:'found', idx:sIdx});
            }
        }
    }

    // --- Helpers ---
    function updateStatusBar() {
        document.getElementById('score-info').textContent = `${t('status.score')}: ${game.score}`;
        const timeEl = document.getElementById('time-info');
        timeEl.style.display = '';
        const minutes = Math.floor(game.time / 60);
        const seconds = game.time % 60;
        timeEl.textContent = `${t('status.time')}: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('undo-btn').disabled = game.history.length === 0 || game.isWon;
        document.getElementById('hint-btn').disabled = game.isWon;
    }

    /**
     * showInvalidMoveTip - 显示无效操作提示。
     * @param {string} messageKey - 多语言 key
     * 支持自动消失和多次触发。
     */
    function showInvalidMoveTip(messageKey) {
        soundManager.play('illegalmove');
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
            setTimeout(() => { if (invalidTipElement) { invalidTipElement.remove(); invalidTipElement = null; } }, 200);
        }
        if (invalidTipTimeout) { clearTimeout(invalidTipTimeout); invalidTipTimeout = null; }
    }
    
    function clearSelection() {
        if (selection) {
            document.querySelectorAll('.selected').forEach(e=>e.classList.remove('selected'));
            selection = null;
        }
    }
    
    function clearHint() {
        document.querySelectorAll('.hint-glow').forEach(e=>e.classList.remove('hint-glow'));
        document.querySelectorAll('.col-hint-box').forEach(e=>e.remove());
        currentHints = [];
        currentHintIndex = 0;
    }

    // --- Dialogs ---
    function showMessageBox(opts) {
        const ov = document.getElementById('msgbox-overlay');
        ov.style.display = 'block';
        const msgBoxWindow = ov.querySelector('.msgbox-window');
        // 确保为标准对话框重置样式
        msgBoxWindow.classList.remove('compact-mode');
        
        const titleEl = document.querySelector('#msgbox-overlay .title-bar .title span');
        if (titleEl) titleEl.textContent = opts.title || t('title');

        const iconEl = document.getElementById('msgbox-icon');
        const hasNoIcon = opts.icon === false;
        msgBoxWindow.classList.toggle('no-icon', hasNoIcon);
        iconEl.style.display = hasNoIcon ? 'none' : 'block';

        const textEl = document.getElementById('msgbox-text');
        textEl.innerHTML = opts.message;
        
        if (opts.checkbox && opts.checkbox.text) {
            textEl.innerHTML += `<div style="margin-top: 10px;"><label style="cursor: pointer; display: flex; align-items: center;"><input type="checkbox" id="msgbox-checkbox" style="margin: 0 6px 0 0;"><span>${opts.checkbox.text}</span></label></div>`;
        }

        const btns = document.getElementById('msgbox-buttons');
        btns.innerHTML = '';

        const getResult = (val) => {
            const cb = document.getElementById('msgbox-checkbox');
            return { confirmed: val, checkboxChecked: cb ? cb.checked : false };
        };

        if (opts.buttons === 'yes-no') {
            const y = document.createElement('button'); y.className='msgbox-btn'; y.textContent=t('yes');
            y.onclick=()=>{ov.style.display='none'; if(opts.callback) opts.callback(getResult(true));};
            const n = document.createElement('button'); n.className='msgbox-btn'; n.textContent=t('no');
            n.onclick=()=>{ov.style.display='none'; if(opts.callback) opts.callback(getResult(false));};
            btns.append(y, n);
        } else if (opts.buttons === 'ok-cancel') {
            const ok = document.createElement('button'); ok.className='msgbox-btn'; ok.textContent=t('ok');
            ok.onclick=()=>{ov.style.display='none'; if(opts.callback) opts.callback(getResult(true));};
            const cancel = document.createElement('button'); cancel.className='msgbox-btn'; cancel.textContent=t('cancel');
            cancel.onclick=()=>{ov.style.display='none'; if(opts.callback) opts.callback(getResult(false));};
            btns.append(ok, cancel);
        } else {
            const o = document.createElement('button'); o.className='msgbox-btn'; o.textContent=t('ok');
            o.onclick=()=>{ov.style.display='none'; if(opts.callback) opts.callback(getResult(true));};
            btns.append(o);
        }
        document.getElementById('msgbox-close').onclick=()=>{ov.style.display='none'; if(opts.callback) opts.callback(getResult(false));};
    }

    // 移植自 xjswpr.html 的更健壮的计时器保存策略
    function saveGameOnExit() {
        // 仅在游戏进行中且未结束时保存
        if (game.gameOver || game.isWon || !game.hasMoved) return;
        saveGameState();
    }
    // 页面关闭/隐藏时保存一次，以捕获最新的计时器时间
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveGameOnExit();
        }
    });
    window.addEventListener('beforeunload', saveGameOnExit);

    function newRandomGame(force) {
        const _start = () => startNewGame(Math.floor(Math.random() * 1000000) + 1);
        if (!force && game.hasMoved && !game.isWon) {
            showMessageBox({
                title: t('newGameTitle'),
                message: t('confirmNewGameMessage'), 
                buttons: 'yes-no',
                checkbox: { text: t('replayCurrentGame') },
                callback: (r)=>{ 
                    if(r.confirmed) {
                        if (r.checkboxChecked) startNewGame(game.seed);
                        else _start();
                    }
                }
            });
        } else {
            _start();
        }
    }

    // --- 发牌动画逻辑 ---
    let isAnimating = false;

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

        // 收集所有已渲染的卡牌元素
        const dealingOrder = [];
        const allCards = document.querySelectorAll('.card');
        
        allCards.forEach(el => {
            dealingOrder.push({ 
                el, 
                targetLeft: el.style.left, 
                targetTop: el.style.top 
            });
        });

        // 禁用交互
        document.body.style.pointerEvents = 'none';

        // 1. 初始化位置：全部移到发牌点
        dealingOrder.forEach(({ el }, i) => {
            el.style.transition = 'none';
            el.style.left = `${startX}px`;
            el.style.top = `${startY}px`;
            el.style.zIndex = 100 + i;
        });

        // 强制浏览器重排
        canvas.offsetHeight;

        // 2. 执行动画
        const delay = 30;
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
        
        // 停止发牌音效
        if (dealSound) {
            dealSound.pause();
            dealSound.currentTime = 0;
        }
        
        // 恢复交互
        isAnimating = false;
        document.body.style.pointerEvents = '';
    }

    function startNewGame(seed) {
        checkAbandonment();
        game.reset(seed);
        startGameTimer();
        saveGameState();
        updateAndRender();
        // 执行发牌动画
        animateDeal();
    }

    function saveGameState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            seed: game.seed,
            stock: game.stock,
            waste: game.waste,
            found: game.found,
            cols: game.cols,
            history: game.history,
            score: game.score,
            time: game.time,
            isWon: game.isWon,
            hasMoved: game.hasMoved,
            stockPassCount: game.stockPassCount
        }));
    }

    function loadGame() {
        updateUIText();
        const s = localStorage.getItem(STORAGE_KEY);
        if (s) {
            try {
                const st = JSON.parse(s);
                if (!st.isWon) {
                    Object.assign(game, st);
                    game.stockPassCount = st.stockPassCount || 0; // 兼容旧存档
                    startGameTimer();
                    updateAndRender();
                    return;
                }
            } catch(e){}
        }
        newRandomGame(true);
    }

    function updateAndRender() {
        calculateLayout();
        renderContent();
    }

    function showAbout() {
        const about = t('about');
        const emailLink = `<a href="mailto:${about.email}?subject=[xjsoli]: Inquiry" target="_blank" style="color: #0000EE;">${about.email}</a>`;
        const message = `${about.header}\n\n${about.version}\n${emailLink}`;
        showMessageBox({ title: about.title, message: message.replace(/\n/g, '<br>'), buttons: 'ok' });
    }

    // 全局交互监听：任何非"提示"按钮的操作都清除提示，同时处理无效移动提示的关闭
    function handleGlobalInteraction(e) {
        const targetId = e.target.id;
        const targetClosest = e.target.closest ? e.target.closest('#hint-btn') : null;
        
        if (invalidTipElement && !invalidTipLock && !(e.target instanceof Element && e.target.closest('.invalid-move-tip'))) {
            if (e.type === 'mousedown' && e.button === 2) {
            } else {
                hideInvalidMoveTip();
            }
        }
        if (currentHints.length === 0) return;
        
        // 检查是否点击了提示按钮、撤销按钮
        const isHintBtn = targetId === 'hint-btn' || targetClosest;
        const isUndoBtn = targetId === 'undo-btn' || e.target.closest('#undo-btn');
        
        if (isHintBtn || isUndoBtn) {
            return;
        }
        clearHint();
    }
    window.addEventListener('mousedown', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction, { passive: true });

    // --- Events ---
    // 禁用系统右键菜单
    window.oncontextmenu = (e) => e.preventDefault();
    
    const handleResize = () => {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(updateAndRender, 300);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // 解决iOS下 :active 伪类无效的问题
    document.body.addEventListener('touchstart', () => {}, { passive: true });

    document.getElementById('new-game-btn').onclick = () => { clearHint(); newRandomGame(); };
    document.getElementById('undo-btn').onclick = () => { clearHint(); game.undo(); };
    document.getElementById('aboutLink').onclick = (e) => { e.preventDefault(); clearHint(); showAbout(); };
    document.getElementById('langToggle').onclick = () => {
        clearHint();
        setLanguage(currentLang === 'zh' ? 'en' : 'zh');
    };
    // 音效开关按钮
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.textContent = soundManager.enabled ? '🔊' : '🔇';
        soundToggle.onclick = () => {
            const enabled = soundManager.toggle();
            soundToggle.textContent = enabled ? '🔊' : '🔇';
        };
    }
    document.getElementById('hint-btn').onclick = () => {
        // 如果当前已经有提示，不要清除，让用户可以循环查看
        // 只有手动点击提示按钮后才生成新提示
        if (currentHints.length === 0) {
            currentHints = game.getHints();
        }
        if (currentHints.length > 0) {
            soundManager.play('hintshown');
            // 只清除视觉高亮，不清空提示数据（用于循环提示）
            document.querySelectorAll('.hint-glow').forEach(e=>e.classList.remove('hint-glow'));
            document.querySelectorAll('.col-hint-box').forEach(e=>e.remove());
            
            const h = currentHints[currentHintIndex];
            currentHintIndex = (currentHintIndex + 1) % currentHints.length;

            // 处理发牌区提示
            if (h.src.type === 'stock') {
                // 高亮发牌堆槽位（用于发牌或重置）
                // 如果发牌堆为空，始终高亮空槽位
                if (game.stock.length === 0) {
                    let el = document.querySelector('#stock-waste-group .slot');
                    if (el) el.classList.add('hint-glow');
                } else {
                    // 发牌堆有牌，高亮牌背
                    let el = document.querySelector('.card.back');
                    if (el) el.classList.add('hint-glow');
                }
                return;
            }

            if (h.src.type === 'cols') {
                 // 高亮从 cardIdx 开始的所有牌（可移动的整列）
                 let col = game.cols[h.src.idx];
                 if (col && h.src.cardIdx !== undefined) {
                     for (let i = h.src.cardIdx; i < col.length; i++) {
                         let el = document.querySelector(`.card[data-id="${col[i].id}"]`);
                         if (el) el.classList.add('hint-glow');
                     }
                 }
            } else if (h.src.type === 'waste') {
                 if (game.waste.length > 0) {
                     let c = game.waste[game.waste.length-1];
                     let el = document.querySelector(`.card[data-id="${c.id}"]`);
                     if(el) el.classList.add('hint-glow');
                 }
            } else if (h.src.type === 'found') {
                 // 收牌区提示 - 高亮该槽位
                 const foundGroup = document.getElementById('found-group');
                 if (foundGroup && foundGroup.children[h.src.idx]) {
                     foundGroup.children[h.src.idx].classList.add('hint-glow');
                 }
            }
            
            if (h.dest && h.dest.type === 'cols') {
                if (game.cols[h.dest.idx].length>0) {
                    let top = game.cols[h.dest.idx][game.cols[h.dest.idx].length-1];
                    let el = document.querySelector(`.card[data-id="${top.id}"]`);
                    if(el) el.classList.add('hint-glow');
                } else {
                    // 空列提示
                    const x = layout.colsXPos[h.dest.idx];
                    const y = layout.tableauY;
                    const hintBox = document.createElement('div');
                    hintBox.className = 'col-hint-box';
                    hintBox.style.left = x + 'px';
                    hintBox.style.top = y + 'px';
                    hintBox.style.width = layout.cardW + 'px';
                    hintBox.style.height = layout.cardH + 'px';
                    document.getElementById('canvas').appendChild(hintBox);
                }
            } else if (h.dest && h.dest.type === 'found') {
                const foundGroup = document.getElementById('found-group');
                if (foundGroup && foundGroup.children[h.dest.idx]) {
                    foundGroup.children[h.dest.idx].classList.add('hint-glow');
                }
            }
        } else {
            soundManager.play('hintnomove');
        }
    };

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
            <div style="grid-column: span 2; height: 1px; background: #ccc; margin: 8px 0;"></div>
            <div style="font-size: 14px; text-align: left; font-weight: bold; margin-bottom: 4px;">${t('stats.highScores')}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; text-align: left; font-size: 14px;">
                ${gameStats.highScores.map(hs => `<div>${hs.score}</div><div style="text-align:right;">${hs.date}</div>`).join('')}
                ${Array(Math.max(0, 3 - gameStats.highScores.length)).fill('<div>-</div><div style="text-align:right;">-</div>').join('')}
            </div>
        `;

        const overlay = document.getElementById('msgbox-overlay');
        const titleEl = document.querySelector('#msgbox-overlay .title-bar .title span');
        const textEl = document.getElementById('msgbox-text');
        const btnsEl = document.getElementById('msgbox-buttons');
        const iconEl = document.getElementById('msgbox-icon');
        const closeBtn = document.getElementById('msgbox-close');

        document.querySelector('.msgbox-window').classList.add('compact-mode');

        titleEl.textContent = t('stats.title');
        textEl.innerHTML = msg;
        iconEl.style.display = 'none';

        btnsEl.innerHTML = `<button class="msgbox-btn">${t('close')}</button><button class="msgbox-btn">${t('stats.reset')}</button>`;
        btnsEl.children[0].onclick = () => { overlay.style.display = 'none'; };
        btnsEl.children[1].onclick = () => { if (confirm(t('stats.confirmReset'))) { gameStats = { played: 0, won: 0, winStreak: 0, maxWinStreak: 0, maxLoseStreak: 0, highScores: [] }; saveStats(); showStats(); } };
        closeBtn.onclick = () => { overlay.style.display = 'none'; };
        overlay.style.display = 'block';
    }
    document.getElementById('stats-btn').onclick = () => { clearHint(); showStats(); };
    
    // Options
    document.getElementById('options-btn').onclick = () => {
        clearHint();
        const message = `
            <fieldset style="border: 1px solid #808080; padding: 6px 10px; margin: 0; font-size: 14px;">
                <legend style="margin-left: 4px; padding: 0 2px;">${t('options.deal')}</legend>
                <label style="display: block; cursor:pointer; margin-bottom: 4px;"><input type="radio" name="draw-count" value="1" ${gameSettings.drawCount === 1 ? 'checked' : ''}> ${t('options.draw1')}</label>
                <label style="display: block; cursor:pointer;"><input type="radio" name="draw-count" value="3" ${gameSettings.drawCount === 3 ? 'checked' : ''}> ${t('options.draw3')}</label>
            </fieldset>
        `;

        showMessageBox({
            title: t('options.title'),
            message: message,
            icon: false,
            buttons: 'ok-cancel',
            callback: (result) => {
                if (result.confirmed) {
                    const newDrawCount = parseInt(document.querySelector('input[name="draw-count"]:checked').value);

                    const drawChanged = newDrawCount !== gameSettings.drawCount;

                    if (drawChanged && game.hasMoved && !game.isWon) {
                        showMessageBox({
                            message: t('options.newGameConfirm'), buttons: 'yes-no',
                            callback: (r) => { if (r.confirmed) { gameSettings.drawCount = newDrawCount; saveSettings(); newRandomGame(true); } }
                        });
                    } else if (drawChanged) {
                        gameSettings.drawCount = newDrawCount;
                        saveSettings();
                        startGameTimer();
                        updateStatusBar();
                    }
                }
            }
        });

        // 为选项对话框应用紧凑样式
        document.querySelector('#msgbox-overlay .msgbox-window').classList.add('compact-mode');
    };
    
    // 胜利处理
    function handleGameWin() {
        // 胜利奖分：700,000 / 总耗时(秒)
        if (game.time > 0) {
            const timeBonus = Math.floor(700000 / game.time);
            game.score += timeBonus;
            updateStatusBar(); // 更新状态栏显示奖励得分
        }
        
        // 检查是否是新最高分
        const isNewHighScore = gameStats.highScores.length === 0 || game.score > gameStats.highScores[0].score;
        
        updateStatsOnWin();
        stopGameTimer();
        
        // 播放胜利音效
        const winSound = soundManager.sounds.win;
        if (soundManager.enabled && winSound) {
            winSound.currentTime = 0;
            winSound.play().catch(e => {});
        }
        
        // 格式化用时
        const formatTime = (seconds) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        
        // 构建胜利消息
        let message = t('winMessage') + '\n\n';
        message += `${t('winTime')}： ${formatTime(game.time)}\n`;
        message += `${t('winScore')}： ${game.score}`;
        if (isNewHighScore) {
            message += `  (${t('winNewHighScore')})`;
        }
        message += '\n\n' + t('winPlayAgain');
        
        // 隐藏所有卡牌，让胜利动画的卡牌坠落后位置是空的
        document.querySelectorAll('.card').forEach(c => c.style.display = 'none');
        
        const stopAnim = victoryAnimation();
        showMessageBox({
            title: t('winTitle'),
            message: message, buttons: 'yes-no',
            callback: (r) => { 
                // 停止胜利音效
                if (winSound) {
                    winSound.pause();
                    winSound.currentTime = 0;
                }
                stopAnim(); // 无论用户选择什么，都停止动画
                if(r.confirmed) newRandomGame(true); 
            }
        });
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
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(c.x, c.y, layout.cardW, layout.cardH, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = c.isRed ? '#ff0000' : '#000000';
            
            // 计算字体大小，保持与 createCardEl 逻辑一致
            let fontSize = Math.max(10, Math.floor(layout.stackYOffsetUp * 0.90));
            const paddingX = (window.innerWidth <= 600 || window.innerHeight <= 500) ? 4 : 8;
            if (fontSize * 2.2 > layout.cardW - paddingX) {
                fontSize = Math.floor((layout.cardW - paddingX) / 2.2);
            }

            // 左上角点数
            ctx.font = `bold ${fontSize}px "XJCard", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(c.rank, c.x + 4, c.y + 2);

            // 右上角小花色
            ctx.font = `${fontSize * 0.9}px "XJCard", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText(c.suit, c.x + layout.cardW - 4, c.y + 4);

            // 底部大花色或SVG图案
            const isFace = ['J', 'Q', 'K'].includes(c.rank);
            const f = isFace ? getFaceImageKey({ rank: c.rank === 'A' ? 1 : c.rank === 'J' ? 11 : c.rank === 'Q' ? 12 : c.rank === 'K' ? 13 : c.rank, suit: c.suit === '♥' ? 'hearts' : c.suit === '♦' ? 'diamonds' : c.suit === '♣' ? 'clubs' : 'spades' }) : null;
            if (isFace && faceImages[f] && faceImages[f].complete && faceImages[f].naturalWidth > 0) {
                const img = faceImages[f];
                const iH = layout.cardW * (img.naturalHeight / img.naturalWidth);
                ctx.drawImage(img, c.x, c.y + layout.cardH - iH, layout.cardW, iH);
            } else {
                const bigSuitSize = Math.max(20, Math.floor(layout.cardW * 0.9));
                ctx.font = `${bigSuitSize}px "XJCard", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif`;
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

            // 随机激活卡牌下落
            if (currentCardIndex < cards.length && Math.random() > 0.8) {
                cards[currentCardIndex].active = true;
                currentCardIndex++;
            }

            ctx.clearRect(0, 0, vCanvas.width, vCanvas.height);
            const floorY = vCanvas.height
            
            // 绘制静止在收牌区的牌 (从底层的A绘制到顶层的K，确保遮挡关系正确)
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

    function stopGameTimer() {
        if (gameTimer) clearInterval(gameTimer);
        gameTimer = null;
    }

    function startGameTimer() {
        stopGameTimer();
        // 计时惩罚：游戏开始10秒后，每10秒扣2分
        gameTimer = setInterval(() => {
            if (!game.isWon && game.hasMoved) {
                game.time++;
                // 计时惩罚：10秒后起算，每10秒扣2分
                if (game.time > 10 && game.time % 10 === 0) {
                    game.score = Math.max(0, game.score - 2);
                }
                updateStatusBar();
            }
        }, 1000);
    }

    // 初始化
    loadStats();
    loadGame();

})();
