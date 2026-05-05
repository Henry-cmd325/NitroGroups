export interface FileOutput {
    path: string;
    content: string;
}

export interface ContractField {
    type: string;
    format?: string;
}

export interface ContractDto {
    name: string;
    fields: Record<string, ContractField>;
}

export interface ContractMethod {
    name: string;
    http: string;
    request?: ContractDto;
    response?: ContractDto;
}

export interface B2BContract {
    v: string;
    feature: string;
    endpoint: string;
    scope?: { allowedEndpoints?: string[]; allowInternalLogic?: boolean };
    businessRules?: Record<string, unknown>;
    entityHash?: string;
    methods: ContractMethod[];
    auth?: boolean;
}

export type OrchestratorMode = "full-stack" | "frontend-only" | "contract-only";

export interface StructuralIssue {
    code: string;
    message: string;
    field?: string;
    dto?: string;
    lang?: "C#" | "TS";
    severity: "error" | "warning";
}

export interface StructuralReport {
    ok: boolean;
    issues: StructuralIssue[];
}

export function normalizeToPosix(filePath: string): string {
    return filePath.replace(/\\/g, "/");
}

export function toPascalCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
