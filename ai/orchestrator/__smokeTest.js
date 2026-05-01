"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const structuralValidator_1 = require("./contract/structuralValidator");
const contractRepair_1 = require("./contract/contractRepair");
const backendFallback_1 = require("./generation/backendFallback");
const frontendFallback_1 = require("./generation/frontendFallback");
const runVerdict_1 = require("./pipeline/runVerdict");
const handlerInspector_1 = require("./pipeline/handlerInspector");
const contractFromEntity_1 = require("./contract/contractFromEntity");
const frontendWireIn_1 = require("./generation/frontendWireIn");
const frontendNormalizer_1 = require("./generation/frontendNormalizer");
const sandbox_1 = require("./pipeline/sandbox");
const os_1 = __importDefault(require("os"));
function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exitCode = 1;
    }
    else {
        console.log(`   ✔️ ${message}`);
    }
}
function main() {
    // Fixture desacoplado del contrato productivo. El usuario puede borrar/regenerar
    // `ai/contracts/b2b/availability.contract.json` sin romper el smoke test.
    const contractPath = path_1.default.join(__dirname, "__fixtures__/availabilityFixture.contract.json");
    const contract = JSON.parse(fs_1.default.readFileSync(contractPath, "utf-8"));
    console.log(`\n🧪 Smoke test: orchestrator/v1.0 contra contrato '${contract.feature}'\n`);
    // 1) Backend determinista genera DTOs/Handler/Endpoint que cumplen el contrato
    console.log("── 1) Backend determinista ──");
    const backend = (0, backendFallback_1.buildDeterministicBackend)(contract.feature, contract, "Schedules");
    const backendReport = (0, structuralValidator_1.validateB2BStructural)(contract, backend, {
        includeBackend: true,
        includeFrontend: false
    });
    assert(backendReport.ok, `Backend determinista pasa validación B2B estructural (issues: ${(0, structuralValidator_1.summarizeIssues)(backendReport.issues) || "ninguna"}).`);
    assert(backend.some(f => f.path.includes("/Endpoints/")), "Backend incluye archivo de endpoint.");
    assert(backend.some(f => /GetAvailabilityRequest\.cs$/.test(f.path)), "Backend incluye DTO de request junto al Query/Handler.");
    assert(backend.some(f => /AvailabilityResponse\.cs$/.test(f.path)), "Backend incluye DTO de response junto al Query/Handler.");
    assert(backend.every(f => !/\/(Requests|Responses)\//.test(f.path)), "DTOs no viven en subcarpetas /Requests|Responses (namespaces cruzados).");
    // 2) Frontend determinista genera tipos/service/hook/componente coherentes
    console.log("\n── 2) Frontend determinista ──");
    const frontend = (0, frontendFallback_1.applyDeterministicFrontendFallback)(contract.feature, contract, []);
    const frontendReport = (0, structuralValidator_1.validateB2BStructural)(contract, frontend, {
        includeBackend: false,
        includeFrontend: true
    });
    assert(frontendReport.ok, `Frontend determinista pasa validación B2B estructural (issues: ${(0, structuralValidator_1.summarizeIssues)(frontendReport.issues) || "ninguna"}).`);
    assert(frontend.some(f => f.path.endsWith(".types.ts")), "Frontend incluye archivo de types.");
    assert(frontend.some(f => f.path.includes("/services/")), "Frontend incluye service.");
    assert(frontend.some(f => f.path.includes("/hooks/")), "Frontend incluye hook.");
    assert(frontend.some(f => f.path.includes("/components/")), "Frontend incluye componente.");
    // 3) Combinados → validación full-stack debe pasar
    console.log("\n── 3) Validación full-stack combinada ──");
    const combinedReport = (0, structuralValidator_1.validateB2BStructural)(contract, [...backend, ...frontend], {
        includeBackend: true,
        includeFrontend: true
    });
    assert(combinedReport.ok, "Backend+Frontend determinista pasa validación full-stack.");
    // 4) Repair dirigido inyecta campos faltantes en DTO real (no crea patch files)
    console.log("\n── 4) Repair dirigido (field missing) ──");
    const missingFieldBackend = backend.map(file => {
        if (file.path.includes("AvailabilityResponse.cs")) {
            return {
                ...file,
                content: file.content.replace(/\n\s*public\s+string\s+Status[^\n]*\n/g, "\n")
            };
        }
        return file;
    });
    const preRepair = (0, structuralValidator_1.validateB2BStructural)(contract, missingFieldBackend, {
        includeBackend: true,
        includeFrontend: false
    });
    assert(!preRepair.ok && preRepair.issues.some(i => i.code === "B2B_FIELD_MISSING" && i.field === "status"), "Detecta campo 'status' faltante correctamente.");
    const repairResult = (0, contractRepair_1.repairStructuralIssues)(missingFieldBackend, contract, preRepair.issues);
    assert(repairResult.changed, "Repair dirigido inyectó el campo.");
    const postRepair = (0, structuralValidator_1.validateB2BStructural)(contract, repairResult.files, {
        includeBackend: true,
        includeFrontend: false
    });
    assert(postRepair.ok, "Tras repair dirigido, la validación B2B pasa.");
    assert(!repairResult.files.some(f => f.path.toLowerCase().includes("b2bcontractpatch")), "No se generaron archivos parche sintéticos.");
    // 5) Type mismatch se detecta correctamente
    console.log("\n── 5) Detección de type mismatch ──");
    const mismatchBackend = backend.map(file => {
        if (file.path.includes("AvailabilityResponse.cs")) {
            return {
                ...file,
                content: file.content.replace(/public\s+long\s+Timestamp/g, "public string Timestamp")
            };
        }
        return file;
    });
    const mismatchReport = (0, structuralValidator_1.validateB2BStructural)(contract, mismatchBackend, {
        includeBackend: true,
        includeFrontend: false
    });
    assert(mismatchReport.issues.some(i => i.code === "B2B_TYPE_MISMATCH" && i.field === "timestamp"), "Detecta 'timestamp' con tipo incompatible (string vs long/number).");
    // 5b) Repair dirigido para B2B_TYPE_MISMATCH (v1.1.2): corrige el tipo sin rebuildear el backend.
    const mismatchRepair = (0, contractRepair_1.repairStructuralIssues)(mismatchBackend, contract, mismatchReport.issues);
    assert(mismatchRepair.changed, "Repair dirigido corrigió al menos un tipo C#.");
    const postMismatchRepair = (0, structuralValidator_1.validateB2BStructural)(contract, mismatchRepair.files, {
        includeBackend: true,
        includeFrontend: false
    });
    assert(!postMismatchRepair.issues.some(i => i.code === "B2B_TYPE_MISMATCH" && i.field === "timestamp"), "Tras repair dirigido, 'timestamp' ya no dispara B2B_TYPE_MISMATCH.");
    assert(mismatchRepair.files.some(f => /AvailabilityResponse\.cs$/.test(f.path) && !/public\s+string\s+Timestamp/.test(f.content)), "El DTO C# ya no declara 'string Timestamp' tras el repair.");
    // 6) Veredicto: backend fallback → STUB; handler LLM real → REAL
    console.log("\n── 6) Veredicto honesto del run ──");
    const stubRealism = (0, handlerInspector_1.detectHandlersRealism)(backend);
    assert(stubRealism.hasAny && stubRealism.allStubs && !stubRealism.anyReal, "Backend determinista es detectado como 100% stub (fingerprint TODO).");
    const fakeRealHandler = {
        path: "Core/Schedules/NitroGroups.Core.Schedules.Application/UseCases/Availability/Get/GetAvailabilityQueryHandler.cs",
        content: `using Cortex.Mediator.Queries;
using NitroGroups.Shared.Contracts;
using NitroGroups.Core.Schedules.Application.Abstractions;

namespace NitroGroups.Core.Schedules.Application.UseCases.Availability.Get;

public class GetAvailabilityQueryHandler : IQueryHandler<GetAvailabilityQuery, Result<AvailabilityResponse>>
{
    private readonly IGroupAvailabilityRepository _repo;
    public GetAvailabilityQueryHandler(IGroupAvailabilityRepository repo) { _repo = repo; }

    public async Task<Result<AvailabilityResponse>> Handle(GetAvailabilityQuery request, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdAsync(1L, cancellationToken);
        return Result<AvailabilityResponse>.Success(new AvailabilityResponse { Id = (int)entity.Id });
    }
}`
    };
    const realRealism = (0, handlerInspector_1.detectHandlersRealism)([fakeRealHandler]);
    assert(realRealism.anyReal && !realRealism.allStubs, "Handler con DI + await + repo es detectado como REAL.");
    // Ambas capas placeholder → STUB
    const stubSignals = (0, runVerdict_1.createRunSignals)();
    stubSignals.backendRequested = true;
    stubSignals.frontendRequested = true;
    stubSignals.backendDeterministicFallback = true;
    stubSignals.backendRealHandler = false;
    stubSignals.frontendDeterministicFallback = true;
    stubSignals.frontendLlmSucceeded = false;
    stubSignals.qualityGatesFinalOk = true;
    assert((0, runVerdict_1.computeVerdict)(stubSignals) === "stub", "ambas capas placeholder → verdict='stub'.");
    // Ambas capas reales → REAL
    const realSignals = (0, runVerdict_1.createRunSignals)();
    realSignals.backendRequested = true;
    realSignals.frontendRequested = true;
    realSignals.backendLlmSucceeded = true;
    realSignals.backendRealHandler = true;
    realSignals.frontendLlmSucceeded = true;
    realSignals.qualityGatesFinalOk = true;
    assert((0, runVerdict_1.computeVerdict)(realSignals) === "real", "LLM ok + handler real + frontend real → verdict='real'.");
    // v1.1: fallback determinista con contexto emite handler real → REAL
    const fallbackButRealSignals = (0, runVerdict_1.createRunSignals)();
    fallbackButRealSignals.backendRequested = true;
    fallbackButRealSignals.frontendRequested = true;
    fallbackButRealSignals.backendDeterministicFallback = true;
    fallbackButRealSignals.backendRealHandler = true;
    fallbackButRealSignals.frontendLlmSucceeded = true;
    fallbackButRealSignals.qualityGatesFinalOk = true;
    assert((0, runVerdict_1.computeVerdict)(fallbackButRealSignals) === "real", "fallback determinista + handler real + frontend LLM → 'real'.");
    // Backend real + frontend placeholder → PARTIAL
    const partialFrontSignals = (0, runVerdict_1.createRunSignals)();
    partialFrontSignals.backendRequested = true;
    partialFrontSignals.frontendRequested = true;
    partialFrontSignals.backendRealHandler = true;
    partialFrontSignals.frontendDeterministicFallback = true;
    partialFrontSignals.frontendLlmSucceeded = false;
    partialFrontSignals.qualityGatesFinalOk = true;
    assert((0, runVerdict_1.computeVerdict)(partialFrontSignals) === "partial", "backend real + frontend placeholder → 'partial'.");
    // Frontend real + backend stub → PARTIAL
    const partialBackSignals = (0, runVerdict_1.createRunSignals)();
    partialBackSignals.backendRequested = true;
    partialBackSignals.frontendRequested = true;
    partialBackSignals.backendDeterministicFallback = true;
    partialBackSignals.backendRealHandler = false;
    partialBackSignals.frontendLlmSucceeded = true;
    partialBackSignals.qualityGatesFinalOk = true;
    assert((0, runVerdict_1.computeVerdict)(partialBackSignals) === "partial", "frontend real + backend stub → 'partial'.");
    const partialSignals = (0, runVerdict_1.createRunSignals)();
    partialSignals.backendRequested = true;
    partialSignals.frontendRequested = true;
    partialSignals.backendDiscarded = true;
    partialSignals.frontendLlmSucceeded = true;
    partialSignals.qualityGatesFinalOk = true;
    assert((0, runVerdict_1.computeVerdict)(partialSignals) === "partial", "signals con backendDiscarded → verdict='partial'.");
    const failedSignals = (0, runVerdict_1.createRunSignals)();
    failedSignals.rolledBack = true;
    assert((0, runVerdict_1.computeVerdict)(failedSignals) === "failed", "signals con rollback → verdict='failed'.");
    // 7a) Fallback con repo disponible → handler REAL (no stub)
    console.log("\n── 7a) Rule-based handler bootstrap (repo disponible) ──");
    const projectRootForE = path_1.default.join(__dirname, "../../");
    const realBackend = (0, backendFallback_1.buildDeterministicBackend)(contract.feature, contract, "Schedules", { projectRoot: projectRootForE });
    const realism = (0, handlerInspector_1.detectHandlersRealism)(realBackend);
    assert(realism.anyReal, `Backend con contexto detecta repo y emite handler REAL (inspected: ${realism.inspected.map(i => `${path_1.default.basename(i.path)}=${i.real}`).join(", ")}).`);
    const handlerFile = realBackend.find(f => /Handler\.cs$/.test(f.path));
    if (handlerFile) {
        const c = handlerFile.content;
        assert(/IUnitOfWorkSchedules|IGroupAvailabilityRepository/.test(c), "Handler inyecta UoW o repo del módulo.");
        assert(/GetAllAsync\(\)|GetByIdAsync\(/.test(c), "Handler llama un método del repo genérico.");
        assert(/using\s+NitroGroups\.Core\.Schedules\.Domain\.Entities/.test(c), "Handler importa namespace de entidades del módulo.");
        assert(!/TODO:\s*Implementaci.n m.nima determinista/.test(c), "Handler NO es stub determinista.");
    }
    // 7b) Fallback sin contexto → stub (comportamiento antiguo preservado)
    console.log("\n── 7b) Sin contexto → stub (compatibilidad) ──");
    const stubBackend = (0, backendFallback_1.buildDeterministicBackend)(contract.feature, contract, "Schedules");
    const stubRealismAgain = (0, handlerInspector_1.detectHandlersRealism)(stubBackend);
    assert(stubRealismAgain.allStubs, "Sin ctx, el fallback sigue emitiendo stub (compat).");
    // 8) Contract-from-Entity
    console.log("\n── 7) Contract-from-Entity sobre GroupAvailability ──");
    const projectRoot = path_1.default.join(__dirname, "../../");
    const generated = (0, contractFromEntity_1.generateContractFromEntity)("GroupAvailability", {
        operation: "list",
        excludeAudit: true,
        projectRoot,
        module: "Schedules"
    });
    const response = generated.contract.methods[0].response;
    assert(generated.contract.feature === "groupAvailability", "Feature name se deriva en camelCase desde la entidad.");
    assert(generated.contract.endpoint.startsWith("/api/groupavailabilit"), "Endpoint incluye el plural del feature (variante lower-case).");
    assert(typeof generated.contract.entityHash === "string" && generated.contract.entityHash.length >= 12, "entityHash calculado (>=12 chars).");
    assert(generated.contract.entityHash !== "INITIAL_SIGNATURE", "entityHash refleja estado real del módulo (no marker inicial).");
    assert(response.fields["groupId"]?.format === "long", "GroupId mapeado como number/long.");
    assert(response.fields["startAt"]?.format === "iso-date", "StartAt mapeado como string/iso-date (era DateTimeOffset).");
    assert(response.fields["customPrice"]?.format === "decimal", "CustomPrice mapeado como number/decimal.");
    assert(response.fields["available"]?.type === "boolean", "Available mapeado como boolean.");
    assert(response.fields["id"]?.format === "long", "Id heredado de DomainModel detectado como long.");
    assert(!response.fields["createdBy"], "Campos de auditoría excluidos por defecto (createdBy).");
    assert(!response.fields["updatedAt"], "Campos de auditoría excluidos por defecto (updatedAt).");
    // Validar que el contrato generado pasa la validación B2B contra el backend determinista
    const generatedBackend = (0, backendFallback_1.buildDeterministicBackend)(generated.contract.feature, generated.contract, "Schedules");
    const validatedGen = (0, structuralValidator_1.validateB2BStructural)(generated.contract, generatedBackend, {
        includeBackend: true,
        includeFrontend: false
    });
    assert(validatedGen.ok, `Backend determinista generado desde contrato derivado pasa validación B2B (issues: ${(0, structuralValidator_1.summarizeIssues)(validatedGen.issues) || "ninguna"}).`);
    // 8b) Normalizer determinista de frontend
    console.log("\n── 8b) Normalizer frontend (imports + Badge + Panel export) ──");
    const messyPanel = [{
            path: "UI/nitro-groups/src/features/demo/components/DemoPanel.tsx",
            content: `"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";
import Button from "@/components/ui/Button";

export const DemoPanel = () => {
  return (
    <Card>
      <Loader />
      <Badge variant="success">ok</Badge>
      <Badge variant="info">info</Badge>
      <Badge variant={cond ? "success" : "destructive"}>mix</Badge>
    </Card>
  );
};
`
        }];
    const normalized = (0, frontendNormalizer_1.normalizeFrontendOutput)(messyPanel);
    assert(normalized.changes.length > 0, "Normalizer detecta y corrige patrones inválidos.");
    const out = normalized.files[0].content;
    assert(/import Card from "@\/components\/ui\/Card"/.test(out), "Card: convertido de named a default import.");
    assert(/import Loader from "@\/components\/ui\/Loader"/.test(out), "Loader: convertido de named a default import.");
    assert(!/import\s+\{[^}]*CardContent[^}]*\}\s+from\s+["']@\/components\/ui\/Card["']/.test(out), "CardContent inexistente: removido.");
    assert(/import\s+\{\s*Button\s*\}\s+from\s+"@\/components\/ui\/Button"/.test(out), "Button: convertido de default a named import.");
    assert(/<Badge[^>]*variant="secondary"/.test(out), "Badge variant=success → secondary.");
    assert(/<Badge[^>]*variant="outline"/.test(out), "Badge variant=info → outline.");
    assert(/\? "secondary" : "destructive"/.test(out), "Badge variant en ternario: success → secondary (evita TS2322 en CVA).");
    assert(/import Badge from "@\/components\/ui\/Badge"/.test(out), "Badge: import inyectado porque el JSX usa <Badge>.");
    assert(/export default DemoPanel;?\s*$/m.test(out.trimEnd() + "\n"), "Panel: default export inyectado al final.");
    const messyService = [{
            path: "UI/nitro-groups/src/features/demo/services/demo.service.ts",
            content: `import apiClient from "@/lib/api-client";
import getApiAccessToken from "@/services/auth.service";

export const demoService = { ping: async () => ({ data: 1 } as any) };
`
        }];
    const normSvc = (0, frontendNormalizer_1.normalizeFrontendOutput)(messyService);
    const svcOut = normSvc.files[0].content;
    assert(/import\s+\{\s*apiClient\s*\}\s+from\s+"@\/lib\/api-client"/.test(svcOut), "api-client: default import → { apiClient }.");
    assert(/import\s+\{\s*getApiAccessToken\s*\}\s+from\s+"@\/services\/auth.service"/.test(svcOut), "auth.service: default import → { getApiAccessToken }.");
    const messyHook = [{
            path: "UI/nitro-groups/src/features/demo/hooks/useDemoQuery.ts",
            content: `import { useQuery } from "@tanstack/react-query";
type D = { id: number };
export const useDemoQuery = () =>
  useQuery<D, Error>(["demoQuery"], () => Promise.resolve({ id: 1 } as D), { staleTime: 5000 });
`
        }];
    const normHook = (0, frontendNormalizer_1.normalizeFrontendOutput)(messyHook);
    const hookOut = normHook.files[0].content;
    assert(/useQuery<D,\s*Error>\(\s*\{/.test(hookOut) && /queryKey:\s*\[/.test(hookOut) && /queryFn:/.test(hookOut) && /staleTime:\s*5000/.test(hookOut), "useQuery: 3 args (v4) → v5 único objeto con queryKey/queryFn.");
    const messyHookPascal = [{
            path: "UI/nitro-groups/src/features/demo/hooks/UseDemoQuery.ts",
            content: `import { useQuery } from "@tanstack/react-query";
export const useDemoQuery2 = () =>
  useQuery(["k"], () => Promise.resolve(1), { enabled: true });
`
        }];
    const normPascal = (0, frontendNormalizer_1.normalizeFrontendOutput)(messyHookPascal);
    const pascalOut = normPascal.files[0].content;
    assert(/useQuery\(\s*\{/.test(pascalOut) && /queryKey:\s*/.test(pascalOut) && /queryFn:/.test(pascalOut) && /enabled:\s*true/.test(pascalOut), "useQuery: el hook con ruta `UseX.ts` (Pascal) también se normaliza (regex case-insensitive).");
    // 9) Frontend wire-in genera page.tsx que consume el Panel
    console.log("\n── 9) Wire-in automático ──");
    const projectRootForC = path_1.default.join(__dirname, "../../");
    const wireIn = (0, frontendWireIn_1.planFrontendWireIn)({ feature: contract.feature, projectRoot: projectRootForC, skipIfExists: false }, frontend);
    assert(wireIn.files.length === 1, "Wire-in produce exactamente 1 archivo (page.tsx).");
    assert(wireIn.files[0].path.endsWith(`/app/${contract.feature.toLowerCase()}/page.tsx`), `Wire-in respeta la convención /app/<feature>/page.tsx (path=${wireIn.files[0].path}).`);
    assert(wireIn.files[0].content.includes(`import AvailabilityPanel from "@/features/availability/components/AvailabilityPanel"`), "page.tsx importa el panel desde @/features/<feature>/components/<Feature>Panel.");
    assert(wireIn.files[0].content.includes("<AvailabilityPanel />"), "page.tsx monta el panel en el JSX.");
    assert(wireIn.routePath === `/${contract.feature.toLowerCase()}`, "Wire-in expone la ruta lógica de la feature.");
    // Sin panel generado → skip
    const wireInSkip = (0, frontendWireIn_1.planFrontendWireIn)({ feature: contract.feature, projectRoot: projectRootForC, skipIfExists: true }, []);
    assert(wireInSkip.files.length === 0 && !!wireInSkip.skipped, "Sin panel generado, wire-in se omite explícitamente.");
    // 10) Sandbox + GC
    console.log("\n── 10) Sandbox snapshot + GC ──");
    const tmpRoot = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), "orch-sandbox-"));
    const dummyFiles = [
        { path: "Core/X/File.cs", content: "// hola" },
        { path: "UI/X/index.ts", content: "export const x = 1;" }
    ];
    const snap = (0, sandbox_1.snapshotToSandbox)("sample", "full-stack", dummyFiles, tmpRoot);
    assert(fs_1.default.existsSync(path_1.default.join(snap.dir, "manifest.json")), "snapshot crea manifest.json.");
    assert(fs_1.default.existsSync(path_1.default.join(snap.dir, "Core/X/File.cs")), "snapshot preserva estructura del primer archivo.");
    assert(fs_1.default.existsSync(path_1.default.join(snap.dir, "UI/X/index.ts")), "snapshot preserva estructura del segundo archivo.");
    (0, sandbox_1.stampSandboxVerdict)(snap.dir, "real");
    const manifestContent = JSON.parse(fs_1.default.readFileSync(path_1.default.join(snap.dir, "manifest.json"), "utf-8"));
    assert(manifestContent.verdict === "real", "stampSandboxVerdict actualiza el manifest con el verdict.");
    // GC: forzar antiguedad
    const oldMtime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    fs_1.default.utimesSync(snap.dir, oldMtime, oldMtime);
    const gcRes = (0, sandbox_1.gcOldSandboxes)(tmpRoot, 7);
    assert(gcRes.removed.length === 1, "GC elimina sandboxes más viejos que el umbral.");
    assert(!fs_1.default.existsSync(snap.dir), "Directorio del sandbox removido físicamente.");
    fs_1.default.rmSync(tmpRoot, { recursive: true, force: true });
    console.log(`\n${process.exitCode === 1 ? "❌ Smoke test con fallas." : "✅ Smoke test completo — orquestador v1.0 coherente."}`);
}
main();
