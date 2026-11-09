/* ============================================================
   js/parser.js
   Parser unificado para el banco de preguntas.
   Expone window.Parser:
     - parseText(text)          → array de preguntas normalizadas
     - escapeHtml(str)          → escapa HTML (sin tocar \n)
     - escapeHtmlWithBreaks(s)  → escapa HTML y convierte \n a <br>
   ============================================================ */
(function (global) {
    'use strict';

    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    }

    function escapeHtmlWithBreaks(str) {
        return escapeHtml(str).replace(/\n/g, '<br>');
    }

    /* Detecta el formato del bloque:
       - new: "respuesta teórica:" o "respuesta falsa N:"
       - old: líneas "A) … D)" o "Correcta:" */
    function detectFormat(block) {
        if (/respuesta\s+te[oó]rica\s*:/i.test(block) || /respuesta\s+falsa/i.test(block)) {
            return 'new';
        }
        if (/^[A-D]\)\s*/m.test(block) || /^correcta\s*:/im.test(block)) {
            return 'old';
        }
        return 'new';
    }

    /* ------------------------------------------------------------------
       FORMATO NUEVO
       ------------------------------------------------------------------ */
    function parseNewFormat(block) {
        const data = {
            question: '',
            theory: '',
            explanation: '',
            explanationLabel: 'Explicación',
            reference: '',
            falses: []
        };

        let currentField = null;

        const appendToCurrent = (extra) => {
            if (currentField === 'question') data.question += ' ' + extra;
            else if (currentField === 'theory') data.theory += ' ' + extra;
            else if (currentField === 'explanation') data.explanation += ' ' + extra;
            else if (currentField === 'reference') data.reference += ' ' + extra;
            else if (currentField === 'false' && data.falses.length) {
                data.falses[data.falses.length - 1] += ' ' + extra;
            }
        };

        block.split('\n').forEach((raw) => {
            const line = raw.trim();
            if (!line) return;
            if (/^-{3,}$/.test(line)) return;

            let m;

            if ((m = line.match(/^pregunta\s*:\s*(.*)$/i))) {
                currentField = 'question';
                data.question = m[1].trim();
                return;
            }

            if ((m = line.match(/^respuesta\s+te[oó]rica\s*:\s*(.*)$/i))) {
                currentField = 'theory';
                data.theory = m[1].trim();
                return;
            }

            // Bug #5: solo es "Aplicación en el proyecto" si el texto lo dice.
            if ((m = line.match(/^explicaci[oó]n(\s+[^:\n]*)?\s*:\s*(.*)$/i))) {
                currentField = 'explanation';
                data.explanation = m[2].trim();
                if (m[1] && /apliqu/i.test(m[1])) {
                    data.explanationLabel = 'Aplicación en el proyecto';
                }
                return;
            }

            if ((m = line.match(/^referencia\s*:\s*(.*)$/i))) {
                currentField = 'reference';
                data.reference = m[1].trim();
                return;
            }

            if ((m = line.match(/^respuesta\s+falsa(?:\s*\d+)?\s*:\s*(.*)$/i))) {
                currentField = 'false';
                data.falses.push(m[1].trim());
                return;
            }

            if (currentField) appendToCurrent(line);
        });

        if (!data.question || !data.theory) return null;

        const options = [
            { text: data.theory, isCorrect: true },
            ...data.falses
                .filter((t) => t && t.length > 0)
                .map((t) => ({ text: t, isCorrect: false }))
        ];

        const hasOwnExplanation = !!data.explanation;

        return {
            question: data.question,
            theory: data.theory,
            explanation: data.explanation || data.theory,
            // Bug #5: fallback cambia el label a "Explicación"
            explanationLabel: hasOwnExplanation ? data.explanationLabel : 'Explicación',
            reference: data.reference,
            options: options
        };
    }

    /* ------------------------------------------------------------------
       FORMATO CLÁSICO
       ------------------------------------------------------------------ */
    function parseOldFormat(block) {
        const obj = {
            question: '',
            options: [],
            explanation: '',
            explanationLabel: 'Explicación',
            reference: ''
        };

        let correctLetter = '';
        let currentField = null;

        block.split('\n').forEach((raw) => {
            const line = raw.trim();
            if (!line) return;
            if (/^-{3,}$/.test(line)) return;

            let m;

            if ((m = line.match(/^pregunta\s*:\s*(.*)$/i))) {
                currentField = 'question';
                obj.question = m[1].trim();
            } else if ((m = line.match(/^([A-D])\)\s*(.*)$/i))) {
                currentField = 'option';
                obj.options.push({
                    letter: m[1].toUpperCase(),
                    text: m[2].trim(),
                    isCorrect: false
                });
            } else if ((m = line.match(/^correcta\s*:\s*(.*)$/i))) {
                currentField = 'correct';
                correctLetter = m[1].trim().toUpperCase().charAt(0);
            } else if ((m = line.match(/^explicaci[oó]n(\s+[^:\n]*)?\s*:\s*(.*)$/i))) {
                currentField = 'explanation';
                obj.explanation = m[2].trim();
                if (m[1] && /apliqu/i.test(m[1])) {
                    obj.explanationLabel = 'Aplicación en el proyecto';
                }
            } else if ((m = line.match(/^referencia\s*:\s*(.*)$/i))) {
                currentField = 'reference';
                obj.reference = m[1].trim();
            } else {
                if (currentField === 'question') obj.question += ' ' + line;
                else if (currentField === 'option' && obj.options.length) {
                    obj.options[obj.options.length - 1].text += ' ' + line;
                } else if (currentField === 'explanation') obj.explanation += ' ' + line;
                else if (currentField === 'reference') obj.reference += ' ' + line;
            }
        });

        obj.options.forEach((opt) => {
            if (opt.letter === correctLetter) opt.isCorrect = true;
        });

        // Bug #2: rechazar preguntas sin opción correcta o con menos de 2 opciones.
        if (!obj.question || obj.options.length < 2) return null;
        if (!obj.options.some((o) => o.isCorrect)) return null;

        const correctOpt = obj.options.find((o) => o.isCorrect);

        return {
            question: obj.question,
            theory: correctOpt.text,
            explanation: obj.explanation,
            explanationLabel: obj.explanationLabel,
            reference: obj.reference,
            options: obj.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
        };
    }

    /* ------------------------------------------------------------------
       API PÚBLICA
       ------------------------------------------------------------------ */
    function parseText(text) {
        const normalized = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
        const blocks = normalized.split(/\n\s*-{3,}\s*(?=\n|$)/);
        const cards = [];

        blocks.forEach((block) => {
            if (!block.trim()) return;
            const format = detectFormat(block);
            const q = format === 'new' ? parseNewFormat(block) : parseOldFormat(block);

            if (
                q &&
                q.question &&
                q.options.length >= 2 &&
                q.options.some((o) => o.isCorrect)
            ) {
                cards.push(q);
            }
        });

        return cards;
    }

    global.Parser = {
        parseText: parseText,
        escapeHtml: escapeHtml,
        escapeHtmlWithBreaks: escapeHtmlWithBreaks
    };
})(window);