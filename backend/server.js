const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const path = require('path');

let browser;

/* ================= REUSABLE BROWSER INSTANCE ================= */
async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    });
  }
  return browser;
}

/* ================= CLEANUP OLD FILES ================= */
function cleanupOldFiles(dir, maxAgeMinutes = 30) {
  if (!fs.existsSync(dir)) return;
  
  const now = Date.now();
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAgeMinutes * 60 * 1000) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted old file: ${file}`);
      }
    } catch (err) {
      console.error(`Error cleaning up ${file}:`, err.message);
    }
  });
}

/* ================= INDIAN NUMBER TO WORDS ================= */
function numberToWordsIndian(num) {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Lakh', 'Crore'];

  const convertHundreds = (n) => {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred';
      n %= 100;
      if (n > 0) result += ' ';
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)];
      if (n % 10 > 0) result += ' ' + ones[n % 10];
    } else if (n >= 10) {
      result += teens[n - 10];
    } else if (n > 0) {
      result += ones[n];
    }
    return result.trim();
  };

  let parts = [];
  let scaleIndex = 0;

  while (num > 0 && scaleIndex < scales.length) {
    if (scaleIndex === 0) {
      const chunk = num % 100;
      if (chunk > 0) parts.unshift(convertHundreds(chunk) + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : ''));
      num = Math.floor(num / 100);
    } else {
      const chunk = num % (scaleIndex === 1 ? 10 : 100);
      if (chunk > 0) parts.unshift(convertHundreds(chunk) + ' ' + scales[scaleIndex]);
      num = Math.floor(num / (scaleIndex === 1 ? 10 : 100));
    }
    scaleIndex++;
  }

  return parts.join(' ').trim();
}

const app = express();
app.use(cors({
  origin: 'https://invoice2-eosin.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true
}));

app.options('*', cors());
app.use(express.json({ limit: '2mb' }));

/* ---------- DEBUG LOGGER ---------- */
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.path}`);
  next();
});

/* ================= HEALTH CHECK ================= */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* ================= UNIFIED GENERATE API ================= */
app.post('/generate', async (req, res) => {
  try {
    const {
      invoice_type = 'simple',
      invoice_no,
      invoice_date,
      party_name,
      party_address = '',
      party_gstin = '',
      items = []
    } = req.body;

    if (!invoice_no || !party_name || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    /* ================= CLEAN ITEMS ================= */
    const cleanItems = items.map((i, idx) => {
      const qty = Number(i.qty);
      const rate = Number(i.rate);
      if (isNaN(qty) || isNaN(rate)) {
        throw new Error(`Invalid qty/rate at item ${idx + 1}`);
      }
      return {
        date: i.date || '',
        challan: i.challan || '',
        truck: i.truck || '',
        desc: i.desc || '',
        hsn: i.hsn || '',
        qty,
        rate,
        amount: qty * rate
      };
    });

    /* ================= CALCULATIONS ================= */
    const subtotal = cleanItems.reduce((s, i) => s + i.amount, 0);
    
    // GST rates: Simple (Cement) = 9%, Sand/Concrete = 2.5%
    const gstRate = invoice_type === 'sand' ? 0.025 : 0.09;
    const cgst = +(subtotal * gstRate).toFixed(2);
    const sgst = +(subtotal * gstRate).toFixed(2);
    const gross = subtotal + cgst + sgst;
    const total = Math.round(gross);
    const roundoff = +(total - gross).toFixed(2);

    /* ================= SELECT TEMPLATE ================= */
    const html = invoice_type === 'sand'
      ? generateSandInvoiceHTML(cleanItems, invoice_no, invoice_date, party_name, party_address, party_gstin, subtotal, cgst, sgst, roundoff, total)
      : generateSimpleInvoiceHTML(cleanItems, invoice_no, invoice_date, party_name, party_address, party_gstin, subtotal, cgst, sgst, roundoff, total);

    /* ================= GENERATE PDF ================= */
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true
      });

      /* ================= SAVE TO TEMP ================= */
      const fileName = `Invoice_${invoice_no}_${Date.now()}.pdf`;
      const dir = path.join(__dirname, 'tmp');

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(path.join(dir, fileName), pdf);
      console.log(`✅ PDF saved: ${fileName}`);

      cleanupOldFiles(dir);

      res.json({
        url: `https://invoice2-uu6l.onrender.com/download/${fileName}`
      });

    } finally {
      await page.close();
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF generation failed: ' + err.message });
  }
});

/* ================= SIMPLE INVOICE TEMPLATE (CEMENT) ================= */
function generateSimpleInvoiceHTML(items, invoiceNo, invoiceDate, partyName, partyAddress, partyGstin, subtotal, cgst, sgst, roundoff, total) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page { size: A4; margin: 10mm; }
@font-face {
  font-family: 'NotoDeva';
  src: url('https://fonts.gstatic.com/s/notosansdevanagari/v25/xH2vF5pWnGCMpU5QIauqfBCF6f4.woff2') format('woff2');
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
.deva { font-family: 'NotoDeva', Arial, sans-serif; font-size: 18px; font-weight: bold; }
.page { min-height: 277mm; display: flex; flex-direction: column; }
.header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
.header-title { font-size: 16px; font-weight: bold; }
.header-marked { font-size: 18px; font-weight: bold; color: red; }
.box { width: 100%; border: 1px solid #000; margin-top: 4px; }
.box td { padding: 4px; vertical-align: top; }
.tax { margin-top: 8px; font-weight: bold; font-size: 18px; }
.items { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-top: 4px; }
.items th, .items td { border-right: 1px solid #000; padding: 3px 4px; vertical-align: top; }
.items th:last-child, .items td:last-child { border-right: none; }
.items thead th { background: #d3d3d3; font-weight: bold; text-align: left; font-size: 11px; }
.items tbody tr { height: 18px; }
.items td { word-break: break-word; }
.items tfoot td { border-top: 2px solid #000; font-weight: bold; padding-top: 4px; }
.footer { margin-top: auto; width: 100%; }
.footer td { padding: 6px; vertical-align: top; }
.r { text-align: right; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-marked deva">|| श्री ||</div>
    <div class="header-title">SHREE SADGURU KRUPA ENTERPRISES</div>
    <div>At- Sarpada Post-Umroli, Palghar, Maharashtra</div>
    <div><b>GSTIN :</b> 27ASKPP5407C1ZS</div>
    <div class="tax">TAX INVOICE</div>
  </div>

  <table class="box">
    <tr>
      <td width="60%">
        <b>Party :</b> ${partyName}<br>
        ${partyAddress}<br>
        <b>GSTIN :</b> ${partyGstin}
      </td>
      <td width="40%">
        <b>Invoice No :</b> ${invoiceNo}<br>
        <b>Date :</b> ${invoiceDate}<br>
        <b>State :</b> Maharashtra<br>
        <b>Code :</b> 27
      </td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th width="50%">Description</th>
        <th width="15%">HSN</th>
        <th width="10%">Qty</th>
        <th width="12.5%">Rate</th>
        <th width="12.5%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(i => `
      <tr>
        <td>${i.desc}</td>
        <td>${i.hsn}</td>
        <td class="r">${i.qty}</td>
        <td class="r">${Number(i.rate).toFixed(2)}</td>
        <td class="r">${Number(i.amount).toFixed(2)}</td>
      </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align: right; border-right: 1px solid #000;">Total</td>
        <td class="r">${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align: right; border-right: 1px solid #000;">CGST @9%</td>
        <td class="r">${cgst.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align: right; border-right: 1px solid #000;">SGST @9%</td>
        <td class="r">${sgst.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align: right; border-right: 1px solid #000;">Round Off</td>
        <td class="r">${roundoff.toFixed(2)}</td>
      </tr>
      <tr style="font-weight: bold; background: #e0e0e0;">
        <td colspan="4" style="text-align: right; border-right: 1px solid #000;">G. Total</td>
        <td class="r">Rs.${total.toLocaleString('en-IN')}</td>
      </tr>
    </tfoot>
  </table>

  <table class="footer">
    <tr>
      <td width="60%">
        <b>Amount in Words :</b><br>
        ${numberToWordsIndian(total)} Rupees Only
      </td>
      <td width="40%" align="center">
        <b>For SHREE SADGURU KRUPA ENTERPRISES</b><br><br>
        Proprietor
      </td>
    </tr>
  </table>
</div>
</body>
</html>
  `;
}

/* ================= SAND INVOICE TEMPLATE ================= */
function generateSandInvoiceHTML(items, invoiceNo, invoiceDate, partyName, partyAddress, partyGstin, subtotal, cgst, sgst, roundoff, total) {
  const ROWS_PER_PAGE = 35;
  const itemsWithDummies = [...items];
  const dummyCount = ROWS_PER_PAGE - items.length;
  
  if (dummyCount > 0) {
    for (let i = 0; i < dummyCount; i++) {
      itemsWithDummies.push({
        date: '', challan: '', truck: '', desc: '', hsn: '', qty: '', rate: '', amount: ''
      });
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page { size: A4; margin: 10mm; }
@font-face {
  font-family: 'NotoDeva';
  src: url('https://fonts.gstatic.com/s/notosansdevanagari/v25/xH2vF5pWnGCMpU5QIauqfBCF6f4.woff2') format('woff2');
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
.deva { font-family: 'NotoDeva', Arial, sans-serif; font-size: 18px; font-weight: bold; }
.page { min-height: 277mm; display: flex; flex-direction: column; }
.header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
.header-title { font-size: 16px; font-weight: bold; }
.header-marked { font-size: 18px; font-weight: bold; color: red; }
.box { width: 100%; border: 1px solid #000; margin-top: 4px; }
.box td { padding: 4px; vertical-align: top; }
.tax { margin-top: 8px; font-weight: bold; font-size: 18px; }
.items { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-top: 4px; }
.items th, .items td { border-right: 1px solid #000; padding: 3px 4px; vertical-align: top; }
.items th:last-child, .items td:last-child { border-right: none; }
.items thead th { background: #d3d3d3; font-weight: bold; text-align: left; font-size: 10px; }
.items tbody tr { height: 18px; }
.items td { word-break: break-word; font-size: 11px; }
.items tfoot td { border-top: 2px solid #000; font-weight: bold; padding-top: 4px; }
.footer { margin-top: auto; width: 100%; }
.footer td { padding: 6px; vertical-align: top; }
.r { text-align: right; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-marked deva">|| श्री ||</div>
    <div class="header-title">SHREE SADGURU KRUPA ENTERPRISES</div>
    <div>At-Sarpada Post-Umroli, Tal & Dist. Palghar, Maharashtra</div>
    <div><b>GSTIN :</b> 27ASKPP5407C1ZS</div>
    <div class="tax">TAX INVOICE</div>
  </div>

  <table class="box">
    <tr>
      <td width="60%">
        <b>Party :</b> ${partyName}<br>
        ${partyAddress}<br>
        <b>GSTIN :</b> ${partyGstin}
      </td>
      <td width="40%">
        <b>Invoice No :</b> ${invoiceNo}<br>
        <b>Date :</b> ${invoiceDate}<br>
        <b>State :</b> Maharashtra<br>
        <b>Code :</b> 27
      </td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th width="8%">Date</th>
        <th width="8%">Challan</th>
        <th width="8%">Truck</th>
        <th width="30%">Description</th>
        <th width="8%">HSN</th>
        <th width="8%">Qty</th>
        <th width="10%">Rate</th>
        <th width="12%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsWithDummies.map(i => `
      <tr>
        <td>${i.date}</td>
        <td>${i.challan}</td>
        <td>${i.truck}</td>
        <td>${i.desc}</td>
        <td>${i.hsn}</td>
        <td class="r">${i.qty}</td>
        <td class="r">${i.rate !== '' ? Number(i.rate).toFixed(2) : ''}</td>
        <td class="r">${i.amount !== '' ? Number(i.amount).toFixed(2) : ''}</td>
      </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="7" style="text-align: right; border-right: 1px solid #000;">CGST @2.5%</td>
        <td class="r">${cgst.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="7" style="text-align: right; border-right: 1px solid #000;">SGST @2.5%</td>
        <td class="r">${sgst.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="7" style="text-align: right; border-right: 1px solid #000;">Round Off</td>
        <td class="r">${roundoff.toFixed(2)}</td>
      </tr>
      <tr style="font-weight: bold; background: #e0e0e0;">
        <td colspan="7" style="text-align: right; border-right: 1px solid #000;">Total</td>
        <td class="r">Rs.${total.toLocaleString('en-IN')}</td>
      </tr>
    </tfoot>
  </table>

  <table class="footer">
    <tr>
      <td width="60%">
        <b>Amount in Words :</b><br>
        ${numberToWordsIndian(total)} Rupees Only
      </td>
      <td width="40%" align="center">
        <b>SHREE SADGURU KRUPA ENTERPRISES</b><br><br>
        Proprietor
      </td>
    </tr>
  </table>
</div>
</body>
</html>
  `;
}

/* ================= DOWNLOAD ROUTE ================= */
app.get('/download/:file', (req, res) => {
  const filePath = path.join(__dirname, 'tmp', req.params.file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, (err) => {
    if (err) {
      console.error('Download error:', err);
    }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Invoice server running on port ${PORT}`);
});
