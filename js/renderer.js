/**
 * Ladder Draw - Canvas Renderer
 *
 * This module handles rendering the ladder on HTML5 Canvas
 * with pastel colors for vertical lines and clean styling.
 */

const LadderRenderer = (function() {
    'use strict';

    /**
     * Color for ladder lines (all black)
     */
    const LADDER_COLOR = '#000000';

    /**
     * Highlight color for selected path
     */
    const HIGHLIGHT_COLOR = '#E74C3C';

    /**
     * Pastel colors for participants
     */
    const PARTICIPANT_COLORS = [
        '#E57373', // Red
        '#64B5F6', // Blue
        '#81C784', // Green
        '#FFB74D', // Orange
        '#BA68C8', // Purple
        '#4DD0E1', // Cyan
        '#F06292', // Pink
        '#AED581', // Light Green
        '#FFD54F', // Yellow
        '#7986CB', // Indigo
        '#4DB6AC', // Teal
        '#FF8A65', // Deep Orange
        '#A1887F', // Brown
        '#90A4AE', // Blue Grey
        '#9575CD'  // Deep Purple
    ];

    /**
     * Rendering configuration
     */
    const CONFIG = {
        // Spacing
        COLUMN_WIDTH: 70,       // Horizontal spacing between vertical lines
        ROW_HEIGHT: 40,         // Default vertical spacing between rows
        MIN_ROW_HEIGHT: 4,      // Minimum row height (for many rows)
        PADDING_TOP: 60,        // Space for participant names
        PADDING_BOTTOM: 60,     // Space for results
        PADDING_HORIZONTAL: 40, // Left and right padding

        // Line styles
        VERTICAL_LINE_WIDTH: 3,
        HORIZONTAL_LINE_WIDTH: 2,
        HORIZONTAL_LINE_COLOR: '#000000',

        // Highlight styles
        HIGHLIGHT_LINE_WIDTH: 6,
        DIM_OPACITY: 0.2,

        // Text styles
        FONT_FAMILY: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif",
        NAME_FONT_SIZE: 14,
        RESULT_FONT_SIZE: 14,
        TEXT_COLOR: '#2D3748',
        MIN_FONT_SIZE: 8,              // Minimum font size for readability
        VERTICAL_TEXT_THRESHOLD: 25,   // Column width below which text is rotated vertically

        // Min/max canvas dimensions
        MIN_WIDTH: 300,
        MAX_WIDTH: 4000,
        MIN_HEIGHT: 300,
        MAX_HEIGHT: 6000           // Maximum canvas height to prevent rendering failures
    };

    /**
     * Render the ladder to a canvas
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {Object} ladderData - Data from Ladder.generate()
     * @param {Object} options - Rendering options
     * @param {number} options.highlightIndex - Index of participant to highlight (-1 for none)
     * @returns {void}
     */
    function render(canvas, ladderData, options = {}) {
        const ctx = canvas.getContext('2d');
        const dimensions = calculateDimensions(ladderData);
        const highlightIndex = options.highlightIndex !== undefined ? options.highlightIndex : -1;

        // Set canvas size (considering device pixel ratio for sharp rendering)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        canvas.style.width = dimensions.width + 'px';
        canvas.style.height = dimensions.height + 'px';
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Compute path color map for path-following rendering
        const pathColorMap = computePathColorMap(ladderData);

        // Compute highlight path if needed
        const highlightPath = highlightIndex >= 0 ? computeHighlightPath(ladderData, highlightIndex) : null;
        const highlightColor = highlightIndex >= 0 ? getParticipantColor(highlightIndex) : null;

        // Draw components
        drawParticipantNames(ctx, ladderData, dimensions, highlightIndex, highlightColor);
        drawVerticalSegments(ctx, ladderData, dimensions, pathColorMap, highlightPath, highlightColor);
        drawHorizontalLines(ctx, ladderData, dimensions, pathColorMap, highlightPath, highlightColor);
        drawResults(ctx, ladderData, dimensions, highlightIndex, highlightColor);
    }

    /**
     * Compute the path segments for a highlighted participant
     * @param {Object} ladderData - Ladder data
     * @param {number} startCol - Starting column index
     * @returns {Object} Path info with vertical and horizontal segments
     */
    function computeHighlightPath(ladderData, startCol) {
        const path = {
            vertical: new Set(),    // "col-row" keys
            horizontal: new Set()   // "row-fromCol" keys
        };

        // Create a lookup for horizontal lines by row
        const linesByRow = {};
        for (let row = 0; row < ladderData.rows; row++) {
            linesByRow[row] = [];
        }
        ladderData.horizontalLines.forEach(line => {
            linesByRow[line.row].push(line);
        });

        let currentCol = startCol;

        for (let row = 0; row < ladderData.rows; row++) {
            // Mark vertical segment before this row
            path.vertical.add(`${currentCol}-${row}`);

            // Check for horizontal lines at this row
            const linesAtRow = linesByRow[row];
            for (const line of linesAtRow) {
                if (line.fromColumn === currentCol) {
                    // Moving right
                    path.horizontal.add(`${row}-${line.fromColumn}`);
                    currentCol++;
                    break;
                } else if (line.fromColumn === currentCol - 1) {
                    // Moving left
                    path.horizontal.add(`${row}-${line.fromColumn}`);
                    currentCol--;
                    break;
                }
            }
        }

        // Mark final vertical segment
        path.vertical.add(`${currentCol}-${ladderData.rows}`);
        path.endCol = currentCol;

        return path;
    }

    /**
     * Calculate canvas dimensions based on ladder data
     * @param {Object} ladderData - The ladder data
     * @returns {Object} Dimensions object with width, height, and offsets
     */
    function calculateDimensions(ladderData) {
        const numColumns = ladderData.verticalLines;
        const numRows = ladderData.rows;

        // Calculate width based on number of columns
        const contentWidth = (numColumns - 1) * CONFIG.COLUMN_WIDTH;
        const width = Math.min(
            CONFIG.MAX_WIDTH,
            Math.max(CONFIG.MIN_WIDTH, contentWidth + CONFIG.PADDING_HORIZONTAL * 2)
        );

        // Calculate actual column width if we had to constrain
        const actualColumnWidth = numColumns > 1
            ? (width - CONFIG.PADDING_HORIZONTAL * 2) / (numColumns - 1)
            : CONFIG.COLUMN_WIDTH;

        // Calculate row height - shrink if too many rows
        const maxContentHeight = CONFIG.MAX_HEIGHT - CONFIG.PADDING_TOP - CONFIG.PADDING_BOTTOM;
        let rowHeight = CONFIG.ROW_HEIGHT;
        if (numRows * rowHeight > maxContentHeight) {
            rowHeight = Math.max(CONFIG.MIN_ROW_HEIGHT, maxContentHeight / numRows);
        }

        // Calculate height based on number of rows and actual row height
        const contentHeight = numRows * rowHeight;
        const height = Math.max(
            CONFIG.MIN_HEIGHT,
            Math.min(CONFIG.MAX_HEIGHT, contentHeight + CONFIG.PADDING_TOP + CONFIG.PADDING_BOTTOM)
        );

        return {
            width: width,
            height: height,
            columnWidth: actualColumnWidth,
            rowHeight: rowHeight,
            startX: CONFIG.PADDING_HORIZONTAL,
            startY: CONFIG.PADDING_TOP,
            endY: height - CONFIG.PADDING_BOTTOM
        };
    }

    /**
     * Get the color for a specific column (all black for normal, red for highlight)
     * @param {number} columnIndex - The column index
     * @param {boolean} isHighlighted - Whether this is a highlighted path
     * @returns {string} CSS color string
     */
    function getColumnColor(columnIndex, isHighlighted = false) {
        return isHighlighted ? HIGHLIGHT_COLOR : LADDER_COLOR;
    }

    /**
     * Get the participant color for a specific index
     * @param {number} index - The participant index
     * @returns {string} CSS color string
     */
    function getParticipantColor(index) {
        return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
    }

    /**
     * Get X coordinate for a column
     * @param {number} columnIndex - Column index
     * @param {Object} dimensions - Calculated dimensions
     * @returns {number} X coordinate
     */
    function getColumnX(columnIndex, dimensions) {
        return dimensions.startX + columnIndex * dimensions.columnWidth;
    }

    /**
     * Get Y coordinate for a row
     * @param {number} rowIndex - Row index
     * @param {Object} dimensions - Calculated dimensions
     * @returns {number} Y coordinate
     */
    function getRowY(rowIndex, dimensions) {
        return dimensions.startY + rowIndex * dimensions.rowHeight;
    }

    /**
     * Draw participant names at the top
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} ladderData - Ladder data
     * @param {Object} dimensions - Calculated dimensions
     * @param {number} highlightIndex - Index of highlighted participant (-1 for none)
     * @param {string} highlightColor - Color for highlighted participant (null if none)
     */
    function drawParticipantNames(ctx, ladderData, dimensions, highlightIndex, highlightColor) {
        const useVerticalText = dimensions.columnWidth < CONFIG.VERTICAL_TEXT_THRESHOLD;
        const fontSize = calculateDynamicFontSize(
            dimensions.columnWidth - 10,
            CONFIG.NAME_FONT_SIZE,
            CONFIG.MIN_FONT_SIZE
        );

        ladderData.participants.forEach((name, index) => {
            const x = getColumnX(index, dimensions);
            const y = dimensions.startY - 15; // Increased spacing from ladder
            const isHighlighted = highlightIndex === index;
            const isDimmed = highlightIndex >= 0 && !isHighlighted;

            // Apply opacity for dimmed items
            ctx.globalAlpha = isDimmed ? CONFIG.DIM_OPACITY : 1;

            // Get participant color (always use assigned color)
            const participantColor = getParticipantColor(index);

            // Draw circle above name with participant color
            ctx.fillStyle = participantColor;
            ctx.beginPath();
            const circleRadius = isHighlighted
                ? Math.max(6, Math.min(12, dimensions.columnWidth / 4))
                : Math.max(4, Math.min(8, dimensions.columnWidth / 6));
            ctx.arc(x, y - 25, circleRadius, 0, Math.PI * 2); // Moved circle higher
            ctx.fill();

            // Draw highlight ring for selected participant
            if (isHighlighted) {
                ctx.strokeStyle = participantColor;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y - 25, circleRadius + 4, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw name with participant color
            const fontWeight = isHighlighted ? '800' : '600';
            const adjustedFontSize = isHighlighted ? fontSize * 1.1 : fontSize;
            ctx.font = `${fontWeight} ${adjustedFontSize}px ${CONFIG.FONT_FAMILY}`;
            ctx.fillStyle = participantColor;

            if (useVerticalText) {
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                drawVerticalText(ctx, name, x, y - 2, CONFIG.PADDING_TOP - 25);
            } else {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                const displayName = truncateText(ctx, name, dimensions.columnWidth - 10);
                ctx.fillText(displayName, x, y);
            }

            ctx.globalAlpha = 1;
        });
    }

    /**
     * Draw vertical line segments (all black, with highlight path in participant color)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} ladderData - Ladder data
     * @param {Object} dimensions - Calculated dimensions
     * @param {Object} pathColorMap - Color map from computePathColorMap (unused, kept for API compatibility)
     * @param {Object} highlightPath - Highlight path info (null if no highlight)
     * @param {string} highlightColor - Color for highlighted path (null if none)
     */
    function drawVerticalSegments(ctx, ladderData, dimensions, pathColorMap, highlightPath, highlightColor) {
        ctx.lineCap = 'round';

        for (let col = 0; col < ladderData.verticalLines; col++) {
            const x = getColumnX(col, dimensions);

            // Draw segment from top to first row
            const firstKey = `${col}-0`;
            const firstIsHighlighted = highlightPath && highlightPath.vertical.has(firstKey);
            const firstIsDimmed = highlightPath && !firstIsHighlighted;

            ctx.globalAlpha = firstIsDimmed ? CONFIG.DIM_OPACITY : 1;
            ctx.lineWidth = firstIsHighlighted ? CONFIG.HIGHLIGHT_LINE_WIDTH : CONFIG.VERTICAL_LINE_WIDTH;
            ctx.strokeStyle = firstIsHighlighted ? highlightColor : LADDER_COLOR;
            ctx.beginPath();
            ctx.moveTo(x, dimensions.startY);
            ctx.lineTo(x, getRowY(0, dimensions));
            ctx.stroke();

            // Draw segments between rows
            for (let row = 0; row < ladderData.rows; row++) {
                // Segment from row i to row i+1 should use key i+1
                // (segment 0 is top to row 0, segment 1 is row 0 to row 1, etc.)
                const segmentKey = `${col}-${row + 1}`;
                const y1 = getRowY(row, dimensions);
                const y2 = row < ladderData.rows - 1 ? getRowY(row + 1, dimensions) : dimensions.endY;

                const isHighlighted = highlightPath && highlightPath.vertical.has(segmentKey);
                const isDimmed = highlightPath && !isHighlighted;

                ctx.globalAlpha = isDimmed ? CONFIG.DIM_OPACITY : 1;
                ctx.lineWidth = isHighlighted ? CONFIG.HIGHLIGHT_LINE_WIDTH : CONFIG.VERTICAL_LINE_WIDTH;
                ctx.strokeStyle = isHighlighted ? highlightColor : LADDER_COLOR;
                ctx.beginPath();
                ctx.moveTo(x, y1);
                ctx.lineTo(x, y2);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Draw horizontal lines (the "rungs" of the ladder) - all black, with highlight path in participant color
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} ladderData - Ladder data
     * @param {Object} dimensions - Calculated dimensions
     * @param {Object} pathColorMap - Color map from computePathColorMap (unused, kept for API compatibility)
     * @param {Object} highlightPath - Highlight path info (null if no highlight)
     * @param {string} highlightColor - Color for highlighted path (null if none)
     */
    function drawHorizontalLines(ctx, ladderData, dimensions, pathColorMap, highlightPath, highlightColor) {
        ctx.lineCap = 'round';

        ladderData.horizontalLines.forEach(line => {
            const x1 = getColumnX(line.fromColumn, dimensions);
            const x2 = getColumnX(line.fromColumn + 1, dimensions);
            const y = getRowY(line.row, dimensions);

            const horzKey = `${line.row}-${line.fromColumn}`;
            const isHighlighted = highlightPath && highlightPath.horizontal.has(horzKey);
            const isDimmed = highlightPath && !isHighlighted;

            ctx.globalAlpha = isDimmed ? CONFIG.DIM_OPACITY : 1;
            ctx.lineWidth = isHighlighted ? CONFIG.HIGHLIGHT_LINE_WIDTH : CONFIG.HORIZONTAL_LINE_WIDTH;
            ctx.strokeStyle = isHighlighted ? highlightColor : LADDER_COLOR;
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
        });

        ctx.globalAlpha = 1;
    }

    /**
     * Draw results at the bottom
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} ladderData - Ladder data
     * @param {Object} dimensions - Calculated dimensions
     * @param {number} highlightIndex - Index of highlighted participant (-1 for none)
     * @param {string} highlightColor - Color for highlighted result (null if none)
     */
    function drawResults(ctx, ladderData, dimensions, highlightIndex, highlightColor) {
        const useVerticalText = dimensions.columnWidth < CONFIG.VERTICAL_TEXT_THRESHOLD;
        const fontSize = calculateDynamicFontSize(
            dimensions.columnWidth - 10,
            CONFIG.RESULT_FONT_SIZE,
            CONFIG.MIN_FONT_SIZE
        );

        // Find which result column is highlighted (based on the participant's ending position)
        const highlightedResultCol = highlightIndex >= 0 ? ladderData.mapping[highlightIndex] : -1;

        // Create reverse mapping: result column -> participant index
        const reverseMapping = {};
        for (let participantIdx = 0; participantIdx < ladderData.participants.length; participantIdx++) {
            const resultCol = ladderData.mapping[participantIdx];
            reverseMapping[resultCol] = participantIdx;
        }

        ladderData.results.forEach((result, index) => {
            const x = getColumnX(index, dimensions);
            const y = dimensions.endY + 10;
            const isHighlighted = index === highlightedResultCol;
            const isDimmed = highlightIndex >= 0 && !isHighlighted;

            // Get the participant who ends up at this result position
            const participantIdx = reverseMapping[index];
            const resultColor = getParticipantColor(participantIdx);

            ctx.globalAlpha = isDimmed ? CONFIG.DIM_OPACITY : 1;

            // Draw indicator with matching participant color
            ctx.fillStyle = resultColor;
            ctx.beginPath();
            const triangleSize = isHighlighted
                ? Math.max(5, Math.min(10, dimensions.columnWidth / 5))
                : Math.max(3, Math.min(6, dimensions.columnWidth / 8));
            ctx.moveTo(x, y);
            ctx.lineTo(x - triangleSize, y + triangleSize + 2);
            ctx.lineTo(x + triangleSize, y + triangleSize + 2);
            ctx.closePath();
            ctx.fill();

            // Draw result text with matching participant color
            const fontWeight = isHighlighted ? '900' : '700';
            const adjustedFontSize = isHighlighted ? fontSize * 1.15 : fontSize;
            ctx.font = `${fontWeight} ${adjustedFontSize}px ${CONFIG.FONT_FAMILY}`;
            ctx.fillStyle = resultColor;

            if (useVerticalText) {
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                drawVerticalText(ctx, result, x, y + 14, CONFIG.PADDING_BOTTOM - 20);
            } else {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const displayResult = truncateText(ctx, result, dimensions.columnWidth - 10);
                ctx.fillText(displayResult, x, y + 12);
            }

            ctx.globalAlpha = 1;
        });
    }

    /**
     * Truncate text to fit within a maximum width
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} text - Text to truncate
     * @param {number} maxWidth - Maximum width in pixels
     * @returns {string} Truncated text
     */
    function truncateText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }

        let truncated = text;
        while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
            truncated = truncated.slice(0, -1);
        }
        return truncated + '...';
    }

    /**
     * Calculate dynamic font size based on available width
     * @param {number} availableWidth - Available width for text
     * @param {number} baseSize - Base font size
     * @param {number} minSize - Minimum font size
     * @returns {number} Calculated font size
     */
    function calculateDynamicFontSize(availableWidth, baseSize, minSize) {
        const targetChars = 4;
        const neededWidth = targetChars * baseSize * 0.7;
        if (availableWidth >= neededWidth) {
            return baseSize;
        }
        return Math.max(Math.floor(baseSize * availableWidth / neededWidth), minSize);
    }

    /**
     * Draw text vertically (rotated 90 degrees counter-clockwise)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} text - Text to draw
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} maxHeight - Maximum height for text
     */
    function drawVerticalText(ctx, text, x, y, maxHeight) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 2);
        const displayText = truncateText(ctx, text, maxHeight - 10);
        ctx.fillText(displayText, 0, 0);
        ctx.restore();
    }

    /**
     * Draw a rounded rectangle (cross-browser compatible)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number|Array} radius - Corner radius (number for all corners, or array [tl, tr, br, bl])
     */
    function drawRoundedRect(ctx, x, y, width, height, radius) {
        let tl, tr, br, bl;
        if (Array.isArray(radius)) {
            [tl, tr, br, bl] = radius;
        } else {
            tl = tr = br = bl = radius;
        }

        ctx.beginPath();
        ctx.moveTo(x + tl, y);
        ctx.lineTo(x + width - tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
        ctx.lineTo(x + width, y + height - br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
        ctx.lineTo(x + bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
        ctx.lineTo(x, y + tl);
        ctx.quadraticCurveTo(x, y, x + tl, y);
        ctx.closePath();
    }

    /**
     * Compute color map for path-following rendering
     * Each vertical segment and horizontal line is assigned the color of the path passing through it
     * @param {Object} ladderData - Ladder data
     * @returns {Object} Color map with vertical and horizontal segment colors
     */
    function computePathColorMap(ladderData) {
        const colorMap = {
            vertical: {},    // key: "col-row" -> color for segment from row to row+1
            horizontal: {}   // key: "row-fromCol" -> color
        };

        // Create a lookup for horizontal lines by row
        const linesByRow = {};
        for (let row = 0; row < ladderData.rows; row++) {
            linesByRow[row] = [];
        }
        ladderData.horizontalLines.forEach(line => {
            linesByRow[line.row].push(line);
        });

        // Trace each participant's path and assign colors
        for (let startCol = 0; startCol < ladderData.verticalLines; startCol++) {
            const color = getColumnColor(startCol);
            let currentCol = startCol;

            for (let row = 0; row < ladderData.rows; row++) {
                // Mark vertical segment before this row (from previous row to this row)
                const vertKey = `${currentCol}-${row}`;
                colorMap.vertical[vertKey] = color;

                // Check for horizontal lines at this row
                const linesAtRow = linesByRow[row];
                for (const line of linesAtRow) {
                    if (line.fromColumn === currentCol) {
                        // Moving right - mark horizontal line with this path's color
                        const horzKey = `${row}-${line.fromColumn}`;
                        colorMap.horizontal[horzKey] = color;
                        currentCol++;
                        break;
                    } else if (line.fromColumn === currentCol - 1) {
                        // Moving left - mark horizontal line with this path's color
                        const horzKey = `${row}-${line.fromColumn}`;
                        colorMap.horizontal[horzKey] = color;
                        currentCol--;
                        break;
                    }
                }
            }

            // Mark final vertical segment (from last row to bottom)
            const finalKey = `${currentCol}-${ladderData.rows}`;
            colorMap.vertical[finalKey] = color;
        }

        return colorMap;
    }

    /**
     * Export canvas as data URL
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {string} type - Image MIME type (default: 'image/png')
     * @param {number} quality - Image quality for JPEG (0-1)
     * @returns {string} Data URL
     */
    function toDataURL(canvas, type = 'image/png', quality = 0.92) {
        return canvas.toDataURL(type, quality);
    }

    /**
     * Export canvas as Blob
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {string} type - Image MIME type (default: 'image/png')
     * @param {number} quality - Image quality for JPEG (0-1)
     * @returns {Promise<Blob>} Promise resolving to Blob
     */
    function toBlob(canvas, type = 'image/png', quality = 0.92) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob from canvas'));
                    }
                },
                type,
                quality
            );
        });
    }

    /**
     * Render the ladder with result summary to a canvas for saving
     * @param {HTMLCanvasElement} sourceCanvas - The source ladder canvas
     * @param {Object} ladderData - The ladder data
     * @returns {HTMLCanvasElement} New canvas with ladder + results
     */
    function renderWithResults(sourceCanvas, ladderData) {
        const results = [];
        for (let i = 0; i < ladderData.participants.length; i++) {
            const endCol = ladderData.mapping[i];
            results.push({
                participant: ladderData.participants[i],
                result: ladderData.results[endCol],
                color: getParticipantColor(i)  // Use participant color
            });
        }

        // Calculate result summary dimensions
        const padding = 20;
        const itemHeight = 24; // Single row height
        const itemMargin = 6;
        const itemWidth = 140; // Fixed width per item
        const dpr = window.devicePixelRatio || 1;
        const availableWidth = sourceCanvas.width / dpr - padding * 2;

        // Calculate columns based on available width
        const columns = Math.max(1, Math.floor((availableWidth + itemMargin) / (itemWidth + itemMargin)));
        const rows = Math.ceil(results.length / columns);

        // Calculate total used width for centering
        const totalUsedWidth = columns * itemWidth + (columns - 1) * itemMargin;
        const startX = (sourceCanvas.width / dpr - totalUsedWidth) / 2;

        const titleHeight = 30;
        const summaryHeight = titleHeight + rows * (itemHeight + itemMargin) + padding;

        // Create combined canvas
        const sourceWidth = sourceCanvas.width / dpr;
        const sourceHeight = sourceCanvas.height / dpr;

        const combinedCanvas = document.createElement('canvas');
        const totalHeight = summaryHeight + 20 + sourceHeight;
        combinedCanvas.width = sourceWidth * dpr;
        combinedCanvas.height = totalHeight * dpr;

        const ctx = combinedCanvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Fill background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, sourceWidth, totalHeight);

        // Draw "결과" title at the top
        ctx.font = `700 16px ${CONFIG.FONT_FAMILY}`;
        ctx.fillStyle = '#2D3748';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('결과', sourceWidth / 2, padding);

        // Draw result items
        const startY = padding + titleHeight;

        results.forEach((item, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);

            const x = startX + col * (itemWidth + itemMargin);
            const y = startY + row * (itemHeight + itemMargin);

            // Draw background
            ctx.fillStyle = '#F7FAFC';
            drawRoundedRect(ctx, x, y, itemWidth, itemHeight, 4);
            ctx.fill();

            // Draw color indicator
            ctx.fillStyle = item.color;
            drawRoundedRect(ctx, x, y, 3, itemHeight, [4, 0, 0, 4]);
            ctx.fill();

            // Draw single row: "participant → result"
            ctx.font = `600 11px ${CONFIG.FONT_FAMILY}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const centerY = y + itemHeight / 2;

            // Measure and truncate text to fit
            const arrowWidth = ctx.measureText(' → ').width;
            const maxNameWidth = (itemWidth - 16 - arrowWidth) / 2;

            ctx.fillStyle = '#2D3748';
            const participantText = truncateText(ctx, item.participant, maxNameWidth);
            ctx.fillText(participantText, x + 10, centerY);

            const nameWidth = ctx.measureText(participantText).width;
            ctx.fillStyle = '#A0AEC0';
            ctx.fillText(' → ', x + 10 + nameWidth, centerY);

            ctx.font = `700 11px ${CONFIG.FONT_FAMILY}`;
            ctx.fillStyle = item.color;
            const resultText = truncateText(ctx, item.result, maxNameWidth);
            ctx.fillText(resultText, x + 10 + nameWidth + arrowWidth, centerY);
        });

        // Draw divider line
        const dividerY = summaryHeight + 10;
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, dividerY);
        ctx.lineTo(sourceWidth - padding, dividerY);
        ctx.stroke();

        // Draw ladder canvas below the results
        ctx.drawImage(sourceCanvas, 0, 0, sourceWidth, sourceHeight, 0, summaryHeight + 20, sourceWidth, sourceHeight);

        return combinedCanvas;
    }

    /**
     * Get participant index from canvas click coordinates
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {Object} ladderData - Ladder data
     * @param {number} clientX - Click X coordinate (relative to viewport)
     * @param {number} clientY - Click Y coordinate (relative to viewport)
     * @returns {number} Participant index or -1 if not found
     */
    function getParticipantIndexFromClick(canvas, ladderData, clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const dimensions = calculateDimensions(ladderData);

        // Check if click is in the participant name area (top region)
        const nameAreaTop = 0;
        const nameAreaBottom = dimensions.startY;

        if (y >= nameAreaTop && y <= nameAreaBottom) {
            // Find the closest column
            for (let i = 0; i < ladderData.verticalLines; i++) {
                const colX = getColumnX(i, dimensions);
                const hitRadius = dimensions.columnWidth / 2;

                if (Math.abs(x - colX) <= hitRadius) {
                    return i;
                }
            }
        }

        return -1;
    }

    /**
     * Get dimensions for a ladder (for external use)
     * @param {Object} ladderData - Ladder data
     * @returns {Object} Dimensions object
     */
    function getDimensions(ladderData) {
        return calculateDimensions(ladderData);
    }

    // Public API
    return {
        render: render,
        renderWithResults: renderWithResults,
        toDataURL: toDataURL,
        toBlob: toBlob,
        getColumnColor: getColumnColor,
        getParticipantColor: getParticipantColor,
        getParticipantIndexFromClick: getParticipantIndexFromClick,
        getDimensions: getDimensions
    };
})();
