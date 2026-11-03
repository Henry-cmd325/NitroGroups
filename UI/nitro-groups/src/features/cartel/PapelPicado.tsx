/**
 * Papel picado dibujado en código: una tira de banderitas de papel cortado colgadas de un hilo,
 * como en cualquier fiesta mexicana. Cada banderita lleva un calado distinto (flor, rombos,
 * estrella) recortado con evenodd, así el fondo se ve a través del papel.
 */

type Pattern = "flor" | "rombos" | "estrella" | "corazon";

const W = 120;
const H = 150;

function zigzag(): string {
    // Borde inferior en picos, como el corte de tijera.
    const teeth = 8;
    let d = `M0 6 H${W} V${H - 10}`;
    for (let i = teeth; i > 0; i--) {
        const x0 = (i * W) / teeth;
        const xm = x0 - W / teeth / 2;
        d += ` L${xm} ${H} L${x0 - W / teeth} ${H - 10}`;
    }
    return d + " Z";
}

function circle(cx: number, cy: number, r: number): string {
    return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

function diamond(cx: number, cy: number, r: number): string {
    return `M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z`;
}

function cuts(pattern: Pattern): string {
    const c = { x: W / 2, y: 72 };
    const border = Array.from({ length: 7 }, (_, i) => diamond(12 + i * 16, 20, 4)).join(" ");
    switch (pattern) {
        case "flor": {
            const petals = Array.from({ length: 8 }, (_, i) => {
                const a = (i * Math.PI) / 4;
                return circle(c.x + Math.cos(a) * 22, c.y + Math.sin(a) * 22, 9);
            }).join(" ");
            return `${border} ${petals} ${circle(c.x, c.y, 8)}`;
        }
        case "rombos":
            return `${border} ${[0, 1, 2].flatMap((r) => [0, 1, 2].map((k) => diamond(30 + k * 30, 46 + r * 26, 10))).join(" ")}`;
        case "estrella": {
            const pts = Array.from({ length: 10 }, (_, i) => {
                const a = -Math.PI / 2 + (i * Math.PI) / 5;
                const r = i % 2 === 0 ? 36 : 15;
                return `${c.x + Math.cos(a) * r} ${c.y + Math.sin(a) * r}`;
            });
            return `${border} M${pts.join(" L")} Z ${circle(c.x - 40, 118, 5)} ${circle(c.x + 40, 118, 5)}`;
        }
        case "corazon":
            return `${border} M${c.x} ${c.y + 30} C${c.x - 46} ${c.y} ${c.x - 22} ${c.y - 34} ${c.x} ${c.y - 12} C${c.x + 22} ${c.y - 34} ${c.x + 46} ${c.y} ${c.x} ${c.y + 30} Z ${circle(c.x, 118, 6)}`;
    }
}

const ORDER: Pattern[] = ["flor", "rombos", "estrella", "corazon"];

interface PapelPicadoProps {
    /** Colores de las banderitas, se repiten en orden. */
    colors: string[];
    count?: number;
    className?: string;
    /** Que las banderitas se mezan con el aire (se apaga con movimiento reducido). */
    sway?: boolean;
}

export function PapelPicado({ colors, count = 8, className, sway = false }: PapelPicadoProps) {
    const gap = 10;
    const width = count * W + (count - 1) * gap;
    return (
        <svg viewBox={`0 -8 ${width} ${H + 12}`} className={`${className ?? ""} ${sway ? "papel-sway" : ""}`} role="presentation" aria-hidden preserveAspectRatio="xMidYMin slice">
            <path d={`M0 0 Q${width / 2} 10 ${width} 0`} stroke="currentColor" strokeWidth="2" fill="none" />
            {Array.from({ length: count }, (_, i) => (
                <g key={i} transform={`translate(${i * (W + gap)} ${Math.sin((i / Math.max(count - 1, 1)) * Math.PI) * 4})`}>
                    <path
                        className="bandera"
                        style={{ ["--n" as string]: i }}
                        d={`${zigzag()} ${cuts(ORDER[i % ORDER.length])}`}
                        fill={colors[i % colors.length]}
                        fillRule="evenodd"
                    />
                </g>
            ))}
        </svg>
    );
}
