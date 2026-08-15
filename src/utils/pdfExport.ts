import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * High-fidelity PDF Exporter using html2canvas & jsPDF.
 * Temporarily relaxes overflow constraints, CSS transforms, and sticky positioning
 * to eliminate ghosting, overlapping text, and double rendering issues.
 */
export async function exportElementToPDF(
  element: HTMLElement,
  filename: string
): Promise<void> {
  if (!element) return;

  // 1. Preserve original transform
  const originalTransform = element.style.transform;
  element.style.transform = "none";

  // 2. Locate and temporarily unconstrain overflow / sticky containers
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
    if (el.classList.contains('sticky') || el.className.includes('sticky')) {
      el.style.position = 'static';
    }
    el.style.overflow = 'visible';
    el.style.maxHeight = 'none';
  });

  try {
    // 3. Render canvas at scale 2 with 0 scroll offset
    const canvas = await html2canvas(element, {
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
      scale: 2,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    // 4. Generate PDF
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    // 5. Restore original styles
    element.style.transform = originalTransform;
    modifiedElements.forEach((item) => {
      item.el.style.overflow = item.overflow;
      item.el.style.maxHeight = item.maxHeight;
      item.el.style.position = item.position;
    });
  }
}
