"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectHandlersRealism = void 0;
/**
 * Heurística conservadora para decidir si los handlers generados son "reales"
 * (tocan repositorios o lógica de dominio) o son stubs deterministas (devuelven
 * valores hardcodeados tipo `Id = 0, Status = string.Empty`).
 *
 * Política:
 *  - Un handler es "real" si: tiene DI con tipo reconocible Y hace algo visible
 *    con esa dependencia (llamada a repo/context/mediator/uow), O usa acceso
 *    no trivial a entidades mapeando múltiples campos.
 *  - Un handler es "stub" si tiene fingerprint del fallback determinista, o
 *    devuelve `Task.FromResult(Result<T>.Success(new T { ... literales ...}))`
 *    sin dependencia alguna.
 *  - Acepta handlers sync y async por igual.
 *
 * No pretende ser perfecta: el objetivo es no mentir al usuario cuando entregamos
 * un esqueleto vacío como si fuera una implementación.
 */
function detectHandlersRealism(files) {
    const handlers = files.filter(f => /Handler\.cs$/i.test(f.path));
    const inspected = [];
    for (const handler of handlers) {
        const verdict = inspectHandler(handler.content);
        inspected.push({ path: handler.path, ...verdict });
    }
    const hasAny = handlers.length > 0;
    const anyReal = inspected.some(h => h.real);
    const allStubs = hasAny && inspected.every(h => !h.real);
    return { hasAny, anyReal, allStubs, inspected };
}
exports.detectHandlersRealism = detectHandlersRealism;
function inspectHandler(content) {
    // 1) Fingerprint explícito del fallback determinista → stub.
    if (/TODO:\s*Implementaci.n m.nima determinista/i.test(content)) {
        return { real: false, reason: "Fingerprint del fallback determinista detectado." };
    }
    // 2) Stub evidente: Task.FromResult(Result<T>.Success(...)) con literales,
    // sin await, sin llamadas a miembros injectados.
    const handleMatch = content.match(/Handle\s*\([^)]*\)\s*(?:=>|\{)/m);
    if (handleMatch) {
        const body = content.slice(handleMatch.index || 0);
        const bodyHasAwait = /\bawait\b/.test(body);
        const bodyHasMemberCall = /\b_?[a-zA-Z_]\w*\s*\.\s*\w+\s*\(/.test(body);
        const bodyReturnsLiteralOnly = /Task\.FromResult\s*\(\s*Result<[^>]+>\.Success/.test(body);
        if (!bodyHasAwait && !bodyHasMemberCall && bodyReturnsLiteralOnly) {
            return { real: false, reason: "Handler devuelve literal hardcodeado sin repo ni await." };
        }
    }
    const signals = {
        hasDi: 
        // Ctor clásico o primary constructor con un tipo que huele a infra.
        (/(?:\bpublic\s+\w+Handler\s*\(|\bpublic\s+(?:sealed\s+)?class\s+\w+Handler\s*\()([^)]+)\)/.exec(content) || [])
            .some((chunk, idx) => idx > 0 && /\b(I\w+Repository|IMapper|IUnitOfWork\w*|DbContext|I\w*Service|ISender|IMediator|IPublisher|ICurrentUser|IClock|ILogger)\b/.test(chunk))
            || /\b(I\w+Repository|IMapper|IUnitOfWork\w*|DbContext|I\w*Service|ISender|IMediator|IPublisher|ICurrentUser|IClock|ILogger)\b\s+_\w+/.test(content),
        hasRepoOrContextCall: /\b_?\w+\s*\.\s*(Get|List|Add|Create|Remove|Delete|Update|Query|Include|FirstOrDefault|Single|Where|Find|Set|Save|Commit|Publish|Execute|Map)\w*(?:Async)?\s*\(/.test(content),
        hasAwait: /\bawait\s+[\w.]/.test(content),
        hasMultiFieldMapping: countEntityMappings(content) >= 3,
        hasPersistenceSignal: /\b(?:SaveChangesAsync|SaveChanges|CommitAsync|Commit|PublishAsync|Publish)\s*\(/.test(content),
        hasLinqOnInjected: /\b_?\w+\s*\.\s*(?:Set<|Query<|AsQueryable\s*\()/.test(content)
    };
    const score = (signals.hasDi ? 1 : 0) +
        (signals.hasRepoOrContextCall ? 1 : 0) +
        (signals.hasAwait ? 1 : 0) +
        (signals.hasMultiFieldMapping ? 1 : 0) +
        (signals.hasPersistenceSignal ? 1 : 0) +
        (signals.hasLinqOnInjected ? 1 : 0);
    if (score >= 2) {
        const active = Object.entries(signals).filter(([_, v]) => v).map(([k]) => k);
        return { real: true, reason: `Score ${score}/6 (${active.join(", ")}).` };
    }
    return { real: false, reason: `Score ${score}/6: señales insuficientes para calificarlo como real.` };
}
/**
 * Cuenta mapeos entity→DTO tipo `Foo = entity.Foo` o `Foo = request.Foo`.
 * Si hay 3+, es muy probable que sea una implementación real de mapeo.
 */
function countEntityMappings(content) {
    const mapping = /\b[A-Z]\w*\s*=\s*(?:entity|e|item|source|request|model|dto|response)\s*\.\s*\w+/g;
    let count = 0;
    while (mapping.exec(content))
        count++;
    return count;
}
