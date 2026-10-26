let questions = [];
let currentIndex = 0;
let maxUnlockedIndex = 0;
let userAnswers = [];

const trainerScreen = document.getElementById("trainer-screen");
const resultsScreen = document.getElementById("results-screen");
const questionImg = document.getElementById("question-img");
const targetWordSpan = document.getElementById("target-word");
const userInput = document.getElementById("user-input");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const stepsIndicator = document.getElementById("steps-indicator");
const resultsTbody = document.getElementById("results-tbody");
const resetResultsBtn = document.getElementById("reset-results-btn");

async function initTrainer() {
    try {
        const response = await fetch('questions.json');
        questions = await response.json();
        shuffleArray(questions);
        currentIndex = 0;
        maxUnlockedIndex = 0;
        userAnswers = [];
        trainerScreen.style.display = "flex";
        resultsScreen.style.display = "none";
        loadQuestion();
    } catch (error) {
        console.error("Ошибка загрузки вопросов:", error);
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function loadQuestion() {
    const currentQ = questions[currentIndex];
    questionImg.src = currentQ.image;
    
    const word = currentQ.correctAnswer;
    targetWordSpan.textContent = word.charAt(0) + word.slice(1).toLowerCase();
    
    if (userAnswers[currentIndex]) {
        userInput.value = userAnswers[currentIndex].userText;
    } else {
        userInput.value = "";
    }
    
    userInput.focus();
    renderSteps();
}

function renderSteps() {
    stepsIndicator.innerHTML = "";
    questions.forEach((_, index) => {
        const step = document.createElement("div");
        step.className = "step-badge";
        
        if (index === currentIndex) {
            step.classList.add("active");
        } else if (index < currentIndex || index <= maxUnlockedIndex) {
            step.classList.add("visited");
        }

        step.textContent = index + 1;
        step.id = `step-${index}`;
        
        if (index <= maxUnlockedIndex) {
            step.style.cursor = "pointer";
            step.addEventListener("click", () => {
                currentIndex = index;
                loadQuestion();
            });
        } else {
            step.style.cursor = "not-allowed";
        }

        stepsIndicator.appendChild(step);
    });
}

userInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^а-яА-ЯёЁ\s-]/g, '');
});

function handleSubmission() {
    const userText = userInput.value.trim();
    if (!userText) return;

    const currentQ = questions[currentIndex];
    const isCorrect = userText.toUpperCase() === currentQ.correctAnswer.toUpperCase();

    userAnswers[currentIndex] = {
        image: currentQ.image,
        correctAnswer: currentQ.correctAnswer,
        userText: userText,
        isCorrect: isCorrect
    };

    if (currentIndex === maxUnlockedIndex && maxUnlockedIndex < questions.length - 1) {
        maxUnlockedIndex++;
    }

    currentIndex++;

    if (currentIndex < questions.length) {
        loadQuestion();
    } else {
        if (userAnswers.filter(Boolean).length === questions.length) {
            showResults();
        } else {
            const nextUnanswered = userAnswers.findIndex(ans => !ans);
            if (nextUnanswered !== -1) {
                currentIndex = nextUnanswered;
                loadQuestion();
            } else {
                showResults();
            }
        }
    }
}

submitBtn.addEventListener("click", handleSubmission);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmission();
});

function formatVowels(text) {
    const vowels = "аеёиоуыэюяАЕЁИОУЫЭЮЯ";
    return text.split('').map(char => {
        if (vowels.includes(char)) {
            return `<span style="color: #e53935;">${char}</span>`;
        }
        return char;
    }).join('');
}

function showResults() {
    trainerScreen.style.display = "none";
    resultsScreen.style.display = "flex";

    document.querySelectorAll('#results-table th').forEach(th => {
        if (th.textContent.trim() !== '#') {
            th.innerHTML = formatVowels(th.textContent);
        }
    });

    resultsTbody.innerHTML = "";
    userAnswers.forEach((item, index) => {
        const tr = document.createElement("tr");
        
        const formattedCorrect = formatVowels(item.correctAnswer.toUpperCase());
        const formattedUser = formatVowels(item.userText.toUpperCase());

        const statusIcon = item.isCorrect 
            ? `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#2b8a3e" stroke-width="4.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
            : `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="4.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><img src="${item.image}" alt="img" class="table-img" ondragstart="return false;"></td>
            <td>${formattedCorrect}</td>
            <td>${formattedUser}</td>
            <td class="${item.isCorrect ? 'status-ok' : 'status-err'}">
                ${statusIcon}
            </td>
        `;
        resultsTbody.appendChild(tr);
    });
}

resetBtn.addEventListener("click", initTrainer);
resetResultsBtn.addEventListener("click", initTrainer);

initTrainer();