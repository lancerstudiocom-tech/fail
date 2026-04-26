import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  clientName: string;
  clientPhone?: string;
  projectName: string;
  projectId: string;
  items: Array<{
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  totalAmount: number;
  amountPaid?: number;
  balance?: number;
  isPaid: boolean;
  fabricImage?: string; // base64
  fabricRef?: string;
  autoPrint?: boolean;
}

export const generateInvoicePDF = (data: InvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // --- COLORS & STYLES ---
  const colors = {
    primary: [10, 17, 40], // Dark Navy
    accent: [255, 45, 120], // Brand Pink
    text: [60, 60, 60],
    light: [248, 249, 250],
    success: [40, 167, 69]
  };

  // --- HEADER ---
  doc.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("Sumi Tailoring", 14, 25);
  
  // Paid Badge
  if (data.isPaid) {
    doc.setFillColor(232, 245, 233);
    doc.roundedRect(pageWidth - 35, 15, 20, 8, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.text("PAID", pageWidth - 25, 20.5, { align: 'center' });
  }

  // --- INVOICE INFO ---
  doc.setFontSize(18);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("Invoice", 14, 55);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`#${data.invoiceNumber}`, 14, 62);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(`Issued: ${data.date}`, 14, 68);

  // --- CLIENT & PROJECT INFO ---
  const colWidth = (pageWidth - 28) / 2;
  
  // Client
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 150, 100); // Ochre color
  doc.text("CLIENT", 14, 85);
  
  doc.setFontSize(12);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text(data.clientName, 14, 93);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(data.clientPhone || "", 14, 99);

  // Project
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 150, 100);
  doc.text("PROJECT", 14 + colWidth, 85);
  
  doc.setFontSize(12);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text(data.projectName, 14 + colWidth, 93);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(`ID: ${data.projectId}`, 14 + colWidth, 99);

  // --- SERVICE DETAILS TABLE ---
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(14, 115, pageWidth - 28, 10, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("SERVICE DETAILS", 18, 121.5);

  autoTable(doc, {
    startY: 125,
    head: [['Item', 'Price']],
    body: data.items.map(item => [
      { content: `${item.name}\n${item.description}\nQTY: ${item.quantity} @ ₹${item.unitPrice}`, styles: { fontStyle: 'bold' } },
      { content: `₹${item.total.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 12 } }
    ]),
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 40 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        // Custom styling for description
        data.cell.styles.textColor = colors.primary as [number, number, number];
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // --- SUMMARY ---
  const summaryX = pageWidth - 60;
  doc.setFontSize(10);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text("Subtotal", summaryX, finalY);
  doc.text(`₹${data.subtotal.toFixed(2)}`, pageWidth - 14, finalY, { align: 'right' });

  if (data.tax) {
    doc.text(`Tax (5%)`, summaryX, finalY + 8);
    doc.text(`₹${data.tax.toFixed(2)}`, pageWidth - 14, finalY + 8, { align: 'right' });
  }

  if (data.discount) {
    doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.text(`Discount`, summaryX, finalY + 16);
    doc.text(`-₹${data.discount.toFixed(2)}`, pageWidth - 14, finalY + 16, { align: 'right' });
  }

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(summaryX, finalY + 22, pageWidth - 14, finalY + 22);

  // Total
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("Total Bill", 14, finalY + 35);
  doc.text(`₹${data.totalAmount.toFixed(2)}`, pageWidth - 14, finalY + 35, { align: 'right' });

  let balanceY = finalY + 35;

  if (data.amountPaid !== undefined && data.amountPaid > 0) {
    balanceY += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text("Amount Paid", 14, balanceY);
    doc.text(`-₹${data.amountPaid.toFixed(2)}`, pageWidth - 14, balanceY, { align: 'right' });
  }

  if (data.balance !== undefined && data.balance > 0) {
    balanceY += 12;
    doc.setFillColor(255, 235, 235); // Light red background
    doc.roundedRect(14, balanceY - 5, pageWidth - 28, 10, 1, 1, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 53, 69); // Red color
    doc.text("BALANCE DUE", 18, balanceY + 2);
    doc.text(`₹${data.balance.toFixed(2)}`, pageWidth - 18, balanceY + 2, { align: 'right' });
  }

  // --- FABRIC ATTACHED ---
  if (data.fabricImage || data.fabricRef) {
    const fabricY = finalY + 55;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 150, 100);
    doc.text("FABRIC ATTACHED", 14, fabricY);
    
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, fabricY + 5, pageWidth - 28, 25, 2, 2, 'F');
    
    if (data.fabricImage) {
        try {
            doc.addImage(data.fabricImage, 'JPEG', 18, fabricY + 8, 18, 18);
        } catch (e) {
            console.error("PDF Image Error", e);
        }
    }
    
    doc.setFontSize(10);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(data.fabricRef || "Material Reference", 42, fabricY + 15);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Reference: SMT-202-A", 42, fabricY + 20);
  }

  // --- FOOTER ---
  const footerY = doc.internal.pageSize.getHeight() - 40;
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  const quote = '"Thank you for choosing Sumi Tailoring. We craft excellence in every stitch."';
  doc.text(quote, pageWidth / 2, footerY, { align: 'center' });
  
  // Star Icon
  doc.setFillColor(200, 150, 100);
  doc.circle(pageWidth / 2, footerY + 12, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("★", pageWidth / 2, footerY + 14.5, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text("AUTHORIZED MASTER TAILOR SIGNATURE", pageWidth / 2, footerY + 25, { align: 'center' });

  if (data.autoPrint) {
    doc.autoPrint();
    const hsn = doc.output('bloburl');
    window.open(hsn, '_blank');
  } else {
    // Final Output - Open in new tab
    try {
      const pdfUrl = doc.output('bloburl');
      window.open(pdfUrl, '_blank');
    } catch (err) {
      console.error("Failed to open PDF:", err);
      const fileName = `Invoice_${data.invoiceNumber}.pdf`;
      doc.save(fileName);
    }
  }
};
