import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { translate } from '../i18n/translations'
import { Icon } from './Icon'

function isLocalHost(url: string) {
  try {
    const { hostname } = new URL(url)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  } catch {
    return false
  }
}

/** Shows a QR code that opens the guide on another device. No sign-in is involved. */
export function ShareQrDialog({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(() => `${window.location.origin}${window.location.pathname}`)
  const [image, setImage] = useState('')
  const [failed, setFailed] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url.trim() || ' ', { width: 280, margin: 2, errorCorrectionLevel: 'M' })
      .then((data) => { if (!cancelled) { setImage(data); setFailed(false) } })
      .catch(() => { if (!cancelled) { setImage(''); setFailed(true) } })
    return () => { cancelled = true }
  }, [url])

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="detail-modal share-qr-dialog" role="dialog" aria-modal="true" aria-labelledby="share-qr-title" onClick={(event) => event.stopPropagation()}>
        <button ref={closeRef} className="modal-close" onClick={onClose} aria-label={translate('en', 'close')}><Icon name="close" /></button>
        <div className="share-qr-body">
          <h2 id="share-qr-title">{translate('en', 'qrShareTitle')}</h2>
          <p>{translate('en', 'qrShareCopy')}</p>
          <div className="share-qr-image">
            {image ? <img src={image} alt={`QR code for ${url}`} width={280} height={280} /> : <span>{failed ? translate('en', 'qrShareFailed') : '…'}</span>}
          </div>
          <label className="share-qr-url">
            <span>{translate('en', 'qrShareUrl')}</span>
            <input value={url} onChange={(event) => setUrl(event.target.value)} inputMode="url" spellCheck={false} />
          </label>
          {isLocalHost(url) && <p className="share-qr-warning" role="note">{translate('en', 'qrShareLocalhost')}</p>}
        </div>
      </section>
    </div>
  )
}
