/**
 * Тренажер платформы «ЭМО»
 * Основной скрипт управления логикой прохождения, проверки ответов и отрисовки результатов.
 */

// Глобальные переменные состояния тренажера
let questions = [];
let currentIndex = 0;
let maxUnlockedIndex = 0;
let userAnswers = [];

/**
 * Генератор SVG-иконки галочки.
 * Позволяет избежать дублирования кода, гибко управляя цветом и наличием ID для анимации цвета.
 */
const getCheckIcon = (strokeColor, withId = false) => `
    <svg width="48" height="48" viewBox="0 0 28 28" fill="none" style="display: inline-block; vertical-align: middle; overflow: visible;">
        <polyline points="4,13 11,21 24,7" stroke="#000000" stroke-width="7" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="3"></polyline>
        <polyline ${withId ? 'id="submit-icon-path"' : ''} points="4,13 11,21 24,7" stroke="${strokeColor}" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="3"></polyline>
    </svg>
`;

// Константа для иконки крестика (ошибки / сброса)
const CROSS_ICON = `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="display: inline-block; vertical-align: middle;">
        <line x1="18" y1="6" x2="6" y2="18" stroke="#000000" stroke-width="5.5" stroke-linecap="square"></line>
        <line x1="6" y1="6" x2="18" y2="18" stroke="#000000" stroke-width="5.5" stroke-linecap="square"></line>
        <line x1="18" y1="6" x2="6" y2="18" stroke="#e53935" stroke-width="4" stroke-linecap="square"></line>
        <line x1="6" y1="6" x2="18" y2="18" stroke="#e53935" stroke-width="4" stroke-linecap="square"></line>
    </svg>
`;

// Кэширование DOM-элементов интерфейса
const trainerScreen = document.getElementById("trainer-screen");
const resultsScreen = document.getElementById("results-screen");
const questionImg = document.getElementById("question-img");
const targetWordSpan = document.getElementById("target-word");
const userInput = document.getElementById("user-input");
const submitBtn = document.getElementById("submit-btn");
let submitIconPath; // Ссылка на внутренний контур кнопки отправки (инициализируется после рендеринга)
const resetBtn = document.getElementById("reset-btn");
const stepsIndicator = document.getElementById("steps-indicator");
const resultsTbody = document.getElementById("results-tbody");
const resetResultsBtn = document.getElementById("reset-results-btn");

/**
 * Инициализация тренажера: загрузка вопросов из JSON, сброс состояния и запуск первого вопроса.
 */
async function initTrainer() {
    try {
        // Динамическая вставка SVG-иконок в элементы интерфейса
        submitBtn.innerHTML = getCheckIcon("#cccccc", true);
        submitIconPath = document.getElementById("submit-icon-path");
        resetBtn.innerHTML = CROSS_ICON;
        resetResultsBtn.innerHTML = CROSS_ICON;

        // Загрузка массива вопросов
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

/**
 * Перемешивание массива в случайном порядке (алгоритм Фишера — Йетса).
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Динамическое изменение цвета иконки отправки в зависимости от наличия текста в поле ввода.
 */
function updateSubmitButtonState() {
    if (submitIconPath) {
        if (userInput.value.trim().length > 0) {
            submitIconPath.setAttribute("stroke", "#2b8a3e"); // Зеленый (есть текст)
        } else {
            submitIconPath.setAttribute("stroke", "#cccccc"); // Серый (поле пустое)
        }
    }
}

/**
 * Загрузка и отображение текущего вопроса на экране.
 */
function loadQuestion() {
    const currentQ = questions[currentIndex];
    questionImg.src = currentQ.image;
    
    // Форматирование целевого слова (первая буква заглавная, остальные строчные)
    const word = currentQ.correctAnswer;
    targetWordSpan.textContent = word.charAt(0) + word.slice(1).toLowerCase();
    
    // Восстановление ранее введенного ответа пользователя (если он возвращался к шагу)
    if (userAnswers[currentIndex]) {
        userInput.value = userAnswers[currentIndex].userText;
    } else {
        userInput.value = "";
    }
    
    updateSubmitButtonState();
    userInput.focus();
    renderSteps();
}

/**
 * Отрисовка боковой панели навигации по шагам (с учетом статусов посещения).
 */
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
        
        // Разрешаем клик только по уже открытым/пройденным шагам
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

// Ограничение ввода: разрешена только кириллица, пробелы и дефисы
userInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^а-яА-ЯёЁ\s-]/g, '');
    updateSubmitButtonState();
});

/**
 * Обработка отправки ответа пользователем, валидация и переход к следующему вопросу.
 */
function handleSubmission() {
    const userText = userInput.value.trim();
    if (!userText) return; // Пустой ответ не отправляется

    const currentQ = questions[currentIndex];
    // Регистронезависимая проверка ответа
    const isCorrect = userText.toUpperCase() === currentQ.correctAnswer.toUpperCase();

    // Сохранение результата ответа текущего шага
    userAnswers[currentIndex] = {
        image: currentQ.image,
        correctAnswer: currentQ.correctAnswer,
        userText: userText,
        isCorrect: isCorrect
    };

    // Открытие следующего доступного шага по мере прохождения
    if (currentIndex === maxUnlockedIndex && maxUnlockedIndex < questions.length - 1) {
        maxUnlockedIndex++;
    }

    currentIndex++;

    // Проверка завершения всех вопросов или поиск пропущенных шагов
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

// Слушатели событий отправки формы (кнопка и клавиша Enter)
submitBtn.addEventListener("click", handleSubmission);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmission();
});

/**
 * Вспомогательная функция для подсветки гласных букв красным цветом.
 */
function formatVowels(text) {
    const vowels = "аеёиоуыэюяАЕЁИОУЫЭЮЯ";
    return text.split('').map(char => {
        if (vowels.includes(char)) {
            return `<span style="color: #e53935;">${char}</span>`;
        }
        return char;
    }).join('');
}

/**
 * Переключение на экран и отрисовка итоговой таблицы результатов.
 */
function showResults() {
    trainerScreen.style.display = "none";
    resultsScreen.style.display = "flex";

    // Форматирование заголовков таблицы
    document.querySelectorAll('#results-table th').forEach(th => {
        if (th.textContent.trim() !== '#') {
            th.innerHTML = formatVowels(th.textContent);
        }
    });

    resultsTbody.innerHTML = "";
    
    // Заполнение таблицы строк результатов ответов пользователя
    userAnswers.forEach((item, index) => {
        const tr = document.createElement("tr");
        
        const formattedCorrect = formatVowels(item.correctAnswer.toUpperCase());
        const formattedUser = formatVowels(item.userText.toUpperCase());

        const statusIcon = item.isCorrect ? getCheckIcon("#2b8a3e", false) : CROSS_ICON;

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

// Привязка обработчиков к кнопкам перезапуска/сброса тренажера
resetBtn.addEventListener("click", initTrainer);
resetResultsBtn.addEventListener("click", initTrainer);

// Первичный запуск приложения
initTrainer();