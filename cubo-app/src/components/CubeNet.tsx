import type { CubeState, Face } from '../lib/cube/types'
import { PLACEHOLDER_COLOR } from '../lib/cube/types'
import { FACE_INPUT_ORDER } from '../lib/cube/faceOrder'
import '../App.css'

type HighlightMap = Partial<Record<Face, Set<number>>>
type IssueMessageMap = Partial<Record<Face, Record<number, string[]>>>

type CubeNetProps = {
  state: CubeState
  onStickerClick?: (face: Face, index: number) => void
  highlightedStickers?: HighlightMap
  issueMessages?: IssueMessageMap
  activeFace?: Face
}

const CubeNet = ({ state, onStickerClick, highlightedStickers, issueMessages, activeFace }: CubeNetProps) => {
  return (
    <div className="cube-net">
      {FACE_INPUT_ORDER.map((face) => (
        <div key={face} className={`face face-${face}`}>
          <p className="face-label">{face}</p>
          <div className="grid">
            {state[face].map((color, idx) => {
              const isHighlighted = highlightedStickers?.[face]?.has(idx) ?? false
              const tooltip = issueMessages?.[face]?.[idx]
              const tooltipText = tooltip?.join(' • ')
              const isLocked = Boolean(activeFace && face !== activeFace)
              const displayColor = state[face][idx] === PLACEHOLDER_COLOR ? '#0f172a' : color
              return (
                <button
                  key={idx}
                  className={`sticker ${isHighlighted ? 'sticker-error' : ''}`}
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
        </div>
      ))}
    </div>
  )
}

export default CubeNet