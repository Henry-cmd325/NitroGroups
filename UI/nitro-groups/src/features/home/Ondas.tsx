/**
 * Ondas de sonido dibujadas en código: líneas finas que se cruzan y fluyen despacio, como una
 * señal de audio vista de lado. Es la visual de la portada; no finge ser una foto de nadie.
 * Se mueven con stroke-dashoffset y transform (se detienen con movimiento reducido).
 */

const W = 1200;
const H = 800;

function wave(i: number, total: number): string {
    const amp = 40 + Math.sin(i * 0.7) * 30 + (i / total) * 120;
    const freq = 0.004 + (i % 5) * 0.0009;
    const phase = i * 0.55;
    const mid = H * 0.52 + Math.cos(i * 0.4) * 40;
    let d = "";
    for (let x = -40; x <= W + 40; x += 12) {
        const env = Math.sin(((x + 40) / (W + 80)) * Math.PI); // se abre al centro
        const y = mid + Math.sin(x * freq + phase) * amp * env + Math.sin(x * freq * 2.3 + phase) * 12 * env;
        d += `${x === -40 ? "M" : "L"}${x.toFixed(0)} ${y.toFixed(1)} `;
    }
    return d;
}

export function Ondas({ className, count = 22 }: { className?: string; count?: number }) {
    const lines = Array.from({ length: count }, (_, i) => wave(i, count));
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden role="presentation" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id="onda-fade" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#C9B8FF" stopOpacity="0" />
                    <stop offset="0.35" stopColor="#C9B8FF" stopOpacity="0.8" />
                    <stop offset="0.7" stopColor="#F4F2F7" stopOpacity="0.65" />
                    <stop offset="1" stopColor="#C9B8FF" stopOpacity="0" />
                </linearGradient>
            </defs>
            <g className="ondas" fill="none" stroke="url(#onda-fade)" strokeLinecap="round">
                {lines.map((d, i) => (
                    <path
                        key={i}
                        d={d}
                        strokeWidth={i % 6 === 0 ? 1.6 : 1}
                        strokeOpacity={0.35 + (i % 4) * 0.16}
                        className="onda"
                        style={{ ["--n" as string]: i }}
                    />
                ))}
            </g>
        </svg>
    );
}
