// --- DATOS DE EJEMPLO ---
const DEFAULT_DATA = `pregunta: ¿Qué diferencia hay entre una interfaz y una clase abstracta? ¿Por qué usaste interfaces para los servicios?

respuesta teórica: Una interfaz define un contrato (solo firmas) y permite herencia múltiple; una clase abstracta puede tener estado y lógica compartida, pero solo permite herencia simple. Se usa interfaz cuando se quiere desacoplar el contrato de la implementación y permitir varias implementaciones o mocks.

explicación como lo aplique en el proyecto: Definí AerolineaService, ClienteService, VentaService, etc., como interfaces y su implementación en service/impl/*Impl.java. Esto permitió que los controllers dependan del contrato y no de la implementación, facilitando tests (Mockito mockea la interfaz) y el principio de inversión de dependencias (SOLID).

Referencia: AerolineaService, AerolineaServiceImpl, VentaService.

respuesta falsa 1: Una interfaz y una clase abstracta son casi lo mismo; la diferencia principal es que la clase abstracta permite herencia múltiple y la interfaz solo herencia simple. Por eso usé interfaces para los servicios: así podía heredar de varias clases abstractas y reutilizar código.

respuesta falsa 2: La interfaz sirve para definir atributos y constructores compartidos, mientras que la clase abstracta solo tiene métodos sin cuerpo. Usé interfaces en los servicios porque Spring solo puede inyectar interfaces y no clases concretas.

respuesta falsa 3: Una clase abstracta es mejor para desacoplar porque permite instanciarse directamente, y la interfaz solo sirve para documentar. Usé interfaces porque Mockito no puede mockear clases abstractas y necesitaba obligatoriamente mocks en todos los servicios.

---

pregunta: ¿Por qué usas record para los DTOs y no clases tradicionales?

respuesta teórica: record (Java 16+) es un tipo inmutable que genera automáticamente constructor, equals, hashCode y toString. Ideal para DTOs que solo transportan datos y no deben mutarse.

explicación como lo aplique en el proyecto: Todos los *Request y *Response (AerolineaRequest, VentaResponse, LoginResponse, PageResponse<T>, etc.) son record. Así los DTOs son inmutables por diseño, más legibles y con menos boilerplate. Ejemplo: public record LoginResponse(String token, String type, Long userId, ...) {}. Los *FilterRequest también son records porque solo agrupan parámetros de búsqueda.

Referencia: AerolineaRequest, LoginResponse, PageResponse.

respuesta falsa 1: Uso record porque es una clase mutable más liviana que una clase tradicional; genera setters automáticamente y permite cambiar los datos del DTO después de crearlo, lo cual es cómodo para actualizar respuestas.

respuesta falsa 2: Uso record porque reemplaza a las entidades JPA y evita tener que anotar con @Entity; así el DTO se guarda directo en la base de datos y no necesito mapper. Además, record no genera equals ni hashCode, lo que lo hace más rápido.

respuesta falsa 3: Uso record porque permite herencia múltiple y tiene constructores telescópicos automáticos. Es ideal para DTOs mutables con muchos campos, y como no tiene toString, evita exponer datos sensibles en logs.

---`;

// --- HELPERS DE ESCAPADO (Bug #1) ---
const esc = Parser.escapeHtml;
const escBr = Parser.escapeHtmlWithBreaks;

// --- ESTADO GLOBAL ---
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let tempUserAnswers = [];
let quizMode = 'practice';
let questionsSource = null;        // 'file' | 'default' | null (Bug #4)
let manualConfirm = false;         // NUEVO: toggle de confirmación manual

let reviewPage = 1;
const itemsPerPage = 5;

// --- CARGA DE ARCHIVO ---
document.getElementById('file-upload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
        const text = ev.target.result;
        const parsed = Parser.parseText(text);

        if (parsed.length === 0) {
            questions = [];
            questionsSource = null;
            alert('No se encontraron preguntas válidas en el archivo. Revisa el formato.');
        } else {
            questions = parsed;
            questionsSource = 'file';
            alert(
                `Archivo cargado correctamente (${parsed.length} preguntas). ` +
                `Ya puedes iniciar el modo de práctica, repaso o examen.`
            );
        }
    };
    reader.readAsText(file);
});

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// NUEVO: refleja el modo actual (auto/manual) en el indicador
function updateModeIndicator() {
    const el = document.getElementById('mode-indicator');
    let baseText = '';

    if (quizMode === 'practice') {
        baseText = 'Modo de práctica (beta)' + (manualConfirm ? ' · manual' : ' · auto');
        el.style.backgroundColor = '#eceb98';
        el.style.color = '#3d3c0a';
    } else if (quizMode === 'review') {
        baseText = 'Modo Repaso';
        el.style.backgroundColor = 'rgba(248,152,32,.15)';
        el.style.color = 'var(--java-2)';
    } else {
        baseText = 'Modo de examen · manual';
        el.style.backgroundColor = '#e6f4ea';
        el.style.color = '#1e6055';
    }

    if (questionsSource === 'default') {
        baseText += ' · banco de ejemplo';
    }

    el.textContent = baseText;
}

// --- INICIO DEL QUIZ ---
function startQuiz(mode) {
    quizMode = mode;

    // NUEVO: leer el toggle de confirmación manual
    manualConfirm = document.getElementById('manual-confirm').checked;

    // Bug #4: avisar antes de usar el banco de ejemplo
    if (questions.length === 0) {
        const wants = confirm(
            'No has cargado ningún archivo. ¿Quieres empezar con el banco de ejemplo (2 preguntas)?'
        );
        if (!wants) return;

        questions = Parser.parseText(DEFAULT_DATA);
        questionsSource = 'default';
    }

    if (questions.length === 0) {
        alert('No hay preguntas cargadas. Sube un archivo .txt válido.');
        return;
    }

    questions = shuffleArray(questions);
    questions.forEach((q) => {
        q.options = shuffleArray(q.options);
    });

    userAnswers = new Array(questions.length).fill(null);
    tempUserAnswers = new Array(questions.length).fill(null);
    currentQuestionIndex = 0;

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('results-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'flex';

    updateModeIndicator();
    renderSidebar();
    renderQuestion();
}

// Bug #3: reiniciar sin recargar (mantiene el archivo cargado)
function restartQuiz() {
    document.getElementById('results-screen').style.display = 'none';

    if (questions.length === 0) {
        document.getElementById('setup-screen').style.display = 'flex';
        return;
    }

    document.getElementById('quiz-screen').style.display = 'flex';

    questions = shuffleArray(questions);
    questions.forEach((q) => {
        q.options = shuffleArray(q.options);
    });

    userAnswers = new Array(questions.length).fill(null);
    tempUserAnswers = new Array(questions.length).fill(null);
    currentQuestionIndex = 0;
    reviewPage = 1;

    updateModeIndicator();
    renderSidebar();
    renderQuestion();
}

function jumpToQuestion(index) {
    if (quizMode !== 'review') return;
    currentQuestionIndex = index;
    renderSidebar();
    renderQuestion();
    document.getElementById('question-area').scrollTop = 0;
}

// --- SIDEBAR (Bug #1: esc) ---
function renderSidebar() {
    const list = document.getElementById('question-list');
    list.innerHTML = '';

    questions.forEach((q, index) => {
        const li = document.createElement('li');
        const clickableClass = quizMode === 'review' ? 'clickable' : '';
        li.className = `question-item ${index === currentQuestionIndex ? 'active' : ''} ${clickableClass}`;

        if (quizMode === 'review') {
            li.onclick = () => jumpToQuestion(index);
        }

        let statusIcon = '<span class="status-icon"></span>';
        if (userAnswers[index] !== null) {
            if (quizMode === 'practice') {
                const selectedOpt = q.options[userAnswers[index]];
                statusIcon = selectedOpt.isCorrect
                    ? '<span class="status-icon correct"></span>'
                    : '<span class="status-icon incorrect"></span>';
            } else if (quizMode === 'exam') {
                statusIcon =
                    '<span class="status-icon" style="background-color: var(--spring); border-color: var(--spring);"></span>';
            }
        }

        li.innerHTML = `
            ${statusIcon}
            <div>
                <div style="font-size: 12px; color: #a1a3a5; margin-bottom: 4px;">Pregunta ${index + 1}</div>
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; opacity: 0.8;">${esc(q.question)}</div>
            </div>
        `;
        list.appendChild(li);
    });
}

// --- PREGUNTA (Bug #1: escBr en question, options, feedback) ---
function renderQuestion() {
    const q = questions[currentQuestionIndex];
    const area = document.getElementById('question-area');
    const isConfirmed = userAnswers[currentQuestionIndex] !== null;
    const activeSelection = isConfirmed
        ? userAnswers[currentQuestionIndex]
        : tempUserAnswers[currentQuestionIndex];

    document.getElementById('progress-text').textContent =
        `${currentQuestionIndex + 1}/${questions.length}`;
    document.getElementById('progress-fill').style.width =
        `${((currentQuestionIndex + 1) / questions.length) * 100}%`;

    let html = `
        <div class="question-text">
            <span style="font-size: 14px; color: var(--text-light); display: block; margin-bottom: 10px;">Pregunta ${currentQuestionIndex + 1}:</span>
            ${escBr(q.question)}
        </div>
        <ul class="options-list">
    `;

    q.options.forEach((opt, index) => {
        let optionClass = 'option-item';

        if (quizMode === 'review') {
            if (opt.isCorrect) optionClass += ' selected-practice';
        } else {
            if (activeSelection === index) {
                if (isConfirmed) {
                    if (quizMode === 'practice') {
                        optionClass += opt.isCorrect ? ' selected-practice' : ' incorrect-practice';
                    } else {
                        optionClass += ' selected-exam';
                    }
                } else {
                    optionClass += ' selected-temp';
                }
            } else if (isConfirmed && quizMode === 'practice' && opt.isCorrect) {
                optionClass += ' selected-practice';
            }
        }

        html += `
            <li class="${optionClass}" ${quizMode !== 'review' ? `onclick="selectOption(${index})"` : ''}>
                <div class="option-radio"></div>
                <div class="option-text">${escBr(opt.text)}</div>
            </li>
        `;
    });

    html += `</ul>`;

    html += `
        <div class="feedback-container" id="feedback-container">
            <div class="feedback-header" id="feedback-header">
                <span id="feedback-title">Respuesta correcta</span>
            </div>
            <div class="feedback-body">
                <div id="feedback-correct-answer"></div>
                <div class="feedback-explanation" id="feedback-explanation"></div>
                <div class="feedback-reference" id="feedback-reference" style="display:none;"></div>
            </div>
        </div>
    `;

    area.innerHTML = html;

    const feedbackContainer = document.getElementById('feedback-container');
    const selectBtn = document.getElementById('select-btn');
    const nextBtn = document.getElementById('next-btn');
    const explanationLabel = q.explanationLabel || 'Explicación';

    if (quizMode === 'review') {
        // --- MODO REPASO: sin botón de confirmar ---
        feedbackContainer.style.display = 'block';
        const header = document.getElementById('feedback-header');
        const title = document.getElementById('feedback-title');
        const correctAnswerDiv = document.getElementById('feedback-correct-answer');
        const explanationDiv = document.getElementById('feedback-explanation');
        const referenceDiv = document.getElementById('feedback-reference');

        const correctOpt = q.options.find((o) => o.isCorrect);

        header.classList.remove('incorrect');
        title.textContent = 'Respuesta';
        correctAnswerDiv.innerHTML = `<strong>${escBr(correctOpt ? correctOpt.text : '')}</strong>`;
        explanationDiv.innerHTML = `<strong>${esc(explanationLabel)}</strong><br>${escBr(q.explanation)}`;

        if (q.reference && q.reference.trim()) {
            referenceDiv.style.display = 'block';
            referenceDiv.innerHTML = `<strong>Referencia:</strong> ${escBr(q.reference)}`;
        } else {
            referenceDiv.style.display = 'none';
        }

        selectBtn.style.display = 'none';
        nextBtn.disabled = false;
    } else {
        // --- PRÁCTICA / EXAMEN ---
        if (quizMode === 'practice' && isConfirmed) {
            showFeedback();
        } else {
            feedbackContainer.style.display = 'none';
        }

        // NUEVO: lógica del botón "Confirmar respuesta" según modo
        // - Auto (práctica y toggle OFF): sin botón, feedback al hacer clic en opción.
        // - Manual (examen siempre, práctica si toggle ON): botón visible.
        const autoMode = (quizMode === 'practice' && !manualConfirm);

        if (isConfirmed) {
            // Ya respondida (auto o manual): ocultar "Confirmar", habilitar "Siguiente"
            selectBtn.style.display = 'none';
            selectBtn.disabled = true;
            nextBtn.disabled = false;
        } else if (autoMode) {
            // Auto, aún sin seleccionar: sin botón, "Siguiente" bloqueado
            selectBtn.style.display = 'none';
            selectBtn.disabled = true;
            nextBtn.disabled = true;
        } else {
            // Manual, aún sin confirmar: mostrar "Confirmar respuesta"
            selectBtn.style.display = 'inline-block';
            selectBtn.disabled = (activeSelection === null);
            nextBtn.disabled = true;
        }
    }

    nextBtn.textContent =
        currentQuestionIndex === questions.length - 1
            ? 'Finalizar prueba'
            : 'Siguiente pregunta →';
}

function selectOption(optionIndex) {
    if (quizMode === 'review') return;
    if (userAnswers[currentQuestionIndex] !== null) return;

    // NUEVO: en práctica auto, al hacer clic se confirma inmediatamente
    const autoConfirm = (quizMode === 'practice' && !manualConfirm);

    if (autoConfirm) {
        userAnswers[currentQuestionIndex] = optionIndex;
        renderSidebar();
        renderQuestion();
    } else {
        tempUserAnswers[currentQuestionIndex] = optionIndex;
        renderQuestion();
    }
}

function confirmSelection() {
    if (quizMode === 'review') return;
    const tempIndex = tempUserAnswers[currentQuestionIndex];
    if (tempIndex === null) return;
    userAnswers[currentQuestionIndex] = tempIndex;
    renderSidebar();
    renderQuestion();
}

// --- FEEDBACK (Bug #1: escBr) ---
function showFeedback() {
    const q = questions[currentQuestionIndex];
    const selectedIndex = userAnswers[currentQuestionIndex];
    const selectedOpt = q.options[selectedIndex];
    const correctOpt = q.options.find((o) => o.isCorrect);
    const explanationLabel = q.explanationLabel || 'Explicación';

    const container = document.getElementById('feedback-container');
    const header = document.getElementById('feedback-header');
    const title = document.getElementById('feedback-title');
    const correctAnswerDiv = document.getElementById('feedback-correct-answer');
    const explanationDiv = document.getElementById('feedback-explanation');
    const referenceDiv = document.getElementById('feedback-reference');

    container.style.display = 'block';

    if (selectedOpt.isCorrect) {
        header.classList.remove('incorrect');
        title.textContent = 'Respuesta correcta';
        correctAnswerDiv.innerHTML = `<strong>${escBr(correctOpt.text)}</strong>`;
    } else {
        header.classList.add('incorrect');
        title.textContent = 'Respuesta incorrecta';
        correctAnswerDiv.innerHTML = `<strong>La respuesta correcta es:</strong><br>${escBr(correctOpt.text)}`;
    }

    explanationDiv.innerHTML = `<strong>${esc(explanationLabel)}</strong><br>${escBr(q.explanation)}`;

    if (q.reference && q.reference.trim()) {
        referenceDiv.style.display = 'block';
        referenceDiv.innerHTML = `<strong>Referencia:</strong> ${escBr(q.reference)}`;
    } else {
        referenceDiv.style.display = 'none';
    }
}

function nextQuestion() {
    if (quizMode !== 'review' && userAnswers[currentQuestionIndex] === null) {
        alert("Por favor, selecciona una respuesta y confírmala antes de continuar.");
        return;
    }

    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderSidebar();
        renderQuestion();
        document.getElementById('question-area').scrollTop = 0;
    } else {
        finishQuiz();
    }
}

function finishQuiz() {
    if (quizMode === 'exam') {
        const unanswered = userAnswers.filter((a) => a === null).length;
        if (unanswered > 0) {
            if (!confirm(
                `Tienes ${unanswered} preguntas sin responder o sin confirmar. ¿Seguro que quieres finalizar?`
            )) return;
        }
    }

    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('results-screen').style.display = 'block';

    if (quizMode === 'review') {
        document.getElementById('final-score').textContent = '100%';
        document.getElementById('score-text').textContent =
            `Has completado el repaso de las ${questions.length} preguntas.`;
    } else {
        let correctCount = 0;
        questions.forEach((q, index) => {
            const selectedIndex = userAnswers[index];
            const selectedOpt = selectedIndex !== null ? q.options[selectedIndex] : null;
            if (selectedOpt && selectedOpt.isCorrect) correctCount++;
        });

        const scorePercentage = Math.round((correctCount / questions.length) * 100);
        document.getElementById('final-score').textContent = `${scorePercentage}%`;
        document.getElementById('score-text').textContent =
            `Has acertado ${correctCount} de ${questions.length} preguntas.`;
    }

    reviewPage = 1;
    renderReviewPage();
}

// --- REVISIÓN (Bug #1: escBr) ---
function renderReviewPage() {
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';

    const startIndex = (reviewPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, questions.length);

    for (let i = startIndex; i < endIndex; i++) {
        const q = questions[i];
        const selectedIndex = userAnswers[i];
        const selectedOpt = selectedIndex !== null ? q.options[selectedIndex] : null;
        const correctOpt = q.options.find((o) => o.isCorrect);
        const explanationLabel = q.explanationLabel || 'Explicación';

        const isCorrect = quizMode === 'review' ? true : (selectedOpt && selectedOpt.isCorrect);

        const div = document.createElement('div');
        div.className = `review-item ${isCorrect ? 'correct-border' : 'incorrect-border'}`;

        let answerHtml = '';

        if (quizMode === 'review') {
            answerHtml = `<div class="review-answer correct">
                <strong>Respuesta:</strong> ${escBr(correctOpt ? correctOpt.text : '')}
            </div>`;
        } else if (selectedOpt) {
            answerHtml = `<div class="review-answer ${isCorrect ? 'correct' : 'incorrect'}">
                <strong>Tu respuesta:</strong> ${escBr(selectedOpt.text)}
            </div>`;
        } else {
            answerHtml = `<div class="review-answer incorrect"><strong>Tu respuesta:</strong> No respondida</div>`;
        }

        if (!isCorrect && quizMode !== 'review') {
            answerHtml += `<div class="review-answer correct">
                <strong>Respuesta correcta:</strong> ${escBr(correctOpt ? correctOpt.text : '')}
            </div>`;
        }

        const referenceHtml = (q.reference && q.reference.trim())
            ? `<div class="review-reference"><strong>Referencia:</strong> ${escBr(q.reference)}</div>`
            : '';

        div.innerHTML = `
            <div class="review-question">Pregunta ${i + 1}: ${escBr(q.question)}</div>
            ${answerHtml}
            <div class="review-answer" style="margin-top: 10px; color: var(--text-light);">
                <strong>${esc(explanationLabel)}:</strong> ${escBr(q.explanation)}
            </div>
            ${referenceHtml}
        `;
        reviewList.appendChild(div);
    }

    renderPaginationControls();
}

function renderPaginationControls() {
    const controls = document.getElementById('pagination-controls');
    controls.innerHTML = '';

    const totalPages = Math.ceil(questions.length / itemsPerPage);

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = 'Anterior';
    prevBtn.disabled = reviewPage === 1;
    prevBtn.onclick = () => {
        reviewPage--;
        renderReviewPage();
        document.getElementById('results-screen').scrollTop = 0;
    };
    controls.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === reviewPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            reviewPage = i;
            renderReviewPage();
            document.getElementById('results-screen').scrollTop = 0;
        };
        controls.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Siguiente';
    nextBtn.disabled = reviewPage === totalPages;
    nextBtn.onclick = () => {
        reviewPage++;
        renderReviewPage();
        document.getElementById('results-screen').scrollTop = 0;
    };
    controls.appendChild(nextBtn);
}