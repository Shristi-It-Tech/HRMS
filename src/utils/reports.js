// src/utils/reports.js
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
// Assume the DOCX library (or similar) is already installed
import { Document, Packer, Paragraph, TextRun } from 'docx'; 
import { formattedCurrency } from './formatters'; // Import formatter baru

/**
 * Function to export data to PDF (using jspdf-autotable)
 * @param {string} title - Report title
 * @param {Array<string>} headers - Header kolom
 * @param {Array<Array<any>>} data - Data baris
 * @param {string} filename - Nama file
 */
export const exportToPDF = (title, headers, data, filename = 'report.pdf') => {
    const doc = new jsPDF();
    doc.text(title, 14, 20);

    // Ensure data is mapped to strings if numbers need formatting (e.g., payroll dashboard)
    const body = data.map(row => row.map(cell => {
        if (typeof cell === 'number') {
            return formattedCurrency(cell);
        }
        return cell;
    }));

    doc.autoTable({
        startY: 25,
        head: [headers],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }, // Warna biru (Primary dari COLORS)
    });

    doc.save(filename);
};

/**
 * Function to export data to Excel (XLSX)
 * @param {string} sheetName - Sheet name
 * @param {Array<Object>} data - Array of objects (easier for XLSX)
 * @param {string} filename - File name
 */
export const exportToXLSX = (sheetName, data, filename = 'laporan.xlsx') => {
    // Data harus dalam format array of objects: [{ header: value, ... }]
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Terapkan format Rupiah ke kolom yang mengandung nilai uang (misalnya, 'salary', 'deductions', 'net')
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    for(let R = range.s.r; R <= range.e.r; ++R) {
        for(let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
            const cell = sheet[cellAddress];
            
            // Cek jika header kolom adalah data uang
            const headerCell = sheet[XLSX.utils.encode_cell({r: 0, c: C})];
            const header = headerCell ? headerCell.v.toLowerCase() : '';

                    if (cell && (header.includes('gaji') || header.includes('salary') || header.includes('net') || header.includes('potongan') || header.includes('deduction')) && typeof cell.v === 'number') {
                        // Apply Indonesian currency format when appropriate
                        cell.z = "Rp#,##0"; 
            }
        }
    }
    
    XLSX.writeFile(workbook, filename);
};


/**
 * Function to export simple text/report to DOCX
 * @param {string} content - Text content
 * @param {string} filename - File name
 */
export const exportToDOCX = async (content, filename = 'report.docx') => {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    children: [
                        new TextRun(content),
                    ],
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};