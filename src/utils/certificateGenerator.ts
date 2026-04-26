import jsPDF from 'jspdf';

interface CertificateData {
  studentName: string;
  courseName: string;
  date: string;
  certificateId: string;
  duration?: string;
  instituteAddress?: string;
}

// Helper to capitalize words
const capitalize = (str: string) => {
  return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

export const generateCertificatePDF = (data: CertificateData) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const studentName = capitalize(data.studentName);
  const courseName = capitalize(data.courseName);

  // --- DESIGN TOKENS ---
  const colors = {
    navy: [15, 23, 42],
    gold: [212, 175, 55],
    text: [50, 50, 50],
    lightGold: [250, 245, 230]
  };

  // --- BACKGROUND & BORDER ---
  // Outer Border
  doc.setDrawColor(colors.gold[0], colors.gold[1], colors.gold[2]);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner Double Border
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Decorative Corners
  const cornerSize = 15;
  doc.setLineWidth(2);
  doc.line(10, 10 + cornerSize, 10, 10);
  doc.line(10, 10, 10 + cornerSize, 10);
  doc.line(pageWidth - 10 - cornerSize, 10, pageWidth - 10, 10);
  doc.line(pageWidth - 10, 10, pageWidth - 10, 10 + cornerSize);
  doc.line(10, pageHeight - 10 - cornerSize, 10, pageHeight - 10);
  doc.line(10, pageHeight - 10, 10 + cornerSize, pageHeight - 10);
  doc.line(pageWidth - 10 - cornerSize, pageHeight - 10, pageWidth - 10, pageHeight - 10);
  doc.line(pageWidth - 10, pageHeight - 10, pageWidth - 10, pageHeight - 10 - cornerSize);

  // --- CERTIFICATE ID (Top Left) ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(`VERIFICATION ID: ${data.certificateId}`, 15, 18);

  // --- LOGO (SCISSORS) ---
  const logoSize = 25;
  const logoX = (pageWidth - logoSize) / 2;
  doc.setFillColor(colors.navy[0], colors.navy[1], colors.navy[2]);
  doc.roundedRect(logoX, 25, logoSize, logoSize, 3, 3, 'F');
  
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.5);
  doc.line(logoX + 7, 32, logoX + 18, 43);
  doc.line(logoX + 18, 32, logoX + 7, 43);
  doc.circle(logoX + 7, 32, 2.5);
  doc.circle(logoX + 18, 32, 2.5);

  // --- HEADER ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(colors.navy[0], colors.navy[1], colors.navy[2]);
  doc.text("SUMI TAILORING INSTITUTE", pageWidth / 2, 65, { align: 'center', charSpace: 2 });

  doc.setDrawColor(colors.gold[0], colors.gold[1], colors.gold[2]);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 20, 68, pageWidth / 2 + 20, 68);

  doc.setFontSize(48);
  doc.setFont("times", "bolditalic");
  doc.text("Certificate of Completion", pageWidth / 2, 90, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ACCREDITED PROFESSIONAL BODY OF BESPOKE TAILORING", pageWidth / 2, 100, { align: 'center', charSpace: 1.5 });

  // --- BODY ---
  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text("This is to certify that", pageWidth / 2, 115, { align: 'center' });

  // Student Name
  doc.setFontSize(42);
  doc.setFont("times", "bold");
  doc.setTextColor(colors.navy[0], colors.navy[1], colors.navy[2]);
  doc.text(studentName, pageWidth / 2, 135, { align: 'center' });

  // Gold Line under name
  doc.setDrawColor(colors.gold[0], colors.gold[1], colors.gold[2]);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 60, 142, pageWidth / 2 + 60, 142);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text("has successfully completed the comprehensive professional course in", pageWidth / 2, 155, { align: 'center' });

  // Course Name
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.navy[0], colors.navy[1], colors.navy[2]);
  doc.text(courseName, pageWidth / 2, 172, { align: 'center' });

  // Duration
  if (data.duration) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.text(`Course Duration: ${data.duration}`, pageWidth / 2, 178, { align: 'center' });
  }

  // Recognition Text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  const blurb = "In recognition of achieving the highest standards of artisanal precision, structural integrity, and hand-finishing techniques as mandated by the Sumi Institute Board of Education.";
  const splitBlurb = doc.splitTextToSize(blurb, 160);
  doc.text(splitBlurb, pageWidth / 2, 188, { align: 'center', lineHeightFactor: 1.5 });

  // --- FOOTER ---
  const footerY = 220;

  // Date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(data.date, 60, footerY, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(30, footerY + 2, 90, footerY + 2);
  doc.setFontSize(8);
  doc.text("DATE OF ISSUANCE", 60, footerY + 7, { align: 'center' });

  // Seal (Enhanced Design)
  doc.setDrawColor(colors.gold[0], colors.gold[1], colors.gold[2]);
  doc.setLineWidth(0.8);
  // Outer scalloped circle look
  for (let i = 0; i < 360; i += 10) {
    const rad = i * Math.PI / 180;
    doc.line(pageWidth / 2 + Math.cos(rad) * 12, footerY - 5 + Math.sin(rad) * 12, 
             pageWidth / 2 + Math.cos(rad) * 14, footerY - 5 + Math.sin(rad) * 14);
  }
  doc.circle(pageWidth / 2, footerY - 5, 12);
  doc.setFontSize(5);
  doc.text("OFFICIAL SEAL", pageWidth / 2, footerY - 4.5, { align: 'center' });
  doc.text("SUMI INSTITUTE", pageWidth / 2, footerY - 2, { align: 'center' });

  // Signature
  doc.setFont("times", "bolditalic");
  doc.setFontSize(14);
  doc.text("Master Tailor M. Sumi", pageWidth - 60, footerY, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 90, footerY + 2, pageWidth - 30, footerY + 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DIRECTOR OF CERTIFICATION", pageWidth - 60, footerY + 7, { align: 'center' });

  // --- CONTACT INFO (Bottom Edge) ---
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  const contact = data.instituteAddress || "West Bengal, India • sumitailoring.com • +91 98765 43210";
  doc.text(contact, pageWidth / 2, pageHeight - 14, { align: 'center' });

  // Final Output - Open in new tab (most reliable cross-browser method)
  try {
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl, '_blank');
  } catch (err) {
    console.error("Failed to open PDF:", err);
    // Absolute fallback
    const fileName = `${studentName.replace(/[^\w]/g, '_')}_Certificate.pdf`;
    doc.save(fileName);
  }
};
