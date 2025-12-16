import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-header">
          <h1>Invoice Generator</h1>
          <p>Manage your invoices efficiently</p>
        </div>

        <div className="home-cards">
          <div 
            className="home-card"
            onClick={() => navigate('/app')}
          >
            <div className="card-icon">�</div>
            <h2>Cement Invoice</h2>
            <p>Generate professional cement invoices with GST calculations (9% CGST + 9% SGST)</p>
            <button className="card-button">
              Create Cement Invoice
            </button>
          </div>

          <div 
            className="home-card"
            onClick={() => navigate('/page2')}
          >
            <div className="card-icon">🏗️</div>
            <h2>Sand/Concrete Invoice</h2>
            <p>Create sand and concrete invoices with Date, Challan, and Truck details (2.5% CGST + 2.5% SGST)</p>
            <button className="card-button">
              Create Sand Invoice
            </button>
          </div>
        </div>

        <div className="home-footer">
          <p>© 2025 Shree Sadguru Krupa Enterprises. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
