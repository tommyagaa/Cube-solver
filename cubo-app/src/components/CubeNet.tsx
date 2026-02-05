import type { CubeState, Face } from '../lib/cube/types'
import '../App.css'

type HighlightMap = Partial<Record<Face, Set<number>>>

type CubeNetProps = {
  state: CubeState
  onStickerClick?: (face: Face, index: number) => void
  highlightedStickers?: HighlightMap
}

const faceOrder: Face[] = ['U', 'L', 'F', 'R', 'B', 'D']

const CubeNet = ({ state, onStickerClick, highlightedStickers }: CubeNetProps) => {
  return (
    <div className="cube-net">
      {faceOrder.map((face) => (
        <div key={face} className={`face face-${face}`}>
          <p className="face-label">{face}</p>
          <div className="grid">
            {state[face].map((color, idx) => {
              const isHighlighted = highlightedStickers?.[face]?.has(idx) ?? false
              return (
                <button
                  key={idx}
                  className={`sticker ${isHighlighted ? 'sticker-error' : ''}`}
                  data-highlighted={isHighlighted ? 'true' : 'false'}
                  style={{ backgroundColor: color }}
                  type="button"
                  aria-label={`${face} sticker ${idx}`}
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