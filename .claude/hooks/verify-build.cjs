const { execSync } = require('child_process');

console.log('Iniciando verificação de build e testes (Stop Hook)...');

try {
  // 1. Executar lint com prettier
  console.log('Executando verificação de formatação (npm run lint)...');
  execSync('npm run lint', { stdio: 'inherit' });

  // 2. Executar compilação e typecheck frontend
  console.log('Executando build/typecheck do frontend (npm run build)...');
  execSync('npm run build', { stdio: 'inherit' });

  // 3. Executar testes de unidade do frontend
  console.log('Executando testes de unidade do frontend (npm test)...');
  execSync('npm test', { stdio: 'inherit' });

  // 4. Executar testes de backend Rust
  console.log('Executando testes do backend Rust (npm run test:rust)...');
  execSync('npm run test:rust', { stdio: 'inherit' });

  console.log('Sucesso: Todas as validações passaram!');
  process.exit(0);
} catch (error) {
  console.error(
    '\nERRO: A compilação, o linter ou os testes falharam. Corrija os erros antes de concluir a tarefa.',
  );
  process.exit(2); // Código 2 aborta a conclusão no Claude Code
}
