// ==================== DATA CONFIGURATION ====================
const streams = {
    natural: {
        name: 'Natural Science',
        subjects: ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'English', 'Aptitude']
    },
    social: {
        name: 'Social Science',
        subjects: ['History', 'Geography', 'Economics', 'Mathematics', 'English']
    }
};

const availableYears = ['2017', '2016', '2015', '2014', '2013'];

function getJsonPath(subject, year) {
    const subjLower = subject.toLowerCase();
    return `data/${subjLower}_${year}.json`;
}

// ==================== DOM ELEMENTS ====================
const screens = {
    stream: document.getElementById('streamScreen'),
    subject: document.getElementById('subjectScreen'),
    year: document.getElementById('yearScreen'),
    quiz: document.getElementById('quizScreen'),
    result: document.getElementById('resultScreen'),
    psych: document.getElementById('psychScreen'),
    dashboard: document.getElementById('dashboardScreen')
};

const subjectListDiv = document.getElementById('subjectList');
const yearListDiv = document.getElementById('yearList');
const quizSubjectDisplay = document.getElementById('quizSubjectDisplay');
const quizYearDisplay = document.getElementById('quizYearDisplay');
const quizScoreSpan = document.getElementById('quizScore');
const quizTimerSpan = document.getElementById('quizTimer');
const quizHighScoreSpan = document.getElementById('quizHighScore');
const quizQuestionContainer = document.getElementById('quizQuestionContainer');
const quizFeedback = document.getElementById('quizFeedback');
const quizNextBtn = document.getElementById('quizNextBtn');
const resultStatsDiv = document.getElementById('resultStats');
const reviewWrongBtn = document.getElementById('reviewWrongBtn');
const restartQuizBtn = document.getElementById('restartQuizBtn');
const dashboardStatsDiv = document.getElementById('dashboardStats');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// ==================== GLOBAL STATE ====================
let currentStream = null;
let currentSubject = null;
let currentYear = null;
let currentQuestions = [];
let currentIndex = 0;
let currentScore = 0;
let wrongAnswers = [];
let quizActive = false;
let timerInterval = null;
let timeRemaining = 0;
let highScoreKey = '';

// ==================== DASHBOARD FUNCTIONS ====================
function getAttemptsKey() {
    return 'de_prep_attempts';
}

function saveAttempt(subject, year, score, totalQuestions, percentage, passed) {
    const attempts = getAttempts();
    const newAttempt = {
        id: Date.now(),
        subject,
        year,
        score,
        totalQuestions,
        percentage,
        passed,
        date: new Date().toLocaleString()
    };
    attempts.unshift(newAttempt);
    if (attempts.length > 50) attempts.pop();
    localStorage.setItem(getAttemptsKey(), JSON.stringify(attempts));
}

function getAttempts() {
    const stored = localStorage.getItem(getAttemptsKey());
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch (e) {
        return [];
    }
}

function renderDashboard() {
    const attempts = getAttempts();
    if (attempts.length === 0) {
        dashboardStatsDiv.innerHTML = '<div class="empty-dashboard">📭 No attempts yet. Complete a quiz to see your performance history.</div>';
        return;
    }

    let html = '';
    attempts.forEach(attempt => {
        const passClass = attempt.passed ? 'pass' : 'fail';
        const passText = attempt.passed ? '✅ Passed' : '❌ Failed';
        html += `
            <div class="dashboard-card">
                <h4>📘 ${attempt.subject} (${attempt.year} E.C)</h4>
                <p>Score: ${attempt.score} / ${attempt.totalQuestions} (${attempt.percentage}%)</p>
                <p class="${passClass}">${passText}</p>
                <p>📅 ${attempt.date}</p>
            </div>
        `;
    });
    dashboardStatsDiv.innerHTML = html;
}

function clearAllHistory() {
    if (confirm('⚠️ Are you sure you want to delete all your quiz history? This cannot be undone.')) {
        localStorage.removeItem(getAttemptsKey());
        renderDashboard();
    }
}

// ==================== HELPER FUNCTIONS ====================
function showScreen(screenId) {
    Object.keys(screens).forEach(id => {
        screens[id].classList.remove('active');
    });
    screens[screenId].classList.add('active');
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function loadHighScore() {
    if (!highScoreKey) return 0;
    const saved = localStorage.getItem(highScoreKey);
    const high = saved ? parseInt(saved) : 0;
    quizHighScoreSpan.textContent = high;
    return high;
}

function updateHighScore() {
    if (!highScoreKey) return;
    const currentHigh = parseInt(localStorage.getItem(highScoreKey)) || 0;
    if (currentScore > currentHigh) {
        localStorage.setItem(highScoreKey, currentScore);
        quizHighScoreSpan.textContent = currentScore;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startTotalTimer(totalSeconds) {
    timeRemaining = totalSeconds;
    quizTimerSpan.textContent = formatTime(timeRemaining);
    timerInterval = setInterval(() => {
        if (!quizActive) return;
        if (timeRemaining <= 1) {
            clearInterval(timerInterval);
            timerInterval = null;
            if (quizActive) finishQuiz();
        } else {
            timeRemaining--;
            quizTimerSpan.textContent = formatTime(timeRemaining);
        }
    }, 1000);
}

function renderQuestion() {
    if (!quizActive || currentIndex >= currentQuestions.length) return;
    const q = currentQuestions[currentIndex];
    if (!q) return;

    let optionsHtml = '';
    q.options.forEach((opt, idx) => {
        optionsHtml += `<button class="option-btn" data-opt-index="${idx}">${escapeHtml(opt)}</button>`;
    });

    quizQuestionContainer.innerHTML = `
        <div class="question-card">
            <div class="question-text">${escapeHtml(q.text)}</div>
            <div class="options-list" id="optionsList">
                ${optionsHtml}
            </div>
        </div>
    `;

    quizFeedback.innerHTML = '';
    quizFeedback.className = '';
    quizNextBtn.disabled = true;

    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!quizActive) return;
            handleAnswer(parseInt(btn.dataset.optIndex));
        });
    });
}

function handleAnswer(selectedIdx) {
    if (!quizActive) return;
    const q = currentQuestions[currentIndex];
    const isCorrect = (selectedIdx === q.correct);

    document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);

    if (isCorrect) {
        currentScore++;
        quizScoreSpan.textContent = currentScore;
        quizFeedback.innerHTML = `✅ Correct! ${escapeHtml(q.explanation)}`;
        quizFeedback.className = 'feedback-correct';
    } else {
        quizFeedback.innerHTML = `❌ Wrong. ${escapeHtml(q.explanation)}`;
        quizFeedback.className = 'feedback-wrong';
        wrongAnswers.push({
            question: q.text,
            userAnswer: q.options[selectedIdx],
            correctAnswer: q.options[q.correct],
            explanation: q.explanation
        });
    }

    const allOptions = document.querySelectorAll('.option-btn');
    allOptions.forEach((btn, idx) => {
        if (idx === q.correct) btn.classList.add('correct-highlight');
    });

    quizNextBtn.disabled = false;
}

function nextQuestion() {
    if (!quizActive) return;
    if (currentIndex + 1 < currentQuestions.length) {
        currentIndex++;
        renderQuestion();
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    quizActive = false;
    stopTimer();
    updateHighScore();

    const totalQuestions = currentQuestions.length;
    const percentage = ((currentScore / totalQuestions) * 100).toFixed(1);
    const passed = currentScore >= (totalQuestions / 2);

    saveAttempt(currentSubject, currentYear, currentScore, totalQuestions, percentage, passed);

    resultStatsDiv.innerHTML = `
        <p><strong>Your Score:</strong> ${currentScore} / ${totalQuestions} (${percentage}%)</p>
        <p><strong>Status:</strong> ${passed ? '✅ Passed' : '❌ Failed'}</p>
        <p><strong>⭐ Highest Score:</strong> ${localStorage.getItem(highScoreKey) || 0}</p>
    `;

    if (wrongAnswers.length > 0) {
        reviewWrongBtn.style.display = 'block';
    } else {
        reviewWrongBtn.style.display = 'none';
    }

    showScreen('result');
}

function showReviewModal() {
    if (wrongAnswers.length === 0) return;

    let wrongItemsHtml = '';
    wrongAnswers.forEach((item, idx) => {
        wrongItemsHtml += `
            <div class="wrong-item">
                <strong>Q${idx+1}:</strong> ${escapeHtml(item.question)}<br>
                <span style="color:#c62828;">❌ Your answer: ${escapeHtml(item.userAnswer)}</span><br>
                <span style="color:#2e7d32;">✅ Correct: ${escapeHtml(item.correctAnswer)}</span><br>
                <span style="font-size:0.85rem;">📘 ${escapeHtml(item.explanation)}</span>
            </div>
        `;
    });

    const modalDiv = document.createElement('div');
    modalDiv.className = 'review-modal';
    modalDiv.innerHTML = `
        <div class="review-content">
            <h3>📖 Review Mistakes</h3>
            ${wrongItemsHtml}
            <button class="close-review">Close</button>
        </div>
    `;
    document.body.appendChild(modalDiv);
    modalDiv.querySelector('.close-review').addEventListener('click', () => modalDiv.remove());
    modalDiv.addEventListener('click', (e) => { if (e.target === modalDiv) modalDiv.remove(); });
}

async function loadQuestions(subject, year) {
    const jsonPath = getJsonPath(subject, year);
    try {
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        currentQuestions = shuffleArray([...data]);
        return true;
    } catch (error) {
        console.error('Error loading questions:', error);
        alert(`Failed to load questions for ${subject} ${year}. Make sure the file ${jsonPath} exists.`);
        return false;
    }
}

async function startQuiz(subject, year) {
    const success = await loadQuestions(subject, year);
    if (!success) return;

    currentSubject = subject;
    currentYear = year;
    currentScore = 0;
    currentIndex = 0;
    wrongAnswers = [];
    quizScoreSpan.textContent = '0';
    quizActive = true;

    highScoreKey = `highscore_${currentStream}_${subject}_${year}`;
    loadHighScore();

    const totalSeconds = currentQuestions.length * 120;
    startTotalTimer(totalSeconds);

    quizSubjectDisplay.textContent = subject;
    quizYearDisplay.textContent = year;

    renderQuestion();
    showScreen('quiz');
}

// ==================== NAVIGATION HANDLERS ====================
function onStreamSelect(streamId) {
    currentStream = streamId;
    const streamData = streams[streamId];
    subjectListDiv.innerHTML = '';
    streamData.subjects.forEach(subj => {
        const btn = document.createElement('button');
        btn.className = 'subject-btn';
        btn.textContent = subj;
        btn.dataset.subject = subj;
        btn.addEventListener('click', () => onSubjectSelect(subj));
        subjectListDiv.appendChild(btn);
    });
    showScreen('subject');
}

function onSubjectSelect(subject) {
    currentSubject = subject;
    yearListDiv.innerHTML = '';
    availableYears.forEach(year => {
        const btn = document.createElement('button');
        btn.className = 'year-btn';
        btn.textContent = `${year} E.C`;
        btn.dataset.year = year;
        btn.addEventListener('click', () => onYearSelect(year));
        yearListDiv.appendChild(btn);
    });
    showScreen('year');
}

function onYearSelect(year) {
    currentYear = year;
    startQuiz(currentSubject, year);
}

function resetToMainMenu() {
    quizActive = false;
    stopTimer();
    currentStream = null;
    currentSubject = null;
    currentYear = null;
    currentQuestions = [];
    currentIndex = 0;
    currentScore = 0;
    wrongAnswers = [];
    showScreen('stream');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== PSYCHOLOGY TAB SWITCHING ====================
function initPsychTabs() {
    const tabs = document.querySelectorAll('.psych-tab');
    const contents = document.querySelectorAll('.psych-tab-content');
    if (tabs.length === 0) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            // Activate current tab and content
            tab.classList.add('active');
            const activeContent = document.getElementById(`tab-${targetTab}`);
            if (activeContent) activeContent.classList.add('active');
        });
    });
}

// ==================== EVENT LISTENERS ====================
document.querySelectorAll('.stream-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        onStreamSelect(btn.dataset.stream);
    });
});

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = btn.dataset.back;
        if (target === 'stream') showScreen('stream');
        else if (target === 'subject') showScreen('subject');
    });
});

document.getElementById('psychBtn').addEventListener('click', () => {
    initPsychTabs(); // ensure tabs work if not already initialised
    showScreen('psych');
});
document.getElementById('dashboardBtn').addEventListener('click', () => {
    renderDashboard();
    showScreen('dashboard');
});
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearAllHistory);

quizNextBtn.addEventListener('click', nextQuestion);
reviewWrongBtn.addEventListener('click', showReviewModal);
restartQuizBtn.addEventListener('click', resetToMainMenu);

// Initialise psychological tabs on page load
document.addEventListener('DOMContentLoaded', () => {
    initPsychTabs();
});

const installBtn = document.getElementById('installBtn');
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installBtn) {
        installBtn.hidden = false;
    }
});

installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
    } else {
        console.log('User dismissed the install prompt');
    }
    deferredPrompt = null;
    if (installBtn) installBtn.hidden = true;
});

window.addEventListener('appinstalled', () => {
    console.log('PWA installed');
    if (installBtn) installBtn.hidden = true;
});

// Initial screen
showScreen('stream');