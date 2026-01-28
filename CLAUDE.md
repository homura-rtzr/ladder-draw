# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ladder Draw (사다리 타기) is a Korean ladder game web application for random selection/drawing. Users enter participants and results, and the app generates a random ladder that maps each participant to a result. The UI is in Korean.

## Development

This is a static web application with no build system or dependencies. To run locally, serve the files with any static file server (e.g., `python3 -m http.server`) and open `index.html` in a browser.

## Architecture

The app uses vanilla JavaScript with the revealing module pattern (IIFE returning public API). Each module is self-contained:

- **js/ladder.js** (`Ladder`) - Core logic for generating random horizontal lines and calculating path mappings from participants to results
- **js/renderer.js** (`LadderRenderer`) - HTML5 Canvas rendering with pastel colors, handles DPR scaling for sharp display
- **js/share.js** (`LadderShare`) - Web Share API integration with download fallback, URL encoding for shareable links
- **js/main.js** - Application controller managing UI state, input validation, localStorage persistence, and event handling

Data flows: User input → `Ladder.generate()` → `LadderRenderer.render()` → Canvas display

The ladder data structure contains:
- `participants`/`results` arrays
- `horizontalLines` array with `{fromColumn, row}` objects
- `mapping` object mapping start column index to end column index
