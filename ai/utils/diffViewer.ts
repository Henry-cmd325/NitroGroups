import readline from "readline";

export function showPreview(content: string) {
    console.log("\n\x1b[36m=== PREVIEW DEL CÓDIGO GENERADO ===\x1b[0m\n");
    console.log(`\x1b[32m${content}\x1b[0m`);
    console.log("\n\x1b[36m===================================\x1b[0m\n");
}

export function confirmAction(question: string): Promise<boolean> {
    if (process.env.AUTO_ACCEPT === "true") {
        console.log(`\x1b[33m${question} (y/N): \x1b[0myes (AUTO_ACCEPT)`);
        return Promise.resolve(true);
    }
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(`\x1b[33m${question} (y/N): \x1b[0m`, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === "y");
        });
    });
}
