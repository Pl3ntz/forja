import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import Brand from '../components/Brand.js'

const PIX_COPIA_COLA = '00020126580014br.gov.bcb.pix013622890078-d19c-4a4f-92f1-d9fc9233c2f05204000053039865802BR5905Forja6009SAO PAULO62070503***630438FE'

export default function SupportPage() {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_COPIA_COLA)
    } catch {
      const input = document.createElement('input')
      input.value = PIX_COPIA_COLA
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-screen flex flex-col bg-forge-950 text-text-primary">
      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-40 bg-forge-950/80 backdrop-blur-xl border-b border-forge-700/50"
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
          <Link to="/" className="no-underline">
            <Brand iconSize={42} textClassName="text-xl" />
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="px-5 py-2 text-sm font-medium text-white bg-ember-500 rounded-lg hover:bg-ember-400 transition-all shadow-lg shadow-ember-500/20 no-underline">
                Painel
              </Link>
            ) : (
              <>
                <Link to="/auth/login" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors no-underline">
                  Entrar
                </Link>
                <Link to="/auth/register" className="px-5 py-2 text-sm font-medium text-white bg-ember-500 rounded-lg hover:bg-ember-400 transition-all shadow-lg shadow-ember-500/20 no-underline">
                  Comecar Gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,53,0.07)_0%,transparent_55%)] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-4xl mx-auto text-center px-5 sm:px-8 pt-16 pb-12 lg:pt-20 lg:pb-16"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5 leading-tight">
            <span className="bg-gradient-to-r from-text-primary via-text-primary to-text-secondary bg-clip-text text-transparent">
              Ajude a manter o Forja{' '}
            </span>
            <span className="bg-gradient-to-r from-ember-400 to-molten-400 bg-clip-text text-transparent">
              gratuito
            </span>
          </h1>
          <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            O Forja e um projeto open-source e gratuito. Sua contribuicao ajuda a manter os servidores, a IA e o desenvolvimento ativo.
          </p>
        </motion.div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pb-16 w-full">
        {/* PIX Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-forge-800/60 border border-forge-600/50 rounded-2xl p-8 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* QR Code */}
            <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-2.5">
              <img
                src="/pix-qr.png"
                alt="QR Code PIX"
                className="w-full h-full"
              />
            </div>

            <div className="flex-1 w-full text-center sm:text-left">
              <h2 className="text-xl font-bold text-text-primary mb-2">Doe via PIX</h2>
              <p className="text-sm text-text-secondary mb-5">
                Escaneie o QR code com o app do seu banco ou copie o codigo para fazer um PIX de qualquer valor.
              </p>

              <button
                type="button"
                className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-ember-500 rounded-xl hover:bg-ember-400 transition-all shadow-lg shadow-ember-500/20"
                onClick={handleCopyPix}
              >
                {copied ? 'Codigo copiado!' : 'Copiar codigo PIX'}
              </button>

              {copied && (
                <p className="text-xs text-success mt-2">Cole no app do seu banco na opcao "PIX Copia e Cola".</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* External links grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12"
        >
          {/* GitHub Sponsors */}
          <a
            href="https://github.com/sponsors/vitor-plentz"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-forge-800/60 border border-forge-600/50 rounded-2xl p-6 hover:border-molten-500/30 transition-all no-underline group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#c96198]/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="#c96198">
                  <path fillRule="evenodd" d="M4.25 2.5c-1.336 0-2.75 1.164-2.75 3 0 2.15 1.58 4.144 3.365 5.682A20.565 20.565 0 008 13.393a20.561 20.561 0 003.135-2.211C12.92 9.644 14.5 7.65 14.5 5.5c0-1.836-1.414-3-2.75-3-1.373 0-2.609.986-3.029 2.456a.75.75 0 01-1.442 0C6.859 3.486 5.623 2.5 4.25 2.5z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-molten-400 transition-colors">GitHub Sponsors</h3>
            </div>
            <p className="text-sm text-text-secondary">Apoie mensalmente pelo GitHub Sponsors e receba badges exclusivos.</p>
          </a>

          {/* Buy Me a Coffee */}
          <a
            href="https://buymeacoffee.com/compilercv"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-forge-800/60 border border-forge-600/50 rounded-2xl p-6 hover:border-molten-500/30 transition-all no-underline group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFDD00]/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFDD00">
                  <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c.033-.031.063-.06.1-.084.58-.378 1.292-.51 1.994-.58a24.3 24.3 0 013.109-.033c.439.028.876.073 1.313.13.168.022.336.048.503.078.318.062.64.089.898-.09.26-.18.35-.508.31-.796z" />
                  <path d="M18.5 9.5H5.5a1 1 0 00-1 1v.5c0 3.5 2.5 6.5 6 7.3v1.7H9a.5.5 0 000 1h6a.5.5 0 000-1h-1.5v-1.7c3.5-.8 6-3.8 6-7.3v-.5a1 1 0 00-1-1z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-molten-400 transition-colors">Buy Me a Coffee</h3>
            </div>
            <p className="text-sm text-text-secondary">Faca uma doacao unica pelo Buy Me a Coffee.</p>
          </a>
        </motion.div>

        {/* Contribute with code */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center text-sm text-text-secondary"
        >
          Prefere contribuir com codigo?{' '}
          <a
            href="https://github.com/Pl3ntz/forja"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ember-400 hover:text-ember-300 transition-colors"
          >
            Veja o repositorio no GitHub
          </a>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-forge-700/40 bg-forge-950 mt-auto">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-text-muted">
              &copy; {new Date().getFullYear()} Forja. Todos os direitos reservados.
            </p>
            <p className="text-xs text-text-muted">
              Feito com LaTeX, React e muita dedicacao.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
