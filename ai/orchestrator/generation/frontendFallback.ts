import {
    B2BContract,
    ContractField,
    ContractMethod,
    FileOutput,
    toPascalCase
} from "../types";

type FieldMeta = ContractField & {
    in?: string;
    required?: boolean;
    items?: { $ref?: string; type?: string; format?: string };
    $ref?: string;
};

type B2BContractEx = B2BContract & {
    definitions?: Record<string, { type?: string; fields?: Record<string, FieldMeta> }>;
};

function mapTypeToTs(meta: ContractField): string {
    const t = String(meta?.type || "string").toLowerCase();
    if (t === "number" || t === "integer") return "number";
    if (t === "boolean" || t === "bool") return "boolean";
    return "string";
}

function resolveDefNameFromRef(ref: string): string {
    const m = String(ref).match(/#\/definitions\/(.+)$/);
    return m ? m[1] : "unknown";
}

function mapFieldToTsType(meta: FieldMeta, _definitions: Record<string, unknown>): string {
    const t = String(meta?.type || "string").toLowerCase();
    if (t === "array" && meta.items?.$ref) {
        return `${resolveDefNameFromRef(meta.items.$ref)}[]`;
    }
    if (t === "array" && meta.items) {
        const inner: FieldMeta = { ...meta.items, type: meta.items.type || "string" };
        return `${mapFieldToTsType(inner, _definitions)}[]`;
    }
    if (meta?.$ref) {
        return resolveDefNameFromRef(meta.$ref);
    }
    return mapTypeToTs(meta);
}

function isOptionalField(meta: FieldMeta): boolean {
    return meta?.required === false;
}

function buildInterfaceBlock(name: string, fields: Record<string, FieldMeta>): string {
    const lines: string[] = [];
    lines.push(`export interface ${name} {`);
    for (const [field, meta] of Object.entries(fields || {})) {
        const ts = mapFieldToTsType(meta, {});
        const opt = isOptionalField(meta) ? "?" : "";
        lines.push(`  ${field}${opt}: ${ts};`);
    }
    lines.push("}");
    return lines.join("\n");
}

function getFirstMethod(contract: B2BContract): ContractMethod | null {
    if (!Array.isArray(contract?.methods) || contract.methods.length === 0) return null;
    const getMethod = contract.methods.find(method => String(method.http || "").toUpperCase() === "GET");
    return getMethod || contract.methods[0];
}

function mergeGeneratedFiles(baseFiles: FileOutput[], patchedFiles: FileOutput[]): FileOutput[] {
    const map = new Map<string, FileOutput>();
    for (const file of baseFiles) map.set(file.path.replace(/\\/g, "/").toLowerCase(), file);
    for (const file of patchedFiles) map.set(file.path.replace(/\\/g, "/").toLowerCase(), file);
    return Array.from(map.values());
}

/**
 * Genera interfaces TS para `definitions` + todos los request/response de `methods`.
 */
function buildAllTypescriptInterfaces(
    contract: B2BContractEx,
    featureIdForConst: string
): string {
    const blocks: string[] = [];
    const ep = String(contract.endpoint || "");
    if (ep) {
        const constName = b2bEndpointConstName(featureIdForConst);
        blocks.push(
            "/** B2B contract endpoint (must appear verbatim for validation). */",
            `export const ${constName} = ${JSON.stringify(ep)};`,
            ""
        );
    }

    const defs = contract.definitions || {};
    for (const [defName, def] of Object.entries(defs)) {
        const fields = (def as { fields?: Record<string, FieldMeta> })?.fields || {};
        blocks.push(buildInterfaceBlock(defName, fields as Record<string, FieldMeta>));
        blocks.push("");
    }

    for (const method of contract.methods || []) {
        for (const dto of [method.request, method.response].filter(Boolean) as { name: string; fields: Record<string, FieldMeta> }[]) {
            if (!dto.name) continue;
            blocks.push(buildInterfaceBlock(dto.name, (dto.fields || {}) as Record<string, FieldMeta>));
            blocks.push("");
        }
    }

    return blocks.join("\n").trim() + "\n";
}

function defaultValueForTs(tsType: string): string {
    if (tsType === "number") return "0";
    if (tsType === "boolean") return "false";
    return '""';
}

/**
 * Nombre de constante B2B exportada en el archivo de tipos.
 */
function b2bEndpointConstName(feature: string): string {
    return `B2B_${feature.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}_ENDPOINT`;
}

/**
 * Construye archivos frontend mínimos que siempre compilan y respetan el contrato.
 * Multi-método: emite **todas** las interfaces de request/response y `definitions`,
 * y un servicio con un método por operación. El panel/hook usan el primer GET si existe.
 */
export function applyDeterministicFrontendFallback(
    feature: string,
    contract: B2BContract,
    files: FileOutput[]
): FileOutput[] {
    const c = contract as B2BContractEx;
    if (!c.methods?.length) return files;

    const listMethod = getFirstMethod(c);
    if (!listMethod) return files;

    const featurePascal = toPascalCase(feature);
    const hookName = `use${featurePascal}`;
    const serviceName = `${feature}Service`;
    const featureIdForConst = String(c.feature || feature);
    const constName = b2bEndpointConstName(featureIdForConst);

    const typePath = `UI/nitro-groups/src/features/${feature}/types/${feature}.types.ts`;
    const typeLines = buildAllTypescriptInterfaces(c, featureIdForConst);
    const epLiteral = String(c.endpoint || "");
    const epShort = epLiteral.replace(/^\/api/, "") || `/${feature}`;

    // --- servicio: un método async por cada `methods[]`
    const serviceImports: string[] = [
        "import { apiClient } from \"@/lib/api-client\";",
        "import { getApiAccessToken } from \"@/services/auth.service\";",
    ];
    const typeImports = new Set<string>();

    for (const m of c.methods) {
        if (m.request?.name) typeImports.add(m.request.name);
        if (m.response?.name) typeImports.add(m.response.name);
    }
    if (c.definitions) {
        for (const defName of Object.keys(c.definitions)) typeImports.add(defName);
    }
    const importList = Array.from(typeImports).sort();
    if (importList.length) {
        serviceImports.push(`import type { ${importList.join(", ")} } from "../types/${feature}.types";`);
    }
    serviceImports.push(
        `import { ${constName} } from "../types/${feature}.types";`,
        ""
    );

    const serviceMethods: string[] = [];

    for (const method of c.methods) {
        const mName = method.name || "call";
        const http = String(method.http || "GET").toUpperCase();
        const req = method.request;
        const res = method.response;
        const resName = res?.name || `${featurePascal}Response`;
        if (!res) continue;

        if (http === "GET" && req) {
            const reqName = req.name;
            const rFields = (req.fields || {}) as Record<string, FieldMeta>;
            const pathKeys = Object.entries(rFields)
                .filter(([, m]) => m.in === "path")
                .map(([k]) => k);
            const queryKeys = Object.entries(rFields)
                .filter(([, m]) => m.in !== "path" && m.in !== "header" && m.in !== "body")
                .map(([k]) => k);
            const hasPathTemplate = epLiteral.includes("{groupId}");
            const canResolveGroup = pathKeys.includes("groupId");
            const pathInit =
                hasPathTemplate && canResolveGroup
                    ? `    const path = ${constName}.replace("{groupId}", String(params.groupId));`
                    : `    const path = ${constName};`;
            const paramsObj =
                queryKeys.length > 0
                    ? `      params: { ${queryKeys.map(k => `${k}: params.${k}`).join(", ")} },`
                    : `      params: undefined,`;
            serviceMethods.push(
                `  ${mName}: async (params: ${reqName}): Promise<${resName}> => {`,
                `    const accessToken = await getApiAccessToken();`,
                pathInit,
                `    const { data } = await apiClient.get<${resName}>(path, {`,
                `      headers: { Authorization: \`Bearer \${accessToken}\` },`,
                paramsObj,
                `    });`,
                `    return data;`,
                `  },`
            );
        } else if (http === "POST" && req) {
            const reqName = req.name;
            serviceMethods.push(
                `  ${mName}: async (body: ${reqName}): Promise<${resName}> => {`,
                `    const accessToken = await getApiAccessToken();`,
                `    const path = ${constName}.replace("{groupId}", String(body.groupId));`,
                `    const { groupId, idempotencyKey, ...rest } = body;`,
                `    const { data } = await apiClient.post<${resName}>(path, rest, {`,
                `      headers: {`,
                `        Authorization: \`Bearer \${accessToken}\`,`,
                `        "Idempotency-Key": idempotencyKey,`,
                `      },`,
                `    });`,
                `    return data;`,
                `  },`
            );
        } else if (http === "DELETE" && req) {
            const reqName = req.name;
            serviceMethods.push(
                `  ${mName}: async (params: ${reqName}): Promise<${resName}> => {`,
                `    const accessToken = await getApiAccessToken();`,
                `    const path = \`\${${constName}.replace("{groupId}", String(params.groupId))}/\${params.id}\`;`,
                `    const { data } = await apiClient.delete<${resName}>(path, {`,
                `      headers: { Authorization: \`Bearer \${accessToken}\` },`,
                `    });`,
                `    return data;`,
                `  },`
            );
        } else if ((http === "PATCH" || http === "PUT") && req) {
            const reqName = req.name;
            serviceMethods.push(
                `  ${mName}: async (body: ${reqName}): Promise<${resName}> => {`,
                `    const accessToken = await getApiAccessToken();`,
                `    const path = \`\${${constName}.replace("{groupId}", String(body.groupId))}/\${body.id}\`;`,
                `    const { groupId, id, ...patch } = body;`,
                `    const { data } = await apiClient.${http === "PUT" ? "put" : "patch"}<${resName}>(path, patch, {`,
                `      headers: { Authorization: \`Bearer \${accessToken}\` },`,
                `    });`,
                `    return data;`,
                `  },`
            );
        } else {
            // Fallback mínimo
            const reqName = req?.name;
            if (reqName) {
                serviceMethods.push(
                    `  ${mName}: async (params: ${reqName}): Promise<${resName}> => {`,
                    `    const accessToken = await getApiAccessToken();`,
                    `    const { data } = await apiClient.get<${resName}>("${epShort}", {`,
                    `      headers: { Authorization: \`Bearer \${accessToken}\` },`,
                    `      params: params as unknown as Record<string, string>,`,
                    `    });`,
                    `    return data;`,
                    `  },`
                );
            } else {
                serviceMethods.push(
                    `  ${mName}: async (): Promise<${resName}> => {`,
                    `    const accessToken = await getApiAccessToken();`,
                    `    const { data } = await apiClient.get<${resName}>("${epShort}", {`,
                    `      headers: { Authorization: \`Bearer \${accessToken}\` },`,
                    `    });`,
                    `    return data;`,
                    `  },`
                );
            }
        }
    }

    const serviceContent = [
        ...serviceImports,
        `export const ${serviceName} = {`,
        ...serviceMethods,
        "};",
        ""
    ].join("\n");

    // --- hook: listado (primer GET) para el panel
    const listRequestName = listMethod.request?.name || `${featurePascal}Request`;
    const listResponseName = listMethod.response?.name || `${featurePascal}Response`;
    const listCall = listMethod.name || `get${featurePascal}`;
    const requestFields = (listMethod.request?.fields || {}) as Record<string, FieldMeta>;
    const hasParams = Object.keys(requestFields).length > 0;
    const paramsArg = hasParams ? `params: ${listRequestName}` : "";
    const queryFn = hasParams
        ? `() => ${serviceName}.${listCall}(params)`
        : `() => ${serviceName}.${listCall}()`;
    const queryKey = hasParams ? `["${feature}", params]` : `["${feature}"]`;
    const hookImports = hasParams
        ? `import { ${serviceName} } from "../services/${feature}.service";\nimport type { ${listRequestName} } from "../types/${feature}.types";`
        : `import { ${serviceName} } from "../services/${feature}.service";`;

    const hookContent = `import { useQuery } from "@tanstack/react-query";
${hookImports}

export const ${hookName} = (${paramsArg}) => {
  const query = useQuery<${listResponseName}, Error>({
    queryKey: ${queryKey},
    queryFn: ${queryFn},
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};
`;

    const paramsInitializers = Object.entries(requestFields)
        .map(([field, meta]) => {
            const optional = isOptionalField(meta);
            if (optional) {
                return `    ${field}: undefined`;
            }
            return `    ${field}: ${defaultValueForTs(mapFieldToTsType(meta, {}))}`;
        })
        .join(",\n");
    const paramsDeclaration = hasParams
        ? `  const params: ${listRequestName} = {\n${paramsInitializers}\n  };\n  const { data, error, isLoading, refetch } = ${hookName}(params);`
        : `  const { data, error, isLoading, refetch } = ${hookName}();`;

    const componentContent = `"use client";

import { ${hookName} } from "../hooks/${hookName}";${hasParams ? `\nimport type { ${listRequestName} } from "../types/${feature}.types";` : ""}

export default function ${featurePascal}Panel() {
${paramsDeclaration}

  if (isLoading) return <div className="text-gray-400">Cargando...</div>;
  if (error) return <div className="text-red-400">Error al cargar: {error.message}</div>;
  if (!data) return <div className="text-gray-500">Sin datos disponibles.</div>;

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">${featurePascal}</h2>
        <button
          className="rounded-lg bg-violet-500 px-4 py-2 text-white hover:bg-violet-600"
          onClick={() => { void refetch(); }}
        >
          Recargar
        </button>
      </div>
      <pre className="overflow-auto rounded-md bg-gray-950 p-4 text-sm text-gray-200">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}
`;

    const servicePath = `UI/nitro-groups/src/features/${feature}/services/${feature}.service.ts`;
    const hookPath = `UI/nitro-groups/src/features/${feature}/hooks/${hookName}.ts`;
    const componentPath = `UI/nitro-groups/src/features/${feature}/components/${featurePascal}Panel.tsx`;

    return mergeGeneratedFiles(files, [
        { path: typePath, content: typeLines },
        { path: servicePath, content: serviceContent },
        { path: hookPath, content: hookContent },
        { path: componentPath, content: componentContent }
    ]);
}
