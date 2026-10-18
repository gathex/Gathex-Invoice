import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Result of the dynamic font scaling evaluation.
 */
export interface ScaleResult {
  step: number;
  reductionPt: number;
  initialContentHeight: number;
  finalContentHeight: number;
  maxPageHeight: number;
  fitsOnSinglePage: boolean;
  cleanup: () => void;
}

/**
 * Dynamic Font Scaling Engine:
 * 1. Calculates the natural content height of the invoice.
 * 2. If content exceeds single-page A4 height, progressively reduces font sizes
 *    in small steps (0.5pt increments) down to a readable minimum (8pt).
 * 3. Applies strict font hierarchy: headings scale less aggressively than body/table text
 *    so visual balance is preserved.
 * 4. Keeps all outer page margins consistent (only scales typography).
 * 5. Returns a cleanup function that restores all original styles.
 */
export function applyDynamicPdfScaling(element: HTMLElement): ScaleResult {
  if (!element) {
    return {
      step: 0,
      reductionPt: 0,
      initialContentHeight: 0,
      finalContentHeight: 0,
      maxPageHeight: 1123,
      fitsOnSinglePage: true,
      cleanup: () => {},
    };
  }

  const A4_ASPECT_RATIO = 297 / 210; // ≈ 1.4142857
  const elementWidth = element.offsetWidth || 794;
  const targetMaxHeight = Math.floor(elementWidth * A4_ASPECT_RATIO); // ~1123px for 794px A4 sheet

  const STEP_PT = 0.5; // 0.5pt reduction steps
  const PT_TO_PX = 96 / 72; // 1.333333 px per pt
  const MIN_FONT_SIZE_PT = 8; // 8pt absolute minimum readable threshold
  const MIN_FONT_SIZE_PX = MIN_FONT_SIZE_PT * PT_TO_PX; // ~10.67px

  // Save original container sizing constraints to measure true content height
  const originalMinHeight = element.style.minHeight;
  const originalHeight = element.style.height;
  element.style.minHeight = "0px";
  element.style.height = "auto";

  interface TrackedElement {
    el: HTMLElement;
    originalFontSize: number;
    originalLineHeight: number;
    hasExplicitLineHeight: boolean;
    category: "majorHeading" | "minorHeading" | "tableText" | "bodyText";
  }

  const trackedElements: TrackedElement[] = [];
  const allNodes = element.querySelectorAll<HTMLElement>("*");

  allNodes.forEach((el) => {
    // Only track elements that directly hold text or are table cells
    let hasDirectText = false;
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim().length > 0) {
        hasDirectText = true;
        break;
      }
    }

    const isTableCell = el.tagName === "TH" || el.tagName === "TD";
    if (!hasDirectText && !isTableCell) return;

    const computed = window.getComputedStyle(el);
    const fontSize = parseFloat(computed.fontSize);
    if (!fontSize || isNaN(fontSize)) return;

    const parsedLineHeight = parseFloat(computed.lineHeight);
    const hasExplicitLineHeight = !isNaN(parsedLineHeight) && parsedLineHeight > 0;
    const lineHeight = hasExplicitLineHeight ? parsedLineHeight : fontSize * 1.35;

    let category: TrackedElement["category"] = "bodyText";
    const tag = el.tagName.toUpperCase();
    if (["H1", "H2", "H3"].includes(tag) || el.classList.contains("text-xl") || el.classList.contains("text-2xl") || el.classList.contains("text-3xl")) {
      category = "majorHeading";
    } else if (["H4", "H5"].includes(tag) || (el.classList.contains("uppercase") && el.classList.contains("tracking-wider"))) {
      category = "minorHeading";
    } else if (el.closest("table") !== null || isTableCell) {
      category = "tableText";
    }

    trackedElements.push({
      el,
      originalFontSize: fontSize,
      originalLineHeight: lineHeight,
      hasExplicitLineHeight,
      category,
    });
  });

  const measureHeight = (): number => {
    return element.scrollHeight;
  };

  const initialContentHeight = measureHeight();
  let currentHeight = initialContentHeight;
  let step = 0;
  const MAX_STEPS = 8; // Up to 4.0pt total reduction

  // If it already fits on one A4 page, no scaling needed
  if (initialContentHeight <= targetMaxHeight + 2) {
    element.style.minHeight = `${targetMaxHeight}px`;
    return {
      step: 0,
      reductionPt: 0,
      initialContentHeight,
      finalContentHeight: initialContentHeight,
      maxPageHeight: targetMaxHeight,
      fitsOnSinglePage: true,
      cleanup: () => {
        element.style.minHeight = originalMinHeight;
        element.style.height = originalHeight;
      },
    };
  }

  // Progressive scaling loop
  while (step < MAX_STEPS && currentHeight > targetMaxHeight + 2) {
    step++;
    const reductionPt = step * STEP_PT;
    const reductionPx = reductionPt * PT_TO_PX;

    let allReachedMin = true;

    for (const item of trackedElements) {
      const { el, originalFontSize, originalLineHeight, category } = item;

      // Font Hierarchy Scaling:
      // - Table & Body text scale fully (1.0x)
      // - Minor headings scale moderately (0.5x)
      // - Major headings scale gently (0.3x) to maintain clear visual hierarchy
      let factor = 1.0;
      if (category === "majorHeading") factor = 0.3;
      else if (category === "minorHeading") factor = 0.5;
      else factor = 1.0;

      const targetReduction = reductionPx * factor;
      const minAllowed = Math.min(originalFontSize, MIN_FONT_SIZE_PX);
      const newFontSize = Math.max(minAllowed, originalFontSize - targetReduction);

      if (newFontSize > minAllowed + 0.1) {
        allReachedMin = false;
      }

      el.style.fontSize = `${newFontSize}px`;

      // Scale line-height proportionally
      const ratio = originalLineHeight / originalFontSize;
      el.style.lineHeight = `${Math.round(newFontSize * ratio * 10) / 10}px`;
    }

    currentHeight = measureHeight();

    // If it now fits on a single page, stop scaling immediately
    if (currentHeight <= targetMaxHeight + 2) {
      break;
    }

    // Stop if all text elements have reached the minimum readable font size (8pt)
    if (allReachedMin) {
      break;
    }
  }

  const fitsOnSinglePage = currentHeight <= targetMaxHeight + 2;

  // If it fits on single page, set minHeight to targetMaxHeight so it renders as a complete A4 sheet
  if (fitsOnSinglePage) {
    element.style.minHeight = `${targetMaxHeight}px`;
  }

  const cleanup = () => {
    for (const item of trackedElements) {
      item.el.style.fontSize = "";
      item.el.style.lineHeight = "";
    }
    element.style.minHeight = originalMinHeight;
    element.style.height = originalHeight;
  };

  return {
    step,
    reductionPt: step * STEP_PT,
    initialContentHeight,
    finalContentHeight: currentHeight,
    maxPageHeight: targetMaxHeight,
    fitsOnSinglePage,
    cleanup,
  };
}

/**
 * Prepares an element for browser printing with dynamic font scaling.
 * Returns a cleanup callback to restore original styles after printing.
 */
export function prepareElementForPrintScaling(element: HTMLElement): () => void {
  const result = applyDynamicPdfScaling(element);
  return result.cleanup;
}

/**
 * High-fidelity PDF Exporter using html2canvas & jsPDF with Dynamic Single-Page Scaling:
 * - Automatically evaluates content height against standard A4 geometry.
 * - Progressively down-scales fonts in 0.5pt increments down to 8pt minimum to guarantee
 *   a clean single-page invoice whenever possible.
 * - Preserves font hierarchy and outer margins.
 * - Gracefully falls back to exact multi-page A4 canvas slicing when content genuinely
 *   exceeds single-page capacity even at minimum font size.
 */
export async function exportElementToPDF(
  element: HTMLElement,
  filename: string
): Promise<void> {
  if (!element) return;

  // 1. Preserve original transform and force color-scheme light
  const originalTransform = element.style.transform;
  element.style.transform = "none";

  const originalColorScheme = element.style.colorScheme;
  element.style.colorScheme = "light";

  // 2. Inject temporary style tag to freeze all CSS transitions & animations globally during capture
  const styleTag = document.createElement("style");
  styleTag.id = "pdf-export-freeze";
  styleTag.textContent = `
    * {
      transition: none !important;
      animation: none !important;
    }
  `;
  document.head.appendChild(styleTag);

  // 3. Locate and temporarily unconstrain overflow / sticky containers
  const modifiedElements: { el: HTMLElement; overflow: string; maxHeight: string; position: string }[] = [];

  const targets = element.querySelectorAll<HTMLElement>(
    '.overflow-x-auto, .overflow-y-auto, .overflow-auto, [class*="overflow-"], .sticky, [class*="sticky"]'
  );

  targets.forEach((el) => {
    modifiedElements.push({
      el,
      overflow: el.style.overflow,
      maxHeight: el.style.maxHeight,
      position: el.style.position,
    });
    if (el.classList.contains("sticky") || el.className.includes("sticky")) {
      el.style.position = "static";
    }
    el.style.overflow = "visible";
    el.style.maxHeight = "none";
  });

  // 4. Neutralize negative margins during capture
  const marginModifiedElements: { el: HTMLElement; marginLeft: string; marginRight: string; marginTop: string }[] = [];
  const allElements = element.querySelectorAll<HTMLElement>("*");
  allElements.forEach((el) => {
    const computed = window.getComputedStyle(el);
    const ml = parseFloat(computed.marginLeft);
    const mr = parseFloat(computed.marginRight);
    const mt = parseFloat(computed.marginTop);
    if (ml < 0 || mr < 0 || mt < 0) {
      marginModifiedElements.push({
        el,
        marginLeft: el.style.marginLeft,
        marginRight: el.style.marginRight,
        marginTop: el.style.marginTop,
      });
      el.style.marginLeft = "0";
      el.style.marginRight = "0";
      el.style.marginTop = "0";
    }
  });

  // 5. Apply dynamic font scaling to fit single page (with 8pt minimum readable limit)
  const scaleResult = applyDynamicPdfScaling(element);

  try {
    // 6. Wait for transition-disabling & scaling styles to settle in DOM reflow
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // 7. Wait for all fonts (including custom webfonts) to finish loading
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // 8. Render canvas at scale 2 with 0 scroll offset and explicit white background
    const canvas = await html2canvas(element, {
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
      scale: 2,
      logging: false,
      width: element.offsetWidth || 794,
      height: element.offsetHeight || undefined,
      windowWidth: element.scrollWidth || 794,
      windowHeight: element.scrollHeight,
      backgroundColor: "#ffffff",
    });

    // 9. Generate PDF: Single-page by default, with graceful multi-page fallback for large invoices
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

    // Compute pixel height of one A4 page at the canvas resolution
    const a4CanvasPageHeight = Math.floor(canvas.width * (pdfHeight / pdfWidth));

    if (canvas.height <= a4CanvasPageHeight + 4) {
      // Single Page Output
      const imgData = canvas.toDataURL("image/png");
      const pageHeightMm = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, Math.min(pdfHeight, pageHeightMm));
    } else {
      // Graceful Multi-Page Output (for genuinely large invoices with high line-item counts)
      const totalPages = Math.ceil(canvas.height / a4CanvasPageHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        const sourceY = page * a4CanvasPageHeight;
        const sourceHeight = Math.min(a4CanvasPageHeight, canvas.height - sourceY);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;

        const pageCtx = pageCanvas.getContext("2d");
        if (pageCtx) {
          pageCtx.fillStyle = "#ffffff";
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            sourceHeight,
            0,
            0,
            canvas.width,
            sourceHeight
          );

          const sliceData = pageCanvas.toDataURL("image/png");
          const sliceHeightMm = (sourceHeight * pdfWidth) / canvas.width;
          pdf.addImage(sliceData, "PNG", 0, 0, pdfWidth, Math.min(pdfHeight, sliceHeightMm));
        }
      }
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    // 10. Clean up dynamic font scaling and restore original DOM styles
    scaleResult.cleanup();

    element.style.transform = originalTransform;
    element.style.colorScheme = originalColorScheme;
    document.getElementById("pdf-export-freeze")?.remove();

    modifiedElements.forEach((item) => {
      item.el.style.overflow = item.overflow;
      item.el.style.maxHeight = item.maxHeight;
      item.el.style.position = item.position;
    });
    marginModifiedElements.forEach((item) => {
      item.el.style.marginLeft = item.marginLeft;
      item.el.style.marginRight = item.marginRight;
      item.el.style.marginTop = item.marginTop;
    });
  }
}
