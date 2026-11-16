import { translate } from '../i18n/translations'
import { Icon } from './Icon'

type DockPlace = { id: number; name: string }

/** Floating bar: nearby-place prompt, now-playing control and the auto-play switch. */
export function NarrationDock({
  nearby,
  playingPlace,
  preview,
  error,
  autoPlay,
  tracking,
  onListen,
  onStop,
  onAutoPlayChange,
}: {
  nearby: DockPlace | null
  playingPlace: DockPlace | null
  preview: boolean
  error: string
  autoPlay: boolean
  tracking: boolean
  onListen: (id: number) => void
  onStop: () => void
  onAutoPlayChange: (value: boolean) => void
}) {
  const showPrompt = nearby && playingPlace?.id !== nearby.id
  if (!showPrompt && !playingPlace && !error && !tracking) return null
  return (
    <div className="narration-dock" role="region" aria-label={translate('en', 'narrationTitle')}>
      {playingPlace && (
        <div className="narration-dock-row" aria-live="polite">
          <span className="narration-dock-icon"><Icon name="headphones" size={17} /></span>
          <span className="narration-dock-text">
            <strong>{translate('en', 'nowPlaying')}: {playingPlace.name}</strong>
            {preview && <small>{translate('en', 'previewNote')}</small>}
          </span>
          <button className="narration-dock-button" onClick={onStop}>{translate('en', 'stopAudio')}</button>
        </div>
      )}
      {showPrompt && (
        <div className="narration-dock-row" aria-live="polite">
          <span className="narration-dock-icon"><Icon name="pin" size={17} /></span>
          <span className="narration-dock-text"><strong>{translate('en', 'nearPrompt', { name: nearby.name })}</strong></span>
          <button className="narration-dock-button is-primary" onClick={() => onListen(nearby.id)}>{translate('en', 'listenNow')}</button>
        </div>
      )}
      {error && <div className="narration-dock-row is-error" role="alert"><span className="narration-dock-text"><strong>{error}</strong></span></div>}
      {tracking && (
        <label className="narration-dock-toggle" title={translate('en', 'autoPlayHint')}>
          <input type="checkbox" checked={autoPlay} onChange={(event) => onAutoPlayChange(event.target.checked)} />
          <span>{translate('en', 'autoPlay')}</span>
        </label>
      )}
    </div>
  )
}
