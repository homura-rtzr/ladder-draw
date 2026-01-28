/**
 * Ladder Draw - Save Functionality
 *
 * This module handles:
 * - Exporting ladder results as images (with result table)
 * - Download functionality
 */

const LadderShare = (function() {
    'use strict';

    /**
     * Save the ladder result with results table
     * @param {HTMLCanvasElement} canvas - The rendered canvas
     * @param {Object} ladderData - The ladder data
     */
    async function share(canvas, ladderData) {
        const filename = generateFilename();

        // Create combined canvas with results
        const combinedCanvas = LadderRenderer.renderWithResults(canvas, ladderData);

        // Download the image
        downloadImage(combinedCanvas, filename);
    }

    /**
     * Check if Web Share API is available and supports files
     * @returns {boolean}
     */
    function canUseWebShare() {
        return navigator.share && navigator.canShare;
    }

    /**
     * Share via Web Share API
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {string} filename - Filename for the shared file
     */
    async function shareViaWebShare(canvas, filename) {
        const blob = await LadderRenderer.toBlob(canvas);
        const file = new File([blob], filename, { type: 'image/png' });

        const shareData = {
            title: '사다리 타기 결과',
            text: '사다리 타기 결과를 확인하세요!',
            files: [file]
        };

        // Check if we can share files
        if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            // Try sharing without files
            await navigator.share({
                title: shareData.title,
                text: shareData.text
            });
            // Also download the image
            downloadImage(canvas, filename);
        }
    }

    /**
     * Download the canvas as an image file
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {string} filename - Filename for download
     */
    function downloadImage(canvas, filename) {
        const dataURL = LadderRenderer.toDataURL(canvas);

        const link = document.createElement('a');
        link.download = filename;
        link.href = dataURL;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Generate a filename with timestamp
     * @returns {string} Filename
     */
    function generateFilename() {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, 19);
        return `ladder-result-${timestamp}.png`;
    }

    /**
     * Copy image to clipboard (if supported)
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @returns {Promise<boolean>} Success status
     */
    async function copyToClipboard(canvas) {
        if (!navigator.clipboard || !navigator.clipboard.write) {
            return false;
        }

        try {
            const blob = await LadderRenderer.toBlob(canvas);
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }

    /**
     * Generate a shareable URL with encoded data
     * Note: This creates a URL that can be used to recreate the ladder
     * @param {Object} ladderData - The ladder data
     * @returns {string|null} Shareable URL or null if too long
     */
    function generateShareableURL(ladderData) {
        try {
            const data = {
                p: ladderData.participants,
                r: ladderData.results
            };

            const encoded = btoa(encodeURIComponent(JSON.stringify(data)));

            // Check URL length (most browsers support ~2000 chars)
            const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;

            if (url.length > 2000) {
                return null; // Too long for URL
            }

            return url;
        } catch (error) {
            console.error('Failed to generate shareable URL:', error);
            return null;
        }
    }

    /**
     * Parse data from a shareable URL
     * @param {string} urlString - The URL to parse
     * @returns {Object|null} Parsed data or null if invalid
     */
    function parseShareableURL(urlString) {
        try {
            const url = new URL(urlString);
            const encoded = url.searchParams.get('data');

            if (!encoded) {
                return null;
            }

            const decoded = JSON.parse(decodeURIComponent(atob(encoded)));

            return {
                participants: decoded.p,
                results: decoded.r
            };
        } catch (error) {
            console.error('Failed to parse shareable URL:', error);
            return null;
        }
    }

    // Public API
    return {
        share: share,
        downloadImage: downloadImage,
        copyToClipboard: copyToClipboard,
        generateShareableURL: generateShareableURL,
        parseShareableURL: parseShareableURL
    };
})();
