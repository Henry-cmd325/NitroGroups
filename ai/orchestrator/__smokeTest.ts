import fs from "fs";
import path from "path";
import { validateB2BStructural, summarizeIssues } from "./contract/structuralValidator";
import { repairStructuralIssues } from "./contract/contractRepair";
import { buildDeterministicBackend } from "./generation/backendFallback";
import { applyDeterministicFrontendFallback } from "./generation/frontendFallback";
import { FileOutput } from "./types";

function assert(condition: unknown, message: string): void {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exitCode = 1;
    } else {
        console.log(`   ✔️ ${message}`);
    }
}

function main() {
    const contractPath = path.join(__dirname, "../contracts/b2b/availability.contract.json");
    const contract = JSON.parse(fs.readFileSync(contractPath, "utf-8"));

    console.log(`\n🧪 Smoke test: orchestrator/v1.0 contra contrato '${contract.feature}'\n`);

    // 1) Backend determinista genera DTOs/Handler/Endpoint que cumplen el contrato
    console.log("── 1) Backend determinista ──");
    const backend = buildDeterministicBackend(contract.feature, contract, "Schedules");
    const backendReport = validateB2BStructural(contract, backend, {
        includeBackend: true,
        includeFrontend: false
    });
    assert(backendReport.ok, `Backend determinista pasa validación B2B estructural (issues: ${summarizeIssues(backendReport.issues) || "ninguna"}).`);
    assert(backend.some(f => f.path.includes("/Endpoints/")), "Backend incluye archivo de endpoint.");
    assert(
        backend.some(f => /GetAvailabilityRequest\.cs$/.test(f.path)),
        "Backend incluye DTO de request junto al Query/Handler."
    );
    assert(
        backend.some(f => /AvailabilityResponse\.cs$/.test(f.path)),
        "Backend incluye DTO de response junto al Query/Handler."
    );
    assert(
        backend.every(f => !/\/(Requests|Responses)\//.test(f.path)),
        "DTOs no viven en subcarpetas /Requests|Responses (namespaces cruzados)."
    );

    // 2) Frontend determinista genera tipos/service/hook/componente coherentes
    console.log("\n── 2) Frontend determinista ──");
    const frontend = applyDeterministicFrontendFallback(contract.feature, contract, []);
    const frontendReport = validateB2BStructural(contract, frontend, {
        includeBackend: false,
        includeFrontend: true
    });
    assert(frontendReport.ok, `Frontend determinista pasa validación B2B estructural (issues: ${summarizeIssues(frontendReport.issues) || "ninguna"}).`);
    assert(frontend.some(f => f.path.endsWith(".types.ts")), "Frontend incluye archivo de types.");
    assert(frontend.some(f => f.path.includes("/services/")), "Frontend incluye service.");
    assert(frontend.some(f => f.path.includes("/hooks/")), "Frontend incluye hook.");
    assert(frontend.some(f => f.path.includes("/components/")), "Frontend incluye componente.");

    // 3) Combinados → validación full-stack debe pasar
    console.log("\n── 3) Validación full-stack combinada ──");
    const combinedReport = validateB2BStructural(contract, [...backend, ...frontend], {
        includeBackend: true,
        includeFrontend: true
    });
    assert(combinedReport.ok, "Backend+Frontend determinista pasa validación full-stack.");

    // 4) Repair dirigido inyecta campos faltantes en DTO real (no crea patch files)
    console.log("\n── 4) Repair dirigido (field missing) ──");
    const missingFieldBackend: FileOutput[] = backend.map(file => {
        if (file.path.includes("AvailabilityResponse.cs")) {
            return {
                ...file,
                content: file.content.replace(/\n\s*public\s+string\s+Status[^\n]*\n/g, "\n")
            };
        }
        return file;
    });
    const preRepair = validateB2BStructural(contract, missingFieldBackend, {
        includeBackend: true,
        includeFrontend: false
    });
    assert(!preRepair.ok && preRepair.issues.some(i => i.code === "B2B_FIELD_MISSING" && i.field === "status"), "Detecta campo 'status' faltante correctamente.");

    const repairResult = repairStructuralIssues(missingFieldBackend, contract, preRepair.issues);
    assert(repairResult.changed, "Repair dirigido inyectó el campo.");
    const postRepair = validateB2BStructural(contract, repairResult.files, {
        includeBackend: true,
        includeFrontend: false
    });
    assert(postRepair.ok, "Tras repair dirigido, la validación B2B pasa.");
    assert(
        !repairResult.files.some(f => f.path.toLowerCase().includes("b2bcontractpatch")),
        "No se generaron archivos parche sintéticos."
    );

    // 5) Type mismatch se detecta correctamente
    console.log("\n── 5) Detección de type mismatch ──");
    const mismatchBackend: FileOutput[] = backend.map(file => {
        if (file.path.includes("AvailabilityResponse.cs")) {
            return {
                ...file,
                content: file.content.replace(/public\s+long\s+Timestamp/g, "public string Timestamp")
            };
        }
        return file;
    });
    const mismatchReport = validateB2BStructural(contract, mismatchBackend, {
        includeBackend: true,
        includeFrontend: false
    });
    assert(
        mismatchReport.issues.some(i => i.code === "B2B_TYPE_MISMATCH" && i.field === "timestamp"),
        "Detecta 'timestamp' con tipo incompatible (string vs long/number)."
    );

    console.log(`\n${process.exitCode === 1 ? "❌ Smoke test con fallas." : "✅ Smoke test completo — orquestador v1.0 coherente."}`);
}

main();
