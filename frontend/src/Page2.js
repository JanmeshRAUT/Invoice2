import { useState, useEffect } from "react";
import axios from "axios";
import "./Page2.css";

export default function Page2() {
  /* ================= STATE ================= */
  const [form, setForm] = useState({
    invoice_no: "",
    invoice_date: new Date().toISOString().split("T")[0],
    party_name: "",
    party_address: "",
    party_gstin: ""
  });

  const [items, setItems] = useState([
    {
      date: "",
      challan: "",
      truck: "",
      desc: "Concrete Sand",
      hsn: "25174900",
      qty: "",
      rate: ""
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [apiUrl, setApiUrl] = useState("");

  /* ================= BACKEND HEALTH ================= */
  useEffect(() => {
    const url = "https://invoice2-uu6l.onrender.com";
    setApiUrl(url);

    const checkHealth = async () => {
      try {
        await axios.get(`${url}/health`, { timeout: 15000 });
        setConnected(true);
      } catch (e) {
        if (e.code === "ECONNABORTED") setConnected(true);
        else setConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ================= HANDLERS ================= */
  const handleFormChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleItemChange = (i, key, val) => {
    const copy = [...items];
    copy[i][key] = val;
    setItems(copy);
  };

  const addItem = () =>
    setItems([
      ...items,
      { date: "", challan: "", truck: "", desc: "", hsn: "", qty: "", rate: "" }
    ]);

  /* ================= CALCULATIONS ================= */
  const subtotal = items.reduce(
    (s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0),
    0
  );

  const cgst = +(subtotal * 0.025).toFixed(2);
  const sgst = +(subtotal * 0.025).toFixed(2);
  const gross = subtotal + cgst + sgst;
  const roundOff = +(Math.round(gross) - gross).toFixed(2);
  const total = Math.round(gross);

  const numToWords = n => n.toLocaleString("en-IN");

  /* ================= SUBMIT ================= */
  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        `${apiUrl}/generate`,
        { invoice_type: 'sand', ...form, items },
        { timeout: 60000 }
      );
      window.location.href = res.data.url;
    } catch (err) {
      alert("Backend waking up. Try again.");
      console.error(err);
    }
    setLoading(false);
  };

  /* ================= UI ================= */
  return (
    <>
      <div className="page2-layout">
        <div className="layout">

          {/* STATUS BAR */}
          <div className={`status ${connected ? "ok" : "wait"}`}>
            {connected ? "Backend Connected" : "Backend Connecting..."} — {apiUrl}
          </div>

          {/* FORM */}
          <div className="card">
            <h3>Invoice Generator</h3>

            <form onSubmit={submit}>
              <input name="invoice_no" placeholder="Invoice No" onChange={handleFormChange} required />
              <input type="date" name="invoice_date" value={form.invoice_date} onChange={handleFormChange} />
              <input name="party_name" placeholder="Party Name" onChange={handleFormChange} required />
              <input name="party_address" placeholder="Party Address" onChange={handleFormChange} />
              <input name="party_gstin" placeholder="Party GSTIN" onChange={handleFormChange} />

              <h4>Items</h4>

              {items.map((it, i) => (
                <div className="row" key={i}>
                  <input placeholder="Date" value={it.date} onChange={e => handleItemChange(i, "date", e.target.value)} />
                  <input placeholder="Challan" value={it.challan} onChange={e => handleItemChange(i, "challan", e.target.value)} />
                  <input placeholder="Truck No" value={it.truck} onChange={e => handleItemChange(i, "truck", e.target.value)} />
                  <input placeholder="Particulars" value={it.desc} onChange={e => handleItemChange(i, "desc", e.target.value)} />
                  <input placeholder="HSN" value={it.hsn} onChange={e => handleItemChange(i, "hsn", e.target.value)} />
                  <input type="number" placeholder="Qty" value={it.qty} onChange={e => handleItemChange(i, "qty", e.target.value)} />
                  <input type="number" placeholder="Rate" value={it.rate} onChange={e => handleItemChange(i, "rate", e.target.value)} />
                </div>
              ))}

              <button type="button" onClick={addItem}>+ Add Item</button>
              <button type="submit" disabled={loading}>{loading ? 'Generating PDF…' : 'Generate PDF'}</button>
            </form>
          </div>

          {/* PREVIEW */}
          <div className="card preview">
            <div className="header">
              <img className="shree" src="/shree-logo.jpg" alt="Shree Logo" />
              <div className="firm">SHREE SADGURU KRUPA ENTERPRISES</div>
              <div>At-Sarpada Post-Umroli, Tal & Dist. Palghar, Maharashtra</div>
              <div className="gst">GSTIN : 27ASKPP5407C1ZS</div>
              <hr />
              <h3>TAX INVOICE</h3>
            </div>

            <table>
              <tbody>
                <tr>
                  <td>
                    <b>PARTY DETAILS</b><br />
                    {form.party_name}<br />
                    {form.party_address}<br />
                    <b>GST:</b> {form.party_gstin}
                  </td>
                  <td>
                    <b>Invoice No:</b> {form.invoice_no}<br />
                    <b>Date:</b> {form.invoice_date}<br />
                    <b>State:</b> Maharashtra<br />
                    <b>Code:</b> 27
                  </td>
                </tr>
              </tbody>
            </table>

            <table>
              <thead>
                <tr>
                  <th>Sr</th><th>Date</th><th>Challan</th><th>Truck</th>
                  <th>Particulars</th><th>HSN</th>
                  <th>Qty</th><th>Rate</th><th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{it.date}</td>
                    <td>{it.challan}</td>
                    <td>{it.truck}</td>
                    <td>{it.desc}</td>
                    <td>{it.hsn}</td>
                    <td align="right">{it.qty}</td>
                    <td align="right">{it.rate}</td>
                    <td align="right">{(it.qty * it.rate || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="totals">
              <tbody>
                <tr><td>Total</td><td>{subtotal.toFixed(2)}</td></tr>
                <tr><td>CGST 2.5%</td><td>{cgst}</td></tr>
                <tr><td>SGST 2.5%</td><td>{sgst}</td></tr>
                <tr><td>Round Off</td><td>{roundOff}</td></tr>
                <tr className="grand"><td>G. TOTAL</td><td>{total}</td></tr>
              </tbody>
            </table>

            <table>
              <tbody>
                <tr>
                  <td><b>Amount In Words</b><br />{numToWords(total)} Rupees Only</td>
                  <td align="center"><b>SHREE SADGURU KRUPA ENTERPRISES</b><br /><br />Proprietor</td>
                </tr>
              </tbody>
            </table>

          </div>
        </div>
      </div>
    </>
  );
}
