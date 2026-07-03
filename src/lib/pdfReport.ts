// Builds a multi-page A4 PDF from an off-screen report element by capturing each
// [data-pdf-section] with html2canvas and laying them out with jsPDF. The heavy
// libs are dynamically imported so they don't bloat the match-page bundle.

export async function generateReportPdf(container: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, jspdf] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const { jsPDF } = jspdf;

  const sections = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-section]"));
  const targets = sections.length ? sections : [container];

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;

  let y = margin;
  for (const el of targets) {
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#0a0e1a",
      useCORS: true,
      logging: false,
    });
    let imgW = usableW;
    let imgH = (canvas.height * imgW) / canvas.width;
    // A section taller than a page gets scaled to fit one page (keeps it intact).
    if (imgH > usableH) {
      imgH = usableH;
      imgW = (canvas.width * imgH) / canvas.height;
    }
    // Start a new page if this section won't fit below the current cursor.
    if (y + imgH > pageH - margin && y > margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, y, imgW, imgH);
    y += imgH + 14;
  }

  pdf.save(filename);
}
