/**
 * Ladder Draw - Main Application
 *
 * This module handles:
 * - User input processing and validation
 * - UI state management
 * - Coordination between ladder logic and rendering
 */

(function() {
    'use strict';

    /**
     * DOM Element references
     */
    const elements = {
        // Input section
        inputSection: document.getElementById('input-section'),
        participantsTextarea: document.getElementById('participants'),
        resultsTextarea: document.getElementById('results'),
        participantCount: document.getElementById('participant-count'),
        resultCount: document.getElementById('result-count'),
        errorMessage: document.getElementById('error-message'),
        startButton: document.getElementById('start-button'),

        // Result section
        resultSection: document.getElementById('result-section'),
        canvas: document.getElementById('ladder-canvas'),
        resultSummary: document.getElementById('result-summary'),
        shareButton: document.getElementById('share-button'),
        resetButton: document.getElementById('reset-button'),

        // CSV import
        participantsCsvBtn: document.getElementById('participants-csv-btn'),
        participantsCsvInput: document.getElementById('participants-csv-input'),
        resultsCsvBtn: document.getElementById('results-csv-btn'),
        resultsCsvInput: document.getElementById('results-csv-input')
    };

    /**
     * Application state
     */
    let state = {
        ladderData: null,
        highlightIndex: -1  // Currently highlighted participant index (-1 = none)
    };

    /**
     * Initialize the application
     */
    function init() {
        bindEvents();
        loadFromStorage();
        updateCounts();
    }

    /**
     * Bind event listeners
     */
    function bindEvents() {
        // Input events
        elements.participantsTextarea.addEventListener('input', handleParticipantsInput);
        elements.resultsTextarea.addEventListener('input', handleResultsInput);
        elements.startButton.addEventListener('click', handleStart);

        // Result events
        elements.shareButton.addEventListener('click', handleShare);
        elements.resetButton.addEventListener('click', handleReset);

        // Canvas click event for selecting participants
        elements.canvas.addEventListener('click', handleCanvasClick);

        // Click outside to deselect
        document.addEventListener('click', handleDocumentClick);

        // CSV import events
        elements.participantsCsvBtn.addEventListener('click', () => elements.participantsCsvInput.click());
        elements.resultsCsvBtn.addEventListener('click', () => elements.resultsCsvInput.click());
        elements.participantsCsvInput.addEventListener('change', (e) => handleCsvImport(e, elements.participantsTextarea));
        elements.resultsCsvInput.addEventListener('change', (e) => handleCsvImport(e, elements.resultsTextarea));

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyDown);
    }

    /**
     * Handle participants input change
     */
    function handleParticipantsInput() {
        updateCounts();
        saveToStorage();
        hideError();
    }

    /**
     * Handle results input change
     */
    function handleResultsInput() {
        updateCounts();
        saveToStorage();
        hideError();
    }

    /**
     * Update the participant and result counts
     */
    function updateCounts() {
        const participants = parseTextareaLines(elements.participantsTextarea.value);
        const results = parseTextareaLines(elements.resultsTextarea.value);

        elements.participantCount.textContent = participants.length;
        elements.resultCount.textContent = results.length;
    }

    /**
     * Parse textarea content into array of non-empty lines
     * @param {string} text - Textarea content
     * @returns {string[]} Array of trimmed, non-empty lines
     */
    function parseTextareaLines(text) {
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    /**
     * Parse CSV content into array of items
     * Supports: newline-separated, comma-separated, or mixed format
     * @param {string} text - CSV content
     * @returns {string[]} Array of trimmed, non-empty items
     */
    function parseCsvContent(text) {
        // Replace commas with newlines, then split by newlines
        return text
            .replace(/,/g, '\n')
            .split('\n')
            .map(item => item.trim())
            .filter(item => item.length > 0);
    }

    /**
     * Handle CSV file import
     * @param {Event} event - File input change event
     * @param {HTMLTextAreaElement} targetTextarea - Target textarea to populate
     */
    function handleCsvImport(event, targetTextarea) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const items = parseCsvContent(content);
            targetTextarea.value = items.join('\n');
            updateCounts();
            saveToStorage();
            hideError();
        };
        reader.readAsText(file);

        // Reset input so the same file can be selected again
        event.target.value = '';
    }

    /**
     * Handle start button click
     */
    function handleStart() {
        const participants = parseTextareaLines(elements.participantsTextarea.value);
        const results = parseTextareaLines(elements.resultsTextarea.value);

        // Validation
        const validationError = validateInputs(participants, results);
        if (validationError) {
            showError(validationError);
            return;
        }

        // Generate ladder
        state.ladderData = Ladder.generate(participants, results);

        // Render ladder
        LadderRenderer.render(elements.canvas, state.ladderData);

        // Show result summary
        displayResultSummary(state.ladderData);

        // Switch to result view
        showResultSection();
    }

    /**
     * Validate user inputs
     * @param {string[]} participants - List of participants
     * @param {string[]} results - List of results
     * @returns {string|null} Error message or null if valid
     */
    function validateInputs(participants, results) {
        if (participants.length < 2) {
            return '참여자를 최소 2명 이상 입력해주세요.';
        }

        if (results.length < 2) {
            return '결과 항목을 최소 2개 이상 입력해주세요.';
        }

        if (participants.length !== results.length) {
            return `참여자 수(${participants.length}명)와 결과 항목 수(${results.length}개)가 일치해야 합니다.`;
        }

        if (participants.length > 100) {
            return '참여자는 최대 100명까지 지원됩니다.';
        }

        // Check for duplicates
        const participantSet = new Set(participants);
        if (participantSet.size !== participants.length) {
            return '중복된 참여자 이름이 있습니다.';
        }

        return null;
    }

    /**
     * Display the result summary below the ladder
     * @param {Object} ladderData - The ladder data
     */
    function displayResultSummary(ladderData) {
        const results = Ladder.getAllResults(ladderData);
        elements.resultSummary.innerHTML = '';

        results.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'result-item';
            const participantColor = LadderRenderer.getParticipantColor(index);
            div.style.borderLeftColor = participantColor;  // Participant color border
            div.dataset.participantIndex = index;

            div.innerHTML = `
                <span class="result-item__participant" style="color: ${participantColor}">${escapeHtml(item.participant)}</span>
                <span class="result-item__arrow">\u2193</span>
                <span class="result-item__result" style="color: ${participantColor}">${escapeHtml(item.result)}</span>
            `;

            // Add click handler for highlight
            div.addEventListener('click', (e) => handleResultItemClick(index, e));

            elements.resultSummary.appendChild(div);
        });
    }

    /**
     * Handle result item click for highlighting
     * @param {number} index - Participant index
     * @param {Event} event - Click event
     */
    function handleResultItemClick(index, event) {
        // Stop propagation to prevent document click handler from deselecting
        if (event) {
            event.stopPropagation();
        }

        // Toggle highlight
        if (state.highlightIndex === index) {
            state.highlightIndex = -1;
        } else {
            state.highlightIndex = index;
        }

        // Re-render with highlight
        LadderRenderer.render(elements.canvas, state.ladderData, {
            highlightIndex: state.highlightIndex
        });

        // Update result item highlighting
        updateResultItemHighlights();

        // Scroll to participant's position in canvas if highlighting
        if (state.highlightIndex >= 0) {
            scrollToParticipant(state.highlightIndex);
        }
    }

    /**
     * Handle canvas click for selecting participants
     * @param {MouseEvent} event - Click event
     */
    function handleCanvasClick(event) {
        if (!state.ladderData) return;

        // Stop propagation to prevent document click handler from deselecting
        event.stopPropagation();

        const index = LadderRenderer.getParticipantIndexFromClick(
            elements.canvas,
            state.ladderData,
            event.clientX,
            event.clientY
        );

        if (index >= 0) {
            // Toggle highlight
            if (state.highlightIndex === index) {
                state.highlightIndex = -1;
            } else {
                state.highlightIndex = index;
            }

            // Re-render with highlight
            LadderRenderer.render(elements.canvas, state.ladderData, {
                highlightIndex: state.highlightIndex
            });

            // Update result item highlighting
            updateResultItemHighlights();

            // Scroll to participant's position if highlighting
            if (state.highlightIndex >= 0) {
                scrollToParticipant(state.highlightIndex);
            }
        } else {
            // Clicked on canvas but not on a participant - deselect
            if (state.highlightIndex >= 0) {
                state.highlightIndex = -1;
                LadderRenderer.render(elements.canvas, state.ladderData, {
                    highlightIndex: state.highlightIndex
                });
                updateResultItemHighlights();
            }
        }
    }

    /**
     * Handle document click for deselecting
     * @param {MouseEvent} event - Click event
     */
    function handleDocumentClick(event) {
        // Only handle if result section is visible and something is highlighted
        if (elements.resultSection.hidden || state.highlightIndex < 0) return;

        // Check if click is inside result summary or canvas container
        const isInsideResultSummary = elements.resultSummary.contains(event.target);
        const isInsideCanvas = elements.canvas.contains(event.target);

        // If click is outside both areas, deselect
        if (!isInsideResultSummary && !isInsideCanvas) {
            state.highlightIndex = -1;
            LadderRenderer.render(elements.canvas, state.ladderData, {
                highlightIndex: state.highlightIndex
            });
            updateResultItemHighlights();
        }
    }

    /**
     * Scroll to a participant's position in the canvas
     * @param {number} index - Participant index
     */
    function scrollToParticipant(index) {
        if (!state.ladderData) return;

        const dimensions = LadderRenderer.getDimensions(state.ladderData);
        const canvasRect = elements.canvas.getBoundingClientRect();
        const containerRect = elements.canvas.parentElement.getBoundingClientRect();

        // Calculate the x position of the participant column
        const participantX = dimensions.startX + index * dimensions.columnWidth;

        // Calculate scroll position to center the participant
        const scrollLeft = participantX - containerRect.width / 2;

        // Scroll the canvas container horizontally
        elements.canvas.parentElement.scrollTo({
            left: Math.max(0, scrollLeft),
            behavior: 'smooth'
        });
    }

    /**
     * Update visual highlighting on result items
     */
    function updateResultItemHighlights() {
        const items = elements.resultSummary.querySelectorAll('.result-item');
        items.forEach((item, index) => {
            if (state.highlightIndex === -1) {
                item.classList.remove('result-item--highlighted', 'result-item--dimmed');
                item.style.borderLeftColor = '#000000';  // Black border
            } else if (index === state.highlightIndex) {
                item.classList.add('result-item--highlighted');
                item.classList.remove('result-item--dimmed');
                item.style.borderLeftColor = '#E74C3C';  // Red highlight border
            } else {
                item.classList.add('result-item--dimmed');
                item.classList.remove('result-item--highlighted');
                item.style.borderLeftColor = '#000000';  // Black border
            }
        });
    }

    /**
     * Handle share button click
     */
    function handleShare() {
        if (typeof LadderShare !== 'undefined') {
            LadderShare.share(elements.canvas, state.ladderData);
        }
    }

    /**
     * Handle reset button click
     */
    function handleReset() {
        state.ladderData = null;
        state.highlightIndex = -1;
        showInputSection();
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event
     */
    function handleKeyDown(event) {
        // Ctrl/Cmd + Enter to start
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            if (!elements.inputSection.hidden) {
                handleStart();
            }
        }

        // Escape to reset from result view
        if (event.key === 'Escape' && !elements.resultSection.hidden) {
            handleReset();
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.hidden = false;
        elements.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Hide error message
     */
    function hideError() {
        elements.errorMessage.hidden = true;
    }

    /**
     * Switch to result section view
     */
    function showResultSection() {
        elements.inputSection.hidden = true;
        elements.resultSection.hidden = false;
        elements.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Switch to input section view
     */
    function showInputSection() {
        elements.resultSection.hidden = true;
        elements.inputSection.hidden = false;
        hideError();
    }

    /**
     * Save current input to localStorage
     */
    function saveToStorage() {
        try {
            localStorage.setItem('ladder-draw-participants', elements.participantsTextarea.value);
            localStorage.setItem('ladder-draw-results', elements.resultsTextarea.value);
        } catch (e) {
            // Storage might not be available
        }
    }

    /**
     * Load saved input from localStorage
     */
    function loadFromStorage() {
        try {
            const savedParticipants = localStorage.getItem('ladder-draw-participants');
            const savedResults = localStorage.getItem('ladder-draw-results');

            if (savedParticipants) {
                elements.participantsTextarea.value = savedParticipants;
            }
            if (savedResults) {
                elements.resultsTextarea.value = savedResults;
            }
        } catch (e) {
            // Storage might not be available
        }
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
