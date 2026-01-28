/**
 * Ladder Draw - Ladder Generation and Calculation Logic
 *
 * This module handles:
 * - Generating random horizontal lines for the ladder
 * - Calculating results by tracing paths from top to bottom
 *
 * Uses Fisher-Yates shuffle for mathematically guaranteed uniform distribution,
 * combined with natural-looking random ladder generation.
 */

const Ladder = (function() {
    'use strict';

    /**
     * Configuration for ladder generation
     */
    const CONFIG = {
        MIN_ROWS: 6,
        ROWS_PER_PARTICIPANT: 3.0,  // Base rows per participant
        MAX_ROWS: 200,              // Maximum rows for visual ladder
        LINE_DENSITY: 0.5,          // Probability of horizontal line at each position
        FILL_DENSITY: 0.4           // Probability of filling empty spaces with decorative pairs
    };

    /**
     * Generate a random mapping using Fisher-Yates shuffle
     * Guarantees uniform distribution of all permutations
     * @param {number} n - Number of elements
     * @returns {Object.<number, number>} Mapping of start index to end index
     */
    function generateRandomMapping(n) {
        const shuffled = [...Array(n).keys()];
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const mapping = {};
        for (let i = 0; i < n; i++) {
            mapping[shuffled[i]] = i;
        }
        return mapping;
    }

    /**
     * Generate random horizontal lines for visual appeal
     * @param {number} numColumns - Number of columns
     * @param {number} numRows - Number of rows
     * @returns {Array} Array of horizontal lines
     */
    function generateRandomLines(numColumns, numRows) {
        const lines = [];

        for (let row = 1; row < numRows; row++) {
            const usedColumns = new Set();

            for (let col = 0; col < numColumns - 1; col++) {
                if (usedColumns.has(col) || usedColumns.has(col + 1)) {
                    continue;
                }

                if (Math.random() < CONFIG.LINE_DENSITY) {
                    lines.push({ fromColumn: col, row: row });
                    usedColumns.add(col);
                    usedColumns.add(col + 1);
                }
            }
        }

        return lines;
    }

    /**
     * Calculate mapping by tracing paths through the ladder
     * @param {number} numColumns - Number of columns
     * @param {number} numRows - Number of rows
     * @param {Array} horizontalLines - Array of horizontal lines
     * @returns {Object.<number, number>} Mapping of start to end positions
     */
    function calculateMapping(numColumns, numRows, horizontalLines) {
        const linesByRow = {};
        for (let row = 0; row < numRows; row++) {
            linesByRow[row] = [];
        }
        horizontalLines.forEach(line => {
            if (linesByRow[line.row]) {
                linesByRow[line.row].push(line);
            }
        });

        const mapping = {};
        for (let startCol = 0; startCol < numColumns; startCol++) {
            let currentCol = startCol;

            for (let row = 0; row < numRows; row++) {
                const linesAtRow = linesByRow[row] || [];
                for (const line of linesAtRow) {
                    if (line.fromColumn === currentCol) {
                        currentCol++;
                        break;
                    } else if (line.fromColumn === currentCol - 1) {
                        currentCol--;
                        break;
                    }
                }
            }

            mapping[startCol] = currentCol;
        }

        return mapping;
    }

    /**
     * Calculate adjustment transpositions to convert actualMapping to targetMapping
     * @param {Object} actualMapping - Current mapping from ladder
     * @param {Object} targetMapping - Desired mapping (Fisher-Yates)
     * @param {number} n - Number of elements
     * @returns {number[]} Array of column indices for adjustment transpositions
     */
    function calculateAdjustmentTranspositions(actualMapping, targetMapping, n) {
        // Current state: where each participant currently ends up
        // We need to transform this to targetMapping

        // Build current permutation: position -> participant
        const currentPerm = new Array(n);
        for (let p = 0; p < n; p++) {
            currentPerm[actualMapping[p]] = p;
        }

        // Build target permutation: position -> participant
        const targetPerm = new Array(n);
        for (let p = 0; p < n; p++) {
            targetPerm[targetMapping[p]] = p;
        }

        // Now transform currentPerm into targetPerm using adjacent swaps
        const transpositions = [];
        const working = [...currentPerm];

        for (let pos = 0; pos < n; pos++) {
            // Find where targetPerm[pos] currently is in working
            let currentPos = working.indexOf(targetPerm[pos]);

            // Bubble it to position pos
            while (currentPos > pos) {
                [working[currentPos - 1], working[currentPos]] =
                    [working[currentPos], working[currentPos - 1]];
                transpositions.push(currentPos - 1);
                currentPos--;
            }
        }

        return transpositions;
    }

    /**
     * Add adjustment lines to the ladder (preserving transposition order)
     * @param {Array} lines - Existing horizontal lines
     * @param {number[]} transpositions - Adjustment transpositions
     * @param {number} startRow - Starting row for adjustments
     * @param {number} numColumns - Number of columns
     * @returns {{lines: Array, numRows: number}} Updated lines and row count
     */
    function addAdjustmentLines(lines, transpositions, startRow, numColumns) {
        const result = [...lines];
        const rows = [];
        let minRowIdx = 0; // Preserve order: next transposition must be >= this row

        for (const col of transpositions) {
            // Try to place in existing adjustment rows (starting from minRowIdx)
            let placed = false;
            for (let i = minRowIdx; i < rows.length; i++) {
                const usedCols = rows[i];
                if (!usedCols.has(col) && !usedCols.has(col + 1)) {
                    result.push({ fromColumn: col, row: startRow + i });
                    usedCols.add(col);
                    usedCols.add(col + 1);
                    placed = true;
                    minRowIdx = i; // Next must be in this row or later
                    break;
                }
            }

            if (!placed) {
                const newRow = new Set([col, col + 1]);
                rows.push(newRow);
                result.push({ fromColumn: col, row: startRow + rows.length - 1 });
                minRowIdx = rows.length - 1;
            }
        }

        const totalRows = startRow + Math.max(1, rows.length);
        return { lines: result, numRows: totalRows };
    }

    /**
     * Generate a random ladder structure with guaranteed uniform distribution
     * @param {string[]} participants - List of participant names
     * @param {string[]} results - List of result items
     * @returns {LadderData} Generated ladder data
     */
    function generate(participants, results) {
        const numColumns = participants.length;

        // 1. Determine base row count for visual ladder
        const baseRows = Math.max(
            CONFIG.MIN_ROWS,
            Math.min(CONFIG.MAX_ROWS, Math.round(numColumns * CONFIG.ROWS_PER_PARTICIPANT))
        );

        // 2. Generate random horizontal lines (natural looking)
        let horizontalLines = generateRandomLines(numColumns, baseRows);

        // 3. Calculate actual mapping from this random ladder
        const actualMapping = calculateMapping(numColumns, baseRows, horizontalLines);

        // 4. Generate target mapping using Fisher-Yates (uniform distribution)
        const targetMapping = generateRandomMapping(numColumns);

        // 5. Calculate adjustment transpositions
        const adjustments = calculateAdjustmentTranspositions(actualMapping, targetMapping, numColumns);

        // 6. Add adjustment lines at the end
        const { lines: finalLines, numRows } = addAdjustmentLines(
            horizontalLines,
            adjustments,
            baseRows,
            numColumns
        );

        // 7. Fill empty spaces with decorative pairs (cancel each other out)
        const filledLines = fillWithDecorativePairs(finalLines, numRows + 1, numColumns);

        // Sort lines by row for consistent rendering
        filledLines.sort((a, b) => a.row - b.row || a.fromColumn - b.fromColumn);

        return {
            participants: participants,
            results: results,
            verticalLines: numColumns,
            rows: numRows + 1,
            horizontalLines: filledLines,
            mapping: targetMapping
        };
    }

    /**
     * Fill empty spaces with decorative pairs that cancel each other
     * Adding a line at (col, row) and (col, row+1) cancels out
     * @param {Array} lines - Existing horizontal lines
     * @param {number} numRows - Total number of rows
     * @param {number} numColumns - Number of columns
     * @returns {Array} Lines with decorative pairs added
     */
    function fillWithDecorativePairs(lines, numRows, numColumns) {
        // Build usage map
        const usedByRow = new Map();
        for (const line of lines) {
            if (!usedByRow.has(line.row)) usedByRow.set(line.row, new Set());
            usedByRow.get(line.row).add(line.fromColumn);
            usedByRow.get(line.row).add(line.fromColumn + 1);
        }

        const result = [...lines];

        // Fill pairs in consecutive rows
        for (let row = 1; row < numRows - 1; row += 2) {
            const usedThisRow = usedByRow.get(row) || new Set();
            const usedNextRow = usedByRow.get(row + 1) || new Set();

            for (let col = 0; col < numColumns - 1; col++) {
                // Skip if already used
                if (usedThisRow.has(col) || usedThisRow.has(col + 1)) continue;
                if (usedNextRow.has(col) || usedNextRow.has(col + 1)) continue;

                if (Math.random() < CONFIG.FILL_DENSITY) {
                    // Add canceling pair
                    result.push({ fromColumn: col, row: row });
                    result.push({ fromColumn: col, row: row + 1 });
                    usedThisRow.add(col);
                    usedThisRow.add(col + 1);
                    usedNextRow.add(col);
                    usedNextRow.add(col + 1);
                }
            }

            usedByRow.set(row, usedThisRow);
            usedByRow.set(row + 1, usedNextRow);
        }

        return result;
    }

    /**
     * Get result for a specific participant
     * @param {LadderData} ladderData - The ladder data
     * @param {number} participantIndex - Index of the participant
     * @returns {string} The result for this participant
     */
    function getResultForParticipant(ladderData, participantIndex) {
        const resultIndex = ladderData.mapping[participantIndex];
        return ladderData.results[resultIndex] || '';
    }

    /**
     * Get all results as participant-result pairs
     * @param {LadderData} ladderData - The ladder data
     * @returns {Array.<{participant: string, result: string, participantIndex: number, resultIndex: number}>}
     */
    function getAllResults(ladderData) {
        return ladderData.participants.map((participant, index) => {
            const resultIndex = ladderData.mapping[index];
            return {
                participant: participant,
                result: ladderData.results[resultIndex] || '',
                participantIndex: index,
                resultIndex: resultIndex
            };
        });
    }

    /**
     * Trace the path from a starting position (for animation or highlighting)
     * @param {LadderData} ladderData - The ladder data
     * @param {number} startColumn - Starting column index
     * @returns {Array.<{col: number, row: number}>} Array of positions along the path
     */
    function tracePath(ladderData, startColumn) {
        const path = [{ col: startColumn, row: -1 }];
        let currentCol = startColumn;

        const linesByRow = {};
        for (let row = 0; row < ladderData.rows; row++) {
            linesByRow[row] = [];
        }
        ladderData.horizontalLines.forEach(line => {
            if (linesByRow[line.row]) {
                linesByRow[line.row].push(line);
            }
        });

        for (let row = 0; row < ladderData.rows; row++) {
            const linesAtRow = linesByRow[row] || [];
            let moved = false;

            for (const line of linesAtRow) {
                if (line.fromColumn === currentCol) {
                    path.push({ col: currentCol, row: row, beforeMove: true });
                    currentCol++;
                    path.push({ col: currentCol, row: row, afterMove: true });
                    moved = true;
                    break;
                } else if (line.fromColumn === currentCol - 1) {
                    path.push({ col: currentCol, row: row, beforeMove: true });
                    currentCol--;
                    path.push({ col: currentCol, row: row, afterMove: true });
                    moved = true;
                    break;
                }
            }

            if (!moved) {
                path.push({ col: currentCol, row: row });
            }
        }

        path.push({ col: currentCol, row: ladderData.rows });

        return path;
    }

    // Public API
    return {
        generate: generate,
        getResultForParticipant: getResultForParticipant,
        getAllResults: getAllResults,
        tracePath: tracePath
    };
})();
