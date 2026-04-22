import {
    B2BContract,
    ContractField,
    ContractMethod,
    FileOutput,
    toPascalCase
} from "../types";

function mapTypeToTs(meta: ContractField): string {
    const type = String(meta?.type || "string").toLowerCase();
    if (type === "number" || type === "integer") return "number";
    if (type === "boolean" || type === "bool") return "boolean";
    return "string";
}

function defaultValueForTs(tsType: string): string {
    if (tsType === "number") return "0";
    if (tsType === "boolean") return "false";
    return "\"\"";
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
 * Construye archivos frontend mínimos que siempre compilan y respetan el contrato.
 */
export function applyDeterministicFrontendFallback(
    feature: string,
    contract: B2BContract,
    files: FileOutput[]
): FileOutput[] {
    const method = getFirstMethod(contract);
    if (!method) return files;

    const featurePascal = toPascalCase(feature);
    const hookName = `use${featurePascal}`;
    const serviceName = `${feature}Service`;
    const requestName = method.request?.name || `${featurePascal}Request`;
    const responseName = method.response?.name || `${featurePascal}Response`;
    const requestFields = method.request?.fields || {};
    const responseFields = method.response?.fields || {};
    const endpoint = String(contract.endpoint || "").replace(/^\/api/, "") || `/${feature}`;
    const httpMethod = String(method.http || "GET").toUpperCase();
    const methodName = method.name || `get${featurePascal}`;

    const typeLines: string[] = [];
    typeLines.push(`export interface ${requestName} {`);
    for (const [field, meta] of Object.entries(requestFields) as [string, ContractField][]) {
        typeLines.push(`  ${field}: ${mapTypeToTs(meta)};`);
    }
    typeLines.push("}");
    typeLines.push("");
    typeLines.push(`export interface ${responseName} {`);
    for (const [field, meta] of Object.entries(responseFields) as [string, ContractField][]) {
        typeLines.push(`  ${field}: ${mapTypeToTs(meta)};`);
    }
    typeLines.push("}");

    const hasParams = Object.keys(requestFields).length > 0;
    const paramsArgument = hasParams ? `params: ${requestName}` : "";
    const apiCall = httpMethod === "GET"
        ? `const { data } = await apiClient.get<${responseName}>("${endpoint}", {\n      headers: { Authorization: \`Bearer \${accessToken}\` },\n      params${hasParams ? "" : ": undefined"},\n    });`
        : `const { data } = await apiClient.${httpMethod.toLowerCase()}<${responseName}>("${endpoint}", ${hasParams ? "params" : "undefined"}, {\n      headers: { Authorization: \`Bearer \${accessToken}\` },\n    });`;

    const serviceContent = `import { apiClient } from "@/lib/api-client";
import { getApiAccessToken } from "@/services/auth.service";
import type { ${requestName}, ${responseName} } from "../types/${feature}.types";

export const ${serviceName} = {
  ${methodName}: async (${paramsArgument}): Promise<${responseName}> => {
    const accessToken = await getApiAccessToken();
    ${apiCall}
    return data;
  },
};
`;

    const paramsArg = hasParams ? `params: ${requestName}` : "";
    const queryFn = hasParams
        ? `() => ${serviceName}.${methodName}(params)`
        : `() => ${serviceName}.${methodName}()`;
    const queryKey = hasParams ? `["${feature}", params]` : `["${feature}"]`;
    const hookContent = `import { useQuery } from "@tanstack/react-query";
import { ${serviceName} } from "../services/${feature}.service";
import type { ${requestName}, ${responseName} } from "../types/${feature}.types";

export const ${hookName} = (${paramsArg}) => {
  const query = useQuery<${responseName}, Error>({
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
        .map(([field, meta]) => `    ${field}: ${defaultValueForTs(mapTypeToTs(meta as ContractField))}`)
        .join(",\n");
    const paramsDeclaration = hasParams
        ? `  const params: ${requestName} = {\n${paramsInitializers}\n  };\n  const { data, error, isLoading, refetch } = ${hookName}(params);`
        : `  const { data, error, isLoading, refetch } = ${hookName}();`;

    const componentContent = `"use client";

import { ${hookName} } from "../hooks/${hookName}";${hasParams ? `\nimport type { ${requestName} } from "../types/${feature}.types";` : ""}

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

    const typePath = `UI/nitro-groups/src/features/${feature}/types/${feature}.types.ts`;
    const servicePath = `UI/nitro-groups/src/features/${feature}/services/${feature}.service.ts`;
    const hookPath = `UI/nitro-groups/src/features/${feature}/hooks/${hookName}.ts`;
    const componentPath = `UI/nitro-groups/src/features/${feature}/components/${featurePascal}Panel.tsx`;

    return mergeGeneratedFiles(files, [
        { path: typePath, content: typeLines.join("\n") + "\n" },
        { path: servicePath, content: serviceContent },
        { path: hookPath, content: hookContent },
        { path: componentPath, content: componentContent }
    ]);
}
