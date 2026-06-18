import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import '../styles/dashboard.css'

const NAV_ITEMS = [
  {
    to: '/console', label: 'Console',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  },
  {
    to: '/agents', label: 'Agent Network',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m-7.07-15.07l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>,
  },
  {
    to: '/proofs', label: 'Proof Receipts',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  },
  {
    to: '/history', label: 'Mission History',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
]

const MOBILE_ITEMS = [
  { to: '/console', label: 'Console', icon: NAV_ITEMS[0].icon },
  { to: '/agents', label: 'Agents', icon: NAV_ITEMS[1].icon },
  { to: '/proofs', label: 'Proofs', icon: NAV_ITEMS[2].icon },
  { to: '/history', label: 'History', icon: NAV_ITEMS[3].icon },
]

export default function DashboardLayout({ children }) {
  const { shortAddress, walletAddress, disconnect } = useWallet()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleCopy = () => {
    if (walletAddress) navigator.clipboard.writeText(walletAddress)
    setDropdownOpen(false)
  }

  const handleDisconnect = async () => {
    setDropdownOpen(false)
    await disconnect()
    navigate('/')
  }

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <div className="dash-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Ambient<span>Mind</span>
        </div>
        <nav className="dash-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'dash-nav-item' + (isActive ? ' active' : '')}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="dash-sidebar-bottom">
          <div className="dash-wallet-badge" ref={dropRef}>
            <button
              className="dash-wallet-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span className="dash-wallet-dot" />
              <span className="dash-wallet-addr">{shortAddress}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {dropdownOpen && (
              <div className="dash-wallet-dropdown">
                <button onClick={handleCopy}>Copy address</button>
                <button onClick={handleDisconnect} className="dash-disconnect">Disconnect</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="dash-main">
        {children}
      </main>

      <nav className="dash-mobile-tabs">
        {MOBILE_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 'dash-tab' + (isActive ? ' active' : '')}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
