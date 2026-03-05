import './style.css'
import packageJson from '../package.json'

// 语言配置
const LANG = {
    zh: {
        title: "扫雷 - 经典版",
        msgboxTitle: "扫雷",
        difficulties: {
            beginner: "初级",
            intermediate: "中级",
            expert: "高级"
        },
        status: {
            ready: "就绪",
            playing: "进行中",
            gameOver: "游戏结束",
            win: "你胜利了！",
            newRecord: "新纪录！"
        },
        messages: {
            confirmRestart: "要重新开始当前难度的游戏吗？",
            confirmChangeDifficulty: "要切换到 {level} 难度并开始新游戏吗？",
            win: "恭喜胜利！用时 {time} 秒",
            newRecord: "新纪录！用时 {time} 秒",
            lose: "砰！你踩雷了！",
            bestTimes: "最佳纪录:\n- 初级: {beginner}\n- 中级: {intermediate}\n- 高级: {expert}"
        },
        labels: {
            bestTime: "最佳",
            copyright: "XHBL © 2026"
        },
        about: {
            title: "关于",
            header: "一款基于JavaScript的经典扫雷游戏",
            version: `v${packageJson.version} by XHBL`,
            email: "newxhbl@hotmail.com"
        }
    },
    en: {
        title: "Minesweeper - Classic Version",
        msgboxTitle: "Minesweeper",
        difficulties: {
            beginner: "Beginner",
            intermediate: "Intermediate",
            expert: "Expert"
        },
        status: {
            ready: "Ready",
            playing: "Playing",
            gameOver: "Game Over",
            win: "You Win!",
            newRecord: "New Record!"
        },
        messages: {
            confirmRestart: "Restart the game with current difficulty?",
            confirmChangeDifficulty: "Switch to {level} difficulty and start a new game?",
            win: "Congratulations! Time: {time} seconds",
            newRecord: "New Record! Time: {time} seconds",
            lose: "BOOM! You hit a mine!",
            bestTimes: "Best Records:\n- Beginner: {beginner}\n- Intermediate: {intermediate}\n- Expert: {expert}"
        },
        labels: {
            bestTime: "Best",
            copyright: "XHBL © 2026"
        },
        about: {
            title: "About",
            header: "A JavaScript-based classic Minesweeper game",
            version: `v${packageJson.version} by XHBL`,
            email: "newxhbl@hotmail.com"
        }
    }
};

// 常量定义
const CONSTANTS = {
    BEST_TIMES_KEY: 'xjswpr_best_times',
    LAST_DIFFICULTY_KEY: 'xjswpr_last_difficulty',
    LANG_KEY: 'xjswpr_language',
    LONG_PRESS_MS: 350, // 稍微延长一点，避免由于惯性滚动导致的误判
    DOUBLE_CLICK_MS: 300,
    TOUCH_MOVE_TOLERANCE: 10
};

// 经典难度配置 [行, 列, 雷数]
const DIFFICULTY = {
    beginner: { rows: 9, cols: 9, mines: 10 },
    intermediate: { rows: 16, cols: 16, mines: 40 },
    expert: { rows: 16, cols: 30, mines: 99 }
};

// 游戏核心状态
let gameState = {
    config: { ...DIFFICULTY.beginner },
    board: [],
    gameOver: false,
    gameWin: false,
    gameStarted: false,
    minesRemaining: DIFFICULTY.beginner.mines,
    timer: 0,
    timerInterval: null,
    firstClick: true,
    minesPlaced: false
};

// 输入交互状态
let inputState = {
    leftMouseDown: false,
    rightMouseDown: false,
    chordPreviewCell: null, // {row, col}
    longPressTimer: null,
    isLongPress: false,
    touchStartCell: null, // {row, col}
    touchStartX: 0,
    touchStartY: 0,
    lastClickTime: 0,
    lastClickCell: null, // {row, col}
    lastTouchEndTime: 0
};

let bestTimes = { beginner: null, intermediate: null, expert: null };
let currentDifficulty = 'beginner';

// DOM 元素缓存
const DOM = {
    board: document.getElementById('board'),
    mineCounter: document.getElementById('mineCounter'),
    timerCounter: document.getElementById('timerCounter'),
    faceButton: document.getElementById('faceButton'),
    gameStatus: document.getElementById('gameStatus'),
    diffBtns: document.querySelectorAll('.diff-btn'),
    bestTimeDisplay: document.getElementById('bestTimeDisplay'),
    langToggle: document.getElementById('langToggle'),
    aboutLink: document.getElementById('aboutLink'),
    msgbox: {
        overlay: document.getElementById('msgbox-overlay'),
        icon: document.getElementById('msgbox-icon'),
        text: document.getElementById('msgbox-text'),
        buttons: document.getElementById('msgbox-buttons'),
        closeBtn: document.getElementById('msgbox-close'),
        title: document.querySelector('#msgbox-overlay .title-bar .title span')
    }
};

// 检测浏览器语言，有中文匹配则默认使用中文，否则使用英文
function detectBrowserLanguage() {
    const storedLang = localStorage.getItem(CONSTANTS.LANG_KEY);
    if (storedLang) return storedLang;
    
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.includes('zh') ? 'zh' : 'en';
}

let currentLang = detectBrowserLanguage();

// 获取翻译文本
function t(key, params = {}) {
    // 支持点分隔的路径
    let text = key.split('.').reduce((obj, k) => obj && obj[k], LANG[currentLang]);
    
    // 如果text是undefined，返回默认值
    if (text === undefined) {
        console.warn(`Translation not found for key: ${key}`);
        return key;
    }
    
    // 如果text是对象且params.key存在，返回text[params.key]
    if (typeof text === 'object' && params.key !== undefined) {
        return text[params.key] || key;
    }
    
    // 替换参数（仅当text是字符串时）
    if (typeof text === 'string') {
        for (const [param, value] of Object.entries(params)) {
            text = text.replace(`{${param}}`, value);
        }
    }
    
    return text;
}

// 切换语言
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(CONSTANTS.LANG_KEY, lang);
    
    // 更新manifest链接
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
        existingManifest.href = `./manifest.${lang}.webmanifest`;
    }
    
    updateUI();
}

// 显示关于信息
function showAbout() {
    const about = t('about');
    const emailLink = `<a href="mailto:${about.email}?subject=[xjswpr]: Inquiry">${about.email}</a>`;
    const message = `${about.header}\n\n${about.version} <${emailLink}>`;
    
    showMessageBox({
        title: about.title,
        message: message,
        type: 'info',
        buttons: 'ok'
    });
}

// 更新UI文本
function updateUI() {
    // 更新标题
    document.title = t('title');
    
    // 更新难度按钮
    DOM.diffBtns.forEach(btn => {
        const diff = btn.dataset.diff;
        btn.textContent = t('difficulties', { key: diff });
    });
    
    // 更新游戏状态
    updateGameStatus();
    
    // 更新最佳时间显示
    updateBestTimeDisplay();
    
    // 更新语言切换按钮文本
    DOM.langToggle.textContent = currentLang === 'zh' ? '中' : 'EN';
}

// 更新游戏状态文本
function updateGameStatus() {
    if (gameState.gameWin) {
        DOM.gameStatus.textContent = t('status.newRecord');
    } else if (gameState.gameOver) {
        DOM.gameStatus.textContent = t('status.gameOver');
    } else if (gameState.gameStarted) {
        DOM.gameStatus.textContent = t('status.playing');
    } else {
        DOM.gameStatus.textContent = t('status.ready');
    }
}

// --- 自定义 MsgBox 函数 ---
function showMessageBox(options) {
    const { title = t('msgboxTitle'), message, type = 'info', buttons = 'ok', callback } = options;
    const { overlay, icon, text, buttons: btnsEl, closeBtn, title: titleEl } = DOM.msgbox;

    // 更新标题
    if (titleEl) {
        titleEl.textContent = title;
    }
    
    // 支持HTML内容
    text.innerHTML = message;
    
    // 设置图标
    let iconChar = '';
    if (type === 'question') iconChar = '❓';
    else if (type === 'error') iconChar = '❌';
    else if (type === 'win') iconChar = '🚩';
    else iconChar = 'ℹ️';
    icon.textContent = iconChar;

    // 生成按钮
    btnsEl.innerHTML = '';
    const createBtn = (text, val) => {
        const btn = document.createElement('button');
        btn.className = 'msgbox-btn';
        btn.textContent = text;
        btn.onclick = () => {
            overlay.style.display = 'none';
            if (callback) callback(val);
        };
        return btn;
    };

    if (buttons === 'yes-no') {
        btnsEl.appendChild(createBtn(currentLang === 'zh' ? '是' : 'Yes', true));
        btnsEl.appendChild(createBtn(currentLang === 'zh' ? '否' : 'No', false));
    } else {
        btnsEl.appendChild(createBtn(currentLang === 'zh' ? '确定' : 'OK', true));
    }

    // 关闭按钮 (X)
    closeBtn.onclick = () => {
        overlay.style.display = 'none';
        if (callback) callback(false);
    };

    overlay.style.display = 'block';
}

// 初始化游戏
function initGame() {
    stopTimer();
    
    // 重置游戏状态
    Object.assign(gameState, {
        board: [],
        gameOver: false,
        gameWin: false,
        gameStarted: false,
        minesRemaining: gameState.config.mines,
        timer: 0,
        firstClick: true,
        minesPlaced: false
    });

    createEmptyBoard();
    renderBoard();
    updateMineCounter();
    DOM.timerCounter.textContent = '000';
    DOM.faceButton.textContent = '😊';
    updateGameStatus();
}

// 创建空棋盘
function createEmptyBoard() {
    gameState.board = Array(gameState.config.rows).fill().map(() => 
        Array(gameState.config.cols).fill().map(() => ({
            mine: false,
            revealed: false,
            flagged: false,
            neighborMines: 0,
            exploded: false // 是否被踩爆（用于显示）
        }))
    );
}

// 随机布雷（确保首次点击安全）
function placeMines(firstRow, firstCol) {
    let minesPlaced = 0;
    const totalMines = gameState.config.mines;
    const maxAttempts = 1000;
    let attempts = 0;
    
    while (minesPlaced < totalMines && attempts < maxAttempts) {
        const row = Math.floor(Math.random() * gameState.config.rows);
        const col = Math.floor(Math.random() * gameState.config.cols);
        
        // 首次点击位置及其周围不能有雷
        const isNearFirst = Math.abs(row - firstRow) <= 1 && Math.abs(col - firstCol) <= 1;
        
        if (!gameState.board[row][col].mine && !isNearFirst) {
            gameState.board[row][col].mine = true;
            minesPlaced++;
        }
        attempts++;
    }
    
    // 如果放不满（理论上不会发生），在剩余格子补充
    if (minesPlaced < totalMines) {
        for (let r = 0; r < gameState.config.rows; r++) {
            for (let c = 0; c < gameState.config.cols; c++) {
                if (minesPlaced >= totalMines) break;
                if (!gameState.board[r][c].mine && (Math.abs(r - firstRow) > 1 || Math.abs(c - firstCol) > 1)) {
                    gameState.board[r][c].mine = true;
                    minesPlaced++;
                }
            }
        }
    }
    
    calculateNeighbors();
}

// 计算周围雷数
function calculateNeighbors() {
    for (let r = 0; r < gameState.config.rows; r++) {
        for (let c = 0; c < gameState.config.cols; c++) {
            if (gameState.board[r][c].mine) continue;
            
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < gameState.config.rows && nc >= 0 && nc < gameState.config.cols && gameState.board[nr][nc].mine) {
                        count++;
                    }
                }
            }
            gameState.board[r][c].neighborMines = count;
        }
    }
}

// --- 纪录功能 ---
function loadBestTimes() {
    const storedTimes = localStorage.getItem(CONSTANTS.BEST_TIMES_KEY);
    if (storedTimes) {
        // 合并，防止未来增加新难度时旧纪录出错
        bestTimes = { ...bestTimes, ...JSON.parse(storedTimes) };
    }
}

function saveBestTimes() {
    localStorage.setItem(CONSTANTS.BEST_TIMES_KEY, JSON.stringify(bestTimes));
}

function updateBestTimeDisplay() {
    const best = bestTimes[currentDifficulty];
    const bestTimeText = best !== null ? `${best.toString().padStart(3, '0')}` : (currentLang === 'zh' ? '无' : 'None');
    DOM.bestTimeDisplay.innerHTML = `<a href="#" id="bestTimeLink">${t('labels.bestTime')}</a>: ${bestTimeText}`;
    
    document.getElementById('bestTimeLink').addEventListener('click', e => {
        e.preventDefault();
        showAllBestTimes();
    });
}

function showAllBestTimes() {
    const timeUnit = currentLang === 'zh' ? ' 秒' : ' seconds';
    const noRecord = currentLang === 'zh' ? '无纪录' : 'No record';
    
    const beginnerTime = bestTimes.beginner !== null ? `${bestTimes.beginner}${timeUnit}` : noRecord;
    const intermediateTime = bestTimes.intermediate !== null ? `${bestTimes.intermediate}${timeUnit}` : noRecord;
    const expertTime = bestTimes.expert !== null ? `${bestTimes.expert}${timeUnit}` : noRecord;
    
    showMessageBox({
        message: t('messages.bestTimes', {
            beginner: beginnerTime,
            intermediate: intermediateTime,
            expert: expertTime
        })
    });
}
// -----------------

// 翻开单元格
function revealCell(row, col) {
    if (gameState.gameOver || gameState.gameWin) return;
    if (gameState.board[row][col].revealed) return;
    if (gameState.board[row][col].flagged) return; // 旗子标记的不能点开
    
    // 第一次交互：启动游戏
    if (gameState.firstClick) {
        startGame();
        gameState.firstClick = false;
        gameState.gameStarted = true;
    }
    
    // 如果是首次翻开格子，则布雷
    if (!gameState.minesPlaced) {
        placeMines(row, col);
        gameState.minesPlaced = true;
    }
    
    gameState.board[row][col].revealed = true;
    
    // 踩到雷
    if (gameState.board[row][col].mine) {
        gameState.board[row][col].exploded = true;
        handleLoss();
        renderBoard();
        return; // 提前返回
    }
    
    // 如果是空格，递归翻开周围
    if (gameState.board[row][col].neighborMines === 0) {
        revealEmptyCells(row, col);
    }
    
    // 检查胜利
    checkWin();
    renderBoard();
}

// 为组合点击优化的翻开逻辑（不触发渲染）
function revealCellForChord(row, col) {
    if (gameState.gameOver || gameState.gameWin) return;
    const cell = gameState.board[row][col];
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;

    // 踩到雷
    if (cell.mine) {
        cell.exploded = true;
        handleLoss();
        return;
    }

    // 如果是空格，递归翻开周围
    if (cell.neighborMines === 0) {
        // 注意：revealEmptyCells 也会修改 board 数据，但不会触发渲染
        // 这是我们期望的行为
        revealEmptyCells(row, col);
    }
}

// 空格扩散算法（深度优先）
function revealEmptyCells(row, col) {
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            
            if (nr >= 0 && nr < gameState.config.rows && nc >= 0 && nc < gameState.config.cols) {
                const cell = gameState.board[nr][nc];
                if (!cell.revealed && !cell.flagged && !cell.mine) {
                    cell.revealed = true;
                    if (cell.neighborMines === 0) {
                        revealEmptyCells(nr, nc);
                    }
                }
            }
        }
    }
}

// 标记/取消标记旗子
function toggleFlag(row, col) {
    if (gameState.gameOver || gameState.gameWin) return;
    if (gameState.board[row][col].revealed) return;
    
    // 首次点击时也可以标记（但不会布雷）
    if (gameState.firstClick) {
        startGame();
        gameState.firstClick = false;
        gameState.gameStarted = true;
        // 首次标记不布雷，等真正点开再说
    }
    
    gameState.board[row][col].flagged = !gameState.board[row][col].flagged;
    const isFlagged = gameState.board[row][col].flagged;

    // 优化：直接更新DOM而不是重绘整个棋盘，防止iOS下因元素销毁导致的事件穿透（Ghost Click）
    const cellEl = DOM.board.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cellEl) {
        cellEl.classList.toggle('flagged', isFlagged);
        cellEl.classList.remove('active-press'); // 状态改变后移除按下效果
        // 强制 iOS 重绘
        cellEl.style.zIndex = cellEl.style.zIndex === '1' ? '0' : '1';
    }
    
    // 更新剩余雷数
    if (isFlagged) {
        gameState.minesRemaining--;
    } else {
        gameState.minesRemaining++;
    }
    
    updateMineCounter();
    
    // 检查胜利（所有雷都被正确标记）
    checkWinByFlags();
    
    // 只有在胜利时才重绘（为了显示被自动挖开的剩余安全格子），平时只更新单个DOM以保持事件链完整
    if (gameState.gameWin) {
        renderBoard();
    }
}

// 通过旗子标记判断胜利
function checkWinByFlags() {
    if (gameState.gameOver) return;
    
    let allMinesFlagged = true;
    let correctFlags = 0;
    
    for (let r = 0; r < gameState.config.rows; r++) {
        for (let c = 0; c < gameState.config.cols; c++) {
            const cell = gameState.board[r][c];
            if (cell.mine && !cell.flagged) {
                allMinesFlagged = false;
            }
            if (cell.flagged && !cell.mine) {
                allMinesFlagged = false; // 错旗也不算赢
            }
            if (cell.mine && cell.flagged) correctFlags++;
        }
    }
    
    if (allMinesFlagged && correctFlags === gameState.config.mines) {
        // 挖开所有未挖开的非地雷格子
        for (let r = 0; r < gameState.config.rows; r++) {
            for (let c = 0; c < gameState.config.cols; c++) {
                const cell = gameState.board[r][c];
                if (!cell.mine && !cell.revealed) {
                    cell.revealed = true;
                    // 如果是空格，递归翻开周围
                    if (cell.neighborMines === 0) {
                        revealEmptyCells(r, c);
                    }
                }
            }
        }
        handleWin();
    }
}

// 检查胜利（全部非雷格子翻开）
function checkWin() {
    if (gameState.gameOver) return;
    
    let revealedCount = 0;
    let totalSafe = gameState.config.rows * gameState.config.cols - gameState.config.mines;
    
    for (let r = 0; r < gameState.config.rows; r++) {
        for (let c = 0; c < gameState.config.cols; c++) {
            if (gameState.board[r][c].revealed && !gameState.board[r][c].mine) {
                revealedCount++;
            }
        }
    }
    
    if (revealedCount === totalSafe) {
        // 挖开所有未挖开的非地雷格子（确保一致性）
        for (let r = 0; r < gameState.config.rows; r++) {
            for (let c = 0; c < gameState.config.cols; c++) {
                const cell = gameState.board[r][c];
                if (!cell.mine && !cell.revealed) {
                    cell.revealed = true;
                    // 如果是空格，递归翻开周围
                    if (cell.neighborMines === 0) {
                        revealEmptyCells(r, c);
                    }
                }
            }
        }
        handleWin();
    }
}

// 统一处理胜利逻辑
function handleWin() {
    if (gameState.gameWin) return; // 防止重复触发
    gameState.gameWin = true;
    gameState.gameOver = true;
    DOM.faceButton.textContent = '😎';
    stopTimer();
    
    revealAllMines();
    gameState.minesRemaining = 0;
    updateMineCounter();

    const oldBest = bestTimes[currentDifficulty];
    let alertMessage = '';

    if (oldBest === null || gameState.timer < oldBest) {
        bestTimes[currentDifficulty] = gameState.timer;
        saveBestTimes();
        updateBestTimeDisplay();
        DOM.gameStatus.textContent = t('status.newRecord');
        alertMessage = t('messages.newRecord', { time: gameState.timer });
    } else {
        DOM.gameStatus.textContent = t('status.win');
        alertMessage = t('messages.win', { time: gameState.timer });
    }
    setTimeout(() => showMessageBox({
        message: alertMessage,
        type: 'win',
        buttons: 'ok'
    }), 100);
}

// 统一处理失败逻辑
function handleLoss() {
    gameState.gameOver = true;
    DOM.faceButton.textContent = '😵';
    DOM.gameStatus.textContent = t('status.gameOver');
    stopTimer();
    revealAllMines();
    setTimeout(() => showMessageBox({
        message: t('messages.lose'),
        type: 'error',
        buttons: 'ok'
    }), 100);
}

// 游戏结束时显示所有地雷
function revealAllMines() {
    for (let r = 0; r < gameState.config.rows; r++) {
        for (let c = 0; c < gameState.config.cols; c++) {
            if (gameState.board[r][c].mine) {
                gameState.board[r][c].revealed = true;
            }
        }
    }
}

// 新增：获取邻居坐标
function getNeighbors(row, col) {
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < gameState.config.rows && nc >= 0 && nc < gameState.config.cols) {
                neighbors.push({ r: nr, c: nc });
            }
        }
    }
    return neighbors;
}

// 新增：组合点击（双击或左右键）的核心逻辑
function chord(row, col) {
    if (gameState.gameOver || gameState.gameWin) return;
    const cell = gameState.board[row][col];

    if (!cell.revealed || cell.neighborMines === 0) {
        return;
    }

    let flaggedNeighbors = 0;
    const neighborsToReveal = [];

    getNeighbors(row, col).forEach(({ r, c }) => {
        if (gameState.board[r][c].flagged) {
            flaggedNeighbors++;
        } else if (!gameState.board[r][c].revealed) {
            neighborsToReveal.push({ r, c });
        }
    });

    if (flaggedNeighbors === cell.neighborMines) {
        // 批量翻开格子
        // 使用不带渲染的优化版本
        neighborsToReveal.forEach(({ r, c }) => {
            if (!gameState.gameOver) { // 如果中途踩雷，停止翻开
                revealCellForChord(r, c);
            }
        });
        // 在所有逻辑操作完成后，进行一次检查和一次渲染
        checkWin();
        renderBoard();
    } else {
        // 如果旗子数量不匹配，则提供一个快速的视觉反馈
        showChordPreview(row, col, true);
        setTimeout(() => {
            showChordPreview(row, col, false);
        }, 100);
    }
}

// 新增：显示/隐藏组合点击的预览效果
function showChordPreview(row, col, show) {
    const cellData = gameState.board[row]?.[col];
    if (!cellData || !cellData.revealed) return;

    getNeighbors(row, col).forEach(({ r, c }) => {
        if (!gameState.board[r][c].revealed && !gameState.board[r][c].flagged) {
            const neighborEl = DOM.board.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (neighborEl) neighborEl.classList.toggle('pressed', show);
        }
    });
}

// 渲染棋盘
function renderBoard() {
    const MAX_CELL_SIZE = 36;
    const MIN_CELL_SIZE = 24;
    let cellSize = MAX_CELL_SIZE;

    // 动态计算单元格大小以适配窄屏（始终以初级难度9列为基准）
    // 使用 document.body.clientWidth 替代 container.clientWidth，避免初始加载时因容器收缩导致的计算错误
    const availableWidth = document.body.clientWidth - 24; // 减去边框和内边距的预估值
    const cols = DIFFICULTY.beginner.cols; // 始终使用初级难度的列数作为基准
    const calculatedSize = Math.floor(availableWidth / cols);
    cellSize = Math.max(MIN_CELL_SIZE, Math.min(calculatedSize, MAX_CELL_SIZE));

    DOM.board.style.gridTemplateColumns = `repeat(${gameState.config.cols}, ${cellSize}px)`;
    DOM.board.innerHTML = '';
    
    for (let r = 0; r < gameState.config.rows; r++) {
        for (let c = 0; c < gameState.config.cols; c++) {
            const cell = gameState.board[r][c];
            const cellDiv = document.createElement('div');
            cellDiv.className = 'cell';
            cellDiv.dataset.row = r;
            cellDiv.dataset.col = c;
            
            // 应用计算后的单元格尺寸
            cellDiv.style.width = `${cellSize}px`;
            cellDiv.style.height = `${cellSize}px`;
            
            if (cell.revealed) {
                cellDiv.classList.add('revealed');
                
                if (cell.mine) {
                    cellDiv.classList.add('mine');
                    if (cell.exploded) {
                        cellDiv.classList.add('red-cross');
                    }
                } else if (cell.neighborMines > 0) {
                    cellDiv.textContent = cell.neighborMines;
                    cellDiv.classList.add(`num${cell.neighborMines}`);
                }
            } else {
                if (cell.flagged) {
                    cellDiv.classList.add('flagged');
                }
            }
            
            DOM.board.appendChild(cellDiv);
        }
    }
}

// 更新雷数计数器
function updateMineCounter() {
    let count = Math.max(0, gameState.minesRemaining);
    DOM.mineCounter.textContent = count.toString().padStart(3, '0');
}

// 计时器
function startTimer() {
    if (gameState.timerInterval) stopTimer();
    gameState.timerInterval = setInterval(() => {
        gameState.timer++;
        if (gameState.timer > 999) gameState.timer = 999;
        DOM.timerCounter.textContent = gameState.timer.toString().padStart(3, '0');
    }, 1000);
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

// 开始游戏（首次点击时）
function startGame() {
    startTimer();
    DOM.gameStatus.textContent = t('status.playing');
}

// 切换难度
function setDifficulty(level) {
    currentDifficulty = level;
    localStorage.setItem(CONSTANTS.LAST_DIFFICULTY_KEY, level);
    gameState.config = { ...DIFFICULTY[level] };
    gameState.minesRemaining = gameState.config.mines;
    initGame();
    
    DOM.diffBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.diff === level) {
            btn.classList.add('active');
        }
    });
    updateBestTimeDisplay();
}

// 事件绑定
DOM.faceButton.addEventListener('click', () => {
    // 仅在游戏进行中（未结束）时提示
    if (gameState.gameStarted && !gameState.gameOver) {
        showMessageBox({
            message: t('messages.confirmRestart'),
            type: 'question',
            buttons: 'yes-no',
            callback: (result) => {
                if (result) initGame();
            }
        });
    } else {
        initGame();
    }
});

DOM.diffBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const level = e.target.dataset.diff;
        if (level === currentDifficulty) return; // 点击当前难度按钮无效
        
        const levelName = e.target.textContent;
        // 仅在游戏进行中（未结束）时提示
        if (gameState.gameStarted && !gameState.gameOver) {
            showMessageBox({
                message: t('messages.confirmChangeDifficulty', { level: levelName }),
                type: 'question',
                buttons: 'yes-no',
                callback: (result) => {
                    if (result) setDifficulty(level);
                }
            });
        } else {
            setDifficulty(level);
        }
    });
});

// --- 新增：使用事件委托处理棋盘点击 ---
// 禁用全局右键/长按菜单，防止在安卓等设备上弹出系统菜单
document.addEventListener('contextmenu', e => e.preventDefault());

DOM.board.addEventListener('mousedown', e => {
    if (Date.now() - inputState.lastTouchEndTime < 500) return;

    e.preventDefault();
    const cellEl = e.target.closest('.cell');
    if (!cellEl || gameState.gameOver || gameState.gameWin) return;

    const row = parseInt(cellEl.dataset.row);
    const col = parseInt(cellEl.dataset.col);

    if (e.button === 0) inputState.leftMouseDown = true;
    if (e.button === 2) inputState.rightMouseDown = true;

    // 左键按下：添加扁平效果
    if (e.button === 0 && !inputState.rightMouseDown) {
        const cell = gameState.board[row][col];
        if (!cell.revealed && !cell.flagged) {
            cellEl.classList.add('active-press');
        }
    }

    if (inputState.leftMouseDown && inputState.rightMouseDown) {
        showChordPreview(row, col, true);
        inputState.chordPreviewCell = { row, col };
    }
});

DOM.board.addEventListener('mouseup', e => {
    e.preventDefault();
    const wasChordAttempt = inputState.leftMouseDown && inputState.rightMouseDown;

    // 移除所有按下的视觉效果
    const pressedCells = DOM.board.querySelectorAll('.active-press');
    pressedCells.forEach(el => el.classList.remove('active-press'));

    if (inputState.chordPreviewCell) {
        showChordPreview(inputState.chordPreviewCell.row, inputState.chordPreviewCell.col, false);
        inputState.chordPreviewCell = null;
    }
    
    const currentLeftMouseUp = (e.button === 0);
    const currentRightMouseUp = (e.button === 2);
    const wasLeftDown = inputState.leftMouseDown;
    const wasRightDown = inputState.rightMouseDown;

    if (currentLeftMouseUp) inputState.leftMouseDown = false;
    if (currentRightMouseUp) inputState.rightMouseDown = false;

    const cellEl = e.target.closest('.cell');
    if (!cellEl || gameState.gameOver || gameState.gameWin) return;

    const row = parseInt(cellEl.dataset.row);
    const col = parseInt(cellEl.dataset.col);

    if (wasChordAttempt) {
        chord(row, col);
    } else if (currentLeftMouseUp && wasLeftDown) {
        const cell = gameState.board[row][col];
        if (!cell.revealed) {
            // 未翻开：立即翻开（无延迟）
            revealCell(row, col);
        } else {
            // 已翻开：检测双击
            const now = Date.now();
            if (inputState.lastClickCell && inputState.lastClickCell.row === row && inputState.lastClickCell.col === col && (now - inputState.lastClickTime < CONSTANTS.DOUBLE_CLICK_MS)) {
                chord(row, col);
                inputState.lastClickCell = null;
            } else {
                inputState.lastClickCell = { row, col };
                inputState.lastClickTime = now;
            }
        }
    } else if (currentRightMouseUp && wasRightDown) {
        toggleFlag(row, col);
    }
});

DOM.board.addEventListener('mouseover', e => {
    const cellEl = e.target.closest('.cell');
    if (inputState.leftMouseDown && inputState.rightMouseDown) {
        if (inputState.chordPreviewCell) {
            showChordPreview(inputState.chordPreviewCell.row, inputState.chordPreviewCell.col, false);
        }
        if (cellEl) {
            const row = parseInt(cellEl.dataset.row);
            const col = parseInt(cellEl.dataset.col);
            showChordPreview(row, col, true);
            inputState.chordPreviewCell = { row, col };
        } else {
            inputState.chordPreviewCell = null;
        }
    } else if (inputState.leftMouseDown && !inputState.rightMouseDown && cellEl) {
        // 拖拽进入时添加扁平效果
        const row = parseInt(cellEl.dataset.row);
        const col = parseInt(cellEl.dataset.col);
        const cell = gameState.board[row][col];
        if (!cell.revealed && !cell.flagged) {
            cellEl.classList.add('active-press');
        }
    }
});

DOM.board.addEventListener('mouseout', e => {
    const cellEl = e.target.closest('.cell');
    if (cellEl) {
        cellEl.classList.remove('active-press');
    }
});

DOM.board.addEventListener('mouseleave', () => {
    if (inputState.chordPreviewCell) {
        showChordPreview(inputState.chordPreviewCell.row, inputState.chordPreviewCell.col, false);
        inputState.chordPreviewCell = null;
    }
});

window.addEventListener('mouseup', () => {
    inputState.leftMouseDown = false;
    inputState.rightMouseDown = false;
});

// --- 新增：长按插旗 (移动端支持) ---
function cancelLongPress() {
    if (inputState.longPressTimer) {
        clearTimeout(inputState.longPressTimer);
        inputState.longPressTimer = null;
    }
}

DOM.board.addEventListener('touchstart', e => {
    const cellEl = e.target.closest('.cell');
    if (!cellEl || gameState.gameOver || gameState.gameWin) return;

    // 强制重绘，保证 iOS 滚动后的同步
    cellEl.style.opacity = '0.99'; 
    setTimeout(() => { cellEl.style.opacity = '1'; }, 0);

    inputState.isLongPress = false;
    if (inputState.longPressTimer) clearTimeout(inputState.longPressTimer);

    const row = parseInt(cellEl.dataset.row);
    const col = parseInt(cellEl.dataset.col);
    inputState.touchStartCell = { row, col };
    inputState.touchStartX = e.touches[0].clientX;
    inputState.touchStartY = e.touches[0].clientY;

    // 为触摸操作添加按下效果，确保在iOS上也有视觉反馈
    const cell = gameState.board[row][col];
    if (!cell.revealed) {
        cellEl.classList.add('active-press');
    }

    inputState.longPressTimer = setTimeout(() => {
        inputState.isLongPress = true;
        toggleFlag(row, col);
        if (navigator.vibrate) navigator.vibrate(50);
        cellEl.classList.remove('active-press');
    }, CONSTANTS.LONG_PRESS_MS); // 500毫秒判定为长按
}, { passive: true });

DOM.board.addEventListener('touchend', e => {
    inputState.lastTouchEndTime = Date.now();
    if (inputState.longPressTimer) clearTimeout(inputState.longPressTimer);

    // 移除所有按下的视觉效果
    const pressedCells = DOM.board.querySelectorAll('.active-press');
    pressedCells.forEach(el => el.classList.remove('active-press'));

    if (inputState.isLongPress) {
        e.preventDefault();
        inputState.isLongPress = false;
        return; // 长按已处理，直接返回
    }

    const cellEl = e.target.closest('.cell');
    if (!cellEl || !inputState.touchStartCell || gameState.gameOver || gameState.gameWin) return;
    
    const row = parseInt(cellEl.dataset.row);
    const col = parseInt(cellEl.dataset.col);
    
    if (inputState.touchStartCell.row === row && inputState.touchStartCell.col === col) {
        e.preventDefault();
        if (!gameState.board[row][col].revealed) revealCell(row, col);
        else chord(row, col);
    }
    inputState.touchStartCell = null;
}, { passive: false });

DOM.board.addEventListener('touchmove', e => {
    if (!inputState.touchStartCell) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - inputState.touchStartX);
    const dy = Math.abs(touch.clientY - inputState.touchStartY);
    
    // 允许 10px 的移动误差，超过则取消长按和点击
    if (dx > CONSTANTS.TOUCH_MOVE_TOLERANCE || dy > CONSTANTS.TOUCH_MOVE_TOLERANCE) {
        if (inputState.longPressTimer) clearTimeout(inputState.longPressTimer);
        // 拖动超出范围时，也移除按下效果
        const pressedCells = DOM.board.querySelectorAll('.active-press');
        pressedCells.forEach(el => el.classList.remove('active-press'));
        inputState.touchStartCell = null;
    }
}, { passive: true });

DOM.board.addEventListener('touchcancel', () => {
    if (inputState.longPressTimer) clearTimeout(inputState.longPressTimer);

    // 触摸取消时，移除按下效果
    const pressedCells = DOM.board.querySelectorAll('.active-press');
    pressedCells.forEach(el => el.classList.remove('active-press'));

    inputState.touchStartCell = null;
});

// 添加语言切换按钮事件
DOM.langToggle.addEventListener('click', () => {
    // 轮流切换语言
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
});

// 添加关于链接点击事件
DOM.aboutLink.addEventListener('click', e => {
    e.preventDefault();
    showAbout();
});

// 游戏启动
loadBestTimes();
const lastDifficulty = localStorage.getItem(CONSTANTS.LAST_DIFFICULTY_KEY) || 'beginner';
setDifficulty(lastDifficulty);
updateUI();

// 解决iOS下 :active 伪类无效的问题
document.body.addEventListener('touchstart', () => {}, { passive: true });

// 监听窗口大小变化，为初级难度动态调整布局
(() => {
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderBoard();
        }, 100); // 防抖
    });
})();