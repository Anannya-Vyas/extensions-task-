/**
 * GENOME.IO - Technical Report Interactive Code Engine
 * Author: Engineering Intern & Antigravity AI
 * Year: 2026
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. STATE & CONSTANTS
    // =========================================================================
    
    // Preset Datasets
    const BED_PRESETS = {
        brca1: `track name="BRCA1_Transcripts" description="BRCA1 Exon-Intron Structure" color=0,168,255 visibility=full
chr17   43044295    43125483    BRCA1-201   960 +   43045705    43124115    0,168,255   5   120,80,150,90,200   0,20000,45000,60000,80800
chr17   43044295    43125483    BRCA1-202   820 +   43045705    43100000    0,168,255   4   120,80,150,90       0,20000,45000,60000
chr17   43050000    43115000    BRCA1-Ex2b  540 +   43050000    43115000    0,168,255   2   100,150             0,50000`,
        
        chip: `track name="STAT3_ChIP_Seq" description="STAT3 Binding Peaks" color=168,85,247 visibility=full
chr19   11200000    11200450    Peak_110    1000    .
chr19   11201200    11201850    Peak_111    850     .
chr19   11203500    11204100    Peak_112    420     .
chr19   11205100    11205300    Peak_113    910     .
chr19   11207800    11208500    Peak_114    680     .
chr19   11209600    11209990    Peak_115    250     .`,
        
        cancer: `track name="Clinical_Onc_SNPs" description="Somatic Mutations (RGB Override)" color=239,68,68 visibility=pack
chr7    55241700    55241701    EGFR-L858R  980 +   55241700    55241701    255,0,0
chr7    55242465    55242466    EGFR-T790M  950 +   55242465    55242466    255,128,0
chr7    140753335   140753336   BRAF-V600E  1000    -   140753335   140753336   255,0,0
chr17   7673802     7673803     TP53-R273H  910 -   7673802     7673803     255,0,128
chr17   7674220     7674221     TP53-R248Q  880 -   7674220     7674221     255,100,0`,
        
        handwritten: `# Loaded from engineering student internship notes
track name="Internship_Spec" description="Verification of Notebook Notes" color=59,130,246 visibility=full
chr7    127471196   127472365   Gene_A      850 +
chr7    127473000   127473500   Marker_B    600 .
chr7    127474100   127474900   Gene_C      900 -`
    };

    // Application state
    let state = {
        theme: 'dark', // 'dark' | 'light'
        activePreset: 'brca1',
        bedText: '',
        parsedTrack: {
            name: 'Default Track',
            description: 'No description provided',
            color: [0, 242, 254],
            visibility: 'full',
            features: []
        },
        viewport: {
            chrom: 'chr17',
            start: 43040000,
            end: 43130000,
            originalStart: 43040000,
            originalEnd: 43130000
        },
        hoveredFeature: null
    };

    // =========================================================================
    // 2. DOM ELEMENTS
    // =========================================================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.report-section');
    
    // Sandbox Elements
    const presetBtn = document.getElementById('preset-btn');
    const presetsMenu = document.getElementById('presets-menu');
    const bedInput = document.getElementById('bed-input');
    const renderBtn = document.getElementById('render-btn');
    const syntaxStatus = document.getElementById('syntax-status');
    
    const coordsRangeText = document.getElementById('coords-range');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const panLeftBtn = document.getElementById('pan-left');
    const panRightBtn = document.getElementById('pan-right');
    const viewResetBtn = document.getElementById('view-reset');
    
    const rulerCanvas = document.getElementById('ruler-canvas');
    const tracksCanvas = document.getElementById('tracks-canvas');
    const tooltip = document.getElementById('feature-tooltip');
    
    const metaTrackName = document.getElementById('meta-track-name');
    const metaTrackDesc = document.getElementById('meta-track-desc');
    const metaTrackColor = document.getElementById('meta-track-color');
    
    // Notebook Archives
    const tabBtns = document.querySelectorAll('.tab-btn');
    const transcriptionPanes = document.querySelectorAll('.transcription-pane');
    const transCards = document.querySelectorAll('.trans-card');
    const notebookImg = document.getElementById('notebook-img');

    // =========================================================================
    // 3. THEME TOGGLE & SCROLLSPY
    // =========================================================================
    
    themeToggleBtn.addEventListener('click', () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            state.theme = 'light';
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            state.theme = 'dark';
        }
        // Redraw canvas with new theme colors
        drawGenomeBrowser();
    });

    // Scrollspy to highlight active sidebar link
    window.addEventListener('scroll', () => {
        let currentSectionId = 'abstract';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (window.scrollY >= (sectionTop - 150)) {
                currentSectionId = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    });

    // =========================================================================
    // 4. INTERACTIVE NOTEBOOK SECTION
    // =========================================================================
    
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            transcriptionPanes.forEach(pane => pane.classList.remove('active'));
            
            btn.classList.add('active');
            const targetPane = document.getElementById(btn.getAttribute('data-page'));
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // Link transcription cards to image highlights/zoom effects
    transCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            transCards.forEach(c => c.classList.remove('highlighted'));
            card.classList.add('highlighted');
            
            const refType = card.getAttribute('data-ref');
            applyNotebookZoomEffect(refType);
        });
        
        card.addEventListener('mouseleave', () => {
            card.classList.remove('highlighted');
            notebookImg.style.transform = 'scale(1.0)';
            notebookImg.style.transformOrigin = 'center center';
        });
    });

    function applyNotebookZoomEffect(refType) {
        // Change transform origins based on notes sections in notebook image
        switch (refType) {
            case 'kent': // Top left page
                notebookImg.style.transformOrigin = '15% 15%';
                notebookImg.style.transform = 'scale(1.6)';
                break;
            case 'naming': // Mid/bottom left page
                notebookImg.style.transformOrigin = '15% 55%';
                notebookImg.style.transform = 'scale(1.6)';
                break;
            case 'medical': // Margin / Center seam
                notebookImg.style.transformOrigin = '48% 30%';
                notebookImg.style.transform = 'scale(1.7)';
                break;
            case 'date': // Top right page
                notebookImg.style.transformOrigin = '70% 15%';
                notebookImg.style.transform = 'scale(1.6)';
                break;
            case 'structure': // Mid-right page
                notebookImg.style.transformOrigin = '70% 35%';
                notebookImg.style.transform = 'scale(1.6)';
                break;
            case 'usage': // Right page list
                notebookImg.style.transformOrigin = '75% 65%';
                notebookImg.style.transform = 'scale(1.6)';
                break;
            case 'analogy': // Bottom right box
                notebookImg.style.transformOrigin = '75% 85%';
                notebookImg.style.transform = 'scale(1.6)';
                break;
            default:
                notebookImg.style.transform = 'scale(1.0)';
                notebookImg.style.transformOrigin = 'center center';
        }
    }

    // =========================================================================
    // 5. BED PARSER ENGINE
    // =========================================================================
    
    function parseBedData(text) {
        const lines = text.split('\n');
        
        // Reset state parsed track
        const track = {
            name: 'Custom Track',
            description: 'User parsed BED coordinate layer',
            color: [168, 85, 247], // purple default
            visibility: 'full',
            features: []
        };
        
        let errors = [];
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('browser')) {
                return; // skip comments and empty lines
            }
            
            // Handle Track Line configuration
            if (trimmed.startsWith('track')) {
                // Parse key-value parameters
                const nameMatch = trimmed.match(/name=["']?([^"']+)["']?/);
                const descMatch = trimmed.match(/description=["']?([^"']+)["']?/);
                const colorMatch = trimmed.match(/color=(\d+),(\d+),(\d+)/);
                const visMatch = trimmed.match(/visibility=(\w+)/);
                
                if (nameMatch) track.name = nameMatch[1];
                if (descMatch) track.description = descMatch[1];
                if (colorMatch) {
                    track.color = [
                        parseInt(colorMatch[1]),
                        parseInt(colorMatch[2]),
                        parseInt(colorMatch[3])
                    ];
                }
                if (visMatch) track.visibility = visMatch[1];
                return;
            }
            
            // Process coordinate line
            const cols = trimmed.split(/\s+/);
            if (cols.length < 3) {
                errors.push(`Row ${index + 1}: Insufficient columns (minimum 3 required: chrom, chromStart, chromEnd)`);
                return;
            }
            
            const chrom = cols[0];
            const start = parseInt(cols[1]);
            const end = parseInt(cols[2]);
            
            if (isNaN(start) || isNaN(end)) {
                errors.push(`Row ${index + 1}: Coordinate start/end must be integers. Found: "${cols[1]}", "${cols[2]}"`);
                return;
            }
            if (start > end) {
                errors.push(`Row ${index + 1}: chromStart (${start}) cannot be greater than chromEnd (${end})`);
                return;
            }
            
            // Setup base feature object
            const feature = {
                chrom,
                start,
                end,
                name: cols[3] || `Feature_${index}`,
                score: cols[4] !== undefined ? parseInt(cols[4]) : 1000,
                strand: cols[5] || '.',
                thickStart: cols[6] !== undefined ? parseInt(cols[6]) : start,
                thickEnd: cols[7] !== undefined ? parseInt(cols[7]) : end,
                itemRgb: cols[8] || null,
                blockCount: cols[9] !== undefined ? parseInt(cols[9]) : 0,
                blockSizes: cols[10] ? cols[10].split(',').map(n => parseInt(n)).filter(n => !isNaN(n)) : [],
                blockStarts: cols[11] ? cols[11].split(',').map(n => parseInt(n)).filter(n => !isNaN(n)) : []
            };
            
            // RGB parsing
            if (feature.itemRgb && feature.itemRgb !== '0') {
                const rgbMatch = feature.itemRgb.match(/^(\d+),(\d+),(\d+)$/);
                if (rgbMatch) {
                    feature.parsedRgb = [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
                }
            }
            
            track.features.push(feature);
        });
        
        return { track, errors };
    }

    // =========================================================================
    // 6. GENOME BROWSER CANVAS RENDERER
    // =========================================================================
    
    function drawGenomeBrowser() {
        const isDark = !document.body.classList.contains('light-theme');
        
        // Define theme colors for drawing
        const themeColors = {
            bg: isDark ? '#0E131F' : '#FAFBFD',
            grid: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)',
            axis: isDark ? '#374151' : '#D1D5DB',
            text: isDark ? '#9CA3AF' : '#4B5563',
            rulerLine: isDark ? '#1F2937' : '#E5E7EB',
            featureBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
        };
        
        const width = rulerCanvas.width;
        
        // --- 6.1 Draw Ruler ---
        const rCtx = rulerCanvas.getContext('2d');
        rCtx.fillStyle = themeColors.bg;
        rCtx.fillRect(0, 0, width, rulerCanvas.height);
        
        const start = state.viewport.start;
        const end = state.viewport.end;
        const length = end - start;
        
        // Drawing ruler numbers and tick intervals
        rCtx.fillStyle = themeColors.text;
        rCtx.strokeStyle = themeColors.axis;
        rCtx.lineWidth = 1;
        rCtx.font = '10px Fira Code, monospace';
        
        rCtx.beginPath();
        rCtx.moveTo(0, rulerCanvas.height - 1);
        rCtx.lineTo(width, rulerCanvas.height - 1);
        rCtx.stroke();
        
        // Determine tick spacing based on range size
        let tickSpacing = 100000;
        if (length < 2000) tickSpacing = 100;
        else if (length < 10000) tickSpacing = 500;
        else if (length < 50000) tickSpacing = 5000;
        else if (length < 200000) tickSpacing = 20000;
        else if (length < 1000000) tickSpacing = 100000;
        
        const firstTick = Math.ceil(start / tickSpacing) * tickSpacing;
        
        for (let base = firstTick; base <= end; base += tickSpacing) {
            const x = ((base - start) / length) * width;
            
            // Draw tick line
            rCtx.beginPath();
            rCtx.moveTo(x, rulerCanvas.height - 8);
            rCtx.lineTo(x, rulerCanvas.height - 1);
            rCtx.stroke();
            
            // Draw tick text
            const textVal = base.toLocaleString();
            const textWidth = rCtx.measureText(textVal).width;
            rCtx.fillText(textVal, x - textWidth / 2, rulerCanvas.height - 12);
        }
        
        // --- 6.2 Draw Tracks ---
        const tCtx = tracksCanvas.getContext('2d');
        // Auto-scale height of canvas depending on feature density
        const featuresCount = state.parsedTrack.features.length;
        const rowHeight = 35;
        const padding = 15;
        
        // Set visibility layout parameters
        const visibilityMode = state.parsedTrack.visibility;
        
        let targetCanvasHeight = 150;
        if (visibilityMode === 'full' || visibilityMode === 'pack') {
            targetCanvasHeight = Math.max(150, (featuresCount * rowHeight) + (padding * 2));
        }
        
        if (tracksCanvas.height !== targetCanvasHeight) {
            tracksCanvas.height = targetCanvasHeight;
        }
        
        tCtx.fillStyle = themeColors.bg;
        tCtx.fillRect(0, 0, width, tracksCanvas.height);
        
        // Grid lines matching ruler ticks
        tCtx.strokeStyle = themeColors.grid;
        tCtx.lineWidth = 1;
        for (let base = firstTick; base <= end; base += tickSpacing) {
            const x = ((base - start) / length) * width;
            tCtx.beginPath();
            tCtx.moveTo(x, 0);
            tCtx.lineTo(x, tracksCanvas.height);
            tCtx.stroke();
        }
        
        // Track visual settings
        const trackColorArr = state.parsedTrack.color;
        const defaultColor = `rgb(${trackColorArr[0]}, ${trackColorArr[1]}, ${trackColorArr[2]})`;
        
        // Check features rendering lanes
        let lanes = []; // stores end pixel positions for pack layout
        
        state.parsedTrack.features.forEach((feat, idx) => {
            const xStart = ((feat.start - start) / length) * width;
            const xEnd = ((feat.end - start) / length) * width;
            
            // Skip rendering if feature is completely outside viewport range
            if (feat.end < start || feat.start > end) return;
            
            // Calculate row height offset based on visibility mode
            let laneIndex = 0;
            if (visibilityMode === 'full') {
                laneIndex = idx;
            } else if (visibilityMode === 'pack') {
                // Find first lane that has cleared the coordinate overlap
                let matchedLane = -1;
                for (let l = 0; l < lanes.length; l++) {
                    if (lanes[l] < xStart - 10) { // add 10px buffer
                        matchedLane = l;
                        break;
                    }
                }
                if (matchedLane === -1) {
                    lanes.push(xEnd);
                    laneIndex = lanes.length - 1;
                } else {
                    lanes[matchedLane] = xEnd;
                    laneIndex = matchedLane;
                }
            } else if (visibilityMode === 'dense' || visibilityMode === 'squish') {
                laneIndex = 0; // all overlay on single line
            }
            
            const yOffset = padding + (laneIndex * rowHeight);
            feat.renderedY = yOffset; // cache for hover collision detection
            feat.renderedHeight = (visibilityMode === 'squish') ? 8 : 14;
            
            // Base bounding line connecting exons/ends
            const centerLineY = yOffset + (feat.renderedHeight / 2);
            tCtx.strokeStyle = themeColors.featureBg;
            tCtx.lineWidth = 2;
            
            // Color selection
            let color = defaultColor;
            if (feat.parsedRgb) {
                color = `rgb(${feat.parsedRgb[0]}, ${feat.parsedRgb[1]}, ${feat.parsedRgb[2]})`;
            }
            
            tCtx.strokeStyle = color;
            tCtx.beginPath();
            tCtx.moveTo(Math.max(0, xStart), centerLineY);
            tCtx.lineTo(Math.min(width, xEnd), centerLineY);
            tCtx.stroke();
            
            // Draw directional arrows representing strand
            if (feat.strand === '+' || feat.strand === '-') {
                tCtx.lineWidth = 1;
                tCtx.strokeStyle = color;
                
                const arrowSpacing = 40; // pixel interval
                const startX = Math.max(0, xStart);
                const endX = Math.min(width, xEnd);
                
                for (let ax = startX + 15; ax < endX; ax += arrowSpacing) {
                    tCtx.beginPath();
                    if (feat.strand === '+') {
                        tCtx.moveTo(ax - 4, centerLineY - 3);
                        tCtx.lineTo(ax, centerLineY);
                        tCtx.lineTo(ax - 4, centerLineY + 3);
                    } else {
                        tCtx.moveTo(ax + 4, centerLineY - 3);
                        tCtx.lineTo(ax, centerLineY);
                        tCtx.lineTo(ax + 4, centerLineY + 3);
                    }
                    tCtx.stroke();
                }
            }
            
            // Determine alpha based on Score (scale 0-1000)
            const alpha = feat.score / 1000;
            tCtx.fillStyle = color;
            tCtx.globalAlpha = alpha;
            
            // Render shapes based on Bed format specifications (Block Exons vs Blocks)
            if (feat.blockCount > 0 && feat.blockSizes.length > 0 && feat.blockStarts.length > 0) {
                // Draw detailed blocks
                for (let i = 0; i < feat.blockCount; i++) {
                    const exonStart = feat.start + feat.blockStarts[i];
                    const exonEnd = exonStart + feat.blockSizes[i];
                    
                    const exPixelX = ((exonStart - start) / length) * width;
                    const exPixelW = (feat.blockSizes[i] / length) * width;
                    
                    // Draw Exon coding block or UTR thin block
                    let isExonCoding = true;
                    // Check if block falls inside thickStart/thickEnd coding boundaries
                    if (exonEnd <= feat.thickStart || exonStart >= feat.thickEnd) {
                        isExonCoding = false;
                    }
                    
                    const blockH = isExonCoding ? feat.renderedHeight : (feat.renderedHeight / 2);
                    const blockY = isExonCoding ? yOffset : yOffset + (feat.renderedHeight / 4);
                    
                    tCtx.fillRect(exPixelX, blockY, Math.max(2, exPixelW), blockH);
                }
            } else {
                // Draw simple coordinate block (Bed3/Bed6)
                // Draw thick block for coding regions, thin for non-coding
                const thickPixelX = ((Math.max(feat.start, feat.thickStart) - start) / length) * width;
                const thickPixelW = ((Math.min(feat.end, feat.thickEnd) - Math.max(feat.start, feat.thickStart)) / length) * width;
                
                // Draw Thin Left UTR
                if (feat.thickStart > feat.start) {
                    const utrX = xStart;
                    const utrW = ((feat.thickStart - feat.start) / length) * width;
                    tCtx.fillRect(utrX, yOffset + (feat.renderedHeight / 4), utrW, feat.renderedHeight / 2);
                }
                
                // Draw Coding block
                if (thickPixelW > 0) {
                    tCtx.fillRect(thickPixelX, yOffset, Math.max(2, thickPixelW), feat.renderedHeight);
                }
                
                // Draw Thin Right UTR
                if (feat.thickEnd < feat.end) {
                    const utrX = ((feat.thickEnd - start) / length) * width;
                    const utrW = ((feat.end - feat.thickEnd) / length) * width;
                    tCtx.fillRect(utrX, yOffset + (feat.renderedHeight / 4), utrW, feat.renderedHeight / 2);
                }
            }
            
            // Draw labels (only if visible and space-permitting)
            tCtx.globalAlpha = 1.0;
            if (visibilityMode !== 'squish') {
                tCtx.fillStyle = themeColors.text;
                tCtx.font = '10px var(--font-body)';
                // Draw text above the block
                tCtx.fillText(feat.name, Math.max(4, xStart), yOffset - 4);
            }
            
            // Draw outlines if hovered
            if (state.hoveredFeature === feat) {
                tCtx.strokeStyle = themeColors.text;
                tCtx.lineWidth = 1.5;
                tCtx.globalAlpha = 1.0;
                tCtx.strokeRect(xStart - 2, yOffset - 2, (xEnd - xStart) + 4, feat.renderedHeight + 4);
            }
        });
        
        tCtx.globalAlpha = 1.0; // reset
    }

    // =========================================================================
    // 7. VIEWPORT NAVIGATION LOGIC
    // =========================================================================
    
    function updateCoordinatesDisplay() {
        coordsRangeText.textContent = `${state.viewport.chrom}:${Math.round(state.viewport.start).toLocaleString()} - ${Math.round(state.viewport.end).toLocaleString()}`;
    }

    function zoom(factor) {
        const currentStart = state.viewport.start;
        const currentEnd = state.viewport.end;
        const currentLength = currentEnd - currentStart;
        const center = currentStart + (currentLength / 2);
        
        const newLength = currentLength * factor;
        
        // Bound zoom length
        if (newLength < 10 && factor < 1) return; // Prevent zooming past 10 bases
        
        state.viewport.start = Math.max(0, center - (newLength / 2));
        state.viewport.end = center + (newLength / 2);
        
        updateCoordinatesDisplay();
        drawGenomeBrowser();
    }

    function pan(percent) {
        const currentStart = state.viewport.start;
        const currentEnd = state.viewport.end;
        const length = currentEnd - currentStart;
        const shift = length * percent;
        
        state.viewport.start = Math.max(0, currentStart + shift);
        state.viewport.end = currentEnd + shift;
        
        updateCoordinatesDisplay();
        drawGenomeBrowser();
    }

    zoomInBtn.addEventListener('click', () => zoom(0.7));
    zoomOutBtn.addEventListener('click', () => zoom(1.4));
    
    panLeftBtn.addEventListener('click', () => pan(-0.25));
    panRightBtn.addEventListener('click', () => pan(0.25));
    
    viewResetBtn.addEventListener('click', () => {
        state.viewport.start = state.viewport.originalStart;
        state.viewport.end = state.viewport.originalEnd;
        updateCoordinatesDisplay();
        drawGenomeBrowser();
    });

    // =========================================================================
    // 8. INTERACTION (MOUSEOVER & TOOLTIPS)
    // =========================================================================
    
    tracksCanvas.addEventListener('mousemove', (e) => {
        const rect = tracksCanvas.getBoundingClientRect();
        // Mouse coordinate relative to canvas pixels
        const mouseX = (e.clientX - rect.left) * (tracksCanvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (tracksCanvas.height / rect.height);
        
        const scale = tracksCanvas.width / (state.viewport.end - state.viewport.start);
        
        let foundFeat = null;
        
        state.parsedTrack.features.forEach(feat => {
            const xStart = (feat.start - state.viewport.start) * scale;
            const xEnd = (feat.end - state.viewport.start) * scale;
            
            // Check box collisions
            if (
                mouseX >= xStart && mouseX <= xEnd &&
                mouseY >= feat.renderedY && mouseY <= (feat.renderedY + feat.renderedHeight)
            ) {
                foundFeat = feat;
            }
        });
        
        if (foundFeat !== state.hoveredFeature) {
            state.hoveredFeature = foundFeat;
            drawGenomeBrowser(); // redraw with outline highlight
            
            if (foundFeat) {
                // Fill tooltip data
                tooltip.querySelector('.tooltip-title').textContent = foundFeat.name;
                tooltip.querySelector('.tooltip-coords').textContent = `${foundFeat.chrom}:${foundFeat.start.toLocaleString()} - ${foundFeat.end.toLocaleString()} (${(foundFeat.end - foundFeat.start).toLocaleString()} bp)`;
                tooltip.querySelector('.tooltip-details').innerHTML = `<span>Score: ${foundFeat.score}</span><span>Strand: ${foundFeat.strand}</span>`;
                
                // Position and show tooltip
                const tooltipX = e.clientX - rect.left + 15;
                const tooltipY = e.clientY - rect.top + 15;
                
                tooltip.style.left = `${tooltipX}px`;
                tooltip.style.top = `${tooltipY}px`;
                tooltip.style.opacity = '1';
            } else {
                tooltip.style.opacity = '0';
            }
        } else if (foundFeat) {
            // Reposition tooltip as mouse moves
            const tooltipX = e.clientX - rect.left + 15;
            const tooltipY = e.clientY - rect.top + 15;
            tooltip.style.left = `${tooltipX}px`;
            tooltip.style.top = `${tooltipY}px`;
        }
    });

    tracksCanvas.addEventListener('mouseleave', () => {
        state.hoveredFeature = null;
        tooltip.style.opacity = '0';
        drawGenomeBrowser();
    });

    // =========================================================================
    // 9. CONTROLLER INITIALIZATION
    // =========================================================================
    
    // Preset load buttons
    presetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        presetsMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', () => {
        presetsMenu.classList.remove('show');
    });

    const presetOpts = document.querySelectorAll('.preset-opt');
    presetOpts.forEach(opt => {
        opt.addEventListener('click', () => {
            const key = opt.getAttribute('data-preset');
            loadPreset(key);
        });
    });

    function loadPreset(key) {
        state.activePreset = key;
        const text = BED_PRESETS[key];
        bedInput.value = text;
        
        // Trigger Parsing & Rendering
        parseAndApply();
        
        // Auto-center viewport range around features
        if (state.parsedTrack.features.length > 0) {
            let minStart = Infinity;
            let maxEnd = -Infinity;
            let chrom = 'chr1';
            
            state.parsedTrack.features.forEach(f => {
                if (f.start < minStart) minStart = f.start;
                if (f.end > maxEnd) maxEnd = f.end;
                chrom = f.chrom;
            });
            
            // Expand borders by 10% padding
            const span = maxEnd - minStart;
            const padding = Math.max(100, Math.round(span * 0.1));
            
            state.viewport.chrom = chrom;
            state.viewport.start = Math.max(0, minStart - padding);
            state.viewport.end = maxEnd + padding;
            
            // Cache original range
            state.viewport.originalStart = state.viewport.start;
            state.viewport.originalEnd = state.viewport.end;
        }
        
        updateCoordinatesDisplay();
        drawGenomeBrowser();
    }

    function parseAndApply() {
        const text = bedInput.value;
        const result = parseBedData(text);
        
        state.parsedTrack = result.track;
        
        if (result.errors.length > 0) {
            syntaxStatus.className = 'syntax-status text-yellow';
            syntaxStatus.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Syntax warnings (${result.errors.length})`;
            console.warn('BED Parsing warnings:', result.errors);
        } else {
            syntaxStatus.className = 'syntax-status text-green';
            syntaxStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Syntax Valid`;
        }
        
        // Update track metadata cards in UI
        metaTrackName.textContent = state.parsedTrack.name;
        metaTrackDesc.textContent = state.parsedTrack.description;
        
        const rgb = state.parsedTrack.color;
        metaTrackColor.innerHTML = `<span class="color-indicator" style="background-color: rgb(${rgb.join(',')});"></span> RGB(${rgb.join(',')})`;
        
        // Redraw
        drawGenomeBrowser();
    }

    renderBtn.addEventListener('click', () => {
        parseAndApply();
        drawGenomeBrowser();
    });

    // Initialize with default BRCA1 preset
    loadPreset('brca1');
});
