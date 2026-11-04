/**
 * Clave HMAC de la cookie de sesión. Falla cerrada: sin AUTH0_SECRET (o con uno corto)
 * no se firma ni se acepta ninguna sesión. Antes había un valor por defecto público que
 * permitía forjar sesiones si la variable faltaba.
 */
export function getSessionSecret(): Uint8Array {
    const secret = process.env.AUTH0_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("AUTH0_SECRET no está configurado o tiene menos de 32 caracteres.");
    }
    return new TextEncoder().encode(secret);
}
