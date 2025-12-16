import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

export default function App() {

  /* ---------------- FORM STATE ---------------- */
  const [form, setForm] = useState({
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0],
    party_name: '',
    party_address: '',
    party_gstin: ''
  });

  const [items, setItems] = useState([
    { desc: 'JK Laxmi Cement', hsn: '25232930', qty: '', rate: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const previewRef = useRef(null);

  /* ---------------- HEALTH CHECK (RENDER SAFE) ---------------- */
  useEffect(() => {
    const checkConnection = async () => {
      const url = 'https://invoice2-uu6l.onrender.com';
      setApiUrl(url);

      try {
        await axios.get(`${url}/health`, {
          timeout: 15000 // Render cold start safe
        });
        setConnected(true);
      } catch (err) {
        // Treat timeout as warming up (NOT failure)
        if (err.code === 'ECONNABORTED') {
          setConnected(true);
        } else {
          setConnected(false);
        }
      }
    };

    checkConnection();

    // Do NOT ping Render too frequently
    const interval = setInterval(checkConnection, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- HANDLERS ---------------- */
  const changeForm = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const changeItem = (i, key, val) => {
    const copy = [...items];
    copy[i][key] = val;
    setItems(copy);
  };

  const addItem = () =>
    setItems([...items, { desc: '', hsn: '', qty: '', rate: '' }]);

  /* ---------------- CALCULATIONS ---------------- */
  const subtotal = items.reduce(
    (s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0),
    0
  );

  const cgst = +(subtotal * 0.09).toFixed(2);
  const sgst = +(subtotal * 0.09).toFixed(2);
  const total = Math.round(subtotal + cgst + sgst);

  const numToWords = n =>
    n === 0 ? 'Zero' : n.toLocaleString('en-IN');

  /* ---------------- SUBMIT (PDF DOWNLOAD) ---------------- */
  const submit = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${apiUrl}/generate`,
        { invoice_type: 'simple', ...form, items },
        {
          timeout: 60000
        }
      );

      // 🔥 OPEN DOWNLOAD LINK
      window.location.href = res.data.url;

    } catch (err) {
      alert('❌ Backend is waking up. Try again in a moment.');
      console.error(err);
    }

    setLoading(false);
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="layout">

      {/* ---------- STATUS BAR ---------- */}
      <div className={`status-bar ${connected ? 'connected' : 'disconnected'}`}>
        <div className="status-bar-content">
          <div className="status-indicator">
            <span className="status-dot"></span>
            <div className="status-info">
              <p className="status-label">
                {connected ? 'Backend Connected' : 'Backend Connecting...'}
              </p>
              <p className="status-url">{apiUrl}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- FORM ---------- */}
      
      <div className="form-panel card">
        <h3>Invoice Generator</h3>

        <form onSubmit={submit}>
          <input name="invoice_no" placeholder="Invoice No" onChange={changeForm} required />
          <input type="date" name="invoice_date" value={form.invoice_date} onChange={changeForm} />
          <input name="party_name" placeholder="Party Name" onChange={changeForm} required />
          <input name="party_address" placeholder="Party Address" onChange={changeForm} />
          <input name="party_gstin" placeholder="Party GSTIN" onChange={changeForm} />

          <h4>Items</h4>
          {items.map((it, i) => (
            <div key={i} className="row">
              <input placeholder="Description" value={it.desc}
                onChange={e => changeItem(i, 'desc', e.target.value)} />
              <input placeholder="HSN" value={it.hsn}
                onChange={e => changeItem(i, 'hsn', e.target.value)} />
              <input type="number" placeholder="Qty" value={it.qty}
                onChange={e => changeItem(i, 'qty', e.target.value)} />
              <input type="number" placeholder="Rate" value={it.rate}
                onChange={e => changeItem(i, 'rate', e.target.value)} />
            </div>
          ))}

          <button type="button" onClick={addItem}>+ Add Item</button>

          <button disabled={loading}>
            {loading ? 'Generating PDF…' : 'Generate PDF'}
          </button>
        </form>
      </div>

      {/* ---------- PREVIEW ---------- */}
      <div className="preview-panel card">
        <h4>Invoice Preview</h4>

        <div ref={previewRef}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>श्री</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              SHREE SADGURU KRUPA ENTERPRISES
            </div>
            <div>At- Sarpada Post-Umroli, Palghar, Maharashtra</div>
            <div><b>GSTIN:</b> 27ASKPP5407C1ZS</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>TAX INVOICE</div>
          </div>

          <table width="100%" border="1" style={{ marginTop: 12 }}>
            <tbody>
              <tr>
                <td width="60%">
                  <b>Party</b><br />
                  {form.party_name}<br />
                  {form.party_address}<br />
                  <b>GSTIN:</b> {form.party_gstin}
                </td>
                <td width="40%">
                  <b>Invoice No:</b> {form.invoice_no}<br />
                  <b>Date:</b> {form.invoice_date}<br />
                  <b>State:</b> Maharashtra<br />
                  <b>Code:</b> 27
                </td>
              </tr>
            </tbody>
          </table>

          <table width="100%" border="1" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Description</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.desc}</td>
                  <td>{it.hsn}</td>
                  <td align="right">{it.qty}</td>
                  <td align="right">{Number(it.rate || 0).toFixed(2)}</td>
                  <td align="right">{((it.qty || 0) * (it.rate || 0)).toFixed(2)}</td>
                </tr>
              ))}
              <tr><td>CGST 9%</td><td></td><td></td><td></td><td align="right">{cgst}</td></tr>
              <tr><td>SGST 9%</td><td></td><td></td><td></td><td align="right">{sgst}</td></tr>
              <tr style={{ fontWeight: 700 }}>
                <td>TOTAL</td><td></td><td></td><td></td>
                <td align="right">{total}</td>
              </tr>
            </tbody>
          </table>

          <table width="100%" border="1" style={{ marginTop: 12 }}>
            <tbody>
              <tr>
                <td width="60%">
                  <b>Amount in Words</b><br />
                  {numToWords(total)} Rupees Only
                </td>
                <td width="40%" align="center">
                  <b>For SHREE SADGURU KRUPA ENTERPRISES</b><br /><br />
                  Proprietor
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
