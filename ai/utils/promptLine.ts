import readline from "readline";

/**
 * Pregunta de consola (una línea). Para respuestas largas, el usuario puede
 * pegar en una sola línea o usar comillas; alternativa: `requirement --file=`.
 */
export function askLine(prompt: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(prompt, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}
