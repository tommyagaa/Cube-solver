import type { CubeState, Face } from '../lib/cube/types'
import { PLACEHOLDER_COLOR } from '../lib/cube/types'
import { FACE_INPUT_ORDER } from '../lib/cube/faceOrder'
import '../App.css'

type HighlightMap = Partial<Record<Face, Set<number>>>
type IssueMessageMap = Partial<Record<Face, Record<number, string[]>>>
export type FaceHint = {
  label: string
  icon?: string
  variant?: 'primary' | 'secondary'
}
export type FaceHintMap = Partial<Record<Face, FaceHint>>

type CubeNetProps = {
  state: CubeState
  onStickerClick?: (face: Face, index: number) => void
  highlightedStickers?: HighlightMap
  issueMessages?: IssueMessageMap
  activeFace?: Face
  changedStickers?: HighlightMap
  faceHints?: FaceHintMap
}

const CubeNet = ({ state, onStickerClick, highlightedStickers, issueMessages, activeFace, changedStickers, faceHints }: CubeNetProps) => {
  return (
    <div className="cube-net">
      {FACE_INPUT_ORDER.map((face) => (
        <div key={face} className={`face face-${face}`}>
          <p className="face-label">{face}</p>
          <div
            className={`grid ${faceHints?.[face]?.variant === 'secondary' ? 'grid-support' : ''} ${faceHints?.[face]?.variant === 'primary' ? 'grid-target' : ''}`.trim()}
          >
            {state[face].map((color, idx) => {
              const isHighlighted = highlightedStickers?.[face]?.has(idx) ?? false
              const isChanged = changedStickers?.[face]?.has(idx) ?? false
              const tooltip = issueMessages?.[face]?.[idx]
              const tooltipText = tooltip?.join(' • ')
              const isLocked = Boolean(activeFace && face !== activeFace)
              const displayColor = state[face][idx] === PLACEHOLDER_COLOR ? '#0f172a' : color
              return (
                <button
                  key={idx}
                  className={`sticker ${isHighlighted ? 'sticker-error' : ''} ${isChanged ? 'sticker-changed' : ''}`}
                  data-highlighted={isHighlighted ? 'true' : 'false'}
                  data-issue={tooltipText}
                  title={tooltipText}
                  style={{ backgroundColor: displayColor }}
                  type="button"
                  aria-label={`${face} sticker ${idx}`}
                  disabled={isLocked}
                  onClick={() => onStickerClick?.(face, idx)}
                />
              )
            })}
          </div>
          {faceHints?.[face] && (
            <span className={`face-hint ${faceHints[face]?.variant ?? 'primary'}`}>
              {faceHints[face]?.icon && <span className="face-hint-icon">{faceHints[face]?.icon}</span>}
              {faceHints[face]?.label}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export default CubeNet