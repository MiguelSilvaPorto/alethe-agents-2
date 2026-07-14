const fs = require('fs');
const path = require('path');

try {
  const inputData = fs.readFileSync(0, 'utf-8');
  if (!inputData) {
    process.exit(0);
  }

  const event = JSON.parse(inputData);
  const toolInput = event.tool_input || {};

  // Extrair caminhos de arquivo de vários possíveis parâmetros de ferramentas
  const pathsToCheck = [];

  for (const key of [
    'file_path',
    'path',
    'file',
    'target_file',
    'TargetFile',
    'AbsolutePath',
  ]) {
    if (toolInput[key] && typeof toolInput[key] === 'string') {
      pathsToCheck.push(toolInput[key]);
    }
  }

  // Se for uma execução de comando bash, também podemos verificar o comando por segurança
  if (
    (event.tool_name === 'bash' || event.tool_name === 'run_command') &&
    toolInput.command
  ) {
    pathsToCheck.push(toolInput.command);
  }

  const protectedPaths = [
    '.github/workflows/',
    '.env',
    'CODEOWNERS',
    'CLAUDE.md',
    'AGENTS.md',
  ];

  let mustBlock = false;
  let blockedPath = '';

  for (const filePath of pathsToCheck) {
    const normalizedPath = filePath.replace(/\\/g, '/'); // Normalizar barras do Windows
    for (const protectedPattern of protectedPaths) {
      if (normalizedPath.includes(protectedPattern)) {
        mustBlock = true;
        blockedPath = filePath;
        break;
      }
    }
    if (mustBlock) break;
  }

  if (mustBlock) {
    const errorResponse = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Erro de Segurança: O arquivo/caminho "${blockedPath}" está protegido. Alterações diretas por agentes de IA são proibidas.`,
      },
    };
    console.log(JSON.stringify(errorResponse));
    process.exit(0); // Sucesso comunicando decisão estruturada "deny"
  }

  process.exit(0); // Permite para não protegidos
} catch (err) {
  process.exit(0); // Fallback seguro
}
