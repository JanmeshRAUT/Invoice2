const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

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

const app = express();
app.use(cors({
  origin: 'https://invoice2-eosin.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true
}));

// 🔥 CRITICAL: Handle preflight requests
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

app.post('/generate', async (req, res) => {
  try {
    const {
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
        desc: i.desc || '',
        hsn: i.hsn || '',
        qty,
        rate,
        amount: qty * rate
      };
    });

    /* ================= CALCULATIONS ================= */
    const subtotal = cleanItems.reduce((s, i) => s + i.amount, 0);
    const cgst = +(subtotal * 0.09).toFixed(2);
    const sgst = +(subtotal * 0.09).toFixed(2);
    const gross = subtotal + cgst + sgst;
    const total = Math.round(gross);
    const roundoff = +(total - gross).toFixed(2);

    /* ================= DUMMY ROWS ================= */
    const ROWS_PER_PAGE = 35; // perfect for A4 @ 10px font
    const itemsWithDummies = [...cleanItems];

    const dummyCount = ROWS_PER_PAGE - cleanItems.length;
    if (dummyCount > 0) {
      for (let i = 0; i < dummyCount; i++) {
        itemsWithDummies.push({
          desc: '',
          hsn: '',
          qty: '',
          rate: '',
          amount: ''
        });
      }
    }

    /* ================= HTML ================= */
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>
@page {
  size: A4;
  margin: 10mm;
}

@font-face {
  font-family: 'NotoDeva';
  src: url('https://fonts.gstatic.com/s/notosansdevanagari/v25/xH2vF5pWnGCMpU5QIauqfBCF6f4.0.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: #000;
}

.deva {
  font-family: 'NotoDeva', Arial, sans-serif;
  font-size: 18px;
  font-weight: bold;
}

/* PAGE */
.page {
  min-height: 277mm;
  display: flex;
  flex-direction: column;
}

/* HEADER */
.header {
  text-align: center;
  border-bottom: 2px solid #000;
  padding-bottom: 10px;
}
.header-title {
  font-size: 16px;
  font-weight: bold;
}
.header-marked {
  font-size: 18px;
  font-weight: bold;
  color: red;
}
/* PARTY TABLE *
/* BOX */
.box {
  width: 100%;
  border: 1px solid #000;
  margin-top: 4px;
}
.box td {
  padding: 4px;
  vertical-align: top;
}
.tax {
  margin-top: 8px;
  font-weight: bold;
  font-size: 18px;
}
/* ITEMS TABLE */
.items {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
  margin-top: 4px;
}

.items th,
.items td {
  border-right: 1px solid #000;
  padding: 3px 4px;
  vertical-align: top;
}

.items th:last-child,
.items td:last-child {
  border-right: none;
}

.items thead th {
  background: #d3d3d3;
  font-weight: bold;
  text-align: left;
}

.items tbody tr {
  height: 18px; /* 🔥 important for dummy rows */
}

.items tr {
  page-break-inside: avoid;
}

.items td {
  word-break: break-word;
}
/* TOTAL LINE ABOVE */
.items tfoot .total-row td {
  border-top: 2px solid #000;   /* 🔥 line above Total */
  font-weight: bold;
  padding-top: 4px;
}

/* FOOTER */
.footer {
  margin-top: auto;
  width: 100%;
}
.footer td {
  padding: 6px;
  vertical-align: top;
}

.r { text-align: right; }
.b { font-weight: bold; }

</style>
</head>

<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-marked deva">|| श्री ||</div>
    <div class="header-title">SHREE SADGURU KRUPA ENTERPRISES</div>
    <div>At- Sarpada Post-Umroli, Palghar, Maharashtra</div>
    <div><b>GSTIN :</b> 27ASKPP5407C1ZS</div>
    <div class="tax">TAX INVOICE</div>
  </div>

  <!-- PARTY -->
  <table class="box">
    <tr>
      <td width="60%">
        <b>Party :</b> ${party_name}<br>
        ${party_address}<br>
        <b>GSTIN :</b> ${party_gstin}
      </td>
      <td width="40%">
        <b>Invoice No :</b> ${invoice_no}<br>
        <b>Date :</b> ${invoice_date}<br>
        <b>State :</b> Maharashtra<br>
        <b>Code :</b> 27
      </td>
    </tr>
  </table>

  <!-- ITEMS -->
  <table class="items">
    <thead>
      <tr>
        <th width="36%">Description</th>
        <th width="14%">HSN</th>
        <th width="10%">Qty</th>
        <th width="20%">Rate</th>
        <th width="20%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsWithDummies.map(i => `
      <tr>
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
        <td>CGST @9%</td><td></td><td></td><td></td>
        <td class="r">${cgst.toFixed(2)}</td>
      </tr>
      <tr>
        <td>SGST @9%</td><td></td><td></td><td></td>
        <td class="r">${sgst.toFixed(2)}</td>
      </tr>
      <tr>
        <td>LESS : Round Off</td><td></td><td></td><td></td>
        <td class="r">${roundoff.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
       <td>Total</td><td></td><td></td><td></td>
        <td class="r">Rs.${total.toLocaleString('en-IN')}</td>
      </tr>

    </tfoot>
  </table>

  <!-- FOOTER -->
  <table class="footer">
    <tr>
      <td width="60%">
        <b>Amount in Words :</b><br>
        ${numberToWords(total)} Rupees Only
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

    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await page.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice_no}.pdf"`);

    res.end(pdf);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

/* ================= NUMBER TO WORDS ================= */
function numberToWords(num) {
  const a = ['', 'One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  if (num === 0) return 'Zero';

  const helper = n => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' ' + a[n%10] : '');
    if (n < 1000) return a[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + helper(n%100) : '');
    return '';
  };

  let result = '';
  if (num >= 1000) {
    result += helper(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  result += helper(num);
  return result.trim();
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Invoice server running on port ${PORT}`);
});
