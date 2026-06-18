import { useWallet } from '../context/WalletContext'

export default function InstallPhantomModal() {
  const { showInstallModal, setShowInstallModal } = useWallet()
  if (!showInstallModal) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={() => setShowInstallModal(false)}
    >
      <div
        style={{
          background: '#14101f', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '40px 36px', maxWidth: 400, width: '90%',
          textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 24,
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: -0.3 }}>
          Phantom Wallet Required
        </h3>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 28 }}>
          AmbientMind requires Phantom wallet to connect to the Ambient Network
        </p>
        <a
          href="https://phantom.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block', background: '#a78bfa', color: '#fff',
            padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            textDecoration: 'none', marginBottom: 12, transition: 'all 0.2s',
          }}
        >
          Install Phantom
        </a>
        <br />
        <button
          onClick={() => setShowInstallModal(false)}
          style={{
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)',
            fontSize: 13, cursor: 'pointer', marginTop: 8, fontFamily: 'Inter, sans-serif',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
